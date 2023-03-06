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
 * Filename: users.tests.ts
 * Description:
 *   Tests for user handling
 */

import PouchDB from 'pouchdb';
import {createUser, updateUser} from '../src/couchdb/users';
PouchDB.plugin(require('pouchdb-adapter-memory')); // enable memory adapter for testing
PouchDB.plugin(require('pouchdb-find'));

test('create user - good', async () => {
  const email = 'BOB@Here.com';
  const username = 'bobalooba';
  const [newUserUsername, errorUsername] = await createUser('', username);
  expect(errorUsername).toBe('');
  if (newUserUsername) {
    expect(newUserUsername.user_id).toBe(username);
    expect(newUserUsername.emails.length).toBe(0);
  } else {
    fail('user is null after createUser with valid username');
  }

  const [newUserEmail, errorEmail] = await createUser(email, '');
  expect(errorEmail).toBe('');
  if (newUserEmail) {
    expect(newUserEmail.user_id).not.toBe('');
    expect(newUserEmail.emails).toContain(email.toLowerCase());
  } else {
    fail('user is null after createUser with valid email');
  }
});

test('create user - duplicates and missing', async () => {
  const email = 'BOBBY@here.com';
  const username = 'bobalooba';

  const [newUser, errorFirst] = await createUser(email, '');
  expect(errorFirst).toBe('');
  if (newUser) {
    await updateUser(newUser);
    // now make another user with the same email
    const [anotherUser, errorSecond] = await createUser(email, '');
    expect(errorSecond).toBe(`user with email '${email}' already exists`);
    expect(anotherUser).toBe(null);
  }
  const [newUserU, errorFirstU] = await createUser('', username);
  expect(errorFirstU).toBe('');
  if (newUserU) {
    await updateUser(newUserU);
    // now make another user with the same email
    const [anotherUserU, errorSecondU] = await createUser('', username);
    expect(errorSecondU).toBe(
      `user with username '${username}' already exists`
    );
    expect(anotherUserU).toBe(null);
  }

  const [newUserM, errorM] = await createUser('', '');
  expect(errorM).toBe('at least one of username and email is required');
  expect(newUserM).toBe(null);
});
