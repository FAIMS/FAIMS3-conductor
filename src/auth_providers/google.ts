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
  getUserFromEmailOrUsername,
  createUser,
} from '../couchdb/users';

async function oauth_verify(
  req: Request,
  accessToken: string,
  refreshToken: string,
  results: any,
  profile: any,
  done: VerifyCallback
) {
  console.debug('google oauth', accessToken, refreshToken, results, profile);

  // three cases:
  //   - we have a user with this user_id from a previous google login
  //   - we already have a user with the email address in this profile, add the profile if not there
  //   - we don't, create a new user record and add the profile

  let user = await getUserFromEmailOrUsername(profile.id);
  if (user) {
    // TODO: do we need to validate further? could check that the profiles match???
    done(null, user, profile);
  }

  const emails = profile.emails
    .filter((o: any) => o.verified)
    .map((o: any) => o.value);

  for (let i = 0; i < emails.length; i++) {
    user = await getUserFromEmailOrUsername(emails[i]);
    if (user) {
      // add the profile if not already there
      if (!('google' in user.profiles)) {
        user.profiles['google'] = profile;
        await updateUser(user);
      }
      done(null, user, profile);
      break;
    }
  }
  if (!user) {
    let errorMsg = '';
    // otherwise, we make a new user
    [user, errorMsg] = await createUser(emails[0], profile.id);

    if (user) {
      user.name = profile.displayName;
      user.profiles['google'] = profile;
      addEmailsToUser(user, emails);
      await updateUser(user);
      done(null, user, profile);
    } else {
      throw Error(errorMsg);
    }
  }
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
