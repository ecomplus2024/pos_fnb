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

echo "==> [4/6] Patch build.gradle: tên app + bỏ verify checksum"
# App name → "POS Server"
sed -i 's/manifestPlaceholders.TERMUX_APP_NAME = "Termux"/manifestPlaceholders.TERMUX_APP_NAME = "POS Server"/' "$GRADLE_FILE"
# Bootstrap đã patch: file tồn tại → dùng luôn, bỏ verify checksum
grep -n 'def file = new File(projectDir, localUrl)' "$GRADLE_FILE"
sed -i 's|def file = new File(projectDir, localUrl)|def file = new File(projectDir, localUrl)\n        if (file.exists()) { logger.quiet("Using pre-seeded bootstrap: " + localUrl); return }|' "$GRADLE_FILE"

echo "==> [5/6] Build APK chính"
cd "$APP_DIR"
chmod +x gradlew
TERMUX_PACKAGE_VARIANT="$VARIANT" ./gradlew assembleDebug --no-daemon
ls -lh app/build/outputs/apk/debug/
cd ..

echo "==> [6/6] Build Termux:Boot (autostart khi mở máy) — optional"
if git clone --depth 1 --branch v0.8.1 https://github.com/termux/termux-boot.git termux-boot 2>/dev/null || \
   git clone --depth 1 https://github.com/termux/termux-boot.git termux-boot; then
  cd termux-boot
  chmod +x gradlew 2>/dev/null || true
  if ./gradlew assembleDebug --no-daemon; then
    find . -name "*.apk" | head -10
    # Re-sign bằng đúng key của app chính (sharedUserId yêu cầu cùng chữ ký)
    BOOT_APK=$(find . -name "*.apk" | grep -i debug | head -1)
    BOOT_APK="${BOOT_APK:-$(find . -name "*.apk" | head -1)}"
    APKSIGNER=$(find "$ANDROID_HOME/build-tools" -name apksigner -type f | sort -V | tail -1)
    APP_KEYSTORE=$(find "../$APP_DIR/app" -maxdepth 1 -name "*.jks" | head -1)
    "$APKSIGNER" sign \
      --ks "$APP_KEYSTORE" \
      --ks-pass pass:xrj45yWGLbsO7W0v --key-pass pass:xrj45yWGLbsO7W0v \
      --out /tmp/pos-boot.apk "$BOOT_APK" || cp "$BOOT_APK" /tmp/pos-boot.apk
    echo "    boot APK: /tmp/pos-boot.apk"
  fi
  cd ..
fi

echo "==> XONG"
