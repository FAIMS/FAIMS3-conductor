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

import {app} from './core';
import {get_user_auth_token} from './authkeys/user';
import {NonUniqueProjectID} from './datamodel/core';
import {requireAuthentication} from './middleware';
import {userCanInviteToProject, inviteEmailToProject} from './registration';
import {users_db} from './sync/databases';

export {app};

app.post(
  '/project/:project_id/invite',
  requireAuthentication,
  async (req, res) => {
    if (typeof req.body['email'] !== 'string') {
      throw Error('Expected 1 string parameter email');
    }
    if (typeof req.body['role'] !== 'string') {
      throw Error('Expected 1 string parameter role');
    }
    const email: string = req.body['email'];
    const project_id: NonUniqueProjectID = req.params.project_id;
    const role: string = req.body['role'];

    const can_invite = await userCanInviteToProject(req.user, project_id);
    if (!can_invite) {
      res.send('You cannot invite user to project');
    } else {
      await inviteEmailToProject(email, project_id, role);
      res.send('Email invited to project');
    }
  }
);

app.get('/auth/', (req, res) => {
  // Allow the user to decide what auth mechanism to use
  res.send("Select provider: <a href='/auth/default/'>Data Central</a>");
});

app.get('/', async (req, res) => {
  if (req.user) {
    res.render('home', {user: req.user});
  } else {
    res.send("Not logged in, go to <a href='/auth/'>here</a>");
  }
});

app.get('/send-token/', (req, res) => {
  if (req.user) {
    console.log('hello send-token');
    res.render('send-token', {user: req.user});
  } else {
    res.redirect('/');
  }
});

app.get('/get-token/', async (req, res) => {
  if (req.user) {
    const signing_key = app.get('faims3_token_signing_key');
    if (signing_key === null || signing_key === undefined) {
      res.status(500).send('Signing key not set up');
    } else {
      res.send(await get_user_auth_token(req.user.user_id, signing_key));
    }
  } else {
    res.status(403).end();
  }
});

app.get('/users/', async (req, res) => {
  res.send(await users_db.allDocs({include_docs: true, endkey: '_'}));
});

app.get('/up/', (req, res) => {
  res.status(200).json({up: 'true'});
});

app.get('/good', (req, res) => {
  res.status(200).json({req: Object.keys(req), res: Object.keys(res)});
});

app.get('/bad', (req, res) => {
  res.status(200).json({req: Object.keys(req), res: Object.keys(res)});
});
