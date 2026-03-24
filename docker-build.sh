#!/usr/bin/env bash
# 一键构建 plane-api + plane-web + plane-admin 镜像，并更新根目录 VERSION。
# 用法:
#   ./docker-build.sh              # VERSION patch +1 后构建
#   ./docker-build.sh 1.0.7        # 指定版本（可写 V1.0.7）
# 环境变量:
#   DOCKER_REGISTRY          默认 ieatlemon
#   DOCKER_PLATFORM          默认 linux/amd64（与 Railway 等云一致；本地可设 linux/arm64 等）
#   DOCKER_PLATFORM_NATIVE=1 不传 --platform，按本机架构构建（更快，勿用于部署到 amd64 云）
#   DOCKER_TAG_LATEST        设为 0 则不打 :latest（默认打版本号 + latest）
#   DOCKER_PUSH              设为 0 则构建后不推送（默认推送；需先 docker login）
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VERSION_FILE="$ROOT/VERSION"

normalize_version() {
  local v="${1#V}"
  v="${v#v}"
  echo "$v" | tr -d ' \n\r\t'
}

read_version_file() {
  if [[ -f "$VERSION_FILE" ]]; then
    normalize_version "$(cat "$VERSION_FILE")"
  else
    echo "1.0.6"
  fi
}

bump_patch() {
  local v="$1"
  if [[ ! "$v" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "error: VERSION 须为 MAJOR.MINOR.PATCH，当前为: $v" >&2
    exit 1
  fi
  local major minor patch
  IFS=. read -r major minor patch <<<"$v"
  echo "$major.$minor.$((patch + 1))"
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  sed -n '2,11p' "$0" | sed 's/^# //'
  exit 0
fi

if [[ $# -ge 1 ]]; then
  NEW_VERSION="$(normalize_version "$1")"
else
  NEW_VERSION="$(bump_patch "$(read_version_file)")"
fi

if [[ ! "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "error: 非法版本号: $NEW_VERSION" >&2
  exit 1
fi

printf '%s\n' "$NEW_VERSION" >"$VERSION_FILE"

REGISTRY="${DOCKER_REGISTRY:-ieatlemon}"
API_IMAGE="${REGISTRY}/plane-api:${NEW_VERSION}"
WEB_IMAGE="${REGISTRY}/plane-web:${NEW_VERSION}"
ADMIN_IMAGE="${REGISTRY}/plane-admin:${NEW_VERSION}"
API_LATEST="${REGISTRY}/plane-api:latest"
WEB_LATEST="${REGISTRY}/plane-web:latest"
ADMIN_LATEST="${REGISTRY}/plane-admin:latest"

PLATFORM_ARGS=()
if [[ "${DOCKER_PLATFORM_NATIVE:-0}" == "1" ]]; then
  :
else
  PLATFORM_ARGS=(--platform "${DOCKER_PLATFORM:-linux/amd64}")
fi

TAG_LATEST_ARGS_API=(-t "$API_IMAGE")
TAG_LATEST_ARGS_WEB=(-t "$WEB_IMAGE")
TAG_LATEST_ARGS_ADMIN=(-t "$ADMIN_IMAGE")
if [[ "${DOCKER_TAG_LATEST:-1}" != "0" ]]; then
  TAG_LATEST_ARGS_API+=(-t "$API_LATEST")
  TAG_LATEST_ARGS_WEB+=(-t "$WEB_LATEST")
  TAG_LATEST_ARGS_ADMIN+=(-t "$ADMIN_LATEST")
fi

echo "=> VERSION=${NEW_VERSION}（已写入 $VERSION_FILE）"
if [[ "${DOCKER_PLATFORM_NATIVE:-0}" == "1" ]]; then
  echo "=> 目标平台: 本机（DOCKER_PLATFORM_NATIVE=1，未指定 --platform）"
else
  echo "=> 目标平台: ${DOCKER_PLATFORM:-linux/amd64}"
fi
if [[ "${DOCKER_TAG_LATEST:-1}" != "0" ]]; then
  echo "=> 构建 API: $API_IMAGE 与 $API_LATEST"
  echo "=> 构建 Web: $WEB_IMAGE 与 $WEB_LATEST"
  echo "=> 构建 Admin: $ADMIN_IMAGE 与 $ADMIN_LATEST"
else
  echo "=> 构建 API: $API_IMAGE"
  echo "=> 构建 Web: $WEB_IMAGE"
  echo "=> 构建 Admin: $ADMIN_IMAGE"
fi

# 使用 command + 函数，避免「docker」与「build」被拆行或别名导致出现 `build: command not found`
docker_build() {
  command docker build "$@"
}

docker_build "${PLATFORM_ARGS[@]}" -f "$ROOT/apps/api/Dockerfile.api" "${TAG_LATEST_ARGS_API[@]}" "$ROOT/apps/api"
docker_build "${PLATFORM_ARGS[@]}" -f "$ROOT/apps/web/Dockerfile.web" "${TAG_LATEST_ARGS_WEB[@]}" "$ROOT"
docker_build "${PLATFORM_ARGS[@]}" -f "$ROOT/apps/admin/Dockerfile.admin" "${TAG_LATEST_ARGS_ADMIN[@]}" "$ROOT"

echo "=> 完成: $API_IMAGE"
echo "=> 完成: $WEB_IMAGE"
echo "=> 完成: $ADMIN_IMAGE"
if [[ "${DOCKER_TAG_LATEST:-1}" != "0" ]]; then
  echo "=> 完成: $API_LATEST"
  echo "=> 完成: $WEB_LATEST"
  echo "=> 完成: $ADMIN_LATEST"
fi

if [[ "${DOCKER_PUSH:-1}" != "0" ]]; then
  echo "=> 推送 $API_IMAGE"
  command docker push "$API_IMAGE"
  echo "=> 推送 $WEB_IMAGE"
  command docker push "$WEB_IMAGE"
  echo "=> 推送 $ADMIN_IMAGE"
  command docker push "$ADMIN_IMAGE"
  if [[ "${DOCKER_TAG_LATEST:-1}" != "0" ]]; then
    echo "=> 推送 $API_LATEST"
    command docker push "$API_LATEST"
    echo "=> 推送 $WEB_LATEST"
    command docker push "$WEB_LATEST"
    echo "=> 推送 $ADMIN_LATEST"
    command docker push "$ADMIN_LATEST"
  fi
  echo "=> 推送完成"
fi
