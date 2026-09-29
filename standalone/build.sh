#!/bin/bash
# ============================================================
# Build "POS Server" standalone APK — KHÔNG dùng Termux.
#
#   app/ + Node binary (từ termux-packages .deb) + code POS trong assets
#
# Chạy trong GitHub Actions (ubuntu). cwd chứa:
#   ./standalone/  — project Android thuần
#   ./pos_fnb/     — repo này (đã checkout)
#
# Output: /tmp/POS-Standalone.apk (signed, arm64)
# ============================================================
set -e -u -o pipefail

SA="standalone"
JNILIBS="$SA/app/src/main/jniLibs/arm64-v8a"
ASSETS="$SA/app/src/main/assets"

echo "==> [1/6] Resolve node deps từ termux-packages (aarch64)"
# Thử lần lượt các mirror — runner GitHub đôi khi bị một mirror chặn
MIRRORS="https://packages-cf.termux.dev/apt/termux-main
https://packages.termux.dev/apt/termux-main
https://grimler.se/termux/termux-main
https://mirrors.tuna.tsinghua.edu.cn/termux/apt/termux-main
https://mirror.mwt.me/termux/main"
REPO=""
for M in $MIRRORS; do
  echo "    thử mirror: $M"
  if curl -fSL --connect-timeout 10 -o /tmp/Packages "$M/dists/stable/main/binary-aarch64/Packages"; then
    REPO="$M"; echo "    OK"; break
  fi
done
[ -n "$REPO" ] || { echo "LỖI: mọi mirror đều không tải được Packages"; exit 1; }

python3 - <<'PYEOF'
import re
pk = open('/tmp/Packages', encoding='utf-8', errors='replace').read()
idx = {}
for s in pk.split('\n\n'):
    m = re.search(r'^Package: (.+)$', s, re.M)
    if m:
        idx[m.group(1).strip()] = s

def field(s, name):
    m = re.search(r'^%s: (.+)$' % name, s, re.M)
    return m.group(1).strip() if m else ''

def deps_of(s):
    raw = field(s, 'Depends')
    out = []
    for d in raw.split(','):
        d = d.strip()
        if not d:
            continue
        name = d.split('(')[0].split('|')[0].strip()
        if name:
            out.append(name)
    return out

seen, order = set(), []
queue = ['nodejs']
while queue:
    p = queue.pop(0)
    if p in seen or p not in idx:
        continue
    seen.add(p)
    order.append(p)
    queue.extend(deps_of(idx[p]))

with open('/tmp/debs.txt', 'w') as f:
    for p in order:
        f.write(field(idx[p], 'Filename') + '\n')
print('resolved debs:', ', '.join(order))
PYEOF

echo "==> [2/6] Tải debs + extract libs → jniLibs"
mkdir -p "$JNILIBS" /tmp/debs /tmp/libsrc
while read -r FILE; do
  [ -z "$FILE" ] && continue
  DEB="/tmp/debs/$(basename "$FILE")"
  echo "    <- $FILE"
  curl -fSL --connect-timeout 15 --retry 3 "$REPO/$FILE" -o "$DEB" < /dev/null
  rm -rf /tmp/debx && mkdir -p /tmp/debx
  dpkg-deb -x "$DEB" /tmp/debx < /dev/null
  USR=/tmp/debx/data/data/com.termux/files/usr
  # node binary → libnode.so (jniLibs → nativeLibraryDir, exec được)
  if [ -f "$USR/bin/node" ]; then
    cp "$USR/bin/node" "$JNILIBS/libnode.so"
    chmod 755 "$JNILIBS/libnode.so"
  fi
  # gom mọi .so* top-level (kể cả symlink) vào /tmp/libsrc để xử lý tập trung
  if [ -d "$USR/lib" ]; then
    find "$USR/lib" -maxdepth 1 -name '*.so*' \( -type f -o -type l \) \
      -exec cp -a {} /tmp/libsrc/ \;
  fi
  echo "    done $FILE"
done < /tmp/debs.txt

# AGP chỉ đóng gói jniLibs khớp `lib*.so` — soname dạng libfoo.so.N bị loại.
# Rename sang libfoo_so_N.so + patchelf --replace-needed trên mọi binary.
command -v patchelf >/dev/null || sudo apt-get install -y patchelf >/dev/null
export JNILIBS_DIR="$JNILIBS"
python3 - <<'PYEOF'
import os, re, shutil, subprocess, sys

SRC = '/tmp/libsrc'
OUT = os.environ.get('JNILIBS_DIR', 'standalone/app/src/main/jniLibs/arm64-v8a')

def safe(n):
    if re.match(r'^lib.*\.so$', n):
        return n
    core = n[3:] if n.startswith('lib') else n
    return 'lib' + re.sub(r'[^A-Za-z0-9_]', '_', core) + '.so'

