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
 * Filename: local.ts
 * Description:
 *   Provides local authentication for Conductor
 */

import {pbkdf2} from 'crypto';
import {Strategy} from 'passport-local';
import {
  addEmailsToUser,
  getOrCreatePouchUser,
  getUserByEmail,
  pouch_user_to_express_user,
  updateUser,
} from '../couchdb/users';

const SALT = 'someNiceSaltForYourPassword';

type LocalProfile = {
  password: string;
};

export const get_strategy = () => {
  return new Strategy(
    async (username: string, password: string, done: CallableFunction) => {
      const user = await getUserByEmail(username);
      if (user) {
        // check the password...
        pbkdf2(password, SALT, 100000, 64, 'sha256', (err, hashedPassword) => {
          const storedPassword = (user.profiles['local'] as LocalProfile)
            .password as string;
          if (hashedPassword.toString() === storedPassword) {
            return done(null, pouch_user_to_express_user(user));
          } else {
            return done(null, false);
          }
        });
      } else {
        return done(null, false);
      }
    }
  );
};

export const registerLocalUser = async (
  name: string,
  email: string,
  password: string,
  roles: string[]
) => {
  const user = await getOrCreatePouchUser(email);

  pbkdf2(password, SALT, 100000, 64, 'sha256', (err, hashedPassword) => {
    if (err) {
      throw Error('error hashing password');
    }
    user.profiles['local'] = {
      password: hashedPassword.toString(),
    };
    user.name = name;
    user.roles = roles;
    addEmailsToUser(user, [email]);
    console.log('new local user', user);
    updateUser(user);
  });
};
