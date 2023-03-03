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
 * Filename: users.ts
 * Description:
 *   This module implements access to the users database and associated functions
 * for handling users.
 */

import {getUsersDB} from '.';
import {NonUniqueProjectID} from '../datamodel/core';
import {
  PouchUser,
  AllProjectRoles,
  ConductorRole,
  OtherRoles,
  CouchDBUsername,
  CouchDBUserRoles,
} from '../datamodel/users';

/**
 * getOrCreatePouchUser - retrieve a user record from the database or if it is
 * not present, create one (but don't save it in the database)
 * @param user_id User identifier
 * @returns A PouchUser record
 */
export async function getOrCreatePouchUser(
  user_id: string
): Promise<PouchUser> {
  try {
    const users_db = getUsersDB();
    if (users_db) {
      const user = (await users_db.get(user_id)) as PouchUser;
      return user;
    } else {
      console.log('Failed to connect to user db');
      throw Error('Failed to connect to user database');
    }
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
      //console.error('Failed to get user', err);
      throw Error(`Failed to get user ${user_id}`);
    }
  }
}

/**
 * createUser - create a new user record ensuring that the username or password
 *   - at least one of these needs to be supplied but the other can be empty
 * @param email - email address
 * @param username - username
 * @returns a new Express.User object ready to be saved in the DB
 */
export async function createUser(
  email: string,
  username: string
): Promise<[Express.User | null, string]> {
  if (!email && !username) {
    return [null, 'at least one of username and email is required'];
  }

  const users_db = getUsersDB();
  if (users_db) {
    if (email && (await getUserFromEmail(email))) {
      return [null, `user with email '${email}' already exists`];
    }
    if (username && (await getUserFromUsername(username))) {
      return [null, `user with username ${username} already exists`];
    }
    if (!username) {
      username = email.toLowerCase();
    }

    // make a new user record
    return [
      {
        _id: username,
        user_id: username,
        name: '',
        emails: [email.toLowerCase()],
        roles: [],
        project_roles: [] as unknown as AllProjectRoles,
        other_roles: [],
        owned: [],
        profiles: {},
      },
      '',
    ];
  } else {
    console.log('Failed to connect to user db');
    throw Error('Failed to connect to user database');
  }
}

/**
 * getUserFromEmailOrUsername - find a user based on an identifier that could be either an email or username
 * @param identifier - either an email address or username
 * @returns The Express.User record denoted by the identifier or null if it doesn't exist
 */
export async function getUserFromEmailOrUsername(
  identifier: string
): Promise<null | Express.User> {
  let user;
  user = await getUserFromEmail(identifier);
  if (!user) {
    user = await getUserFromUsername(identifier);
  }
  return user;
}

/**
 * getUserFromEmail - retrieve a user record given their email address
 * @param email User email address
 * @returns An Express.User record or null if the user is not in the database
 */
async function getUserFromEmail(email: string): Promise<null | Express.User> {
  const users_db = getUsersDB();
  if (users_db) {
    const result = await users_db.find({
      selector: {emails: {$elemMatch: {$eq: email.toLowerCase()}}},
    });
    if (result.docs.length === 0) {
      return null;
    } else if (result.docs.length === 1) {
      return result.docs[0] as Express.User;
    } else {
      throw Error(`Multiple conflicting users with email ${email}`);
    }
  } else {
    throw Error('Failed to connect to user database');
  }
}

/**
 * getUserFromUsername - retrieve a user record given their username
 * @param username - the username
 * @returns An Express.User record or null if the user is not in the database
 */
async function getUserFromUsername(
  username: CouchDBUsername
): Promise<Express.User | null> {
  const users_db = getUsersDB();
  if (users_db) {
    try {
      return (await users_db.get(username)) as Express.User;
    } catch (err) {
      return null;
    }
  } else {
    throw Error('Failed to connect to user database');
  }
}

