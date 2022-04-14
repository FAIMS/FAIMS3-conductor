import type {OAuth2} from 'oauth';

import {saveUserToDB} from '../couchdb/users';
import {VerifyCallback, DoneFunction} from '../types';

export function oauth_verify(
  req: Request,
  accessToken: string,
  refreshToken: string,
  results: any,
  profile: any,
  cb: VerifyCallback
) {
  console.debug('oauth', req, accessToken, refreshToken, results, profile);
  const user: Express.User = {
    user_id: profile.id,
    user_props: profile,
  };
  saveUserToDB(user)
    .then(() => cb(null, user, profile))
    .catch(err => {
      console.error('User saving error', err);
      cb(new Error('Failed to save user'), undefined);
    });
}

export function auth_profile(
  oauth2: OAuth2,
  accessToken: string,
  done: DoneFunction
) {
  oauth2.get(
    'https://auth.datacentral.org.au/cas/oauth2.0/profile',
    accessToken,
    (err: any, body: any, res: any) => {
      if (err) {
        console.error('DC oauth profile error', err, body, res);
        return done(err, err);
      }

      try {
        const json = JSON.parse(body);
        return done(null, json);
      } catch (ex) {
        return done(new Error('Failed to parse user profile'));
      }
    }
  );
}
