#!/usr/bin/env bash
set -euo pipefail

cd containerization
docker-compose up --detach --build --force-recreate --remove-orphans

# Only set up trap when NOT run by npm
if [[ -z "${npm_execpath:-}" ]]; then
    close-docker() {
        docker-compose down
    }

    trap close-docker EXIT INT SIGTERM ERR

    echo "Services started. Press Ctrl+C to stop."
    wait
fi