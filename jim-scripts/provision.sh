source "${DIR_CORE}/utils.sh"

DB_CONTAINER_NAME="project-y-postgres"

if _ask "This will overwrite your local database. Are you sure you want to continue?"
then
  set -euo pipefail

  _repo_root="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
  cd "$_repo_root"

  _storage_host="${STORAGE_SERVER:-deploy@storage.pno.dev}"
  _storage_dir="${STORAGE_DATA_DIR:-project-y}"

  echo ""
  _box "Fetching dump from storage server"
  echo ""

  _log "Pulling dump from storage server…" "$COLOR_CYAN"
  scp "${_storage_host}:${_storage_dir}/dump.sql.gz" "dump.sql.gz" > /dev/null
  _log "done 👍" "$COLOR_CYAN"

  _log "Starting database container…" "$COLOR_CYAN"
  bash "$_repo_root/start-database.sh" > /dev/null
  _log "done 👍" "$COLOR_CYAN"

  _log "Waiting for Postgres…" "$COLOR_CYAN"
  _ready=false
  for _i in $(seq 1 60); do
    if docker exec "$DB_CONTAINER_NAME" pg_isready -U postgres -d project-y >/dev/null 2>&1; then
      _ready=true
      break
    fi
    sleep 1
  done
  if [[ "$_ready" != true ]]; then
    _log "Postgres did not become ready in time." "$COLOR_RED"
    exit 1
  fi
  _log "done 👍" "$COLOR_CYAN"

  _log "Resetting local database…" "$COLOR_CYAN"
  docker exec "$DB_CONTAINER_NAME" psql -X -q -U postgres -d postgres -v ON_ERROR_STOP=1 \
    -c 'DROP DATABASE IF EXISTS "project-y" WITH (FORCE);' \
    -c 'CREATE DATABASE "project-y";' \
    > /dev/null
  _log "done 👍" "$COLOR_CYAN"

  _log "Importing dump…" "$COLOR_CYAN"
  # Storage dumps retain Netlify roles/ACLs; map ownership to local postgres (cf. pg_dump --no-owner --no-acl).
  {
    echo "SET client_min_messages TO WARNING;"
    gunzip -c dump.sql.gz | sed -E \
      -e 's/OWNER TO [^;[:space:]]+/OWNER TO postgres/g' \
      -e 's/AUTHORIZATION [^;[:space:]]+/AUTHORIZATION postgres/g' \
      -e '/^ALTER DEFAULT PRIVILEGES/d' \
      -e '/^GRANT /d' \
      -e '/^REVOKE /d'
  } | docker exec -i "$DB_CONTAINER_NAME" \
    psql -X -q -U postgres -d project-y -v ON_ERROR_STOP=1 \
    > /dev/null
  rm dump.sql.gz
  _log "done 👍" "$COLOR_CYAN"

fi
