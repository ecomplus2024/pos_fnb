package com.termux.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import androidx.core.content.FileProvider;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * POSActivity — màn hình chính của "POS Server" app.
 * Fullscreen WebView -> http://localhost:8787 (server Node chạy trong app này).
 *
 * - Chưa cài bootstrap -> mở TermuxActivity để cài (profile hook tự setup POS)
 * - Đã cài -> exec boot script để đảm bảo server chạy -> poll health -> load UI
 * - Watchdog: ping /api/health định kỳ; server chết -> tự chạy lại boot script;
 *   chết lâu -> màn hình lỗi có nút Khởi động lại / Mở terminal (xem log)
 * - Mọi sự kiện watchdog ghi vào ~/pos-watchdog.log
 * - Self-update: check version.json (assets/update_url.txt) -> tải APK -> prompt cài
 */
public class POSActivity extends Activity {
    private static final String PREFIX = "/data/data/com.termux/files/usr";
    private static final String HOME_DIR = "/data/data/com.termux/files/home";
    private static final String POS_URL = "http://localhost:8787";
    private static final String HEALTH_URL = POS_URL + "/api/health";
    private static final int WATCHDOG_MS = 8000;      // ping mỗi 8s
    private static final int RESTART_AFTER_FAILS = 2;  // 2 lần fail -> exec lại boot script
    private static final int ERROR_AFTER_FAILS = 15;   // ~2 phút -> hiện màn hình lỗi
    private static final String LOADING_HTML =
        "<html><body style='background:#111;color:#eee;display:flex;height:100vh;" +
        "align-items:center;justify-content:center;font-family:sans-serif'>" +
        "<div style='text-align:center'><h2>POS Server</h2><p>Dang khoi dong...</p></div>" +
        "</body></html>";
    private static final String ERROR_HTML =
        "<html><body style='background:#111;color:#eee;display:flex;height:100vh;" +
        "align-items:center;justify-content:center;font-family:sans-serif'>" +
        "<div style='text-align:center;max-width:80%'>" +
        "<h2>POS Server</h2>" +
        "<p style='color:#f88'>Server khong phan hoi. Log: ~/pos.log</p>" +
        "<button onclick='POS.restartServer()' style='font-size:20px;padding:14px 28px;" +
        "margin:8px;border-radius:10px;border:0;background:#2563eb;color:#fff'>" +
        "Khoi dong lai server</button><br/>" +
        "<button onclick='POS.openTerminal()' style='font-size:16px;padding:10px 22px;" +
        "margin:8px;border-radius:10px;border:1px solid #666;background:#222;color:#eee'>" +
        "Mo terminal xem log</button>" +
        "</div></body></html>";

