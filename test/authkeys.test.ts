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
 * Filename: authkeys.test.ts
 * Description:
 *   Tests for authkeys handling
 */

import PouchDB from 'pouchdb';
PouchDB.plugin(require('pouchdb-adapter-memory')); // enable memory adapter for testing

import {testProp, fc} from 'jest-fast-check';

import {create_auth_key} from '../src/authkeys/create';
import {validateToken} from '../src/authkeys/read';
import type {CouchDBUsername, CouchDBUserRoles} from '../src/datamodel/users';
import {getSigningKey} from '../src/authkeys/signing_keys';
import {CONDUCTOR_INSTANCE_NAME, CONDUCTOR_KEY_ID} from '../src/buildconfig';

describe('roundtrip creating and reading token', () => {
  testProp(
    'token roundtrip',
    [
      fc.fullUnicodeString(), // username name
      fc.array(fc.fullUnicodeString()), // roles
      fc.fullUnicodeString(), // name
    ],
    async (
      username: CouchDBUsername,
      roles: CouchDBUserRoles,
      name: string
    ) => {
      const signing_key = await getSigningKey();

      return create_auth_key(username, roles, signing_key, name)
        .then(token => {
          return validateToken(token);
        })
        .then(token_props => {
          expect(token_props).not.toBe(undefined);
          if (token_props) {
            expect(username).toBe(token_props.username);
            expect(roles).toStrictEqual(token_props.roles);
            expect(name).toStrictEqual(token_props.name);
            expect(CONDUCTOR_INSTANCE_NAME).toBe(token_props.instance_name);
            expect(CONDUCTOR_KEY_ID).toBe(token_props.key_id);
          }
        });
    }
  );
});
