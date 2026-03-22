#!/usr/bin/env bash
# 一键启动 Plane API：自动创建 apps/api/.venv、按需 pip install、加载 apps/api/.env、runserver。
# 首次或 schema 变更后若数据库报错，请手动：python manage.py migrate --settings=plane.settings.local
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

if [[ ! -d "$API_ROOT/.venv" ]]; then
  echo "=> 创建虚拟环境: $API_ROOT/.venv"
  python3 -m venv "$API_ROOT/.venv"
fi

# shellcheck source=/dev/null
source "$API_ROOT/.venv/bin/activate"

if [[ "${API_FORCE_PIP_INSTALL:-0}" == "1" ]] || ! python -c "import django" 2>/dev/null; then
  echo "=> 安装依赖: requirements/local.txt"
  python -m pip install -r "$API_ROOT/requirements/local.txt"
fi

exec python manage.py runserver "0.0.0.0:${PORT}" --settings=plane.settings.local
