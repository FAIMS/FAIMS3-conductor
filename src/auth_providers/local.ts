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
  createUser,
  getUserFromEmailOrUsername,
  updateUser,
} from '../couchdb/users';

const SALT = 'someNiceSaltForYourPassword';

type LocalProfile = {
  password: string;
};

export const get_strategy = () => {
  return new Strategy(
    async (username: string, password: string, done: CallableFunction) => {
      const user = await getUserFromEmailOrUsername(username);
      if (user) {
        // check the password...
        pbkdf2(password, SALT, 100000, 64, 'sha256', (err, hashedPassword) => {
          const storedPassword = (user.profiles['local'] as LocalProfile)
            .password as string;
          if (hashedPassword.toString() === storedPassword) {
            return done(null, user);
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

/**
 * registerLocalUser - create a new user account
 *   either `username` or `email` is required to make an account
 *   no existing account should exist with these credentials
 * @param username - a username, not previously used
 * @param email - an email address, not previously used
 * @param name - user's full name
 * @param password - a password
 * @param roles - a list of user roles
 */
export const registerLocalUser = async (
  username: string,
  email: string,
  name: string,
  password: string
): Promise<[Express.User | null, string]> => {
  const [user, error] = await createUser(email, username);
  if (user) {
    user.name = name;
    addLocalPasswordForUser(user, password);
  }
  return [user, error];
};

export const addLocalPasswordForUser = async (
  user: Express.User,
  password: string
) => {
  pbkdf2(password, SALT, 100000, 64, 'sha256', (err, hashedPassword) => {
    if (err) {
      throw Error('error hashing password');
    }
    user.profiles['local'] = {
      password: hashedPassword.toString(),
    };
    updateUser(user);
  });
};
