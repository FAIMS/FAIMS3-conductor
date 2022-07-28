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
 * Filename: buildconfig.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

const TRUTHY_STRINGS = ['true', '1', 'on', 'yes'];
const FALSEY_STRINGS = ['false', '0', 'off', 'no'];

/*
 * This is designed to get useful commit information data from
 * environment variables for the testing server. While more sophisticated
 * iterations of this can use extra node modules to get git data directly,
 * passing environment variables seems like the safest first path.
 */

function commit_version(): string {
  const commitver = process.env.REACT_APP_COMMIT_VERSION;
  console.log('commitver', commitver);
  if (
    commitver === '' ||
    commitver === undefined ||
    FALSEY_STRINGS.includes(commitver.toLowerCase())
  ) {
    return 'unknown dev';
  } else {
    return commitver;
  }
}

function prod_build(): boolean {
  const prodbuild = process.env.REACT_APP_PRODUCTION_BUILD;
  if (
    prodbuild === '' ||
    prodbuild === undefined ||
    FALSEY_STRINGS.includes(prodbuild.toLowerCase())
  ) {
    return false;
  } else if (TRUTHY_STRINGS.includes(prodbuild.toLowerCase())) {
    return true;
  } else {
    console.error('REACT_APP_PRODUCTION_BUILD badly defined, assuming false');
    return false;
  }
}
/*
 * This isn't exported, instead to help reduce the number of environment
 * variables to set to get a production build for real users. Can be used in the
 * rest of the configuartion.
 */
const PROD_BUILD = prod_build();

function directory_protocol(): string {
  const usehttps = process.env.REACT_APP_USE_HTTPS;
  if (PROD_BUILD) {
    return 'https';
  } else if (
    usehttps === '' ||
    usehttps === undefined ||
    FALSEY_STRINGS.includes(usehttps.toLowerCase())
  ) {
    return 'http';
  } else if (TRUTHY_STRINGS.includes(usehttps.toLowerCase())) {
    return 'https';
  } else {
    console.error('REACT_APP_USE_HTTPS badly defined, assuming false');
    return 'http';
  }
}

function local_hostname(): string {
  const host = process.env.REACT_APP_HOST_NAME;
  if (host === '' || host === undefined) {
    return 'http://localhost:8080';
  }
  return host;
}

function directory_host(): string {
  const host = process.env.REACT_APP_DIRECTORY_HOST;
  if (host === '' || host === undefined) {
    return '10.80.11.44';
  }
  return host;
}

function directory_port(): number {
  const port = process.env.REACT_APP_DIRECTORY_PORT;
  if (port === '' || port === undefined) {
    if (PROD_BUILD) {
      return 443;
    }
    return 5984;
  }
  try {
    return parseInt(port);
  } catch (err) {
    console.error('Falling back to default port', err);
    return 5984;
  }
}

function directory_auth(): undefined | {username: string; password: string} {
  // Used in the server, as opposed to COUCHDB_USER and PASSWORD for testing.
  const username = process.env.REACT_APP_DIRECTORY_USERNAME;
  const password = process.env.REACT_APP_DIRECTORY_PASSWORD;

  if (
    username === '' ||
    username === undefined ||
    password === '' ||
    password === undefined
  ) {
    return undefined;
  } else {
    return {username: username, password: password};
  }
}

function is_testing() {
  const jest_worker_is_running = process.env.JEST_WORKER_ID !== undefined;
  const jest_imported = false; //typeof jest !== 'undefined';
  const test_node_env = process.env.NODE_ENV === 'test';
  return jest_worker_is_running || jest_imported || test_node_env;
}

function conductor_user_db(): string {
  const userdb = process.env.FAIMS_USERDB;
  const userdb_default = 'http://localhost:5984/people';
  if (userdb === '' || userdb === undefined) {
    console.log('FAIMS_USERDB not set, using default');
    return userdb_default;
  } else {
    return userdb;
  }
}

function local_couchdb_auth():
  | undefined
  | {username: string; password: string} {
  // Used in the server, as opposed to COUCHDB_USER and PASSWORD for testing.
  const username = process.env.REACT_APP_LOCAL_COUCHDB_USERNAME;
  const password = process.env.REACT_APP_LOCAL_COUCHDB_PASSWORD;

  if (
    username === '' ||
    username === undefined ||
    password === '' ||
    password === undefined
  ) {
    console.warn('Falling back to default local couchdb auth');
    return {username: 'admin', password: 'password'};
  } else {
    return {username: username, password: password};
  }
}

function signing_key_id(): string {
  const key_id = process.env.FAIMS_CONDUCTOR_KID;
  if (key_id === '' || key_id === undefined) {
    console.log('FAIMS_CONDUCTOR_KID not set, using default');
    return 'test_key';
  } else {
    return key_id;
  }
}

