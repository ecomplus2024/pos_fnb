package com.posfnb.server;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.res.AssetManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;
import android.webkit.WebView;
import android.webkit.WebChromeClient;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.LinearLayout;
import android.widget.Button;
import android.view.Gravity;

import androidx.core.content.FileProvider;

import org.json.JSONObject;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * Launcher: giải nén code POS lần đầu → start NodeService → WebView → localhost:8787.
 * Watchdog: server chết >2 phút → màn hình lỗi + nút restart.
 * Self-update: check version.json trên GitHub release → tải APK → cài.
 */
public class MainActivity extends Activity {

    private static final String HEALTH_URL = "http://127.0.0.1:8787/api/health";
    private static final String POS_URL = "http://127.0.0.1:8787";
    private static final long POLL_MS = 1500;
    private static final long FAIL_AFTER_MS = 120000;

    private WebView webView;
    private Handler handler;
    private boolean serverUp = false;
    private long downSince = 0;
    private boolean extracting = false;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        handler = new Handler(Looper.getMainLooper());

        webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.getSettings().setAllowFileAccess(false);
        // Server local luôn phục vụ file mới — tắt cache để update nóng có hiệu lực ngay
        webView.getSettings().setCacheMode(android.webkit.WebSettings.LOAD_NO_CACHE);
        webView.setWebChromeClient(new WebChromeClient());
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public void onReceivedError(WebView view, int code, String desc, String url) {
                showStatus("Đang khởi động server…");
                serverUp = false;
            }
        });
        setContentView(webView);
        showStatus("Đang chuẩn bị…");

        new Thread(this::ensureInstalledAndStart, "pos-setup").start();
        pollHealth();
    }

    /** Lần đầu (hoặc sau khi update APK): giải nén assets/pos → filesDir/pos. */
    private void ensureInstalledAndStart() {
        try {
            File posDir = new File(getFilesDir(), "pos");
            File marker = new File(getFilesDir(), "pos.version");
            int vc = BuildConfig.VERSION_CODE;
            int installed = marker.exists() ? readInt(marker) : -1;
            if (installed != vc || !new File(posDir, "server/server.mjs").exists()) {
                extracting = true;
                uiStatus("Đang cài đặt lần đầu…");
                extractAssets("pos", posDir);
                writeFile(marker, String.valueOf(vc).getBytes());
                writeFile(new File(posDir, ".build-version"), String.valueOf(vc).getBytes());
                extracting = false;
            }
        } catch (Exception e) {
            extracting = false;
            final String msg = e.toString();
            handler.post(() -> showFatal("Lỗi cài đặt: " + msg));
            return;
        }
        NodeService.start(this);
        checkSelfUpdate();
    }

    private void extractAssets(String assetPath, File outDir) throws IOException {
        AssetManager am = getAssets();
        String[] children = am.list(assetPath);
        if (children == null || children.length == 0) {
            // file lá
            File out = new File(getFilesDir(), assetPath);
            out.getParentFile().mkdirs();
            try (InputStream in = am.open(assetPath);
                 OutputStream out_ = new FileOutputStream(out)) {
                byte[] buf = new byte[8192];
                int n;
                while ((n = in.read(buf)) > 0) out_.write(buf, 0, n);
            }
            return;
        }
        outDir.mkdirs();
        for (String child : children) {
            extractAssets(assetPath + "/" + child, new File(outDir, child));
        }
    }

    private void pollHealth() {
        handler.postDelayed(() -> {
            new Thread(() -> {
                boolean ok = ping();
                handler.post(() -> {
                    if (ok) {
                        downSince = 0;
                        if (!serverUp) {
                            serverUp = true;
                            setContentView(webView);
                            webView.loadUrl(POS_URL);
                        }
                    } else {
                        serverUp = false;
                        if (!extracting) {
                            if (downSince == 0) downSince = System.currentTimeMillis();
                            if (System.currentTimeMillis() - downSince > FAIL_AFTER_MS) {
                                showFatal("Server POS không phản hồi.");
                            } else {
                                showStatus("Đang khởi động server…");
                            }
                            NodeService.start(this); // service tự respawn node
                        }
                    }
                    pollHealth();
                });
            }).start();
        }, POLL_MS);
    }

    private boolean ping() {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(HEALTH_URL).openConnection();
            c.setConnectTimeout(2000);
            c.setReadTimeout(2000);
            return c.getResponseCode() == 200;
        } catch (Exception e) {
            return false;
        }
    }

    // ---------- Self-update ----------

    private void checkSelfUpdate() {
        try {
            InputStream in = getAssets().open("update_url.txt");
            byte[] buf = new byte[in.available()];
            in.read(buf);
            in.close();
            String url = new String(buf).trim();
            if (url.isEmpty()) return;
            new Thread(() -> fetchVersion(url)).start();
        } catch (Exception ignored) {}
    }

    private void fetchVersion(String url) {
        try {
            HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
            c.setConnectTimeout(8000);
            c.setReadTimeout(8000);
            if (c.getResponseCode() != 200) return;
            byte[] buf = readAll(c.getInputStream());
            JSONObject j = new JSONObject(new String(buf));
            int remote = j.getInt("version_code");
            String apkUrl = j.getString("apk_url");
            if (remote > BuildConfig.VERSION_CODE) downloadAndInstall(apkUrl);
        } catch (Exception ignored) {}
    }

    private void downloadAndInstall(String apkUrl) {
        try {
            File dir = new File(getCacheDir(), "apks");
            dir.mkdirs();
            File apk = new File(dir, "update.apk");
            HttpURLConnection c = (HttpURLConnection) new URL(apkUrl).openConnection();
            c.setConnectTimeout(15000);
            c.setReadTimeout(300000);
            try (InputStream in = c.getInputStream();
                 FileOutputStream out = new FileOutputStream(apk)) {
                byte[] buf = new byte[65536];
                int n;
                while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
            }
            Uri uri = FileProvider.getUriForFile(this,
                "com.posfnb.server.provider", apk);
            Intent i = new Intent(Intent.ACTION_VIEW)
                .setDataAndType(uri, "application/vnd.android.package-archive")
                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            handler.post(() -> startActivity(i));
        } catch (Exception ignored) {}
    }

    private static byte[] readAll(InputStream in) throws IOException {
        java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        int n;
        while ((n = in.read(buf)) > 0) bos.write(buf, 0, n);
        return bos.toByteArray();
    }

    // ---------- UI helpers ----------

    private void uiStatus(String s) {
        handler.post(() -> showStatus(s));
    }

    private void showStatus(String msg) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setBackgroundColor(Color.WHITE);
        ProgressBar pb = new ProgressBar(this);
        TextView tv = new TextView(this);
        tv.setText(msg);
        tv.setGravity(Gravity.CENTER);
        tv.setPadding(32, 24, 32, 24);
        box.addView(pb);
        box.addView(tv);
        setContentView(box);
    }

    private void showFatal(String msg) {
        LinearLayout box = new LinearLayout(this);
        box.setOrientation(LinearLayout.VERTICAL);
        box.setGravity(Gravity.CENTER);
        box.setBackgroundColor(Color.WHITE);
        android.widget.ScrollView sv = new android.widget.ScrollView(this);
        TextView tv = new TextView(this);
        tv.setText(msg + "\n\n--- pos-watchdog.log ---\n"
            + readTail(new File(getFilesDir(), "pos-watchdog.log"), 30)
            + "\n--- pos.log ---\n"
            + readTail(new File(getFilesDir(), "pos.log"), 40));
        tv.setTextIsSelectable(true);
        tv.setPadding(48, 24, 48, 24);
        sv.addView(tv);
        Button btn = new Button(this);
        btn.setText("Khởi động lại + kiểm tra bản mới");
        btn.setOnClickListener(v -> {
            downSince = 0;
            NodeService.start(this);
            checkSelfUpdate(); // nếu GitHub đã có APK mới → tự tải & mở cài đặt
            showStatus("Đang khởi động lại…");
        });
        Button btn2 = new Button(this);
        btn2.setText("Tải code mới nhất (không mất dữ liệu)");
        btn2.setOnClickListener(v -> hotUpdateAndRestart());
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp.gravity = Gravity.CENTER;
        LinearLayout.LayoutParams lp2 = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
        lp2.gravity = Gravity.CENTER;
        lp2.topMargin = 16;
        box.addView(sv, new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
        box.addView(btn, lp);
        box.addView(btn2, lp2);
        setContentView(box);
        // Ngay khi hiện màn lỗi cũng check update — bản APK mới có thể đã fix lỗi
        checkSelfUpdate();
    }

    /**
     * Cứu hộ không cần APK: tải zip repo từ GitHub → ghi đè code (server/, src/,
     * public/, schema.sql, package.json) trong filesDir/pos → restart Node.
     * KHÔNG đụng thư mục data/ → pos.db giữ nguyên.
     */
    private void hotUpdateAndRestart() {
        showStatus("Đang tải code mới nhất từ GitHub…");
        new Thread(() -> {
            try {
                File zip = new File(getCacheDir(), "repo.zip");
                HttpURLConnection c = (HttpURLConnection) new URL(
                    "https://github.com/ecomplus2024/pos_fnb/archive/refs/heads/main.zip"
                ).openConnection();
                c.setConnectTimeout(15000);
                c.setReadTimeout(300000);
                try (InputStream in = c.getInputStream();
                     FileOutputStream out = new FileOutputStream(zip)) {
                    byte[] buf = new byte[65536];
                    int n;
                    while ((n = in.read(buf)) > 0) out.write(buf, 0, n);
                }
                extractRepoZip(zip, new File(getFilesDir(), "pos"));
                zip.delete();
                handler.post(() -> {
                    downSince = 0;
                    NodeService.start(this);
                    showStatus("Đã cập nhật code — đang khởi động lại…");
                });
            } catch (Exception e) {
                handler.post(() -> showStatus("Lỗi tải code: " + e + " — đang thử khởi động lại…"));
                NodeService.start(this);
            }
        }, "pos-hotupdate").start();
    }

    private void extractRepoZip(File zip, File posDir) throws IOException {
        java.util.zip.ZipInputStream zin =
            new java.util.zip.ZipInputStream(new java.io.FileInputStream(zip));
        java.util.zip.ZipEntry e;
        String root = null;
        while ((e = zin.getNextEntry()) != null) {
            String name = e.getName();
            if (root == null) {
                int slash = name.indexOf('/');
                if (slash > 0) root = name.substring(0, slash + 1);
                continue;
            }
            if (!name.startsWith(root)) continue;
            String rel = name.substring(root.length());
            if (rel.isEmpty() || rel.contains("..")) continue;
            // Chỉ ghi đè code — tuyệt đối không đụng data/ (pos.db)
            boolean code = rel.startsWith("server/") || rel.startsWith("src/")
                || rel.startsWith("public/") || rel.equals("schema.sql")
                || rel.equals("package.json");
            if (!code) continue;
            if (rel.startsWith("server/node_modules/") || rel.startsWith("server/data/")
                || rel.startsWith("data/")) continue;
            File out = new File(posDir, rel);
            if (e.isDirectory()) { out.mkdirs(); continue; }
            out.getParentFile().mkdirs();
            try (FileOutputStream fos = new FileOutputStream(out)) {
                byte[] buf = new byte[8192];
                int n;
                while ((n = zin.read(buf)) > 0) fos.write(buf, 0, n);
            }
        }
        zin.close();
    }

    private static String readTail(File f, int maxLines) {
        try {
            byte[] b = new byte[(int) Math.min(f.length(), 32768)];
            java.io.FileInputStream in = new java.io.FileInputStream(f);
            long skip = f.length() - b.length;
            if (skip > 0) in.skip(skip);
            int n = in.read(b); in.close();
            String[] lines = new String(b, 0, Math.max(0, n)).split("\n");
            StringBuilder sb = new StringBuilder();
            for (int i = Math.max(0, lines.length - maxLines); i < lines.length; i++)
                sb.append(lines[i]).append('\n');
            return sb.toString();
        } catch (Exception e) { return "(no log)"; }
    }

    private int readInt(File f) {
        try {
            byte[] b = new byte[(int) f.length()];
            InputStream in = new java.io.FileInputStream(f);
            int n = in.read(b); in.close();
            return Integer.parseInt(new String(b, 0, Math.max(0, n)).trim());
        } catch (Exception e) { return -1; }
    }

    private void writeFile(File f, byte[] data) throws IOException {
        try (FileOutputStream out = new FileOutputStream(f)) { out.write(data); }
    }
}
