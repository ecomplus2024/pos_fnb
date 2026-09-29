package com.posfnb.server;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.system.Os;

import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.Map;

/**
 * Foreground service giữ tiến trình node (libnode.so trong nativeLibraryDir).
 * Process chết → tự respawn (debounce). Log stdout/stderr → filesDir/pos.log
 * (endpoint /api/admin/server-logs đọc file này qua HOME=filesDir).
 */
public class NodeService extends Service {

    private static final int NOTIF_ID = 1;
    private static final String CHANNEL = "pos_server";
    private static final long RESPAWN_MS = 2000;
    private static final long MAX_RESPAWN_GAP_MS = 30000;

    private Process process;
    private Thread monitor;
    private volatile boolean stopping = false;
    private PowerManager.WakeLock wakeLock;
    private long lastSpawnAt = 0;

    public static void start(Context ctx) {
        Intent i = new Intent(ctx, NodeService.class);
        if (Build.VERSION.SDK_INT >= 26) ctx.startForegroundService(i);
        else ctx.startService(i);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startForeground(NOTIF_ID, buildNotification());
        acquireWakeLock();
        if (process == null) spawnNode();
        return START_STICKY;
    }

    private Notification buildNotification() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26) {
            nm.createNotificationChannel(new NotificationChannel(
                CHANNEL, "POS Server", NotificationManager.IMPORTANCE_LOW));
        }
        Intent open = new Intent(this, MainActivity.class);
        PendingIntent pi = PendingIntent.getActivity(this, 0, open,
            PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder b = Build.VERSION.SDK_INT >= 26
            ? new Notification.Builder(this, CHANNEL)
            : new Notification.Builder(this);
        return b.setContentTitle(getString(R.string.notif_title))
            .setContentText(getString(R.string.notif_text))
            .setSmallIcon(R.drawable.ic_launcher)
            .setContentIntent(pi)
            .setOngoing(true)
            .build();
    }

    private void acquireWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "pos:node");
        wakeLock.acquire();
    }

    private synchronized void spawnNode() {
        long now = System.currentTimeMillis();
        long gap = now - lastSpawnAt;
        if (gap < RESPAWN_MS) {
            try { Thread.sleep(RESPAWN_MS - gap); } catch (InterruptedException ignored) {}
        }
        lastSpawnAt = System.currentTimeMillis();

        File libDir = new File(getApplicationInfo().nativeLibraryDir);
        File node = new File(libDir, "libnode.so");
        File home = getFilesDir();
        File posDir = new File(home, "pos");
        File log = new File(home, "pos.log");

        try {
            Os.chmod(node.getAbsolutePath(), 0755);
        } catch (Throwable t) {
            log("chmod node failed: " + t);
        }

        ProcessBuilder pb = new ProcessBuilder(
            node.getAbsolutePath(),
            new File(posDir, "server/server.mjs").getAbsolutePath());
        Map<String, String> env = pb.environment();
        env.put("HOME", home.getAbsolutePath());
        env.put("TMPDIR", getCacheDir().getAbsolutePath());
        env.put("LD_LIBRARY_PATH", libDir.getAbsolutePath());
        env.put("PATH", libDir.getAbsolutePath() + ":/system/bin:/system/xbin");
        env.put("POS_DATA_DIR", new File(home, "data").getAbsolutePath());
        env.put("PORT", "8787");
        env.put("HOST", "0.0.0.0");
        env.put("STORE_NAME", "POS");
        pb.directory(posDir);
        pb.redirectErrorStream(true);
        try {
            pb.redirectOutput(ProcessBuilder.Redirect.appendTo(log));
            process = pb.start();
            log("node started");
        } catch (IOException e) {
            log("spawn failed: " + e);
            process = null;
        }

        if (monitor == null || !monitor.isAlive()) {
            monitor = new Thread(this::monitorLoop, "pos-node-monitor");
            monitor.setDaemon(true);
            monitor.start();
        }
    }

    private void monitorLoop() {
        while (!stopping) {
            Process p = process;
            if (p == null) {
                sleep(RESPAWN_MS);
                spawnNode();
                continue;
            }
            try {
                int code = p.waitFor();
                log("node exited code=" + code);
            } catch (InterruptedException e) {
                return;
            }
            process = null;
            if (stopping) return;
            // Crash loop guard: nếu chết liên tục thì chậm lại
            if (System.currentTimeMillis() - lastSpawnAt > MAX_RESPAWN_GAP_MS) {
                sleep(RESPAWN_MS);
            } else {
                sleep(RESPAWN_MS * 3);
            }
            spawnNode();
        }
    }

    private void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException ignored) {}
    }

    private void log(String msg) {
        String line = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss", Locale.US)
            .format(new Date()) + " [svc] " + msg + "\n";
        try (FileOutputStream fos = new FileOutputStream(
                new File(getFilesDir(), "pos-watchdog.log"), true)) {
            fos.write(line.getBytes());
        } catch (IOException ignored) {}
    }

    @Override
    public void onDestroy() {
        stopping = true;
        Process p = process;
        if (p != null) p.destroy();
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}
