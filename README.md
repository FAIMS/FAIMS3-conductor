# FAIMS3-conductor

The server-side of FAIMS3 handling authentication and authorization

## Configuration

The deployment is configured via the `.env` file in the root directory
of the project.   Copy `.env.dist` to `.env` and the update the values
as required.

## Running

```bash
sh ./keymanagement/makeInstanceKeys.sh
```

generates new key pair in the `keys` folder and generates the `local.ini` file for couchdb
that contains the public key and other information.

Build the two docker images:

```bash
docker compose build
```

Then we can startup the servers:

```bash

docker compose up -d
```

will start the couchdb and conductor servers to listen on the configured port.








* "If you run npm start, and go to 8080, you should get a html page"

```bash
$ docker volume create key-vol 
# OR
$ mkdir /tmp/keys
$ docker build -t faims3:conductor .
$ docker rm -f conductor && docker run -it -p 8080:8080 -d --name conductor --mount type=volume,source=key-vol,target=/app faims3:conductor
# flattened file 
$ docker run -it --name=test --volumes-from conductor ubuntu
$ ls /app/rsa_2048_public_key.pem.flattened
```