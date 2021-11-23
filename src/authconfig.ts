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
 * Filename: src/authconfig.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

import OAuth2Strategy from 'passport-oauth2';
import {AuthInfo} from './datamodel/database';
import {VerifyCallback} from './types';
import {HOST_NAME} from './buildconfig';

export const secret = 'Your secret phrase here.';

console.error("Hostname is:", HOST_NAME);

export const auth_mechanisms: {
  [auth_id: string]: {
    public: AuthInfo;
    strategy: OAuth2Strategy.StrategyOptionsWithRequest;
  };
} = {
  default: {
    // Should be in sync with clients
    public: {
      portal: HOST_NAME,
      type: 'oauth',
      name: 'Data Central',
    },
    // Not visible to clients
    strategy: {
      authorizationURL:
        'https://auth.datacentral.org.au/cas/oauth2.0/authorize',
      tokenURL: 'https://auth.datacentral.org.au/cas/oauth2.0/accessToken',
      clientID: '5c1dca8c5c10f7b96f50e5829816a260-datacentral.org.au',
      clientSecret:
        '3478721c4c92e9e6118aaa315712854087ebc4b01abb9e7977bd17dc66d0c67c',
      callbackURL: `${HOST_NAME}/auth-return/default/`,
      passReqToCallback: true,
    },
  },
};

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
  cb(null, user, profile);
}
