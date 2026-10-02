// POS Demo - React 18 + JSX + TailwindCSS production build
// - mode='cashier': Login → PosApp (tables grid + menu + cart + checkout)
// - mode='public': WelcomeOverlay → Menu (categories + products + sizes + toppings)
//                   + CartModal + SizeModal + EditItemModal + TableGroupModal
//                   + WaitingStaffScreen + MyOrderView
//
// React 18 + ReactDOM 18 UMD load từ CDN, JSX transform bởi Babel standalone

const { useState, useEffect, useMemo, useRef, useCallback, createContext, useContext } = React;

// Frontend build stamp — hiện ở Cài đặt → Hệ thống server để verify WebView
// đang chạy code mới hay cache cũ. Đổi chuỗi này mỗi lần sửa frontend.
const APP_BUILD = "sound-dingdong-2";

// ============ Helpers ============
const formatVND = (amount) => new Intl.NumberFormat("vi-VN").format(amount) + " đ";

// Image optimization: responsive srcset with 200px + 100px WebP thumbnails
function OptimizedImg({ src, alt, className, width, height, ...props }) {
  if (!src) return null;
  let imgSrc = src, srcSet, sizes;
  if (src.includes("/pos-uploads/200/")) {
    srcSet = src.replace("/200/", "/100/") + " 100w, " + src + " 200w";
    sizes = "(max-width: 640px) 100px, 200px";
  }
  return <img src={imgSrc} srcSet={srcSet} sizes={sizes} alt={alt || ""}
    loading="lazy" decoding="async" width={width} height={height}
    className={className} {...props} />;
}

// Fix 15: Search bỏ dấu tiếng Việt
const removeAccents = (str) => str.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');

const TOKEN_KEY = "pos_demo_token";
const USER_KEY = "pos_demo_user";
const REQUEST_TOKEN_PREFIX = "public_request_token-";
const CART_PREFIX = "public_cart-";
const SESSION_PREFIX = "publicSessionId-";
const WELCOME_KEY = "hasSeenWelcome";

// Lý do tắt nhận đơn ship — chọn khi gạt toggle OFF trong tab Ship
const SHIP_OFF_REASONS = [
  "Quán hết giờ bán hàng",
  "Quán hôm nay nghỉ",
  "Quán đang quá tải — chỉ nhận ăn tại quán hoặc mang về",
];


// ============ Icons (lucide, inline SVG - khong phu thuoc CDN) ============
const ICON_PATHS = {
  "alert-triangle": (<><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" /><path d="M12 9v4" /><path d="M12 17h.01" /></>),
  "armchair": (<><path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3" /><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z" /><path d="M5 18v2" /><path d="M19 18v2" /></>),
  "arrow-left": (<><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>),
  "arrow-right": (<><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></>),
  "banknote": (<><rect width="20" height="12" x="2" y="6" rx="2" /><circle cx="12" cy="12" r="2" /><path d="M6 12h.01M18 12h.01" /></>),
  "bar-chart-2": (<><path d="M5 21v-6" /><path d="M12 21V3" /><path d="M19 21V9" /></>),
  "bell": (<><path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" /></>),
  "bell-ring": (<><path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M22 8c0-2.3-.8-4.3-2-6" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" /><path d="M4 2C2.8 3.7 2 5.7 2 8" /></>),
  "calendar": (<><path d="M8 2v3" /><path d="M16 2v3" /><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /></>),
  "check": (<><path d="M20 6 9 17l-5-5" /></>),
  "check-circle": (<><path d="M21.801 10A10 10 0 1 1 17 3.335" /><path d="m9 11 3 3L22 4" /></>),
  "chef-hat": (<><path d="M17 21a1 1 0 0 0 1-1v-5.35c0-.457.316-.844.727-1.041a4 4 0 0 0-2.134-7.589 5 5 0 0 0-9.186 0 4 4 0 0 0-2.134 7.588c.411.198.727.585.727 1.041V20a1 1 0 0 0 1 1Z" /><path d="M6 17h12" /></>),
  "chevron-left": (<><path d="m15 18-6-6 6-6" /></>),
  "chevron-right": (<><path d="m9 18 6-6-6-6" /></>),
  "circle-alert": (<><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></>),
  "clipboard-list": (<><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></>),
  "clock": (<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>),
  "clock-3": (<><circle cx="12" cy="12" r="10" /><path d="M12 6v6h4" /></>),
  "coffee": (<><path d="M10 2v2" /><path d="M14 2v2" /><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" /><path d="M6 2v2" /></>),
  "coins": (<><path d="M13.744 17.736a6 6 0 1 1-7.48-7.48" /><path d="M15 6h1v4" /><path d="m6.134 14.768.866-.5 2 3.464" /><circle cx="16" cy="8" r="6" /></>),
  "credit-card": (<><rect width="20" height="14" x="2" y="5" rx="2" /><line x1="2" x2="22" y1="10" y2="10" /></>),
  "download": (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></>),
  "cup-soda": (<><path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8" /><path d="M5 8h14" /><path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0" /><path d="m12 8 1-6h2" /></>),
  "eye": (<><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></>),
  "grip-vertical": (<><circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" /></>),
  "history": (<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></>),
  "info": (<><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>),
  "layout": (<><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></>),
  "layout-dashboard": (<><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></>),
  "layout-grid": (<><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></>),
  "loader": (<><path d="M12 2v4" /><path d="m16.2 7.8 2.9-2.9" /><path d="M18 12h4" /><path d="m16.2 16.2 2.9 2.9" /><path d="M12 18v4" /><path d="m4.9 19.1 2.9-2.9" /><path d="M2 12h4" /><path d="m4.9 4.9 2.9 2.9" /></>),
  "lock": (<><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>),
  "log-out": (<><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /></>),
  "map-pin": (<><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" /><circle cx="12" cy="10" r="3" /></>),
  "message-square": (<><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" /></>),
  "minus": (<><path d="M5 12h14" /></>),
  "pause-circle": (<><circle cx="12" cy="12" r="10" /><line x1="10" x2="10" y1="15" y2="9" /><line x1="14" x2="14" y1="15" y2="9" /></>),
  "package": (<><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" /><path d="M12 22V12" /><polyline points="3.29 7 12 12 20.71 7" /><path d="m7.5 4.27 9 5.15" /></>),
  "pencil": (<><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></>),
  "phone": (<><path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384" /></>),
  "play": (<><path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" /></>),
  "play-circle": (<><path d="M9 9.003a1 1 0 0 1 1.517-.859l4.997 2.997a1 1 0 0 1 0 1.718l-4.997 2.997A1 1 0 0 1 9 14.996z" /><circle cx="12" cy="12" r="10" /></>),
  "plus": (<><path d="M5 12h14" /><path d="M12 5v14" /></>),
  "puzzle": (<><path d="M15.39 4.39a1 1 0 0 0 1.68-.474 2.5 2.5 0 1 1 3.014 3.015 1 1 0 0 0-.474 1.68l1.683 1.682a2.414 2.414 0 0 1 0 3.414L19.61 15.39a1 1 0 0 1-1.68-.474 2.5 2.5 0 1 0-3.014 3.015 1 1 0 0 1 .474 1.68l-1.683 1.682a2.414 2.414 0 0 1-3.414 0L8.61 19.61a1 1 0 0 0-1.68.474 2.5 2.5 0 1 1-3.014-3.015 1 1 0 0 0 .474-1.68l-1.683-1.682a2.414 2.414 0 0 1 0-3.414L4.39 8.61a1 1 0 0 1 1.68.474 2.5 2.5 0 1 0 3.014-3.015 1 1 0 0 1-.474-1.68l1.683-1.682a2.414 2.414 0 0 1 3.414 0z" /></>),
  "receipt": (<><path d="M12 17V7" /><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8" /><path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z" /></>),
  "receipt-text": (<><path d="M13 16H8" /><path d="M14 8H8" /><path d="M16 12H8" /><path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z" /></>),
  "refresh-cw": (<><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></>),
  "search": (<><path d="m21 21-4.34-4.34" /><circle cx="11" cy="11" r="8" /></>),
  "settings": (<><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" /><circle cx="12" cy="12" r="3" /></>),
  "shopping-bag": (<><path d="M16 10a4 4 0 0 1-8 0" /><path d="M3.103 6.034h17.794" /><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z" /></>),
  "shopping-basket": (<><path d="m15 11-1 9" /><path d="m19 11-4-7" /><path d="M2 11h20" /><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8a2 2 0 0 0 2-1.6l1.7-7.4" /><path d="M4.5 15.5h15" /><path d="m5 11 4-7" /><path d="m9 11 1 9" /></>),
  "shopping-cart": (<><path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18" /><path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25" /><circle cx="18" cy="20" r="2" /><circle cx="8" cy="20" r="2" /></>),
  "smartphone": (<><rect width="14" height="20" x="5" y="2" rx="2" ry="2" /><path d="M12 18h.01" /></>),
  "star": (<><path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z" /></>),
  "store": (<><path d="M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" /><path d="M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244" /><path d="M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" /></>),
  "timer": (<><line x1="10" x2="14" y1="2" y2="2" /><line x1="12" x2="15" y1="14" y2="11" /><circle cx="12" cy="14" r="8" /></>),
  "trash-2": (<><path d="M10 11v6" /><path d="M14 11v6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /><path d="M3 6h18" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></>),
  "trending-up": (<><path d="M16 7h6v6" /><path d="m22 7-8.5 8.5-5-5L2 17" /></>),
  "truck": (<><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" /><path d="M15 18H9" /><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" /><circle cx="17" cy="18" r="2" /><circle cx="7" cy="18" r="2" /></>),
  "upload": (<><path d="M12 3v12" /><path d="m17 8-5-5-5 5" /><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /></>),
  "user": (<><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>),
  "users": (<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><path d="M16 3.128a4 4 0 0 1 0 7.744" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /></>),
  "utensils": (<><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" /><path d="M7 2v20" /><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" /></>),
  "utensils-crossed": (<><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" /><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" /><path d="m2.1 21.8 6.4-6.3" /><path d="m19 5-7 7" /></>),
  "volume-2": (<><path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" /><path d="M16 9a5 5 0 0 1 0 6" /><path d="M19.364 18.364a9 9 0 0 0 0-12.728" /></>),
  "volume-x": (<><path d="M11 4.702a.7.7 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.7.7 0 0 0 11 19.298z" /><path d="m16.5 14.5 5-5" /><path d="m16.5 9.5 5 5" /></>),
  "wallet": (<><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" /><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" /></>),
  "wifi": (<><path d="M12 20h.01" /><path d="M2 8.82a15 15 0 0 1 20 0" /><path d="M5 12.859a10 10 0 0 1 14 0" /><path d="M8.5 16.429a5 5 0 0 1 7 0" /></>),
  "wifi-off": (<><path d="M12 20h.01" /><path d="M8.5 16.429a5 5 0 0 1 7 0" /><path d="M5 12.859a10 10 0 0 1 5.17-2.69" /><path d="M19 12.859a10 10 0 0 0-2.007-1.523" /><path d="M2 8.82a15 15 0 0 1 4.177-2.643" /><path d="M22 8.82a15 15 0 0 0-11.288-3.764" /><path d="m2 2 20 20" /></>),
  "x": (<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>),
  "x-circle": (<><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>),
};

function Icon({ name, className = "", strokeWidth = 2 }) {
  const paths = ICON_PATHS[name];
  return (
    <svg
      className={className}
      width="24" height="24" viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths || null}
    </svg>
  );
}

// ============ Offline Queue (IndexedDB) ============
const DB_NAME = 'pos-offline-db';
const DB_VERSION = 2;
const STORE_NAME = 'offline_orders';
const MENU_STORE = 'menu_cache';
const KITCHEN_STORE = 'kitchen_status';
const KITCHEN_COMPLETED_STORE = 'kitchen_completed';
const SETTINGS_STORE = 'settings_cache';

function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('by-status', 'status', { unique: false });
        store.createIndex('by-created', 'created_at', { unique: false });
      }
      if (!db.objectStoreNames.contains(MENU_STORE)) {
        db.createObjectStore(MENU_STORE, { keyPath: 'key' });
      }
      if (!db.objectStoreNames.contains(KITCHEN_STORE)) {
        const ks = db.createObjectStore(KITCHEN_STORE, { keyPath: 'itemId' });
        ks.createIndex('by-synced', 'synced', { unique: false });
        ks.createIndex('by-updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(KITCHEN_COMPLETED_STORE)) {
        const cs = db.createObjectStore(KITCHEN_COMPLETED_STORE, { keyPath: 'itemId' });
        cs.createIndex('by-orderId', 'orderId', { unique: false });
        cs.createIndex('by-completedAt', 'completedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
        db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
      }
    };
  });
}

async function addToOfflineQueue(endpoint, method, body, headers = {}) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record = {
      endpoint,
      method: method || 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
      created_at: Date.now(),
      status: 'pending',
      retry_count: 0,
      max_retries: 3,
      error_message: null,
    };
    const request = store.add(record);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getPendingOfflineOrders() {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('by-status');
    const request = index.getAll('pending');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function updateOfflineOrderStatus(id, status, errorMessage = null) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const record = getRequest.result;
      if (record) {
        record.status = status;
        record.error_message = errorMessage;
        if (status === 'syncing') record.retry_count = (record.retry_count || 0) + 1;
        const putRequest = store.put(record);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

async function removeOfflineOrder(id) {
  const db = await openOfflineDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function flushOfflineQueue(onProgress) {
  const orders = await getPendingOfflineOrders();
  let synced = 0;
  let failed = 0;

  for (const order of orders) {
    try {
      await updateOfflineOrderStatus(order.id, 'syncing');
      const response = await fetch(order.endpoint, {
        method: order.method,
        headers: order.headers,
        body: JSON.stringify(order.body),
      });
      if (response.ok) {
        await updateOfflineOrderStatus(order.id, 'synced');
        setTimeout(() => removeOfflineOrder(order.id), 5000);
        synced++;
        if (onProgress) onProgress({ type: 'synced', order });
      } else {
        const isAuthError = response.status === 401 || response.status === 403;
        await updateOfflineOrderStatus(order.id, 'failed',
          isAuthError ? 'auth_expired' : `HTTP ${response.status}`);
        failed++;
        if (onProgress) onProgress({ type: 'failed', order });
      }
    } catch (err) {
      const needsRetry = (order.retry_count || 0) < (order.max_retries || 3);
      await updateOfflineOrderStatus(order.id, needsRetry ? 'pending' : 'failed', err.message);
      if (!needsRetry) {
        failed++;
        if (onProgress) onProgress({ type: 'failed', order });
      }
    }
  }
  return { synced, failed };
}

// ============ Menu Cache Helpers ============
async function saveMenuToCache(menu) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MENU_STORE, 'readwrite');
      tx.objectStore(MENU_STORE).put({ key: 'menu', data: menu, cachedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

async function getMenuFromCache() {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MENU_STORE, 'readonly');
      const req = tx.objectStore(MENU_STORE).get('menu');
      req.onsuccess = () => resolve(req.result?.data || null);
      req.onerror = () => reject(req.error);
    });
  } catch { return null; }
}

async function clearOldMenuCache(maxAgeMs) {
  try {
    const db = await openOfflineDB();
    const cutoff = Date.now() - maxAgeMs;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(MENU_STORE, 'readwrite');
      const store = tx.objectStore(MENU_STORE);
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) { if (cur.value.cachedAt < cutoff) cur.delete(); else cur.continue(); }
        else resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

// ============ Kitchen Status Helpers ============
async function saveKitchenItemStatus(itemId, status, updatedAt = Date.now()) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KITCHEN_STORE, 'readwrite');
      tx.objectStore(KITCHEN_STORE).put({ itemId, status, updatedAt, synced: false });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

async function getAllKitchenStatus() {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KITCHEN_STORE, 'readonly');
      const req = tx.objectStore(KITCHEN_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch { return []; }
}

async function getPendingKitchenSync() {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KITCHEN_STORE, 'readonly');
      const store = tx.objectStore(KITCHEN_STORE);
      const req = store.index('by-synced').getAll(IDBKeyRange.only(false));
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch { return []; }
}

async function markKitchenItemsSynced(itemIds) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KITCHEN_STORE, 'readwrite');
      const store = tx.objectStore(KITCHEN_STORE);
      let remaining = itemIds.length;
      if (remaining === 0) { resolve(); return; }
      for (const id of itemIds) {
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          if (getReq.result) { const r = getReq.result; r.synced = true; store.put(r); }
          remaining--;
          if (remaining === 0) { tx.oncomplete = () => resolve(); }
        };
      }
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

async function clearKitchenBeforeDate(dateStr) {
  // dateStr: "YYYY-MM-DD" — xóa non-completed record cũ hơn ngày này
  try {
    const cutoff = new Date(dateStr + 'T00:00:00').getTime();
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KITCHEN_STORE, 'readwrite');
      const store = tx.objectStore(KITCHEN_STORE);
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) {
          if (cur.value.updatedAt < cutoff && cur.value.status !== 'completed') cur.delete();
          cur.continue();
        } else resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

// ============ Kitchen Completed Helpers ============
async function saveCompletedItem(orderId, itemId, productName, completedAt = Date.now()) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KITCHEN_COMPLETED_STORE, 'readwrite');
      tx.objectStore(KITCHEN_COMPLETED_STORE).put({ itemId, orderId, productName, completedAt, synced: false });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

async function getCompletedItems() {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KITCHEN_COMPLETED_STORE, 'readonly');
      const req = tx.objectStore(KITCHEN_COMPLETED_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch { return []; }
}

async function clearCompletedBeforeDate(dateStr) {
  try {
    const cutoff = new Date(dateStr + 'T00:00:00').getTime();
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(KITCHEN_COMPLETED_STORE, 'readwrite');
      const store = tx.objectStore(KITCHEN_COMPLETED_STORE);
      const req = store.openCursor();
      req.onsuccess = (e) => {
        const cur = e.target.result;
        if (cur) { if (cur.value.completedAt < cutoff) cur.delete(); cur.continue(); }
        else resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch {}
}

// ============ Settings Cache Helpers ============
async function saveSettingsToCache(settings) {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SETTINGS_STORE, 'readwrite');
      const store = tx.objectStore(SETTINGS_STORE);
      for (const [k, v] of Object.entries(settings)) store.put({ key: k, value: v });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
}

async function getSettingsFromCache() {
  try {
    const db = await openOfflineDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SETTINGS_STORE, 'readonly');
      const req = tx.objectStore(SETTINGS_STORE).getAll();
      req.onsuccess = () => {
        const result = {};
        for (const row of req.result) result[row.key] = row.value;
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  } catch { return {}; }
}

// ============ Hooks ============

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

function useOfflineQueue(isOnline) {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState(null);

  useEffect(() => {
    const updateCount = async () => {
      try {
        const orders = await getPendingOfflineOrders();
        setPendingCount(orders.length);
      } catch (e) {
        console.error('Failed to get pending orders:', e);
      }
    };
    updateCount();
    const interval = setInterval(updateCount, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOnline && pendingCount > 0 && !syncing) {
      syncNow();
    }
  }, [isOnline]);

  const syncNow = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await flushOfflineQueue(({ type }) => {
        if (type === 'synced') setPendingCount(p => Math.max(0, p - 1));
      });
      setLastSyncResult(result);
    } catch (e) {
      console.error('Sync failed:', e);
    } finally {
      setSyncing(false);
      const orders = await getPendingOfflineOrders();
      setPendingCount(orders.length);
    }
  }, [syncing]);

  const addToQueue = useCallback(async (endpoint, method, body, headers) => {
    const id = await addToOfflineQueue(endpoint, method, body, headers);
    setPendingCount(p => p + 1);
    return id;
  }, []);

  return {
    pendingCount,
    syncing,
    lastSyncResult,
    addToQueue,
    syncNow,
    isOnline,
  };
}

// Phase 5a: kitchen sync hook
function useKitchenSync(isOnline, authFetch, onSync) {
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const checkPending = useCallback(async () => {
    try {
      const pending = await getPendingKitchenSync();
      setPendingCount(pending.length);
    } catch {}
  }, []);

  useEffect(() => { checkPending(); }, [checkPending]);

  // Poll pending count every 5s
  useEffect(() => {
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, [checkPending]);

  const syncPendingChanges = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const pending = await getPendingKitchenSync();
      if (pending.length === 0) { setSyncing(false); return; }
      const batch = pending
        .filter((r) => r.status !== 'deleted')
        .map((r) => ({ itemId: r.itemId, status: r.status === 'reduced' ? 'processing' : r.status, updatedAt: r.updatedAt }));
      if (batch.length === 0) { setSyncing(false); return; }
      const resp = await authFetch('/api/sync/kitchen-batch', {
        method: 'POST',
        body: JSON.stringify({ changes: batch }),
      });
      if (resp.ok) {
        await markKitchenItemsSynced(pending.map((p) => p.itemId));
        await checkPending();
        if (onSync) onSync();
      }
    } catch {} finally {
      setSyncing(false);
    }
  }, [syncing, authFetch, checkPending, onSync]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline) syncPendingChanges();
  }, [isOnline, syncPendingChanges]);

  return { syncing, pendingCount, syncPendingChanges, checkPending };
}

function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalled(true);
    }
    setDeferredPrompt(null);
    return outcome === 'accepted';
  }, [deferredPrompt]);

  return { deferredPrompt, installed, install };
}

const MOCK_MENU = {
  store_name: "POS",
  categories: [
    { id: 1, name: "Cà phê", allow_all_toppings: 1, allowed_toppings: [] },
    { id: 2, name: "Trà sữa", allow_all_toppings: 1, allowed_toppings: [] },
    { id: 3, name: "Nước ép", allow_all_toppings: 0, allowed_toppings: [] },
    { id: 4, name: "Bánh ngọt", allow_all_toppings: 0, allowed_toppings: [] },
  ],
  products: [
    { id: 1, category_id: 1, name: "Cà phê đen", price: 25000, image_url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400", is_topping: 0, sizes: [] },
    { id: 2, category_id: 1, name: "Cà phê sữa đá", price: 30000, image_url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400", is_topping: 0, sizes: [] },
    { id: 3, category_id: 1, name: "Bạc xỉu", price: 35000, image_url: "https://images.unsplash.com/photo-1572442388796-11668a67e53d?w=400", is_topping: 0, sizes: [] },
    { id: 4, category_id: 2, name: "Trà sữa trân châu", price: 45000, image_url: "https://images.unsplash.com/photo-1558857563-b371033873b8?w=400", is_topping: 0, sizes: [] },
    { id: 5, category_id: 2, name: "Trà đào cam sả", price: 40000, image_url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400", is_topping: 0, sizes: [] },
    { id: 6, category_id: 3, name: "Nước ép cam", price: 35000, image_url: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=400", is_topping: 0, sizes: [] },
    { id: 7, category_id: 3, name: "Sinh tố bơ", price: 45000, image_url: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400", is_topping: 0, sizes: [] },
    { id: 8, category_id: 4, name: "Bánh croissant", price: 25000, image_url: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400", is_topping: 0, sizes: [] },
  ],
  tables: [
    { id: 1, name: "Bàn 1", status: "empty" },
    { id: 2, name: "Bàn 2", status: "empty" },
    { id: 3, name: "Bàn 3", status: "empty" },
    { id: 4, name: "Bàn 4", status: "empty" },
    { id: 5, name: "Bàn 5", status: "occupied", pending_order: { total: 245000 } },
    { id: 6, name: "Bàn 6", status: "empty" },
    { id: 7, name: "Bàn 7", status: "occupied", pending_order: { total: 120000 } },
    { id: 8, name: "Bàn 8", status: "empty" },
  ],
};

// M2 fix: calcLineTotal helper for consistent line total calculation
const calcLineTotal = (item) => {
  const toppingSum = (item.toppings || []).reduce((s, t) => s + (t.price || 0), 0);
  return (item.price + toppingSum) * (item.qty || item.quantity || 1);
};

// I2 fix: Stable cart key helper for React keys and cart operations
const cartKey = (item) => {
  if (item.tempId) return item.tempId;
  const sizePart = item.size ? `-${item.size.id || item.size.name}` : "";
  const toppingPart = (item.toppings || []).map((t) => t.id).sort().join(",");
  return `${item.id || item.product?.id || "?"}${sizePart}-${toppingPart}`;
};

// Batch 2 Fix 8: server clock offset helpers for real table timers
const getServerNow = (offsetMs) => Date.now() + (offsetMs || 0);

const getTimeDiffStr = (timeStr, offsetMs) => {
  if (!timeStr) return null;
  // SQLite datetime('now') stores UTC without timezone suffix — treat as UTC
  let ms;
  if (typeof timeStr === "string" && !timeStr.endsWith("Z") && !timeStr.includes("+")) {
    ms = new Date(timeStr.replace(" ", "T") + "Z").getTime();
  } else {
    ms = new Date(timeStr).getTime();
  }
  if (!Number.isFinite(ms)) return null;
  const diffMin = Math.floor((getServerNow(offsetMs) - ms) / 60000);
  if (diffMin < 0) return "0 phút";
  if (diffMin < 60) return `${diffMin}ph`;
  return `${Math.floor(diffMin / 60)}h ${diffMin % 60}ph`;
};

// I5 fix: Dismissed cancellations localStorage TTL helpers
const DISMISS_PREFIX = "kitchen_dismiss_";
const DISMISS_TTL_MS = 30 * 60 * 1000; // 30 minutes

const loadDismissed = () => {
  try {
    const raw = localStorage.getItem(DISMISS_PREFIX + "map");
    if (!raw) return {};
    const map = JSON.parse(raw);
    const now = Date.now();
    const filtered = {};
    for (const [k, v] of Object.entries(map)) {
      if (typeof v === "number" && now - v < DISMISS_TTL_MS) filtered[k] = v;
    }
    return filtered;
  } catch { return {}; }
};

const saveDismissed = (map) => {
  try { localStorage.setItem(DISMISS_PREFIX + "map", JSON.stringify(map)); } catch {}
};

const genToken = () => (crypto.randomUUID ? crypto.randomUUID() : "tk_" + Math.random().toString(36).slice(2));

// ============ Auth functions ============
async function authLogin(username, password) {
  const r = await fetch("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  let data;
  try { data = await r.json(); } catch { data = {}; }
  if (!r.ok) throw new Error(data.message || "Đăng nhập thất bại");
  return data;
}

async function authVerify(token) {
  try {
    const r = await fetch("/api/auth/verify", { headers: { "Authorization": `Bearer ${token}` } });
    if (!r.ok) return null;
    const data = await r.json();
    return data.valid ? data.user : null;
  } catch { return null; }
}

async function authLogout(token) {
  try { await fetch("/api/auth/logout", { method: "POST", headers: { "Authorization": `Bearer ${token}` } }); } catch {}
}

// Authenticated JSON fetch helper (admin/reports endpoints)
async function apiAuth(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const r = await fetch(path, { ...options, headers });
  let data = null;
  try { data = await r.json(); } catch { data = null; }
  if (!r.ok) {
    const err = new Error((data && (data.message || data.error)) || `Lỗi ${r.status}`);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ============ Cashier Login View ============
function LoginView({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await authLogin(username, password);
      localStorage.setItem(TOKEN_KEY, data.access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      onLogin(data.user);
    } catch (err) {
      setError(err.message || "Đăng nhập thất bại");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all hover:scale-[1.01]">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-primary-100 p-4 rounded-full mb-4">
            <div className="w-8 h-8 flex items-center justify-center text-primary-600"><Icon name="lock" className="w-8 h-8" /></div>
          </div>
          <h1 className="text-3xl font-bold text-gray-800">F&B POS</h1>
          <p className="text-gray-500 mt-2 text-center">Đăng nhập để bắt đầu phiên làm việc</p>
        </div>
        <form onSubmit={onSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tên đăng nhập</label>
            <input
              type="text" value={username} data-focus-key="login-username"
              onChange={(e) => setUsername(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              placeholder="admin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mật khẩu</label>
            <input
              type="password" value={password} data-focus-key="login-password"
              onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">{error}</div>}
          <button
            type="submit" disabled={loading}
            className={`w-full bg-primary-600 text-white py-3 rounded-xl font-bold hover:bg-primary-700 active:transform active:scale-95 transition-all shadow-lg hover:shadow-primary-200 ${
              loading ? "opacity-70 cursor-not-allowed" : ""
            }`}
          >{loading ? "Đang đăng nhập..." : "Đăng Nhập"}</button>
        </form>
        <a href="/chamcong"
          className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-emerald-700 font-bold hover:bg-gray-50 transition-all">
          <Icon name="clock" className="w-5 h-5" /> Chấm công vào/ra ca
        </a>
        <div className="mt-8 text-center text-gray-400 text-sm">© 2026 Premium POS System</div>
      </div>
    </div>
  );
}

// ============ Cashier PosApp ============
// Fix 4: authFetch — adds Bearer token to every cashier request
async function authFetch(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const r = await fetch(path, { ...options, headers });
  let data = null;
  try { data = await r.json(); } catch { data = null; }
  if (!r.ok) {
    const err = new Error((data && (data.message || data.error)) || `Lỗi ${r.status}`);
    err.status = r.status;
    err.data = data;
    throw err;
  }
  return data;
}

// Batch 3: WebAudio beep function for kitchen/counter alerts
// File chuông báo phát qua <audio> (media stream — to theo volume máy),
// fallback oscillator nếu file lỗi.
const ALERT_SOUND_URL = "/sounds/kitchen-alert.wav";
let _alertAudio = null;
const playBeep = () => {
  try {
    // Chuông tùy chỉnh + volume — tương thích config của POS cũ (localStorage)
    const custom = localStorage.getItem("kitchen_alert_sound");
    const vol = Math.max(0, Math.min(1, parseFloat(localStorage.getItem("kitchen_alert_volume") || "1")));
    const src = custom || ALERT_SOUND_URL;
    if (!_alertAudio || _alertAudio._src !== src) {
      _alertAudio = new Audio(src);
      _alertAudio._src = src;
      _alertAudio.preload = "auto";
      _alertAudio.onerror = () => { _alertAudio = null; };
    }
    _alertAudio.volume = vol;
    _alertAudio.currentTime = 0;
    const p = _alertAudio.play();
    if (p && p.catch) p.catch(() => playBeepOsc());
    return;
  } catch {}
  playBeepOsc();
};
// Fallback: oscillator sine "ding-dong" êm khi file âm thanh không phát được
const playBeepOsc = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const t0 = ctx.currentTime;
    [[1046.5, 0.55], [784, 0.85]].forEach(([f, dur], i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = f;
      osc.type = "sine";
      const s = t0 + i * 0.65;
      gain.gain.setValueAtTime(0.001, s);
      gain.gain.exponentialRampToValueAtTime(0.9, s + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.01, s + dur);
      osc.start(s);
      osc.stop(s + dur);
    });
    setTimeout(() => ctx.close(), 2000);
  } catch {}
};

// ============ Global Sync: Extracted fetch functions (pure, no setState) ============
async function fetchTablesData() {
  const tbl = await authFetch("/api/tables");
  return { tables: tbl.tables || [], serverTime: tbl.server_time };
}

async function fetchMergedOrders() {
  const [dineinData, takeawayData] = await Promise.all([
    authFetch("/api/orders").catch(() => ({ orders: [] })),
    authFetch("/api/takeaway?status=pending").catch(() => []),
  ]);
  const dinein = (dineinData.orders || []).map((o) => ({ ...o, _kind: "dinein" }));
  // /api/orders đã trả cả takeaway/ship → dedupe theo id, giữ bản takeaway (chi tiết hơn)
  const takeawayOrShip = (Array.isArray(takeawayData) ? takeawayData : []).map((o) => ({
    ...o, _kind: o.order_type === "ship" ? "ship" : "takeaway",
  }));
  const byId = new Map();
  for (const o of [...dinein, ...takeawayOrShip]) byId.set(o.id, o);
  return [...byId.values()].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}

async function fetchStaffCallsData() {
  const calls = await authFetch("/api/staff-calls");
  return Array.isArray(calls) ? calls : [];
}

async function fetchKitchenOrdersData(unit) {
  const [ordersResp, eventsResp] = await Promise.all([
    authFetch(`/api/orders/kitchen?unit=${unit}`),
    authFetch(`/api/orders/kitchen/cancellation-events?unit=${unit}&hours=12`),
  ]);
  const orders = Array.isArray(ordersResp) ? ordersResp : [];
  const events = Array.isArray(eventsResp) ? eventsResp : [];
  const cancelledMap = {};
  for (const ev of events) {
    const itemId = parseInt(ev.item_id, 10);
    if (!Number.isFinite(itemId) || cancelledMap[itemId]) continue;
    cancelledMap[itemId] = {
      event_id: ev.event_id, action: ev.action,
      old_quantity: ev.old_quantity, new_quantity: ev.new_quantity,
      product_name: ev.product_name, table_name: ev.table_name, created_at: ev.created_at,
    };
  }
  return { orders, cancelledMap };
}

// ============ Global Sync: Context + Polling Hook + Provider ============
const SyncContext = createContext(null);

function useSyncPolling() {
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [staffCalls, setStaffCalls] = useState([]);
  const [serverOffsetMs, setServerOffsetMs] = useState(0);
  const [kitchenOrders, setKitchenOrders] = useState([]);
  const [counterOrders, setCounterOrders] = useState([]);
  const [kitchenCancelled, setKitchenCancelled] = useState({});
  const [counterCancelled, setCounterCancelled] = useState({});

  // Notification refs (PosApp reads these to play beep/toast)
  const staffCallsRef = useRef([]);
  const newStaffCallsRef = useRef([]);
  const prevKitchenOrderIdsRef = useRef(null); // null = chưa tải lần đầu → không báo lúc khởi động
  const prevCounterOrderIdsRef = useRef(null);
  const newKitchenAlertRef = useRef(false);
  const newCounterAlertRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    // Local server + ít thiết bị: fetch full luôn, không cần change-key gate
    // (đó là tối ưu cho D1 remote). SSE báo ngay sau mỗi mutation → data luôn mới.
    const poll = async () => {
      const tasks = [
        // Tables + staff calls + orders (POS)
        (async () => {
          const [tblData, callsData, ordersData] = await Promise.all([
            fetchTablesData().catch(() => null),
            fetchStaffCallsData().catch(() => []),
            fetchMergedOrders().catch(() => []),
          ]);
          if (cancelled) return;
          if (tblData) {
            setTables(tblData.tables);
            if (tblData.serverTime) {
              const offset = new Date(tblData.serverTime).getTime() - Date.now();
              if (Number.isFinite(offset)) setServerOffsetMs(offset);
            }
          }
          // Detect new staff calls
          const prevIds = new Set(staffCallsRef.current.map((c) => c.id));
          const newCalls = callsData.filter((c) => !prevIds.has(c.id));
          if (newCalls.length > 0) newStaffCallsRef.current.push(...newCalls);
          staffCallsRef.current = callsData;
          setStaffCalls(callsData);
          setOrders(ordersData);
        })(),
        // Kitchen context
        (async () => {
          const data = await fetchKitchenOrdersData("kitchen").catch(() => null);
          if (cancelled || !data) return;
          // Detect món MỚI theo item id — khách gọi thêm vào bill cũ cũng báo
          const newIds = new Set(data.orders.flatMap((o) => (o.items || []).map((it) => it.id)));
          if (prevKitchenOrderIdsRef.current !== null) {
            for (const id of newIds) {
              if (!prevKitchenOrderIdsRef.current.has(id)) { newKitchenAlertRef.current = true; break; }
            }
          }
          prevKitchenOrderIdsRef.current = newIds;
          setKitchenOrders(data.orders);
          setKitchenCancelled(data.cancelledMap);
        })(),
        // Counter context
        (async () => {
          const data = await fetchKitchenOrdersData("counter").catch(() => null);
          if (cancelled || !data) return;
          const newIds = new Set(data.orders.flatMap((o) => (o.items || []).map((it) => it.id)));
          if (prevCounterOrderIdsRef.current !== null) {
            for (const id of newIds) {
              if (!prevCounterOrderIdsRef.current.has(id)) { newCounterAlertRef.current = true; break; }
            }
          }
          prevCounterOrderIdsRef.current = newIds;
          setCounterOrders(data.orders);
          setCounterCancelled(data.cancelledMap);
        })(),
      ];
      await Promise.all(tasks);
    };

    // SSE push là chính: mutation → server broadcast → fetch ngay
    // Interval 15s chỉ là dự phòng nếu SSE rớt (EventSource tự reconnect nhưng vẫn an toàn)
    poll();
    const interval = setInterval(poll, 15000);
    const es = new EventSource("/api/events");
    es.onmessage = () => poll();
    return () => { cancelled = true; clearInterval(interval); es.close(); };
  }, []);

  // Imperative refresh helpers (for mutation handlers)
  const refreshTables = useCallback(async () => {
    try {
      const tblData = await fetchTablesData();
      setTables(tblData.tables);
      if (tblData.serverTime) {
        const offset = new Date(tblData.serverTime).getTime() - Date.now();
        if (Number.isFinite(offset)) setServerOffsetMs(offset);
      }
    } catch {}
  }, []);

  const refreshOrders = useCallback(async () => {
    try {
      const data = await fetchMergedOrders();
      setOrders(data);
    } catch {}
  }, []);

  return {
    tables, setTables, orders, setOrders, staffCalls, setStaffCalls, serverOffsetMs,
    kitchenOrders, counterOrders, kitchenCancelled, counterCancelled,
    refreshTables, refreshOrders,
    newStaffCallsRef, newKitchenAlertRef, newCounterAlertRef,
  };
}

function SyncProvider({ children }) {
  const syncData = useSyncPolling();
  return <SyncContext.Provider value={syncData}>{children}</SyncContext.Provider>;
}

function PosApp({ user, onLogout }) {
  // Global sync: consume shared data from SyncProvider
  const sync = useContext(SyncContext);
  // Phase 3: offline order queue
  const isOnline = useOnlineStatus();
  const { pendingCount, addToQueue } = useOfflineQueue(isOnline);
  const { tables, setTables, orders, setOrders, staffCalls, setStaffCalls, serverOffsetMs,
          refreshTables, refreshOrders, newStaffCallsRef, newKitchenAlertRef, newCounterAlertRef } = sync;

  // Batch 3: URL sync — read initial tab from URL
  const initialTab = (() => {
    try { return new URLSearchParams(window.location.search).get('tab') || 'tables'; } catch { return 'tables'; }
  })();
  const [view, setViewRaw] = useState(initialTab);
  const setView = (newView) => {
    setViewRaw(newView);
    try { window.history.replaceState(null, '', `?tab=${newView}`); } catch {}
  };
  // Batch 3: Listen for popstate (back/forward)
  useEffect(() => {
    const handler = () => {
      try {
        const tab = new URLSearchParams(window.location.search).get('tab');
        if (tab) setViewRaw(tab);
      } catch {}
    };
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const [storeName, setStoreName] = useState("Đang tải...");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [tableFilterTab, setTableFilterTab] = useState("tables"); // "tables" | "takeaway" | "ship"
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const hasInitCategory = useRef(false);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [showMobileCart, setShowMobileCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [usingMock, setUsingMock] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  // Size/topping modals
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedProductForSize, setSelectedProductForSize] = useState(null);
  const [showToppingModal, setShowToppingModal] = useState(false);
  const [selectedCartItemForTopping, setSelectedCartItemForTopping] = useState(null);
  const [toppings, setToppings] = useState([]);
  // Cashier flow state (Task 8)
  const [editingNotesIndex, setEditingNotesIndex] = useState(null);
  const [editingPriceIndex, setEditingPriceIndex] = useState(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferTargetId, setTransferTargetId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  // Batch 1: delta-submit + order tracking + positions A-D
  const [initialCart, setInitialCart] = useState([]);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [selectedPosition, setSelectedPosition] = useState("A");
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [showTablePicker, setShowTablePicker] = useState(false); // popup chọn bàn từ ORDER NHANH
  // Table order history
  const [tableHistory, setTableHistory] = useState(null); // { tableId, tableName, orders }
  const [tableHistoryLoading, setTableHistoryLoading] = useState(false);
  const [tableHistoryDetail, setTableHistoryDetail] = useState(null); // order object for detail view

  // Batch 2 Fix 6: takeaway/ship flow from POS
  const [takeawayOrders, setTakeawayOrders] = useState([]);
  const [showTakeawayNameModal, setShowTakeawayNameModal] = useState(false);
  const [takeawayCustomerName, setTakeawayCustomerName] = useState("");
  const [pendingTakeawayCart, setPendingTakeawayCart] = useState(null);
  const [takeawayPaymentModal, setTakeawayPaymentModal] = useState(null); // { orderId }
  // Ship mode: bật/tắt nhận đơn ship + lý do khi tắt
  const [shipMode, setShipMode] = useState({ enabled: true, reason: null });
  const [shipModeBusy, setShipModeBusy] = useState(false);
  const [showShipOffModal, setShowShipOffModal] = useState(false);
  useEffect(() => {
    authFetch("/api/settings").then((d) =>
      setShipMode({
        enabled: d.ship_enabled !== false,
        reason: d.ship_disable_message || d.ship_disable_reason || null,
      })
    ).catch(() => {});
  }, []);
  const saveShipMode = async (enabled, reason) => {
    setShipModeBusy(true);
    try {
      const r = await authFetch("/api/admin/ship-mode", {
        method: "POST",
        body: JSON.stringify({ enabled, reason: reason || null }),
      });
      setShipMode({ enabled: r.ship_enabled !== false, reason: r.ship_disable_message || null });
      setShowShipOffModal(false);
    } catch (e) {
      alert("Lỗi đổi chế độ ship: " + (e.message || e));
    } finally {
      setShipModeBusy(false);
    }
  };
  // Batch 2 Fix 10: delete confirm + reduce quantity modals
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null); // { cartIndex, orderItemId, name }
  const [reduceModalItem, setReduceModalItem] = useState(null); // { cartIndex, orderItemId, name, currentQty }
  const [reduceQtyInput, setReduceQtyInput] = useState("");
  // Batch 3: alert beep refs for kitchen/counter new-item detection
  const prevKitchenCount = useRef(0);
  const prevCounterCount = useRef(0);

  // Phase 2 offline: cache-first menu load
  useEffect(() => {
    const loadMenu = async () => {
      // 1. Hiển thị cache trước (nếu có)
      const cached = await getMenuFromCache();
      if (cached) {
        setStoreName(cached.store_name || "POS Demo");
        const prods = (cached.products || []).filter((p) => !p.is_topping);
        const tops = (cached.products || []).filter((p) => p.is_topping);
        setCategories(cached.categories || []);
        setProducts(prods);
        setToppings(tops);
      }
      // 2. Luôn thử cập nhật từ server
      try {
        const menu = await authFetch("/api/menu");
        setStoreName(menu.store_name || "POS Demo");
        const prods = (menu.products || []).filter((p) => !p.is_topping);
        const tops = (menu.products || []).filter((p) => p.is_topping);
        setCategories(menu.categories || []);
        setProducts(prods);
        setToppings(tops);
        setUsingMock(false);
        // Lưu vào IndexedDB để dùng offline
        await saveMenuToCache(menu);
        if (menu.settings) await saveSettingsToCache(menu.settings);
      } catch {
        // Server không truy cập được — dùng cache hoặc mock
        if (!cached) {
          setStoreName(MOCK_MENU.store_name + " (preview)");
          setCategories(MOCK_MENU.categories);
          setProducts(MOCK_MENU.products);
          setUsingMock(true);
        } else {
          setUsingMock(true);
        }
      }
    };
    loadMenu();
    // Tables loaded by SyncProvider's initial poll — no need to fetch here
  }, []);

  const showToast = (msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 2000);
  };

  // Staff call notifications: detect new calls from sync context, show toast + beep
  useEffect(() => {
    const newCalls = newStaffCallsRef.current;
    if (newCalls && newCalls.length > 0) {
      for (const c of newCalls) {
        showToast(`${c.table_name || "Bàn " + c.table_id} gọi nhân viên`);
        playBeep();
      }
      newStaffCallsRef.current = [];
    }
  });

  // Kitchen/counter audio alerts from sync context
  useEffect(() => {
    if (newKitchenAlertRef.current) { playBeep(); newKitchenAlertRef.current = false; }
    if (newCounterAlertRef.current) { playBeep(); newCounterAlertRef.current = false; }
  });

  // Keep selectedTable in sync when context updates tables
  useEffect(() => {
    if (selectedTable) {
      const updated = tables.find((t) => t.id === selectedTable.id);
      if (updated) setSelectedTable(updated);
    }
  }, [tables, selectedTable?.id]);

  // Batch 3: auto-select first category when entering menu view
  useEffect(() => {
    if (view === 'menu' && !hasInitCategory.current && categories.length > 0) {
      // Auto-select first non-counter category for kitchen-first workflow
      const firstKitchen = categories.find((c) => c.production_unit !== 'counter');
      if (firstKitchen) setSelectedCategory(firstKitchen.id);
      hasInitCategory.current = true;
    }
  }, [view, categories]);

  const filtered = useMemo(() => products.filter((p) => {
    if (search.trim()) {
      const searchNorm = removeAccents(search.toLowerCase().trim());
      return removeAccents(p.name.toLowerCase()).includes(searchNorm);
    }
    if (selectedCategory !== null && p.category_id !== selectedCategory) return false;
    return true;
  }), [products, selectedCategory, search]);

  const cartTotal = cart.reduce((s, it) => {
    const toppingSum = (it.toppings || []).reduce((ts, t) => ts + t.price, 0);
    return s + (it.price + toppingSum) * it.qty;
  }, 0);
  const cartCount = cart.reduce((s, it) => s + it.qty, 0);

  const addToCart = (p) => {
    // If product has sizes, show size modal first
    if (p.sizes && p.sizes.length > 0) {
      setSelectedProductForSize(p);
      setShowSizeModal(true);
      return;
    }
    const found = cart.find((it) => it.id === p.id && (!it.size) && (!it.toppings || it.toppings.length === 0));
    if (found) {
      setCart(cart.map((it) => (it === found ? { ...it, qty: it.qty + 1 } : it)));
    } else {
      setCart([...cart, { id: p.id, name: p.name, price: p.price, image_url: p.image_url || null, qty: 1, size: null, toppings: [], notes: "" }]);
    }
    
    showToast(`Đã thêm ${p.name}`);
  };

  const confirmSize = (size) => {
    if (!selectedProductForSize) return;
    const p = selectedProductForSize;
    const found = cart.find((it) => it.id === p.id && it.size && it.size.id === size.id && (!it.toppings || it.toppings.length === 0));
    if (found) {
      setCart(cart.map((it) => (it === found ? { ...it, qty: it.qty + 1 } : it)));
    } else {
      setCart([...cart, { id: p.id, name: p.name, price: size.price, image_url: p.image_url || null, qty: 1, size: size, toppings: [], notes: "" }]);
    }
    
    showToast(`Đã thêm ${p.name} (${size.name})`);
    setShowSizeModal(false);
    setSelectedProductForSize(null);
  };

  // Fix 1: cart identity key — product + size + sorted toppings + notes
  const cartIdentity = (it) => {
    const sizePart = it.size ? `s${it.size.id ?? it.size.name}` : "s0";
    const topPart = (it.toppings || []).map((t) => t.id).sort((a, b) => a - b).join(",");
    const notePart = (it.notes || "").trim();
    return `${it.id}|${sizePart}|${topPart}|${notePart}`;
  };

  // Món mới = cart hiện tại trừ snapshot đã gửi (initialCart).
  // QUAN TRỌNG: mọi đường POST /api/orders phải gửi delta này — server
  // append thẳng vào đơn pending, gửi nguyên cart sẽ ghi trùng món.
  const computeNewItems = (cartItems, initialItems) => {
    const initialMap = new Map();
    for (const it of initialItems) {
      const key = cartIdentity(it);
      initialMap.set(key, (initialMap.get(key) || 0) + it.qty);
    }
    const currentMap = new Map();
    for (const it of cartItems) {
      const key = cartIdentity(it);
      currentMap.set(key, (currentMap.get(key) || 0) + it.qty);
    }
    const out = [];
    const seen = new Set();
    for (const it of cartItems) {
      const key = cartIdentity(it);
      if (seen.has(key)) continue;
      seen.add(key);
      const delta = (currentMap.get(key) || 0) - (initialMap.get(key) || 0);
      if (delta > 0) {
        out.push({
          product_id: it.id,
          quantity: delta,
          size_id: it.size?.id,
          toppings: (it.toppings || []).map((t) => t.id),
          note: it.notes || "",
        });
      }
    }
    return out;
  };

  // Fix 2: delete a submitted item on the server (with local fallback)
  const deleteServerItem = async (it) => {
    if (!it.orderItemId || !currentOrderId) return;
    try {
      await authFetch(`/api/orders/${currentOrderId}/items/${it.orderItemId}`, { method: "DELETE" });
      await refreshTables();
    } catch (err) {
      showToast("Lỗi xóa món: " + err.message);
    }
  };

  // Batch 2 Fix 10: confirm modal flows for delete/reduce of submitted items
  const requestRemoveItem = (idx) => {
    const it = cart[idx];
    if (!it) return;
    if (it.orderItemId && currentOrderId) {
      setDeleteConfirmItem({ cartIndex: idx, orderItemId: it.orderItemId, name: it.name });
    } else {
      // Not yet submitted — remove locally, no confirm
      removeCartItem(idx);
    }
  };

  const confirmDeleteItem = async () => {
    if (!deleteConfirmItem) return;
    const { cartIndex } = deleteConfirmItem;
    setDeleteConfirmItem(null);
    removeCartItem(cartIndex);
  };

  const requestReduceQty = (idx) => {
    const it = cart[idx];
    if (!it) return;
    if (it.orderItemId && currentOrderId && it.qty > 1) {
      setReduceModalItem({ cartIndex: idx, orderItemId: it.orderItemId, name: it.name, currentQty: it.qty });
      setReduceQtyInput("1");
    } else {
      updateQty(idx, -1);
    }
  };

  const confirmReduceQty = async () => {
    if (!reduceModalItem) return;
    const { cartIndex } = reduceModalItem;
    const n = parseInt(reduceQtyInput, 10);
    if (isNaN(n) || n < 1 || n > reduceModalItem.currentQty) {
      showToast(`Nhập số từ 1 đến ${reduceModalItem.currentQty}`);
      return;
    }
    setReduceModalItem(null);
    setReduceQtyInput("");
    updateQty(cartIndex, -n);
  };

  // Fix 2: reduce/increase a submitted item quantity on the server
  const updateServerItemQty = async (it, newQty) => {
    if (!it.orderItemId || !currentOrderId) return;
    try {
      if (newQty <= 0) {
        await authFetch(`/api/orders/${currentOrderId}/items/${it.orderItemId}`, { method: "DELETE" });
      } else {
        await authFetch(`/api/orders/${currentOrderId}/items/${it.orderItemId}`, {
          method: "PUT",
          body: JSON.stringify({ quantity: newQty }),
        });
      }
      await refreshTables();
    } catch (err) {
      showToast("Lỗi cập nhật món: " + err.message);
    }
  };

  // Fix 2: sync cart change (qty delta / removal) for already-submitted items
  const syncCartChange = (prevCart, nextCart) => {
    if (!currentOrderId) return;
    for (const prev of prevCart) {
      if (!prev.orderItemId) continue;
      const next = nextCart.find((c) => c.orderItemId === prev.orderItemId);
      if (!next) {
        // Item removed entirely
        deleteServerItem(prev);
      } else if (next.qty !== prev.qty) {
        updateServerItemQty(next, next.qty);
      }
    }
  };

  const updateQty = (idx, delta) => {
    const prev = cart[idx];
    if (!prev) return;
    const newQty = prev.qty + delta;
    let nextCart;
    if (newQty <= 0) {
      nextCart = cart.filter((_, i) => i !== idx);
    } else {
      nextCart = cart.map((it, i) => (i === idx ? { ...it, qty: newQty } : it));
    }
    setCart(nextCart);
    if (prev.orderItemId && currentOrderId) {
      syncCartChange(cart, nextCart);
    }
    
  };

  const removeCartItem = (idx) => {
    const prev = cart[idx];
    if (!prev) return;
    const nextCart = cart.filter((_, i) => i !== idx);
    setCart(nextCart);
    if (prev.orderItemId && currentOrderId) {
      syncCartChange(cart, nextCart);
    }
    
  };

  const clearCart = () => {
    setCart([]);
    setInitialCart([]);
    setCurrentOrderId(null);
    setSelectedPosition("A");
    setSelectedTable(null);
    
    setEditingNotesIndex(null);
    setEditingPriceIndex(null);
  };

  const updateNotes = (idx, value) => {
    setCart(cart.map((it, i) => (i === idx ? { ...it, notes: value } : it)));
    
  };

  const updatePrice = (idx, value) => {
    const newPrice = Number(value);
    if (!Number.isFinite(newPrice) || newPrice < 0) return;
    setCart(cart.map((it, i) => (i === idx ? { ...it, price: newPrice } : it)));
    
  };

  const openToppingModal = (idx) => {
    setSelectedCartItemForTopping(idx);
    setShowToppingModal(true);
  };

  // I3 fix: Filter toppings based on category allow_all_toppings and allowed_toppings
  const getAllowedToppingsForItem = (cartItem) => {
    const productId = cartItem.id;
    const product = products.find((p) => p.id === productId);
    if (!product) return toppings;
    const category = categories.find((c) => c.id === product.category_id);
    if (!category) return toppings;
    if (category.allow_all_toppings) return toppings;
    if (category.allowed_toppings && category.allowed_toppings.length > 0) {
      return toppings.filter((t) => category.allowed_toppings.includes(t.id));
    }
    return [];
  };

  const toggleTopping = (topping) => {
    if (selectedCartItemForTopping === null) return;
    setCart(cart.map((it, i) => {
      if (i !== selectedCartItemForTopping) return it;
      const exists = it.toppings.find((t) => t.id === topping.id);
      const newToppings = exists ? it.toppings.filter((t) => t.id !== topping.id) : [...it.toppings, topping];
      return { ...it, toppings: newToppings };
    }));
    
  };

  // Fix 1: delta-only submit + reuse pending order
  // "Báo chế biến": send only new items since last submit; server reuses existing pending order
  const submitOrder = async (tableToOrder = null) => {
    if (cart.length === 0) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      // Compute delta vs initialCart (snapshot after previous successful submit)
      const newItems = computeNewItems(cart, initialCart);
      if (newItems.length === 0) {
        showToast("Không có món mới để gửi");
        return;
      }
      const payload = {
        table_id: tableToOrder != null ? tableToOrder : (selectedTable?.status === "takeaway" ? null : selectedTable?.id ?? null),
        table_position: selectedPosition,
        order_type: selectedTable?.status === "takeaway" ? "takeaway" : "dine_in",
        payment_method: paymentMethod,
        items: newItems,
      };
      // Snapshot baseline
      setInitialCart(JSON.parse(JSON.stringify(cart)));
      setShowCheckout(false);
      try {
        const data = await authFetch("/api/orders", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        setCurrentOrderId(data.order_id);
        showToast("Đã gửi báo chế biến");
        refreshTables();
        refreshOrders();
      } catch {
        // Offline: lưu vào queue để sync sau
        await addToQueue("/api/orders", "POST", payload, {});
        showToast("Đã lưu offline — sẽ đồng bộ khi có mạng");
      }
      setSubmitting(false);
    } catch (err) {
      showToast("Lỗi gửi bếp: " + err.message);
      setSubmitting(false);
    }
  };

  // Quick order (no table): "Mang về" / "Ship"
  // Batch 2 Fix 6: opens TakeawayNameModal first, then submits with customer_name
  const openTakeawayModal = (orderType) => {
    if (cart.length === 0) return;
    setPendingTakeawayCart({ orderType, cart: JSON.parse(JSON.stringify(cart)) });
    setTakeawayCustomerName("");
    setShowTakeawayNameModal(true);
  };

  const submitQuickOrder = async (orderType, customerName = "") => {
    if (cart.length === 0) return;
    if (submitting) return;
    setSubmitting(true);
    try {
      const r = await authFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          table_id: null,
          order_type: orderType,
          payment_method: paymentMethod,
          customer_name: customerName || null,
          items: cart.map((c) => ({
            product_id: c.id,
            quantity: c.qty,
            size_id: c.size?.id,
            toppings: (c.toppings || []).map((t) => t.id),
            note: c.notes || "",
          })),
        }),
      });
      await refreshTables();
      setShowCheckout(false);
      showToast(`Đã gửi đơn ${orderType === "takeaway" ? "mang về" : "ship"} ${r.display_code || "#" + r.order_id}`);
      refreshOrders();
      setTimeout(() => { clearCart(); setView("tables"); }, 1200);
    } catch (err) {
      showToast("Lỗi: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Batch 2 Fix 6: confirm takeaway name modal → submit order with customer_name
  const confirmTakeawayName = () => {
    if (!pendingTakeawayCart) return;
    const name = takeawayCustomerName.trim() || "Khách";
    const orderType = pendingTakeawayCart.orderType;
    setShowTakeawayNameModal(false);
    setPendingTakeawayCart(null);
    submitQuickOrder(orderType, name);
  };

  // "Thanh toán": gửi món + thanh toán + đóng bàn, tất cả chạy nền
  const handlePayment = async () => {
    if (!selectedTable) return;
    if (cart.length === 0 && selectedTable.status !== "occupied") return;
    const tableId = selectedTable.id;
    const pos = selectedPosition;
    // Capture delta món CHƯA gửi trước khi clear — gửi nguyên cart sẽ
    // ghi trùng các món đã báo chế biến (server append vào đơn pending)
    const pendingItems = computeNewItems(cart, initialCart);
    // Optimistic: đóng bàn ngay trên UI
    setShowCheckout(false);
    clearCart();
    setView("tables");
    showToast("Đã thanh toán");
    // Gửi BE chạy nền — không block UI, không đụng submitting
    try {
      if (pendingItems.length > 0) {
        await authFetch("/api/orders", {
          method: "POST",
          body: JSON.stringify({ table_id: tableId, table_position: pos, order_type: "dine_in", payment_method: paymentMethod, items: pendingItems }),
        });
      }
      await authFetch(`/api/tables/${tableId}/pay`, {
        method: "POST",
        body: JSON.stringify({ payment_method: paymentMethod, table_position: pos }),
      });
      refreshTables();
    } catch (err) {
      showToast("Lỗi thanh toán: " + err.message);
      refreshTables();
    }
  };

  // "Chuyển bàn": pick empty table then transfer
  const confirmTransfer = async () => {
    if (!selectedTable || !transferTargetId) return;
    // Chỉ chuyển bàn khi bàn đã có đơn (occupied) hoặc có món trong giỏ
    if (cart.length === 0 && selectedTable.status !== "occupied") return;
    try {
      await authFetch("/api/tables/transfer", {
        method: "POST",
        body: JSON.stringify({ old_table_id: selectedTable.id, new_table_id: transferTargetId }),
      });
      await refreshTables();
      setShowTransferModal(false);
      setTransferTargetId(null);
      clearCart();
      setView("tables");
      showToast("Đã chuyển bàn");
    } catch (err) {
      showToast("Lỗi: " + err.message);
    }
  };

  // Batch 2 Fix 7: resolve a staff call
  const resolveStaffCall = async (callId) => {
    try {
      await authFetch(`/api/staff-calls/${callId}/resolve`, { method: "POST" });
      setStaffCalls((prev) => prev.filter((c) => c.id !== callId));
      showToast("Đã xử lý gọi nhân viên");
    } catch (err) {
      showToast("Lỗi: " + err.message);
    }
  };

  // Xem lịch sử đơn hàng của bàn
  const openTableHistory = async (e, t) => {
    e.stopPropagation(); // không mở bàn khi bấm lịch sử
    setTableHistoryLoading(true);
    setTableHistory({ tableId: t.id, tableName: t.name, orders: [] });
    try {
      const data = await authFetch(`/api/orders/history?table_id=${t.id}`);
      setTableHistory({ tableId: t.id, tableName: t.name, orders: data || [] });
    } catch (err) {
      showToast("Lỗi tải lịch sử: " + err.message);
      setTableHistory(null);
    } finally {
      setTableHistoryLoading(false);
    }
  };

  // Batch 2 Fix 6: complete takeaway/ship order with payment method
  const confirmTakeawayComplete = async () => {
    if (!takeawayPaymentModal) return;
    const { orderId, paymentMethod: pm } = takeawayPaymentModal;
    setTakeawayPaymentModal(null);
    try {
      await authFetch(`/api/takeaway/${orderId}/complete`, {
        method: "POST",
        body: JSON.stringify({ payment_method: pm }),
      });
      showToast("Đã hoàn thành đơn");
      await refreshOrders();
    } catch (err) {
      showToast("Lỗi: " + err.message);
    }
  };

  // Fix 3 + Fix 5: open table — occupied tables load current_order_items into cart
  // and show a position picker (A-D) like the source InternalPosModal
  // UX: không có vị trí nào có khách → mở luôn vị trí A;
  //     đúng 1 vị trí có khách → mở luôn vị trí đó để xem;
  //     nhiều hơn 1 → mới hiện modal chọn vị trí.
  const handleTableClick = (t) => {
    // Nếu đang ở ORDER NHANH (không có bàn) mà giỏ có items → chỉ gán bàn, giữ giỏ
    const isAssignFromQuickOrder = !selectedTable && cart.length > 0;
    setSelectedTable(t);
    setSelectedCategory(null);
    if (!isAssignFromQuickOrder) {
      setCart([]);
      setInitialCart([]);
      setCurrentOrderId(null);
    }

    setEditingNotesIndex(null);
    setEditingPriceIndex(null);
    const positions = t.positions || [];
    const occupiedPositions = positions.filter((p) => p.status === "occupied");
    if (occupiedPositions.length > 1) {
      // Nhiều vị trí có khách: buộc phải chọn
      setShowPositionPicker(true);
      setView("tables");
      return;
    }
    if (occupiedPositions.length === 1) {
      // Đúng 1 vị trí có khách: mở luôn vị trí đó để xem đơn hiện tại
      openPosition(occupiedPositions[0].position, t);
      return;
    }
    // Không có vị trí nào có khách: mặc định mở vị trí A
    setSelectedPosition("A");
    setView("menu");
  };

  // Fix 3: load a specific position's pending order items into the cart
  const openPosition = async (pos, tableOverride = null) => {
    setShowPositionPicker(false);
    setSelectedPosition(pos);
    const table = tableOverride || selectedTable;
    if (!table) return;
    const posData = (table.positions || []).find((p) => p.position === pos);
    if (posData && posData.current_order_items && posData.current_order_items.length > 0) {
      const items = posData.current_order_items.map((it) => ({
        id: it.product_id,
        name: it.name,
        price: it.price,
        image_url: it.image_url || null,
        qty: it.quantity,
        size: it.size_name ? { id: null, name: it.size_name } : null,
        toppings: it.toppings || [],
        notes: it.note || "",
        orderItemId: it.id,
        order_id: it.order_id,
      }));
      setCart(items);
      setInitialCart(JSON.parse(JSON.stringify(items)));
      setCurrentOrderId(items[0]?.order_id || null);
    } else {
      setCart([]);
      setInitialCart([]);
      setCurrentOrderId(null);
    }
    setView("menu");
  };

  // Tính có món mới (delta > 0) so với lần báo chế biến trước
  const hasNewItems = (() => {
    if (cart.length === 0) return false;
    const initialMap = new Map();
    for (const it of initialCart) {
      const key = cartIdentity(it);
      initialMap.set(key, (initialMap.get(key) || 0) + it.qty);
    }
    const currentMap = new Map();
    for (const it of cart) {
      const key = cartIdentity(it);
      currentMap.set(key, (currentMap.get(key) || 0) + it.qty);
    }
    for (const [key, curQty] of currentMap) {
      if (curQty > (initialMap.get(key) || 0)) return true;
    }
    return false;
  })();

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* Phase 7: offline banner */}
      {(!isOnline || pendingCount > 0) && (
        <div className="w-full bg-yellow-500 text-yellow-900 text-center text-sm font-bold py-1 px-4 flex items-center justify-center gap-2 shrink-0">
          <Icon name="wifi-off" className="w-4 h-4" />
          {!isOnline ? "Offline — Hoạt động ngoại tuyến" : "Đang đồng bộ..."}
          {pendingCount > 0 && (
            <span className="bg-yellow-700 text-yellow-100 px-2 py-0.5 rounded-full text-xs">{pendingCount} đơn chờ</span>
          )}
        </div>
      )}
      <aside className="hidden md:flex flex-col items-center py-6 bg-white border-r shadow-sm w-20">
        <button onClick={() => setView("tables")} title="POS"
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${view === "tables" ? "bg-primary-600 text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}><Icon name="shopping-cart" className="w-5 h-5" /></button>
        <div className="mt-8 flex-1 flex flex-col items-center gap-3">
          <button onClick={() => setView("kitchen")} title="Bếp"
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${view === "kitchen" ? "bg-orange-600 text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}><Icon name="chef-hat" className="w-5 h-5" /></button>
          <button onClick={() => setView("counter")} title="Pha chế"
            className={`w-12 h-12 rounded-xl flex items-center justify-center transition ${view === "counter" ? "bg-blue-600 text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}><Icon name="cup-soda" className="w-5 h-5" /></button>
        </div>
        <button onClick={() => setView("attendance")} title="Chấm công"
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition mb-3 ${view === "attendance" ? "bg-emerald-600 text-white shadow-md" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}><Icon name="clock" className="w-5 h-5" /></button>
        <button
          onClick={() => {
            if (user?.role !== "admin") { showToast("Chỉ admin mới vào được Cài đặt"); return; }
            setSelectedTable(null); setCart([]);  setView("admin");
          }}
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition ${view === "admin" ? "bg-primary-600 text-white shadow-md" : user?.role === "admin" ? "bg-gray-100 text-gray-500 hover:bg-gray-200" : "bg-gray-100 text-gray-300 cursor-not-allowed"}`}
          title={user?.role === "admin" ? "Cài đặt" : "Chỉ admin"}
        ><Icon name="settings" className="w-5 h-5" /></button>
      </aside>
      {/* Mobile bottom navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 w-full bg-white border-t shadow-lg z-50 flex items-center justify-between py-2 px-4 safe-area-bottom">
        <button onClick={() => setView("tables")}
          className={`flex flex-col items-center gap-0.5 flex-1 py-2 rounded-xl transition ${view === "tables" || view === "menu" ? "bg-primary-100 text-primary-700" : "text-gray-400"}`}>
          <Icon name="shopping-cart" className="w-5 h-5" /><span className="text-[10px] font-semibold">POS</span>
        </button>
        <button onClick={() => setView("kitchen")}
          className={`flex flex-col items-center gap-0.5 flex-1 py-2 rounded-xl transition ${view === "kitchen" ? "bg-orange-100 text-orange-700" : "text-gray-400"}`}>
          <Icon name="chef-hat" className="w-5 h-5" /><span className="text-[10px] font-semibold">Bếp</span>
        </button>
        <button onClick={() => setView("counter")}
          className={`flex flex-col items-center gap-0.5 flex-1 py-2 rounded-xl transition ${view === "counter" ? "bg-blue-100 text-blue-700" : "text-gray-400"}`}>
          <Icon name="cup-soda" className="w-5 h-5" /><span className="text-[10px] font-semibold">Pha chế</span>
        </button>
        <button onClick={() => setView("attendance")}
          className={`flex flex-col items-center gap-0.5 flex-1 py-2 rounded-xl transition ${view === "attendance" ? "bg-emerald-100 text-emerald-700" : "text-gray-400"}`}>
          <Icon name="clock" className="w-5 h-5" /><span className="text-[10px] font-semibold">Công</span>
        </button>
        <button onClick={() => {
          if (user?.role !== "admin") { showToast("Chỉ admin mới vào được Cài đặt"); return; }
          setSelectedTable(null); setCart([]); setView("admin");
        }}
          className={`flex flex-col items-center gap-0.5 flex-1 py-2 rounded-xl transition ${view === "admin" ? "bg-primary-100 text-primary-700" : user?.role === "admin" ? "text-gray-400" : "text-gray-300"}`}>
          <Icon name="settings" className="w-5 h-5" /><span className="text-[10px] font-semibold">Cài đặt</span>
        </button>
      </nav>
      <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        {(view === "kitchen" || view === "counter") && (
          <KitchenView unit={view} fill="fill" onLogout={onLogout} />
        )}
        {view === "attendance" && (
          <div className="flex-1 overflow-y-auto"><AttendanceView /></div>
        )}
        {view !== "kitchen" && view !== "counter" && view !== "attendance" && (
        <div className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {view === "tables" && (
            <>
              <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
                <button onClick={() => setTableFilterTab("tables")}
                  className={`px-5 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${tableFilterTab === "tables" ? "bg-red-600 text-white shadow-sm" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
                  <Icon name="layout-grid" className="w-4 h-4" /> Sơ đồ bàn
                </button>
                <button onClick={() => setTableFilterTab("takeaway")}
                  className={`px-5 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${tableFilterTab === "takeaway" ? "bg-orange-500 text-white shadow-sm" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
                  <Icon name="shopping-bag" className="w-4 h-4" /> Mang về
                </button>
                <button onClick={() => setTableFilterTab("ship")}
                  className={`px-5 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 ${tableFilterTab === "ship" ? "bg-blue-500 text-white shadow-sm" : "bg-white text-gray-700 hover:bg-gray-50"}`}>
                  <Icon name="truck" className="w-4 h-4" /> Ship
                </button>
                {staffCalls.length > 0 && (
                  <button onClick={() => { const c = staffCalls[0]; resolveStaffCall(c.id); }}
                    className="ml-auto px-5 py-2 rounded-full bg-amber-500 text-white font-bold text-sm shadow-sm animate-pulse flex items-center gap-2">
                    <Icon name="bell" className="w-4 h-4" /> {staffCalls.length} bàn gọi nv
                  </button>
                )}
              </div>
              {tableFilterTab === "tables" && (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-4">
                <button onClick={() => {
                    if (cart.length > 0) {
                      setShowTablePicker(true);
                    } else {
                      setSelectedTable(null);
                      setCart([]);
                      setInitialCart([]);
                      setCurrentOrderId(null);
                      setView("menu");
                    }
                  }}
                  className="relative p-3 md:p-6 rounded-2xl md:rounded-[2rem] border-2 transition-all duration-300 group bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:border-orange-400 hover:shadow-md text-center">
                  <div className="absolute top-4 right-4 w-3 h-3 rounded-full bg-orange-400"></div>
                  <div className="text-sm md:text-xl font-black mb-2 md:mb-4 text-orange-700">ORDER NHANH</div>
                  <div className="flex flex-col items-center space-y-1 md:space-y-2">
                    <div className="bg-orange-100 p-2 md:p-4 rounded-xl md:rounded-2xl">
                      <Icon name="shopping-cart" className="w-5 h-5 md:w-6 md:h-6 text-orange-600" />
                    </div>
                    <div className="text-[8px] md:text-[10px] font-bold text-orange-500 uppercase tracking-widest">Mang về / Tại quầy</div>
                  </div>
                </button>
                {tables.map((t) => {
                  const occupied = t.status === "occupied";
                  const isSelected = selectedTable?.id === t.id;
                  // Batch 2 Fix 8: real timer from occupied_at + server clock offset
                  const occupiedAt = t.positions?.reduce((earliest, p) => {
                    if (p.occupied_at && (!earliest || p.occupied_at < earliest)) return p.occupied_at;
                    return earliest;
                  }, null) || t.pending_order?.created_at || null;
                  const timerStr = occupied ? (getTimeDiffStr(occupiedAt, serverOffsetMs) || "0ph") : null;
                  return (
                    <button key={t.id}
                      onClick={() => handleTableClick(t)}
                      className={`relative p-3 md:p-6 rounded-2xl md:rounded-[2rem] border-2 transition-all duration-300 group text-center ${
                        occupied
                          ? "bg-white border-red-400 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.15)] -translate-y-1 scale-[1.02] ring-4 ring-red-50"
                          : "bg-white border-gray-100 hover:border-gray-200 hover:shadow-md"
                      } ${isSelected ? "!border-red-600" : ""}`}>
                      <div className={`absolute top-3 right-3 md:top-4 md:right-4 w-3 h-3 rounded-full ${occupied ? "bg-red-500 animate-pulse" : "bg-gray-200"}`}></div>
                      {/* Nút lịch sử đơn */}
                      <div onClick={(e) => openTableHistory(e, t)}
                        className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-gray-100 hover:bg-blue-100 flex items-center justify-center transition cursor-pointer"
                        title="Lịch sử đơn hàng">
                        <Icon name="clock" className="w-3.5 h-3.5 text-gray-400" />
                      </div>
                      <div className={`text-sm md:text-xl font-black mb-2 md:mb-4 ${occupied ? "text-red-600" : "text-blue-900"}`}>{t.name}</div>
                      {occupied && t.pending_order ? (
                        <div className="flex flex-col items-center space-y-1 md:space-y-2">
                          <div className="bg-red-50 px-2 md:px-4 py-1 md:py-2 rounded-xl md:rounded-2xl">
                            <span className="text-red-700 font-black text-[10px] md:text-base whitespace-nowrap">{formatVND(t.pending_order.total)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400 font-bold text-[8px] md:text-[10px] uppercase tracking-widest">
                            <Icon name="clock" className="w-2.5 h-2.5" />
                            <span className="whitespace-nowrap">Dùng {timerStr}</span>
                          </div>
                          {/* Chấm vị trí A/B/C/D */}
                          <div className="flex space-x-1 mt-1">
                            {["A", "B", "C", "D"].map((p) => (
                              <div key={p}
                                className={`w-1.5 h-1.5 rounded-full ${t.positions?.some((x) => x.position === p && x.status === "occupied") ? "bg-red-500" : "bg-gray-100"}`}
                                title={`Vị trí ${p}`}></div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="h-8 md:h-14 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-gray-100 group-hover:bg-red-200 transition-colors"></div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
              )}

              {tableFilterTab === "takeaway" && (
                <div>
                  {(() => {
                    const takeawayOrders = orders.filter(o => o._kind === "takeaway");
                    return takeawayOrders.length === 0 ? (
                      <div className="text-center py-16 text-gray-400">Chưa có đơn mang về nào</div>
                    ) : (
                      <div className="space-y-2">
                        {takeawayOrders.map((o) => {
                          const displayName = `${o.display_code || ("mv" + o.id)} - ${o.customer_name || "Khách"}`;
                          const statusColor = o.status === "completed" || o.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-orange-100 text-orange-700";
                          const statusLabel = o.status === "completed" || o.status === "paid" ? "Hoàn tất" : "Chờ";
                          return (
                            <div key={`takeaway-${o.id}`} className="bg-white p-3 rounded-lg border border-orange-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-orange-100 text-orange-700">MV</span>
                                  <div>
                                    <div className="font-semibold">{displayName}</div>
                                    <div className="text-xs text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleTimeString("vi-VN") : ""}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-orange-600">{formatVND(o.total_amount ?? o.total)}</span>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
                                </div>
                              </div>
                              {/* Danh sách món */}
                              {o.items && o.items.length > 0 && (
                                <div className="border-t border-gray-100 pt-1.5 space-y-0.5">
                                  {o.items.map((it, idx) => (
                                    <div key={idx} className="flex items-baseline gap-2 text-xs">
                                      <span className="text-gray-400 w-6 shrink-0">×{it.quantity}</span>
                                      <span className="flex-1 text-gray-800">{it.name}{it.size_name && <span className="text-gray-400"> ({it.size_name})</span>}{it.toppings?.length > 0 && <span className="text-gray-400"> + {it.toppings.join(", ")}</span>}</span>
                                      <span className="text-gray-600 tabular-nums">{(it.price * it.quantity).toLocaleString()}đ</span>
                                    </div>
                                  ))}
                                  {o.items.some(it => it.note) && (
                                    <div className="pt-1 space-y-0.5">
                                      {o.items.filter(it => it.note).map((it, idx) => (
                                        <div key={`note-${idx}`} className="text-xs text-orange-600 italic">💬 {it.name}: {it.note}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              {o.status !== "completed" && (
                                <div className="flex justify-end pt-1">
                                  <button onClick={() => setTakeawayPaymentModal({ orderId: o.id, paymentMethod: "cash" })}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700">
                                    Hoàn tất
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}

              {tableFilterTab === "ship" && (
                <div>
                  {/* Toggle nhận đơn ship — tắt phải chọn lý do (hiện cho khách) */}
                  <div className={`mb-3 flex items-center justify-between rounded-xl border p-3 ${shipMode.enabled ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200"}`}>
                    <div className="min-w-0">
                      <div className="text-sm font-black text-gray-800 flex items-center gap-1.5">
                        <Icon name="truck" className="w-4 h-4" /> Nhận đơn ship online
                      </div>
                      <div className={`text-xs mt-0.5 ${shipMode.enabled ? "text-blue-700" : "text-red-600"}`}>
                        {shipMode.enabled ? "Đang bật — khách đặt được đơn ship" : `Đang tắt — ${shipMode.reason || "không nhận đơn ship"}`}
                      </div>
                    </div>
                    <button
                      onClick={() => shipMode.enabled ? setShowShipOffModal(true) : saveShipMode(true)}
                      disabled={shipModeBusy}
                      className={`relative w-14 h-8 rounded-full transition-colors shrink-0 disabled:opacity-50 ${shipMode.enabled ? "bg-blue-600" : "bg-gray-300"}`}
                    >
                      <span className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow transition-all ${shipMode.enabled ? "left-7" : "left-1"}`} />
                    </button>
                  </div>
                  {(() => {
                    const shipOrders = orders.filter(o => o._kind === "ship");
                    return shipOrders.length === 0 ? (
                      <div className="text-center py-16 text-gray-400">Chưa có đơn ship nào</div>
                    ) : (
                      <div className="space-y-2">
                        {shipOrders.map((o) => {
                          const displayName = `${o.display_code || ("ship" + o.id)} - ${o.customer_name || "Khách"}`;
                          const statusColor = o.status === "completed" || o.status === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700";
                          const statusLabel = o.status === "completed" || o.status === "paid" ? "Hoàn tất" : "Chờ";
                          return (
                            <div key={`ship-${o.id}`} className="bg-white p-3 rounded-lg border border-blue-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-100 text-blue-700">SHIP</span>
                                  <span className="font-semibold text-sm">{displayName}</span>
                                  <span className="text-xs text-gray-400">{o.created_at ? new Date(o.created_at).toLocaleTimeString("vi-VN") : ""}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-blue-600">{formatVND(o.total_amount ?? o.total)}</span>
                                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
                                </div>
                              </div>
                              {/* Ship info */}
                              <div className="text-xs text-gray-600 space-y-0.5 pl-1">
                                {o.customer_phone && <div>📱 <a href={`tel:${o.customer_phone}`} className="text-blue-600 underline">{o.customer_phone}</a></div>}
                                {o.ship_address && <div>📍 {o.ship_address}{o.latitude && o.longitude && <a href={`https://www.google.com/maps?q=${o.latitude},${o.longitude}`} target="_blank" rel="noopener noreferrer" className="ml-1 text-blue-600 underline">[Bản đồ]</a>}</div>}
                                {o.ship_notes && <div>📝 <span className="italic">{o.ship_notes}</span></div>}
                              </div>
                              {/* Items */}
                              {o.items && o.items.length > 0 && (
                                <div className="border-t border-gray-100 pt-1.5 space-y-0.5">
                                  {o.items.map((it, idx) => (
                                    <div key={idx} className="flex items-baseline gap-2 text-xs">
                                      <span className="text-gray-400 w-6 shrink-0">×{it.quantity}</span>
                                      <span className="flex-1 text-gray-800">{it.name}{it.size_name && <span className="text-gray-400"> ({it.size_name})</span>}{it.toppings?.length > 0 && <span className="text-gray-400"> + {it.toppings.join(", ")}</span>}</span>
                                      <span className="text-gray-600 tabular-nums">{(it.price * it.quantity).toLocaleString()}đ</span>
                                    </div>
                                  ))}
                                  {o.items.some(it => it.note) && (
                                    <div className="pt-1 space-y-0.5">
                                      {o.items.filter(it => it.note).map((it, idx) => (
                                        <div key={`note-${idx}`} className="text-xs text-orange-600 italic">💬 {it.name}: {it.note}</div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                              {o.status !== "completed" && (
                                <div className="flex justify-end pt-1">
                                  <button onClick={() => setTakeawayPaymentModal({ orderId: o.id, paymentMethod: "cash" })}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700">
                                    Hoàn tất
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              )}
            </>
          )}

          {view === "menu" && (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <button onClick={() => setView("tables")}
                      className="text-sm text-gray-500 hover:text-gray-900 mb-1 flex items-center gap-1"><Icon name="arrow-left" className="w-4 h-4" /> Quay lại</button>
                    <h2 className="text-xl font-bold">{selectedTable ? `Bàn: ${selectedTable.name}` : "Order nhanh"}</h2>
                  </div>
                </div>
                <input type="search" placeholder="🔍 Tìm món..." value={search} data-focus-key="menu-search"
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                />
              </div>
              {/* Categories: counter row + kitchen row with dashed separator */}
              {(() => {
                const counterCats = categories.filter((c) => c.production_unit === "counter");
                const kitchenCats = categories.filter((c) => c.production_unit !== "counter");
                return (
                  <div className="hidden md:block px-1 py-2 mb-3 bg-white rounded-xl border border-gray-100">
                    <div className="flex flex-wrap gap-2.5 no-scrollbar">
                      <button onClick={() => setSelectedCategory(null)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap min-h-[44px] ${selectedCategory === null ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>TẤT CẢ</button>
                      {counterCats.map((cat) => (
                        <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap min-h-[44px] ${selectedCategory === cat.id ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{cat.name.toUpperCase()}</button>
                      ))}
                    </div>
                    {kitchenCats.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-dashed border-gray-200">
                        <p className="mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Bếp</p>
                        <div className="flex flex-wrap gap-2.5 no-scrollbar">
                          {kitchenCats.map((cat) => (
                            <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                              className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap min-h-[44px] ${selectedCategory === cat.id ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>{cat.name.toUpperCase()}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* Mobile categories fallback */}
              <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-2">
                <button onClick={() => setSelectedCategory(null)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === null ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"}`}>Tất cả</button>
                {categories.map((c) => (
                  <button key={c.id} onClick={() => setSelectedCategory(c.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${selectedCategory === c.id ? "bg-gray-900 text-white" : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-100"}`}>{c.name}</button>
                ))}
              </div>
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-400">Không có sản phẩm</div>
              ) : (
                <>
                  {/* Desktop square grid (aspect-square image, price badge overlay, name uppercase centered) */}
                  <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 px-0">
                    {filtered.map((p) => {
                      const hasSizes = p.sizes && p.sizes.length > 0;
                      const displayPrice = hasSizes ? Math.min(...p.sizes.map(s => s.price)) : p.price;
                      return (
                        <div key={p.id} onClick={() => addToCart(p)}
                          className="bg-white p-3 rounded-xl shadow-[0_3px_10px_rgba(15,23,42,0.07)] border border-transparent hover:border-primary-500 hover:shadow-[0_8px_20px_rgba(15,23,42,0.12)] transition-all cursor-pointer group flex flex-col items-center text-center h-full min-h-[182px]">
                          <div className="relative h-24 w-24 bg-white rounded-lg mb-3 overflow-hidden shadow-inner flex-shrink-0 border border-gray-100 flex items-center justify-center">
                            {p.image_url
                              ? <OptimizedImg src={p.image_url} width="96" height="96" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                              : <div className="w-full h-full bg-gray-50" />}
                            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-white/85 backdrop-blur-sm border border-white/80 shadow-sm">
                              <p className="text-primary-600 font-bold text-[11px] leading-none">{displayPrice.toLocaleString()}đ</p>
                            </div>
                          </div>
                          <div className="flex flex-col flex-1 w-full min-w-0">
                            <h3 className="font-semibold text-gray-800 text-[14px] leading-tight px-1 uppercase tracking-tight flex-1 flex items-center justify-center min-h-[40px]">{p.name}</h3>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Mobile list */}
                  <div className="flex flex-col space-y-3 md:hidden">
                    {filtered.map((p) => {
                      const hasSizes = p.sizes && p.sizes.length > 0;
                      const displayPrice = hasSizes ? Math.min(...p.sizes.map(s => s.price)) : p.price;
                      return (
                        <div key={p.id} onClick={() => addToCart(p)}
                          className="bg-white p-3 rounded-2xl flex items-center space-x-4 shadow-[0_3px_10px_rgba(15,23,42,0.06)] border border-gray-100 transition-all active:scale-95">
                          <div className="w-16 h-16 rounded-xl overflow-hidden bg-white flex-shrink-0 border border-gray-100 flex items-center justify-center">
                            {p.image_url
                              ? <OptimizedImg src={p.image_url} width="64" height="64" className="w-full h-full object-cover" />
                              : <div className="w-full h-full bg-white" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-800 text-sm">{p.name}</h4>
                            <p className="text-primary-600 font-extrabold text-xs">{displayPrice.toLocaleString()}đ</p>
                          </div>
                          <span className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-lg">+</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}

          {view === "admin" && user?.role === "admin" && (
            <div className="flex-1 animate-in fade-in zoom-in-95 duration-500 overflow-hidden h-full">
              <AdminPanel embedded onExit={() => setView("tables")} />
            </div>
          )}
        </div>
        )}

        {/* Mobile cart floating button */}
        {view === "menu" && cart.length > 0 && !showMobileCart && (
          <button onClick={() => setShowMobileCart(true)}
            className="md:hidden fixed bottom-20 right-4 bg-primary-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 font-black z-20"
            style={{boxShadow: "0 0 20px rgba(99,102,241,0.4)", animation: "bounce 2s infinite, pulse-ring 1.5s ease-out infinite"}}>
            <span className="text-2xl" style={{animation: "wiggle 0.5s ease-in-out"}}><Icon name="shopping-cart" className="w-6 h-6" /></span>
            <div className="flex flex-col items-start">
              <span className="text-xs text-primary-200">{cart.reduce((s, it) => s + it.qty, 0)} món</span>
              <span className="text-sm">{cartTotal.toLocaleString()}đ</span>
            </div>
          </button>
        )}

        {/* Mobile cart bottom sheet overlay */}
        {view === "menu" && showMobileCart && (
          <div className="md:hidden fixed inset-0 z-[80] flex items-end" onClick={() => setShowMobileCart(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative bg-white w-full max-h-[85vh] rounded-t-3xl overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
              {/* Mobile cart header */}
              <div className="p-3 border-b flex items-center justify-between bg-gray-50">
                <div className="flex items-center space-x-2">
                  <div className="bg-primary-50 p-1.5 rounded-xl text-primary-600"><Icon name="shopping-cart" className="w-4 h-4" /></div>
                  <h3 className="font-bold text-sm text-gray-800">Đơn hàng</h3>
                  <span className="text-[10px] px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-bold">{cart.reduce((s, it) => s + it.qty, 0)} món</span>
                </div>
                <button onClick={() => setShowMobileCart(false)} className="p-2 hover:bg-gray-200 rounded-full text-xl"><Icon name="x" className="w-5 h-5" /></button>
              </div>
              {/* Mobile cart table/position info */}
              <div className="px-3 pt-2 pb-1">
                <div className="flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-2.5 py-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{selectedTable ? "Bàn phục vụ" : "Đơn hàng"}</p>
                    <p className="text-xs font-black text-gray-800 truncate">
                      {selectedTable ? `${selectedTable.name} — Vị trí ${selectedPosition}` : "Tại quầy"}
                    </p>
                  </div>
                  {selectedTable && selectedTable.status !== "takeaway" && (
                    <div className="flex items-center gap-1">
                      {["A", "B", "C", "D"].map((pos) => {
                        const posData = (selectedTable.positions || []).find((p) => p.position === pos);
                        const isCurrent = pos === selectedPosition;
                        const isOccupied = posData?.status === "occupied";
                        return (
                          <button key={pos} onClick={() => openPosition(pos)}
                            className={`w-7 h-7 rounded-lg text-[11px] font-black transition-all border ${
                              isCurrent ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                                : isOccupied ? "bg-red-50 text-red-600 border-red-300" : "bg-white text-gray-500 border-gray-200"
                            }`}>{pos}</button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
              {/* Mobile cart items */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar min-h-0">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 text-sm">Chưa có món nào</div>
                ) : cart.map((it, idx) => (
                  <div key={cartKey(it)} className="flex space-x-2 group relative">
                    <div className="w-12 h-12 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 border border-gray-100">
                      {it.image_url ? <img src={it.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><Icon name="utensils" className="w-6 h-6" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-1">
                        <h4 className="font-bold text-[11px] text-gray-800 leading-tight truncate flex-1">
                          {it.name} {it.size && <span className="text-primary-600">({it.size.name})</span>}
                        </h4>
                        <button onClick={(e) => { e.stopPropagation(); requestRemoveItem(idx); setShowMobileCart(false); }}
                          className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"><Icon name="x" className="w-3 h-3" /></button>
                      </div>
                      {(it.toppings && it.toppings.length > 0) && (
                        <p className="text-[9px] text-primary-500 font-medium italic truncate">+{it.toppings.map(t => t.name).join(", ")}</p>
                      )}
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <div className="flex items-center bg-gray-100 rounded-md px-0.5">
                          <button onClick={(e) => { e.stopPropagation(); requestReduceQty(idx); }} className="w-7 h-7 flex items-center justify-center text-gray-500 font-bold text-sm">-</button>
                          <span className="w-6 text-center text-[11px] font-bold text-gray-800">{it.qty}</span>
                          <button onClick={(e) => { e.stopPropagation(); updateQty(idx, +1); }} className="w-7 h-7 flex items-center justify-center text-primary-600 font-bold text-sm">+</button>
                        </div>
                        <span className="font-bold text-[11px] text-gray-800">{calcLineTotal(it).toLocaleString()}đ</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {/* Mobile cart footer */}
              <div className="p-3 bg-gray-50 border-t space-y-2 sticky bottom-0 z-20">
                <div className="flex justify-between items-center px-1">
                  <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Tổng cộng</span>
                  <span className="text-xl font-black text-primary-600 tracking-tighter">{cartTotal.toLocaleString()}đ</span>
                </div>
                {selectedTable ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={() => { handlePayment(); setShowMobileCart(false); }}
                      disabled={(cart.length === 0 && selectedTable.status !== "occupied") || submitting}
                      className={`py-4 rounded-xl font-bold text-sm uppercase shadow-md active:scale-95 transition-all disabled:opacity-50 ${cart.length === 0 && selectedTable.status === "occupied" ? "bg-gray-500 text-white" : "bg-emerald-600 text-white"}`}>
                      {submitting ? "Đang xử lý..." : (cart.length === 0 && selectedTable.status === "occupied" ? "Đóng bàn" : "Thanh toán")}
                    </button>
                    <button onClick={() => { setTransferTargetId(null); setShowTransferModal(true); setShowMobileCart(false); }}
                      disabled={submitting}
                      className="py-4 bg-orange-500 text-white rounded-xl font-bold text-sm uppercase shadow-md active:scale-95 transition-all disabled:opacity-50">
                      Chuyển bàn
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => { openTakeawayModal("takeaway"); setShowMobileCart(false); }}
                      disabled={cart.length === 0 || submitting}
                      className="py-4 bg-orange-500 text-white rounded-xl font-bold text-xs uppercase active:scale-95 disabled:opacity-50">Mang về</button>
                    <button onClick={() => { openTakeawayModal("ship"); setShowMobileCart(false); }}
                      disabled={cart.length === 0 || submitting}
                      className="py-4 bg-blue-500 text-white rounded-xl font-bold text-xs uppercase active:scale-95 disabled:opacity-50">Ship</button>
                    <button onClick={() => { setShowTablePicker(true); setShowMobileCart(false); }}
                      className="py-4 bg-white border-2 border-gray-200 text-gray-800 rounded-xl font-bold text-xs uppercase active:scale-95">Chọn bàn</button>
                  </div>
                )}
                {hasNewItems && selectedTable && (
                  <button onClick={() => { submitOrder(selectedTable.id); setShowMobileCart(false); }}
                    disabled={submitting}
                    className="w-full py-4 rounded-xl font-bold text-sm uppercase shadow-md active:scale-95 transition-all bg-gradient-to-r from-orange-500 to-orange-600 text-white disabled:opacity-50 flex items-center justify-center space-x-2">
                    <span>{submitting ? "Đang gửi..." : "Báo chế biến"}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {view === "menu" && (
          <aside className="hidden md:flex w-80 bg-white border-l flex-col shadow-2xl z-10 h-full min-h-0">
            {/* Header */}
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="bg-primary-50 p-1.5 rounded-xl text-primary-600"><Icon name="shopping-cart" className="w-4 h-4" /></div>
                  <h3 className="font-bold text-sm text-gray-800">Đơn hàng</h3>
                </div>
                <button onClick={clearCart} className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline">Xóa hết</button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-2.5 py-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{selectedTable ? "Bàn phục vụ" : "Đơn hàng"}</p>
                  <p className="text-xs font-black text-gray-800 truncate">
                    {selectedTable ? `${selectedTable.name} — Vị trí ${selectedPosition}` : "Tại quầy"}
                  </p>
                </div>
                {selectedTable && selectedTable.status !== "takeaway" && (
                  <div className="flex items-center gap-1">
                    {["A", "B", "C", "D"].map((pos) => {
                      const posData = (selectedTable.positions || []).find((p) => p.position === pos);
                      const isCurrent = pos === selectedPosition;
                      const isOccupied = posData?.status === "occupied";
                      return (
                        <button key={pos} onClick={() => openPosition(pos)}
                          title={`Vị trí ${pos}${isOccupied ? " — có khách" : " — trống"}`}
                          className={`w-7 h-7 rounded-lg text-[11px] font-black transition-all border ${
                            isCurrent
                              ? "bg-primary-600 text-white border-primary-600 shadow-sm"
                              : isOccupied
                                ? "bg-red-50 text-red-600 border-red-300 hover:border-red-500"
                                : "bg-white text-gray-500 border-gray-200 hover:border-primary-400"
                          }`}>
                          {pos}
                        </button>
                      );
                    })}
                  </div>
                )}
                {!selectedTable && (
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter whitespace-nowrap bg-white text-gray-400 border border-gray-200">
                    Tại quầy
                  </span>
                )}
              </div>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 no-scrollbar min-h-0 pb-4">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-gray-400 text-sm">Chưa có món nào</div>
              ) : cart.map((it, idx) => (
                <div key={cartKey(it)} className="flex space-x-2 group relative">
                  {/* Image - clickable to edit toppings */}
                  <div onClick={() => openToppingModal(idx)}
                    className="w-12 h-12 rounded-lg bg-gray-50 overflow-hidden flex-shrink-0 shadow-sm border border-gray-100 md:cursor-pointer hover:ring-2 hover:ring-primary-300 transition-all">
                    {it.image_url
                      ? <OptimizedImg src={it.image_url} width="48" height="48" className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-gray-300"><Icon name="utensils" className="w-8 h-8" /></div>}
                  </div>
                  <div className="flex-1 py-0 min-w-0">
                    <div className="flex justify-between items-start gap-1">
                      <h4 className="font-bold text-[11px] text-gray-800 leading-tight uppercase truncate flex-1">
                        {it.name} {it.size && <span className="text-primary-600">({it.size.name})</span>}
                      </h4>
                      <button onClick={(e) => { e.stopPropagation(); requestRemoveItem(idx); }}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Xóa món"><Icon name="x" className="w-3 h-3" /></button>
                    </div>
                    {(it.toppings && it.toppings.length > 0) && (
                      <p className="text-[9px] text-primary-500 font-medium italic truncate">+{it.toppings.map(t => t.name).join(", ")}</p>
                    )}
                    {/* Notes inline editable */}
                    {editingNotesIndex === idx ? (
                      <div className="mt-1">
                        <input autoFocus type="text" placeholder="Nhập ghi chú..." defaultValue={it.notes || ""}
                          onBlur={(e) => { updateNotes(idx, e.target.value); setEditingNotesIndex(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { updateNotes(idx, e.target.value); setEditingNotesIndex(null); } if (e.key === "Escape") setEditingNotesIndex(null); }}
                          className="w-full px-2 py-1 bg-yellow-50 border border-yellow-300 rounded-lg text-[10px] font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-yellow-400" />
                      </div>
                    ) : it.notes ? (
                      <div onClick={() => setEditingNotesIndex(idx)}
                        className="mt-1 px-1.5 py-0.5 bg-yellow-50 border border-yellow-100 rounded-lg md:cursor-pointer hover:bg-yellow-100 transition-colors">
                        <p className="text-[9px] text-yellow-700 font-medium flex items-start"><Icon name="message-square" className="w-3 h-3 flex-shrink-0 mt-0.5" /> <span className="flex-1 truncate ml-1">{it.notes}</span></p>
                      </div>
                    ) : null}
                    {/* Quantity + Price row */}
                    <div className="mt-1 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center bg-gray-100 rounded-md px-0.5">
                        <button onClick={(e) => { e.stopPropagation(); requestReduceQty(idx); }} className="w-5 h-5 flex items-center justify-center text-gray-500 font-bold text-xs">-</button>
                        <span className="w-6 text-center text-[11px] font-bold text-gray-800">{it.qty}</span>
                        <button onClick={(e) => { e.stopPropagation(); updateQty(idx, +1); }} className="w-5 h-5 flex items-center justify-center text-primary-600 font-bold text-xs">+</button>
                      </div>
                      {/* Direct price edit */}
                      {editingPriceIndex === idx ? (
                        <input autoFocus type="number" defaultValue={it.price}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={(e) => { updatePrice(idx, e.target.value); setEditingPriceIndex(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { updatePrice(idx, e.target.value); setEditingPriceIndex(null); } if (e.key === "Escape") setEditingPriceIndex(null); }}
                          className="w-20 px-1.5 py-0.5 bg-white border-2 border-primary-500 rounded-lg text-right font-bold text-[11px] focus:outline-none shadow-inner" />
                      ) : (
                        <div onClick={(e) => { e.stopPropagation(); setEditingPriceIndex(idx); }}
                          className="font-bold text-[11px] text-gray-800 md:cursor-pointer hover:bg-gray-100 px-1.5 py-0.5 rounded-md transition-colors" title="Click để sửa giá">
                          {calcLineTotal(it).toLocaleString()}đ
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer actions */}
            <div className="p-3 bg-gray-50 border-t space-y-2 sticky bottom-0 z-20">
              <div className="flex justify-between items-center px-1">
                <span className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Tổng cộng</span>
                <span className="text-xl font-black text-primary-600 tracking-tighter">{cartTotal.toLocaleString()}đ</span>
              </div>
              <div className="space-y-1.5">
                {selectedTable ? (
                  <div className="grid grid-cols-2 gap-1.5">
                    <button onClick={handlePayment}
                      disabled={(cart.length === 0 && selectedTable.status !== "occupied") || submitting}
                      className={`py-4 px-3 rounded-xl font-bold text-sm uppercase shadow-md active:scale-95 transition-all text-center disabled:opacity-50 ${cart.length === 0 && selectedTable.status === "occupied"
                        ? "bg-gray-500 text-white shadow-gray-200 hover:bg-gray-600"
                        : "bg-emerald-600 text-white shadow-emerald-100 hover:bg-emerald-700"}`}>
                      {submitting ? "Đang xử lý..." : (cart.length === 0 && selectedTable.status === "occupied" ? "Đóng bàn" : "Thanh toán/Đóng bàn")}
                    </button>
                    <button onClick={() => { setTransferTargetId(null); setShowTransferModal(true); }}
                      disabled={(cart.length === 0 && selectedTable.status !== "occupied") || submitting}
                      className="py-4 px-3 bg-orange-500 text-white rounded-xl font-bold text-sm uppercase shadow-md shadow-orange-100 hover:bg-orange-600 active:scale-95 transition-all text-center disabled:opacity-50">
                      Chuyển bàn
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-1.5">
                    <button onClick={() => openTakeawayModal("takeaway")}
                      disabled={cart.length === 0 || submitting}
                      className="py-4 bg-orange-500 text-white rounded-xl font-bold text-sm uppercase shadow-md shadow-orange-100 hover:bg-orange-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center">
                      <Icon name="shopping-bag" className="w-4 h-4" /> Mang về
                    </button>
                    <button onClick={() => openTakeawayModal("ship")}
                      disabled={cart.length === 0 || submitting}
                      className="py-4 bg-blue-500 text-white rounded-xl font-bold text-sm uppercase shadow-md shadow-blue-100 hover:bg-blue-600 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center">
                      <Icon name="truck" className="w-4 h-4" /> Ship
                    </button>
                    <button onClick={() => setShowTablePicker(true)}
                      className="py-4 bg-white border-2 border-gray-200 text-gray-800 rounded-xl font-bold text-sm uppercase shadow-sm hover:bg-gray-100 transition-all active:scale-95">
                      Chọn bàn
                    </button>
                  </div>
                )}

                {/* Nút Báo chế biến - CHỈ hiện khi có món mới chưa gửi */}
                {hasNewItems && selectedTable && (
                  <button onClick={() => submitOrder(selectedTable.id)}
                    disabled={submitting}
                    className={`w-full py-4 rounded-xl font-bold text-sm uppercase shadow-md active:scale-95 transition-all flex items-center justify-center space-x-2 ${"bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-200 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50"}`}
                    style={{ zIndex: 50 }}>
                    <span>{submitting ? "Đang gửi..." : "Báo chế biến"}</span>
                  </button>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>

      {/* Position picker modal (Fix 5, mirrors source InternalPosModal) */}
      {showPositionPicker && selectedTable && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowPositionPicker(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Chọn vị trí — {selectedTable.name}</h3>
                <p className="text-sm text-gray-500">Vị trí đang có khách được đánh dấu đỏ</p>
              </div>
              <button onClick={() => setShowPositionPicker(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-all text-2xl">×</button>
            </div>
            <div className="p-8 grid grid-cols-4 gap-4">
              {["A", "B", "C", "D"].map((pos) => {
                const posData = (selectedTable.positions || []).find((p) => p.position === pos);
                const isOccupied = posData?.status === "occupied";
                return (
                  <button key={pos} onClick={() => openPosition(pos)}
                    className={`relative p-6 rounded-2xl border-2 flex flex-col items-center justify-center space-y-2 transition-all ${isOccupied
                      ? "border-red-400 bg-red-50 text-red-600"
                      : "border-gray-100 bg-white hover:border-primary-400 hover:shadow-lg"}`}>
                    <span className="text-2xl font-black">{pos}</span>
                    <span className="text-[10px] uppercase tracking-widest font-bold">{isOccupied ? "Có khách" : "Trống"}</span>
                    {isOccupied && posData.revenue > 0 && (
                      <span className="text-[10px] font-bold text-red-500">{formatVND(posData.revenue)}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Table Picker modal - chọn bàn từ ORDER NHANH */}
      {showTablePicker && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTablePicker(false)}>
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b bg-orange-50 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Chọn bàn</h3>
                <p className="text-xs text-gray-500 mt-0.5">Chạm vào bàn để gán vào đơn hàng</p>
              </div>
              <button onClick={() => setShowTablePicker(false)}
                className="p-2 hover:bg-orange-100 rounded-full transition text-2xl text-gray-500">×</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-2 gap-3">
                {tables.map((t) => {
                  const occupied = t.status === "occupied";
                  return (
                    <button key={t.id} onClick={() => {
                      setShowTablePicker(false);
                      setSelectedTable(t);
                      setSelectedCategory(null);
                      // Giữ nguyên giỏ hàng (ORDER NHANH flow)
                      setEditingNotesIndex(null);
                      setEditingPriceIndex(null);
                      const positions = t.positions || [];
                      const occupiedPositions = positions.filter((p) => p.status === "occupied");
                      if (occupiedPositions.length > 1) {
                        setShowPositionPicker(true);
                        return;
                      }
                      if (occupiedPositions.length === 1) {
                        openPosition(occupiedPositions[0].position, t);
                        return;
                      }
                      setSelectedPosition("A");
                      setView("menu");
                    }}
                      className={`p-4 rounded-2xl border-2 text-left transition-all ${occupied
                        ? "border-red-200 bg-red-50 hover:border-red-400"
                        : "border-gray-100 bg-white hover:border-primary-400 hover:shadow-lg"}`}>
                      <div className={`font-black text-base ${occupied ? "text-red-600" : "text-gray-800"}`}>{t.name}</div>
                      <div className="text-xs mt-1 font-medium">{occupied ? "Có khách" : "Trống"}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Table Order History Modal */}
      {tableHistory && (
        <div className="fixed inset-0 z-[115] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setTableHistory(null); setTableHistoryDetail(null); }}>
          <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b bg-gray-50 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-800">Lịch sử — {tableHistory.tableName}</h3>
                <p className="text-xs text-gray-400 mt-0.5">{tableHistory.orders.length} đơn gần nhất</p>
              </div>
              <button onClick={() => { setTableHistory(null); setTableHistoryDetail(null); }}
                className="p-2 hover:bg-gray-200 rounded-full transition text-2xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {tableHistoryLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                </div>
              ) : tableHistory.orders.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Icon name="clock" className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  Chưa có đơn đã thanh toán
                </div>
              ) : tableHistoryDetail ? (
                /* Chi tiết đơn */
                <div className="p-5 space-y-3">
                  <button onClick={() => setTableHistoryDetail(null)}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-semibold mb-2">
                    <Icon name="arrow-left" className="w-4 h-4" /> Quay lại danh sách
                  </button>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-black text-lg">Đơn #{tableHistoryDetail.id}</div>
                      <div className="text-xs text-gray-400">
                        {tableHistoryDetail.table_position && `Vị trí ${tableHistoryDetail.table_position} • `}
                        {tableHistoryDetail.created_at ? new Date(tableHistoryDetail.created_at).toLocaleString("vi-VN") : ""}
                      </div>
                    </div>
                    <span className="text-xl font-black text-primary-600">{Number(tableHistoryDetail.total_amount).toLocaleString()}đ</span>
                  </div>
                  <div className="border-t pt-3 space-y-2">
                    {(tableHistoryDetail.items || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0 gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="w-6 h-6 flex items-center justify-center bg-gray-100 rounded-lg text-[10px] font-black text-gray-500 flex-shrink-0">{item.quantity}x</span>
                            <span className="font-bold text-gray-800 text-sm truncate">{item.name}</span>
                            {item.size_name && <span className="text-xs text-gray-400">({item.size_name})</span>}
                          </div>
                          {item.toppings?.length > 0 && (
                            <p className="text-[10px] text-primary-500 font-bold italic ml-8 mt-0.5 truncate">+{item.toppings.join(", ")}</p>
                          )}
                        </div>
                        <span className="font-bold text-gray-700 text-sm flex-shrink-0">{(item.price * item.quantity).toLocaleString()}đ</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                /* Danh sách đơn */
                <div className="p-3 space-y-2">
                  {tableHistory.orders.map((o) => {
                    const timeStr = o.created_at ? new Date(o.created_at).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) : "";
                    const itemCount = (o.items || []).reduce((s, it) => s + it.quantity, 0);
                    return (
                      <button key={o.id} onClick={() => setTableHistoryDetail(o)}
                        className="w-full bg-white border border-gray-200 hover:border-blue-300 hover:bg-blue-50 rounded-xl p-3 flex items-center justify-between transition text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                            <span className="text-xs font-black text-gray-500">#{o.id}</span>
                          </div>
                          <div>
                            <div className="font-semibold text-sm text-gray-800">
                              {o.table_position ? `Vị trí ${o.table_position}` : o.table_name || "Mang về"}
                            </div>
                            <div className="text-xs text-gray-400">{timeStr} • {itemCount} món</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-700 text-sm">{Number(o.total_amount).toLocaleString()}đ</span>
                          <Icon name="chevron-right" className="w-4 h-4 text-gray-300" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer Table Modal */}
      {showTransferModal && selectedTable && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setShowTransferModal(false); setTransferTargetId(null); }}>
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="text-2xl font-bold text-gray-800">Chuyển từ {selectedTable.name} sang</h3>
                <p className="text-sm text-gray-500">Vui lòng chọn bàn trống để chuyển đơn</p>
              </div>
              <button onClick={() => { setShowTransferModal(false); setTransferTargetId(null); }}
                className="p-2 hover:bg-gray-200 rounded-full transition-all text-2xl">×</button>
            </div>
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {tables.filter((t) => t.id !== selectedTable.id && t.status === "empty").map((t) => (
                  <button key={t.id} onClick={() => setTransferTargetId(t.id)}
                    className={`relative p-6 rounded-2xl border-2 flex flex-col items-center justify-center space-y-2 transition-all group ${transferTargetId === t.id
                      ? "border-primary-600 bg-primary-50 text-primary-600 ring-4 ring-primary-100"
                      : "border-gray-100 bg-white hover:border-primary-400 hover:shadow-lg"}`}>
                    <span className="text-lg font-bold">{t.name}</span>
                    <span className="text-[10px] uppercase tracking-widest font-bold">Trống</span>
                    {transferTargetId === t.id && (
                      <div className="absolute top-2 right-2 bg-primary-600 text-white p-1 rounded-full shadow-md"><Icon name="check" className="w-3 h-3" /></div>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t flex justify-end">
              <button onClick={confirmTransfer} disabled={!transferTargetId}
                className="px-8 py-3 font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-2xl shadow-lg shadow-primary-200 transition-all disabled:opacity-50">
                Xác nhận chuyển bàn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Size Modal */}
      {showSizeModal && selectedProductForSize && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => { setShowSizeModal(false); setSelectedProductForSize(null); }}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b bg-gray-50">
              <h3 className="text-lg font-black text-gray-800 text-center uppercase tracking-tight">Chọn kích cỡ</h3>
              <p className="text-xs text-gray-500 text-center font-bold">{selectedProductForSize.name}</p>
            </div>
            <div className="p-6 space-y-3">
              {selectedProductForSize.sizes.map((s) => (
                <button key={s.id} onClick={() => confirmSize(s)}
                  className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 hover:border-primary-500 hover:bg-primary-50 transition-all group">
                  <span className="font-black text-gray-800 group-hover:text-primary-700">{s.name}</span>
                  <span className="font-black text-primary-600">{s.price.toLocaleString()}đ</span>
                </button>
              ))}
            </div>
            <div className="p-6 bg-gray-50 border-t">
              <button onClick={() => { setShowSizeModal(false); setSelectedProductForSize(null); }} className="w-full py-3 bg-white border text-gray-600 font-bold rounded-xl uppercase hover:bg-gray-100 transition">Đóng</button>
            </div>
          </div>
        </div>
      )}

      {/* Topping Modal */}
      {showToppingModal && selectedCartItemForTopping !== null && (
        <div className="fixed inset-0 z-[60] flex items-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowToppingModal(false); setSelectedCartItemForTopping(null); }}></div>
          <div className="relative bg-white w-full max-h-[75vh] rounded-t-3xl overflow-hidden flex flex-col">
            <div className="p-4 border-b flex items-center justify-between bg-gray-50">
              <div>
                <h3 className="text-lg font-black text-gray-800">Chọn Topping</h3>
                <p className="text-sm font-bold text-gray-500">{cart[selectedCartItemForTopping]?.name}</p>
              </div>
              <button onClick={() => { setShowToppingModal(false); setSelectedCartItemForTopping(null); }} className="p-2 hover:bg-gray-200 rounded-full text-2xl">×</button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              {(() => {
                const currentItem = cart[selectedCartItemForTopping];
                const allowedToppings = currentItem ? getAllowedToppingsForItem(currentItem) : [];
                if (allowedToppings.length === 0) {
                  return <div className="text-center py-8 text-gray-400">Không có topping</div>;
                }
                return (
                  <div className="grid grid-cols-2 gap-2">
                    {allowedToppings.map((t) => {
                      const selected = currentItem?.toppings?.find((x) => x.id === t.id);
                      return (
                        <button key={t.id} onClick={() => toggleTopping(t)}
                          className={`p-3 rounded-xl text-left text-sm font-bold transition border ${selected ? "bg-primary-600 text-white border-primary-600" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"}`}>
                          <div>{t.name}</div>
                          <div className={`text-xs mt-0.5 ${selected ? "text-primary-100" : "text-gray-400"}`}>+{t.price.toLocaleString()}đ</div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button onClick={() => { setShowToppingModal(false); setSelectedCartItemForTopping(null); }}
                className="w-full py-4 bg-primary-600 text-white rounded-xl font-black text-base hover:bg-primary-700 transition">
                Xong
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed top-20 right-4 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm font-medium">{toast}</div>}

      {/* Batch 2 Fix 6: Takeaway name modal */}
      {showTakeawayNameModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowTakeawayNameModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Nhập tên khách hàng</h3>
              <p className="text-xs text-gray-500 mt-1">Tên sẽ hiển thị trên đơn mang về / ship</p>
            </div>
            <div className="p-6 space-y-3">
              <input autoFocus type="text" value={takeawayCustomerName}
                onChange={(e) => setTakeawayCustomerName(e.target.value)}
                placeholder="Tên khách..."
                onKeyDown={(e) => { if (e.key === "Enter") confirmTakeawayName(); }}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none" />
            </div>
            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <button onClick={() => setShowTakeawayNameModal(false)} className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50">Hủy</button>
              <button onClick={confirmTakeawayName} disabled={!takeawayCustomerName.trim()}
                className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 disabled:opacity-50">Gửi đơn</button>
            </div>
          </div>
        </div>
      )}

      {/* Ship mode: modal chọn lý do khi tắt nhận đơn ship */}
      {showShipOffModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowShipOffModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Tắt nhận đơn ship</h3>
              <p className="text-xs text-gray-500 mt-1">Chọn lý do — sẽ hiển thị cho khách trên trang đặt ship</p>
            </div>
            <div className="p-6 space-y-2">
              {SHIP_OFF_REASONS.map((r) => (
                <button key={r} onClick={() => saveShipMode(false, r)} disabled={shipModeBusy}
                  className="w-full text-left p-3 rounded-xl border-2 border-gray-200 hover:border-red-400 hover:bg-red-50 font-semibold text-sm text-gray-700 transition disabled:opacity-50">
                  {r}
                </button>
              ))}
            </div>
            <div className="p-4 border-t bg-gray-50">
              <button onClick={() => setShowShipOffModal(false)} className="w-full py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch 2 Fix 6: Takeaway payment modal (complete order) */}
      {takeawayPaymentModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setTakeawayPaymentModal(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b bg-gray-50">
              <h3 className="text-xl font-bold text-gray-800">Hoàn tất đơn mang về</h3>
            </div>
            <div className="p-6 space-y-3">
              <label className="block text-sm font-medium mb-2">Phương thức thanh toán</label>
              <div className="grid grid-cols-2 gap-2">
                {["cash", "transfer"].map((m) => (
                  <button key={m} onClick={() => setTakeawayPaymentModal({ ...takeawayPaymentModal, paymentMethod: m })}
                    className={`p-3 rounded-lg border-2 font-semibold transition ${
                      takeawayPaymentModal.paymentMethod === m ? "border-orange-500 bg-orange-50 text-orange-700" : "border-gray-200 hover:border-gray-300"
                    }`}>
                    {m === "cash" ? <><Icon name="banknote" className="w-4 h-4 inline mr-1" /> Tiền mặt</> : <><Icon name="smartphone" className="w-4 h-4 inline mr-1" /> Chuyển khoản</>}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <button onClick={() => setTakeawayPaymentModal(null)} className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50">Hủy</button>
              <button onClick={confirmTakeawayComplete}
                className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-bold hover:bg-emerald-700">Xác nhận</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch 2 Fix 10: Delete confirm modal for submitted items */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirmItem(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b bg-red-50">
              <h3 className="text-lg font-bold text-red-700">Xóa món?</h3>
              <p className="text-sm text-gray-600 mt-1">Bạn có chắc muốn xóa <strong>{deleteConfirmItem.name}</strong> khỏi đơn đã gửi?</p>
            </div>
            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <button onClick={() => setDeleteConfirmItem(null)} className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50">Hủy</button>
              <button onClick={confirmDeleteItem} className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* Batch 2 Fix 10: Reduce quantity modal for submitted items */}
      {reduceModalItem && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setReduceModalItem(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b bg-orange-50">
              <h3 className="text-lg font-bold text-orange-700">Giảm số lượng</h3>
              <p className="text-sm text-gray-600 mt-1"><strong>{reduceModalItem.name}</strong> hiện có {reduceModalItem.currentQty} phần.</p>
            </div>
            <div className="p-6 space-y-3">
              <label className="block text-sm font-medium">Số lượng cần giảm</label>
              <input autoFocus type="number" min="1" max={reduceModalItem.currentQty} value={reduceQtyInput}
                onChange={(e) => setReduceQtyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") confirmReduceQty(); }}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-orange-500 outline-none text-center font-bold text-lg" />
            </div>
            <div className="p-4 border-t bg-gray-50 flex gap-2">
              <button onClick={() => setReduceModalItem(null)} className="flex-1 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50">Hủy</button>
              <button onClick={confirmReduceQty} className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700">Xác nhận</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

// ============ Public: WelcomeOverlay ============
function WelcomeOverlay({ onDismiss, storeName, featuredProducts, step, facebookUrl }) {
  const showFeatured = featuredProducts.length > 0 && step >= 2;
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-primary-900 via-primary-800 to-black text-white">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 h-full w-full opacity-10" style={{backgroundImage: "url('https://www.transparenttextures.com/patterns/cubes.png')"}}></div>
        <div className="absolute -top-20 -left-20 h-64 w-64 animate-blob rounded-full bg-primary-500 opacity-20 blur-3xl" />
        <div className="animation-delay-2000 absolute -bottom-20 -right-20 h-64 w-64 animate-blob rounded-full bg-yellow-500 opacity-20 blur-3xl" />
      </div>

      <div className={"relative px-6 text-center transform transition-all duration-700 delay-100 ease-out " + (step >= 2 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0")}>
        {/* Store name với gradient text italic */}
        <h1 className="bg-gradient-to-r from-yellow-200 via-white to-yellow-200 bg-clip-text text-3xl font-black italic text-transparent drop-shadow-sm md:text-5xl">
          {storeName}
        </h1>
        <div className="mx-auto mb-6 h-1 w-24 rounded-full bg-gradient-to-r from-transparent via-yellow-400 to-transparent" />

        <p className="mb-6 text-xl font-light leading-relaxed text-primary-100 md:text-2xl">
          Xin được phục vụ
        </p>

        {/* Featured products */}
        {showFeatured && (
          <div className={"mb-6 transform transition-all duration-700 delay-200 " + (step >= 2 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0")}>
            <div className="flex items-center justify-center gap-3 mb-3">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
              <span className="text-yellow-400 font-black text-sm uppercase tracking-widest">Món mới</span>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-yellow-400/50 to-transparent" />
            </div>
            <div className="flex justify-center gap-4 flex-wrap">
              {featuredProducts.slice(0, 4).map((p, i) => (
                <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden w-36 shadow-xl">
                  <div className="aspect-square bg-white/5 flex items-center justify-center">
                    {p.image_url
                      ? <OptimizedImg src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      : <div className="text-white/40"><Icon name="utensils" className="w-8 h-8" /></div>}
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-sm font-bold text-white line-clamp-2 leading-tight mb-1">{p.name}</p>
                    <p className="text-yellow-400 font-black text-sm">{formatVND(p.price)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BẮT ĐẦU button với ChevronRight + animate-ping */}
        <div className={"transform transition-all duration-700 delay-200 " + (step >= 3 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0")}>
          <button onClick={onDismiss}
            className="group relative mx-auto flex items-center justify-center space-x-2 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-600 px-12 py-4 text-xl font-black text-black shadow-xl transition-all duration-300 hover:scale-105 active:scale-95">
            <span>BẮT ĐẦU</span>
            <Icon name="arrow-right" className="w-6 h-6 transition-transform group-hover:translate-x-1" />
            <div className="absolute inset-0 animate-ping rounded-full ring-2 ring-white/50 opacity-50"></div>
          </button>
          <p className="mt-4 text-sm text-white/50">Nhấn để gọi món</p>
        </div>
      </div>

      {/* Bottom: Facebook link + Menu điện tử */}
      <div className={"absolute bottom-6 flex flex-col items-center space-y-3 transform transition-all duration-700 delay-500 " + (step >= 3 ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0")}>
        {facebookUrl && (
          <a href={facebookUrl} target="_blank" rel="noreferrer"
            className="flex items-center space-x-3 rounded-full border border-blue-400/30 bg-blue-600 px-6 py-3 font-bold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-blue-500 hover:shadow-blue-500/40">
            <span>Kết bạn Facebook để đặt ship khi cần</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </a>
        )}
        <p className="flex items-center justify-center gap-2 text-xs font-light uppercase tracking-widest text-white/40">
          Menu điện tử cho
          <span className="font-bold text-yellow-400">{storeName}</span>
        </p>
      </div>
    </div>
  );
}

// ============ Public: Modals ============
function CartModal({ cart, total, onClose, onUpdateQty, onEdit, onSubmit, isOrdering, orderSuccess, onRemove }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full max-h-[80vh] rounded-t-3xl overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <h2 className="text-xl font-black">Giỏ hàng của bạn</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-2xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Giỏ hàng trống</div>
          ) : cart.map((it, idx) => {
            const hasToppings = it.toppings.length > 0;
            const hasNotes = it.notes && it.notes.trim().length > 0;
            return (
              <div key={it.tempId} className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-gray-800 text-sm">
                      {it.product.name} {it.size && <span className="text-primary-600 font-normal">({it.size.name})</span>}
                    </h3>
                    <p className="text-primary-600 font-bold text-sm">{it.product.price.toLocaleString()}đ</p>
                    <button onClick={() => onEdit(it.tempId)} className="mt-2 w-full text-left">
                      {hasToppings ? (
                        <div className="flex items-start gap-1.5 mb-1.5">
                          <span className="text-primary-600 flex-shrink-0 mt-0.5"><Icon name="puzzle" className="w-3 h-3" /></span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-primary-600 uppercase tracking-wider mb-0.5">Topping</p>
                            <div className="flex flex-wrap gap-1">
                              {it.toppings.map((t, ti) => (
                                <span key={ti} className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">+{t.name}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mb-1 text-xs font-bold text-gray-400 hover:text-primary-600 transition">
                          <span><Icon name="puzzle" className="w-3 h-3 inline" /></span>
                          <span className="text-[10px] font-black uppercase tracking-wider">Topping:</span>
                          <span className="italic font-medium">Thêm topping...</span>
                        </div>
                      )}
                      {hasNotes ? (
                        <div className="flex items-start gap-1.5 mt-1.5 p-2 bg-yellow-50 border-l-2 border-yellow-400 rounded-r">
                          <span className="text-yellow-600 flex-shrink-0 mt-0.5"><Icon name="message-square" className="w-3 h-3" /></span>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-yellow-700 uppercase tracking-wider mb-0.5">Ghi chú</p>
                            <p className="text-xs text-yellow-700 font-medium leading-snug">{it.notes}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-1 text-xs font-bold text-gray-400 hover:text-primary-600 transition">
                          <span><Icon name="message-square" className="w-3 h-3 inline" /></span>
                          <span className="text-[10px] font-black uppercase tracking-wider">Ghi chú:</span>
                          <span className="italic font-medium">Thêm ghi chú...</span>
                        </div>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button onClick={() => onUpdateQty(it.tempId, -1)} className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold">−</button>
                    <span className="font-black w-8 text-center">{it.quantity}</span>
                    <button onClick={() => onUpdateQty(it.tempId, +1)} className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-bold">+</button>
                  </div>
                </div>
                <button onClick={() => onRemove(it.tempId)}
                  className="mt-3 text-xs font-bold text-red-400 hover:text-red-600 uppercase tracking-wider">
                  Xóa món
                </button>
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t bg-gray-50">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-gray-600">Tổng cộng:</span>
            <span className="text-2xl font-black text-primary-600">{total.toLocaleString()}đ</span>
          </div>
          <button onClick={onSubmit} disabled={isOrdering || orderSuccess}
            className="w-full bg-primary-600 text-white py-4 rounded-xl font-black text-lg hover:bg-primary-700 transition disabled:opacity-50 flex items-center justify-center space-x-2">
            {orderSuccess ? (
              <>
                <Icon name="check" className="w-6 h-6" />
                <span>Đã gửi đơn!</span>
              </>
            ) : (
              <span>{isOrdering ? "Đang gửi..." : "Gửi đơn hàng"}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SizeModal({ product, onConfirm, onClose }) {
  if (!product) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden">
        <div className="p-6 border-b bg-gray-50">
          <h3 className="text-lg font-black text-gray-800 text-center uppercase tracking-tight">Chọn kích cỡ</h3>
          <p className="text-xs text-gray-500 text-center font-bold">{product.name}</p>
        </div>
        <div className="p-6 space-y-3">
          {product.sizes.map((s) => (
            <button key={s.id} onClick={() => onConfirm(s)}
              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-gray-100 hover:border-primary-500 hover:bg-primary-50 transition-all group">
              <span className="font-black text-gray-800 group-hover:text-primary-700">{s.name}</span>
              <span className="font-black text-primary-600">{s.price.toLocaleString()}đ</span>
            </button>
          ))}
        </div>
        <div className="p-6 bg-gray-50 border-t">
          <button onClick={onClose} className="w-full py-3 bg-white border text-gray-600 font-bold rounded-xl uppercase hover:bg-gray-100 transition">Đóng</button>
        </div>
      </div>
    </div>
  );
}

function EditItemModal({ item, toppings, categories, onClose, onToggleTopping, onUpdateNotes }) {
  if (!item) return null;
  const category = categories.find((c) => c.id === item.product.category_id);
  const allowedToppings = (category?.allow_all_toppings !== false)
    ? toppings
    : (category?.allowed_toppings?.length > 0
        ? toppings.filter((t) => category.allowed_toppings.includes(t.id))
        : []);
  return (
    <div className="fixed inset-0 z-[60] flex items-end">
      <div className="absolute inset-0 bg-black/60" onClick={onClose}></div>
      <div className="relative bg-white w-full max-h-[75vh] rounded-t-3xl overflow-hidden flex flex-col">
        <div className="p-4 border-b flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-lg font-black text-gray-800">Tuỳ chỉnh món</h3>
            <p className="text-sm font-bold text-gray-500">{item.product.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-2xl">×</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {allowedToppings.length > 0 && (
            <div>
              <h4 className="text-sm font-black text-gray-800 mb-3">Chọn Topping</h4>
              <div className="grid grid-cols-2 gap-2">
                {allowedToppings.map((t) => {
                  const selected = item.toppings.find((x) => x.id === t.id);
                  return (
                    <button key={t.id} onClick={() => onToggleTopping(t)}
                      className={`p-3 rounded-xl text-left text-sm font-bold transition border ${selected ? "bg-primary-600 text-white border-primary-600" : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"}`}>
                      <div>{t.name}</div>
                      <div className={`text-xs mt-0.5 ${selected ? "text-primary-100" : "text-gray-400"}`}>+{t.price.toLocaleString()}đ</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <h4 className="text-sm font-black text-gray-800 mb-3">Ghi chú</h4>
            <textarea rows={2} placeholder="VD: không đá, ít đường, cay ít..."
              value={item.notes || ""}
              onChange={(e) => onUpdateNotes(e.target.value)}
              data-focus-key={`public-notes-${item.tempId}`}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none"
            />
          </div>
        </div>
        <div className="p-4 border-t bg-gray-50">
          <button onClick={onClose}
            className="w-full py-4 bg-primary-600 text-white rounded-xl font-black text-base hover:bg-primary-700 transition">
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}

function TableGroupModal({ table, onChooseContinue, onChooseCallStaff }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-black text-gray-800 mb-3">
          Bàn này đã có món được gọi từ trước
        </h2>
        <p className="text-gray-700 mb-6 leading-relaxed">
          Nếu bạn đang ngồi và muốn gọi thêm món, vui lòng chọn bên dưới.
          Nếu bạn là khách mới, hãy gọi nhân viên đến để xử lý đơn hàng
          trước khi đặt món.
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={onChooseContinue}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors">
            Tôi đang ngồi, gọi thêm món
          </button>
          <button onClick={onChooseCallStaff}
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors">
            Tôi là khách mới, gọi nhân viên
          </button>
        </div>
      </div>
    </div>
  );
}

function WaitingStaffScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-yellow-50 to-orange-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md animate-in zoom-in-95">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center animate-bounce-slow"><Icon name="bell" className="w-8 h-8" /></div>
        <h2 className="text-2xl font-black text-gray-800 mb-3">Đã gọi nhân viên</h2>
        <p className="text-gray-700 leading-relaxed">
          Vui lòng chờ nhân viên đến để xử lý đơn hàng trước đó. Sau khi nhân viên xử lý xong, bạn có thể đặt món bình thường.
        </p>
      </div>
    </div>
  );
}

function MyOrderView({ items, onDelete, onReduce }) {
  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-12">
          <div className="mb-4 text-gray-300"><Icon name="clipboard-list" className="w-16 h-16 mx-auto" /></div>
          <p className="text-gray-500 font-bold">Chưa có món nào</p>
          <p className="text-gray-400 text-sm mt-2">Món đã chọn sẽ hiện ở đây</p>
        </div>
      </div>
    );
  }
  // Group items by name + toppings
  const groups = {};
  items.forEach((it) => {
    const toppingKey = (it.toppings || []).slice().sort().join(",");
    const k = `${it.name}|${toppingKey}`;
    if (groups[k]) {
      groups[k].quantity = (groups[k].quantity || 0) + it.quantity;
      groups[k].total_price = (groups[k].total_price || 0) + it.price * it.quantity;
      groups[k].items.push(it);
    } else {
      groups[k] = { ...it, quantity: it.quantity, total_price: it.price * it.quantity, items: [it] };
    }
  });
  const total = items.reduce((s, it) => s + it.price * it.quantity, 0);

  const statusBadge = (s) => {
    if (s === "pending") return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center space-x-1"><Icon name="check" className="w-3 h-3" /><span>Đã nhận món</span></span>;
    if (s === "processing") return <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center space-x-1"><Icon name="chef-hat" className="w-3 h-3" /><span>Đang làm</span></span>;
    if (s === "completed") return <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center space-x-1"><Icon name="check-circle" className="w-3 h-3" /><span>Đã phục vụ</span></span>;
    return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="space-y-3">
        {Object.values(groups).map((item, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-md p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {item.status === "pending" && (
                  <button onClick={() => onReduce(item.order_id, item.id, item.quantity)}
                    className="px-2 py-1 bg-red-100 text-red-700 text-xs font-black rounded hover:bg-red-200 active:scale-95 transition-all">
                    −
                  </button>
                )}
                <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-black rounded">
                  {item.quantity}x
                </span>
                <div className="flex flex-col">
                  <h3 className="font-black text-gray-800">{item.name}</h3>
                  {item.size_name && <span className="text-xs text-primary-600 font-bold">Size: {item.size_name}</span>}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {statusBadge(item.status)}
                {item.status === "pending" && (
                  <button onClick={() => onDelete(item.order_id, item.id)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all" title="Hủy món">
                    <Icon name="trash-2" className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            {item.toppings && item.toppings.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.toppings.map((topping, i) => (
                  <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">+{topping}</span>
                ))}
              </div>
            )}
            {item.notes && (
              <div className="mt-2 p-2 bg-yellow-50 border-l-2 border-yellow-400 rounded-r">
                <p className="text-xs text-yellow-700 font-medium flex items-start">
                  <Icon name="message-square" className="w-3 h-3 mr-1 inline" />
                  <span>{item.notes}</span>
                </p>
              </div>
            )}
            <div className="text-right mt-2 font-black text-gray-800">{item.total_price.toLocaleString()}đ</div>
          </div>
        ))}
      </div>
      <div className="sticky bottom-0 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-2xl p-6 mt-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-primary-100 font-bold uppercase tracking-wide">Tổng cộng</p>
            <p className="text-sm text-primary-200 mt-1">{items.length} món đang chờ</p>
          </div>
          <div className="text-right">
            <p className="text-4xl font-black text-white">{total.toLocaleString()}đ</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Public: PublicMenuView ============
function PublicMenuView({ tableId, onLogout }) {
  const [storeName, setStoreName] = useState("Đang tải...");
  const [table, setTable] = useState(null);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [featuredProducts, setFeaturedProducts] = useState([]);
  const [facebookUrl, setFacebookUrl] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CART_PREFIX + tableId) || "[]"); } catch { return []; }
  });
  const [activeView, setActiveView] = useState("menu");
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showWelcome, setShowWelcome] = useState(() => !sessionStorage.getItem(WELCOME_KEY));
  const [welcomeStep, setWelcomeStep] = useState(0);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedProductForSize, setSelectedProductForSize] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItemTempId, setEditItemTempId] = useState(null);
  const [tableState, setTableState] = useState(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [waitingStaff, setWaitingStaff] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [requestToken, setRequestToken] = useState(() => localStorage.getItem(REQUEST_TOKEN_PREFIX + tableId) || null);
  const [lastSubmitNetworkFailed, setLastSubmitNetworkFailed] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Persist cart
  useEffect(() => {
    try { localStorage.setItem(CART_PREFIX + tableId, JSON.stringify(cart)); } catch {}
  }, [cart, tableId]);

  // Persist requestToken
  useEffect(() => {
    if (requestToken) localStorage.setItem(REQUEST_TOKEN_PREFIX + tableId, requestToken);
  }, [requestToken, tableId]);

  // Welcome animation steps
  useEffect(() => {
    if (!showWelcome) return;
    sessionStorage.setItem(WELCOME_KEY, "true");
    const t1 = setTimeout(() => setWelcomeStep(1), 100);
    const t2 = setTimeout(() => setWelcomeStep(2), 600);
    const t3 = setTimeout(() => setWelcomeStep(3), 1000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [showWelcome]);

  // Fetch menu
  useEffect(() => {
    (async () => {
      try {
        const [menuRes, settingsRes] = await Promise.all([
          fetch(`/api/public/menu/${tableId}?_=${Date.now()}`).then((r) => r.ok ? r.json() : Promise.reject(r.status)),
          fetch(`/api/settings?_=${Date.now()}`).then((r) => r.ok ? r.json() : {}),
        ]);
        const prods = (menuRes.products || []).filter((p) => !p.is_topping);
        const tops = (menuRes.products || []).filter((p) => p.is_topping);
        const fp = settingsRes.featured_products || [];
        document.title = menuRes.store?.name || "Menu POS";
        setStoreName(menuRes.store?.name || "POS Demo");
        setTable(menuRes.table);
        setCategories(menuRes.categories || []);
        setProducts(prods);
        setToppings(tops);
        setFeaturedProducts((menuRes.products || []).filter((p) => fp.includes(p.id)));
        setFacebookUrl(settingsRes.facebook_url || "");
        setLoading(false);
      } catch (err) {
        setError(err.message || "Không thể tải menu");
        setLoading(false);
      }
    })();
  }, [tableId]);

  // Polling table-state every 10s
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/public/table-state/${tableId}?_=${Date.now()}`);
        if (!r.ok || cancelled) return;
        const data = await r.json();
        setTableState((prev) => {
          if (prev?.has_pending_order && !data.has_pending_order) {
            try { localStorage.removeItem(SESSION_PREFIX + tableId); } catch {}
            setShowGroupModal(false);
            setWaitingStaff(false);
          }
          return data;
        });
        if (data.has_pending_order) {
          const mySession = localStorage.getItem(SESSION_PREFIX + tableId);
          const isMyOrder = mySession && mySession === data.customer_session_id;
          if (!isMyOrder && !waitingStaff) setShowGroupModal(true);
          else setShowGroupModal(false);
        } else {
          setShowGroupModal(false);
        }
      } catch (err) { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [tableId, waitingStaff]);

  // Polling items when in myorder view
  useEffect(() => {
    if (activeView !== "myorder") return;
    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/public/items/${tableId}?_=${Date.now()}`);
        if (!r.ok || cancelled) return;
        const data = await r.json();
        setMyItems(Array.isArray(data) ? data : []);
      } catch (err) { /* ignore */ }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeView, tableId]);

  // Filter products
  const filtered = useMemo(() => {
    let list = products;
    if (searchQuery.trim()) {
      const q = removeAccents(searchQuery.toLowerCase().trim());
      list = list.filter((p) => removeAccents(p.name.toLowerCase()).includes(q));
    } else if (selectedCategory !== null) {
      list = list.filter((p) => p.category_id === selectedCategory);
    }
    return list;
  }, [products, selectedCategory, searchQuery]);

  // Generate new request token
  const newRequestToken = useCallback(() => {
    const t = genToken();
    setRequestToken(t);
    return t;
  }, []);

  // Cart helpers
  const addToCart = (product, size) => {
    if (product.sizes && product.sizes.length > 0 && !size) {
      setSelectedProductForSize(product);
      setShowSizeModal(true);
      return;
    }
    const existing = cart.findIndex((item) =>
      item.product.id === product.id &&
      item.toppings.length === 0 &&
      ((!item.size && !size) || (item.size && size && item.size.id === size.id)) &&
      !item.notes
    );
    const itemPrice = size ? size.price : product.price;
    const productWithPrice = { ...product, price: itemPrice };
    if (existing >= 0) {
      setCart(cart.map((it, i) => i === existing ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setCart([...cart, { tempId: genToken(), product: productWithPrice, size: size || null, quantity: 1, toppings: [], notes: "" }]);
    }
    newRequestToken();
    addToast(`Đã thêm ${product.name}`);
  };

  const updateQty = (tempId, delta) => {
    setCart(cart.map((it) => it.tempId === tempId ? { ...it, quantity: it.quantity + delta } : it).filter((it) => it.quantity > 0));
    newRequestToken();
  };

  const toggleTopping = (tempId, topping) => {
    setCart(cart.map((it) => {
      if (it.tempId !== tempId) return it;
      const idx = it.toppings.findIndex((t) => t.id === topping.id);
      const newToppings = idx >= 0 ? it.toppings.filter((_, i) => i !== idx) : [...it.toppings, topping];
      return { ...it, toppings: newToppings };
    }));
    newRequestToken();
  };

  const updateNotes = (tempId, notes) => {
    setCart(cart.map((it) => it.tempId === tempId ? { ...it, notes: notes || "" } : it));
    newRequestToken();
  };

  const removeItem = (tempId) => {
    setCart(cart.filter((it) => it.tempId !== tempId));
    newRequestToken();
  };

  const confirmSize = (size) => {
    if (!selectedProductForSize) return;
    addToCart(selectedProductForSize, size);
    setShowSizeModal(false);
    setSelectedProductForSize(null);
  };

  const addToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message: msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  };

  const cartTotal = cart.reduce((sum, it) => {
    const productTotal = it.product.price * it.quantity;
    const toppingTotal = it.toppings.reduce((s, t) => s + t.price, 0) * it.quantity;
    return sum + productTotal + toppingTotal;
  }, 0);
  const cartCount = cart.reduce((s, it) => s + it.quantity, 0);

  // Submit order — optimistic: chuyển sang "Đơn của tôi" ngay, BE chạy nền + retry tối đa 3 lần
  const submitOrder = async () => {
    if (cart.length === 0) { addToast("Vui lòng chọn ít nhất 1 món"); return; }
    setIsOrdering(true);
    // Optimistic: chuyển giao diện ngay
    try { localStorage.removeItem(CART_PREFIX + tableId); } catch {}
    setCart([]); setRequestToken(null);
    setShowCartModal(false); setActiveView("myorder");
    setIsOrdering(false);

    // Gửi đơn nền + retry tối đa 3 lần
    const sessionId = localStorage.getItem(SESSION_PREFIX + tableId);
    const orderData = {
      table_id: tableId, table_position: "A",
      request_token: requestToken, retry_after_failure: lastSubmitNetworkFailed,
      items: cart.map((it) => ({
        product_id: it.product.id, quantity: it.quantity,
        toppings: it.toppings.map((t) => t.id),
        size_id: it.size?.id, notes: it.notes || "",
      })),
    };
    if (sessionId) orderData.customer_session_id = sessionId;

    let lastErr = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch("/api/public/orders", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(orderData),
        });
        if (!res.ok) {
          let data; try { data = await res.json(); } catch { data = {}; }
          // Phiên hết hạn → hiện modal chọn nhóm, không retry
          if (res.status === 409 || res.status === 403) {
            try { localStorage.removeItem(SESSION_PREFIX + tableId); } catch {}
            setShowGroupModal(true);
            setTableState({ has_pending_order: true, customer_session_id: null });
            setLastSubmitNetworkFailed(false);
            addToast(data.message || "Phiên đặt món đã hết hạn");
            return;
          }
          // Lỗi server khác → retry
          lastErr = data.message || "Lỗi gửi đơn";
          continue;
        }
        const data = await res.json();
        if (data.customer_session_id) localStorage.setItem(SESSION_PREFIX + tableId, data.customer_session_id);
        setLastSubmitNetworkFailed(false);
        addToast("Đã gửi đơn hàng thành công!");
        return;
      } catch (err) {
        setLastSubmitNetworkFailed(true);
        lastErr = "Mạng không ổn định";
      }
    }
    // Quá 3 lần thất bại → thông báo lỗi
    newRequestToken();
    setLastSubmitNetworkFailed(false);
    addToast("Không gửi được đơn sau 3 lần thử: " + lastErr + ". Vui lòng liên hệ nhân viên.");
  };

  const deleteItem = async (orderId, itemId) => {
    if (!confirm("Bạn có chắc muốn hủy món này?")) return;
    try {
      await fetch(`/api/public/orders/${orderId}/items/${itemId}`, { method: "DELETE" });
      // Refresh items
      const r = await fetch(`/api/public/items/${tableId}`);
      if (r.ok) setMyItems(await r.json());
    } catch (err) { addToast("Lỗi xóa món"); }
  };

  const reduceQty = async (orderId, itemId, currentQty) => {
    try {
      if (currentQty <= 1) {
        if (!confirm("Bạn có chắc muốn hủy món này?")) return;
        await fetch(`/api/public/orders/${orderId}/items/${itemId}`, { method: "DELETE" });
      } else {
        await fetch(`/api/public/orders/${orderId}/items/${itemId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: currentQty - 1 }),
        });
      }
      const r = await fetch(`/api/public/items/${tableId}`);
      if (r.ok) setMyItems(await r.json());
    } catch (err) { addToast("Lỗi cập nhật"); }
  };

  const callStaff = async () => {
    try {
      await fetch("/api/public/call-staff", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ table_id: tableId, reason: "new_customer" }),
      });
      setWaitingStaff(true);
      setShowGroupModal(false);
    } catch (err) { addToast("Gọi nhân viên thất bại"); }
  };

  const chooseContinue = () => {
    const sessionId = tableState?.customer_session_id;
    if (sessionId) localStorage.setItem(SESSION_PREFIX + tableId, sessionId);
    setShowGroupModal(false);
  };

  const dismissWelcome = () => setShowWelcome(false);

  // Edit item helpers
  const editItem = cart.find((it) => it.tempId === editItemTempId);

  // Render
  if (waitingStaff) return <WaitingStaffScreen />;
  if (showGroupModal && tableState?.has_pending_order) {
    return <TableGroupModal table={table} onChooseContinue={chooseContinue} onChooseCallStaff={callStaff} />;
  }
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600 font-bold">Đang tải menu...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center max-w-md">
          <div className="mb-4 text-red-400"><Icon name="x-circle" className="w-16 h-16 mx-auto" /></div>
          <p className="text-red-600 font-bold mb-2">{error}</p>
          <button onClick={() => window.location.reload()} className="px-6 py-2 bg-primary-600 text-white rounded-xl font-bold hover:bg-primary-700">Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-32">
      <header className="bg-primary-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto">
          {table?.name && <p className="text-primary-100 font-bold">{table.name}</p>}
          <div className="relative mt-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"><Icon name="search" className="w-4 h-4" /></span>
            <input
              type="text"
              placeholder="Tìm kiếm món..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-focus-key="public-search"
              className="w-full pl-10 pr-10 py-2 rounded-full bg-white/20 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white text-lg font-bold">
                ×
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="sticky top-[72px] bg-white border-b z-10">
        <div className="max-w-4xl mx-auto flex">
          <button onClick={() => setActiveView("menu")}
            className={`flex-1 py-3 font-black text-sm transition ${activeView === "menu" ? "text-primary-600 border-b-2 border-primary-600" : "text-gray-500"}`}>
            MENU
          </button>
          <button onClick={() => setActiveView("myorder")}
            className={`flex-1 py-3 font-black text-sm transition flex items-center justify-center space-x-2 ${activeView === "myorder" ? "text-primary-600 border-b-2 border-primary-600" : "text-gray-500"}`}>
            <span><Icon name="clipboard-list" className="w-4 h-4 inline" /></span>
            <span>MÓN ĐÃ CHỌN</span>
          </button>
        </div>
      </div>

      {activeView === "menu" ? (
        <>
          <div className="sticky top-[120px] bg-white border-b z-10">
            <div className="max-w-4xl mx-auto flex flex-wrap gap-2 p-3">
              <button onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full font-bold text-xs transition ${selectedCategory === null ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                Tất cả
              </button>
              {categories.map((c) => (
                <button key={c.id} onClick={() => setSelectedCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full font-bold text-xs transition ${selectedCategory === c.id ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <main className="max-w-4xl mx-auto p-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16 text-gray-400">Không có sản phẩm</div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {filtered.map((p) => {
                  const hasSizes = p.sizes && p.sizes.length > 0;
                  return (
                    <div key={p.id} onClick={() => addToCart(p)}
                      className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer active:scale-95 transition-transform">
                      <div className="relative w-full bg-gray-50" style={{paddingBottom: "100%"}}>
                        {p.image_url ? (
                          <OptimizedImg src={p.image_url} alt={p.name} width="200" height="200"
                            className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                          <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
                            <span className="text-gray-400"><Icon name="utensils" className="w-8 h-8" /></span>
                          </div>
                        )}
                      </div>
                      <div className="p-2">
                        <h3 className="font-bold text-xs text-gray-800 line-clamp-2 leading-tight">{p.name}</h3>
                        <p className="text-primary-600 font-black text-sm mt-1">
                          {hasSizes ? "Từ " + Math.min(...p.sizes.map(s => s.price)).toLocaleString() + "đ" : p.price.toLocaleString() + "đ"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>

          {cart.length > 0 && (
            <button onClick={() => setShowCartModal(true)}
              className="fixed bottom-4 right-4 bg-primary-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 font-black z-20 animate-bounce-slow"
              style={{boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)", animation: "bounce 2s infinite, pulse-ring 1.5s ease-out infinite"}}>
              <Icon name="shopping-cart" className="w-6 h-6 animate-wiggle" />
              <div className="flex flex-col items-start">
                <span className="text-xs text-primary-200">{cart.length} món</span>
                <span className="text-sm">{cartTotal.toLocaleString()}đ</span>
              </div>
            </button>
          )}
        </>
      ) : (
        <MyOrderView items={myItems} onDelete={deleteItem} onReduce={reduceQty} />
      )}

      {showCartModal && (
        <CartModal cart={cart} total={cartTotal} onClose={() => setShowCartModal(false)}
          onUpdateQty={updateQty} onEdit={(tempId) => { setEditItemTempId(tempId); setShowEditModal(true); }}
          onRemove={removeItem}
          onSubmit={submitOrder} isOrdering={isOrdering} orderSuccess={orderSuccess}
        />
      )}
      {showSizeModal && (
        <SizeModal product={selectedProductForSize} onConfirm={confirmSize} onClose={() => { setShowSizeModal(false); setSelectedProductForSize(null); }} />
      )}
      {showEditModal && editItem && (
        <EditItemModal item={editItem} toppings={toppings} categories={categories}
          onClose={() => { setShowEditModal(false); setEditItemTempId(null); }}
          onToggleTopping={(t) => toggleTopping(editItem.tempId, t)}
          onUpdateNotes={(notes) => updateNotes(editItem.tempId, notes)}
        />
      )}
      {showWelcome && <WelcomeOverlay onDismiss={dismissWelcome} storeName={storeName} featuredProducts={featuredProducts} step={welcomeStep} facebookUrl={facebookUrl} />}

      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((t) => (
            <div key={t.id} className="bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-slide-in-right">{t.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Kitchen / Counter View ============

const KITCHEN_POLL_INTERVAL_MS = 15000; // fallback nếu SSE rớt — SSE là kênh chính

function KitchenView({ unit, onLogout, fill = "screen" }) {
  // Sync context: use shared data when embedded in PosApp
  const syncCtx = useContext(SyncContext);
  const isEmbedded = !!syncCtx;
  const contextOrders = isEmbedded ? (unit === "kitchen" ? syncCtx.kitchenOrders : syncCtx.counterOrders) : null;
  const contextCancelled = isEmbedded ? (unit === "kitchen" ? syncCtx.kitchenCancelled : syncCtx.counterCancelled) : null;

  const [localOrders, setLocalOrders] = useState([]);
  const [localCancelledItems, setLocalCancelledItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");
  const [itemActionLoading, setItemActionLoading] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioContextRef = useRef(null);
  const lastPlayTime = useRef(0);
  const previousOrderIdsRef = useRef(null); // null = chưa tải lần đầu → không báo lúc mở màn
  // Theo dõi optimistic status: itemId → {status, qty, at} — giữ cho tới khi server confirm
  const pendingStatusRef = useRef(new Map());
  const mutationCounter = useRef(0);
  // Phase 5a: online status
  const isOnline = useOnlineStatus();

  // Phase 6: midnight cleanup — xóa dữ liệu kitchen cũ khi sang ngày mới
  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = localStorage.getItem('pos_last_midnight');
    if (lastDate && lastDate !== today) {
      // Xóa non-completed cũ hơn hôm nay
      clearKitchenBeforeDate(today);
      // Xóa completed cũ hơn 1 ngày
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      clearCompletedBeforeDate(yesterday);
      // Xóa menu cache cũ hơn 7 ngày
      clearOldMenuCache(7 * 86400000);
    }
    localStorage.setItem('pos_last_midnight', today);
  }, []);

  // Derived: merge server data với pending in-flight mutations (optimistic UI).
  // Server là single source of truth — chạy local nên không cần lớp IndexedDB
  // "local wins" (lớp đó từng gây item hồi sinh/hiển thị sai cột khi đồng bộ).
  const orders = useMemo(() => {
    const source = isEmbedded ? contextOrders : localOrders;
    if (!source) return [];
    const pending = pendingStatusRef.current;
    const now = Date.now();
    // TTL sweep: pending quá 10s chưa được server confirm → bỏ, hiện dữ liệu thật
    for (const [pid, p] of pending) {
      if (p.at && now - p.at > 10000) pending.delete(pid);
    }
    return source.map((order) => ({
      ...order,
      items: order.items.map((it) => {
        const p = pending.get(it.id);
        if (!p) return it;
        // Server đã xác nhận status/qty mới → xóa pending, dùng dữ liệu server
        if (!p.deleted && p.status && it.status === p.status) { pending.delete(it.id); return it; }
        if (!p.deleted && p.qty != null && it.quantity === p.qty) { pending.delete(it.id); return it; }
        if (p.deleted) return null;
        return { ...it, status: p.status ?? it.status, quantity: p.qty ?? it.quantity };
      }).filter(Boolean),
    }));
  }, [contextOrders, localOrders, isEmbedded, mutationCounter.current]);

  const cancelledItems = isEmbedded ? (contextCancelled || localCancelledItems) : localCancelledItems;

  // In embedded mode, loading is driven by context availability
  const effectiveLoading = isEmbedded ? !contextOrders : loading;

  // Embedded mode: mark as loaded once context delivers first data
  useEffect(() => {
    if (isEmbedded && contextOrders && loading) setLoading(false);
  }, [isEmbedded, contextOrders, loading]);

  const isKitchen = unit === "kitchen";
  const token = localStorage.getItem(TOKEN_KEY);

  const authFetch = useCallback(async (path, options = {}) => {
    const resp = await fetch(path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    if (resp.status === 401) {
      onLogout();
      throw new Error("Unauthorized");
    }
    return resp;
  }, [token, onLogout]);

  const playAlertSound = useCallback(() => {
    if (!soundEnabled) return;
    const now = Date.now();
    if (now - lastPlayTime.current < 1000) return;
    lastPlayTime.current = now;
    // File WAV phát qua <audio> media stream — to theo volume máy, fallback oscillator
    playBeep();
  }, [soundEnabled]);

  const fetchOrders = useCallback(async () => {
    if (isEmbedded) return; // Data comes from SyncContext
    try {
      const [ordersResp, eventsResp] = await Promise.all([
        authFetch(`/api/orders/kitchen?unit=${unit}`),
        authFetch(`/api/orders/kitchen/cancellation-events?unit=${unit}&hours=12`),
      ]);
      const ordersData = await ordersResp.json();
      const eventsData = await eventsResp.json();

      const newOrders = Array.isArray(ordersData) ? ordersData : [];
      const events = Array.isArray(eventsData) ? eventsData : [];

      // Play alert cho món MỚI theo item id — gọi thêm vào bill cũ cũng báo
      const newIds = new Set(newOrders.flatMap((o) => (o.items || []).map((it) => it.id)));
      if (previousOrderIdsRef.current !== null) {
        for (const id of newIds) {
          if (!previousOrderIdsRef.current.has(id)) {
            playAlertSound();
            break;
          }
        }
      }
      previousOrderIdsRef.current = newIds;

      // Áp dụng pending optimistic status — giữ status mới cho item đang có API call
      const pending = pendingStatusRef.current;
      if (pending.size > 0) {
        setLocalOrders(newOrders.map((order) => ({
          ...order,
          items: order.items.map((it) => {
            const p = pending.get(it.id);
            if (!p) return it;
            // Nếu server đã sync đúng → xóa pending
            if (p.status && it.status === p.status) {
              pending.delete(it.id);
              return it;
            }
            if (p.deleted) return null; // item đang bị hủy/xóa
            return { ...it, status: p.status ?? it.status, quantity: p.qty ?? it.quantity };
          }).filter(Boolean),
        })));
      } else {
        setLocalOrders(newOrders);
      }

      // Build cancelled items map
      const cancelledMap = {};
      for (const ev of events) {
        const itemId = parseInt(ev.item_id, 10);
        if (!Number.isFinite(itemId) || cancelledMap[itemId]) continue;
        cancelledMap[itemId] = {
          event_id: ev.event_id,
          action: ev.action,
          old_quantity: ev.old_quantity,
          new_quantity: ev.new_quantity,
          product_name: ev.product_name,
          table_name: ev.table_name,
          created_at: ev.created_at,
        };
      }
      setLocalCancelledItems(cancelledMap);
      setError(null);
    } catch (err) {
      console.error("Kitchen fetch error:", err);
      setError(err.message || "Lỗi tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, [authFetch, unit, playAlertSound, isEmbedded]);

  // SSE push là chính: mutation → fetch ngay; interval chỉ là dự phòng nếu SSE rớt.
  // Pending overlay giữ trạng thái mới nên không sợ fetch ghi đè.
  useEffect(() => {
    if (isEmbedded) return; // SyncProvider handles polling
    fetchOrders();
    const interval = setInterval(fetchOrders, KITCHEN_POLL_INTERVAL_MS);
    const es = new EventSource("/api/events");
    es.onmessage = () => fetchOrders();
    return () => { clearInterval(interval); es.close(); };
  }, [fetchOrders, isEmbedded]);

  // Báo động nhắc liên tục: món pending quá 30s chưa được bấm "đang làm"
  // → kêu lặp mỗi 5s cho tới khi bếp/quầy nhận món (status đổi khỏi 'pending').
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const overdue = orders.some((o) => (o.items || []).some((it) => {
        if (it.status !== "pending") return false;
        const t = it.reported_at ? new Date(it.reported_at.replace(" ", "T") + "Z").getTime() : NaN;
        return Number.isFinite(t) && now - t > 30000;
      }));
      if (overdue) playAlertSound();
    };
    const iv = setInterval(tick, 5000);
    return () => clearInterval(iv);
  }, [orders, playAlertSound]);

  const updateItemStatus = async (itemId, status) => {
    const key = `${itemId}:status`;
    if (itemActionLoading[key]) return;
    setItemActionLoading((prev) => ({ ...prev, [key]: true }));
    const now = Date.now();
    // Optimistic: pending chỉ sống trong lúc request bay — server là truth
    pendingStatusRef.current.set(itemId, { status, at: now });
    mutationCounter.current++;
    if (!isEmbedded) {
      setLocalOrders((prev) =>
        prev.map((order) => ({
          ...order,
          items: order.items.map((it) => (it.id === itemId ? { ...it, status } : it)),
        }))
      );
    }
    let ok = false;
    try {
      const resp = await authFetch(`/api/admin/order-items/${itemId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
      });
      // Server trả lỗi (400/500) → đọc message hiện lên thay vì nuốt
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try { const j = await resp.json(); detail = j.message || j.error || detail; } catch {}
        alert(`Lỗi đổi trạng thái món: ${detail}`);
        if (!isEmbedded) fetchOrders();
      } else {
        ok = true;
      }
    } catch (err) {
      console.error("Status update error:", err);
      alert("Lỗi kết nối server: " + err.message);
      // Lỗi → bỏ optimistic, refetch về đúng trạng thái server
      if (!isEmbedded) fetchOrders();
    } finally {
      // Thành công: giữ pending overlay cho tới khi poll/SSE xác nhận status mới
      // (memo tự reconcile hoặc TTL 10s) — tránh UI nhảy về trạng thái cũ.
      if (!ok) pendingStatusRef.current.delete(itemId);
      mutationCounter.current++;
      setItemActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const reduceItemQuantity = async (item) => {
    if (!item?.order_id || !item?.id || item.status === "completed") return;
    const key = `${item.id}:reduce`;
    if (itemActionLoading[key]) return;
    const newQty = item.quantity - 1;
    const now = Date.now();
    setItemActionLoading((prev) => ({ ...prev, [key]: true }));
    pendingStatusRef.current.set(item.id, newQty <= 0 ? { deleted: true, at: now } : { qty: newQty, at: now });
    mutationCounter.current++;
    if (!isEmbedded) {
      setLocalOrders((prev) =>
        prev.map((order) => ({
          ...order,
          items: newQty <= 0
            ? order.items.filter((it) => it.id !== item.id)
            : order.items.map((it) => (it.id === item.id ? { ...it, quantity: newQty } : it)),
        }))
      );
    }
    let ok = false;
    try {
      const resp = item.quantity <= 1
        ? await authFetch(`/api/orders/${item.order_id}/items/${item.id}`, { method: "DELETE" })
        : await authFetch(`/api/orders/${item.order_id}/items/${item.id}`, {
            method: "PUT",
            body: JSON.stringify({ quantity: newQty }),
          });
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try { const j = await resp.json(); detail = j.message || j.error || detail; } catch {}
        alert(`Lỗi giảm số lượng: ${detail}`);
        if (!isEmbedded) fetchOrders();
      } else {
        ok = true;
      }
    } catch (err) {
      console.error("Reduce error:", err);
      alert("Lỗi kết nối server: " + err.message);
      if (!isEmbedded) fetchOrders();
    } finally {
      if (!ok) pendingStatusRef.current.delete(item.id);
      mutationCounter.current++;
      setItemActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  const cancelItem = async (item) => {
    if (!item?.order_id || !item?.id || item.status === "completed") return;
    const key = `${item.id}:cancel`;
    if (itemActionLoading[key]) return;
    const now = Date.now();
    setItemActionLoading((prev) => ({ ...prev, [key]: true }));
    pendingStatusRef.current.set(item.id, { deleted: true, at: now });
    mutationCounter.current++;
    if (!isEmbedded) {
      setLocalOrders((prev) =>
        prev.map((order) => ({
          ...order,
          items: order.items.filter((it) => it.id !== item.id),
        }))
      );
    }
    let ok = false;
    try {
      const resp = await authFetch(`/api/orders/${item.order_id}/items/${item.id}`, { method: "DELETE" });
      if (!resp.ok) {
        let detail = `HTTP ${resp.status}`;
        try { const j = await resp.json(); detail = j.message || j.error || detail; } catch {}
        alert(`Lỗi hủy món: ${detail}`);
        if (!isEmbedded) fetchOrders();
      } else {
        ok = true;
      }
    } catch (err) {
      console.error("Cancel error:", err);
      alert("Lỗi kết nối server: " + err.message);
      if (!isEmbedded) fetchOrders();
    } finally {
      if (!ok) pendingStatusRef.current.delete(item.id);
      mutationCounter.current++;
      setItemActionLoading((prev) => ({ ...prev, [key]: false }));
    }
  };

  // I5 fix: Persist dismissed cancellations with TTL via localStorage
  const [persistedDismissed, setPersistedDismissed] = useState(() => loadDismissed());

  const dismissCancelled = (itemId) => {
    setLocalCancelledItems((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
    const updated = { ...persistedDismissed, [itemId]: Date.now() };
    setPersistedDismissed(updated);
    saveDismissed(updated);
  };

  // Flatten items from all orders
  const pendingItems = [];
  const processingItems = [];
  for (const order of orders) {
    for (const item of order.items) {
      const enriched = {
        ...item,
        order_id: order.id,
        table_name: order.table_name,
        order_type: order.order_type,
        display_code: order.display_code,
        is_self_order: !!order.is_self_order,
        // Mốc đếm thời gian = thời điểm món được báo chế biến
        created_at: item.reported_at || order.created_at,
      };
      if (item.status === "pending") pendingItems.push(enriched);
      else if (item.status === "processing") processingItems.push(enriched);
    }
  }

  // Cancelled-only items (deleted from DB but shown via events)
  // I5 fix: Filter out items dismissed within TTL
  const cancelledOnlyItems = Object.entries(cancelledItems)
    .filter(([itemId]) => {
      const id = parseInt(itemId, 10);
      if (persistedDismissed[itemId]) return false; // Dismissed within TTL
      return !pendingItems.find((i) => i.id === id) && !processingItems.find((i) => i.id === id);
    })
    .map(([itemId, info]) => ({
      id: parseInt(itemId, 10),
      product_name: info.product_name,
      table_name: info.table_name,
      is_cancelled: true,
      cancel_info: info,
      status: "cancelled",
      quantity: info.new_quantity || 0,
      created_at: new Date().toISOString(),
      toppings: [],
    }));

  const markCancelled = (items) =>
    items.map((item) => {
      const ci = cancelledItems[item.id];
      // I5 fix: Don't mark as cancelled if user dismissed it within TTL
      if (ci && !persistedDismissed[item.id]) return { ...item, is_cancelled: true, cancel_info: ci };
      return item;
    });

  const deletedItems = cancelledOnlyItems.filter((i) => i.cancel_info?.action === "deleted");
  const displayPending = [...markCancelled(pendingItems), ...deletedItems];
  const displayProcessing = [...markCancelled(processingItems)];

  const activeItems = activeTab === "pending" ? displayPending : displayProcessing;

  // I4 fix: Client-side timer cho đồng hồ "đã báo chế biến bao lâu"
  const [nowTick, setNowTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const getTimeDiff = (timeStr) => {
    if (!timeStr) return null;
    // SQLite datetime('now') lưu UTC không có đuôi múi giờ — phải coi là UTC,
    // nếu không trình duyệt sẽ hiểu nhầm là giờ địa phương và đếm sai.
    let ms;
    if (typeof timeStr === "string" && !timeStr.endsWith("Z") && !timeStr.includes("+")) {
      ms = new Date(timeStr.replace(" ", "T") + "Z").getTime();
    } else {
      ms = new Date(timeStr).getTime();
    }
    if (!Number.isFinite(ms)) return null;
    const diff = Math.floor((nowTick - ms) / 60000);
    if (diff < 1) return "Vừa xong";
    if (diff < 60) return `${diff} phút`;
    return `${Math.floor(diff / 60)}h${diff % 60}p`;
  };

  if (effectiveLoading) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400 text-sm">Đang tải...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={fetchOrders} className="px-4 py-2 bg-orange-600 rounded-lg text-sm font-bold">Thử lại</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${fill === "screen" ? "h-screen" : "h-full"} w-full bg-gray-900 text-white flex flex-col overflow-hidden font-sans`}>
      {/* Header */}
      <header className="px-4 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between shrink-0">
        <div className="flex items-center space-x-2">
          <div className={`p-1.5 rounded-lg ${isKitchen ? "bg-orange-500" : "bg-blue-500"}`}>
            <Icon name={isKitchen ? "chef-hat" : "coffee"} className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-gray-300 uppercase tracking-wide">
            {isKitchen ? "Bếp" : "Quầy"}
          </span>
          {!isOnline && (
            <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-black bg-yellow-600 text-yellow-100">OFFLINE</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-lg transition-colors ${soundEnabled ? "bg-green-600/20 text-green-400" : "bg-gray-700/50 text-gray-500"}`}
          >
            <Icon name={soundEnabled ? "volume-2" : "volume-x"} className="w-4 h-4" />
          </button>
          <button onClick={onLogout} className="p-1.5 rounded-lg bg-gray-700/50 text-gray-400 hover:text-white">
            <Icon name="log-out" className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Desktop: 2-column layout */}
      <div className="hidden md:flex flex-1 p-3 gap-3 overflow-hidden">
        {/* Pending Column */}
        <div className="flex-1 flex flex-col bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden">
          <div className="px-3 py-2 bg-orange-500/10 border-b border-orange-500/20 flex items-center justify-between">
            <h3 className="text-base font-black text-orange-400 tracking-tight flex items-center">
              <Icon name="clock" className="w-3.5 h-3.5 mr-1.5" /> ĐƠN MỚI
            </h3>
            <span className="bg-orange-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black">{pendingItems.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {displayPending.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-10">
                <Icon name="clock" className="w-9 h-9 mb-2" />
              </div>
            ) : (
              displayPending.map((item) => (
                <KitchenItemCard
                  key={item.id}
                  item={item}
                  onAction={() => updateItemStatus(item.id, "processing")}
                  actionLabel={itemActionLoading[`${item.id}:status`] ? "..." : "Nhận món"}
                  actionClass="bg-blue-600 hover:bg-blue-500"
                  timeDiff={getTimeDiff(item.created_at)}
                  onReduce={() => reduceItemQuantity(item)}
                  onCancel={() => cancelItem(item)}
                  onDismiss={dismissCancelled}
                  isLoading={!!itemActionLoading[`${item.id}:status`] || !!itemActionLoading[`${item.id}:reduce`] || !!itemActionLoading[`${item.id}:cancel`]}
                />
              ))
            )}
          </div>
        </div>

        {/* Processing Column */}
        <div className="flex-1 flex flex-col bg-gray-800/40 rounded-2xl border border-gray-700/50 overflow-hidden">
          <div className="px-3 py-2 bg-blue-500/10 border-b border-blue-500/20 flex items-center justify-between">
            <h3 className="text-base font-black text-blue-400 tracking-tight flex items-center">
              <Icon name="play" className="w-3.5 h-3.5 mr-1.5" /> ĐANG LÀM
            </h3>
            <span className="bg-blue-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black">{processingItems.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {displayProcessing.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-10">
                <Icon name="play" className="w-9 h-9 mb-2" />
              </div>
            ) : (
              displayProcessing.map((item) => (
                <KitchenItemCard
                  key={item.id}
                  item={item}
                  onAction={() => updateItemStatus(item.id, "completed")}
                  actionLabel={itemActionLoading[`${item.id}:status`] ? "..." : "Trả món"}
                  actionClass="bg-emerald-600 hover:bg-emerald-500"
                  timeDiff={getTimeDiff(item.created_at)}
                  onReduce={() => reduceItemQuantity(item)}
                  onCancel={() => cancelItem(item)}
                  onDismiss={dismissCancelled}
                  isLoading={!!itemActionLoading[`${item.id}:status`] || !!itemActionLoading[`${item.id}:reduce`] || !!itemActionLoading[`${item.id}:cancel`]}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Mobile: Tab-based single column */}
      <div className="flex flex-col flex-1 md:hidden overflow-hidden">
        <div className="shrink-0 bg-gray-800 border-b border-gray-700 px-2 py-1.5">
          <div className="flex gap-1.5">
            <button
              onClick={() => setActiveTab("pending")}
              className={`flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${
                activeTab === "pending" ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "bg-gray-700/50 text-gray-400"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Icon name="clock" className="w-3.5 h-3.5" /> Chờ ({pendingItems.length})
              </span>
            </button>
            <button
              onClick={() => setActiveTab("processing")}
              className={`flex-1 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${
                activeTab === "processing" ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" : "bg-gray-700/50 text-gray-400"
              }`}
            >
              <span className="flex items-center justify-center gap-1.5">
                <Icon name="play" className="w-3.5 h-3.5" /> Làm ({processingItems.length})
              </span>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {activeItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-20">
              <Icon name={activeTab === "pending" ? "clock" : "play"} className="w-14 h-14" />
              <p className="mt-3 text-sm font-medium text-gray-500">
                {activeTab === "pending" ? "Không có đơn mới" : "Không có món đang làm"}
              </p>
            </div>
          ) : (
            activeItems.map((item) => (
              <KitchenItemCard
                key={item.id}
                item={item}
                onAction={() => updateItemStatus(item.id, activeTab === "pending" ? "processing" : "completed")}
                actionLabel={itemActionLoading[`${item.id}:status`] ? "..." : activeTab === "pending" ? "Nhận món" : "Trả món"}
                actionClass={activeTab === "pending" ? "bg-blue-600 active:bg-blue-500" : "bg-emerald-600 active:bg-emerald-500"}
                timeDiff={getTimeDiff(item.created_at)}
                onReduce={() => reduceItemQuantity(item)}
                onCancel={() => cancelItem(item)}
                onDismiss={dismissCancelled}
                isLoading={!!itemActionLoading[`${item.id}:status`] || !!itemActionLoading[`${item.id}:reduce`] || !!itemActionLoading[`${item.id}:cancel`]}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function KitchenItemCard({ item, onAction, actionLabel, actionClass, timeDiff, onReduce, onCancel, onDismiss, isLoading }) {
  const isTakeaway = item.order_type === "takeaway";
  const isShip = item.order_type === "ship";
  const isSelfOrder = !!item.is_self_order;

  // Cancelled state
  if (item.is_cancelled && item.cancel_info) {
    const isDeleted = item.cancel_info.action === "deleted";
    const borderColor = isDeleted ? "border-red-500/60" : "border-orange-500/60";
    const bgColor = isDeleted ? "bg-red-950/40" : "bg-orange-950/30";
    const badgeBg = isDeleted ? "bg-red-600" : "bg-orange-600";
    const badgeText = isDeleted ? "ĐÃ HỦY" : "GIẢM SL";
    const btnClass = isDeleted ? "bg-red-700 hover:bg-red-600" : "bg-orange-700 hover:bg-orange-600";

    return (
      <div className={`${bgColor} rounded-2xl border-2 ${borderColor} shadow`}>
        <div className="p-2 flex items-stretch gap-2">
          <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-center">
            <div className="flex items-center gap-1.5">
              <h3 className="font-black text-sm uppercase truncate text-gray-400 line-through">{item.table_name}</h3>
              <span className={`${badgeBg} text-white text-[8px] font-bold px-1 py-0.5 rounded-full uppercase`}>{badgeText}</span>
              <span className="text-[10px] text-gray-500 font-bold italic ml-auto">{timeDiff}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <p className={`text-lg font-black leading-tight uppercase truncate ${isDeleted ? "text-red-400 line-through" : "text-orange-300"}`}>
                {item.product_name}
              </p>
              {item.size_name && <span className="text-purple-300/60 text-[10px] font-black uppercase line-through">"{item.size_name}"</span>}
              <div className="flex items-center gap-0.5 ml-auto">
                {!isDeleted && item.cancel_info.old_quantity !== undefined && (
                  <>
                    <span className="text-red-400 line-through text-sm font-black">{item.cancel_info.old_quantity}</span>
                    <Icon name="arrow-right" className="w-2.5 h-2.5 inline" />
                  </>
                )}
                <span className="text-gray-500 font-bold text-[10px]">x</span>
                <span className={`text-sm font-black ${isDeleted ? "text-red-500 line-through" : "text-orange-400"}`}>
                  {isDeleted ? item.cancel_info.old_quantity : item.cancel_info.new_quantity}
                </span>
              </div>
            </div>
            {item.toppings?.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-0.5">
                {item.toppings.map((t, idx) => (
                  <span key={idx} className="bg-gray-700/50 text-gray-500 text-[9px] font-bold px-1.5 py-0.5 rounded-lg border border-gray-600/50 line-through">
                    <span className="mr-0.5 opacity-50">+</span>{t}
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={() => onDismiss(item.id)} className={`shrink-0 px-2 py-1 rounded-lg text-white font-bold text-[10px] uppercase tracking-wide transition-all active:scale-95 ${btnClass}`}>
            Đã biết
          </button>
        </div>
      </div>
    );
  }

  // Normal card
  const cardBorder = isShip ? "border-blue-500/50" : isTakeaway ? "border-orange-500/50" : "border-gray-700";
  const cardBg = isShip ? "bg-blue-900/20" : isTakeaway ? "bg-orange-900/20" : "bg-gray-800";
  const badgeBg = isShip ? "bg-blue-500" : isTakeaway ? "bg-orange-500" : "bg-primary-500";

  return (
    <div className={`${cardBg} rounded-2xl border ${cardBorder} shadow`}>
      <div className="p-2 flex items-stretch gap-2">
        <div className="flex-1 min-w-0 flex flex-col gap-0.5 justify-center">
          <div className="flex items-center gap-1.5">
            <h3 className={`font-black text-sm uppercase truncate ${isShip ? "text-blue-400" : isTakeaway ? "text-orange-400" : "text-primary-400"}`}>
              {item.table_name}
            </h3>
            {isSelfOrder && (
              <span className="w-4 h-4 rounded-full bg-cyan-600 text-white flex items-center justify-center shrink-0" title="Khách tự order">
                <Icon name="user" className="w-2 h-2" />
              </span>
            )}
            {(isTakeaway || isShip) && (
              <span className={`${badgeBg} text-white text-[8px] font-bold px-1 py-0.5 rounded-full uppercase flex items-center gap-0.5`}>
                <Icon name={isShip ? "truck" : "package"} className="w-2 h-2" />
                {isShip ? "SHIP" : "MV"}
              </span>
            )}
            <div className="flex items-center gap-1">
              <button onClick={onReduce} disabled={isLoading} className="w-5 h-5 rounded-md bg-amber-600 hover:bg-amber-500 text-white transition-all disabled:opacity-60 flex items-center justify-center" title="Giảm 1">
                <Icon name="minus" className="w-2.5 h-2.5" />
              </button>
              <button onClick={onCancel} disabled={isLoading} className="w-5 h-5 rounded-md bg-red-600 hover:bg-red-500 text-white transition-all disabled:opacity-60 flex items-center justify-center" title="Hủy món">
                <Icon name="trash-2" className="w-2.5 h-2.5" />
              </button>
            </div>
            <span className="text-[10px] text-gray-400 font-bold italic ml-auto">{timeDiff}</span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xl font-black leading-tight text-white uppercase truncate">{item.product_name}</p>
            {item.size_name && <span className="text-purple-300 text-sm font-bold uppercase">— Size: {item.size_name}</span>}
            <div className="flex items-center gap-1.5 ml-auto mr-2">
              <span className="text-gray-300 font-black text-xl">x</span>
              <span className={`text-4xl font-black text-primary-400 leading-none ${item.quantity > 1 ? "scale-110" : ""}`}>{item.quantity}</span>
              {item.quantity > 1 && <Icon name="star" className="w-2 h-2 text-yellow-400 fill-yellow-400" />}
            </div>
          </div>
          {item.toppings?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {item.toppings.map((t, idx) => (
                <span key={idx} className="bg-emerald-600/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-lg border border-emerald-500/50">
                  <span className="mr-0.5 opacity-70">+</span>{t}
                </span>
              ))}
            </div>
          )}
          {item.notes && (
            <div className="p-1.5 mt-0.5 bg-orange-500/10 border-l-2 border-orange-500 rounded-r-lg">
              <p className="text-[10px] text-orange-400 font-bold italic leading-tight">Ghi chú: {item.notes}</p>
            </div>
          )}
        </div>
        <button
          onClick={onAction}
          disabled={isLoading}
          className={`shrink-0 px-2 py-1 rounded-lg text-white font-bold text-[10px] uppercase tracking-wide transition-all active:scale-95 disabled:opacity-60 ${actionClass}`}
        >
          {actionLabel}
        </button>
      </div>
    </div>
  );
}

// ============ Takeaway: Self-order View ============

const TAKEAWAY_CLIENT_KEY = "takeaway_client_id";
const TAKEAWAY_NAME_KEY = "takeaway_customer_name";
const TAKEAWAY_POLL_MS = 3000;

function TakeawayMenuView() {
  const [storeName, setStoreName] = useState("Đang tải...");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [activeView, setActiveView] = useState("menu");
  const [myItems, setMyItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedProductForSize, setSelectedProductForSize] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItemTempId, setEditItemTempId] = useState(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [itemActionsLoading, setItemActionsLoading] = useState({});

  // Customer identity
  const [clientId, setClientId] = useState(() => {
    try { return localStorage.getItem(TAKEAWAY_CLIENT_KEY) || ""; } catch { return ""; }
  });
  const [customerName, setCustomerName] = useState(() => {
    try { return localStorage.getItem(TAKEAWAY_NAME_KEY) || ""; } catch { return ""; }
  });
  const [showNameGate, setShowNameGate] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [showEditName, setShowEditName] = useState(false);
  const [editNameInput, setEditNameInput] = useState("");

  // Persist client id
  useEffect(() => {
    if (!clientId) {
      const newId = crypto.randomUUID ? crypto.randomUUID() : "client_" + Math.random().toString(36).slice(2);
      try { localStorage.setItem(TAKEAWAY_CLIENT_KEY, newId); } catch {}
      setClientId(newId);
    }
  }, [clientId]);

  // Show name gate on first visit
  useEffect(() => {
    if (clientId && !customerName) setShowNameGate(true);
  }, [clientId, customerName]);

  const addToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message: msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  };

  // Fetch menu
  useEffect(() => {
    if (!clientId) return;
    (async () => {
      try {
        const r = await fetch(`/api/public/takeaway/menu?_=${Date.now()}`);
        if (!r.ok) throw new Error("Không thể tải menu");
        const data = await r.json();
        document.title = (data.store?.name || "Mang về") + " - Đặt món";
        setStoreName(data.store?.name || "POS Demo");
        const prods = (data.products || []).filter((p) => !p.is_topping);
        const tops = (data.products || []).filter((p) => p.is_topping);
        setCategories(data.categories || []);
        setProducts(prods);
        setToppings(tops);
        setLoading(false);
      } catch (err) {
        setError(err.message || "Không thể tải menu");
        setLoading(false);
      }
    })();
  }, [clientId]);

  // Poll items when in myorder view — fetch immediately on switch
  useEffect(() => {
    if (activeView !== "myorder" || !clientId) return;
    let cancelled = false;
    const poll = async () => {
      setItemsLoading(true);
      try {
        const r = await fetch(`/api/public/takeaway/items/${encodeURIComponent(clientId)}?_=${Date.now()}`);
        if (!r.ok || cancelled) return;
        const data = await r.json();
        setMyItems(Array.isArray(data) ? data : []);
      } catch (err) { /* ignore */ }
      finally { if (!cancelled) setItemsLoading(false); }
    };
    poll(); // immediate on first render
    const interval = setInterval(poll, TAKEAWAY_POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeView, clientId]);

  const filtered = useMemo(() => {
    let list = products;
    if (searchQuery.trim()) {
      const q = removeAccents(searchQuery.toLowerCase().trim());
      list = list.filter((p) => removeAccents(p.name.toLowerCase()).includes(q));
    } else if (selectedCategory !== null) {
      list = list.filter((p) => p.category_id === selectedCategory);
    }
    return list;
  }, [products, selectedCategory, searchQuery]);

  // Cart helpers
  const addToCart = (product, size) => {
    if (product.sizes && product.sizes.length > 0 && !size) {
      setSelectedProductForSize(product);
      setShowSizeModal(true);
      return;
    }
    const existing = cart.findIndex((item) =>
      item.product.id === product.id &&
      item.toppings.length === 0 &&
      ((!item.size && !size) || (item.size && size && item.size.id === size.id)) &&
      !item.notes
    );
    const itemPrice = size ? size.price : product.price;
    const productWithPrice = { ...product, price: itemPrice };
    if (existing >= 0) {
      setCart(cart.map((it, i) => i === existing ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setCart([...cart, { tempId: genToken(), product: productWithPrice, size: size || null, quantity: 1, toppings: [], notes: "" }]);
    }
    addToast(`Đã thêm ${product.name}`);
  };

  const updateQty = (tempId, delta) => {
    setCart(cart.map((it) => it.tempId === tempId ? { ...it, quantity: it.quantity + delta } : it).filter((it) => it.quantity > 0));
  };

  const toggleTopping = (tempId, topping) => {
    setCart(cart.map((it) => {
      if (it.tempId !== tempId) return it;
      const idx = it.toppings.findIndex((t) => t.id === topping.id);
      const newToppings = idx >= 0 ? it.toppings.filter((_, i) => i !== idx) : [...it.toppings, topping];
      return { ...it, toppings: newToppings };
    }));
  };

  const updateNotes = (tempId, notes) => {
    setCart(cart.map((it) => it.tempId === tempId ? { ...it, notes: notes || "" } : it));
  };

  const removeItem = (tempId) => {
    setCart(cart.filter((it) => it.tempId !== tempId));
  };

  const confirmSize = (size) => {
    if (!selectedProductForSize) return;
    addToCart(selectedProductForSize, size);
    setShowSizeModal(false);
    setSelectedProductForSize(null);
  };

  const cartTotal = cart.reduce((sum, it) => {
    const productTotal = it.product.price * it.quantity;
    const toppingTotal = it.toppings.reduce((s, t) => s + t.price, 0) * it.quantity;
    return sum + productTotal + toppingTotal;
  }, 0);

  const submitOrder = async () => {
    if (cart.length === 0) { addToast("Vui lòng chọn ít nhất 1 món"); return; }
    setIsOrdering(true);
    try {
      const res = await fetch("/api/public/takeaway/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          customer_name: customerName,
          items: cart.map((it) => ({
            product_id: it.product.id, quantity: it.quantity,
            toppings: it.toppings.map((t) => t.id),
            size_id: it.size?.id, notes: it.notes || "",
          })),
        }),
      });
      if (!res.ok) {
        let data; try { data = await res.json(); } catch { data = {}; }
        addToast(data.message || "Lỗi gửi đơn");
        setIsOrdering(false);
        return;
      }
      // Success: clear cart and switch to myorder immediately
      setCart([]); setOrderSuccess(true); setIsOrdering(false);
      setShowCartModal(false); setActiveView("myorder");
      // Clear success badge after 2s
      setTimeout(() => setOrderSuccess(false), 2000);
    } catch (err) {
      setIsOrdering(false);
      addToast("Mạng không ổn định, vui lòng thử lại.");
    }
  };

  const handleNameSubmit = () => {
    const name = nameInput.trim();
    if (!name) return;
    try { localStorage.setItem(TAKEAWAY_NAME_KEY, name); } catch {}
    setCustomerName(name);
    setShowNameGate(false);
    setNameInput("");
  };

  const handleEditNameSubmit = () => {
    const name = editNameInput.trim();
    if (!name) return;
    try { localStorage.setItem(TAKEAWAY_NAME_KEY, name); } catch {}
    setCustomerName(name);
    setShowEditName(false);
    setEditNameInput("");
  };

  const isItemActionLoading = (itemId, action) => Boolean(itemActionsLoading[`${action}_${itemId}`]);
  const runItemAction = async (itemId, action, fn) => {
    const key = `${action}_${itemId}`;
    if (itemActionsLoading[key]) return;
    setItemActionsLoading((prev) => ({ ...prev, [key]: true }));
    try { await fn(); } finally { setItemActionsLoading((prev) => ({ ...prev, [key]: false })); }
  };

  const deleteItem = async (orderId, itemId) => {
    if (!confirm("Bạn có chắc muốn hủy món này?")) return;
    await runItemAction(itemId, "delete", async () => {
      try {
        await fetch(
          `/api/public/takeaway/orders/${orderId}/items/${itemId}?client_id=${encodeURIComponent(clientId)}`,
          { method: "DELETE" }
        );
        const r = await fetch(`/api/public/takeaway/items/${encodeURIComponent(clientId)}`);
        if (r.ok) setMyItems(await r.json());
      } catch (err) { addToast("Lỗi xóa món"); }
    });
  };

  const reduceQty = async (orderId, itemId, currentQty) => {
    await runItemAction(itemId, "reduce", async () => {
      try {
        if (currentQty <= 1) {
          if (!confirm("Bạn có chắc muốn hủy món này?")) return;
          await fetch(
            `/api/public/takeaway/orders/${orderId}/items/${itemId}?client_id=${encodeURIComponent(clientId)}`,
            { method: "DELETE" }
          );
        } else {
          await fetch(
            `/api/public/takeaway/orders/${orderId}/items/${itemId}?client_id=${encodeURIComponent(clientId)}`,
            { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: currentQty - 1 }) }
          );
        }
        const r = await fetch(`/api/public/takeaway/items/${encodeURIComponent(clientId)}`);
        if (r.ok) setMyItems(await r.json());
      } catch (err) { addToast("Lỗi cập nhật"); }
    });
  };

  const editItem = cart.find((it) => it.tempId === editItemTempId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto" />
          <p className="mt-4 text-gray-600 font-bold">Đang tải menu...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="mb-4 text-red-400"><Icon name="x-circle" className="w-16 h-16 mx-auto" /></div>
          <h2 className="text-xl font-black text-gray-800 mb-2">{error}</h2>
          <p className="text-gray-500">Vui lòng thử lại</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
      <style>{`
        @keyframes pulse-ring {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-10deg); }
          75% { transform: rotate(10deg); }
        }
        .animate-wiggle { animation: wiggle 0.5s ease-in-out; }
      `}</style>

      {/* Name Gate Modal */}
      {showNameGate && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"></div>
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-gray-50">
              <h3 className="text-lg font-black text-gray-800 text-center uppercase tracking-tight">Chào mừng!</h3>
              <p className="text-xs text-gray-500 text-center font-bold mt-1">Vui lòng nhập tên của bạn để đặt món</p>
            </div>
            <div className="p-6 space-y-4">
              <input type="text" placeholder="Nhập tên của bạn..." value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNameSubmit()}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
                autoFocus />
              <button onClick={handleNameSubmit} disabled={!nameInput.trim()}
                className="w-full py-4 bg-primary-600 text-white rounded-xl font-black text-base hover:bg-primary-700 transition disabled:opacity-50">
                Bắt đầu đặt món
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Name Modal */}
      {showEditName && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowEditName(false)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-gray-50">
              <h3 className="text-lg font-black text-gray-800 text-center uppercase tracking-tight">Đổi tên</h3>
            </div>
            <div className="p-6 space-y-4">
              <input type="text" placeholder="Nhập tên mới..." value={editNameInput}
                onChange={(e) => setEditNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditNameSubmit()}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-400"
                autoFocus />
              <button onClick={handleEditNameSubmit} disabled={!editNameInput.trim()}
                className="w-full py-4 bg-primary-600 text-white rounded-xl font-black text-base hover:bg-primary-700 transition disabled:opacity-50">
                Xác nhận
              </button>
              <button onClick={() => setShowEditName(false)}
                className="w-full py-3 bg-white border text-gray-600 font-bold rounded-xl uppercase hover:bg-gray-100 transition">
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-primary-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <p className="text-primary-100 font-bold">Đơn mang về</p>
            <button onClick={() => { setEditNameInput(customerName); setShowEditName(true); }}
              className="flex items-center space-x-1 text-primary-100 hover:text-white transition">
              <span className="text-sm font-bold">{customerName || "Khách"}</span>
              <Icon name="pencil" className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="relative mt-3">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60"><Icon name="search" className="w-4 h-4" /></span>
            <input type="text" placeholder="Tìm kiếm món..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2 rounded-full bg-white/20 text-white placeholder-white/60 text-sm focus:outline-none focus:ring-2 focus:ring-white/50" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white">
                <Icon name="x" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-[72px] bg-white border-b z-10">
        <div className="max-w-4xl mx-auto flex">
          <button onClick={() => setActiveView("menu")}
            className={`flex-1 py-3 font-black text-sm transition ${activeView === "menu" ? "text-primary-600 border-b-2 border-primary-600" : "text-gray-500"}`}>
            MENU
          </button>
          <button onClick={() => setActiveView("myorder")}
            className={`flex-1 py-3 font-black text-sm transition flex items-center justify-center space-x-2 ${activeView === "myorder" ? "text-primary-600 border-b-2 border-primary-600" : "text-gray-500"}`}>
            <Icon name="clipboard-list" className="w-4 h-4" />
            <span>MÓN ĐÃ CHỌN</span>
          </button>
        </div>
      </div>

      {/* Categories */}
      {activeView === "menu" && (
        <div className="sticky top-[120px] bg-white border-b z-10">
          <div className="max-w-4xl mx-auto flex flex-wrap gap-2 p-3">
            <button onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full font-bold text-xs transition ${selectedCategory === null ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700"}`}>
              Tat ca
            </button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-bold text-xs transition ${selectedCategory === cat.id ? "bg-primary-600 text-white" : "bg-gray-100 text-gray-700"}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid */}
      {activeView === "menu" && (
        <div className="max-w-4xl mx-auto p-3">
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {filtered.map((product) => (
              <div key={product.id} onClick={() => addToCart(product)}
                className="bg-white rounded-lg shadow-sm overflow-hidden cursor-pointer active:scale-95 transition-transform">
                <div className="relative w-full pb-[100%] bg-gray-50">
                  {product.image_url ? (
                    <OptimizedImg src={product.image_url} alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 w-full h-full bg-gray-100 flex items-center justify-center">
                      <span className="text-gray-400"><Icon name="utensils" className="w-8 h-8" /></span>
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <h3 className="font-bold text-xs text-gray-800 line-clamp-2 leading-tight">{product.name}</h3>
                  <p className="text-primary-600 font-black text-sm mt-1">
                    {product.sizes && product.sizes.length > 0
                      ? "Từ " + Math.min(...product.sizes.map((s) => s.price)).toLocaleString()
                      : product.price.toLocaleString()}đ
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Items View */}
      {activeView === "myorder" && (
        <div className="max-w-4xl mx-auto p-4">
          {itemsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 font-bold">Đang tải...</p>
            </div>
          ) : myItems.length === 0 ? (
            <div className="text-center py-12">
              <Icon name="clipboard-list" className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 font-bold">Chưa có món nào</p>
              <p className="text-gray-400 text-sm mt-2">Món đã chọn sẽ hiện ở đây</p>
            </div>
          ) : (
            <div className="space-y-3">
              {myItems.map((item) => (
                <div key={item.id} className="bg-white rounded-xl shadow-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {item.status === "pending" && (
                        <button onClick={() => reduceQty(item.order_id, item.id, item.quantity)}
                          disabled={isItemActionLoading(item.id, "reduce") || isItemActionLoading(item.id, "delete")}
                          className="px-2 py-1 bg-red-100 text-red-700 text-xs font-black rounded hover:bg-red-200 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                          -
                        </button>
                      )}
                      <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-black rounded">
                        {item.quantity}x
                      </span>
                      <div className="flex flex-col">
                        <h3 className="font-black text-gray-800">{item.name}</h3>
                        {item.size_name && <span className="text-xs text-primary-600 font-bold">Size: {item.size_name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {item.status === "pending" && (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full flex items-center space-x-1">
                          <Icon name="clock" className="w-3 h-3" />
                          <span>Chờ xử lý</span>
                        </span>
                      )}
                      {item.status === "processing" && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full flex items-center space-x-1">
                          <Icon name="chef-hat" className="w-3 h-3" />
                          <span>Đang làm</span>
                        </span>
                      )}
                      {item.status === "completed" && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center space-x-1">
                          <Icon name="check-circle" className="w-3 h-3" />
                          <span>Đã phục vụ</span>
                        </span>
                      )}
                      {item.status === "pending" && (
                        <button onClick={() => deleteItem(item.order_id, item.id)}
                          disabled={isItemActionLoading(item.id, "delete") || isItemActionLoading(item.id, "reduce")}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                          <Icon name="trash-2" className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {item.toppings && item.toppings.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.toppings.map((topping, idx) => (
                        <span key={`${item.id}_${idx}`} className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded">
                          +{topping}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.notes && (
                    <div className="mt-2 p-2 bg-yellow-50 border-l-2 border-yellow-400 rounded-r">
                      <p className="text-xs text-yellow-700 font-medium flex items-start">
                        <Icon name="message-square" className="w-3 h-3 mr-1 flex-shrink-0 mt-0.5" />
                        <span>{item.notes}</span>
                      </p>
                    </div>
                  )}
                </div>
              ))}

              <div className="sticky bottom-0 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl shadow-2xl p-6 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-primary-100 font-bold uppercase tracking-wide">Tổng cộng</p>
                    <p className="text-sm text-primary-200 mt-1">{myItems.length} món</p>
                  </div>
                  <div className="text-right">
                    <p className="text-4xl font-black text-white">
                      {myItems.reduce((total, item) => total + (item.price * item.quantity), 0).toLocaleString()}đ
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cart Button */}
      {cart.length > 0 && (
        <button onClick={() => setShowCartModal(true)}
          className="fixed bottom-4 right-4 bg-primary-600 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 font-black z-20"
          style={{ boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)", animation: "pulse-ring 1.5s ease-out infinite" }}>
          <Icon name="shopping-cart" className="w-6 h-6 animate-wiggle" />
          <div className="flex flex-col items-start">
            <span className="text-xs text-primary-200">{cart.length} món</span>
            <span className="text-sm">{cartTotal.toLocaleString()}đ</span>
          </div>
        </button>
      )}

      {/* Reuse shared modals */}
      {showCartModal && (
        <CartModal cart={cart} total={cartTotal} onClose={() => setShowCartModal(false)}
          onUpdateQty={updateQty} onEdit={(tempId) => { setEditItemTempId(tempId); setShowEditModal(true); }}
          onRemove={removeItem}
          onSubmit={submitOrder} isOrdering={isOrdering} orderSuccess={orderSuccess}
        />
      )}
      {showSizeModal && (
        <SizeModal product={selectedProductForSize} onConfirm={confirmSize} onClose={() => { setShowSizeModal(false); setSelectedProductForSize(null); }} />
      )}
      {showEditModal && editItem && (
        <EditItemModal item={editItem} toppings={toppings} categories={categories}
          onClose={() => { setShowEditModal(false); setEditItemTempId(null); }}
          onToggleTopping={(t) => toggleTopping(editItem.tempId, t)}
          onUpdateNotes={(notes) => updateNotes(editItem.tempId, notes)}
        />
      )}

      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((t) => (
            <div key={t.id} className="bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-slide-in-right">{t.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Ship: Delivery Self-order View ============

const SHIP_CLIENT_KEY = "ship_client_id";
const SHIP_NAME_KEY = "ship_customer_name";
const SHIP_PHONE_KEY = "ship_customer_phone";
const SHIP_ADDRESS_KEY = "ship_address";
const SHIP_LAT_KEY = "ship_latitude";
const SHIP_LNG_KEY = "ship_longitude";
const SHIP_POLL_MS = 3000;
const SHIP_POLL_INITIAL_DELAY = 0;

function ShipMenuView() {
  const [storeName, setStoreName] = useState("Đang tải...");
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [toppings, setToppings] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [activeView, setActiveView] = useState("menu");
  const [myItems, setMyItems] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showSizeModal, setShowSizeModal] = useState(false);
  const [selectedProductForSize, setSelectedProductForSize] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItemTempId, setEditItemTempId] = useState(null);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [itemActionsLoading, setItemActionsLoading] = useState({});
  const [lastOrderCode, setLastOrderCode] = useState("");

  // Ship enabled state
  const [shipEnabled, setShipEnabled] = useState(true);
  const [shipEnabledChecked, setShipEnabledChecked] = useState(false);
  const [shipDisableMessage, setShipDisableMessage] = useState(null);
  const isShipBlocked = shipEnabledChecked && !shipEnabled;

  // Customer identity + ship info
  const [clientId, setClientId] = useState(() => {
    try { return localStorage.getItem(SHIP_CLIENT_KEY) || ""; } catch { return ""; }
  });
  const [customerName, setCustomerName] = useState(() => {
    try { return localStorage.getItem(SHIP_NAME_KEY) || ""; } catch { return ""; }
  });
  const [customerPhone, setCustomerPhone] = useState(() => {
    try { return localStorage.getItem(SHIP_PHONE_KEY) || ""; } catch { return ""; }
  });
  const [shipAddress, setShipAddress] = useState(() => {
    try { return localStorage.getItem(SHIP_ADDRESS_KEY) || ""; } catch { return ""; }
  });
  const [shipNotes, setShipNotes] = useState("");

  // GPS location state
  const [latitude, setLatitude] = useState(() => {
    try { const v = localStorage.getItem(SHIP_LAT_KEY); return v ? parseFloat(v) : null; } catch { return null; }
  });
  const [longitude, setLongitude] = useState(() => {
    try { const v = localStorage.getItem(SHIP_LNG_KEY); return v ? parseFloat(v) : null; } catch { return null; }
  });
  const [modalLocationLoading, setModalLocationLoading] = useState(false);
  const [modalLocationError, setModalLocationError] = useState("");

  // Info modal state
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [addressInput, setAddressInput] = useState("");

  // Edit ship info in cart modal
  const [editingShipInfo, setEditingShipInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAddress, setEditAddress] = useState("");

  // Persist client id
  useEffect(() => {
    if (!clientId) {
      const newId = crypto.randomUUID ? crypto.randomUUID() : "client_" + Math.random().toString(36).slice(2);
      try { localStorage.setItem(SHIP_CLIENT_KEY, newId); } catch {}
      setClientId(newId);
    }
  }, [clientId]);

  // Info modal now only opens when user clicks "Xác nhận đặt đơn" with incomplete info

  // Check ship_enabled
  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(data => {
      setShipEnabled(data.ship_enabled !== false);
      setShipDisableMessage(data.ship_disable_message || null);
      setShipEnabledChecked(true);
    }).catch(() => {
      setShipEnabledChecked(true); // fail-open
    });
  }, []);

  const addToast = (msg) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message: msg }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  };

  // Fetch menu
  useEffect(() => {
    if (!clientId) return;
    (async () => {
      try {
        const r = await fetch(`/api/public/ship/menu?_=${Date.now()}`);
        if (!r.ok) throw new Error("Không thể tải menu");
        const data = await r.json();
        document.title = (data.store?.name || "Giao hàng") + " - Đặt món";
        setStoreName(data.store?.name || "POS Demo");
        const prods = (data.products || []).filter((p) => !p.is_topping);
        const tops = (data.products || []).filter((p) => p.is_topping);
        setCategories(data.categories || []);
        setProducts(prods);
        setToppings(tops);
        setLoading(false);
      } catch (err) {
        setError(err.message || "Không thể tải menu");
        setLoading(false);
      }
    })();
  }, [clientId]);

  // Poll items when in myorder view
  useEffect(() => {
    if (activeView !== "myorder" || !clientId) return;
    let cancelled = false;
    const poll = async () => {
      setItemsLoading(true);
      try {
        const r = await fetch(`/api/public/ship/items/${encodeURIComponent(clientId)}?_=${Date.now()}`);
        if (!r.ok || cancelled) return;
        const data = await r.json();
        setMyItems(Array.isArray(data) ? data : []);
      } catch (err) { /* ignore */ }
      finally { if (!cancelled) setItemsLoading(false); }
    };
    poll();
    const interval = setInterval(poll, SHIP_POLL_MS);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeView, clientId]);

  const filtered = useMemo(() => {
    let list = products;
    if (searchQuery.trim()) {
      const q = removeAccents(searchQuery.toLowerCase().trim());
      list = list.filter((p) => removeAccents(p.name.toLowerCase()).includes(q));
    } else if (selectedCategory !== null) {
      list = list.filter((p) => p.category_id === selectedCategory);
    }
    return list;
  }, [products, selectedCategory, searchQuery]);

  // Cart helpers
  const addToCart = (product, size) => {
    if (product.sizes && product.sizes.length > 0 && !size) {
      setSelectedProductForSize(product);
      setShowSizeModal(true);
      return;
    }
    const existing = cart.findIndex((item) =>
      item.product.id === product.id &&
      item.toppings.length === 0 &&
      ((!item.size && !size) || (item.size && size && item.size.id === size.id)) &&
      !item.notes
    );
    const itemPrice = size ? size.price : product.price;
    const productWithPrice = { ...product, price: itemPrice };
    if (existing >= 0) {
      setCart(cart.map((it, i) => i === existing ? { ...it, quantity: it.quantity + 1 } : it));
    } else {
      setCart([...cart, { tempId: genToken(), product: productWithPrice, size: size || null, quantity: 1, toppings: [], notes: "" }]);
    }
    addToast(`Đã thêm ${product.name}`);
  };

  const updateQty = (tempId, delta) => {
    setCart(cart.map((it) => it.tempId === tempId ? { ...it, quantity: it.quantity + delta } : it).filter((it) => it.quantity > 0));
  };

  const toggleTopping = (tempId, topping) => {
    setCart(cart.map((it) => {
      if (it.tempId !== tempId) return it;
      const idx = it.toppings.findIndex((t) => t.id === topping.id);
      const newToppings = idx >= 0 ? it.toppings.filter((_, i) => i !== idx) : [...it.toppings, topping];
      return { ...it, toppings: newToppings };
    }));
  };

  const updateNotes = (tempId, notes) => {
    setCart(cart.map((it) => it.tempId === tempId ? { ...it, notes: notes || "" } : it));
  };

  const removeItem = (tempId) => {
    setCart(cart.filter((it) => it.tempId !== tempId));
  };

  const confirmSize = (size) => {
    if (!selectedProductForSize) return;
    addToCart(selectedProductForSize, size);
    setShowSizeModal(false);
    setSelectedProductForSize(null);
  };

  const cartTotal = cart.reduce((sum, it) => {
    const productTotal = it.product.price * it.quantity;
    const toppingTotal = it.toppings.reduce((s, t) => s + t.price, 0) * it.quantity;
    return sum + productTotal + toppingTotal;
  }, 0);

  const handleInfoSubmit = () => {
    const name = nameInput.trim();
    const phone = phoneInput.trim();
    const address = addressInput.trim();
    if (!name) { addToast("Vui lòng nhập họ tên"); return; }
    if (!phone || !/^[0-9]{10,11}$/.test(phone.replace(/\s/g, ""))) { addToast("Số điện thoại không hợp lệ (10-11 số)"); return; }
    if (!address) { addToast("Vui lòng nhập địa chỉ giao hàng"); return; }
    if (!latitude || !longitude) {
      addToast("Chưa lấy được định vị GPS. Vui lòng bật GPS và thử lại.");
      getLocationForModal();
      return;
    }
    try {
      localStorage.setItem(SHIP_NAME_KEY, name);
      localStorage.setItem(SHIP_PHONE_KEY, phone);
      localStorage.setItem(SHIP_ADDRESS_KEY, address);
    } catch {}
    setCustomerName(name);
    setCustomerPhone(phone);
    setShipAddress(address);
    setShowInfoModal(false);
    // Auto-submit order after closing modal
    setTimeout(() => {
      submitOrderInternal();
    }, 150);
  };

  // GPS location — auto-trigger when info modal opens
  const getLocationForModal = () => {
    if (!navigator.geolocation) { setModalLocationError("Trình duyệt không hỗ trợ định vị"); return; }
    setModalLocationLoading(true); setModalLocationError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude, lng = pos.coords.longitude;
        setLatitude(lat); setLongitude(lng); setModalLocationLoading(false);
        setModalLocationError("Đã lấy tọa độ: " + lat.toFixed(6) + ", " + lng.toFixed(6));
        try { localStorage.setItem(SHIP_LAT_KEY, lat.toString()); localStorage.setItem(SHIP_LNG_KEY, lng.toString()); } catch {}
      },
      () => { setModalLocationError("Không thể lấy vị trí. Vui lòng nhập địa chỉ."); setModalLocationLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Submit order: validate info + GPS first, then submit
  const submitOrder = async () => {
    if (cart.length === 0) { addToast("Vui lòng chọn ít nhất 1 món"); return; }
    // Check if info is complete + GPS available
    if (!customerName || !customerPhone || !shipAddress || !latitude || !longitude) {
      setNameInput(customerName || "");
      setPhoneInput(customerPhone || "");
      setAddressInput(shipAddress || "");
      setShowInfoModal(true);
      // Auto-trigger GPS
      setTimeout(() => getLocationForModal(), 100);
      return;
    }
    await submitOrderInternal();
  };

  // Internal: actually submit order (assumes info + GPS already validated)
  const submitOrderInternal = async () => {
    setIsOrdering(true);
    try {
      const res = await fetch("/api/public/ship/orders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          customer_name: customerName,
          customer_phone: customerPhone,
          ship_address: shipAddress,
          latitude: latitude,
          longitude: longitude,
          ship_notes: shipNotes,
          items: cart.map((it) => ({
            product_id: it.product.id, quantity: it.quantity,
            toppings: it.toppings.map((t) => t.id),
            size_id: it.size?.id, notes: it.notes || "",
          })),
        }),
      });
      if (!res.ok) {
        let data; try { data = await res.json(); } catch { data = {}; }
        addToast(data.message || "Lỗi gửi đơn");
        setIsOrdering(false);
        return;
      }
      let resultData; try { resultData = await res.json(); } catch { resultData = {}; }
      setLastOrderCode(resultData.display_code || "");
      setOrderSuccess(true);
      setIsOrdering(false);
      // Don't auto-close — show 2 buttons for user to choose
    } catch (err) {
      setIsOrdering(false);
      addToast("Mạng không ổn định, vui lòng thử lại.");
    }
  };

  const handleViewMyOrder = () => {
    setCart([]); setOrderSuccess(false);
    setShowCartModal(false); setActiveView("myorder");
  };

  const handleAddMore = () => {
    setCart([]); setOrderSuccess(false);
    setShowCartModal(false); setActiveView("menu");
  };

  const isItemActionLoading = (itemId, action) => Boolean(itemActionsLoading[`${action}_${itemId}`]);
  const runItemAction = async (itemId, action, fn) => {
    const key = `${action}_${itemId}`;
    if (itemActionsLoading[key]) return;
    setItemActionsLoading((prev) => ({ ...prev, [key]: true }));
    try { await fn(); } finally { setItemActionsLoading((prev) => ({ ...prev, [key]: false })); }
  };

  const deleteItem = async (orderId, itemId) => {
    if (!confirm("Bạn có chắc muốn hủy món này?")) return;
    await runItemAction(itemId, "delete", async () => {
      try {
        await fetch(
          `/api/public/ship/orders/${orderId}/items/${itemId}?client_id=${encodeURIComponent(clientId)}`,
          { method: "DELETE" }
        );
        const r = await fetch(`/api/public/ship/items/${encodeURIComponent(clientId)}`);
        if (r.ok) setMyItems(await r.json());
      } catch (err) { addToast("Lỗi xóa món"); }
    });
  };

  const reduceQty = async (orderId, itemId, currentQty) => {
    await runItemAction(itemId, "reduce", async () => {
      try {
        if (currentQty <= 1) {
          if (!confirm("Bạn có chắc muốn hủy món này?")) return;
          await fetch(
            `/api/public/ship/orders/${orderId}/items/${itemId}?client_id=${encodeURIComponent(clientId)}`,
            { method: "DELETE" }
          );
        } else {
          await fetch(
            `/api/public/ship/orders/${orderId}/items/${itemId}?client_id=${encodeURIComponent(clientId)}`,
            { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: currentQty - 1 }) }
          );
        }
        const r = await fetch(`/api/public/ship/items/${encodeURIComponent(clientId)}`);
        if (r.ok) setMyItems(await r.json());
      } catch (err) { addToast("Lỗi cập nhật"); }
    });
  };

  const editItem = cart.find((it) => it.tempId === editItemTempId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto" />
          <p className="mt-4 text-gray-600 font-bold">Đang tải menu...</p>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
          <div className="mb-4 text-red-400"><Icon name="x-circle" className="w-16 h-16 mx-auto" /></div>
          <h2 className="text-xl font-black text-gray-800 mb-2">{error}</h2>
          <p className="text-gray-500">Vui lòng thử lại</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24 font-sans text-gray-900">
      {/* Ship Info Modal - Required on first visit */}
      {showInfoModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-orange-700/60"></div>
          <div className="relative bg-white w-full max-w-md rounded-lg border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <h3 className="text-base font-semibold text-orange-800">Xác nhận thông tin giao hàng</h3>
              <p className="text-xs text-gray-500 mt-1">Nhập đầy đủ thông tin và cho phép định vị để đặt món</p>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-orange-800 mb-1.5">Họ và tên</label>
                <input type="text" placeholder="Nguyễn Văn A" value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)} autoFocus
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-orange-800 placeholder-gray-400 focus:outline-none focus:border-orange-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-orange-800 mb-1.5">Số điện thoại</label>
                <input type="tel" placeholder="0979123456" value={phoneInput} maxLength={11}
                  onChange={(e) => setPhoneInput(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-orange-800 placeholder-gray-400 focus:outline-none focus:border-orange-700" />
              </div>
              <div>
                <label className="block text-sm font-medium text-orange-800 mb-1.5">Địa chỉ giao hàng</label>
                <textarea placeholder="Số nhà, đường, phường, quận..." value={addressInput} rows={2}
                  onChange={(e) => setAddressInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-300 rounded-md text-sm text-orange-800 placeholder-gray-400 focus:outline-none focus:border-orange-700 resize-none" />
                <div className="mt-2 flex items-center gap-2">
                  {modalLocationLoading ? (
                    <span className="text-xs text-orange-600 font-medium animate-pulse">📡 Đang lấy định vị GPS...</span>
                  ) : latitude && longitude ? (
                    <span className="text-xs text-green-600 font-bold">✅ Đã lấy vị trí ({latitude.toFixed(4)}, {longitude.toFixed(4)})</span>
                  ) : (
                    <button onClick={getLocationForModal}
                      className="text-xs text-orange-700 hover:text-orange-900 underline font-medium">
                      📍 Bấm lại để lấy GPS
                    </button>
                  )}
                </div>
                {modalLocationError && !modalLocationLoading && !latitude && (
                  <p className="mt-1 text-xs text-red-500 font-medium">⚠️ {modalLocationError}. Vui lòng bật GPS và thử lại.</p>
                )}
                {latitude && longitude && (
                  <a href={`https://www.google.com/maps?q=${latitude},${longitude}`} target="_blank" rel="noopener noreferrer"
                    className="block mt-1 text-xs text-blue-600 hover:text-blue-800 underline">
                    🗺️ Xem trên Google Maps
                  </a>
                )}
              </div>
              <button onClick={handleInfoSubmit}
                disabled={modalLocationLoading || !latitude || !longitude}
                className="w-full py-2.5 bg-orange-700 text-white rounded-md font-medium text-sm hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {modalLocationLoading ? "⏳ Đang lấy định vị..." : (!latitude || !longitude) ? "📍 Cần bật GPS để đặt món" : "✓ Xác nhận & Đặt món"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-3 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="font-semibold text-orange-800">Đơn Giao Hàng</p>
            <button onClick={() => {
              setNameInput(customerName); setPhoneInput(customerPhone); setAddressInput(shipAddress);
              setShowInfoModal(true);
            }} className="text-sm text-gray-600 hover:text-orange-800 underline">
              {customerName || "Nhập thông tin"}
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><Icon name="search" className="w-4 h-4" /></span>
            <input type="text" placeholder="Tìm kiếm món..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-9 py-2 rounded-md bg-gray-50 border border-gray-200 text-orange-800 placeholder-gray-400 text-sm focus:outline-none focus:border-gray-400" />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-800">
                <Icon name="x" className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Ship disabled banner */}
      {isShipBlocked && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-start gap-2">
            <Icon name="clock" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-700">
                {shipDisableMessage || "Quán đang tạm thời không nhận đơn ship"}
              </p>
              <p className="text-xs text-red-600 mt-0.5">
                Quý khách vẫn có thể xem trạng thái đơn đang xử lý ở tab "Món đã chọn".
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="sticky bg-white border-b border-gray-200 z-10">
        <div className="max-w-4xl mx-auto flex">
          <button onClick={() => setActiveView("menu")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeView === "menu" ? "border-orange-700 text-orange-800" : "border-transparent text-gray-500 hover:text-orange-800"}`}>
            Menu
          </button>
          <button onClick={() => setActiveView("myorder")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeView === "myorder" ? "border-orange-700 text-orange-800" : "border-transparent text-gray-500 hover:text-orange-800"}`}>
            Món đã chọn {myItems.length > 0 && `(${myItems.length})`}
          </button>
        </div>
      </div>

      {/* Categories */}
      {activeView === "menu" && (
        <div className="sticky bg-white border-b border-gray-200 z-10">
          <div className="max-w-4xl mx-auto flex flex-wrap gap-1.5 p-2">
            <button onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${!selectedCategory ? "bg-orange-700 text-white" : "bg-gray-100 text-orange-800 hover:bg-gray-200"}`}>
              Tất cả
            </button>
            {categories.map((cat) => (
              <button key={cat.id} onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${selectedCategory === cat.id ? "bg-orange-700 text-white" : "bg-gray-100 text-orange-800 hover:bg-gray-200"}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Products Grid */}
      {activeView === "menu" && (
        <div className="max-w-4xl mx-auto p-2">
          {isShipBlocked ? (
            <div className="text-center py-12 px-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                <Icon name="clock" className="w-6 h-6" />
              </div>
              <p className="text-gray-700 font-bold mb-1">{shipDisableMessage || "Quán tạm thời không nhận đơn ship"}</p>
              <p className="text-gray-500 text-sm">Vui lòng xem trạng thái đơn ở tab "Món đã chọn".</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {filtered.map((product) => (
                <div key={product.id} onClick={() => addToCart(product)}
                  className="bg-white border border-gray-200 rounded-md overflow-hidden cursor-pointer active:scale-95 transition-transform hover:border-gray-400">
                  <div className="relative w-full pb-[100%] bg-gray-50">
                    {product.image_url ? (
                      <OptimizedImg src={product.image_url} alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover" />
                    ) : (
                      <div className="absolute inset-0 w-full h-full bg-gray-100"></div>
                    )}
                  </div>
                  <div className="p-2">
                    <h3 className="font-medium text-xs text-orange-800 line-clamp-2 leading-tight">{product.name}</h3>
                    <p className="text-orange-800 font-semibold text-sm mt-0.5">
                      {product.sizes && product.sizes.length > 0
                        ? "Từ " + Math.min(...product.sizes.map((s) => s.price)).toLocaleString()
                        : product.price.toLocaleString()}đ
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Items View */}
      {activeView === "myorder" && (
        <div className="max-w-4xl mx-auto p-3">
          {itemsLoading ? (
            <div className="text-center py-12 text-gray-500 text-sm">Đang tải...</div>
          ) : myItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 font-medium">Chưa có món nào</p>
              <p className="text-gray-400 text-sm mt-1">Món đã chọn sẽ hiện ở đây</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myItems.map((item) => (
                <div key={item.id} className="bg-white border border-gray-200 rounded-md p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start space-x-2 flex-1 min-w-0">
                      {item.status === "pending" && !isShipBlocked && (
                        <button onClick={() => reduceQty(item.order_id, item.id, item.quantity)}
                          disabled={isItemActionLoading(item.id, "reduce") || isItemActionLoading(item.id, "delete")}
                          className="w-6 h-6 border border-gray-300 rounded text-gray-600 hover:bg-gray-100 text-sm shrink-0 disabled:opacity-50">−</button>
                      )}
                      <span className="text-sm text-gray-500 tabular-nums shrink-0">×{item.quantity}</span>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-orange-800 text-sm">{item.name}</h3>
                        {item.size_name && <span className="text-xs text-gray-500">Size: {item.size_name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      {item.status === "pending" && <span className="text-xs text-gray-500">Chờ</span>}
                      {item.status === "processing" && <span className="text-xs text-orange-800 font-medium">Đang làm</span>}
                      {item.status === "completed" && <span className="text-xs text-orange-800 font-medium">Xong</span>}
                      {item.status === "pending" && !isShipBlocked && (
                        <button onClick={() => deleteItem(item.order_id, item.id)}
                          disabled={isItemActionLoading(item.id, "delete") || isItemActionLoading(item.id, "reduce")}
                          className="p-1 text-gray-400 hover:text-orange-800 disabled:opacity-50">
                          <Icon name="trash-2" className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {item.toppings && item.toppings.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.toppings.map((topping, idx) => (
                        <span key={`${item.id}_${idx}`} className="px-1.5 py-0.5 text-xs text-gray-600 bg-gray-100 rounded">+{topping}</span>
                      ))}
                    </div>
                  )}
                  {item.notes && <p className="mt-1.5 text-xs text-gray-600 italic">{item.notes}</p>}
                </div>
              ))}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3 mt-3 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{myItems.length} món</span>
                  <span className="text-lg font-semibold text-orange-800 tabular-nums">
                    {myItems.reduce((total, item) => total + (item.price * item.quantity), 0).toLocaleString()}đ
                  </span>
                </div>
                {!isShipBlocked && (
                  <button onClick={() => setActiveView("menu")}
                    className="w-full py-2.5 bg-orange-700 text-white rounded-md font-medium text-sm hover:bg-gray-700 transition">
                    🍽️ Gọi thêm món
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cart Button */}
      {cart.length > 0 && (
        <button onClick={() => setShowCartModal(true)}
          className="fixed bottom-3 right-3 bg-orange-700 text-white px-4 py-2.5 rounded-md border border-orange-700 flex items-center space-x-3 z-20 hover:bg-gray-700">
          <span className="text-sm font-medium">{cart.length} món · {cartTotal.toLocaleString()}đ</span>
        </button>
      )}

      {/* Cart Modal with Ship Info */}
      {showCartModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end">
          <div className="bg-white w-full max-h-[85vh] rounded-t-lg overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-orange-800">Xác nhận đặt đơn</h2>
              <button onClick={() => setShowCartModal(false)} className="p-1 text-gray-400 hover:text-orange-800"><Icon name="x" className="w-5 h-5" /></button>
            </div>

            {/* Ship Info Summary */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              {editingShipInfo ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Khách hàng</label>
                    <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:border-orange-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Số điện thoại</label>
                    <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value.replace(/\D/g, ""))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:border-orange-700" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Địa chỉ giao hàng</label>
                    <textarea value={editAddress} onChange={(e) => setEditAddress(e.target.value)} rows={2}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:border-orange-700 resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => {
                      setCustomerName(editName); setCustomerPhone(editPhone); setShipAddress(editAddress);
                      try { localStorage.setItem(SHIP_NAME_KEY, editName); localStorage.setItem(SHIP_PHONE_KEY, editPhone); localStorage.setItem(SHIP_ADDRESS_KEY, editAddress); } catch {}
                      setEditingShipInfo(false);
                    }} className="flex-1 py-2 bg-orange-700 text-white rounded-md text-sm font-medium hover:bg-gray-700">Lưu</button>
                    <button onClick={() => setEditingShipInfo(false)} className="flex-1 py-2 bg-white border border-gray-300 text-orange-800 rounded-md text-sm font-medium hover:bg-gray-50">Hủy</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-orange-800">Thông tin giao hàng</span>
                    <button onClick={() => { setEditName(customerName); setEditPhone(customerPhone); setEditAddress(shipAddress); setEditingShipInfo(true); }}
                      className="text-xs text-gray-600 hover:text-orange-800 underline">Sửa</button>
                  </div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center space-x-2 text-orange-800">
                      <Icon name="user" className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">{customerName}</span>
                    </div>
                    <div className="flex items-center space-x-2 text-orange-800">
                      <Icon name="phone" className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="tabular-nums">{customerPhone}</span>
                    </div>
                    <div className="flex items-start space-x-2 text-orange-800">
                      <Icon name="map-pin" className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                      <span>{shipAddress}</span>
                    </div>
                  </div>
                </>
              )}
              <div className="mt-3">
                <textarea placeholder="Ghi chú giao hàng (VD: gọi trước khi giao...)" value={shipNotes}
                  onChange={(e) => setShipNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-orange-800 placeholder-gray-400 focus:outline-none focus:border-orange-700 resize-none" />
              </div>
            </div>

            {/* Items List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cart.map((item) => {
                const hasToppings = item.toppings.length > 0;
                const hasNotes = item.notes && item.notes.trim().length > 0;
                return (
                  <div key={item.tempId} className="border border-gray-200 rounded-md p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-orange-800 text-sm">
                          {item.product.name} {item.size && <span className="text-gray-500">({item.size.name})</span>}
                        </h3>
                        <p className="text-sm text-orange-800 mt-0.5">{item.product.price.toLocaleString()}đ</p>
                        <button onClick={() => { setEditItemTempId(item.tempId); setShowEditModal(true); }}
                          className="mt-1 text-xs text-gray-500 hover:text-orange-800 underline">
                          {hasToppings || hasNotes ? (
                            <span>{hasToppings && `${item.toppings.length} topping`}{hasToppings && hasNotes && ", "}{hasNotes && "ghi chú"}</span>
                          ) : "Thêm topping, ghi chú"}
                        </button>
                      </div>
                      <div className="flex items-center space-x-1 shrink-0">
                        <button onClick={() => updateQty(item.tempId, -1)} className="w-7 h-7 border border-gray-300 rounded text-gray-600 hover:bg-gray-50 flex items-center justify-center"><Icon name="minus" className="w-3.5 h-3.5" /></button>
                        <span className="font-medium w-7 text-center text-sm">{item.quantity}</span>
                        <button onClick={() => updateQty(item.tempId, 1)} className="w-7 h-7 border border-orange-700 bg-orange-700 text-white rounded flex items-center justify-center hover:bg-gray-700"><Icon name="plus" className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-600">{cart.length} món</span>
                <span className="text-lg font-semibold text-orange-800 tabular-nums">{cartTotal.toLocaleString()}đ</span>
              </div>
              {orderSuccess ? (
                <div className="space-y-2">
                  <div className="text-center py-2">
                    <span className="text-green-600 font-bold text-sm">✅ Đã gửi đơn {lastOrderCode && `#${lastOrderCode}`} thành công!</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleViewMyOrder}
                      className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-md font-medium text-sm hover:bg-gray-200 transition">
                      📋 Xem đơn
                    </button>
                    <button onClick={handleAddMore}
                      className="flex-1 py-2.5 bg-orange-700 text-white rounded-md font-medium text-sm hover:bg-gray-700 transition">
                      🍽️ Gọi thêm
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={submitOrder} disabled={isOrdering || isShipBlocked}
                  className="w-full bg-orange-700 text-white py-2.5 rounded-md font-medium text-sm hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center space-x-2">
                  <span>{isOrdering ? "Đang gửi..." : "Xác nhận đặt đơn"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reuse shared modals */}
      {showSizeModal && (
        <SizeModal product={selectedProductForSize} onConfirm={confirmSize} onClose={() => { setShowSizeModal(false); setSelectedProductForSize(null); }} />
      )}
      {showEditModal && editItem && (
        <EditItemModal item={editItem} toppings={toppings} categories={categories}
          onClose={() => { setShowEditModal(false); setEditItemTempId(null); }}
          onToggleTopping={(t) => toggleTopping(editItem.tempId, t)}
          onUpdateNotes={(notes) => updateNotes(editItem.tempId, notes)}
        />
      )}

      {toasts.length > 0 && (
        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((t) => (
            <div key={t.id} className="bg-orange-700 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-slide-in-right">{t.message}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============ Shipper Portal View ============

const SHIPPER_POLL_MS = 10000;

function ShipperPortalView() {
  const [pendingOrders, setPendingOrders] = useState([]);
  const [transferOrders, setTransferOrders] = useState([]);
  const [activeTab, setActiveTab] = useState("pending");
  const [isConnected, setIsConnected] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState(null);

  const fetchPendingOrders = async () => {
    try {
      const res = await fetch(`/api/public/ship-orders?_=${Date.now()}`);
      if (res.ok) {
        setPendingOrders(await res.json());
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (err) {
      setIsConnected(false);
    }
  };

  const fetchTransferOrders = async () => {
    try {
      const res = await fetch(`/api/public/ship-orders/transfer?_=${Date.now()}`);
      if (res.ok) setTransferOrders(await res.json());
    } catch (err) { /* ignore */ }
  };

  useEffect(() => {
    const refresh = async () => {
      await Promise.all([fetchPendingOrders(), fetchTransferOrders()]);
    };
    refresh();
    const interval = setInterval(refresh, SHIPPER_POLL_MS);
    return () => clearInterval(interval);
  }, []);

  const payCash = async (orderId) => {
    setProcessingOrderId(orderId);
    try {
      const res = await fetch(`/api/public/ship-orders/${orderId}/pay-cash`, { method: "POST" });
      if (!res.ok) { alert("Không thể xác nhận. Vui lòng thử lại."); }
      await Promise.all([fetchPendingOrders(), fetchTransferOrders()]);
    } catch (err) {
      alert("Không thể xác nhận. Vui lòng thử lại.");
    } finally { setProcessingOrderId(null); }
  };

  const payTransfer = async (orderId) => {
    setProcessingOrderId(orderId);
    try {
      const res = await fetch(`/api/public/ship-orders/${orderId}/pay-transfer`, { method: "POST" });
      if (!res.ok) { alert("Không thể chuyển sang CK. Vui lòng thử lại."); }
      await Promise.all([fetchPendingOrders(), fetchTransferOrders()]);
    } catch (err) {
      alert("Không thể chuyển sang CK. Vui lòng thử lại.");
    } finally { setProcessingOrderId(null); }
  };

  const confirmTransfer = async (orderId) => {
    setProcessingOrderId(orderId);
    try {
      const res = await fetch(`/api/public/ship-orders/${orderId}/confirm-transfer`, { method: "POST" });
      if (!res.ok) { alert("Không thể xác nhận. Vui lòng thử lại."); }
      await Promise.all([fetchPendingOrders(), fetchTransferOrders()]);
    } catch (err) {
      alert("Không thể xác nhận. Vui lòng thử lại.");
    } finally { setProcessingOrderId(null); }
  };

  const getTimeDiff = (timeStr) => {
    if (!timeStr) return "";
    const diff = Math.floor((new Date() - new Date(timeStr)) / 60000);
    if (diff < 1) return "Vừa xong";
    if (diff < 60) return `${diff} phút trước`;
    return `${Math.floor(diff / 60)}h ${diff % 60}p trước`;
  };

  const orders = activeTab === "pending" ? pendingOrders : transferOrders;
  const emptyTitle = activeTab === "pending" ? "Không có đơn ship" : "Không có đơn chuyển khoản";
  const emptyDesc = activeTab === "pending" ? "Danh sách đơn giao hàng trống" : "Chưa có đơn chuyển khoản đang chờ";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Content */}
      <main className="max-w-lg mx-auto p-2 pt-4">
        {/* Tab Bar */}
        <div className="flex border-b border-gray-200 mb-4">
          <button onClick={() => setActiveTab("pending")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "pending" ? "border-orange-700 text-orange-800" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Cần xử lý ({pendingOrders.length})
          </button>
          <button onClick={() => setActiveTab("transfer")}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === "transfer" ? "border-orange-700 text-orange-800" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}>
            Chuyển khoản ({transferOrders.length})
          </button>
        </div>

        {/* Orders List */}
        {orders.length === 0 ? (
          <div className="text-center py-16">
            <Icon name="package" className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <h2 className="text-base font-medium text-orange-800 mb-1">{emptyTitle}</h2>
            <p className="text-sm text-gray-400">{emptyDesc}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-md border border-gray-200 overflow-hidden">
                {/* Header compact */}
                <div className="px-3 py-2 flex items-center justify-between border-b border-gray-100">
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <span className="font-medium text-sm text-orange-800 truncate">
                      {order.customer_name || order.display_code?.toUpperCase() || "SHIP"}
                    </span>
                    {order.customer_phone && (
                      <a href={`tel:${order.customer_phone}`} className="text-xs text-gray-500 hover:text-orange-800 tabular-nums">
                        {order.customer_phone}
                      </a>
                    )}
                    <span className="text-xs text-gray-400 flex items-center shrink-0">
                      <Icon name="clock" className="w-3 h-3 mr-0.5" />
                      {getTimeDiff(order.created_at)}
                    </span>
                  </div>
                  <span className="font-semibold text-sm text-orange-800 tabular-nums ml-2 shrink-0">
                    {order.total_amount.toLocaleString()}đ
                  </span>
                </div>

                {/* Address + Maps */}
                <div className="px-3 py-1.5 flex items-center flex-wrap gap-x-3 gap-y-1 text-xs">
                  {order.ship_address && (
                    <span className="flex items-center space-x-1 text-gray-600 min-w-0">
                      <Icon name="map-pin" className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{order.ship_address}</span>
                    </span>
                  )}
                  {order.latitude && order.longitude && (
                    <a href={`https://www.google.com/maps?q=${order.latitude},${order.longitude}`}
                      target="_blank" rel="noopener noreferrer"
                      className="text-gray-500 hover:text-orange-800 underline">
                      Bản đồ
                    </a>
                  )}
                </div>

                {/* Notes */}
                {order.ship_notes && (
                  <div className="px-3 pb-1.5 text-xs text-gray-600">
                    <span className="text-gray-400">Ghi chú: </span>{order.ship_notes}
                  </div>
                )}

                {/* Items */}
                <div className="px-3 py-1.5 border-t border-gray-100 space-y-0.5">
                  {(order.items || []).map((item, idx) => (
                    <div key={idx} className="flex items-baseline space-x-2 text-xs">
                      <span className="text-gray-500 tabular-nums w-7 shrink-0">×{item.quantity}</span>
                      <span className="flex-1 text-gray-800 truncate">
                        {item.name}
                        {item.size_name && <span className="text-gray-400"> ({item.size_name})</span>}
                        {item.toppings?.length > 0 && <span className="text-gray-400"> + {item.toppings.join(", ")}</span>}
                      </span>
                      <span className="text-orange-800 tabular-nums shrink-0">
                        {(item.price * item.quantity).toLocaleString()}đ
                      </span>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="px-3 py-2 border-t border-gray-100">
                  {activeTab === "pending" ? (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button onClick={() => payCash(order.id)} disabled={processingOrderId === order.id}
                        className={`py-1.5 px-2 text-xs font-medium border rounded transition-colors ${
                          processingOrderId === order.id
                            ? "border-gray-200 text-gray-400 cursor-not-allowed"
                            : "border-orange-700 text-orange-800 hover:bg-orange-700 hover:text-white"
                        }`}>
                        Tiền mặt
                      </button>
                      <button onClick={() => payTransfer(order.id)} disabled={processingOrderId === order.id}
                        className={`py-1.5 px-2 text-xs font-medium border rounded transition-colors ${
                          processingOrderId === order.id
                            ? "border-gray-200 text-gray-400 cursor-not-allowed"
                            : "border-gray-300 text-gray-700 hover:bg-gray-100"
                        }`}>
                        Chuyển khoản
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => confirmTransfer(order.id)} disabled={processingOrderId === order.id}
                      className={`w-full py-1.5 px-2 text-xs font-medium border rounded flex items-center justify-center space-x-1.5 transition-colors ${
                        processingOrderId === order.id
                          ? "border-gray-200 text-gray-400 cursor-not-allowed"
                          : "border-orange-700 text-orange-800 hover:bg-orange-700 hover:text-white"
                      }`}>
                      {processingOrderId === order.id ? (
                        <><Icon name="refresh-cw" className="w-3 h-3 animate-spin" /><span>Đang xác nhận...</span></>
                      ) : (
                        <><Icon name="check" className="w-3 h-3" /><span>Xác nhận đã nhận tiền</span></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

// ============ Reports (clone của frontend/src/components/Reports.jsx — bar chart thuần CSS) ============
function Reports() {
  const [stats, setStats] = useState({ revenue: 0, orders_count: 0, total_products: 0 });
  const [chartData, setChartData] = useState([]);
  const [productSales, setProductSales] = useState([]);
  const [categorySales, setCategorySales] = useState([]);

  const todayStr = () => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
  };

  // Default range: Today
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState(todayStr());
  const [activeFilter, setActiveFilter] = useState("today");

  useEffect(() => { fetchData(); }, [startDate, endDate]);

  const fetchData = async () => {
    try {
      const qs = `start_date=${startDate}&end_date=${endDate}`;
      const [statsRes, chartRes, salesRes, catRes] = await Promise.all([
        apiAuth(`/api/reports/stats?${qs}`),
        apiAuth(`/api/reports/chart-data?${qs}`),
        apiAuth(`/api/reports/product-sales?${qs}`),
        apiAuth(`/api/reports/category-sales?${qs}`),
      ]);
      setStats(statsRes);
      setChartData(chartRes || []);
      setProductSales(salesRes || []);
      setCategorySales(catRes || []);
    } catch (err) {
      console.error("Lỗi tải báo cáo:", err);
    }
  };

  const handleQuickSelect = (type) => {
    setActiveFilter(type);
    const fmt = (d) => {
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${d.getFullYear()}-${mm}-${dd}`;
    };
    const today = new Date();

    switch (type) {
      case "today":
        setStartDate(fmt(today));
        setEndDate(fmt(today));
        break;
      case "yesterday": {
        const y = new Date(today);
        y.setDate(y.getDate() - 1);
        setStartDate(fmt(y));
        setEndDate(fmt(y));
        break;
      }
      case "last_week": {
        // ISO week: Monday-start, matching moment().startOf('isoWeek')
        const start = new Date(today);
        start.setDate(start.getDate() - 7);
        const dow = (start.getDay() + 6) % 7; // 0 = Monday
        start.setDate(start.getDate() - dow);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        setStartDate(fmt(start));
        setEndDate(fmt(end));
        break;
      }
      case "this_month": {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(fmt(start));
        setEndDate(fmt(today));
        break;
      }
      default:
        break;
    }
  };

  const maxRevenue = Math.max(1, ...chartData.map((d) => d.revenue || 0));

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 md:gap-6">
        <h3 className="text-xl font-black text-gray-800">Báo cáo doanh thu</h3>

        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          {/* Quick Filters */}
          <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-full md:w-auto">
            <button onClick={() => handleQuickSelect("today")}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === "today" ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              Hôm nay
            </button>
            <button onClick={() => handleQuickSelect("yesterday")}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === "yesterday" ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              Hôm qua
            </button>
            <button onClick={() => handleQuickSelect("last_week")}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === "last_week" ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              Tuần trước
            </button>
            <button onClick={() => handleQuickSelect("this_month")}
              className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${activeFilter === "this_month" ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              Tháng này
            </button>
          </div>

          {/* Date Filters */}
          <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100 shadow-sm w-full md:w-auto">
            <div className="hidden md:flex items-center space-x-2 px-3 border-r border-gray-100">
              <Icon name="calendar" className="w-4 h-4 text-gray-400" />
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bộ lọc ngày</span>
            </div>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="flex-1 md:flex-none px-2 py-1 text-sm font-bold text-gray-700 outline-none hover:bg-gray-50 rounded-lg transition-colors"
            />
            <span className="text-gray-400 font-bold">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="flex-1 md:flex-none px-2 py-1 text-sm font-bold text-gray-700 outline-none hover:bg-gray-50 rounded-lg transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="p-5 md:p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Icon name="trending-up" className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-bold">Doanh thu trong kỳ</p>
            <p className="text-xl md:text-2xl font-black text-gray-800">{Number(stats.revenue || 0).toLocaleString()}đ</p>
          </div>
        </div>

        <div className="p-5 md:p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Icon name="shopping-bag" className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-bold">Đơn hàng trong kỳ</p>
            <p className="text-xl md:text-2xl font-black text-gray-800">{stats.orders_count}</p>
          </div>
        </div>

        <div className="p-5 md:p-6 bg-white rounded-2xl border border-gray-100 shadow-sm flex items-center space-x-4 transition-all hover:shadow-md">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Icon name="package" className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-bold">Tổng sản phẩm</p>
            <p className="text-xl md:text-2xl font-black text-gray-800">{stats.total_products}</p>
          </div>
        </div>
      </div>

      {/* Chart (CSS bars thay cho Recharts — không thêm dependency) */}
      <div className="p-5 md:p-6 bg-white rounded-2xl border border-gray-100 shadow-sm">
        <h4 className="font-bold text-gray-700 mb-6">Biểu đồ doanh thu</h4>
        {chartData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">Chưa có dữ liệu</div>
        ) : (
          <div className="h-[300px] md:h-[400px] w-full flex items-end gap-2 md:gap-3 overflow-x-auto pb-2">
            {chartData.map((d, i) => {
              const h = Math.round(((d.revenue || 0) / maxRevenue) * 100);
              return (
                <div key={i} className="flex-1 min-w-[36px] flex flex-col items-center justify-end h-full group">
                  <span className="text-[10px] font-bold text-gray-500 mb-1 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {Number(d.revenue || 0).toLocaleString()}đ
                  </span>
                  <div
                    className="w-full max-w-[40px] bg-[#4F46E5] rounded-t transition-all duration-300"
                    style={{ height: `${Math.max(h, d.revenue > 0 ? 4 : 0)}%` }}
                    title={`${d.date}: ${Number(d.revenue || 0).toLocaleString()}đ`}
                  ></div>
                  <span className="text-xs text-gray-500 mt-2 whitespace-nowrap">{d.date}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sales Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 md:gap-8">
        {/* Category Sales Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 border-b border-gray-100">
            <h4 className="font-bold text-gray-700">Thống kê theo danh mục</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[300px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest whitespace-nowrap">Danh mục</th>
                  <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right whitespace-nowrap">Số lượng</th>
                  <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right whitespace-nowrap">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {categorySales.length > 0 ? (
                  categorySales.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-bold text-gray-800 text-sm whitespace-nowrap">{item.category_name}</td>
                      <td className="p-4 font-black text-gray-800 text-right whitespace-nowrap">{item.quantity}</td>
                      <td className="p-4 font-black text-primary-600 text-right whitespace-nowrap">{Number(item.revenue).toLocaleString()}đ</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-10 text-center text-gray-400 text-sm">Chưa có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Product Sales Table */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-5 md:p-6 border-b border-gray-100">
            <h4 className="font-bold text-gray-700">Thống kê theo món ăn</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[300px]">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest whitespace-nowrap">Tên món</th>
                  <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right whitespace-nowrap">Số lượng</th>
                  <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right whitespace-nowrap">Doanh thu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {productSales.length > 0 ? (
                  productSales.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-4 font-bold text-gray-800 text-sm whitespace-nowrap">{item.product_name}</td>
                      <td className="p-4 font-black text-gray-800 text-right whitespace-nowrap">{item.quantity}</td>
                      <td className="p-4 font-black text-primary-600 text-right whitespace-nowrap">{Number(item.revenue).toLocaleString()}đ</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-10 text-center text-gray-400 text-sm">Chưa có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ Admin Panel (Task 7: clone của frontend/src/pages/Admin.jsx) ============
function AdminPanel({ embedded = false, onExit }) {
  const [tab, setTab] = useState("products"); // products | categories | tables | orders | staff | settings | reports
  const [productTab, setProductTab] = useState("active");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [tables, setTables] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [showOrderDetails, setShowOrderDetails] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const toastTimer = useRef(null);

  const showToast = (msg) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    toastTimer.current = setTimeout(() => setToastMsg(null), 2500);
  };

  // ---- Table modal state
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [tableName, setTableName] = useState("");
  // ---- QR modal state
  const [qrTable, setQrTable] = useState(null);
  const qrContainerRef = useRef(null);
  useEffect(() => {
    if (!qrTable || !qrContainerRef.current || typeof window.qrcode === "undefined") return;
    const url = `${window.location.origin}/menu/table/${qrTable.id}`;
    const qr = window.qrcode(0, "M");
    qr.addData(url);
    qr.make();
    qrContainerRef.current.innerHTML = qr.createSvgTag(5, 0);
    const svg = qrContainerRef.current.querySelector("svg");
    if (svg) { svg.style.width = "100%"; svg.style.height = "auto"; }
  }, [qrTable]);
  const downloadQR = useCallback((table) => {
    if (typeof window.qrcode === "undefined") return;
    const url = `${window.location.origin}/menu/table/${table.id}`;
    const qr = window.qrcode(0, "M");
    qr.addData(url);
    qr.make();
    const moduleCount = qr.getModuleCount();
    const scale = 10;
    const padding = 40;
    const canvas = document.createElement("canvas");
    const totalSize = moduleCount * scale + padding * 2;
    canvas.width = totalSize;
    canvas.height = totalSize + 60;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#000000";
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (qr.isDark(row, col)) {
          ctx.fillRect(col * scale + padding, row * scale + padding, scale, scale);
        }
      }
    }
    ctx.fillStyle = "#1f2937";
    ctx.bold = true;
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(table.name, canvas.width / 2, totalSize + 30);
    const link = document.createElement("a");
    link.download = `QR-${table.name.replace(/\s+/g, "-")}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, []);

  // Tải tất cả QR — trang A6, 6 bàn/trang (2x3 grid)
  const downloadAllQR = useCallback(() => {
    if (typeof window.qrcode === "undefined" || !tables || tables.length === 0) return;
    const COLS = 2, ROWS = 3, PER_PAGE = COLS * ROWS;
    // A6 @ 300 DPI: 105mm x 148.5mm
    const PW = Math.round(105 / 25.4 * 300);
    const PH = Math.round(148.5 / 25.4 * 300);
    const CELL_W = PW / COLS, CELL_H = PH / ROWS;
    // Layout from cell top: total content = QR_SIZE + 2 gaps + fonts ≈ 490px, fits in CELL_H=584
    const QR_SIZE = Math.round(CELL_W * 0.22);
    const QR_FONT = Math.round(CELL_W * 0.1);
    const NAME_FONT = Math.round(CELL_W * 0.085);
    const GAP = 10;
    const TOP_PAD = Math.round(CELL_H * 0.1); // 10% top padding per cell
    // Append takeaway QR as the last item
    const allItems = [...tables, { id: "__takeaway__", name: "Mang Về", _isTakeaway: true }];
    const pages = [];
    for (let i = 0; i < allItems.length; i += PER_PAGE) {
      pages.push(allItems.slice(i, i + PER_PAGE));
    }
    pages.forEach((page, pageIdx) => {
      const canvas = document.createElement("canvas");
      canvas.width = PW; canvas.height = PH;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, PW, PH);
      page.forEach((table, idx) => {
        const col = idx % COLS, row = Math.floor(idx / COLS);
        const cx = col * CELL_W + CELL_W / 2;
        const cellTop = row * CELL_H;
        const qrY = cellTop + TOP_PAD;
        const qrX = cx - QR_SIZE / 2;
        const qr = window.qrcode(0, "M");
        const qrUrl = table._isTakeaway
          ? `${window.location.origin}/takeaway`
          : `${window.location.origin}/menu/table/${table.id}`;
        qr.addData(qrUrl);
        qr.make();
        const moduleCount = qr.getModuleCount();
        const scale = QR_SIZE / moduleCount;
        // Draw QR modules
        ctx.fillStyle = "#1f2937";
        for (let r = 0; r < moduleCount; r++) {
          for (let c = 0; c < moduleCount; c++) {
            if (qr.isDark(r, c)) {
              ctx.fillRect(qrX + c * scale, qrY + r * scale, Math.ceil(scale), Math.ceil(scale));
            }
          }
        }
        // Draw finder patterns (corners)
        ctx.fillStyle = "#1f2937";
        const fSize = Math.round(7 * scale);
        const fCell = Math.round(scale);
        [[qrX, qrY], [qrX + QR_SIZE - fSize, qrY], [qrX, qrY + QR_SIZE - fSize]].forEach(([fx, fy]) => {
          ctx.fillRect(fx, fy, fSize, fSize);
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(fx + fCell * 1.5, fy + fCell * 1.5, fSize - fCell * 3, fSize - fCell * 3);
          ctx.fillStyle = "#1f2937";
          ctx.fillRect(fx + fCell * 2.5, fy + fCell * 2.5, fSize - fCell * 5, fSize - fCell * 5);
        });
        // Label
        ctx.fillStyle = "#1f2937";
        ctx.font = `bold ${QR_FONT}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillText(table._isTakeaway ? "Quét Gọi Món Mang Về" : "Quét Gọi Món", cx, qrY + QR_SIZE + GAP);
        // Table name / takeaway label
        ctx.font = `bold ${NAME_FONT}px sans-serif`;
        ctx.fillStyle = table._isTakeaway ? "#c2410c" : "#6b7280";
        ctx.fillText(table._isTakeaway ? "Mang Về - Tại Quầy" : table.name, cx, qrY + QR_SIZE + GAP + QR_FONT + 4);
      });
      // Page separator / download
      const link = document.createElement("a");
      link.download = `QR-All-${pageIdx + 1}-of-${pages.length}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    });
  }, [tables]);

  // ---- Product modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState({
    name: "", price: "", category_ids: [], image_url: "",
    available: true, production_unit: "kitchen", is_topping: false,
  });

  // ---- Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [categoryName, setCategoryName] = useState("");
  const [categoryProductionUnit, setCategoryProductionUnit] = useState("kitchen");
  const [categoryAllowAll, setCategoryAllowAll] = useState(true);
  const [categoryToppingIds, setCategoryToppingIds] = useState([]);
  const [draggingCategoryId, setDraggingCategoryId] = useState(null);

  // ---- Staff modal state
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [staffForm, setStaffForm] = useState({ username: "", password: "", full_name: "", role: "staff", pin: "" });

  // ---- Settings state
  const [settings, setSettings] = useState({
    store_name: "", wifi_ssid: "", wifi_pass: "", facebook_url: "", featured_products: [],
  });
  // ---- Zalo Bot settings state
  const [zaloBot, setZaloBot] = useState({
    enabled: false, bot_token: "", bot_token_masked: "", group_chat_id: "", api_base: "https://bot-api.zaloplatforms.com",
  });
  const [zaloBotDirty, setZaloBotDirty] = useState(false);
  const [zaloTestResult, setZaloTestResult] = useState(null);
  const [zaloTesting, setZaloTesting] = useState(false);
  // ---- Server update state (local Node server — không áp dụng khi chạy Workers)
  const [serverInfo, setServerInfo] = useState(null);
  const [updateState, setUpdateState] = useState("idle"); // idle | checking | updating | restarting
  const [updateMsg, setUpdateMsg] = useState(null); // { text, error, behind }
  const [serverLogs, setServerLogs] = useState(null); // { pos_log, watchdog_log }
  const [logsLoading, setLogsLoading] = useState(false);
  // ---- Hub sync state (đồng bộ lên trung tâm cho chuỗi quán)
  const [hub, setHub] = useState({ enabled: false, mode: "d1", url: "", store_id: "", db_name: "pos-free", api_key: "", api_key_masked: "", cf_token_masked: "", cf_account_id: "" });
  const [hubStatus, setHubStatus] = useState(null);
  const [hubMsg, setHubMsg] = useState(null);
  const [hubSaving, setHubSaving] = useState(false);
  const [hubDbs, setHubDbs] = useState([]); // danh sách D1 database trên CF
  const [newDbName, setNewDbName] = useState("");
  const [dbBusy, setDbBusy] = useState(false);
  const [tun, setTun] = useState({ token: "", email: "", account_id: "", zones: [], zone_id: "", zone_name: "", subdomain: "" });
  const [tunStatus, setTunStatus] = useState(null);
  const [tunMsg, setTunMsg] = useState(null);
  const [tunBusy, setTunBusy] = useState(false);
  // Kiểm tra font tiếng Việt đã load chưa — test cả 2 weight (regular + black),
  // glyph "ầ/Ầ" = dấu mũ + nặng (ký tự hay lỗi nhất trên font thiếu VN ext)
  const [fontOk, setFontOk] = useState(null);
  useEffect(() => {
    if (!document.fonts) { setFontOk("no API"); return; }
    document.fonts.ready.then(() => {
      const r = document.fonts.check('16px "Be Vietnam Pro"', "\u1ea7");
      const b = document.fonts.check('900 16px "Be Vietnam Pro"', "\u1ea6");
      setFontOk(`400:${r ? "OK" : "X"} 900:${b ? "OK" : "X"}`);
    });
  }, []);

  useEffect(() => { fetchData(); }, [tab]);

  const fetchData = async () => {
    try {
      if (tab === "products") {
        const [pRes, cRes] = await Promise.all([
          apiAuth("/api/products?available=all"),
          apiAuth("/api/products/categories"),
        ]);
        setProducts(pRes);
        setCategories(cRes);
      } else if (tab === "categories") {
        const [cRes, pRes] = await Promise.all([
          apiAuth("/api/products/categories"),
          apiAuth("/api/products?available=all"),
        ]);
        setCategories(cRes);
        setProducts(pRes);
      } else if (tab === "staff") {
        setUsers(await apiAuth("/api/admin/users"));
      } else if (tab === "tables") {
        const data = await apiAuth("/api/tables");
        setTables(Array.isArray(data) ? data : data.tables || []);
      } else if (tab === "orders") {
        setOrders(await apiAuth("/api/orders/history"));
      } else if (tab === "settings") {
        const [sData, pData, adminSettings] = await Promise.all([
          apiAuth("/api/settings"),
          apiAuth("/api/menu"),
          apiAuth("/api/admin/settings"),
        ]);
        const next = sData || {};
        if (!next.featured_products) next.featured_products = [];
        setSettings(next);
        setProducts((pData.products || []).map((p) => ({ ...p, available: 1 })));
        if (adminSettings?.zalo_bot) {
          setZaloBot({
            enabled: !!adminSettings.zalo_bot.enabled,
            bot_token: "",
            bot_token_masked: adminSettings.zalo_bot.bot_token_masked || "",
            group_chat_id: adminSettings.zalo_bot.group_chat_id || "",
            api_base: adminSettings.zalo_bot.api_base || "https://bot-api.zaloplatforms.com",
          });
        }
        setZaloBotDirty(false);
        setZaloTestResult(null);
        apiAuth("/api/admin/server-info").then(setServerInfo).catch(() => setServerInfo(null));
        if (adminSettings?.hub) {
          setHub({
            enabled: !!adminSettings.hub.enabled,
            mode: adminSettings.hub.mode || "d1",
            url: adminSettings.hub.url || "",
            store_id: adminSettings.hub.store_id || "",
            db_name: adminSettings.hub.db_name || "pos-free",
            api_key: "",
            api_key_masked: adminSettings.hub.api_key_masked || "",
            cf_token_masked: adminSettings.hub.cf_token_masked || "",
            cf_account_id: adminSettings.hub.cf_account_id || "",
          });
        }
        apiAuth("/api/admin/sync-status").then(setHubStatus).catch(() => setHubStatus(null));
        apiAuth("/api/admin/tunnel-status").then(setTunStatus).catch(() => setTunStatus(null));
        if (adminSettings?.hub?.cf_token_masked) {
          apiAuth("/api/admin/d1-list", { method: "POST" })
            .then((r) => { if (r?.databases) setHubDbs(r.databases); })
            .catch(() => {});
        }
      }
    } catch (err) {
      showToast("Lỗi tải dữ liệu: " + err.message);
    }
  };

  // ---- Server update / restart (local Node server) ----
  // Sau update/restart, process exit → supervisor loop bật lại.
  // Poll /api/health tới khi sống lại rồi reload trang.
  const pollUntilRestart = () => {
    setUpdateState("restarting");
    setUpdateMsg({ text: "Server đang khởi động lại, chờ vài giây..." });
    const t0 = Date.now();
    const iv = setInterval(async () => {
      try {
        const r = await fetch("/api/health");
        if (r.ok) {
          clearInterval(iv);
          window.location.reload();
          return;
        }
      } catch {}
      if (Date.now() - t0 > 90000) {
        clearInterval(iv);
        setUpdateState("idle");
        setUpdateMsg({ text: "Server chưa lên lại — kiểm tra log hoặc chạy lại server.mjs", error: true });
      }
    }, 1500);
  };

  const checkServerUpdate = async () => {
    setUpdateState("checking");
    setUpdateMsg({ text: "Đang kiểm tra trên GitHub..." });
    try {
      const r = await apiAuth("/api/admin/server-check", { method: "POST" });
      setUpdateState("idle");
      setUpdateMsg(
        r.behind > 0
          ? { text: `Có ${r.behind} bản mới: ${r.latest} — ${r.latest_message}`, behind: r.behind }
          : { text: "Đã là bản mới nhất" }
      );
    } catch (e) {
      setUpdateState("idle");
      setUpdateMsg({ text: e.message || "Không kiểm tra được", error: true });
    }
  };

  const doServerUpdate = async () => {
    if (!window.confirm("Tải code mới về và khởi động lại server? Màn hình sẽ gián đoạn vài giây.")) return;
    setUpdateState("updating");
    setUpdateMsg({ text: "Đang tải bản mới từ GitHub..." });
    try {
      await apiAuth("/api/admin/server-update", { method: "POST" });
    } catch {}
    pollUntilRestart();
  };

  const doServerRestart = async () => {
    if (!window.confirm("Khởi động lại server?")) return;
    try {
      await apiAuth("/api/admin/server-restart", { method: "POST" });
    } catch {}
    pollUntilRestart();
  };

  const fetchServerLogs = async () => {
    setLogsLoading(true);
    try {
      setServerLogs(await apiAuth("/api/admin/server-logs"));
    } catch {
      setServerLogs({ pos_log: "", watchdog_log: "Không lấy được log (chỉ có trên server local)" });
    } finally {
      setLogsLoading(false);
    }
  };

  // ---- Hub sync ----
  const saveHub = async () => {
    setHubSaving(true);
    setHubMsg(null);
    try {
      const body = { hub: { enabled: hub.enabled, mode: hub.mode, url: hub.url, store_id: hub.store_id, db_name: hub.db_name } };
      if (hub.api_key) body.hub.api_key = hub.api_key;
      await apiAuth("/api/admin/settings", { method: "PUT", body: JSON.stringify(body) });
      setHubMsg({ text: "Đã lưu cấu hình hub", error: false });
    } catch (e) {
      setHubMsg({ text: e.message || "Lưu thất bại", error: true });
    } finally {
      setHubSaving(false);
    }
  };

  const testHub = async () => {
    setHubMsg({ text: "Đang kiểm tra kết nối hub...", error: false });
    try {
      const r = await apiAuth("/api/admin/sync-test", { method: "POST" });
      setHubMsg(r.ok ? { text: `Kết nối OK — ${r.detail || r.name || r.store_id || ""}`, error: false }
                     : { text: "Kết nối thất bại: " + (r.detail || ""), error: true });
    } catch (e) {
      setHubMsg({ text: e.message || "Không kết nối được", error: true });
    }
  };

  const syncHubNow = async () => {
    setHubMsg({ text: "Đang đồng bộ...", error: false });
    try {
      const r = await apiAuth("/api/admin/sync-now", { method: "POST" });
      setHubStatus(r);
      setHubMsg(r.ok ? { text: "Đồng bộ xong: " + r.detail, error: false }
                     : { text: "Đồng bộ lỗi: " + (r.detail || ""), error: true });
    } catch (e) {
      setHubMsg({ text: e.message || "Đồng bộ thất bại", error: true });
    }
  };

  const loadDbs = async () => {
    setDbBusy(true); setHubMsg(null);
    try {
      const r = await apiAuth("/api/admin/d1-list", { method: "POST" });
      if (!r.ok) throw new Error(r.error || "không tải được danh sách");
      const dbs = r.databases || [];
      setHubDbs(dbs);
      // Nếu tên đang nhập không có trong DS → tự chọn DB đầu tiên
      setHub((h) => (dbs.length && !dbs.some((d) => d.name === h.db_name)
        ? { ...h, db_name: dbs[0].name } : h));
      setHubMsg({ text: `Tìm thấy ${dbs.length} database`, error: false });
    } catch (e) {
      setHubMsg({ text: e.message, error: true });
    } finally { setDbBusy(false); }
  };

  const createDb = async () => {
    const name = newDbName.trim();
    if (!name) return;
    setDbBusy(true); setHubMsg(null);
    try {
      const r = await apiAuth("/api/admin/d1-create", { method: "POST", body: JSON.stringify({ name }) });
      if (!r.ok) throw new Error(r.error || "không tạo được");
      setHubMsg({ text: `Đã tạo database "${r.database.name}"`, error: false });
      setNewDbName("");
      await loadDbs();
      setHub((h) => ({ ...h, db_name: r.database.name }));
    } catch (e) {
      setHubMsg({ text: e.message, error: true });
      setDbBusy(false);
    }
  };

  // ---- Cloudflare Tunnel (public domain cho quán) ----
  const saveTunToken = async () => {
    setTunBusy(true); setTunMsg({ text: "Đang kiểm tra token...", error: false });
    try {
      const r = await apiAuth("/api/admin/tunnel-token", {
        method: "POST",
        body: JSON.stringify({ token: tun.token, email: tun.email, account_id: tun.account_id }),
      });
      if (!r.ok) throw new Error(r.error || "lỗi");
      setTunMsg({ text: `Đã lưu token${r.account_id ? ` — account ${r.account_id.slice(0, 8)}…` : ""}. Dùng chung cho đồng bộ D1.`, error: false });
      apiAuth("/api/admin/tunnel-status").then(setTunStatus).catch(() => {});
    } catch (e) {
      setTunMsg({ text: "Lỗi: " + (e.message || "không lưu được token"), error: true });
    } finally { setTunBusy(false); }
  };

  const loadTunZones = async () => {
    setTunBusy(true); setTunMsg({ text: "Đang lấy danh sách domain...", error: false });
    try {
      const r = await apiAuth("/api/admin/tunnel-domains", {
        method: "POST", body: JSON.stringify({ token: tun.token, email: tun.email }),
      });
      setTun({ ...tun, zones: r.zones || [] });
      setTunMsg(r.zones?.length
        ? { text: `Tìm thấy ${r.zones.length} domain`, error: false }
        : { text: "Token hợp lệ nhưng không có domain nào", error: true });
    } catch (e) {
      setTunMsg({ text: "Lỗi: " + (e.message || "không gọi được Cloudflare"), error: true });
    } finally { setTunBusy(false); }
  };

  const setupTunnel = async () => {
    setTunBusy(true); setTunMsg({ text: "Đang tạo tunnel + DNS...", error: false });
    try {
      const r = await apiAuth("/api/admin/tunnel-setup", {
        method: "POST",
        body: JSON.stringify({
          token: tun.token, email: tun.email, account_id: tun.account_id,
          zone_id: tun.zone_id, zone_name: tun.zone_name, subdomain: tun.subdomain,
        }),
      });
      setTunStatus(r);
      setTunMsg({ text: "Xong! POS online tại " + (r.url || ""), error: false });
    } catch (e) {
      setTunMsg({ text: "Lỗi: " + (e.message || "không tạo được"), error: true });
    } finally { setTunBusy(false); }
  };

  const stopTunnel = async () => {
    setTunBusy(true);
    try {
      const r = await apiAuth("/api/admin/tunnel-stop", { method: "POST" });
      setTunStatus(r);
      setTunMsg({ text: "Đã tắt tunnel", error: false });
    } catch (e) {
      setTunMsg({ text: e.message || "Lỗi", error: true });
    } finally { setTunBusy(false); }
  };

  // ---- Products CRUD ----
  const deleteProduct = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa món này?")) return;
    try {
      await apiAuth(`/api/admin/products/${id}`, { method: "DELETE" });
      fetchData();
      showToast("Đã xóa món thành công");
    } catch (err) {
      alert(err.message || "Không thể xóa món này (có thể do đã có đơn hàng liên quan)");
    }
  };

  const toggleProductAvailability = async (product) => {
    const nextAvailable = !product.available;
    const confirmText = nextAvailable
      ? `Khôi phục kinh doanh cho "${product.name}"?`
      : `Tạm ngưng kinh doanh "${product.name}"?`;
    if (!window.confirm(confirmText)) return;
    try {
      await apiAuth(`/api/admin/products/${product.id}`, {
        method: "PUT",
        body: JSON.stringify({ available: nextAvailable }),
      });
      fetchData();
    } catch (err) {
      alert("Không thể cập nhật trạng thái sản phẩm");
    }
  };

  const addProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: "", price: "", category_ids: categories.length > 0 ? [categories[0].id] : [],
      image_url: "", available: true, production_unit: "kitchen", is_topping: false,
    });
    setShowProductModal(true);
  };

  const editProduct = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      price: product.price,
      category_ids: product.category_id ? [product.category_id] : [],
      image_url: product.image_url || "",
      available: !!product.available,
      production_unit: product.production_unit || "kitchen",
      is_topping: !!product.is_topping,
    });
    setShowProductModal(true);
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price) return;
    try {
      const payload = {
        ...productForm,
        price: Number(productForm.price),
        category_id: productForm.category_ids.length > 0 ? productForm.category_ids[0] : null,
      };
      if (editingProduct) {
        await apiAuth(`/api/admin/products/${editingProduct.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiAuth("/api/admin/products", { method: "POST", body: JSON.stringify(payload) });
      }
      setShowProductModal(false);
      fetchData();
    } catch (err) {
      showToast("Lỗi lưu sản phẩm: " + err.message);
    }
  };

  const handleAddSize = async () => {
    const nameInput = document.getElementById("newSizeName");
    const priceInput = document.getElementById("newSizePrice");
    if (!nameInput || !priceInput || !nameInput.value || !priceInput.value) return;
    try {
      const res = await apiAuth(`/api/admin/products/${editingProduct.id}/sizes`, {
        method: "POST",
        body: JSON.stringify({ name: nameInput.value, price: Number(priceInput.value) }),
      });
      const newSize = { id: res.id, name: nameInput.value, price: Number(priceInput.value), product_id: editingProduct.id };
      setEditingProduct((prev) => ({ ...prev, sizes: [...(prev.sizes || []), newSize] }));
      nameInput.value = "";
      priceInput.value = "";
      fetchData();
    } catch (err) {
      alert("Lỗi thêm size");
    }
  };

  const handleDeleteSize = async (sizeId) => {
    if (!window.confirm("Xóa size này?")) return;
    try {
      await apiAuth(`/api/admin/products/sizes/${sizeId}`, { method: "DELETE" });
      setEditingProduct((prev) => ({ ...prev, sizes: prev.sizes.filter((s) => s.id !== sizeId) }));
      fetchData();
    } catch (err) {
      alert("Lỗi xóa size");
    }
  };

  // ---- Image upload: resize bằng canvas (max 800px JPEG) rồi gửi base64 ----
  const resizeImage = (file) =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let { width: w, height: h } = img;
        if (w > MAX || h > MAX) {
          const s = MAX / Math.max(w, h);
          w = Math.round(w * s);
          h = Math.round(h * s);
        }
        const c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(img.src);
        resolve(c.toDataURL("image/jpeg", 0.82));
      };
      img.onerror = () => reject(new Error("Không đọc được ảnh"));
      img.src = URL.createObjectURL(file);
    });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file);
      const res = await apiAuth("/api/admin/upload", {
        method: "POST",
        body: JSON.stringify({ image: dataUrl.split(",")[1], filename: file.name }),
      });
      setProductForm((prev) => ({ ...prev, image_url: res.url }));
      showToast("Đã tải lên ảnh");
    } catch (err) {
      alert("Lỗi upload ảnh: " + err.message);
    } finally {
      e.target.value = "";
    }
  };

  // ---- Tables CRUD ----
  const deleteTable = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bàn này?")) return;
    try {
      await apiAuth(`/api/admin/tables/${id}`, { method: "DELETE" });
      fetchData();
      showToast("Đã xóa bàn thành công");
    } catch (err) {
      alert(err.message || "Lỗi khi xóa bàn");
    }
  };

  const addTable = () => { setEditingTable(null); setTableName(""); setShowTableModal(true); };
  const editTable = (table) => { setEditingTable(table); setTableName(table.name); setShowTableModal(true); };

  const handleSaveTable = async () => {
    if (!tableName.trim()) return;
    try {
      if (editingTable) {
        await apiAuth(`/api/admin/tables/${editingTable.id}`, { method: "PUT", body: JSON.stringify({ name: tableName }) });
      } else {
        await apiAuth("/api/admin/tables", { method: "POST", body: JSON.stringify({ name: tableName }) });
      }
      setShowTableModal(false);
      fetchData();
    } catch (err) {
      showToast(err.message || "Lỗi lưu bàn");
    }
  };

  // ---- Staff CRUD ----
  const addStaff = () => {
    setStaffForm({ username: "", password: "", full_name: "", role: "staff", pin: "" });
    setShowStaffModal(true);
  };

  // Đặt/đổi/xoá PIN chấm công cho nhân viên có sẵn
  const editUserPin = async (u) => {
    const pin = window.prompt(`PIN chấm công cho ${u.full_name || u.username} (4-6 số; bỏ trống = xoá PIN):`, "");
    if (pin === null) return;
    try {
      await apiAuth(`/api/admin/users/${u.id}`, {
        method: "PUT",
        body: JSON.stringify({ pin: pin.trim() === "" ? null : pin.trim() }),
      });
      fetchData();
      showToast?.(pin.trim() ? "Đã đặt PIN" : "Đã xoá PIN");
    } catch (err) {
      alert(err.message || "Lỗi đặt PIN");
    }
  };

  const handleSaveStaff = async () => {
    if (!staffForm.username.trim() || !staffForm.password.trim()) {
      alert("Vui lòng nhập đầy đủ username và password");
      return;
    }
    if (staffForm.password.length < 6) {
      alert("Mật khẩu phải ít nhất 6 ký tự");
      return;
    }
    try {
      await apiAuth("/api/admin/users", { method: "POST", body: JSON.stringify(staffForm) });
      setShowStaffModal(false);
      fetchData();
    } catch (err) {
      if (err.status === 400) alert("Tên đăng nhập đã tồn tại");
      else alert("Lỗi tạo nhân viên");
    }
  };

  const deleteUser = async (id) => {
    if (window.confirm("Đã chắc chắn xóa nhân viên?")) {
      try {
        await apiAuth(`/api/admin/users/${id}`, { method: "DELETE" });
        fetchData();
      } catch (err) {
        alert(err.message || "Lỗi xóa nhân viên");
      }
    }
  };

  // ---- Categories CRUD + reorder ----
  const addCategory = () => {
    setEditingCategory(null);
    setCategoryName("");
    setCategoryProductionUnit("kitchen");
    setCategoryAllowAll(true);
    setCategoryToppingIds([]);
    setShowCategoryModal(true);
  };

  const editCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryProductionUnit(cat.production_unit || "kitchen");
    setCategoryAllowAll(cat.allow_all_toppings !== 0 && cat.allow_all_toppings !== false);
    setCategoryToppingIds(cat.allowed_toppings || []);
    setShowCategoryModal(true);
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa danh mục này?")) return;
    try {
      await apiAuth(`/api/admin/categories/${id}`, { method: "DELETE" });
      fetchData();
      showToast("Đã xóa danh mục thành công");
    } catch (err) {
      alert(err.message || "Không thể xóa danh mục (có thể đang có sản phẩm thuộc danh mục này)");
    }
  };

  const handleSaveCategory = async () => {
    if (!categoryName.trim()) return;
    try {
      const payload = {
        name: categoryName.trim(),
        production_unit: categoryProductionUnit,
        allow_all_toppings: categoryAllowAll ? 1 : 0,
        topping_ids: categoryAllowAll ? [] : categoryToppingIds,
      };
      if (editingCategory) {
        await apiAuth(`/api/admin/categories/${editingCategory.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiAuth("/api/admin/categories", { method: "POST", body: JSON.stringify(payload) });
      }
      setShowCategoryModal(false);
      fetchData();
    } catch (err) {
      showToast("Lỗi lưu danh mục: " + err.message);
    }
  };

  const saveCategoryOrder = async (nextCategories) => {
    try {
      await apiAuth("/api/admin/categories/reorder", {
        method: "PUT",
        body: JSON.stringify({ category_ids: nextCategories.map((c) => c.id) }),
      });
    } catch (err) {
      showToast("Không thể lưu thứ tự danh mục");
      fetchData();
    }
  };

  const moveCategory = async (fromId, toId) => {
    if (!fromId || !toId || fromId === toId) return;
    const fromIndex = categories.findIndex((c) => c.id === fromId);
    const toIndex = categories.findIndex((c) => c.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;
    const nextCategories = [...categories];
    const [moved] = nextCategories.splice(fromIndex, 1);
    nextCategories.splice(toIndex, 0, moved);
    setCategories(nextCategories);
    await saveCategoryOrder(nextCategories);
  };

  // ---- Settings ----
  const saveSettings = async (newSettings) => {
    setSettings(newSettings);
    try {
      // Loại bỏ zalo_bot khỏi payload — zalo_bot được quản lý riêng qua saveZaloBot
      const { zalo_bot, ...safeSettings } = newSettings;
      await apiAuth("/api/settings", { method: "POST", body: JSON.stringify(safeSettings) });
    } catch (err) {
      showToast("Lỗi lưu cấu hình");
    }
  };

  const saveZaloBot = async () => {
    try {
      const payload = {
        zalo_bot: {
          enabled: zaloBot.enabled,
          group_chat_id: zaloBot.group_chat_id,
          api_base: zaloBot.api_base,
        },
      };
      if (zaloBot.bot_token) payload.zalo_bot.bot_token = zaloBot.bot_token;
      await apiAuth("/api/admin/settings", { method: "PUT", body: JSON.stringify(payload) });
      setZaloBotDirty(false);
      setZaloBot(prev => ({ ...prev, bot_token: "", bot_token_masked: prev.bot_token ? "..." + prev.bot_token.slice(-4) : prev.bot_token_masked }));
      showToast("Đã lưu cấu hình Zalo Bot");
    } catch (err) {
      showToast("Lỗi lưu Zalo Bot: " + err.message);
    }
  };

  const testZaloBot = async () => {
    setZaloTesting(true);
    setZaloTestResult(null);
    try {
      const res = await apiAuth("/api/admin/zalo-bot/test", { method: "POST" });
      setZaloTestResult(res);
    } catch (err) {
      setZaloTestResult({ ok: false, message: err.message });
    } finally {
      setZaloTesting(false);
    }
  };

  const normalizeText = (value) => removeAccents(value.toLowerCase());

  const filteredProducts = products.filter((product) => {
    const matchesStatus = productTab === "active" ? !!product.available : !product.available;
    if (!matchesStatus) return false;
    const matchesCategory = selectedCategoryId === "all" || String(product.category_id) === selectedCategoryId;
    if (!matchesCategory) return false;
    const name = normalizeText(product.name || "");
    const query = normalizeText(searchQuery);
    return name.includes(query);
  });

  return (
    <div className={`${embedded ? "h-full min-h-0" : "min-h-screen"} bg-gray-50 flex flex-col md:flex-row`}>
      {/* Sidebar Admin - Hidden on Mobile */}
      <aside className={`hidden md:flex md:w-56 lg:w-72 bg-white border-r shadow-sm flex-col ${embedded ? "" : "h-screen fixed z-10"}`}>
        <div className="p-6 lg:p-8 border-b flex items-center space-x-3">
          <div className="bg-primary-600 p-2.5 rounded-2xl text-white shadow-lg shadow-primary-100"><Icon name="settings" className="w-6 h-6" /></div>
          <h1 className="font-black text-xl lg:text-2xl tracking-tight text-gray-800">Cài đặt</h1>
        </div>
        <nav className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-3">
          {[
            { id: "products", label: "Sản phẩm", icon: "package" },
            { id: "tables", label: "Danh sách Bàn", icon: "layout" },
            { id: "categories", label: "Danh mục", icon: "layout-grid" },
            { id: "orders", label: "Đơn hàng", icon: "clipboard-list" },
            { id: "staff", label: "Tài khoản", icon: "users" },
            { id: "settings", label: "Cấu hình chung", icon: "settings" },
            { id: "reports", label: "Báo cáo", icon: "bar-chart-2" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`w-full flex items-center space-x-4 p-4 rounded-2xl transition-all text-base ${tab === item.id ? "bg-primary-50 text-primary-600 font-black shadow-sm" : "text-gray-500 hover:bg-gray-50 font-bold"}`}
            >
              <Icon name={item.icon} className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 min-w-0 p-4 md:p-6 lg:p-10 ${embedded ? "pb-10 min-h-0 overflow-y-auto" : "pb-24 md:pb-10 md:ml-56 lg:ml-72"}`}>
        {embedded && (
          <div className="md:hidden mb-4 overflow-x-auto">
            <div className="flex min-w-max gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-sm">
              {[
                { id: "products", label: "Sản phẩm" }, { id: "tables", label: "Bàn" },
                { id: "categories", label: "Danh mục" }, { id: "orders", label: "Đơn hàng" },
                { id: "staff", label: "Tài khoản" }, { id: "settings", label: "Cấu hình" },
                { id: "reports", label: "Báo cáo" },
              ].map((item) => (
                <button key={item.id} onClick={() => setTab(item.id)}
                  className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${tab === item.id ? "bg-primary-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col md:flex-row md:flex-wrap justify-between items-start md:items-center mb-4 md:mb-8 lg:mb-10 gap-3 md:gap-4 overflow-x-hidden">
          <div>
            <h2 className="text-lg md:text-2xl lg:text-3xl font-black text-gray-800 tracking-tight">
              {tab === "products" ? "Sản phẩm" : tab === "tables" ? "Bàn" : tab === "categories" ? "Danh mục" : tab === "orders" ? "Đơn hàng" : tab === "reports" ? "Báo cáo thống kê" : tab === "settings" ? "Cấu hình" : "Tài khoản"}
            </h2>
            <p className="hidden md:block text-gray-500 font-medium mt-1 text-sm">Cập nhật và theo dõi các thông số hệ thống</p>
          </div>
          {!["orders", "reports", "settings"].includes(tab) && (
            <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto min-w-0">
              <button
                onClick={() => {
                  if (tab === "tables") addTable();
                  else if (tab === "products") addProduct();
                  else if (tab === "staff") addStaff();
                  else if (tab === "categories") addCategory();
                }}
                className="w-full md:w-auto bg-primary-600 text-white px-4 md:px-6 lg:px-8 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] font-black flex items-center justify-center space-x-2 md:space-x-3 shadow-lg md:shadow-2xl shadow-primary-200 lg:hover:scale-105 transition-transform"
              >
                <Icon name="plus" className="w-5 h-5" />
                <span className="uppercase text-xs md:text-sm tracking-widest">Thêm {tab === "products" ? "món" : tab === "tables" ? "bàn" : tab === "categories" ? "mục" : "NV"}</span>
              </button>
              {tab === "tables" && (
                <button onClick={downloadAllQR}
                  className="w-full md:w-auto bg-emerald-600 text-white px-4 md:px-6 lg:px-8 py-3 md:py-4 rounded-xl md:rounded-[1.5rem] font-black flex items-center justify-center space-x-2 md:space-x-3 shadow-lg md:shadow-2xl shadow-emerald-200 lg:hover:scale-105 transition-transform"
                >
                  <Icon name="download" className="w-5 h-5" />
                  <span className="uppercase text-xs md:text-sm tracking-widest">Tải tất cả QR</span>
                </button>
              )}
            </div>
          )}
          {tab === "orders" && <div className="w-[180px]"></div>}
        </div>

        {tab === "products" && (
          <div className="mb-6 space-y-3">
            <div className="flex p-1 bg-gray-200/50 rounded-xl w-fit">
              <button onClick={() => setProductTab("active")}
                className={`px-6 py-2.5 rounded-lg text-sm font-black transition-all ${productTab === "active" ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                Đang kinh doanh
              </button>
              <button onClick={() => setProductTab("inactive")}
                className={`px-6 py-2.5 rounded-lg text-sm font-black transition-all ${productTab === "inactive" ? "bg-white text-red-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                Tạm ngưng
              </button>
            </div>
            <div className="flex flex-col md:flex-row gap-2 md:gap-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên sản phẩm"
                className="w-full md:w-72 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary-500"
              />
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full md:w-64 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:border-primary-500"
              >
                <option value="all">Tất cả danh mục</option>
                {categories.map((category) => (
                  <option key={category.id} value={String(category.id)}>{category.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}
        {tab === "categories" && (
          <div className="mb-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs md:text-sm font-bold text-gray-600">
              Kéo thả danh mục để sắp xếp thứ tự hiển thị trong POS (Quầy luôn ở trên Bếp).
            </p>
          </div>
        )}

        {tab !== "reports" && tab !== "settings" && (
          <div className="bg-white rounded-xl md:rounded-[2.5rem] shadow-lg md:shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b hidden md:table-header-group">
                  {tab === "products" ? (
                    <tr>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Món</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Danh mục</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right">Giá</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right">Hành động</th>
                    </tr>
                  ) : tab === "tables" ? (
                    <tr>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Tên Bàn</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right">Hành động</th>
                    </tr>
                  ) : tab === "categories" ? (
                    <tr>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest w-16">Kéo</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Tên danh mục</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Đơn vị</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right">Hành động</th>
                    </tr>
                  ) : tab === "orders" ? (
                    <tr>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Mã đơn</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Loại</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest hidden md:table-cell">Bàn / Vị trí</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Tổng tiền</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Thời gian</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right">Chi tiết</th>
                    </tr>
                  ) : (
                    <tr>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Họ và Tên</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Tên đăng nhập</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest">Vai trò</th>
                      <th className="p-6 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right">Hành động</th>
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {tab === "products" ? filteredProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 md:p-6">
                        <div className="flex items-center space-x-2 md:space-x-4">
                          <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-white border border-gray-100 overflow-hidden shadow-inner flex-shrink-0 flex items-center justify-center">
                            {p.image_url
                              ? <OptimizedImg src={p.image_url} className="w-full h-full object-cover" alt={p.name} />
                              : <span className="text-gray-300"><Icon name="utensils" className="w-5 h-5" /></span>}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-black text-gray-800 text-xs md:text-base truncate">{p.name}</span>
                            {p.is_topping ? <span className="text-[8px] md:text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 md:px-2 py-0.5 rounded-md w-fit mt-0.5 md:mt-1">TOPPING</span> : null}
                            <span className="md:hidden text-[10px] text-gray-500 font-bold mt-0.5">{categories.find((c) => c.id === p.category_id)?.name}</span>
                            <span className="md:hidden text-xs font-black text-primary-600 mt-0.5">{Number(p.price).toLocaleString()}đ</span>
                            <span className={`md:hidden text-[9px] font-black uppercase tracking-widest mt-1 w-fit px-2 py-0.5 rounded-full ${p.available ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"}`}>
                              {p.available ? "Đang kinh doanh" : "Tạm ngưng"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell p-6 text-gray-500 font-bold text-sm">{categories.find((c) => c.id === p.category_id)?.name}</td>
                      <td className="hidden md:table-cell p-6 font-black text-primary-600 text-lg text-right">{Number(p.price).toLocaleString()}đ</td>
                      <td className="p-2 md:p-6 text-right">
                        <div className="flex justify-end gap-1.5 md:gap-3">
                          <button onClick={() => editProduct(p)} className="p-2 md:p-3 text-blue-500 hover:bg-blue-50 rounded-lg md:rounded-xl transition-all" title="Chỉnh sửa">
                            <Icon name="pencil" className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                          <button
                            onClick={() => toggleProductAvailability(p)}
                            className={`p-2 md:p-3 rounded-lg md:rounded-xl transition-all ${p.available ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}`}
                            title={p.available ? "Tạm ngưng" : "Khôi phục"}
                          >
                            <Icon name={p.available ? "pause-circle" : "play-circle"} className="w-4 h-4 md:w-5 md:h-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : tab === "tables" ? tables.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 md:p-6 font-black text-gray-800 text-sm md:text-lg">{t.name}</td>
                      <td className="p-2 md:p-6 text-right">
                        <div className="flex justify-end space-x-1 md:space-x-3">
                          <button onClick={() => setQrTable(t)} className="p-2 md:p-3 text-emerald-500 hover:bg-emerald-50 rounded-lg md:rounded-xl transition-all" title="Tải QR Code"><Icon name="download" className="w-4 h-4 md:w-5 md:h-5" /></button>
                          <button onClick={() => editTable(t)} className="p-2 md:p-3 text-blue-500 hover:bg-blue-50 rounded-lg md:rounded-xl transition-all"><Icon name="pencil" className="w-4 h-4 md:w-5 md:h-5" /></button>
                          <button onClick={() => deleteTable(t.id)} className="p-2 md:p-3 text-red-500 hover:bg-red-50 rounded-lg md:rounded-xl transition-all"><Icon name="trash-2" className="w-4 h-4 md:w-5 md:h-5" /></button>
                        </div>
                      </td>
                    </tr>
                  )) : tab === "orders" ? orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 md:p-6 font-black text-gray-800 text-xs md:text-base">#{o.id}</td>
                      <td className="p-3 md:p-6">
                        {o.order_type === "ship" && <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[9px] font-black uppercase rounded-full">SHIP</span>}
                        {o.order_type === "takeaway" && <span className="px-2 py-1 bg-orange-100 text-orange-700 text-[9px] font-black uppercase rounded-full">MANG VỀ</span>}
                        {(!o.order_type || o.order_type === "dine_in") && <span className="text-[9px] font-black text-gray-400 uppercase">BÀN</span>}
                      </td>
                      <td className="hidden md:table-cell p-3 md:p-6">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-800 text-xs md:text-base">{o.table_name}</span>
                          <span className="text-[9px] md:text-[10px] font-black text-primary-500 uppercase">Vị trí {o.table_position}</span>
                        </div>
                      </td>
                      <td className="p-3 md:p-6 font-black text-primary-600">{Number(o.total_amount).toLocaleString()}đ</td>
                      <td className="p-3 md:p-6 text-gray-500 text-xs font-bold">{o.created_at ? new Date(o.created_at).toLocaleString("vi-VN") : ""}</td>
                      <td className="p-2 md:p-6 text-right">
                        <button onClick={() => setShowOrderDetails(o)} className="p-2 md:p-3 text-primary-600 hover:bg-primary-50 rounded-lg md:rounded-xl transition-all">
                          <Icon name="eye" className="w-4 h-4 md:w-5 md:h-5" />
                        </button>
                      </td>
                    </tr>
                  )) : tab === "categories" ? categories.map((c) => (
                    <tr
                      key={c.id}
                      draggable
                      onDragStart={(e) => { setDraggingCategoryId(c.id); e.dataTransfer.effectAllowed = "move"; }}
                      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                      onDrop={async (e) => { e.preventDefault(); await moveCategory(draggingCategoryId, c.id); setDraggingCategoryId(null); }}
                      onDragEnd={() => setDraggingCategoryId(null)}
                      className={`transition-colors ${draggingCategoryId === c.id ? "bg-primary-50" : "hover:bg-gray-50/50"}`}
                    >
                      <td className="p-3 md:p-6 text-gray-300">
                        <div className="inline-flex items-center justify-center rounded-lg bg-gray-50 p-2 border border-gray-100 cursor-grab active:cursor-grabbing">
                          <Icon name="grip-vertical" className="w-4 h-4" />
                        </div>
                      </td>
                      <td className="p-3 md:p-6 font-black text-gray-800 text-sm md:text-lg">{c.name}</td>
                      <td className="p-3 md:p-6">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${c.production_unit === "counter" ? "bg-blue-100 text-blue-600" : "bg-orange-100 text-orange-600"}`}>
                          {c.production_unit === "counter" ? "Quầy" : "Bếp"}
                        </span>
                      </td>
                      <td className="p-2 md:p-6 text-right">
                        <div className="flex justify-end space-x-1 md:space-x-3">
                          <button onClick={() => editCategory(c)} className="p-2 md:p-3 text-blue-500 hover:bg-blue-50 rounded-lg md:rounded-xl transition-all"><Icon name="pencil" className="w-4 h-4 md:w-5 md:h-5" /></button>
                          <button onClick={() => deleteCategory(c.id)} className="p-2 md:p-3 text-red-500 hover:bg-red-50 rounded-lg md:rounded-xl transition-all"><Icon name="trash-2" className="w-4 h-4 md:w-5 md:h-5" /></button>
                        </div>
                      </td>
                    </tr>
                  )) : users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-3 md:p-6 font-black text-gray-800 text-sm md:text-base">{u.full_name}</td>
                      <td className="hidden md:table-cell p-6 text-gray-500 font-bold text-sm">{u.username}</td>
                      <td className="hidden md:table-cell p-6">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${u.role === "admin" ? "bg-purple-100 text-purple-600" : u.role === "kitchen" ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"}`}>
                          {u.role === "admin" ? "Administrator" : u.role === "kitchen" ? "Bếp" : "Order"}
                        </span>
                      </td>
                      <td className="p-2 md:p-6 text-right">
                        <div className="flex justify-end items-center space-x-1 md:space-x-3">
                          <button onClick={() => editUserPin(u)} title="Đặt/xoá PIN chấm công"
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${u.has_pin ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
                            {u.has_pin ? "PIN ✓" : "Đặt PIN"}
                          </button>
                          <button onClick={() => deleteUser(u.id)} className="p-2 md:p-3 text-red-500 hover:bg-red-50 rounded-lg md:rounded-xl transition-all"><Icon name="trash-2" className="w-4 h-4 md:w-5 md:h-5" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Chấm công Tab */}

        {/* Reports Tab Content */}
        {tab === "reports" && (
          <div className="p-2 md:p-8">
            <Reports />
          </div>
        )}

        {/* Settings Tab Content */}
        {tab === "settings" && (
          <div className="p-2 md:p-8 space-y-8">
            {/* Store Info Settings */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-gray-800">Thông tin quán</h3>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase">Tên quán</label>
                  <input
                    type="text"
                    value={settings.store_name || ""}
                    onChange={(e) => saveSettings({ ...settings, store_name: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold text-gray-800"
                    placeholder="VD: Chè Huệ..."
                  />
                  <p className="text-xs text-gray-400 font-bold mt-1">Hiển thị trên màn hình chào mừng và menu khách hàng</p>
                </div>
              </div>
            </div>

            {/* Wifi Settings */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-gray-800">Thông tin Wifi & QR</h3>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase">Tên Wifi (SSID)</label>
                  <input type="text" value={settings.wifi_ssid || ""}
                    onChange={(e) => saveSettings({ ...settings, wifi_ssid: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold text-gray-800"
                    placeholder="Tên Wifi của quán" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase">Mật khẩu Wifi</label>
                  <input type="text" value={settings.wifi_pass || ""}
                    onChange={(e) => saveSettings({ ...settings, wifi_pass: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold text-gray-800"
                    placeholder="Mật khẩu Wifi" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-xs font-black text-gray-500 uppercase">Facebook Page URL</label>
                  <input type="text" value={settings.facebook_url || ""}
                    onChange={(e) => saveSettings({ ...settings, facebook_url: e.target.value })}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold text-gray-800"
                    placeholder="https://facebook.com/chehue..." />
                  <p className="text-xs text-gray-400 font-bold mt-1">Sẽ hiển thị trong màn hình trang chủ Wifi</p>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-gray-500 italic">* Thông tin Wifi sẽ được in kèm vào mã QR. URL Facebook sẽ hiện ở màn hình Welcome.</p>
                </div>
              </div>
            </div>

            {/* Featured Products */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-gray-800">Giới thiệu món mới</h3>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <div>
                  <p className="font-bold text-gray-700 mb-1">Chọn món để giới thiệu trên màn hình chào mừng</p>
                  <p className="text-sm text-gray-500">Tối đa 4 món. Khách hàng sẽ thấy khi quét mã QR vào lần đầu.</p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value=""
                    onChange={(e) => {
                      const productId = parseInt(e.target.value);
                      if (productId && !settings.featured_products.includes(productId)) {
                        if (settings.featured_products.length >= 4) {
                          alert("Đã chọn tối đa 4 món mới");
                          return;
                        }
                        saveSettings({ ...settings, featured_products: [...settings.featured_products, productId] });
                      }
                      e.target.value = "";
                    }}
                    className="flex-1 px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold text-gray-800 bg-white"
                  >
                    <option value="">Chọn món...</option>
                    {products.filter((p) => p.available && !p.is_topping && !settings.featured_products.includes(p.id)).map((p) => (
                      <option key={p.id} value={p.id}>{p.name} - {Number(p.price).toLocaleString()}đ</option>
                    ))}
                  </select>
                </div>
                {settings.featured_products.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {settings.featured_products.map((productId) => {
                      const product = products.find((p) => p.id === productId);
                      if (!product) return null;
                      return (
                        <span key={productId} className="inline-flex items-center space-x-2 px-3 py-2 bg-white rounded-xl border border-gray-200 shadow-sm">
                          <span className="font-bold text-gray-800 text-sm">{product.name}</span>
                          <button
                            onClick={() => saveSettings({ ...settings, featured_products: settings.featured_products.filter((id) => id !== productId) })}
                            className="text-red-400 hover:text-red-600 transition"
                          >
                            <Icon name="x" className="w-4 h-4" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
                <p className="text-xs text-gray-400 font-bold">* Các món đã chọn sẽ hiển thị trên màn hình chào mừng sau khi khách quét mã QR.</p>
              </div>
            </div>

            {/* Zalo Bot Notification */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-gray-800">🔔 Thông báo Zalo</h3>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <p className="text-sm text-gray-500">Gửi thông báo đơn ship mới vào nhóm Zalo OA Bot.</p>
                <div className="flex items-center gap-3">
                  <label className="text-xs font-black text-gray-500 uppercase">Bật thông báo</label>
                  <button
                    type="button"
                    onClick={() => { setZaloBot(prev => ({ ...prev, enabled: !prev.enabled })); setZaloBotDirty(true); }}
                    className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors"
                    style={{ backgroundColor: zaloBot.enabled ? '#22c55e' : '#d1d5db' }}
                  >
                    <span
                      className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
                      style={{ transform: zaloBot.enabled ? 'translateX(22px)' : 'translateX(4px)' }}
                    />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase">Bot Token</label>
                    <input
                      type="password"
                      value={zaloBot.bot_token}
                      onChange={(e) => { setZaloBot(prev => ({ ...prev, bot_token: e.target.value })); setZaloBotDirty(true); }}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold text-gray-800"
                      placeholder={zaloBot.bot_token_masked ? `Đã lưu (${zaloBot.bot_token_masked})` : "Nhập Bot Token..."}
                    />
                    {zaloBot.bot_token_masked && !zaloBot.bot_token && (
                      <p className="text-xs text-green-600 font-bold">✓ Token đã lưu: {zaloBot.bot_token_masked}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase">Group Chat ID</label>
                    <input
                      type="text"
                      value={zaloBot.group_chat_id}
                      onChange={(e) => { setZaloBot(prev => ({ ...prev, group_chat_id: e.target.value })); setZaloBotDirty(true); }}
                      className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold text-gray-800"
                      placeholder="Nhập Group Chat ID..."
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase">API Base URL</label>
                  <input
                    type="text"
                    value={zaloBot.api_base}
                    onChange={(e) => { setZaloBot(prev => ({ ...prev, api_base: e.target.value })); setZaloBotDirty(true); }}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold text-gray-800"
                    placeholder="https://bot-api.zaloplatforms.com"
                  />
                </div>
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={saveZaloBot}
                    disabled={!zaloBotDirty}
                    className={`px-6 py-2.5 rounded-xl font-bold text-sm transition ${zaloBotDirty ? 'bg-primary-600 text-white hover:bg-primary-700 shadow-lg' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                  >
                    💾 Lưu cấu hình Zalo
                  </button>
                  <button
                    onClick={testZaloBot}
                    disabled={zaloTesting}
                    className="px-6 py-2.5 rounded-xl font-bold text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition disabled:opacity-50"
                  >
                    {zaloTesting ? "⏳ Đang gửi thử..." : "🧪 Gửi thử"}
                  </button>
                </div>
                {zaloTestResult && (
                  <div className={`p-3 rounded-xl text-sm font-bold ${zaloTestResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {zaloTestResult.ok ? '✅ ' : '❌ '}{zaloTestResult.message}
                    {zaloTestResult.debug_message && (
                      <pre className="mt-2 text-xs font-mono whitespace-pre-wrap text-gray-600 bg-white p-2 rounded-lg border">{zaloTestResult.debug_message}</pre>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Server hệ thống — chỉ hoạt động trên local Node server */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-gray-800">Hệ thống server</h3>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <div>
                  <p className="font-bold text-gray-700">Phiên bản đang chạy</p>
                  <p className="text-sm text-gray-500 font-mono mt-1">
                    {serverInfo
                      ? `${serverInfo.commit} (${serverInfo.branch}) — ${serverInfo.message}`
                      : "Không lấy được — chỉ hỗ trợ trên server local Node (server/server.mjs)"}
                  </p>
                  <p className="text-xs text-gray-400 font-mono mt-1">
                    UI build: {APP_BUILD} · Font: {fontOk ?? "…"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={checkServerUpdate}
                    disabled={updateState !== "idle"}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition disabled:opacity-50"
                  >
                    {updateState === "checking" ? "Đang kiểm tra..." : "Kiểm tra bản mới"}
                  </button>
                  <button
                    onClick={doServerUpdate}
                    disabled={updateState === "updating" || updateState === "restarting"}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-primary-600 text-white hover:bg-primary-700 shadow-lg transition disabled:opacity-50"
                  >
                    {updateState === "updating" ? "Đang cập nhật..." : updateState === "restarting" ? "Đang khởi động lại..." : "Cập nhật & khởi động lại"}
                  </button>
                  <button
                    onClick={doServerRestart}
                    disabled={updateState === "restarting"}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 transition disabled:opacity-50"
                  >
                    Khởi động lại
                  </button>
                  <button
                    onClick={fetchServerLogs}
                    disabled={logsLoading}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 transition disabled:opacity-50"
                  >
                    {logsLoading ? "Đang tải..." : "Xem log"}
                  </button>
                </div>
                {serverLogs && (
                  <div className="space-y-2">
                    {serverLogs.watchdog_log && (
                      <pre className="p-3 rounded-xl text-xs font-mono whitespace-pre-wrap bg-gray-900 text-amber-300 max-h-40 overflow-y-auto">{serverLogs.watchdog_log}</pre>
                    )}
                    <pre className="p-3 rounded-xl text-xs font-mono whitespace-pre-wrap bg-gray-900 text-green-300 max-h-60 overflow-y-auto">{serverLogs.pos_log || "(trống)"}</pre>
                  </div>
                )}
                {updateMsg && (
                  <div className={`p-3 rounded-xl text-sm font-bold ${updateMsg.error ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                    {updateMsg.text}
                  </div>
                )}
              </div>
            </div>

            {/* Đồng bộ trung tâm — chuỗi quán (chỉ trên local Node server) */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-gray-800">Đồng bộ trung tâm (chuỗi quán)</h3>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <p className="text-sm text-gray-500">
                  Đẩy đơn hàng + thực đơn + chấm công lên <b>D1 trên Cloudflare</b> mỗi 60 giây.
                  Mỗi quán cần <b>Mã quán</b> riêng — hệ thống tự kiểm tra không cho 2 máy dùng trùng mã.
                </p>
                <label className="flex items-center gap-3 font-bold text-gray-700">
                  <input type="checkbox" checked={hub.enabled}
                    onChange={(e) => setHub({ ...hub, enabled: e.target.checked })}
                    className="w-5 h-5 accent-primary-600" />
                  Bật đồng bộ
                </label>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setHub({ ...hub, mode: "d1" })}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border ${hub.mode !== "worker" ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200"}`}>
                    D1 trực tiếp (khuyên dùng)
                  </button>
                  <button type="button" onClick={() => setHub({ ...hub, mode: "worker" })}
                    className={`px-4 py-2 rounded-xl text-sm font-bold border ${hub.mode === "worker" ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200"}`}>
                    Hub Worker (cũ)
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Mã quán</label>
                    <input type="text" value={hub.store_id} placeholder="quan-01"
                      onChange={(e) => setHub({ ...hub, store_id: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-mono text-sm" />
                  </div>
                  {hub.mode === "worker" ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Địa chỉ hub</label>
                        <input type="text" value={hub.url} placeholder="https://pos-demo.workers.dev"
                          onChange={(e) => setHub({ ...hub, url: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-mono text-sm" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                          Hub key {hub.api_key_masked && <span className="text-gray-400 normal-case">(đã lưu {hub.api_key_masked})</span>}
                        </label>
                        <input type="password" value={hub.api_key} placeholder="hub_..."
                          onChange={(e) => setHub({ ...hub, api_key: e.target.value })}
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-mono text-sm" />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Database D1</label>
                      <div className="flex gap-2">
                        {hubDbs.length ? (
                          <select value={hub.db_name}
                            onChange={(e) => setHub({ ...hub, db_name: e.target.value })}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 font-mono text-sm">
                            {hub.db_name && !hubDbs.some((d) => d.name === hub.db_name) && (
                              <option value={hub.db_name}>{hub.db_name} (nhập tay)</option>
                            )}
                            {hubDbs.map((d) => (
                              <option key={d.uuid} value={d.name}>{d.name}</option>
                            ))}
                          </select>
                        ) : (
                          <input type="text" value={hub.db_name} placeholder="pos-free"
                            onChange={(e) => setHub({ ...hub, db_name: e.target.value })}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 font-mono text-sm" />
                        )}
                        <button type="button" onClick={loadDbs} disabled={dbBusy}
                          className="px-3 py-2.5 rounded-xl text-sm font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition disabled:opacity-50 whitespace-nowrap">
                          {dbBusy ? "..." : "Tải DS"}
                        </button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <input type="text" value={newDbName} placeholder="tên DB mới, VD: pos-hub"
                          onChange={(e) => setNewDbName(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-xl border border-gray-200 font-mono text-xs" />
                        <button type="button" onClick={createDb} disabled={dbBusy || !newDbName.trim()}
                          className="px-3 py-2 rounded-xl text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200 transition disabled:opacity-50 whitespace-nowrap">
                          + Tạo DB mới
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {hub.mode !== "worker" && (
                  <div className={`p-3 rounded-xl border text-sm ${hub.cf_token_masked ? "bg-blue-50 border-blue-200 text-blue-800" : "bg-amber-50 border-amber-200 text-amber-800"}`}>
                    {hub.cf_token_masked
                      ? <span>Dùng chung <b>CF token của mục "Tên miền riêng"</b> {hub.cf_token_masked}.
                          Token cần thêm quyền <b>Account → D1 (Edit)</b>.</span>
                      : <span><b>Chưa có CF token</b> — nhập token ở mục <b>"Tên miền riêng"</b> bên dưới
                          rồi bấm "Lưu token". Token cần quyền <b>Account → D1 (Edit)</b>.</span>}
                  </div>
                )}
                <div className="flex flex-wrap gap-3">
                  <button onClick={saveHub} disabled={hubSaving}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-primary-600 text-white hover:bg-primary-700 shadow-lg transition disabled:opacity-50">
                    {hubSaving ? "Đang lưu..." : "Lưu cấu hình"}
                  </button>
                  <button onClick={testHub}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition">
                    Kiểm tra kết nối
                  </button>
                  <button onClick={syncHubNow}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-gray-200 text-gray-700 hover:bg-gray-300 transition">
                    Đồng bộ ngay
                  </button>
                </div>
                {hubMsg && (
                  <div className={`p-3 rounded-xl text-sm font-bold ${hubMsg.error ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                    {hubMsg.text}
                  </div>
                )}
                {hubStatus?.at && (
                  <p className="text-xs text-gray-500">
                    Lần sync cuối: {new Date(hubStatus.at).toLocaleString("vi-VN")} — {hubStatus.detail}
                  </p>
                )}
              </div>
            </div>

            {/* Cloudflare Tunnel — POS ra Internet qua domain riêng */}
            <div className="space-y-4">
              <h3 className="text-xl font-black text-gray-800">Tên miền riêng (Cloudflare Tunnel)</h3>
              <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 space-y-4">
                <p className="text-sm text-gray-500">
                  Mở POS ra Internet qua domain riêng (VD: <b>quan1.mybrand.vn</b>) — khách
                  ngoài quán vẫn order được. Cần <b>CF API token</b> quyền
                  <i> Account → Cloudflare Tunnel (Edit)</i> và <i>Zone → DNS (Edit)</i>.
                </p>
                {tunStatus?.configured && (
                  <div className={`p-4 rounded-xl border ${tunStatus.running ? "bg-green-50 border-green-200" : "bg-amber-50 border-amber-200"}`}>
                    <div className="font-black text-sm">
                      {tunStatus.running ? "🟢 Đang chạy" : "🟡 Đã cấu hình, tunnel chưa chạy"}
                    </div>
                    <a href={tunStatus.url} target="_blank" rel="noreferrer"
                      className="text-primary-600 font-bold break-all">{tunStatus.url}</a>
                    {tunStatus.last_exit && (
                      <p className="text-xs text-gray-500 mt-1">
                        Lần thoát cuối: code {tunStatus.last_exit.code}
                        {tunStatus.last_exit.error ? " — " + tunStatus.last_exit.error : ""}
                      </p>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">
                      API token / Global key
                      {tunStatus?.cf_token_masked && <span className="text-green-600 normal-case"> ✓ đã lưu {tunStatus.cf_token_masked}</span>}
                    </label>
                    <input type="password" value={tun.token} placeholder="eyJh... hoặc key hex"
                      onChange={(e) => setTun({ ...tun, token: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-mono text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Email CF (nếu Global key)</label>
                    <input type="text" value={tun.email} placeholder="you@email.com"
                      onChange={(e) => setTun({ ...tun, email: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-mono text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Account ID (tùy chọn)</label>
                    <input type="text" value={tun.account_id} placeholder="để trống = tự lấy"
                      onChange={(e) => setTun({ ...tun, account_id: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-mono text-sm" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Domain</label>
                    {tun.zones.length > 0 ? (
                      <select value={tun.zone_id}
                        onChange={(e) => {
                          const z = tun.zones.find((x) => x.id === e.target.value);
                          setTun({ ...tun, zone_id: e.target.value, zone_name: z?.name || "" });
                        }}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-mono text-sm">
                        <option value="">-- chọn domain --</option>
                        {tun.zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={tun.zone_name} placeholder="mybrand.vn (bấm Tải domain trước)"
                        onChange={(e) => setTun({ ...tun, zone_name: e.target.value })}
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-mono text-sm" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Subdomain</label>
                    <input type="text" value={tun.subdomain} placeholder="quan1"
                      onChange={(e) => setTun({ ...tun, subdomain: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-gray-200 font-mono text-sm" />
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button onClick={saveTunToken} disabled={tunBusy || !tun.token}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-green-100 text-green-700 hover:bg-green-200 transition disabled:opacity-50">
                    {tunBusy ? "Đang lưu..." : "Lưu token"}
                  </button>
                  <button onClick={loadTunZones} disabled={tunBusy || !tun.token}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 transition disabled:opacity-50">
                    {tunBusy ? "Đang xử lý..." : "Tải domain"}
                  </button>
                  <button onClick={setupTunnel} disabled={tunBusy || !tun.token || !tun.zone_name || !tun.subdomain}
                    className="px-5 py-2.5 rounded-xl font-bold text-sm bg-primary-600 text-white hover:bg-primary-700 shadow-lg transition disabled:opacity-50">
                    {tunBusy ? "Đang tạo..." : "Bật tunnel"}
                  </button>
                  {tunStatus?.running && (
                    <button onClick={stopTunnel} disabled={tunBusy}
                      className="px-5 py-2.5 rounded-xl font-bold text-sm bg-red-100 text-red-700 hover:bg-red-200 transition disabled:opacity-50">
                      Tắt tunnel
                    </button>
                  )}
                </div>
                {tunMsg && (
                  <div className={`p-3 rounded-xl text-sm font-bold ${tunMsg.error ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                    {tunMsg.text}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {(tab === "products" ? products : tab === "tables" ? tables : tab === "categories" ? categories : tab === "orders" ? orders : tab === "staff" ? users : []).length === 0 && tab !== "settings" && tab !== "reports" && (
          <div className="p-32 text-center text-gray-300">
            <Icon name="package" className="w-16 h-16 mx-auto mb-6 opacity-20" />
            <p className="font-black uppercase text-xs tracking-widest">Hệ thống chưa có dữ liệu</p>
          </div>
        )}
      </main>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowProductModal(false)}></div>
          <div className="relative bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-gradient-to-r from-primary-50 to-white flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-800 tracking-tight">
                {editingProduct ? "Chỉnh sửa món ăn" : "Thêm món ăn mới"}
              </h3>
              <button onClick={() => setShowProductModal(false)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                <Icon name="x" className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-8 space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Tên món ăn *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="VD: Cà phê sữa đá"
                    className="w-full bg-gray-50 border-2 border-gray-300 focus:border-primary-500 rounded-xl py-4 px-5 text-base font-bold text-gray-800 outline-none transition-all"
                  />
                </div>
                <div className="col-span-4 space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Giá *</label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    placeholder="0"
                    className="w-full bg-gray-50 border-2 border-gray-300 focus:border-primary-500 rounded-xl py-4 px-5 text-base font-bold text-gray-800 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Danh mục</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        const ids = productForm.category_ids.includes(c.id)
                          ? productForm.category_ids.filter((x) => x !== c.id)
                          : [...productForm.category_ids, c.id];
                        setProductForm({ ...productForm, category_ids: ids });
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border-2 ${productForm.category_ids.includes(c.id) ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200 hover:border-primary-400"}`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-black text-gray-500 uppercase tracking-widest pl-1">Hình ảnh</label>
                <div className="h-40 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 overflow-hidden relative group flex items-center justify-center cursor-pointer hover:border-primary-400 transition-all">
                  {productForm.image_url ? (
                    <>
                      <OptimizedImg src={productForm.image_url} className="w-full h-full object-cover" alt="preview" />
                      <label className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-sm font-bold">
                        <Icon name="upload" className="w-6 h-6 mb-1" />
                        Đổi ảnh
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    </>
                  ) : (
                    <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer text-gray-400 hover:text-primary-500 transition-colors">
                      <Icon name="upload" className="w-8 h-8 mb-2" />
                      <span className="text-sm font-bold">Click để chọn ảnh</span>
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Loại sản phẩm</label>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="is_topping"
                      checked={productForm.is_topping}
                      onChange={(e) => setProductForm({ ...productForm, is_topping: e.target.checked })}
                      className="w-5 h-5 accent-primary-600 rounded cursor-pointer"
                    />
                    <label htmlFor="is_topping" className="text-sm font-bold text-gray-700 cursor-pointer">Là Topping (chọn kèm món khác)</label>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest">Bộ phận chế biến</label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setProductForm({ ...productForm, production_unit: "kitchen" })}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${productForm.production_unit === "kitchen" ? "bg-primary-600 text-white shadow-lg" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"}`}
                    >
                      Bếp
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductForm({ ...productForm, production_unit: "counter" })}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${productForm.production_unit === "counter" ? "bg-primary-600 text-white shadow-lg" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-100"}`}
                    >
                      Quầy
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest block mb-1">Trạng thái</label>
                    <span className={`text-sm font-bold ${productForm.available ? "text-green-600" : "text-gray-400"}`}>
                      {productForm.available ? "Đang bán" : "Tạm dừng"}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setProductForm({ ...productForm, available: !productForm.available })}
                    className={`w-14 h-7 rounded-full transition-all relative ${productForm.available ? "bg-primary-600" : "bg-gray-300"}`}
                  >
                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${productForm.available ? "right-1" : "left-1"}`} />
                  </button>
                </div>
              </div>

              {editingProduct && (
                <div className="space-y-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-black text-amber-600 uppercase tracking-widest">Kích thước / Size</label>
                    <span className="text-xs text-amber-500 font-bold italic">Giá size được chọn khi order</span>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {editingProduct.sizes && editingProduct.sizes.map((size) => (
                      <div key={size.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-amber-100 shadow-sm">
                        <div className="flex items-center space-x-3">
                          <span className="font-black text-gray-800">{size.name}</span>
                          <span className="text-sm font-bold text-primary-600">{Number(size.price).toLocaleString()}đ</span>
                        </div>
                        <button type="button" onClick={() => handleDeleteSize(size.id)} className="text-red-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition">
                          <Icon name="trash-2" className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {(!editingProduct.sizes || editingProduct.sizes.length === 0) && (
                      <p className="text-sm text-amber-400 text-center italic py-2">Chưa có size nào</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="text" placeholder="Tên size (VD: L)" className="flex-1 bg-white border border-amber-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none focus:border-amber-400" id="newSizeName" />
                    <input type="number" placeholder="Giá" className="w-24 bg-white border border-amber-200 rounded-lg px-4 py-2.5 text-sm font-bold outline-none focus:border-amber-400" id="newSizePrice" />
                    <button type="button" onClick={handleAddSize} className="px-4 py-2.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition text-sm font-bold">
                      + Thêm
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="p-5 bg-gray-50 border-t flex items-center gap-3">
              {editingProduct && (
                <button
                  type="button"
                  onClick={() => deleteProduct(editingProduct.id)}
                  className="px-4 py-3 bg-white border-2 border-red-200 text-red-600 rounded-xl font-bold text-sm uppercase hover:bg-red-50 transition-all"
                >
                  Xóa
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-bold text-sm uppercase hover:bg-gray-100 transition-all"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveProduct}
                className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-black text-sm uppercase shadow-lg shadow-primary-200 hover:bg-primary-700 transition-all"
              >
                {editingProduct ? "Cập nhật" : "Thêm món"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowCategoryModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-800 tracking-tight">
                {editingCategory ? "Chỉnh sửa danh mục" : "Thêm danh mục mới"}
              </h3>
              <button onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <Icon name="x" className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Tên danh mục</label>
                <input
                  autoFocus
                  type="text"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="Ví dụ: Đồ uống, Khai vị..."
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl py-4 px-6 font-bold text-gray-800 outline-none transition-all"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Đơn vị chế biến</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setCategoryProductionUnit("counter")}
                    className={`py-3 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${categoryProductionUnit === "counter" ? "border-blue-500 bg-blue-50 text-blue-600" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}
                  >
                    Quầy
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryProductionUnit("kitchen")}
                    className={`py-3 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all ${categoryProductionUnit === "kitchen" ? "border-orange-500 bg-orange-50 text-orange-600" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}
                  >
                    Bếp
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Topping cho danh mục</label>
                <button
                  type="button"
                  onClick={() => setCategoryAllowAll(!categoryAllowAll)}
                  className={`w-full py-3 rounded-2xl border-2 font-black text-xs uppercase tracking-widest transition-all text-left px-5 flex items-center justify-between ${categoryAllowAll ? "border-emerald-500 bg-emerald-50 text-emerald-600" : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"}`}
                >
                  <span>Cho phép tất cả topping</span>
                  <span className={`w-10 h-6 rounded-full relative transition-colors ${categoryAllowAll ? "bg-emerald-500" : "bg-gray-300"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${categoryAllowAll ? "left-[18px]" : "left-0.5"}`} />
                  </span>
                </button>
                {!categoryAllowAll && (
                  <div className="bg-gray-50 rounded-2xl p-3 max-h-48 overflow-y-auto space-y-1">
                    {products.filter((p) => p.is_topping && p.available).length === 0 ? (
                      <p className="text-xs text-gray-400 text-center py-2">Chưa có topping nào</p>
                    ) : (
                      products.filter((p) => p.is_topping && p.available).map((t) => {
                        const selected = categoryToppingIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setCategoryToppingIds((prev) => selected ? prev.filter((id) => id !== t.id) : [...prev, t.id])}
                            className={`w-full text-left px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${selected ? "bg-primary-100 text-primary-700 border border-primary-200" : "bg-white text-gray-600 border border-gray-100 hover:bg-gray-100"}`}
                          >
                            <span>{t.name} — {t.price?.toLocaleString()}đ</span>
                            {selected && <Icon name="check" className="w-3.5 h-3.5" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="p-8 bg-gray-50 border-t flex space-x-4">
              <button onClick={() => setShowCategoryModal(false)} className="flex-1 py-4 bg-white border-2 border-gray-200 text-gray-800 rounded-2xl font-black text-xs uppercase hover:bg-gray-100 transition-all">Hủy</button>
              <button onClick={handleSaveCategory} className="flex-1 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all">
                {editingCategory ? "Cập nhật" : "Thêm danh mục"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowTableModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="text-xl font-black text-gray-800 tracking-tight">
                {editingTable ? "Chỉnh sửa bàn" : "Thêm bàn mới"}
              </h3>
              <button onClick={() => setShowTableModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <Icon name="x" className="w-6 h-6" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-2">Tên bàn</label>
                <input
                  autoFocus
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  placeholder="Ví dụ: Bàn 01, Bàn 02..."
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-primary-500 focus:bg-white rounded-2xl py-4 px-6 font-bold text-gray-800 outline-none transition-all"
                />
              </div>
            </div>
            <div className="p-8 bg-gray-50 border-t flex space-x-4">
              <button onClick={() => setShowTableModal(false)} className="flex-1 py-4 bg-white border-2 border-gray-200 text-gray-800 rounded-2xl font-black text-xs uppercase hover:bg-gray-100 transition-all">Hủy</button>
              <button onClick={handleSaveTable} className="flex-1 py-4 bg-primary-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-primary-200 hover:bg-primary-700 transition-all">
                {editingTable ? "Cập nhật" : "Thêm bàn"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setQrTable(null)}></div>
          <div className="relative bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-800">QR Code — {qrTable.name}</h3>
              <button onClick={() => setQrTable(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <Icon name="x" className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center gap-4">
              <div ref={qrContainerRef} className="w-56 h-56 flex items-center justify-center bg-white border border-gray-100 rounded-2xl shadow-inner p-2"></div>
              <p className="text-xs text-gray-500 font-bold text-center break-all px-2">{window.location.origin}/menu/table/{qrTable.id}</p>
              <p className="text-[10px] text-gray-400 font-bold text-center">Khách quét mã QR này để gọi món tại {qrTable.name}</p>
            </div>
            <div className="p-6 bg-gray-50 border-t flex space-x-3">
              <button onClick={() => setQrTable(null)} className="flex-1 py-3 bg-white border-2 border-gray-200 text-gray-800 rounded-2xl font-black text-xs uppercase hover:bg-gray-100 transition-all">Đóng</button>
              <button onClick={() => downloadQR(qrTable)} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase shadow-xl shadow-emerald-200 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2">
                <Icon name="download" className="w-4 h-4" /> Tải PNG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Modal */}
      {showStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowStaffModal(false)}></div>
          <div className="relative bg-white w-full max-w-md rounded-[2rem] shadow-2xl overflow-hidden">
            <div className="p-6 border-b bg-gray-50">
              <h3 className="text-lg font-black text-gray-800">Tạo tài khoản mới</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Tên đăng nhập *</label>
                <input
                  type="text"
                  value={staffForm.username}
                  onChange={(e) => setStaffForm({ ...staffForm, username: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="username"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Mật khẩu * (tối thiểu 6 ký tự)</label>
                <input
                  type="password"
                  value={staffForm.password}
                  onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="******"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Họ tên</label>
                <input
                  type="text"
                  value={staffForm.full_name}
                  onChange={(e) => setStaffForm({ ...staffForm, full_name: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none"
                  placeholder="Nguyễn Văn A"
                />
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">Vai trò *</label>
                <select
                  value={staffForm.role}
                  onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-bold"
                >
                  <option value="staff">Tài khoản Order</option>
                  <option value="kitchen">Tài khoản Bếp</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-black text-gray-500 uppercase mb-2">PIN chấm công (4-6 số, tuỳ chọn)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={staffForm.pin}
                  onChange={(e) => setStaffForm({ ...staffForm, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 outline-none font-mono tracking-widest"
                  placeholder="VD: 1234 — để trống nếu không chấm công"
                />
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t flex space-x-3">
              <button onClick={() => setShowStaffModal(false)} className="flex-1 py-3 text-gray-600 hover:bg-gray-100 rounded-xl font-bold transition">Hủy</button>
              <button onClick={handleSaveStaff} className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-black hover:bg-primary-700 transition">Tạo tài khoản</button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {showOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowOrderDetails(null)}></div>
          <div className="relative bg-white w-full max-w-lg rounded-2xl md:rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="p-4 md:p-8 border-b flex items-start justify-between flex-shrink-0">
              <div>
                <h3 className="text-lg md:text-2xl font-black text-gray-800">Chi tiết đơn #{showOrderDetails.id}</h3>
                <p className="text-xs text-gray-400 mt-1 font-bold uppercase tracking-widest">
                  {showOrderDetails.table_name} {showOrderDetails.order_type === "takeaway" ? "• MANG VỀ" : showOrderDetails.order_type === "ship" ? "• SHIP" : ""}
                </p>
              </div>
              <button onClick={() => setShowOrderDetails(null)} className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-2 rounded-xl transition-colors">
                <Icon name="x" className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 md:p-8 space-y-3 md:space-y-4 overflow-y-auto flex-1">
              {showOrderDetails.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start py-2 md:py-3 border-b border-gray-50 last:border-0 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="w-5 h-5 md:w-6 md:h-6 flex items-center justify-center bg-gray-100 rounded-lg text-[9px] md:text-[10px] font-black text-gray-500 flex-shrink-0">{item.quantity}x</span>
                      <span className="font-black text-gray-800 uppercase text-[11px] md:text-xs truncate">{item.name}</span>
                    </div>
                    {item.toppings?.length > 0 && (
                      <p className="text-[8px] md:text-[9px] text-primary-500 font-bold italic ml-7 md:ml-8 mt-0.5 md:mt-1 truncate">+{item.toppings.join(", ")}</p>
                    )}
                  </div>
                  <span className="font-black text-gray-800 text-xs md:text-sm flex-shrink-0">{(item.price * item.quantity).toLocaleString()}đ</span>
                </div>
              ))}
            </div>
            <div className="p-4 md:p-8 bg-gray-50 border-t flex items-center justify-between flex-shrink-0">
              <span className="text-gray-400 font-black text-[10px] md:text-xs uppercase tracking-widest">Tổng cộng</span>
              <span className="text-xl md:text-2xl font-black text-primary-600 tracking-tighter">{Number(showOrderDetails.total_amount).toLocaleString()}đ</span>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-[60] bg-primary-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium animate-slide-in-right">{toastMsg}</div>
      )}
    </div>
  );
}

// ============ Chấm công (/chamcong) ============
// Màn hình trên máy POS chung: nhân viên BẤM THẺ TÊN để vào ca / tan ca.
// Thẻ xám = ngoài ca, thẻ xanh sáng = đang trong ca. Không cần PIN.
function AttendanceView() {
  const [staff, setStaff] = useState([]);
  const [busyId, setBusyId] = useState(null); // thẻ đang xử lý
  const [result, setResult] = useState(null); // { ok, text }
  const [now, setNow] = useState(Date.now());
  const resultTimer = useRef(null);

  const load = async () => {
    try {
      const r = await fetch(`/api/attendance/staff?_=${Date.now()}`);
      if (r.ok) setStaff(await r.json());
    } catch {}
  };
  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  const fmtElapsed = (from) => {
    const ms = now - new Date(from).getTime();
    if (ms < 0) return "";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    return `${h}h${String(m).padStart(2, "0")}`;
  };
  const fmtTime = (iso) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const flash = (ok, text) => {
    setResult({ ok, text });
    clearTimeout(resultTimer.current);
    resultTimer.current = setTimeout(() => setResult(null), 4000);
  };

  // Bấm thẻ: đang ngoài ca → vào ca; đang trong ca → tan ca
  const toggle = async (s) => {
    if (busyId) return;
    setBusyId(s.id);
    const action = s.checked_in ? "out" : "in";
    // Optimistic: đổi màu ngay, reconcile sau khi server trả lời
    setStaff((prev) => prev.map((p) => p.id === s.id ? { ...p, checked_in: !s.checked_in, check_in_at: !s.checked_in ? new Date().toISOString() : null } : p));
    try {
      const r = await fetch("/api/attendance/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: s.id, action }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        flash(false, data.message || data.error || `Lỗi ${r.status}`);
      }
      // Thành công thì thẻ tự đổi màu — không cần thông báo
    } catch {
      flash(false, "Không kết nối được server");
    }
    setBusyId(null);
    load();
  };

  return (
    <div className="min-h-screen bg-stone-100 p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-gray-800">Chấm công</h1>
            <p className="text-sm text-gray-500 font-medium">
              {new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })}
              {" · "}Bấm vào tên để vào ca / tan ca
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="px-4 py-2 bg-white rounded-xl font-bold text-sm text-gray-600 shadow-sm border border-gray-200 active:scale-95 transition">
              Tải lại
            </button>
          </div>
        </div>

        {result && (
          <div className={`mb-4 p-4 rounded-2xl font-bold text-center transition ${result.ok ? "bg-emerald-50 text-green-700 border border-transparent" : "bg-red-50 text-red-700 border border-red-200"}`}>
            {result.text}
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {staff.map((s) => (
            <button key={s.id} onClick={() => toggle(s)} disabled={busyId === s.id}
              className={`p-5 rounded-2xl border-2 text-left transition-all active:scale-95 disabled:opacity-60 ${
                s.checked_in
                  ? "bg-emerald-600 border-transparent shadow-lg shadow-emerald-200 text-white"
                  : "bg-white border-gray-200 hover:border-gray-300 text-gray-800"
              }`}>
              <div className="flex items-center justify-between gap-2">
                <div className={`font-black truncate ${s.checked_in ? "text-white" : "text-gray-800"}`}>{s.name}</div>
                {busyId === s.id && (
                  <span className={`w-4 h-4 border-2 rounded-full animate-spin flex-shrink-0 ${s.checked_in ? "border-white/40 border-t-white" : "border-gray-300 border-t-gray-600"}`} />
                )}
              </div>
              <div className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${s.checked_in ? "text-emerald-100" : "text-gray-400"}`}>
                {s.role === "admin" ? "Quản lý" : s.role === "kitchen" ? "Bếp" : "Order"}
              </div>
              {s.checked_in ? (
                <div className="mt-3 text-white">
                  <div className="flex items-center gap-1.5 font-black text-sm">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                    Đang làm {s.check_in_at ? fmtElapsed(s.check_in_at) : ""}
                  </div>
                  {s.check_in_at && (
                    <div className="text-[11px] font-bold text-emerald-100 mt-0.5">Vào lúc {fmtTime(s.check_in_at)}</div>
                  )}
                </div>
              ) : s.today ? (
                <div className="mt-3 text-sm">
                  <div className="text-gray-600 font-bold">{fmtTime(s.today.in)} → {fmtTime(s.today.out)}</div>
                  <div className="text-emerald-700 font-black text-xs mt-0.5">Hôm nay: {s.today.hours.toFixed(1)}h</div>
                </div>
              ) : (
                <div className="mt-3 text-gray-400 font-bold text-sm">Ngoài ca</div>
              )}
            </button>
          ))}
          {staff.length === 0 && (
            <p className="col-span-full text-center text-gray-400 py-12 font-medium">Chưa có nhân viên</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ Attendance Admin — /quanly-chamcong ============
// Trang quản lý chấm công RIÊNG, tách khỏi màn chấm công dùng chung.
// Session riêng (key att_admin_token) — đăng nhập POS không mở được
// trang này và ngược lại. Chỉ tài khoản role admin.
const ATT_ADMIN_TOKEN = "att_admin_token";

const attLocalInput = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

function AttendanceAdminView() {
  const [token, setToken] = useState(() => localStorage.getItem(ATT_ADMIN_TOKEN) || "");
  const [admin, setAdmin] = useState(null);
  const [checking, setChecking] = useState(!!localStorage.getItem(ATT_ADMIN_TOKEN));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const todayD = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(todayD);
  const [to, setTo] = useState(todayD);
  const [rows, setRows] = useState(null);
  const [msg, setMsg] = useState(null);
  const [editing, setEditing] = useState(null); // { id, ci, co, note }
  const [tab, setTab] = useState("shifts"); // shifts | staff | month | payroll
  const [usersList, setUsersList] = useState([]);
  const [addingShift, setAddingShift] = useState(null); // { user_id, ci, co }
  const [userModal, setUserModal] = useState(null); // null | { id?, full_name, username, password, role, pin, hourly_rate }
  const [monthPeriod, setMonthPeriod] = useState(todayD.slice(0, 7));
  const [monthRows, setMonthRows] = useState(null);
  const [monthUser, setMonthUser] = useState(null); // { name, user_id } — đang xem chi tiết bảng công
  const [slips, setSlips] = useState([]);
  const [payForm, setPayForm] = useState({ user_id: "", period: todayD.slice(0, 7), hours: "", rate: "", bonus: "0", penalty: "0", note: "" });
  const [slipView, setSlipView] = useState(null); // phiếu đang preview

  useEffect(() => {
    if (!token) return;
    authVerify(token).then((u) => {
      if (u && u.role === "admin") setAdmin(u);
      else localStorage.removeItem(ATT_ADMIN_TOKEN);
      setChecking(false);
    });
  }, []);

  const doLogout = async () => {
    await authLogout(token);
    localStorage.removeItem(ATT_ADMIN_TOKEN);
    setAdmin(null); setToken(""); setRows(null);
  };

  const onLogin = async (e) => {
    e.preventDefault();
    setLoginErr("");
    try {
      const data = await authLogin(username, password);
      if (data.user?.role !== "admin") {
        setLoginErr("Chỉ tài khoản admin mới quản lý chấm công");
        return;
      }
      localStorage.setItem(ATT_ADMIN_TOKEN, data.access_token);
      setToken(data.access_token);
      setAdmin(data.user);
    } catch (err) {
      setLoginErr(err.message || "Đăng nhập thất bại");
    }
  };

  const call = async (p, opts = {}) => {
    const r = await fetch(p, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      if (r.status === 401 || r.status === 403) doLogout();
      throw new Error(j.message || j.error || `Lỗi ${r.status}`);
    }
    return j;
  };

  const load = async () => {
    setMsg(null);
    try {
      setRows(await call(`/api/admin/attendance?from=${from}&to=${to}`));
    } catch (e) {
      setRows([]);
      setMsg({ text: e.message, error: true });
    }
  };
  useEffect(() => { if (admin) load(); }, [admin, from, to]);

  const saveEdit = async () => {
    try {
      await call(`/api/admin/attendance/${editing.id}`, {
        method: "PUT",
        body: JSON.stringify({
          check_in_at: editing.ci ? new Date(editing.ci).toISOString() : undefined,
          check_out_at: editing.co ? new Date(editing.co).toISOString() : null,
          note: editing.note,
        }),
      });
      setEditing(null);
      setMsg({ text: "Đã lưu", error: false });
      load();
      loadMonth();
    } catch (e) {
      setMsg({ text: e.message, error: true });
    }
  };

  const closeShift = async (id) => {
    try {
      await call(`/api/admin/attendance/${id}`, {
        method: "PUT",
        body: JSON.stringify({ check_out_at: new Date().toISOString() }),
      });
      load();
      loadMonth();
    } catch (e) {
      setMsg({ text: e.message, error: true });
    }
  };

  const delRow = async (id) => {
    if (!window.confirm("Xóa lượt chấm công này?")) return;
    try {
      await call(`/api/admin/attendance/${id}`, { method: "DELETE" });
      load();
      loadMonth();
    } catch (e) {
      setMsg({ text: e.message, error: true });
    }
  };

  const loadUsers = async () => {
    try { setUsersList(await call("/api/admin/employees")); }
    catch (e) { setMsg({ text: e.message, error: true }); }
  };
  useEffect(() => { if (admin) loadUsers(); }, [admin]);

  const addShift = async () => {
    if (!addingShift?.user_id || !addingShift?.ci) {
      setMsg({ text: "Chọn nhân viên + giờ vào", error: true });
      return;
    }
    try {
      await call("/api/admin/attendance", {
        method: "POST",
        body: JSON.stringify({
          user_id: Number(addingShift.user_id),
          check_in_at: new Date(addingShift.ci).toISOString(),
          check_out_at: addingShift.co ? new Date(addingShift.co).toISOString() : null,
          note: "nhập tay",
        }),
      });
      setAddingShift(null);
      setMsg({ text: "Đã thêm ca", error: false });
      load();
      loadMonth();
    } catch (e) {
      setMsg({ text: e.message, error: true });
    }
  };

  const saveUser = async () => {
    const u = userModal;
    if (!u.name.trim()) { setMsg({ text: "Nhập tên nhân viên", error: true }); return; }
    const body = {
      name: u.name.trim(),
      hourly_rate: Number(u.hourly_rate) || 0,
      active: u.active !== false,
    };
    try {
      if (u.id) {
        await call(`/api/admin/employees/${u.id}`, { method: "PUT", body: JSON.stringify(body) });
      } else {
        await call("/api/admin/employees", { method: "POST", body: JSON.stringify(body) });
      }
      setUserModal(null);
      setMsg({ text: "Đã lưu nhân viên", error: false });
      loadUsers();
    } catch (e) {
      setMsg({ text: e.message, error: true });
    }
  };

  const delUser = async (id) => {
    if (!window.confirm("Xóa/ẩn nhân viên này? (đã có ca chấm thì chỉ ẩn khỏi màn hình)")) return;
    try {
      await call(`/api/admin/employees/${id}`, { method: "DELETE" });
      loadUsers();
    } catch (e) {
      setMsg({ text: e.message, error: true });
    }
  };

  const loadMonth = async () => {
    try {
      setMonthRows(await call(`/api/admin/attendance?from=${monthPeriod}-01&to=${monthPeriod}-31`));
    } catch (e) {
      setMonthRows([]);
      setMsg({ text: e.message, error: true });
    }
  };
  useEffect(() => { if (admin && tab === "month") loadMonth(); }, [admin, tab, monthPeriod]);

  const loadSlips = async () => {
    try { setSlips(await call("/api/admin/payroll")); } catch { setSlips([]); }
  };
  useEffect(() => { if (admin && tab === "payroll") loadSlips(); }, [admin, tab]);

  const pickPayUser = (id) => {
    const u = usersList.find((x) => x.id === Number(id));
    setPayForm((f) => ({ ...f, user_id: id, rate: u?.hourly_rate ? String(u.hourly_rate) : f.rate }));
  };

  // Lấy danh sách ca của nhân viên trong kỳ — dùng cho tính giờ + in phiếu
  const fetchEmpShifts = async (emp, period) => {
    const list = await call(`/api/admin/attendance?from=${period}-01&to=${period}-31`);
    return list
      .filter((r) => r.user_id === emp.id || r.name === emp.name)
      .map((r) => ({
        date: String(r.check_in_at || "").slice(0, 10),
        in: r.check_in_at, out: r.check_out_at,
        hours: r.check_out_at ? (new Date(r.check_out_at) - new Date(r.check_in_at)) / 3600000 : 0,
      }))
      .sort((a, b) => String(a.in).localeCompare(String(b.in)));
  };

  const calcPayHours = async () => {
    const u = usersList.find((x) => x.id === Number(payForm.user_id));
    if (!u || !payForm.period) return;
    try {
      const shifts = await fetchEmpShifts(u, payForm.period);
      const h = shifts.reduce((a, s) => a + s.hours, 0);
      setPayForm((f) => ({ ...f, hours: h.toFixed(1), _shifts: shifts }));
    } catch (e) {
      setMsg({ text: e.message, error: true });
    }
  };

  const slipData = () => {
    const u = usersList.find((x) => x.id === Number(payForm.user_id));
    const hours = Number(payForm.hours) || 0, rate = Number(payForm.rate) || 0;
    const bonus = Number(payForm.bonus) || 0, penalty = Number(payForm.penalty) || 0;
    return {
      user_name: u?.name || "",
      period: payForm.period, hours, rate, bonus, penalty,
      total: Math.round(hours * rate + bonus - penalty),
      note: payForm.note.trim(),
      shifts: payForm._shifts || [],
    };
  };

  const previewSlip = async () => {
    const u = usersList.find((x) => x.id === Number(payForm.user_id));
    if (!u || !payForm.period) { setMsg({ text: "Chọn nhân viên + kỳ", error: true }); return; }
    // luôn lấy ca mới nhất khi xem phiếu để bảng chấm công đi kèm chính xác
    try {
      const shifts = await fetchEmpShifts(u, payForm.period);
      const d = { ...slipData(), shifts };
      if (!payForm.hours) setPayForm((f) => ({ ...f, hours: shifts.reduce((a, s) => a + s.hours, 0).toFixed(1), _shifts: shifts }));
      setSlipView(d);
    } catch (e) {
      setMsg({ text: e.message, error: true });
    }
  };

  const openSavedSlip = (p) => {
    let shifts = [];
    try { shifts = JSON.parse(p.shifts_json || "[]"); } catch {}
    setSlipView({ ...p, shifts });
  };

  const saveSlip = async () => {
    const d = slipView || slipData();
    if (!d.user_name || !d.period) { setMsg({ text: "Chọn nhân viên + kỳ", error: true }); return; }
    try {
      await call("/api/admin/payroll", { method: "POST", body: JSON.stringify(d) });
      setMsg({ text: "Đã lưu phiếu lương", error: false });
      loadSlips();
    } catch (e) {
      setMsg({ text: e.message, error: true });
    }
  };

  // In bằng cách clone phiếu vào #print-root (display:none) rồi window.print()
  // — khi in ẩn #root, hiện #print-root. Giữ nguyên stylesheet, không cần popup.
  const printSlip = () => {
    const el = document.getElementById("pay-slip");
    if (!el) { window.print(); return; }
    let pr = document.getElementById("print-root");
    if (!pr) {
      pr = document.createElement("div");
      pr.id = "print-root";
      document.body.appendChild(pr);
    }
    pr.innerHTML = el.outerHTML;
    window.print();
  };

  const delSlip = async (id) => {
    if (!window.confirm("Xóa phiếu này?")) return;
    try {
      await call(`/api/admin/payroll/${id}`, { method: "DELETE" });
      loadSlips();
    } catch (e) {
      setMsg({ text: e.message, error: true });
    }
  };

  // ---- Màn đăng nhập riêng ----
  if (checking) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Đang tải...</div></div>;
  }
  if (!admin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-600 to-emerald-900 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-emerald-100 p-4 rounded-full mb-4">
              <Icon name="clock" className="w-8 h-8 text-emerald-600" />
            </div>
            <h1 className="text-2xl font-black text-gray-800">Quản lý chấm công</h1>
            <p className="text-gray-500 mt-2 text-center text-sm">Đăng nhập bằng tài khoản admin</p>
          </div>
          <form onSubmit={onLogin} className="space-y-4">
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Tên đăng nhập admin" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="Mật khẩu" />
            {loginErr && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center">{loginErr}</div>}
            <button type="submit"
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold hover:bg-emerald-700 transition shadow-lg">
              Đăng nhập
            </button>
          </form>
          <a href="/chamcong" className="mt-4 block text-center text-sm font-bold text-gray-400 hover:text-emerald-600">
            ← Về màn chấm công
          </a>
        </div>
      </div>
    );
  }

  const fmtD = (iso) => iso
    ? new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })
    : "—";
  const totals = {};
  for (const r of rows || []) {
    if (!r.check_out_at) continue;
    const h = (new Date(r.check_out_at) - new Date(r.check_in_at)) / 3600000;
    if (h > 0) totals[r.name] = (totals[r.name] || 0) + h;
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 flex flex-wrap items-center gap-3">
          <div className="bg-emerald-100 p-3 rounded-2xl"><Icon name="clock" className="w-6 h-6 text-emerald-600" /></div>
          <div className="flex-1">
            <h1 className="text-xl font-black text-gray-800">Quản lý chấm công</h1>
            <p className="text-xs text-gray-400 font-bold">Admin: {admin.full_name || admin.username}</p>
          </div>
          <a href="/chamcong" className="px-4 py-2 rounded-xl text-xs font-black bg-gray-100 text-gray-600 hover:bg-gray-200 transition">
            Màn chấm công →
          </a>
          <button onClick={doLogout}
            className="px-4 py-2 rounded-xl text-xs font-black bg-red-50 text-red-600 hover:bg-red-100 transition">
            Đăng xuất
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {[["shifts", "Ca làm"], ["staff", "Nhân viên"], ["month", "Bảng công"], ["payroll", "Phiếu lương"]].map(([k, l]) => (
            <button key={k} onClick={() => { setTab(k); if (k === "month") setMonthUser(null); setEditing(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-black transition ${tab === k ? "bg-emerald-600 text-white shadow-lg" : "bg-white text-gray-600 border border-gray-200"}`}>
              {l}
            </button>
          ))}
        </div>

        {msg && (
          <div className={`p-3 rounded-xl text-sm font-bold ${msg.error ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
            {msg.text}
          </div>
        )}

        {tab === "shifts" && (<>
        <div className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-wrap items-center gap-3">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 border rounded-xl text-sm font-bold" />
          <span className="text-gray-400 font-bold">→</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 border rounded-xl text-sm font-bold" />
          <button onClick={() => { setFrom(todayD); setTo(todayD); }}
            className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-black uppercase tracking-wider text-gray-600 hover:bg-gray-200 transition">
            Hôm nay
          </button>
          <button onClick={() => { const d = new Date(Date.now() - 6 * 864e5).toISOString().slice(0, 10); setFrom(d); setTo(todayD); }}
            className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-black uppercase tracking-wider text-gray-600 hover:bg-gray-200 transition">
            7 ngày
          </button>
          <button onClick={() => { const m = todayD.slice(0, 7); setFrom(m + "-01"); setTo(todayD); }}
            className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-black uppercase tracking-wider text-gray-600 hover:bg-gray-200 transition">
            Tháng này
          </button>
          <button onClick={() => setAddingShift({ user_id: usersList[0]?.id || "", ci: "", co: "" })}
            className="ml-auto px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition">
            + Thêm ca
          </button>
        </div>

        {Object.keys(totals).length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Tổng giờ trong kỳ</p>
            <div className="flex flex-wrap gap-2">
              {Object.entries(totals).map(([n, h]) => (
                <span key={n} className="px-4 py-2 bg-emerald-50 rounded-xl font-black text-emerald-700 text-sm">
                  {n}: {h.toFixed(1)}h
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest">Nhân viên</th>
                <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest">Vào ca</th>
                <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest">Tan ca</th>
                <th className="p-4 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right">Giờ công</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((r) => {
                const hrs = r.check_out_at ? (new Date(r.check_out_at) - new Date(r.check_in_at)) / 3600000 : null;
                const isEd = editing?.id === r.id;
                return (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/50 align-top">
                    <td className="p-4 font-bold text-gray-800">{r.name}</td>
                    <td className="p-4 text-gray-600 font-medium">
                      {isEd
                        ? <input type="datetime-local" value={editing.ci}
                            onChange={(e) => setEditing({ ...editing, ci: e.target.value })}
                            className="px-2 py-1 border rounded-lg text-xs" />
                        : fmtD(r.check_in_at)}
                    </td>
                    <td className="p-4 text-gray-600 font-medium">
                      {isEd
                        ? <input type="datetime-local" value={editing.co}
                            onChange={(e) => setEditing({ ...editing, co: e.target.value })}
                            className="px-2 py-1 border rounded-lg text-xs" />
                        : r.check_out_at
                          ? fmtD(r.check_out_at)
                          : <span className="text-emerald-600 font-black text-xs">● Đang trong ca</span>}
                    </td>
                    <td className="p-4 text-right font-black text-gray-800">
                      {hrs != null ? `${hrs.toFixed(1)}h` : "—"}
                    </td>
                    <td className="p-4">
                      <div className="flex justify-end gap-1">
                        {isEd ? (
                          <>
                            <button onClick={saveEdit}
                              className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700">Lưu</button>
                            <button onClick={() => setEditing(null)}
                              className="px-3 py-1.5 rounded-lg text-xs font-black bg-gray-200 text-gray-600">Hủy</button>
                          </>
                        ) : (
                          <>
                            {!r.check_out_at && (
                              <button onClick={() => closeShift(r.id)}
                                className="px-3 py-1.5 rounded-lg text-xs font-black bg-amber-100 text-amber-700 hover:bg-amber-200">Tan ca</button>
                            )}
                            <button onClick={() => setEditing({ id: r.id, ci: attLocalInput(r.check_in_at), co: attLocalInput(r.check_out_at), note: r.note || "" })}
                              className="px-3 py-1.5 rounded-lg text-xs font-black bg-gray-100 text-gray-600 hover:bg-gray-200">Sửa</button>
                            <button onClick={() => delRow(r.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-black bg-red-50 text-red-500 hover:bg-red-100">Xóa</button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows && rows.length === 0 && (
                <tr><td colSpan={5} className="p-12 text-center text-gray-400 font-medium">Chưa có lượt chấm công nào</td></tr>
              )}
              {rows === null && (
                <tr><td colSpan={5} className="p-12 text-center text-gray-400 font-medium">Đang tải...</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </>)}

        {/* ===== Tab Nhân viên ===== */}
        {tab === "staff" && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nhân viên chấm công</p>
                <p className="text-[11px] text-gray-400 mt-1">Chỉ cần tên — hệ thống tự tạo mã. Nhân viên hiện thẻ trên màn chấm công, không phải tài khoản đăng nhập.</p>
              </div>
              <button onClick={() => setUserModal({ name: "", hourly_rate: "", active: true })}
                className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition whitespace-nowrap">
                + Thêm nhân viên
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="p-3 font-black text-gray-400 uppercase text-[10px] tracking-widest">Mã</th>
                    <th className="p-3 font-black text-gray-400 uppercase text-[10px] tracking-widest">Tên nhân viên</th>
                    <th className="p-3 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right">Lương/giờ</th>
                    <th className="p-3 font-black text-gray-400 uppercase text-[10px] tracking-widest">Trạng thái</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.id} className={`border-b border-gray-50 ${u.active ? "" : "opacity-40"}`}>
                      <td className="p-3 text-gray-400 font-mono text-xs">#{u.id}</td>
                      <td className="p-3 font-bold text-gray-800">{u.name}</td>
                      <td className="p-3 text-right font-black">{u.hourly_rate ? `${Number(u.hourly_rate).toLocaleString("vi-VN")}đ` : "—"}</td>
                      <td className="p-3">
                        <button onClick={async () => { try { await call(`/api/admin/employees/${u.id}`, { method: "PUT", body: JSON.stringify({ active: u.active ? 0 : 1 }) }); loadUsers(); } catch (e) { setMsg({ text: e.message, error: true }); } }}
                          className={`px-3 py-1 rounded-lg text-xs font-black ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"}`}>
                          {u.active ? "Đang dùng" : "Đã ẩn"}
                        </button>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <button onClick={() => setUserModal({ id: u.id, name: u.name || "", hourly_rate: u.hourly_rate || "", active: !!u.active })}
                          className="px-3 py-1.5 rounded-lg text-xs font-black bg-gray-100 text-gray-600 hover:bg-gray-200 mr-1">Sửa</button>
                        <button onClick={() => delUser(u.id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-black bg-red-50 text-red-500 hover:bg-red-100">Xóa</button>
                      </td>
                    </tr>
                  ))}
                  {usersList.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-400">Chưa có nhân viên — bấm "+ Thêm nhân viên" để tạo thẻ chấm công</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== Tab Bảng công ===== */}
        {tab === "month" && !monthUser && (
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-end gap-3 mb-4">
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Tháng</p>
                <input type="month" value={monthPeriod} onChange={(e) => { setMonthPeriod(e.target.value); setMonthUser(null); }}
                  className="px-3 py-2 border rounded-xl text-sm font-bold" />
              </div>
              <p className="text-xs text-gray-400 font-medium pb-2">Bấm vào nhân viên để xem &amp; chỉnh sửa từng ca</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50 text-left">
                  <th className="p-3 font-black text-gray-400 uppercase text-[10px] tracking-widest">Nhân viên</th>
                  <th className="p-3 font-black text-gray-400 uppercase text-[10px] tracking-widest">Số ngày</th>
                  <th className="p-3 font-black text-gray-400 uppercase text-[10px] tracking-widest">Số ca</th>
                  <th className="p-3 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right">Tổng giờ</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const byUser = {};
                  for (const r of monthRows || []) {
                    const k = r.name || "?";
                    if (!byUser[k]) byUser[k] = { days: new Set(), shifts: 0, hours: 0, user_id: r.user_id };
                    byUser[k].shifts++;
                    if (r.check_in_at) byUser[k].days.add(String(r.check_in_at).slice(0, 10));
                    if (r.check_out_at) byUser[k].hours += (new Date(r.check_out_at) - new Date(r.check_in_at)) / 3600000;
                  }
                  const entries = Object.entries(byUser);
                  if (!entries.length && monthRows !== null) {
                    return <tr><td colSpan={5} className="p-8 text-center text-gray-400">Không có ca nào trong tháng</td></tr>;
                  }
                  if (monthRows === null) {
                    return <tr><td colSpan={5} className="p-8 text-center text-gray-400">Đang tải...</td></tr>;
                  }
                  return entries.map(([n, v]) => (
                    <tr key={n} onClick={() => setMonthUser({ name: n, user_id: v.user_id })}
                      className="border-b border-gray-50 cursor-pointer hover:bg-emerald-50/50 transition">
                      <td className="p-3 font-bold text-emerald-700">{n}</td>
                      <td className="p-3">{v.days.size}</td>
                      <td className="p-3">{v.shifts}</td>
                      <td className="p-3 text-right font-black text-emerald-700">{v.hours.toFixed(1)}h</td>
                      <td className="p-3 text-right text-gray-300 font-black">›</td>
                    </tr>
                  ));
                })()}
              </tbody>
            </table>
          </div>
        )}

        {/* ===== Bảng công chi tiết 1 nhân viên — sửa/xóa/thêm ca ===== */}
        {tab === "month" && monthUser && (() => {
          const shifts = (monthRows || [])
            .filter((r) => (r.name || "?") === monthUser.name)
            .sort((a, b) => String(a.check_in_at).localeCompare(String(b.check_in_at)));
          const totalH = shifts.reduce((a, r) => a + (r.check_out_at ? (new Date(r.check_out_at) - new Date(r.check_in_at)) / 3600000 : 0), 0);
          const days = new Set(shifts.map((r) => String(r.check_in_at || "").slice(0, 10))).size;
          return (
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <button onClick={() => { setMonthUser(null); setEditing(null); }}
                  className="px-3 py-2 bg-gray-100 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-200 transition">
                  ← Bảng công
                </button>
                <div className="flex-1">
                  <p className="font-black text-gray-800">{monthUser.name}</p>
                  <p className="text-xs text-gray-400 font-bold">Tháng {monthPeriod} · {days} ngày · {shifts.length} ca · {totalH.toFixed(1)}h</p>
                </div>
                <button onClick={() => setAddingShift({ user_id: monthUser.user_id || usersList.find((u) => u.name === monthUser.name)?.id || "", ci: "", co: "" })}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition">
                  + Thêm ca
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="p-3 font-black text-gray-400 uppercase text-[10px] tracking-widest">Ngày</th>
                    <th className="p-3 font-black text-gray-400 uppercase text-[10px] tracking-widest">Vào ca</th>
                    <th className="p-3 font-black text-gray-400 uppercase text-[10px] tracking-widest">Tan ca</th>
                    <th className="p-3 font-black text-gray-400 uppercase text-[10px] tracking-widest text-right">Giờ công</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {shifts.map((r) => {
                    const hrs = r.check_out_at ? (new Date(r.check_out_at) - new Date(r.check_in_at)) / 3600000 : null;
                    const isEd = editing?.id === r.id;
                    return (
                      <tr key={r.id} className="border-b border-gray-50 align-top">
                        <td className="p-3 font-bold text-gray-800 whitespace-nowrap">
                          {r.check_in_at ? new Date(r.check_in_at).toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit" }) : "—"}
                        </td>
                        <td className="p-3 text-gray-600 font-medium">
                          {isEd
                            ? <input type="datetime-local" value={editing.ci}
                                onChange={(e) => setEditing({ ...editing, ci: e.target.value })}
                                className="px-2 py-1 border rounded-lg text-xs" />
                            : fmtD(r.check_in_at)}
                        </td>
                        <td className="p-3 text-gray-600 font-medium">
                          {isEd
                            ? <input type="datetime-local" value={editing.co}
                                onChange={(e) => setEditing({ ...editing, co: e.target.value })}
                                className="px-2 py-1 border rounded-lg text-xs" />
                            : r.check_out_at
                              ? fmtD(r.check_out_at)
                              : <span className="text-emerald-600 font-black text-xs">● Đang trong ca</span>}
                        </td>
                        <td className="p-3 text-right font-black text-gray-800">
                          {hrs != null ? `${hrs.toFixed(1)}h` : "—"}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            {isEd ? (
                              <>
                                <button onClick={saveEdit}
                                  className="px-3 py-1.5 rounded-lg text-xs font-black bg-emerald-600 text-white hover:bg-emerald-700">Lưu</button>
                                <button onClick={() => setEditing(null)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-black bg-gray-200 text-gray-600">Hủy</button>
                              </>
                            ) : (
                              <>
                                {!r.check_out_at && (
                                  <button onClick={() => closeShift(r.id)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-black bg-amber-100 text-amber-700 hover:bg-amber-200">Tan ca</button>
                                )}
                                <button onClick={() => setEditing({ id: r.id, ci: attLocalInput(r.check_in_at), co: attLocalInput(r.check_out_at), note: r.note || "" })}
                                  className="px-3 py-1.5 rounded-lg text-xs font-black bg-gray-100 text-gray-600 hover:bg-gray-200">Sửa</button>
                                <button onClick={() => delRow(r.id)}
                                  className="px-3 py-1.5 rounded-lg text-xs font-black bg-red-50 text-red-500 hover:bg-red-100">Xóa</button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {shifts.length === 0 && (
                    <tr><td colSpan={5} className="p-8 text-center text-gray-400">Không có ca nào trong tháng</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          );
        })()}

        {/* ===== Tab Phiếu lương ===== */}
        {tab === "payroll" && (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Tạo phiếu lương</p>
              <label className="text-xs text-gray-400 font-bold">Nhân viên</label>
              <select value={payForm.user_id} onChange={(e) => pickPayUser(e.target.value)}
                className="w-full px-3 py-2 border rounded-xl text-sm font-bold mb-2">
                <option value="">— chọn —</option>
                {usersList.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
              <label className="text-xs text-gray-400 font-bold">Kỳ lương</label>
              <input type="month" value={payForm.period} onChange={(e) => setPayForm({ ...payForm, period: e.target.value })}
                className="w-full px-3 py-2 border rounded-xl text-sm font-bold mb-2" />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-xs text-gray-400 font-bold">Tổng giờ</label>
                  <input type="number" step="0.1" value={payForm.hours} onChange={(e) => setPayForm({ ...payForm, hours: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-bold" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold">Lương/giờ (đ)</label>
                  <input type="number" value={payForm.rate} onChange={(e) => setPayForm({ ...payForm, rate: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-bold" placeholder="25000" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold">Thưởng (đ)</label>
                  <input type="number" value={payForm.bonus} onChange={(e) => setPayForm({ ...payForm, bonus: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-bold" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-bold">Phạt (đ)</label>
                  <input type="number" value={payForm.penalty} onChange={(e) => setPayForm({ ...payForm, penalty: e.target.value })}
                    className="w-full px-3 py-2 border rounded-xl text-sm font-bold" />
                </div>
              </div>
              <input type="text" value={payForm.note} onChange={(e) => setPayForm({ ...payForm, note: e.target.value })}
                placeholder="Ghi chú (tuỳ chọn)" className="w-full px-3 py-2 border rounded-xl text-sm mb-3" />
              <div className="flex gap-2">
                <button onClick={calcPayHours}
                  className="flex-1 px-3 py-2 bg-gray-100 rounded-xl text-xs font-black text-gray-600 hover:bg-gray-200">
                  Tính giờ từ chấm công
                </button>
                <button onClick={previewSlip}
                  className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700">
                  Xem phiếu
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Phiếu đã lưu</p>
              {slips.map((p) => (
                <div key={p.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0 text-sm">
                  <div className="flex-1">
                    <span className="font-bold text-gray-800">{p.user_name}</span>
                    <span className="text-xs text-gray-400 ml-2">{p.period} — {Number(p.total || 0).toLocaleString("vi-VN")}đ</span>
                  </div>
                  <button onClick={() => openSavedSlip(p)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black bg-gray-100 text-gray-600 hover:bg-gray-200">Xem/In</button>
                  <button onClick={() => delSlip(p.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-black bg-red-50 text-red-500 hover:bg-red-100">Xóa</button>
                </div>
              ))}
              {slips.length === 0 && <p className="text-sm text-gray-400">Chưa có phiếu nào.</p>}
            </div>
          </div>
        )}
      </div>

      {/* ===== Modal thêm ca thủ công ===== */}
      {addingShift && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-black text-gray-800 mb-4">Thêm ca (quên chấm)</h3>
            <label className="text-xs text-gray-400 font-bold">Nhân viên</label>
            <select value={addingShift.user_id} onChange={(e) => setAddingShift({ ...addingShift, user_id: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-sm font-bold mb-2">
              {usersList.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <label className="text-xs text-gray-400 font-bold">Giờ vào</label>
            <input type="datetime-local" value={addingShift.ci} onChange={(e) => setAddingShift({ ...addingShift, ci: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-sm mb-2" />
            <label className="text-xs text-gray-400 font-bold">Giờ ra (để trống = đang làm)</label>
            <input type="datetime-local" value={addingShift.co} onChange={(e) => setAddingShift({ ...addingShift, co: e.target.value })}
              className="w-full px-3 py-2 border rounded-xl text-sm mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setAddingShift(null)}
                className="flex-1 px-3 py-2 bg-gray-100 rounded-xl text-sm font-black text-gray-600">Hủy</button>
              <button onClick={addShift}
                className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-black">Thêm</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Modal sửa/thêm nhân viên ===== */}
      {userModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h3 className="font-black text-gray-800 mb-4">{userModal.id ? `Sửa nhân viên #${userModal.id}` : "Thêm nhân viên"}</h3>
            <label className="text-xs text-gray-400 font-bold">Tên nhân viên</label>
            <input type="text" value={userModal.name} onChange={(e) => setUserModal({ ...userModal, name: e.target.value })}
              placeholder="VD: Nguyễn Văn A" className="w-full px-3 py-2 border rounded-xl text-sm mb-2" />
            <label className="text-xs text-gray-400 font-bold">Lương theo giờ (đ) — dùng khi tạo phiếu lương</label>
            <input type="number" value={userModal.hourly_rate} onChange={(e) => setUserModal({ ...userModal, hourly_rate: e.target.value })}
              placeholder="25000" className="w-full px-3 py-2 border rounded-xl text-sm mb-4" />
            <div className="flex gap-2">
              <button onClick={() => setUserModal(null)}
                className="flex-1 px-3 py-2 bg-gray-100 rounded-xl text-sm font-black text-gray-600">Hủy</button>
              <button onClick={saveUser}
                className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-black">Lưu</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Phiếu lương preview / in ===== */}
      {slipView && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 overflow-auto">
          <div className="w-full max-w-md">
            <div id="pay-slip" className="bg-white rounded-2xl p-6">
              <h3 className="text-center font-black text-lg text-gray-800">PHIẾU LƯƠNG — {slipView.period}</h3>
              {/* Bảng chấm công chi tiết để nhân viên đối chiếu */}
              {slipView.shifts?.length > 0 && (
                <table className="w-full text-xs mt-4">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="py-1.5 font-black text-gray-400 uppercase text-[10px]">Ngày</th>
                      <th className="py-1.5 font-black text-gray-400 uppercase text-[10px]">Vào</th>
                      <th className="py-1.5 font-black text-gray-400 uppercase text-[10px]">Ra</th>
                      <th className="py-1.5 font-black text-gray-400 uppercase text-[10px] text-right">Giờ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slipView.shifts.map((s, i) => (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="py-1.5">{s.date ? `${s.date.slice(8, 10)}/${s.date.slice(5, 7)}` : "—"}</td>
                        <td className="py-1.5">{s.in ? new Date(s.in).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td className="py-1.5">{s.out ? new Date(s.out).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : "chưa tan"}</td>
                        <td className="py-1.5 text-right font-bold">{s.hours.toFixed(1)}h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <table className="w-full text-sm mt-4">
                <tbody>
                  <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Nhân viên</td><td className="py-2 text-right font-bold">{slipView.user_name}</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Tổng giờ làm</td><td className="py-2 text-right">{slipView.hours}h</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Lương/giờ</td><td className="py-2 text-right">{Number(slipView.rate || 0).toLocaleString("vi-VN")}đ</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Lương chính</td><td className="py-2 text-right">{Math.round((slipView.hours || 0) * (slipView.rate || 0)).toLocaleString("vi-VN")}đ</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Thưởng</td><td className="py-2 text-right text-emerald-600">+{Number(slipView.bonus || 0).toLocaleString("vi-VN")}đ</td></tr>
                  <tr className="border-b border-gray-100"><td className="py-2 text-gray-500">Phạt</td><td className="py-2 text-right text-red-500">-{Number(slipView.penalty || 0).toLocaleString("vi-VN")}đ</td></tr>
                  <tr><td className="py-3 font-black">THỰC LĨNH</td><td className="py-3 text-right font-black text-lg">{Number(slipView.total || 0).toLocaleString("vi-VN")}đ</td></tr>
                  {slipView.note && <tr><td colSpan={2} className="text-xs text-gray-400">Ghi chú: {slipView.note}</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 mt-3 print:hidden">
              <button onClick={() => setSlipView(null)}
                className="flex-1 px-3 py-2 bg-white rounded-xl text-sm font-black text-gray-600">Đóng</button>
              <button onClick={saveSlip}
                className="flex-1 px-3 py-2 bg-emerald-600 text-white rounded-xl text-sm font-black">Lưu phiếu</button>
              <button onClick={printSlip}
                className="flex-1 px-3 py-2 bg-slate-800 text-white rounded-xl text-sm font-black">In / PDF</button>
            </div>
          </div>
        </div>
      )}
      <style>{`#print-root { display: none; } @media print { body > #root { display: none !important; } #print-root { display: block !important; padding: 12px; } #print-root #pay-slip { border-radius: 0; box-shadow: none; } }`}</style>
    </div>
  );
}

// ============ App Root ============
function App() {
  const [mode, setMode] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Init: check URL path
  useEffect(() => {
    const kitchenMatch = window.location.pathname.match(/^\/(kitchen|counter)$/);
    const menuMatch = window.location.pathname.match(/^\/menu\/(?:table\/)?(\d+)/);
    const takeawayMatch = window.location.pathname === "/takeaway";
    const shipMatch = window.location.pathname === "/ship";
    const shipperMatch = window.location.pathname === "/shipper";
    const chamcongMatch = window.location.pathname === "/chamcong";
    const attAdminMatch = window.location.pathname === "/quanly-chamcong";
    if (attAdminMatch) {
      setMode("attadmin");
      setAuthLoading(false);
    } else if (chamcongMatch) {
      setMode("chamcong");
      setAuthLoading(false);
    } else if (kitchenMatch) {
      setMode(kitchenMatch[1]); // "kitchen" or "counter"
      setAuthLoading(false);
    } else if (menuMatch) {
      setMode("public");
      setAuthLoading(false);
    } else if (takeawayMatch) {
      setMode("takeaway");
      setAuthLoading(false);
    } else if (shipMatch) {
      setMode("ship");
      setAuthLoading(false);
    } else if (shipperMatch) {
      setMode("shipper");
      setAuthLoading(false);
    } else {
      // Cashier mode: verify token strictly; if invalid, clear storage and show login
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) { setAuthLoading(false); return; }
      authVerify(token).then((u) => {
        if (u) {
          setUser(u);
          // Keep user cache in sync
          try { localStorage.setItem(USER_KEY, JSON.stringify(u)); } catch {}
        } else {
          // Token invalid or expired → clear session so login is required
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
        setAuthLoading(false);
      });
    }
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) await authLogout(token);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="text-gray-500">Đang tải...</div></div>;
  }

  if (mode === "public") {
    const m = window.location.pathname.match(/^\/menu\/(?:table\/)?(\d+)/);
    return <PublicMenuView tableId={parseInt(m[1], 10)} onLogout={() => {}} />;
  }

  if (mode === "takeaway") {
    return <TakeawayMenuView />;
  }

  if (mode === "ship") {
    return <ShipMenuView />;
  }

  if (mode === "shipper") {
    return <ShipperPortalView />;
  }

  if (mode === "chamcong") {
    return <AttendanceView />;
  }

  if (mode === "attadmin") {
    return <AttendanceAdminView />;
  }

  if (mode === "kitchen" || mode === "counter") {
    return <KitchenView unit={mode} onLogout={handleLogout} />;
  }

  if (!user) return <LoginView onLogin={setUser} />;
  return <SyncProvider><PosApp user={user} onLogout={handleLogout} /></SyncProvider>;
}

// ============ Mount ============
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);