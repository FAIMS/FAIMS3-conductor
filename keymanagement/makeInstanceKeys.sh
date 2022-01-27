#!/usr/bin/env bash

set -euo pipefail


if [ $# -eq 1 ]; then
	HOST_TARGET="$1"
else
	echo "./makeTestKeys.sh host";
	exit 0;
fi

mkdir -p keys
cd keys
date > ${HOST_TARGET}start
rm -f *.pem *.flattened
openssl genpkey -algorithm RSA -out "${HOST_TARGET}_private_key.pem" -pkeyopt rsa_keygen_bits:2048
openssl rsa -pubout -in "${HOST_TARGET}_private_key.pem" -out "${HOST_TARGET}_public_key.pem"


# #" Generate a private key (prime256v1 is the name of the parameters used
# # to generate the key, this is the same as P-256 in the JWA spec).
# openssl ecparam -name prime256v1 -genkey -noout -out "$TARGET_DIR/ecdsa_p256v1_private_key.pem"
# #" Derive the public key from the private key
# openssl ec -in "$TARGET_DIR/ecdsa_p256v1_private_key.pem" -pubout -out "$TARGET_DIR/ecdsa_p256v1_public_key.pem"


cat "${HOST_TARGET}_public_key.pem" | sed ':a;N;$!ba;s/\n/\\n/g' > "${HOST_TARGET}_rsa_2048_public_key.pem.flattened"

openssl pkey -pubin -in "${HOST_TARGET}_public_key.pem" -pubout | openssl sha256 -c

mkdir -p ../../FAIMS3-Dev-DB/keys
cp ${HOST_TARGET}* ../../FAIMS3-Dev-DB/keys

# cp *.pem /keys/
# cp *.flattened /keys/
# ls /keys/
#cat "$TARGET_DIR/ecdsa_p256v1_public_key.pem" | sed ':a;N;$!ba;s/\n/\\n/g' > "$TARGET_DIR/ecdsa_p256v1_public_key.pem.flattened"

# ls > /keys/list
