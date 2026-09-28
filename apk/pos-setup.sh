#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# POS Server — auto-setup hook, nhúng trong bootstrap
# Chạy mỗi khi mở app (login shell). Idempotent:
#   - Lần đầu: cài nodejs, giải nén payload, tạo autostart, chạy server
#   - Lần sau: chỉ đảm bảo server đang sống + in URL
# ============================================================

PREFIX_DIR="/data/data/com.termux/files/usr"
HOME_DIR="/data/data/com.termux/files/home"
PAYLOAD="$PREFIX_DIR/opt/pos-payload.tar.gz"
POS_DIR="$HOME_DIR/pos_fnb"
MARKER="$HOME_DIR/.pos_done"

pos_ensure_running() {
  curl -s --max-time 2 http://localhost:8787/api/health >/dev/null 2>&1 && return 0
  (cd "$POS_DIR" 2>/dev/null && while true; do
    node server/server.mjs >> "$HOME_DIR/pos.log" 2>&1
    sleep 1
  done &) || true
  sleep 2
}

pos_ip() {
  ip addr show wlan0 2>/dev/null | grep 'inet ' | awk '{print $2}' | cut -d/ -f1 | head -1
}

# ---- Đã cài rồi: đảm bảo server sống, in URL, thoát ----
if [ -f "$MARKER" ]; then
  pos_ensure_running
  IP=$(pos_ip)
  echo "POS đang chạy:  http://localhost:8787   |   LAN: http://${IP:-<wifi>}:8787"
  return 0 2>/dev/null || exit 0
fi

# ---- Lần đầu mở app: cài đặt đầy đủ ----
clear
echo "=============================================="
echo "  POS SERVER — đang cài đặt lần đầu"
echo "  (cần WiFi; mất vài phút, đừng đóng app)"
echo "=============================================="

pkg update -y && pkg install -y nodejs curl

mkdir -p "$POS_DIR"
tar xzf "$PAYLOAD" -C "$POS_DIR"

# Autostart khi mở máy (qua module Boot trong APK)
mkdir -p "$HOME_DIR/.termux/boot"
cat > "$HOME_DIR/.termux/boot/start-pos.sh" <<EOF
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd "$POS_DIR"
while true; do
  node server/server.mjs >> "$HOME_DIR/pos.log" 2>&1
  echo "[supervisor] exited \$(date), restarting" >> "$HOME_DIR/pos.log"
  sleep 1
done &
EOF
chmod +x "$HOME_DIR/.termux/boot/start-pos.sh"

termux-wake-lock 2>/dev/null || true
touch "$MARKER"
pos_ensure_running

IP=$(pos_ip)
echo
echo "=============================================="
echo "  CÀI ĐẶT XONG — POS đang chạy"
echo "    Trên máy này : http://localhost:8787"
echo "    Máy khác     : http://${IP:-<IP-tablet>}:8787"
echo "    Login        : admin / admin123"
echo "=============================================="
