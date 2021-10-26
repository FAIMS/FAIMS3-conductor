import {SignJWT} from 'jose';

import type {CouchDBUsername, CouchDBUserRoles, SigningKey} from './types';

export async function create_auth_key(
  username: CouchDBUsername,
  roles: CouchDBUserRoles,
  signing_key: SigningKey
) {
  const jwt = await new SignJWT({
    '_couchdb.roles': roles,
  })
    .setProtectedHeader({
      alg: signing_key.alg,
      kid: signing_key.kid,
    })
    .setSubject(username)
    .setIssuedAt()
    .setIssuer(signing_key.instance_name)
    //.setExpirationTime('2h')
    .sign(signing_key.private_key);
  return jwt;
}
