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
import {
  addLocalPasswordForUser,
  validateLocalUser,
} from '../src/auth_providers/local';
import {getUsersDB} from '../src/couchdb';
import {
  addProjectRoleToUser,
  addOtherRoleToUser,
  createUser,
  removeOtherRoleFromUser,
  removeProjectRoleFromUser,
  saveUser,
} from '../src/couchdb/users';
PouchDB.plugin(require('pouchdb-adapter-memory')); // enable memory adapter for testing
PouchDB.plugin(require('pouchdb-find'));

const clearUsers = async () => {
  const usersDB = getUsersDB();
  if (usersDB) {
    const docs = await usersDB.allDocs();
    for (let i = 0; i < docs.rows.length; i++) {
      await usersDB.remove(docs.rows[i].id, docs.rows[i].value.rev);
    }
  }
};

beforeEach(clearUsers);

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
    await saveUser(newUser);
    // now make another user with the same email
    const [anotherUser, errorSecond] = await createUser(email, '');
    expect(errorSecond).toBe(`user with email '${email}' already exists`);
    expect(anotherUser).toBe(null);
  }
  const [newUserU, errorFirstU] = await createUser('', username);
  expect(errorFirstU).toBe('');
  if (newUserU) {
    await saveUser(newUserU);
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

test('user roles', async () => {
  const email = 'BOBBY@here.com';
  const username = 'bobalooba';

  const [newUser, error] = await createUser(email, username);
  expect(error).toBe('');
  if (newUser) {
    // add some roles
    addOtherRoleToUser(newUser, 'cluster-admin');
    addOtherRoleToUser(newUser, 'chief-bobalooba');

    // check that 'roles' has been updated
    expect(newUser.roles.length).toBe(2);
    expect(newUser.roles).toContain('cluster-admin');
    expect(newUser.roles).toContain('chief-bobalooba');

    addProjectRoleToUser(newUser, 'important-project', 'admin');

    expect(newUser.other_roles.length).toBe(2);
    expect(newUser.other_roles).toContain('cluster-admin');
    expect(newUser.other_roles).toContain('chief-bobalooba');
    expect(Object.keys(newUser.project_roles)).toContain('important-project');
    expect(newUser.project_roles['important-project']).toContain('admin');

    expect(newUser.roles.length).toBe(3);
    expect(newUser.roles).toContain('important-project||admin');

    // add more project roles
    addProjectRoleToUser(newUser, 'important-project', 'team');
    expect(newUser.project_roles['important-project']).toContain('admin');
    expect(newUser.project_roles['important-project']).toContain('team');
    expect(newUser.project_roles['important-project'].length).toBe(2);

    expect(newUser.roles.length).toBe(4);
    expect(newUser.roles).toContain('cluster-admin');
    expect(newUser.roles).toContain('chief-bobalooba');
    expect(newUser.roles).toContain('important-project||admin');
    expect(newUser.roles).toContain('important-project||team');

    // doing it again should be a no-op
    addProjectRoleToUser(newUser, 'important-project', 'team');
    expect(newUser.project_roles['important-project'].length).toBe(2);

    addOtherRoleToUser(newUser, 'cluster-admin');
    expect(newUser.other_roles.length).toBe(2);

    expect(newUser.roles.length).toBe(4);
    expect(newUser.roles).toContain('cluster-admin');
    expect(newUser.roles).toContain('chief-bobalooba');
    expect(newUser.roles).toContain('important-project||admin');
    expect(newUser.roles).toContain('important-project||team');

    // remove one
    removeProjectRoleFromUser(newUser, 'important-project', 'admin');
    expect(newUser.project_roles['important-project']).not.toContain('admin');
    expect(newUser.project_roles['important-project']).toContain('team');

    removeOtherRoleFromUser(newUser, 'cluster-admin');
    expect(newUser.other_roles.length).toBe(1);
    expect(newUser.other_roles).toContain('chief-bobalooba');
    expect(newUser.other_roles).not.toContain('cluster-admin');

    expect(newUser.roles.length).toBe(2);
    expect(newUser.roles).not.toContain('cluster-admin');
    expect(newUser.roles).toContain('chief-bobalooba');
    expect(newUser.roles).not.toContain('important-project||admin');
    expect(newUser.roles).toContain('important-project||team');

    // remove roles that aren't there should be harmless
    removeProjectRoleFromUser(newUser, 'important-project', 'not-there');
    expect(newUser.project_roles['important-project'].length).toBe(1);
    removeOtherRoleFromUser(newUser, 'non-existant');
    expect(newUser.other_roles.length).toBe(1);
    expect(newUser.other_roles).toContain('chief-bobalooba');
  }
});

test('add local password', async () => {
  const username = 'bobalooba';
  const password = 'verysecret';
  const [user, error] = await createUser('', username);
  expect(error).toBe('');
  if (user) {
    await addLocalPasswordForUser(user, password);
    const profile = user.profiles['local'] as any; // really LocalProfile
    expect(profile).not.toBe(undefined);
    expect(profile.salt).not.toBe(null);
    expect(profile.password).not.toBe(null);

    await validateLocalUser(
      username,
      password,
      (error: string, validUser: Express.User | false) => {
        expect(validUser).not.toBe(false);
        if (validUser) {
          expect(validUser.user_id).toBe(username);
          expect(error).toBe(null);
        }
      }
    );

    await validateLocalUser(
      username,
      'not the password',
      (error: string, validUser: Express.User | false) => {
        expect(validUser).toBe(false);
        expect(error).toBe(null);
      }
    );
  } else {
    fail('user is null after createUser with valid username');
  }
});
