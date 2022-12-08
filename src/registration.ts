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
 * Filename: src/registration.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */
import {v4 as uuidv4} from 'uuid';

import {NonUniqueProjectID} from './datamodel/core';
import {RoleInvite, Email, ConductorRole} from './datamodel/users';
import {saveUserToDB} from './couchdb/users';
import {express_user_to_pouch_user} from './couchdb/users';
import {saveInvite, deleteInvite} from './couchdb/invites';
import {CONDUCTOR_PUBLIC_URL, CLUSTER_ADMIN_GROUP_NAME} from './buildconfig';
import {sendEmail} from './email';

const ADMIN_ROLE = 'admin';

export function userEquivalentToProjectAdmin(
  user: Express.User | undefined,
  project_id: NonUniqueProjectID
): boolean {
  if (user === undefined) {
    return false;
  }
  const project_roles = user.project_roles[project_id] ?? [];
  if (project_roles.includes(ADMIN_ROLE)) {
    return true;
  }
  if (user.other_roles.includes(CLUSTER_ADMIN_GROUP_NAME)) {
    return true;
  }
  return false;
}

export function userCanInviteToProject(
  user: Express.User | undefined,
  project_id: NonUniqueProjectID
): boolean {
  if (user === undefined) {
    return false;
  }
  const project_roles = user.project_roles[project_id] ?? [];
  if (project_roles.includes(ADMIN_ROLE)) {
    return true;
  }
  if (user.other_roles.includes(CLUSTER_ADMIN_GROUP_NAME)) {
    return true;
  }
  return false;
}

export function userCanRemoveProjectRole(
  user: Express.User | undefined,
  project_id: NonUniqueProjectID,
  role: ConductorRole
): boolean {
  if (user === undefined) {
    return false;
  }
  const project_roles = user.project_roles[project_id] ?? [];
  if (project_roles.includes(ADMIN_ROLE) && role !== ADMIN_ROLE) {
    return true;
  }
  if (user.other_roles.includes(CLUSTER_ADMIN_GROUP_NAME)) {
    return true;
  }
  return false;
}

export function userCanAddOtherRole(user: Express.User | undefined): boolean {
  if (user === undefined) {
    return false;
  }
  if (user.other_roles.includes(CLUSTER_ADMIN_GROUP_NAME)) {
    return true;
  }
  return false;
}

export function userCanRemoveOtherRole(
  user: Express.User | undefined,
  role: ConductorRole
): boolean {
  if (user === undefined) {
    return false;
  }
  if (
    user.other_roles.includes(CLUSTER_ADMIN_GROUP_NAME) &&
    role !== CLUSTER_ADMIN_GROUP_NAME
  ) {
    return true;
  }
  return false;
}

export async function inviteEmailToProject(
  user: Express.User,
  email: Email,
  project_id: NonUniqueProjectID,
  role: ConductorRole
) {
  const invite: RoleInvite = {
    _id: uuidv4(),
    requesting_user: express_user_to_pouch_user(user)._id,
    email: email,
    project_id: project_id,
    role: role,
  };
  await saveInvite(invite);
  await emailInvite(invite);
}

function renderInviteText(invite: RoleInvite) {
  return `Hi,
  You have been invited with the role ${invite.role} to the project
  ${invite.project_id} on ${CONDUCTOR_PUBLIC_URL}. Head to
  ${CONDUCTOR_PUBLIC_URL}, login with one of the authentication providers, and
  accept this invite to join this project.

  If you do not wish to join this project, feel free to ignore this email.
  `;
}

function renderInviteHtml(invite: RoleInvite): string {
  // TODO: Write actual HTML invite, rather than just sending a text-based one
  return renderInviteText(invite);
}

async function emailInvite(invite: RoleInvite) {
  await sendEmail({
    to: invite.email,
    subject: `You have been added to ${invite.project_id} with role ${invite.role}`,
    text: renderInviteText(invite),
    html: renderInviteHtml(invite),
  });
}

export async function acceptInvite(user: Express.User, invite: RoleInvite) {
  const project_roles = new Set(user.project_roles[invite.project_id] ?? []);
  project_roles.add(invite.role);
  user.project_roles[invite.project_id] = Array.from(project_roles);
  await saveUserToDB(user);
  await deleteInvite(invite);
}

export async function rejectInvite(invite: RoleInvite) {
  await deleteInvite(invite);
}
