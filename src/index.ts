/*
 * Copyright 2021, 2022 Macquarie University
 *
 * Licensed under the Apache License Version 2.0 (the, "License");
 * you may not use, this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND either express or implied.
 * See, the License, for the specific language governing permissions and
 * limitations under the License.
 *
 * Filename: index.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';

import {add_auth_providers} from './auth_providers';
import {CONDUCTOR_PORT, CONDUCTOR_AUTH_PROVIDERS} from './buildconfig';

import {app} from './routes';
import {add_auth_routes} from './auth_routes';

import {registerClient} from 'faims3-datamodel';
import {getProjectDataDB, getProjectMetaDB} from './couchdb';

// set up the database module faims3-datamodel with our callbacks to get databases
registerClient({
  getDataDB: getProjectDataDB,
  getProjectDB: getProjectMetaDB,
  getLocalStateDB: () => {},
  shouldDisplayRecord: () => true,
});

process.on('unhandledRejection', error => {
  console.error(error); // This prints error with stack included (as for normal errors)
  throw error; // Following best practices re-throw error and let the process exit with error code
});

PouchDB.plugin(PouchDBFind);
add_auth_providers(CONDUCTOR_AUTH_PROVIDERS);
add_auth_routes(app, CONDUCTOR_AUTH_PROVIDERS);

app.listen(CONDUCTOR_PORT, '0.0.0.0', () => {
  console.log(
    `Conductor is listening on port http://0.0.0.0:${CONDUCTOR_PORT}/`
  );
});
