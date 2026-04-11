#!/usr/bin/env bash
# 一键启动 Plane API：自动创建 apps/api/.venv、按需 pip install、加载 apps/api/.env、
# migrate（默认）后 runserver。跳过迁移：API_SKIP_MIGRATE=1 pnpm start:api
# 若在宿主机/devcontainer 跑本脚本而 Postgres 只在 docker 映射端口：apps/api/.env 中 POSTGRES_HOST / DATABASE_URL 主机应用 127.0.0.1，并先启动 plane-resources（docker compose up -d plane-db）。
set -euo pipefail

API_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$API_ROOT"

ENV_FILE="$API_ROOT/.env"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck source=/dev/null
  source "$ENV_FILE"
  set +a
else
  echo "warn: 未找到 $ENV_FILE（可复制 apps/api/.env.example）。" >&2
fi

PORT="${PORT:-8000}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "error: 未找到 python3，请先安装 Python（建议 3.12+）。" >&2
  exit 1
fi

VENV_ACTIVATE="$API_ROOT/.venv/bin/activate"
if [[ ! -f "$VENV_ACTIVATE" ]]; then
  if [[ -d "$API_ROOT/.venv" ]]; then
    echo "=> 发现不完整的 .venv（缺少 bin/activate），正在删除后重建" >&2
    rm -rf "$API_ROOT/.venv"
  fi
  echo "=> 创建虚拟环境: $API_ROOT/.venv"
  python3 -m venv "$API_ROOT/.venv"
fi

if [[ ! -f "$VENV_ACTIVATE" ]]; then
  echo "error: 虚拟环境仍无效: $VENV_ACTIVATE（请检查 python3 -m venv 是否成功）。" >&2
  exit 1
fi

# shellcheck source=/dev/null
source "$VENV_ACTIVATE"

if [[ "${API_FORCE_PIP_INSTALL:-0}" == "1" ]] || ! python -c "import django" 2>/dev/null; then
  echo "=> 安装依赖: requirements/local.txt"
  python -m pip install -r "$API_ROOT/requirements/local.txt"
elif ! python -c "import psycopg" 2>/dev/null && ! python -c "import psycopg2" 2>/dev/null; then
  echo "=> 未检测到可用的 PostgreSQL 驱动（psycopg/psycopg2），补装 requirements/local.txt（含 psycopg2-binary 回退）" >&2
  python -m pip install -r "$API_ROOT/requirements/local.txt"
fi

if [[ "${API_SKIP_MIGRATE:-0}" != "1" ]]; then
  echo "=> 应用数据库迁移 (migrate --noinput) …"
  python manage.py migrate --settings=plane.settings.local --noinput
else
  echo "warn: 已跳过 migrate（API_SKIP_MIGRATE=1）。" >&2
fi

exec python manage.py runserver "0.0.0.0:${PORT}" --settings=plane.settings.local
