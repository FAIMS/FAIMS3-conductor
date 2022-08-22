#!/usr/bin/env bash

set -euo pipefail

# Load necessary packages
npm ci

# Generate keypair, couchdb.ini, makes sure conductor and couch have proper key exchange.
npm run keys 
export DOCKER_BUILDKIT=1

# mount local directory into docker as development build
docker-compose build
echo "Build done"
docker-compose up -d
echo "daemon started"
# within the built docker conductor, run npm run initdb
sleep 10
docker-compose exec conductor npm run initdb