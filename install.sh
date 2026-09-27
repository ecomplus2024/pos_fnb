#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# POS — cài đặt 1 lệnh trên Android (Termux)
#
# Chuẩn bị:
#   1. Cài Termux + Termux:Boot từ F-Droid
#   2. Settings → Apps → Termux → Battery → Unrestricted
#   3. Copy thư mục này vào Download của tablet (USB/Zalo/email)
#
# Chạy (gõ đúng 2 lệnh trong Termux):
#   termux-setup-storage          ← hiện popup, bấm Allow
#   bash /sdcard/Download/pos_fnb/install.sh
#
# Script tự: copy code về $HOME → cài Node.js → autostart khi
# boot → tạo icon Start-POS trên màn hình → chạy server ngay.
# ============================================================
set -e

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/pos_fnb"

# Nếu đang chạy từ /sdcard → copy về $HOME (sdcard không exec được)
if [ "$SRC_DIR" != "$DEST" ]; then
  echo "==> Copy project về $DEST ..."
  mkdir -p "$DEST"
  cp -r "$SRC_DIR"/. "$DEST"/
fi
cd "$DEST"

echo "==> Cài Node.js (có thể mất vài phút lần đầu)..."
pkg update -y
pkg install -y nodejs

# Giữ CPU awake khi tắt màn hình
termux-wake-lock 2>/dev/null || true

# ---- Autostart khi mở máy (cần app Termux:Boot) + supervisor loop ----
mkdir -p "$HOME/.termux/boot" "$HOME/.shortcuts"
cat > "$HOME/.termux/boot/start-pos.sh" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd "$DEST"
# Supervisor: server exit (update/restart/crash) → tự bật lại
while true; do
  node server/server.mjs >> "\$HOME/pos.log" 2>&1
  echo "[supervisor] exited \$(date), restarting" >> "\$HOME/pos.log"
  sleep 1
done &
EOF
chmod +x "$HOME/.termux/boot/start-pos.sh"
echo "==> Autostart OK (mở app Termux:Boot 1 lần để kích hoạt)"

# ---- Icon Start-POS trên home screen (nếu cài Termux:Widget) ----
cat > "$HOME/.shortcuts/Start-POS.sh" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
bash "$HOME/.termux/boot/start-pos.sh"
EOF
chmod +x "$HOME/.shortcuts/Start-POS.sh"

# ---- Cloudflare Tunnel (tuỳ chọn — shipper/khách ngoài LAN) ----
if pkg install -y cloudflared 2>/dev/null; then
  echo "==> cloudflared OK — bật tunnel: cloudflared tunnel run --token <TOKEN>"
fi

# ---- Chạy server ngay (không cần đợi reboot) ----
if ! curl -s --max-time 2 http://localhost:8787/api/health >/dev/null 2>&1; then
  (cd "$DEST" && while true; do
    node server/server.mjs >> "$HOME/pos.log" 2>&1
    sleep 1
  done &)
  sleep 3
fi

IP=$(ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 | head -1)

echo
echo "======================================================="
echo " CÀI XONG — POS đang chạy"
echo "   Trên máy này : http://localhost:8787"
echo "   Máy khác     : http://${IP:-<IP-tablet>}:8787"
echo "   Login        : admin / admin123 (vào Quản trị đổi ngay)"
echo "   Update sau này: Quản trị → Cài đặt → Cập nhật & khởi động lại"
echo "   Log          : ~/pos.log"
echo "======================================================="
