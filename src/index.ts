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
import {
  CONDUCTOR_KEY_ID,
  CONDUCTOR_PORT,
  CONDUCTOR_PUBLIC_KEY_PATH,
  CONDUCTOR_PRIVATE_KEY_PATH,
  CONDUCTOR_INSTANCE_NAME,
  CONDUCTOR_AUTH_PROVIDERS,
} from './buildconfig';
import {load_signing_key} from './authkeys/signing_keys';
import {app} from './routes';
import {add_auth_routes} from './auth_routes';

process.on('unhandledRejection', error => {
  console.error(error); // This prints error with stack included (as for normal errors)
  throw error; // Following best practices re-throw error and let the process exit with error code
});

PouchDB.plugin(PouchDBFind);
add_auth_providers(CONDUCTOR_AUTH_PROVIDERS);
add_auth_routes(app, CONDUCTOR_AUTH_PROVIDERS);

async function initialize() {
  const signing_key = await load_signing_key({
    signing_algorithm: 'RS256',
    instance_name: CONDUCTOR_INSTANCE_NAME,
    key_id: CONDUCTOR_KEY_ID,
    public_key_file: CONDUCTOR_PUBLIC_KEY_PATH,
    private_key_file: CONDUCTOR_PRIVATE_KEY_PATH,
  });
  app.set('faims3_token_signing_key', signing_key);
}

initialize()
  .then(async (): Promise<void> => {
    app.listen(CONDUCTOR_PORT, '0.0.0.0', () => {
      console.log(
        `Conductor is listening on port http://0.0.0.0:${CONDUCTOR_PORT}/`
      );
    });
  })
  .catch(console.error);