# name → real file; build rename map cho mọi soname đã biết
real = {}   # real path -> display name của real file
alias = {}  # soname (file/symlink name) -> real display name
for name in sorted(os.listdir(SRC)):
    p = os.path.join(SRC, name)
    target = os.path.realpath(p)
    if os.path.islink(p):
        alias[name] = os.path.basename(target)
    else:
        real[target] = name
        alias[name] = name

# copy real file một lần, tên = safe(name của real file)
soname_map = {}  # soname ai đó cần -> tên file cuối trong jniLibs
for path, name in real.items():
    safe_name = safe(name)
    shutil.copy2(path, os.path.join(OUT, safe_name))
    soname_map[name] = safe_name
for name, tgt in alias.items():
    if tgt in soname_map:
        soname_map[name] = soname_map[tgt]

# bản đồ cần patch: soname gốc -> tên file mới (chỉ cái đổi tên)
patches = {k: v for k, v in soname_map.items() if k != v}
print('rename map:', patches)

# patchelf --replace-needed trên libnode.so + mọi .so
targets = [os.path.join(OUT, 'libnode.so')] + [
    os.path.join(OUT, f) for f in os.listdir(OUT) if f.endswith('.so')]
for t in targets:
    for old, new in patches.items():
        subprocess.run(['patchelf', '--replace-needed', old, new, t],
                       capture_output=True)

# Bionic kiểm tra verneed theo SONAME của lib đã load — lib đổi tên phải
# có SONAME = tên file mới, nếu không linker báo "cannot find X from verneed".
for f in os.listdir(OUT):
    if f.endswith('.so'):
        p = os.path.join(OUT, f)
        subprocess.run(['patchelf', '--set-soname', f, p], capture_output=True)
print('patched', len(targets), 'binaries')
PYEOF

echo "    jniLibs:"
ls -lhS "$JNILIBS" | head -15
[ -f "$JNILIBS/libnode.so" ] || { echo "LỖI: không có libnode.so"; exit 1; }

# DT_NEEDED check — mọi soname phải có file cùng tên trong jniLibs
READELF=$(find "$ANDROID_HOME/ndk" -name 'llvm-readelf*' -type f 2>/dev/null | head -1 || true)
if [ -n "$READELF" ]; then
  echo "    DT_NEEDED của libnode.so:"
  "$READELF" -d "$JNILIBS/libnode.so" | grep NEEDED || true
fi

echo "==> [3/6] Copy code POS → assets"
mkdir -p "$ASSETS/pos"
cp -r pos_fnb/server pos_fnb/src pos_fnb/public pos_fnb/schema.sql pos_fnb/package.json "$ASSETS/pos/"
rm -rf "$ASSETS/pos/server/node_modules" "$ASSETS/pos/data" 2>/dev/null || true
cp pos_fnb/apk/update_url.txt "$ASSETS/update_url.txt"
sed -i 's|/version.json|/version-standalone.json|' "$ASSETS/update_url.txt"
du -sh "$ASSETS/pos"

echo "==> [4/6] Gradle assembleRelease"
cd "$SA"
# Pin Gradle 8.7 — AGP 8.2.2 không tương thích Gradle 9 (runner mặc định 9.x)
if [ ! -x /opt/gradle-8.7/bin/gradle ]; then
  echo "    tải gradle 8.7..."
  curl -fsSL https://services.gradle.org/distributions/gradle-8.7-bin.zip -o /tmp/gradle.zip
  unzip -q /tmp/gradle.zip -d /opt
fi
/opt/gradle-8.7/bin/gradle --version | grep -E "Gradle|JVM"
/opt/gradle-8.7/bin/gradle assembleRelease --no-daemon --stacktrace -q
ls -lh app/build/outputs/apk/release/
cd ..

echo "==> [5/6] Ký production key"
echo "$POS_SIGN_KEY" | base64 -d > /tmp/pos-signing.pk8
echo "$POS_SIGN_CERT" > /tmp/pos-signing.x509.pem
ZIPALIGN=$(find "$ANDROID_HOME/build-tools" -name zipalign -type f | sort -V | tail -1)
APKSIGNER=$(find "$ANDROID_HOME/build-tools" -name apksigner -type f | sort -V | tail -1)
"$ZIPALIGN" -p -f 4 \
  "$(find "$SA/app/build/outputs/apk/release" -name '*.apk' | head -1)" /tmp/aligned.apk
"$APKSIGNER" sign --key /tmp/pos-signing.pk8 --cert /tmp/pos-signing.x509.pem \
  --out /tmp/POS-Standalone.apk /tmp/aligned.apk
"$APKSIGNER" verify --verbose /tmp/POS-Standalone.apk | tail -3
ls -lh /tmp/POS-Standalone.apk

echo "==> [6/6] Xong"
