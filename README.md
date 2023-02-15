# FAIMS3-conductor

The server-side of FAIMS3 handling authentication and authorization

To get started, first set up the `.env` file as specified in Configuration, and
then set up keys as specified in Running.

## Configuration

The deployment is configured via the `.env` file in the root directory
of the project.  Copy `.env.dist` to `.env` and the update the values
as required.  See the deployment docs for full details of the environment
variables supported.

Environment variables are documented in comments in `.env.dist`.

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
database. This is done by sending a request to the API and to do this you need
to get a valid user token.  First, connect to the conductor instance
on <http://localhost:8080/> or whatever port you have configured.  Login
using one of the configured authentication methods.  Now, from the
Conductor home page (<http://localhost:8080>) scroll down to "Copy Bearer Token
to Clipboard". Paste this value into your .env file as the value of `USER_TOKEN`. 

Once you have this token, you can run the script to initialise the databases:

```bash
npm run initdb
```

There is also a script that will populate the database with notebooks that are
stored in the `notebooks` directory.  There should be two sample notebooks in
there but you can also create new ones. This script again uses the `USER_TOKEN`
value from .env and can be run by:

```bash
npm run load-notebooks
```

## Development

There is an alternate docker compose file for development that mounts the
current working directory inside the container so that you can work on
code in real time.  To use this you also need a local `node_modules` folder
since the current directory will shadow the one inside the container. 

To create `node_modules` run `npm ci` inside the container:

```bash
docker compose -f docker-compose.dev.yml run conductor npm ci
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