function private_key_path(): string {
  const key_path = process.env.FAIMS_CONDUCTOR_PRIVATE_KEY_PATH;
  if (key_path === '' || key_path === undefined) {
    console.log('FAIMS_CONDUCTOR_PRIVATE_KEY_PATH not set, using default');
    return 'private_key.pem';
  } else {
    return key_path;
  }
}

function public_key_path(): string {
  const key_path = process.env.FAIMS_CONDUCTOR_PUBLIC_KEY_PATH;
  if (key_path === '' || key_path === undefined) {
    console.log('FAIMS_CONDUCTOR_PUBLIC_KEY_PATH not set, using default');
    return 'public_key.pem';
  } else {
    return key_path;
  }
}

function instance_name(): string {
  const name = process.env.FAIMS_CONDUCTOR_INSTANCE_NAME;
  if (name === '' || name === undefined) {
    console.log('FAIMS_CONDUCTOR_INSTANCE_NAME not set, using default');
    return 'test';
  } else {
    return name;
  }
}

function cookie_secret(): string {
  const cookie = process.env.FAIMS_COOKIE_SECRET;
  if (cookie === '' || cookie === undefined) {
    console.log('FAIMS_COOKIE_SECRET not set, using default');
    return 'ahquoo4ohfaGh1oozoinai9ulah8ouge';
  } else {
    return cookie;
  }
}

function datacentral_group_prefix(): string {
  const name = process.env.DATACENTRAL_GROUP_PREFIX;
  if (name === '' || name === undefined) {
    console.log('DATACENTRAL_GROUP_PREFIX not set, using default');
    return 'FAIMS';
  } else {
    return name;
  }
}

function datacentral_manage_roles(): boolean {
  const manage_roles = process.env.HAVE_DATACENTRAL_MANAGE_ROLES;
  if (
    manage_roles === '' ||
    manage_roles === undefined ||
    FALSEY_STRINGS.includes(manage_roles.toLowerCase())
  ) {
    return false;
  } else if (TRUTHY_STRINGS.includes(manage_roles.toLowerCase())) {
    return true;
  } else {
    console.error(
      'HAVE_DATACENTRAL_MANAGE_ROLES badly defined, assuming false'
    );
    return false;
  }
}

function datacentral_client_id(): string {
  const s = process.env.DATACENTRAL_CLIENT_ID;
  if (s === '' || s === undefined) {
    console.log('DATACENTRAL_CLIENT_ID not set, setting empty');
    return '';
  } else {
    return s;
  }
}

function datacentral_client_secret(): string {
  const s = process.env.DATACENTRAL_CLIENT_SECRET;
  if (s === '' || s === undefined) {
    console.log('DATACENTRAL_CLIENT_SECRET not set, setting empty');
    return '';
  } else {
    return s;
  }
}

function cluster_admin_group_name(): string {
  const name = process.env.CLUSTER_ADMIN_GROUP_NAME;
  if (name === '' || name === undefined) {
    return 'cluster-admin';
  }
  return name;
}

function get_providers_to_use(): string[] {
  const providers = process.env.CONDUCTOR_AUTH_PROVIDERS;
  if (providers === '' || providers === undefined) {
    throw Error(
      'CONDUCTOR_AUTH_PROVIDERS must contain a ; delimited list of authentication providers to use'
    );
  }
  return providers.split(';');
}

export const CONDUCTOR_USER_DB = conductor_user_db();
export const DIRECTORY_PROTOCOL = directory_protocol();
export const DIRECTORY_HOST = directory_host();
export const DIRECTORY_PORT = directory_port();
export const DIRECTORY_AUTH = directory_auth();
export const LOCAL_COUCHDB_AUTH = local_couchdb_auth();
export const RUNNING_UNDER_TEST = is_testing();
export const COMMIT_VERSION = commit_version();
export const HOST_NAME = local_hostname();
export const AUTOACTIVATE_PROJECTS = true; // for alpha, beta will change this
export const CONDUCTOR_PORT = 8080;
export const CONDUCTOR_KEY_ID = signing_key_id();
export const CONDUCTOR_PRIVATE_KEY_PATH = private_key_path();
export const CONDUCTOR_PUBLIC_KEY_PATH = public_key_path();
export const CONDUCTOR_INSTANCE_NAME = instance_name();
export const COOKIE_SECRET = cookie_secret();
export const DATACENTRAL_GROUP_PREFIX = datacentral_group_prefix();
export const HAVE_DATACENTRAL_MANAGE_ROLES = datacentral_manage_roles();
export const DATACENTRAL_CLIENT_ID = datacentral_client_id();
export const DATACENTRAL_CLIENT_SECRET = datacentral_client_secret();
export const CLUSTER_ADMIN_GROUP_NAME = cluster_admin_group_name();
export const CONDUCTOR_AUTH_PROVIDERS = get_providers_to_use();
