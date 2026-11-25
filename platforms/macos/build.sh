#!/bin/sh
# 从项目根目录运行。生成本地签名的通用架构 DMG。
set -eu
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
app="$stage/专注力训练中心.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources" build
cp platforms/macos/Info.plist "$app/Contents/"
cp -R dist "$app/Contents/Resources/site"
clang -fobjc-arc -arch arm64 -arch x86_64 -mmacosx-version-min=11.0 -framework Cocoa platforms/macos/launcher.m -o "$app/Contents/MacOS/FocusCenter"
codesign --force --sign - "$app"
codesign --verify --strict --deep "$app"
ln -s /Applications "$stage/Applications"
hdiutil create -ov -quiet -volname 专注力训练中心 -srcfolder "$stage" -format UDZO build/focus-macos.dmg
