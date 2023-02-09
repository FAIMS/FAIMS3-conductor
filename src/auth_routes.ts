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
 * Filename: src/auth_routes.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

import passport from 'passport';

import {CONDUCTOR_PUBLIC_URL} from './buildconfig';
import {DoneFunction} from './types';
import {get_user_from_username} from './couchdb/users';

const AVAILABLE_AUTH_PROVIDER_DISPLAY_INFO: {[name: string]: any} = {
  datacentral: {
    name: 'Data Central',
  },
  google: {
    name: 'Google',
  },
};

const HANDLER_OPTIONS: {[name: string]: any} = {
  datacentral: {},
  google: {
    prompt: 'select_account',
  },
};

passport.serializeUser((user: Express.User, done: DoneFunction) => {
  done(null, user.user_id);
});

passport.deserializeUser((id: string, done: DoneFunction) => {
  get_user_from_username(id)
    .then(user_data => {
      done(null, user_data);
    })
    .catch(err => done(err, null));
});

export function determine_callback_url(provider_name: string): string {
  return `${CONDUCTOR_PUBLIC_URL}/auth-return/${provider_name}`;
}

export function add_auth_routes(app: any, handlers: any) {
  console.log('Adding auth routes', handlers);
  app.get('/auth/', (req: any, res: any) => {
    // Allow the user to decide what auth mechanism to use
    console.log('XXXXXX', handlers);
    const available_provider_info = [];
    for (const handler of handlers) {
      console.debug('handlers', handlers);
      available_provider_info.push({
        label: handler,
        name: AVAILABLE_AUTH_PROVIDER_DISPLAY_INFO[handler].name,
      });
    }
    res.render('auth', {providers: available_provider_info});
  });

  for (const handler of handlers) {
    app.get(`/auth/${handler}/`, (req: any, res: any) => {
      if (
        typeof req.query?.state === 'string' ||
        typeof req.query?.state === 'undefined'
      ) {
        passport.authenticate(handler, HANDLER_OPTIONS[handler])(
          req,
          res,
          (err?: {}) => {
            // Hack to avoid users getting caught when they're not in the right
            // groups.
            console.error('Authentication Error', err);
            res.redirect('https://auth.datacentral.org.au/cas/logout');
            //throw err ?? Error('Authentication failed (next, no error)');
          }
        );
      } else {
        throw Error(
          `state must be a string, or not set, not ${typeof req.query?.state}`
        );
      }
    });

    app.get(
      // This should line up with determine_callback_url above
      `/auth-return/${handler}/`,
      passport.authenticate(handler, {
        successRedirect: '/send-token/',
        failureRedirect: '/bad',
        failureFlash: true,
        //successFlash: 'Welcome!',
      })
    );
  }
}
