/*
 * Copyright 2021 Macquarie University
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

import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';

import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';

import {auth_mechanisms, oauth_verify} from './authconfig';
import {CleanOAuth2Strategy, dc_auth_profile} from './authhelpers';
import {app} from './routes';
import {add_auth_routes} from './auth_routes';
import {initialize} from './sync/initialize';
import {add_initial_listener} from './sync/event-handler-registration';
import {
  register_listings_known,
  register_projects_known,
  register_metas_complete,
  register_projects_created,
} from './sync/state';

process.on('unhandledRejection', error => {
  console.error(error); // This prints error with stack included (as for normal errors)
  throw error; // Following best practices re-throw error and let the process exit with error code
});

PouchDB.plugin(PouchDBFind);

add_initial_listener(register_listings_known, 'listings_known');
add_initial_listener(register_projects_known, 'projects_known');
add_initial_listener(register_metas_complete);
add_initial_listener(register_projects_created);

for (const auth_id in auth_mechanisms) {
  const st = new CleanOAuth2Strategy(
    auth_mechanisms[auth_id].strategy,
    oauth_verify as unknown as OAuth2Strategy.VerifyFunctionWithRequest
  );
  st.setUserProfileHook(dc_auth_profile);
  passport.use('default', st);
}
add_auth_routes(app, ['default']);

app.listen(8080, () => {
  console.log('The hello is listening on port 8080!');
});

//initialize().then(async () => {
//  app.listen(8080, () => {
//    console.log('The hello is listening on port 8080!');
//  });
//});
