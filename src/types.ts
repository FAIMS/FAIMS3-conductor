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
 * Filename: src/types.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

/* eslint-disable node/no-extraneous-import */
import type {OAuth2} from 'oauth';

// See https://stackoverflow.com/questions/65772869/how-do-i-type-hint-the-user-argument-when-calling-passport-serializeuser-in-type
declare global {
  namespace Express {
    interface User {
      user_id: string;
      roles?: string[];
      name?: string;
      other_props?: any;
    }
  }
}
export type DoneFunction = (err?: Error | null, profile?: any) => void;
export type UserProfileCallback = (
  oauth: OAuth2,
  accessToken: string,
  done: DoneFunction
) => void;
export type VerifyCallback = (
  err?: Error | null,
  user?: Express.User,
  info?: object
) => void;
export type {OAuth2};
