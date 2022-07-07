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

Once the services are up and running we need to initialise the CouchDB
database:

```bash

docker compose exec conductor npm run initdb
```

