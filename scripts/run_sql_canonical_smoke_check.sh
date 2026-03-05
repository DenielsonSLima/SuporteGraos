#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Erro: defina DATABASE_URL antes de executar."
  echo "Exemplo: export DATABASE_URL=\"postgresql://...\""
  exit 1
fi

export PATH="/opt/homebrew/opt/libpq/bin:$PATH"

psql -P pager=off "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "scripts/sql_canonical_smoke_check.sql"
