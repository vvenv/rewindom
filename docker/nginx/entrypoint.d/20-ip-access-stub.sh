#!/bin/sh
# nginx 启动前确保 IP 封禁片段存在。
#
# 片段由 app 容器生成（IP_ACCESS_NGINX_EXPORT_PATH），但首次部署时 nginx 可能先于
# app 启动。缺文件时 `include` 会失败，nginx 直接起不来——整站 502，比不封禁严重得多。
# 这里先写一个「谁都不封」的占位，app 起来后覆盖它。
set -e

DIR=/etc/nginx/ip-access
FILE="$DIR/blocklist.conf"

mkdir -p "$DIR"
if [ ! -s "$FILE" ]; then
  printf 'geo $ip_access_blocked {\n    default 0;\n}\n' > "$FILE"
  echo "[ip-access] 已写入占位封禁名单：$FILE"
fi
