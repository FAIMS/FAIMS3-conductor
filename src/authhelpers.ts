import OAuth2Strategy from 'passport-oauth2';
import {OAuth2} from 'oauth';

import {UserProfileCallback, DoneFunction} from './types';

export class CleanOAuth2Strategy extends OAuth2Strategy {
  _userProfileHook: UserProfileCallback | null = null;
  setUserProfileHook(callback: UserProfileCallback) {
    this._userProfileHook = callback;
  }

  userProfile(accessToken: string, done: DoneFunction): void {
    if (this._userProfileHook === null) {
      throw Error("User profile function not set up");
    }
    return this._userProfileHook(this._oauth2, accessToken, done);
  }
}

export function dc_auth_profile(
  oauth2: OAuth2,
  accessToken: string,
  done: DoneFunction
) {
  oauth2.get(
    'https://auth.datacentral.org.au/cas/oauth2.0/profile',
    accessToken,
    (err: any, body: any, res: any) => {
      if (err) {
        console.error(err, body, res);
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
