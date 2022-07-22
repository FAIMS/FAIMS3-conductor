# FAIMS3-conductor

The server-side of FAIMS3 handling authentication and authorization

## Configuration

The deployment is configured via the `.env` file in the root directory
of the project.   Copy `.env.dist` to `.env` and the update the values
as required.

* `COUCHDB_PASSWORD` - admin user password for couchdb (will be created)
* `COUCHDB_PROTOCOL` - probably `http` - protocol for internal access to couchdb server
* `COUCHDB_PORT` - port for internal access to couchdb server
* `DEPLOY_HOST` - public hostname that this service will be available on
* `CONDUCTOR_PROTOCOL` - probably `http` - protocol for internal access to
* `CONDUCTOR_PORT` - port that conductor will listen on internally
* `CONDUCTOR_PUBLIC_URL` - external public URL for the conductor service

The following variables relate to the runtime configuration of the application:

* `DATACENTRAL_GROUP_PREFIX` - group prefix for data central authentication
* `FAIMS_COOKIE_SECRET` - secret used to sign cookies - a random string
* `COMMIT_VERSION` - current Conductor commit version

## Running

```bash
./keymanagement/makeInstanceKeys.sh
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

## Development

There is an alternate docker compose file for development that mounts the
current working directory inside the container so that you can work on
code in real time.  To use this you also need a local `node_modules` folder
since the current directory will shadow the one inside the container. 

To create `node_modules` run `npm install` inside the container:

```bash
docker compose -f docker-compose.dev.yml run conductor npm install
```

Then start the services:

```bash
docker compose -f docker-compose.dev.yml up
```


## Tests

Run tests inside the conductor instance:

```bash

docker compose exec conductor npm run test
```
