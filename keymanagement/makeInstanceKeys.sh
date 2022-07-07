#!/usr/bin/env bash

set -euo pipefail

# Local .env
if [ -f .env ]; then
    # Load Environment Variables
    export $(cat .env | grep -v '#' | sed 's/\r$//' | awk '/=/ {print $1}' )
fi


## no need for this to vary as in this deployment there is only ever one conductor-couchdb pair
export HOST_TARGET='conductor'

mkdir -p keys
openssl genpkey -algorithm RSA -out "keys/${HOST_TARGET}_private_key.pem" -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in "keys/${HOST_TARGET}_private_key.pem" -out "keys/${HOST_TARGET}_public_key.pem"

## Generate the jwt.ini file needed for couch deployment, contains the public key
## used to validate signed JWTs for authentication to couchdb

cp ./couchdb/local.ini.dist ./couchdb/local.ini 
echo "[jwt_keys]" >> ./couchdb/local.ini
echo "rsa:conductor="`cat "keys/${HOST_TARGET}_public_key.pem" | tr '\n' '\\n'` >> ./couchdb/local.ini
echo '[admin]' >> ./couchdb/local.ini
echo "admin=${COUCHDB_PASSWORD}" >> ./couchdb/local.ini


