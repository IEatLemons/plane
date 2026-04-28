#!/usr/bin/env bash
# 一键构建 plane-api + plane-web + plane-admin 镜像，并更新根目录 VERSION。
# 用法:
#   ./docker-build.sh                # VERSION patch +1 后构建（仅全部成功后写入 VERSION）
#   ./docker-build.sh 1.0.7          # 指定版本（可写 V1.0.7）
#   ./docker-build.sh --check        # 只跑 pnpm check（格式 / oxlint / TS，全仓库；先于 commit/docker 暴露问题）
#   ./docker-build.sh --preflight    # 构建镜像前先 pnpm check，失败则不构建、不写 VERSION
#   ./docker-build.sh -p --dry-run   # 先 check，再只打印将用的版本与镜像（不写 VERSION、不构建）
#   ./docker-build.sh --dry-run      # 只打印版本计划（不跑 check、不构建）
# 环境变量:
#   DOCKER_REGISTRY          默认 ieatlemon
#   DOCKER_PLATFORM          默认 linux/amd64（与 Railway 等云一致；本地可设 linux/arm64 等）
#   DOCKER_PLATFORM_NATIVE=1 不传 --platform，按本机架构构建（更快，勿用于部署到 amd64 云）
#   DOCKER_TAG_LATEST        设为 0 则不打 :latest（默认打版本号 + latest）
#   DOCKER_PUSH              设为 0 则构建后不推送（默认推送；需先 docker login）
#   DOCKER_DRY_RUN=1         等同于 --dry-run
#   DOCKER_PREFLIGHT=1       等同于 --preflight（构建前 pnpm check）
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

print_usage() {
  sed -n '2,17p' "$0" | sed 's/^# //'
}

run_repo_check() {
  echo "=> pnpm check（turbo：各包 format + lint + types；比 git commit 时的 lint-staged 更全面）"
  (cd "$ROOT" && exec pnpm check)
}

CHECK_ONLY=0
PREFLIGHT="${DOCKER_PREFLIGHT:-0}"
DRY_RUN="${DOCKER_DRY_RUN:-0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help)
      print_usage
      exit 0
      ;;
    --check)
      CHECK_ONLY=1
      shift
      ;;
    --preflight | -p)
      PREFLIGHT=1
      shift
      ;;
    --dry-run | -n)
      DRY_RUN=1
      shift
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "error: 未知参数: $1（见 --help）" >&2
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

if [[ "$CHECK_ONLY" == "1" ]]; then
  run_repo_check
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

if [[ "$DRY_RUN" == "1" ]]; then
  if [[ "$PREFLIGHT" == "1" ]]; then
    run_repo_check
  fi
  echo "=> [检测模式] 不写 $VERSION_FILE、不执行 docker build/push"
  echo "=> 将使用的 VERSION=${NEW_VERSION}（当前文件内版本: $(read_version_file)）"
  if [[ "${DOCKER_PLATFORM_NATIVE:-0}" == "1" ]]; then
    echo "=> 目标平台: 本机（DOCKER_PLATFORM_NATIVE=1）"
  else
    echo "=> 目标平台: ${DOCKER_PLATFORM:-linux/amd64}"
  fi
  if [[ "${DOCKER_TAG_LATEST:-1}" != "0" ]]; then
    echo "=> 将打标签: $API_IMAGE, $API_LATEST"
    echo "=> 将打标签: $WEB_IMAGE, $WEB_LATEST"
    echo "=> 将打标签: $ADMIN_IMAGE, $ADMIN_LATEST"
  else
    echo "=> 将打标签: $API_IMAGE"
    echo "=> 将打标签: $WEB_IMAGE"
    echo "=> 将打标签: $ADMIN_IMAGE"
  fi
  if [[ "${DOCKER_PUSH:-1}" != "0" ]]; then
    echo "=> 构建成功后将会推送上述镜像（DOCKER_PUSH 非 0）"
  else
    echo "=> 构建成功后不会推送（DOCKER_PUSH=0）"
  fi
  exit 0
fi

if [[ "$PREFLIGHT" == "1" ]]; then
  run_repo_check
fi

echo "=> 将使用 VERSION=${NEW_VERSION}（全部成功后再写入 $VERSION_FILE）"
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

printf '%s\n' "$NEW_VERSION" >"$VERSION_FILE"
echo "=> 已写入 VERSION=${NEW_VERSION} -> $VERSION_FILE"
