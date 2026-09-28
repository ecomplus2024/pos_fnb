package com.termux.app;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.view.WindowManager;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.File;

/**
 * POSActivity — màn hình chính của "POS Server" app.
 * Fullscreen WebView -> http://localhost:8787 (server Node chạy trong app này).
 *
 * - Chưa cài bootstrap -> mở TermuxActivity để cài (profile hook tự setup POS)
 * - Đã cài -> exec boot script để đảm bảo server chạy -> poll health -> load UI
 * - Mất kết nối -> hiện "đang khởi động" + tự retry
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

    private void ensureServerRunning() {
        new Thread(() -> {
            try {
                new ProcessBuilder(PREFIX + "/bin/bash", "-lc",
                    "bash " + HOME_DIR + "/.termux/boot/start-pos.sh 2>/dev/null || true")
                    .redirectErrorStream(true).start();
            } catch (Exception ignored) {}
        }).start();
    }

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
