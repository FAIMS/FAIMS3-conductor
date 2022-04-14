import type {OAuth2} from 'oauth';

import {DATACENTRAL_GROUP_PREFIX} from '../buildconfig';
import {saveUserToDB} from '../couchdb/users';
import {VerifyCallback, DoneFunction} from '../types';

const MAIN_GROUPS = ['editor', 'admin', 'public', 'moderator'];

function dc_groups_to_couchdb_roles(groups: string[]): string[] {
  const roles: string[] = [];
  for (const group of groups) {
    const split_group = group.split('-');
    if (
      split_group[0] !== DATACENTRAL_GROUP_PREFIX ||
      split_group.length < 2 ||
      MAIN_GROUPS.includes(split_group[1])
    ) {
      // This is either the main groups for the team, or not the team
      // we're interested in
      continue;
    }
    const project_name = split_group[1];
    if (split_group.length === 2) {
      roles.push(project_name + '||team');
      continue;
    }
    roles.push(project_name + '||' + split_group.slice(2).join('-'));
  }
  return roles;
}

export function oauth_verify(
  req: Request,
  accessToken: string,
  refreshToken: string,
  results: any,
  profile: any,
  cb: VerifyCallback
) {
  console.debug('oauth', req, accessToken, refreshToken, results, profile);
  const roles = dc_groups_to_couchdb_roles(profile.attributes.groups);
  const name = profile.attributes.displayName;
  const user: Express.User = {
    user_id: profile.id,
    name: name,
    roles: roles,
    other_props: profile,
  };
  saveUserToDB(user)
    .then(() => cb(null, user, profile))
    .catch(err => {
      console.error('User saving error', err);
      cb(new Error('Failed to save user'), undefined);
    });
}

export function auth_profile(
  oauth2: OAuth2,
  accessToken: string,
  done: DoneFunction
) {
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
