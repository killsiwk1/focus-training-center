#!/bin/sh
# 从项目根目录执行。需要 JDK 17、Android SDK Platform 35 和 Build Tools 35。
set -eu
: "${ANDROID_HOME:?请指定 Android SDK 目录}"
: "${SIGNING_STORE:?请指定自己的签名密钥库}"
sdk="$ANDROID_HOME/build-tools/35.0.0"
platform="$ANDROID_HOME/platforms/android-35/android.jar"
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage/assets" "$stage/res/drawable-nodpi" "$stage/classes"
cp -R dist/. "$stage/assets/"
patch "$stage/assets/app.js" < platforms/android/assets.patch
cp dist/icon-192.png "$stage/res/drawable-nodpi/icon.png"
"$sdk/aapt2" compile --dir "$stage/res" -o "$stage/res.zip"
"$sdk/aapt2" link -I "$platform" --manifest platforms/android/AndroidManifest.xml -A "$stage/assets" -o "$stage/base.apk" "$stage/res.zip"
javac -encoding UTF-8 -source 8 -target 8 -classpath "$platform" -d "$stage/classes" platforms/android/Main.java
jar cf "$stage/classes.jar" -C "$stage/classes" .
"$sdk/d8" --min-api 26 --lib "$platform" --output "$stage" "$stage/classes.jar"
(cd "$stage" && zip -q base.apk classes.dex)
"$sdk/zipalign" -f 4 "$stage/base.apk" "$stage/aligned.apk"
mkdir -p build
"$sdk/apksigner" sign --ks "$SIGNING_STORE" --out build/focus-android.apk "$stage/aligned.apk"
"$sdk/apksigner" verify --verbose build/focus-android.apk
