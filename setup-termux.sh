#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# Setup POS local server trên Android qua Termux
#
# Yêu cầu:
#   1. Cài Termux từ F-Droid (KHÔNG cài bản Play Store — đã cũ)
#      https://f-droid.org/packages/com.termux/
#   2. (Khuyến nghị) Cài Termux:Boot từ F-Droid để server tự chạy
#      khi mở máy — cũng mở app 1 lần sau khi cài.
#   3. Trong Settings Android: tắt battery optimization cho Termux
#      (để hệ thống không kill server ngầm).
#
# Cách dùng:
#   - Copy cả thư mục pos-cloudflare vào $HOME của Termux
#     (hoặc git clone), rồi:  bash setup-termux.sh
# ============================================================
set -e
cd "$(dirname "$0")"
PROJECT_DIR="$(pwd)"

echo "==> Cài Node.js + git"
pkg update -y
pkg install -y nodejs git

# Giữ CPU awake khi tắt màn hình (server vẫn chạy ngầm)
termux-wake-lock 2>/dev/null || true

# ---- Autostart khi boot (cần app Termux:Boot) ----
mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/start-pos.sh" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd "$PROJECT_DIR"
node server/server.mjs >> "\$HOME/pos.log" 2>&1 &
EOF
chmod +x "$HOME/.termux/boot/start-pos.sh"
echo "==> Đã cài autostart: ~/.termux/boot/start-pos.sh"

# ---- Cloudflare Tunnel (tuỳ chọn — cho shipper/khách ngoài LAN) ----
if pkg install -y cloudflared 2>/dev/null; then
  cat > "$HOME/.termux/boot/start-tunnel.sh" <<'EOF'
#!/data/data/com.termux/files/usr/bin/bash
# Quick tunnel (URL random mỗi lần — chỉ để test):
#   cloudflared tunnel --url http://localhost:8787
# Named tunnel (URL cố định, cần domain + cloudflared login 1 lần):
#   cloudflared tunnel run --token <TUNNEL_TOKEN>
EOF
  chmod +x "$HOME/.termux/boot/start-tunnel.sh"
  echo "==> Đã cài cloudflared (sửa ~/.termux/boot/start-tunnel.sh để bật tunnel)"
else
  echo "==> Bỏ qua cloudflared (không có trong repo hoặc lỗi cài)"
fi

echo
echo "======================================================="
echo " Xong. Chạy server:"
echo "   cd $PROJECT_DIR && node server/server.mjs"
echo
echo " Các máy trong quán truy cập:  http://<IP-máy-này>:8787"
echo " Xem IP:                       ifconfig wlan0"
echo " Nên đặt IP tĩnh/DHCP reservation trên router."
echo "======================================================="
