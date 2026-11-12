#!/bin/sh
export TMPDIR="$XDG_RUNTIME_DIR/app/$FLATPAK_ID"
mkdir -p "$TMPDIR"
exec zypak-wrapper /app/nuvio/nuvio-tv-installer "$@"
