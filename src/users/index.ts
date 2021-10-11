import {PouchUser} from '../datamodel/database';
import {users_db} from '../sync/databases';

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

export async function updateUser(user: PouchUser): Promise<void> {
  await users_db.put(user);
}