    private WebView web;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable retry = new Runnable() {
        @Override public void run() { web.loadUrl(POS_URL); }
    };
    private volatile boolean errorScreenShown = false;
    private long lastRestartAttempt = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            | WindowManager.LayoutParams.FLAG_FULLSCREEN);

        // Bootstrap chua duoc cai -> chuyen sang terminal de no tu cai + setup POS
        if (!new File(PREFIX + "/bin/bash").exists()) {
            startActivity(new Intent(this, TermuxActivity.class));
            finish();
            return;
        }

        ensureServerRunning();
        startWatchdog();
        checkApkUpdate();

        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        web.addJavascriptInterface(new PosBridge(), "POS");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                if (!errorScreenShown) {
                    view.loadData(LOADING_HTML, "text/html", "utf-8");
                    handler.postDelayed(retry, 1500);
                }
            }
        });
        setContentView(web);
        web.loadData(LOADING_HTML, "text/html", "utf-8");
        handler.postDelayed(retry, 1500);
    }

    // ---------------- Server ----------------

    private void ensureServerRunning() {
        lastRestartAttempt = System.currentTimeMillis();
        writeWatchdogLog("exec start-pos.sh");
        new Thread(() -> {
            try {
                new ProcessBuilder(PREFIX + "/bin/bash", "-lc",
                    "bash " + HOME_DIR + "/.termux/boot/start-pos.sh 2>/dev/null || true")
                    .redirectErrorStream(true).start();
            } catch (Exception e) {
                writeWatchdogLog("exec failed: " + e);
            }
        }).start();
    }

    // ---------------- Watchdog ----------------
    // Ping /api/health. Server chết -> chạy lại boot script (debounce 30s).
    // Chết > ~2 phút -> màn hình lỗi có nút hành động thay vì xoay tròn mãi.

    private void startWatchdog() {
        new Thread(() -> {
            int fails = 0;
            while (true) {
                boolean ok = pingHealth();
                if (ok) {
                    if (fails > 0) writeWatchdogLog("server up lai sau " + fails + " lan fail");
                    fails = 0;
                    if (errorScreenShown) {
                        errorScreenShown = false;
                        handler.post(() -> web.loadUrl(POS_URL));
                    }
                } else {
                    fails++;
                    if (fails == 2) writeWatchdogLog("server khong phan hoi");
                    if (fails >= RESTART_AFTER_FAILS
                            && System.currentTimeMillis() - lastRestartAttempt > 30000) {
                        writeWatchdogLog("watchdog restart server (fails=" + fails + ")");
                        ensureServerRunning();
                    }
                    if (fails >= ERROR_AFTER_FAILS && !errorScreenShown) {
                        errorScreenShown = true;
                        writeWatchdogLog("hien man hinh loi");
                        handler.post(() -> web.loadData(ERROR_HTML, "text/html", "utf-8"));
                    }
                }
                try { Thread.sleep(WATCHDOG_MS); } catch (InterruptedException ignored) {}
            }
        }, "pos-watchdog").start();
    }

    private boolean pingHealth() {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(HEALTH_URL).openConnection();
            c.setConnectTimeout(3000); c.setReadTimeout(3000);
            boolean ok = c.getResponseCode() == 200;
            c.disconnect();
            return ok;
        } catch (Exception e) {
            return false;
        }
    }

    private void writeWatchdogLog(String msg) {
        try {
            String ts = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US).format(new Date());
            FileOutputStream fos = new FileOutputStream(HOME_DIR + "/pos-watchdog.log", true);
            fos.write(("[watchdog " + ts + "] " + msg + "\n").getBytes());
            fos.close();
        } catch (Exception ignored) {}
    }

    class PosBridge {
        @JavascriptInterface
        public void restartServer() {
            writeWatchdogLog("user bam Khoi dong lai server");
            errorScreenShown = false;
            handler.post(() -> web.loadData(LOADING_HTML, "text/html", "utf-8"));
            ensureServerRunning();
            handler.postDelayed(retry, 3000);
        }
        @JavascriptInterface
        public void openTerminal() {
            writeWatchdogLog("user mo terminal");
            startActivity(new Intent(POSActivity.this, TermuxActivity.class));
        }
    }

    // ---------------- Self-update ----------------
    // Đọc assets/update_url.txt -> GET {version_code, apk_url, notes}
    // versionCode mới hơn -> tải APK -> hệ thống hỏi cài đặt.

    private void checkApkUpdate() {
        new Thread(() -> {
            try {
                String manifestUrl = readAsset("update_url.txt");
                if (manifestUrl == null || manifestUrl.isEmpty()) return;
                String json = httpGet(manifestUrl);
                if (json == null) return;
                int latest = parseIntField(json, "version_code");
                String apkUrl = parseStrField(json, "apk_url");
                if (latest <= 0 || apkUrl == null) return;
                if (latest <= getPackageManager()
                        .getPackageInfo(getPackageName(), 0).versionCode) return;
                writeWatchdogLog("co ban APK moi (versionCode=" + latest + "), dang tai...");
                File apk = download(apkUrl, new File(getCacheDir(), "update.apk"));
                if (apk != null) promptInstall(apk);
            } catch (Exception ignored) {}
        }).start();
    }

    private String readAsset(String name) {
        try {
            BufferedReader r = new BufferedReader(
                new InputStreamReader(getAssets().open(name)));
            String s = r.readLine();
            r.close();
            return s == null ? "" : s.trim();
        } catch (Exception e) { return null; }
    }

    private String httpGet(String u) {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
            c.setConnectTimeout(8000); c.setReadTimeout(8000);
            BufferedReader r = new BufferedReader(new InputStreamReader(c.getInputStream()));
            StringBuilder sb = new StringBuilder();
            for (String line; (line = r.readLine()) != null; ) sb.append(line);
            r.close(); c.disconnect();
            return sb.toString();
        } catch (Exception e) { return null; }
    }

    private File download(String u, File out) {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(u).openConnection();
            c.setConnectTimeout(15000); c.setReadTimeout(60000);
            InputStream in = c.getInputStream();
            FileOutputStream fos = new FileOutputStream(out);
            byte[] buf = new byte[8192];
            for (int n; (n = in.read(buf)) > 0; ) fos.write(buf, 0, n);
            fos.close(); in.close(); c.disconnect();
            return out;
        } catch (Exception e) { return null; }
    }

    private void promptInstall(File apk) {
        handler.post(() -> {
            try {
                Toast.makeText(this, "Co ban cap nhat app — dang cai dat...", Toast.LENGTH_LONG).show();
                Uri uri = FileProvider.getUriForFile(this,
                    getPackageName() + ".updateprovider", apk);
                Intent i = new Intent(Intent.ACTION_VIEW);
                i.setDataAndType(uri, "application/vnd.android.package-archive");
                i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(i);
            } catch (Exception ignored) {}
        });
    }

    private static int parseIntField(String json, String field) {
        String key = "\"" + field + "\"";
        int i = json.indexOf(key);
        if (i < 0) return -1;
        i = json.indexOf(':', i) + 1;
        StringBuilder num = new StringBuilder();
        while (i < json.length()) {
            char c = json.charAt(i++);
            if (Character.isDigit(c)) num.append(c);
            else if (num.length() > 0) break;
        }
        return num.length() == 0 ? -1 : Integer.parseInt(num.toString());
    }

    private static String parseStrField(String json, String field) {
        String key = "\"" + field + "\"";
        int i = json.indexOf(key);
        if (i < 0) return null;
        i = json.indexOf('"', json.indexOf(':', i) + 1);
        if (i < 0) return null;
        int j = json.indexOf('"', i + 1);
        return j < 0 ? null : json.substring(i + 1, j);
    }

    // ---------------- Lifecycle ----------------

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null && !errorScreenShown) handler.postDelayed(retry, 500);
    }

    @Override
    protected void onDestroy() {
        handler.removeCallbacks(retry);
        super.onDestroy();
    }

    @Override
    public void onBackPressed() {
        if (web != null && web.canGoBack()) web.goBack();
        else super.onBackPressed();
    }
}
