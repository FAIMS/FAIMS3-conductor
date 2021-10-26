import {jwtVerify} from 'jose';

import type {CouchDBUsername, CouchDBUserRoles, SigningKey} from './types';

export async function read_auth_key(token: string, signing_key: SigningKey) {
  const {payload, protectedHeader} = await jwtVerify(
    token,
    signing_key.public_key,
    {
      algorithms: [signing_key.alg],
    }
  );

  return {
    username: payload.sub,
    roles: payload['_couchdb.roles'],
    instance_name: payload.iss,
    issued_at: payload.iat,
    key_id: protectedHeader.kid,
  };
}
