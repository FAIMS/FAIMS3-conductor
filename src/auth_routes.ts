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
 * Filename: src/auth_routes.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

import passport from 'passport';
import {DoneFunction} from './types';

passport.serializeUser((user: Express.User, done: DoneFunction) => {
  console.log('user', user);
  done(null, user.user_id);
});

passport.deserializeUser((id: string, done: DoneFunction) => {
  console.log('id', id);
  done(null, {user_id: id});
});

export function add_auth_routes(app: any, handlers: any) {
  for (const handler of handlers) {
    app.get(`/auth/${handler}/`, (req: any, res: any) => {
      if (
        typeof req.query?.state === 'string' ||
        typeof req.query?.state === 'undefined'
      ) {
        passport.authenticate(handler)(req, res, (err?: {}) => {
          throw err ?? Error('Authentication failed (next, no error)');
        });
      } else {
        throw Error(
          `state must be a string, or not set, not ${typeof req.query?.state}`
        );
      }
    });

    app.get(
      `/auth-return/${handler}/`,
      passport.authenticate(handler, {
        successRedirect: '/',
        failureRedirect: '/bad',
        failureFlash: true,
        //successFlash: 'Welcome!',
      })
    );
  }
}
