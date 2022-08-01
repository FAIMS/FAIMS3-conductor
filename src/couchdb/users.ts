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
 * Filename: index.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

import PouchDB from 'pouchdb';

import {CONDUCTOR_USER_DB, LOCAL_COUCHDB_AUTH} from '../buildconfig';
import {
  PouchUser,
  AllProjectRoles,
  OtherRoles,
  CouchDBUsername,
  CouchDBUserRoles,
} from '../datamodel/users';

function createUsersDB(): PouchDB.Database<PouchUser> {
  const pouch_options: PouchDB.Configuration.RemoteDatabaseConfiguration = {};

  if (LOCAL_COUCHDB_AUTH !== undefined) {
    pouch_options.auth = LOCAL_COUCHDB_AUTH;
  }
  return new PouchDB(CONDUCTOR_USER_DB, pouch_options);
}

const users_db = createUsersDB();

export async function getOrCreatePouchUser(
  user_id: string
): Promise<PouchUser> {
  try {
    const user = await users_db.get(user_id);
    return user;
  } catch (err: any) {
    if (err.status === 404) {
      return {
        _id: user_id,
        name: '',
        emails: [],
        type: 'user',
        roles: [],
        profiles: {},
        owned: [],
      };
    } else {
      console.error('Failed to get user', err);
      throw Error('Failed to get user');
    }
  }
}

export async function getOrCreateExpressUser(
  user_id: string
): Promise<Express.User> {
  return pouch_user_to_express_user(await getOrCreatePouchUser(user_id));
}

export async function getUserByEmail(email: string): Promise<null | PouchUser> {
  const result = await users_db.find({
    selector: {emails: {$elemMatch: {$eq: email}}},
  });
  if (result.docs.length === 0) {
    return null;
  } else if (result.docs.length === 1) {
    return result.docs[0];
  } else {
    throw Error(`Multiple conflicting users with email ${email}`);
  }
}

export async function getExpressUserByEmail(
  email: string
): Promise<null | Express.User> {
  const user = await getUserByEmail(email);
  if (user === null) {
    return null;
  }
  return pouch_user_to_express_user(user);
}

export async function updateUser(user: PouchUser): Promise<void> {
  try {
    await users_db.put(user);
  } catch (err: any) {
    if (err.status === 409) {
      try {
        const existing_user = await users_db.get(user._id);
        user._rev = existing_user._rev;
        await users_db.put(user);
      } catch (err) {
        console.error('Failed to update user in conflict', err);
        throw Error('Failed to update user in conflict');
      }
    } else {
      console.error('Failed to update user', err);
      throw Error('Failed to update user');
    }
  }
}

export async function get_couchdb_user_from_username(
  username: CouchDBUsername
): Promise<PouchUser | null> {
  try {
    const user = await users_db.get(username);
    return user;
  } catch (err) {
    console.error('Failed to get user', err);
    return null;
  }
}

export async function get_user_from_username(
  username: CouchDBUsername
): Promise<Express.User | null> {
  try {
    const couch_user = await get_couchdb_user_from_username(username);
    if (couch_user === null) {
      return null;
    }
    const user = pouch_user_to_express_user(couch_user);
    return user;
  } catch (err) {
    console.error('Failed to get user', err);
    return null;
  }
}

function conductorRolesToCouchDBRoles(
  project_roles: AllProjectRoles,
  other_roles: OtherRoles
): CouchDBUserRoles {
  const couch_roles: CouchDBUserRoles = [];
  for (const project in project_roles) {
    for (const role of project_roles[project]) {
      couch_roles.push(project + '||' + role);
    }
  }
  return couch_roles.concat(other_roles);
}

function couchDBRolesToConductorRoles(
  couch_roles: CouchDBUserRoles
): [AllProjectRoles, OtherRoles] {
  const project_roles: AllProjectRoles = {};
  const other_roles: OtherRoles = [];

  for (const role of couch_roles) {
    const split_role = role.split('||', 2);
    if (split_role.length === 1) {
      other_roles.push(split_role[0]);
    } else {
      const project_name = split_role[0];
      const proj_roles = project_roles[project_name] ?? [];
      proj_roles.push(split_role[1]);
      project_roles[project_name] = proj_roles;
    }
  }

  return [project_roles, other_roles];
}

export function express_user_to_pouch_user(user: Express.User): PouchUser {
  return {
    type: 'user',
    _id: user.user_id,
    name: user.name,
    emails: user.emails,
    roles: conductorRolesToCouchDBRoles(user.project_roles, user.other_roles),
    owned: user.owned,
    profiles: user.profiles,
  };
}

export function pouch_user_to_express_user(user: PouchUser): Express.User {
  const [project_roles, other_roles] = couchDBRolesToConductorRoles(user.roles);
  return {
    user_id: user._id,
    name: user.name,
    emails: user.emails,
    project_roles: project_roles,
    other_roles: other_roles,
    owned: user.owned,
    profiles: user.profiles,
  };
}

export async function saveUserToDB(user: Express.User) {
  await updateUser(express_user_to_pouch_user(user));
}

export function addEmailToUser(user: PouchUser | Express.User, email: string) {
  addEmailsToUser(user, [email]);
}

export function addEmailsToUser(
  user: PouchUser | Express.User,
  emails: string[]
) {
  const all_emails = new Set(user.emails.concat(emails));
  user.emails = Array.from(all_emails);
}
