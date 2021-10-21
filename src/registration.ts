import {v4 as uuidv4} from 'uuid';

import {NonUniqueProjectID} from './datamodel/core';
import {PouchUser} from './datamodel/database';
import {getUserByEmail, updateUser} from './users';


export async function userCanInviteToProject(
    user: Express.User | undefined, project_id: NonUniqueProjectID,
): Promise<boolean> {
    // TODO: Add actual lookups to check ACLs etc.
    if (user === undefined) {
        return false;
    }
    return true;
}


export async function inviteEmailToProject(
    email: string, project_id: NonUniqueProjectID, role: string,
) {
    // TODO: send emails, do the rest of the process
    console.log("TBD: Sending email to user:", email, project_id, role);

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
