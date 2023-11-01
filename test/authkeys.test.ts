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
PouchDB.plugin(require('pouchdb-find'));

import {testProp, fc} from 'jest-fast-check';

import {createAuthKey} from '../src/authkeys/create';
import {validateToken} from '../src/authkeys/read';
import type {CouchDBUsername, CouchDBUserRoles} from '../src/datamodel/users';
import {getSigningKey} from '../src/authkeys/signing_keys';
import {addOtherRoleToUser, createUser, saveUser} from '../src/couchdb/users';
import {expect} from 'chai';

describe('fake test', () => {
  expect(1).to.equal(1);
});

// describe('roundtrip creating and reading token', () => {
//   testProp(
//     'token roundtrip',
//     [
//       fc.fullUnicodeString(1, 100), // username
//       fc.array(fc.fullUnicodeString()), // roles
//       fc.fullUnicodeString(), // name
//     ],
//     async (
//       username: CouchDBUsername,
//       roles: CouchDBUserRoles,
//       name: string
//     ) => {
//       const signing_key = await getSigningKey();

//       // need to make a user with these details
//       const [user, err] = await createUser(username, '');

//       if (user) {
//         user.name = name;
//         for (let i = 0; i < roles.length; i++) {
//           addOtherRoleToUser(user, roles[i]);
//         }
//         await saveUser(user);

//         return createAuthKey(user, signing_key)
//           .then(token => {
//             return validateToken(token);
//           })
//           .then(valid_user => {
//             expect(valid_user).not.toBe(undefined);
//             if (valid_user) {
//               expect(valid_user.user_id).toBe(user.user_id);
//               expect(valid_user.roles).toStrictEqual(user.roles);
//               expect(valid_user.name).toStrictEqual(user.name);
//               // expect(CONDUCTOR_INSTANCE_NAME).toBe(token_props.instance_name);
//               // expect(CONDUCTOR_KEY_ID).toBe(token_props.key_id);
//             }
//           });
//       } else {
//         console.error(err);
//       }
//     }
//   );
// });
