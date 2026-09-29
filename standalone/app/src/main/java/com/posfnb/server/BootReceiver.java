package com.posfnb.server;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Tự khởi động server khi mở máy (thay POS-Boot.apk). */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context ctx, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            NodeService.start(ctx);
        }
    }
}
