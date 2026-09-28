#!/usr/bin/env python3
# Patch AndroidManifest.xml cua termux-app:
#  - POSActivity thanh LAUNCHER (WebView POS la man hinh chinh)
#  - Bo LAUNCHER/LEANBACK khoi TermuxActivity (van mo duoc qua intent truc tiep)
#  - usesCleartextTraffic=true cho WebView http://localhost
import re, sys

path = sys.argv[1]
m = open(path, encoding="utf-8").read()

# Bo intent-filter LAUNCHER + LEANBACK_LAUNCHER trong TermuxActivity
for cat in ["LAUNCHER", "LEANBACK_LAUNCHER"]:
    pat = re.compile(
        r'\s*<intent-filter>\s*<action android:name="android\.intent\.action\.MAIN"\s*/>'
        r'\s*<category android:name="android\.intent\.category\.' + cat + r'"\s*/>\s*</intent-filter>'
    )
    m2 = pat.sub("", m, count=1)
    if m2 == m:
        print(f"WARN: khong thay intent-filter {cat}", file=sys.stderr)
    m = m2

# usesCleartextTraffic cho http://localhost
if "usesCleartextTraffic" not in m:
    m = m.replace("<application\n", "<application\n", 1)
    m = re.sub(r'(<application\b[^>]*?)>', r'\1\n        android:usesCleartextTraffic="true">', m, count=1)

# Chen POSActivity lam launcher (truoc activity-alias)
pos_block = '''        <activity
            android:name=".app.POSActivity"
            android:label="@string/application_name"
            android:launchMode="singleTask"
            android:configChanges="orientation|screenSize|smallestScreenSize|density|screenLayout|uiMode|keyboard|keyboardHidden|navigation"
            android:resizeableActivity="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
'''
if ".app.POSActivity" not in m:
    m = m.replace("        <activity-alias", pos_block + "        <activity-alias", 1)

open(path, "w", encoding="utf-8").write(m)
print("manifest patched")
