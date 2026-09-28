#!/bin/bash
# ============================================================
# Build "POS Server" APK = Termux fork + POS payload nhúng sẵn
#
# Chạy trong GitHub Actions (ubuntu). Yêu cầu cwd chứa:
#   ./termux-app/   — source termux-app (đã checkout)
#   ./pos_fnb/      — repo này (đã checkout)
#
# Output: termux-app/app/build/outputs/apk/debug/*.apk
#         (+ termux-boot APK nếu build được — cho autostart)
# ============================================================
set -e -u -o pipefail

APP_DIR="termux-app"
GRADLE_FILE="$APP_DIR/app/build.gradle"
CPP_DIR="$APP_DIR/app/src/main/cpp"

echo "==> [1/6] Đóng gói POS payload"
cd pos_fnb
tar czf /tmp/pos-payload.tar.gz \
  --exclude='data' --exclude='node_modules' --exclude='.git' --exclude='*.log' \
  server public schema.sql package.json install.sh README.md apk/pos-setup.sh
cd ..
ls -lh /tmp/pos-payload.tar.gz

echo "==> [2/6] Đọc bootstrap version/checksums từ build.gradle"
VARIANT="apt-android-7"
# Hỗ trợ cả 2 format:
#   mới: def version = "2026.02.12-r1" + "%2B" + "apt.android-7"
#   cũ : def version = "2025.03.28-r1+apt.android-7"
RAW=$(grep -m1 -oP 'def version = "\K[^"]+' "$GRADLE_FILE")
if [[ "$RAW" == *+* ]]; then
  VERSION="${RAW//+/%2B}"
else
  VERSION="${RAW}%2Bapt.android-7"
fi
echo "    bootstrap version: $VERSION"

ARCHES=$(grep -oP 'downloadBootstrap\("\K\w+' "$GRADLE_FILE" | sort -u || true)
echo "    arches: $ARCHES"

echo "==> [3/6] Tải bootstrap zips + inject payload + profile hook"
mkdir -p "$CPP_DIR"
for ARCH in $ARCHES; do
  ZIP="/tmp/bootstrap-$ARCH.zip"
  URL="https://github.com/termux/termux-packages/releases/download/bootstrap-$VERSION/bootstrap-$ARCH.zip"
  echo "    $ARCH <- $URL"
  curl -fsSL "$URL" -o "$ZIP"

  rm -rf "/tmp/bootfs-$ARCH" && mkdir -p "/tmp/bootfs-$ARCH"
  (cd "/tmp/bootfs-$ARCH" && unzip -q "$ZIP")

  ROOTFS="/tmp/bootfs-$ARCH"
  # Payload: $PREFIX/opt/pos-payload.tar.gz
  mkdir -p "$ROOTFS/opt"
  cp /tmp/pos-payload.tar.gz "$ROOTFS/opt/pos-payload.tar.gz"

  # Profile hook chạy khi mở terminal
  mkdir -p "$ROOTFS/etc/profile.d"
  cp pos_fnb/apk/pos-setup.sh "$ROOTFS/etc/profile.d/pos-server.sh"

  # Đảm bảo profile gọi hook (profile của termux thường đã loop profile.d,
  # thêm guard chạy tay nếu chưa — pos-setup.sh tự idempotent)
  if [ -f "$ROOTFS/etc/profile" ]; then
    grep -q "pos-server.sh" "$ROOTFS/etc/profile" || \
      printf '\n# POS Server auto-setup\n. "$PREFIX/etc/profile.d/pos-server.sh" 2>/dev/null || true\n' \
        >> "$ROOTFS/etc/profile"
  fi

  # Đóng gói lại (SYMLINKS.txt được giữ nguyên như file thường — đúng format)
  (cd "$ROOTFS" && zip -q -r "/tmp/bootstrap-$ARCH-patched.zip" .)
  cp "/tmp/bootstrap-$ARCH-patched.zip" "$CPP_DIR/bootstrap-$ARCH.zip"
done

