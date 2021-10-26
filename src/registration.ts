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
 * Filename: src/registration.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

import {v4 as uuidv4} from 'uuid';

import {NonUniqueProjectID} from './datamodel/core';
import {PouchUser} from './datamodel/database';
import {getUserByEmail, updateUser} from './users';

export async function userCanInviteToProject(
  user: Express.User | undefined,
  project_id: NonUniqueProjectID
): Promise<boolean> {
  // TODO: Add actual lookups to check ACLs etc.
  if (user === undefined) {
    return false;
  }
  return true;
}

export async function inviteEmailToProject(
  email: string,
  project_id: NonUniqueProjectID,
  role: string
) {
  // TODO: send emails, do the rest of the process
  console.log('TBD: Sending email to user:', email, project_id, role);

  /* TODO: move this to invite function
  // Create a user with the email if it doesn't exist yet
  const user_id = uuidv4();
  const existing_user: PouchUser = (await getUserByEmail(email)) ?? {
    _id: 'org.couchdb.user:' + user_id,
    name: user_id,
    type: 'user',
    roles: [],
    emails: [email],
  };

  // Append to the role list for the given project:
  existing_user.project_roles = {
    ...(existing_user.project_roles ?? {}),
    [project_id]: [...(existing_user.project_roles?.[project_id] ?? []), role],
  };

  updateUser(existing_user);
  */
}
