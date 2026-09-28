package com.termux.app;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;
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

/**
 * POSActivity — màn hình chính của "POS Server" app.
 * Fullscreen WebView -> http://localhost:8787 (server Node chạy trong app này).
 *
 * - Chưa cài bootstrap -> mở TermuxActivity để cài (profile hook tự setup POS)
 * - Đã cài -> exec boot script để đảm bảo server chạy -> poll health -> load UI
 * - Mất kết nối -> hiện "đang khởi động" + tự retry
 * - Self-update: check version.json (assets/update_url.txt) -> tải APK -> prompt cài
 */
public class POSActivity extends Activity {
    private static final String PREFIX = "/data/data/com.termux/files/usr";
    private static final String HOME_DIR = "/data/data/com.termux/files/home";
    private static final String POS_URL = "http://localhost:8787";
    private static final String LOADING_HTML =
        "<html><body style='background:#111;color:#eee;display:flex;height:100vh;" +
        "align-items:center;justify-content:center;font-family:sans-serif'>" +
        "<div style='text-align:center'><h2>POS Server</h2><p>Dang khoi dong...</p></div>" +
        "</body></html>";

    private WebView web;
    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable retry = new Runnable() {
        @Override public void run() { web.loadUrl(POS_URL); }
    };

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
        checkApkUpdate();

        web = new WebView(this);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);
        web.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, int errorCode, String description, String failingUrl) {
                view.loadData(LOADING_HTML, "text/html", "utf-8");
                handler.postDelayed(retry, 1500);
            }
        });
        setContentView(web);
        web.loadData(LOADING_HTML, "text/html", "utf-8");
        handler.postDelayed(retry, 1500);
    }

    // ---------------- Server ----------------

    private void ensureServerRunning() {
        new Thread(() -> {
            try {
                new ProcessBuilder(PREFIX + "/bin/bash", "-lc",
                    "bash " + HOME_DIR + "/.termux/boot/start-pos.sh 2>/dev/null || true")
                    .redirectErrorStream(true).start();
            } catch (Exception ignored) {}
        }).start();
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
        if (web != null) handler.postDelayed(retry, 500);
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