echo "==> [4/6] Patch app: tên + WebView launcher + bỏ verify checksum"
# App name → "POS Server" (entity TERMUX_APP_NAME trong DOCTYPE của strings.xml)
sed -i 's/manifestPlaceholders.TERMUX_APP_NAME = "Termux"/manifestPlaceholders.TERMUX_APP_NAME = "POS Server"/' "$GRADLE_FILE"
for STR in "$APP_DIR/app/src/main/res/values/strings.xml" "$APP_DIR/termux-shared/src/main/res/values/strings.xml"; do
  [ -f "$STR" ] && sed -i 's|<!ENTITY TERMUX_APP_NAME "Termux">|<!ENTITY TERMUX_APP_NAME "POS Server">|' "$STR"
done
grep -m1 'ENTITY TERMUX_APP_NAME' "$APP_DIR/app/src/main/res/values/strings.xml"
# Bootstrap đã patch: file tồn tại → dùng luôn, bỏ verify checksum
grep -n 'def file = new File(projectDir, localUrl)' "$GRADLE_FILE"
sed -i 's|def file = new File(projectDir, localUrl)|def file = new File(projectDir, localUrl)\n        if (file.exists()) { logger.quiet("Using pre-seeded bootstrap: " + localUrl); return }|' "$GRADLE_FILE"

# POSActivity (WebView fullscreen → localhost:8787) làm launcher thay terminal
cp pos_fnb/apk/POSActivity.java "$APP_DIR/app/src/main/java/com/termux/app/POSActivity.java"
python3 pos_fnb/apk/patch-manifest.py "$APP_DIR/app/src/main/AndroidManifest.xml"

echo "==> [5/6] Build APK RELEASE + ký production key"
# Ký bằng key riêng (openssl pk8 + x509, lưu trong GitHub Secrets)
echo "$POS_SIGN_KEY" | base64 -d > /tmp/pos-signing.pk8
echo "$POS_SIGN_CERT" > /tmp/pos-signing.x509.pem
ZIPALIGN=$(find "$ANDROID_HOME/build-tools" -name zipalign -type f | sort -V | tail -1)
APKSIGNER=$(find "$ANDROID_HOME/build-tools" -name apksigner -type f | sort -V | tail -1)

sign_apk() { # $1=unsigned $2=out
  "$ZIPALIGN" -p -f 4 "$1" /tmp/aligned.apk
  "$APKSIGNER" sign --key /tmp/pos-signing.pk8 --cert /tmp/pos-signing.x509.pem \
    --out "$2" /tmp/aligned.apk
  "$APKSIGNER" verify --verbose "$2" | tail -1
}

cd "$APP_DIR"
chmod +x gradlew
if TERMUX_PACKAGE_VARIANT="$VARIANT" ./gradlew assembleRelease --no-daemon; then
  ls -lh app/build/outputs/apk/release/
  APP_UNSIGNED=$(find app/build/outputs/apk/release -name "*universal*.apk" | head -1)
else
  echo "    release failed → fallback assembleDebug"
  TERMUX_PACKAGE_VARIANT="$VARIANT" ./gradlew assembleDebug --no-daemon
  APP_UNSIGNED=$(find app/build/outputs/apk/debug -name "*universal*.apk" | head -1)
fi
sign_apk "$APP_UNSIGNED" /tmp/POS-Server.apk
cd ..

echo "==> [6/6] Build Termux:Boot (autostart khi mở máy) — optional"
if git clone --depth 1 --branch v0.8.1 https://github.com/termux/termux-boot.git termux-boot 2>/dev/null || \
   git clone --depth 1 https://github.com/termux/termux-boot.git termux-boot; then
  cd termux-boot
  chmod +x gradlew 2>/dev/null || true
  if ./gradlew assembleRelease --no-daemon || ./gradlew assembleDebug --no-daemon; then
    find . -name "*.apk" | head -10
    BOOT_APK=$(find . -name "*universal*.apk" -o -name "*.apk" | head -1)
    sign_apk "$BOOT_APK" /tmp/pos-boot.apk
    echo "    boot APK: /tmp/pos-boot.apk"
  fi
  cd ..
fi

echo "==> XONG"
