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
 * Filename: src/authkeys/user.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

import {create_auth_key} from './create';
import type {CouchDBUsername, CouchDBUserRoles, SigningKey} from './types';
import {get_couchdb_user_from_username} from '../couchdb/users';

export async function get_user_auth_token(
  username: CouchDBUsername,
  signing_key: SigningKey
) {
  console.log('Getting user roles for', username);
  const roles = await get_couchdb_user_roles(username);
  console.log('Getting user token for', username, roles);
  const token = await create_auth_key(username, roles, signing_key);
  console.log('Returning user token for', username, token);
  return token;
}

async function get_couchdb_user_roles(
  username: CouchDBUsername
): Promise<CouchDBUserRoles> {
  const user = await get_couchdb_user_from_username(username);
  if (user === null) {
    console.log('No roles found for', username);
    return [];
  }
  return user.roles;
}
