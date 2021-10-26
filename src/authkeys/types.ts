import type {KeyLike} from 'jose';

export type CouchDBUsername = string;
export type CouchDBUserRole = string;
export type CouchDBUserRoles = CouchDBUserRole[];
export interface SigningKey {
  alg: string; // JWS alg
  kid: string; // JWS kid
  private_key: KeyLike;
  public_key: KeyLike;
  instance_name: string;
}
export interface KeyConfig {
  signing_algorithm: string;
  instance_name: string;
  key_id: string;
  public_key_file: string;
  private_key_file: string;
}
