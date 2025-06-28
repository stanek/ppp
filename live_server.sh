#!/usr/bin/env bash
#
# run_live.sh  —  start the SPA dev server with live-reload
# Put this file inside the ppp/ folder and run it from there:
#     ./run_live.sh
# Optional extra args (port, etc.) are passed straight through.

# Absolute path of this script (inside ppp/)
SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Parent directory *above* ppp/  – becomes the server's working dir
PROJECT_ROOT="$( dirname "$SCRIPT_DIR" )"

# Jump up, launch server, forward any CLI flags (`$@`)
(
  cd "$PROJECT_ROOT" || exit 1
  python ppp/spa_server.py --live "$@"
)
