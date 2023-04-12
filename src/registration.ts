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
import {addProjectRoleToUser, saveUser} from './couchdb/users';
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
  ${CONDUCTOR_PUBLIC_URL}/register/${invite._id} to register an account.

  If you already have an account on ${CONDUCTOR_PUBLIC_URL} then following that
  link will assign the ${invite.role} role on ${invite.project_id} to your account.

  If you do not wish to join this project, feel free to ignore this email.

  The FAIMS Team
  `;
}

function renderInviteHtml(invite: RoleInvite): string {
  return `<p>Hi,<br>
  <p>You have been invited with the role ${invite.role} to the project
  ${invite.project_id} on ${CONDUCTOR_PUBLIC_URL}. Head to
  ${CONDUCTOR_PUBLIC_URL}/register/${invite._id} to register an account.</p>

  <p>If you already have an account on ${CONDUCTOR_PUBLIC_URL} then following that
  link will assign the ${invite.role} role on ${invite.project_id} to your account.</p>

  <p>If you do not wish to join this project, feel free to ignore this email.</p>
  
  <p>The FAIMS Team</p>`;
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
    addProjectRoleToUser(user, invite.project_id, invite.role);
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
