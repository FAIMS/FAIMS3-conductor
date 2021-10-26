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
 * Filename: src/authkeys/read.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

import {jwtVerify} from 'jose';

import type {CouchDBUsername, CouchDBUserRoles, SigningKey} from './types';

export async function read_auth_key(token: string, signing_key: SigningKey) {
  const {payload, protectedHeader} = await jwtVerify(
    token,
    signing_key.public_key,
    {
      algorithms: [signing_key.alg],
    }
  );

  return {
    username: payload.sub,
    roles: payload['_couchdb.roles'],
    instance_name: payload.iss,
    issued_at: payload.iat,
    key_id: protectedHeader.kid,
  };
}
