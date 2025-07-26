#!/bin/sh
# Move SQLite DB from old prisma/data to backend/data if needed

set -e

SRC="backend/prisma/data/database.sqlite"
DST="backend/data/database.sqlite"

if [ -f "$SRC" ]; then
  mkdir -p "$(dirname "$DST")"
  mv "$SRC" "$DST"
  echo "Moved $SRC to $DST."
else
  echo "No database found at $SRC. Nothing to move."
fi
