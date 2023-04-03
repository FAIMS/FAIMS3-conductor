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
 *   Handle registration of new users via invites
 */
import {v4 as uuidv4} from 'uuid';

import {NonUniqueProjectID} from './datamodel/core';
import {RoleInvite, Email, ConductorRole} from './datamodel/users';
import {saveUser} from './couchdb/users';
import {saveInvite, deleteInvite} from './couchdb/invites';
import {CONDUCTOR_PUBLIC_URL, CLUSTER_ADMIN_GROUP_NAME} from './buildconfig';
import {sendEmail} from './email';

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

export async function createInvite(
  user: Express.User,
  email: Email,
  project_id: NonUniqueProjectID,
  role: ConductorRole,
  number: number
) {
  const invite: RoleInvite = {
    _id: uuidv4(),
    requesting_user: user.user_id,
    email: email,
    project_id: project_id,
    role: role,
    number: number,
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
  if (invite.number > 0) {
    const project_roles = new Set(user.project_roles[invite.project_id] ?? []);
    project_roles.add(invite.role);
    user.project_roles[invite.project_id] = Array.from(project_roles);
    await saveUser(user);

    invite.number--;
    if (invite.number === 0) {
      await deleteInvite(invite);
    } else {
      await saveInvite(invite);
    }
  }
}

export async function rejectInvite(invite: RoleInvite) {
  //await deleteInvite(invite);
}
