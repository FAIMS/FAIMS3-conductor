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
 * Filename: routes.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

import passport from 'passport';
import {v4 as uuidv4} from 'uuid';

import {app} from './core';
import {NonUniqueProjectID} from './datamodel/core';
import {PouchUser} from './datamodel/database';
import {users_db} from './sync/databases';
import {getUserByEmail, updateUser} from './users';

export {app};

app.post('/project/:project_id/invite', async (req, res) => {
  if (typeof req.body['email'] !== 'string') {
    throw Error('Expected 1 string parameter email');
  }
  if (typeof req.body['role'] !== 'string') {
    throw Error('Expected 1 string parameter role');
  }
  const email: string = req.body['email'];
  const project_id: NonUniqueProjectID = req.params.project_id;
  const role: string = req.body['role'];

  // TODO: Check if you're authenticated

  // Create a user with the email if it doesn't exist yet
  const user_id = uuidv4();
  const existing_user: PouchUser = (await getUserByEmail(email)) ?? {
    _id: 'org.couchdb.user:' + user_id,
    name: user_id,
    type: 'user',
    roles: [],
    emails: [email],
  };

  // Append to the role list for the given project:
  existing_user.project_roles = {
    ...(existing_user.project_roles ?? {}),
    [project_id]: [...(existing_user.project_roles?.[project_id] ?? []), role],
  };

  updateUser(existing_user);
});

app.get('/auth', (req, res) => {
  // Allow the user to decide what auth mechanism to use
  res.send();
});

app.get('/auth/:auth_id', (req, res) => {
  if (
    typeof req.query?.state === 'string' ||
    typeof req.query?.state === 'undefined'
  ) {
    passport.authenticate(req.params.auth_id)(req, res, (err?: {}) => {
      throw err ?? Error('Authentication failed (next, no error)');
    });
  } else {
    throw Error(
      `state must be a string, or not set, not ${typeof req.query?.state}`
    );
  }
});

app.get(
  '/auth-return',
  passport.authenticate('oauth2', {failureRedirect: '/login'}),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

app.get('/', async (req, res) => {
  res.send(await users_db.allDocs({include_docs: true, endkey: '_'}));
});

app.get('/up', (req, res) => {
  res.status(200).json({up: 'true'});
});