/**
 * updateUser - update a user record
 * @param user An Express.User record to be written to the database
 */
export async function updateUser(user: Express.User): Promise<void> {
  const users_db = getUsersDB();
  if (users_db) {
    try {
      user._id = user.user_id;
      await users_db.put(user);
    } catch (err: any) {
      if (err.status === 409) {
        try {
          const existing_user = await users_db.get(user.user_id);
          user._rev = existing_user._rev;
          console.log('updating user', user);
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
  } else {
    throw Error('Failed to connect to user database');
  }
}

function projectRoleToCouchRole(
  project_id: NonUniqueProjectID,
  role: ConductorRole
): string {
  return project_id + '||' + role;
}

function conductorRolesToCouchDBRoles(
  project_roles: AllProjectRoles,
  other_roles: OtherRoles
): CouchDBUserRoles {
  const couch_roles: CouchDBUserRoles = [];
  for (const project in project_roles) {
    for (const role of project_roles[project]) {
      couch_roles.push(projectRoleToCouchRole(project, role));
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
  console.log('ROLES', project_roles, other_roles);
  return [project_roles, other_roles];
}

// export function express_user_to_pouch_user(user: Express.User): PouchUser {
//   return {
//     type: 'user',
//     _id: user.user_id,
//     name: user.name,
//     emails: user.emails,
//     roles: conductorRolesToCouchDBRoles(user.project_roles, user.other_roles),
//     owned: user.owned,
//     profiles: user.profiles,
//   };
// }

// export function pouch_user_to_express_user(user: PouchUser): Express.User {
//   const [project_roles, other_roles] = couchDBRolesToConductorRoles(user.roles);
//   return {
//     user_id: user._id,
//     name: user.name,
//     emails: user.emails,
//     roles: user.roles,             // copied over so that we can get rid of PouchUser eventually
//     project_roles: project_roles,
//     other_roles: other_roles,
//     owned: user.owned,
//     profiles: user.profiles,
//   };
// }

/**
 * addEmailsToUser - modify the 'emails' property of this record (but don't save it to the db)
 * @param user an Express.User record
 * @param emails an array of email addresses
 */
export function addEmailsToUser(user: Express.User, emails: string[]) {
  const all_emails = new Set(user.emails.concat(emails));
  user.emails = Array.from(all_emails).map(e => e.toLowerCase());
}

export function removeProjectRoleFromUser(
  user: Express.User,
  project_id: NonUniqueProjectID,
  role: ConductorRole
) {
  const project_roles = user.project_roles[project_id] ?? [];
  if (project_roles.length === 0) {
    console.debug('User has no roles in project', user, project_id, role);
  } else {
    user.project_roles[project_id] = project_roles.filter(r => r !== role);
  }
}

export function removeOtherRoleFromUser(
  user: Express.User,
  role: ConductorRole
) {
  const other_roles = user.other_roles ?? [];
  if (other_roles.length === 0) {
    console.debug('User has other roles', user, role);
  } else {
    user.other_roles = other_roles.filter(r => r !== role);
  }
}

/**
 * removeRoleFromEmail - modify the roles of a user in the database, removing some permissions
 *   will update the database
 * @param email user email address
 * @param project_id Project identifier to remove permissions from
 * @param role role to remove permissions for
 */
export async function removeRoleFromEmail(
  email: string,
  project_id: NonUniqueProjectID,
  role: ConductorRole
) {
  const users_db = getUsersDB();
  if (users_db) {
    const couch_role = projectRoleToCouchRole(project_id, role);
    const users: Express.User[] = [];
    const res = await users_db.find({
      selector: {emails: {$elemMatch: {$eq: email}}},
    });
    for (const user of res.docs) {
      const u = user as Express.User;
      const roles = u.roles;
      u.roles = roles.filter(r => r !== couch_role);
      users.push(u);
    }
    await users_db.bulkDocs(users);
  } else {
    throw Error('Failed to connect to user database');
  }
}
