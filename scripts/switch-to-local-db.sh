#!/usr/bin/env bash
# Dump the current (remote) database, switch .env to local Postgres, start Docker, and import.
#
# Usage: ./scripts/switch-to-local-db.sh
# Requires: docker, and either local pg_dump/psql or the postgres Docker image.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_CONTAINER_NAME="project-y-postgres"
DUMP_DIR="$ROOT_DIR/dumps"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DUMP_FILE="$DUMP_DIR/project-y-$TIMESTAMP.sql"

if [[ ! -f .env ]]; then
  echo "Missing .env in $ROOT_DIR"
  exit 1
fi

strip_quotes() {
  local value="$1"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"
  printf '%s' "$value"
}

read_env_url() {
  local line="$1"
  line="${line#NETLIFY_DATABASE_URL=}"
  strip_quotes "$line"
}

read_active_database_url() {
  local line
  line="$(grep -E '^NETLIFY_DATABASE_URL=' .env | head -1 || true)"
  if [[ -z "$line" ]]; then
    return 1
  fi
  read_env_url "$line"
}

is_local_url() {
  local url="$1"
  [[ "$url" == *"@localhost:"* || "$url" == *"@127.0.0.1:"* ]]
}

extract_local_url_from_env() {
  local line url
  while IFS= read -r line; do
    if [[ "$line" =~ ^#[[:space:]]*NETLIFY_DATABASE_URL= ]]; then
      url="$(read_env_url "${line#\# }")"
      if is_local_url "$url"; then
        printf '%s' "$url"
        return 0
      fi
    fi
  done < .env
  return 1
}

REMOTE_URL="$(read_active_database_url)"

if is_local_url "$REMOTE_URL"; then
  echo "NETLIFY_DATABASE_URL already points at a local database."
  echo "Re-run after switching back to your remote URL, or import manually from $DUMP_DIR"
  exit 1
fi

if LOCAL_URL="$(extract_local_url_from_env)"; then
  echo "Using local URL from commented line in .env"
else
  echo "No commented local NETLIFY_DATABASE_URL found in .env."
  echo "Add a line like:"
  echo '  # NETLIFY_DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/project-y"'
  exit 1
fi

mkdir -p "$DUMP_DIR"

echo "Dumping remote database to $DUMP_FILE ..."
if command -v pg_dump >/dev/null 2>&1; then
  pg_dump "$REMOTE_URL" \
    --no-owner \
    --no-acl \
    --clean \
    --if-exists \
    -F p \
    -f "$DUMP_FILE"
else
  docker run --rm \
    -e "REMOTE_URL=$REMOTE_URL" \
    docker.io/postgres \
    sh -c 'pg_dump "$REMOTE_URL" --no-owner --no-acl --clean --if-exists -F p' \
    >"$DUMP_FILE"
fi

echo "Updating .env to use local database ..."
tmp_env="$(mktemp)"
remote_written=false
while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ "$line" =~ ^NETLIFY_DATABASE_URL= ]]; then
    if [[ "$remote_written" == false ]]; then
      printf '# NETLIFY_DATABASE_URL="%s"\n' "$REMOTE_URL" >>"$tmp_env"
      printf 'NETLIFY_DATABASE_URL="%s"\n' "$LOCAL_URL" >>"$tmp_env"
      remote_written=true
    fi
    continue
  fi
  if [[ "$line" =~ ^#[[:space:]]*NETLIFY_DATABASE_URL= ]]; then
    continue
  fi
  printf '%s\n' "$line" >>"$tmp_env"
done < .env

if [[ "$remote_written" == false ]]; then
  rm -f "$tmp_env"
  echo "Could not find NETLIFY_DATABASE_URL in .env"
  exit 1
fi

mv "$tmp_env" .env

echo "Starting local database container ..."
bash "$ROOT_DIR/start-database.sh"

echo "Waiting for Postgres to accept connections ..."
ready=false
for _ in $(seq 1 60); do
  if docker exec "$DB_CONTAINER_NAME" pg_isready -U postgres -d project-y >/dev/null 2>&1; then
    ready=true
    break
  fi
  sleep 1
done

if [[ "$ready" != true ]]; then
  echo "Postgres did not become ready in time."
  exit 1
fi

echo "Importing dump into local database ..."
if command -v psql >/dev/null 2>&1; then
  psql "$LOCAL_URL" -v ON_ERROR_STOP=1 -f "$DUMP_FILE"
else
  docker exec -i "$DB_CONTAINER_NAME" \
    psql -U postgres -d project-y -v ON_ERROR_STOP=1 \
    <"$DUMP_FILE"
fi

echo ""
echo "Done."
echo "  Dump:  $DUMP_FILE"
echo "  Local: $LOCAL_URL"
echo "Remote URL is preserved as a comment in .env."
