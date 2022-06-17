#!/usr/bin/env bash

set -euo pipefail


if [ $# -eq 1 ]; then
	HOST_TARGET="$1"
else
	echo "./makeInstanceKeys.sh host";
	exit 0;
fi

mkdir -p keys
openssl genpkey -algorithm RSA -out "keys/${HOST_TARGET}_private_key.pem" -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in "keys/${HOST_TARGET}_private_key.pem" -out "keys/${HOST_TARGET}_public_key.pem"

## Generate the jwt.ini file needed for couch deployment, contains the public key
## used to validate signed JWTs for authentication to couchdb

cp ./couchdb/local.ini.dist ./couchdb/local.ini 
echo "[jwt_keys]" >> ./couchdb/local.ini
echo "rsa:conductor="`cat "keys/${HOST_TARGET}_public_key.pem" | tr '\n' '\\n'` >> ./couchdb/local.ini


