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

import PouchDB from 'pouchdb';

import {
  LOCAL_COUCHDB_PROTOCOL,
  LOCAL_COUCHDB_HOST,
  LOCAL_COUCHDB_PORT,
  LOCAL_COUCHDB_AUTH,
} from '../buildconfig';
import {PouchUser} from '../datamodel/database';
import type {CouchDBUsername} from '../authkeys/types';
import {
  ConnectionInfo_create_pouch,
  local_pouch_options,
  materializeConnectionInfo,
} from '../sync/connection';

const users_db: PouchDB.Database<PouchUser> =
  ConnectionInfo_create_pouch({
    db_name: 'FAIMS3_users',
    proto: LOCAL_COUCHDB_PROTOCOL,
    host: LOCAL_COUCHDB_HOST,
    port: LOCAL_COUCHDB_PORT,
    auth: LOCAL_COUCHDB_AUTH,
  });

export async function getUserByEmail(email: string): Promise<null | PouchUser> {
  const result = await users_db.find({
    selector: {emails: {$elemMatch: {$eq: email}}},
  });
  if (result.docs.length === 0) {
    return null;
  } else if (result.docs.length === 1) {
    return result.docs[0];
  } else {
    throw Error(`Multiple conflicting users with email ${email}`);
  }
}

export async function updateUser(user: PouchUser): Promise<void> {
  await users_db.put(user);
}

export async function get_couchdb_user_from_username(username: CouchDBUsername): Promise<PouchUser | null> {
  try {
  const user = await users_db.get(username);
  return user;
  } catch (err) {
      console.error(err);
      return null;
  }
}