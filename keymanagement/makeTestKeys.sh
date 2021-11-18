#!/usr/bin/env bash

set -euo pipefail

# TARGET_DIR="/etc/keys"
# if [ $# -eq 1 ]; then
# 	TARGET_DIR="$1"
# fi

mkdir -p /keys
echo date > /keys/start
rm -f *.pem *.flattened
openssl genpkey -algorithm RSA -out "private_key.pem" -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in "private_key.pem" -out "public_key.pem"


# #" Generate a private key (prime256v1 is the name of the parameters used
# # to generate the key, this is the same as P-256 in the JWA spec).
# openssl ecparam -name prime256v1 -genkey -noout -out "$TARGET_DIR/ecdsa_p256v1_private_key.pem"
# #" Derive the public key from the private key
# openssl ec -in "$TARGET_DIR/ecdsa_p256v1_private_key.pem" -pubout -out "$TARGET_DIR/ecdsa_p256v1_public_key.pem"


cat "public_key.pem" | sed ':a;N;$!ba;s/\n/\\n/g' > "rsa_2048_public_key.pem.flattened"
cp *.pem /keys/
cp *.flattened /keys/
ls /keys/
#cat "$TARGET_DIR/ecdsa_p256v1_public_key.pem" | sed ':a;N;$!ba;s/\n/\\n/g' > "$TARGET_DIR/ecdsa_p256v1_public_key.pem.flattened"

ls > /keys/list
