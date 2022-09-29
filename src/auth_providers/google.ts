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
 * Filename: google.ts
 * Description:
 *   This module configure the authentication using Google's OAuth2.0 interface
 */

import {Strategy, VerifyCallback} from 'passport-google-oauth20';

import {GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET} from '../buildconfig';
import {
  addEmailsToUser,
  updateUser,
  getOrCreatePouchUser,
  pouch_user_to_express_user,
} from '../couchdb/users';
import {PouchUser} from '../datamodel/users';

function oauth_verify(
  req: Request,
  accessToken: string,
  refreshToken: string,
  results: any,
  profile: any,
  cb: VerifyCallback
) {
  console.debug('google oauth', accessToken, refreshToken, results, profile);
  const user_id = profile.id;
  getOrCreatePouchUser(user_id)
    .then((user: PouchUser) => {
      if (user.name === '') {
        user.name = profile.displayName;
      }
      addEmailsToUser(user, profile.emails);
      user.profiles['google'] = profile;

      return user;
    })
    .then(async (user: PouchUser) => {
      await updateUser(user);
      return pouch_user_to_express_user(user);
    })
    .then((user: Express.User) => cb(null, user, profile))
    .catch(err => {
      console.error('User saving error', err);
      cb(new Error('Failed to save user'), undefined);
    });
}

export function get_strategy(callback_url: string): Strategy {
  if (GOOGLE_CLIENT_ID === '') {
    throw Error('GOOGLE_CLIENT_ID must be set to use Google');
  }
  if (GOOGLE_CLIENT_SECRET === '') {
    throw Error('GOOGLE_CLIENT_SECRET must be set to use Google');
  }
  const st = new Strategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: callback_url,
      passReqToCallback: true,
      scope: ['profile', 'email', 'https://www.googleapis.com/auth/plus.login'],
      state: true,
    },
    oauth_verify as any
  );
  return st;
}
