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
 * Filename: src/authconfig.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

import type {OAuth2} from 'oauth';
import OAuth2Strategy from 'passport-oauth2';

import {CleanOAuth2Strategy} from '../authhelpers';
import {
  DATACENTRAL_CLIENT_ID,
  DATACENTRAL_CLIENT_SECRET,
  DATACENTRAL_GROUP_PREFIX,
  CLUSTER_ADMIN_GROUP_NAME,
  HAVE_DATACENTRAL_MANAGE_ROLES,
} from '../buildconfig';
import {
  addEmailToUser,
  updateUser,
  getOrCreatePouchUser,
  pouch_user_to_express_user,
} from '../couchdb/users';
import {VerifyCallback, DoneFunction} from '../types';
import {PouchUser, UserServiceProfileUnlocked} from '../datamodel/users';

const MAIN_GROUPS = ['editor', 'public', 'moderator'];
export const LOGOUT_URL = 'https://auth.datacentral.org.au/cas/logout';

function ldap_group_to_group_name(group: string): string {
  const split_dn = group.split(',');
  const cn = split_dn[0];
  return cn.substring(3);
}

function dc_groups_to_couchdb_roles(groups: string[]): string[] {
  const roles: string[] = [];
  for (const group of groups) {
    const split_group = ldap_group_to_group_name(group).split('-');
    if (
      split_group[0] !== DATACENTRAL_GROUP_PREFIX ||
      split_group.length < 2 ||
      MAIN_GROUPS.includes(split_group[1])
    ) {
      // This is either the main groups for the team, or not the team
      // we're interested in
      console.debug('Skipping:', split_group[0], JSON.stringify(split_group));
      continue;
    }
    const project_name = split_group[1];
    if (project_name === 'admin') {
      roles.push(CLUSTER_ADMIN_GROUP_NAME);
      continue;
    }
    if (split_group.length === 2) {
      roles.push(project_name + '||team');
      continue;
    }
    roles.push(project_name + '||' + split_group.slice(2).join('-'));
  }
  return roles;
}

function ensure_string_array(groups: any): string[] {
  if (typeof groups === 'string') {
    return [groups];
  } else if (!Array.isArray(groups)) {
    console.error('DC groups not string or array', groups);
    return [];
  }
  return groups;
}

function get_user_id(profile: UserServiceProfileUnlocked): string {
  return profile.id.toLowerCase().trim();
}

function addDCRoles(user: PouchUser, roles: string[]) {
  // TODO: This should be modified work with roles being managed by conductor
  // itself
  user.roles = roles;
}

function oauth_verify(
  req: Request,
  accessToken: string,
  refreshToken: string,
  results: any,
  profile: any,
  cb: VerifyCallback
) {
  console.debug('DC oauth', accessToken, refreshToken, results, profile);
  const user_id = get_user_id(profile);
  getOrCreatePouchUser(user_id)
    .then((user: PouchUser) => {
      if (HAVE_DATACENTRAL_MANAGE_ROLES) {
        addDCRoles(
          user,
          dc_groups_to_couchdb_roles(
            ensure_string_array(profile.attributes.groups)
          )
        );
      }
      if (user.name === '') {
        user.name = profile.attributes.displayName;
      }
      addEmailToUser(user, profile.mail);
      user.profiles['datacentral'] = profile;

      return user;
    })
    .then(async (user: PouchUser) => {
      await updateUser(user);
      return pouch_user_to_express_user(user);
    })
    .then((user: Express.User) => cb(null, user, profile))
    .catch(err => {
      console.error('User saving error', err);
      cb(new Error('Failed to save user'), undefined);
    });
}

function auth_profile(oauth2: OAuth2, accessToken: string, done: DoneFunction) {
  oauth2.get(
    'https://auth.datacentral.org.au/cas/oauth2.0/profile',
    accessToken,
    (err: any, body: any, res: any) => {
      if (err) {
        console.error('DC oauth profile error', err, body, res);
        return done(err, err);
      }

      try {
        const json = JSON.parse(body);
        return done(null, json);
      } catch (ex) {
        return done(new Error('Failed to parse user profile'));
      }
    }
  );
}

export function get_strategy(callback_url: string): CleanOAuth2Strategy {
  if (DATACENTRAL_CLIENT_ID === '') {
    throw Error('DATACENTRAL_CLIENT_ID must be set to use Data Central');
  }
  if (DATACENTRAL_CLIENT_SECRET === '') {
    throw Error('DATACENTRAL_CLIENT_SECRET must be set to use Data Central');
  }
  const st = new CleanOAuth2Strategy(
    {
      authorizationURL:
        'https://auth.datacentral.org.au/cas/oauth2.0/authorize',
      tokenURL: 'https://auth.datacentral.org.au/cas/oauth2.0/accessToken',
      clientID: DATACENTRAL_CLIENT_ID,
      clientSecret: DATACENTRAL_CLIENT_SECRET,
      callbackURL: callback_url,
      passReqToCallback: true,
    },
    oauth_verify as unknown as OAuth2Strategy.VerifyFunctionWithRequest
  );
  st.setUserProfileHook(auth_profile);
  return st;
}
