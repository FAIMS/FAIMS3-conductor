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
 * Filename: api.test.ts
 * Description:
 *   Tests for the API
 */

import PouchDB from 'pouchdb';
PouchDB.plugin(require('pouchdb-adapter-memory')); // enable memory adapter for testing
PouchDB.plugin(require('pouchdb-find'));

import request from 'supertest';
import {app} from '../src/routes';
import {initialiseDatabases} from '../src/couchdb';
import {
  createUser,
  getUserFromEmailOrUsername,
  saveUser,
} from '../src/couchdb/users';
import {createAuthKey} from '../src/authkeys/create';
import {getSigningKey} from '../src/authkeys/signing_keys';
import fs from 'fs';
import {createNotebook} from '../src/couchdb/notebooks';
import {ProjectUIModel} from 'faims3-datamodel';

const uispec: ProjectUIModel = {
  fields: [],
  views: {},
  viewsets: {},
  visible_types: [],
};

let adminToken = '';
const username = 'bobalooba';

beforeAll(async () => {
  await initialiseDatabases();
  const signing_key = await getSigningKey();
  const adminUser = await getUserFromEmailOrUsername('admin');
  if (adminUser) {
    adminToken = await createAuthKey(adminUser, signing_key);

    const [user, error] = await createUser('', username);
    if (user) {
      await saveUser(user);
    } else {
      throw new Error(error);
    }
  }
});

test('check is up - not authenticated', async () => {
  const result = await request(app).get('/api/hello');
  expect(result.statusCode).toBe(401);
});

test('check is up - authenticated', async () => {
  const result = await request(app)
    .get('/api/hello')
    .set('Authorization', `Bearer ${adminToken}`);
  expect(result.statusCode).toBe(200);
});

test('get notebooks', () => {
  return request(app)
    .get('/api/notebooks')
    .set('Authorization', `Bearer ${adminToken}`)
    .expect(200)
    .expect(response => {
      expect(response.body).toEqual([]);
    });
});

test('create notebook', () => {
  const filename = 'notebooks/sample_notebook.json';
  const jsonText = fs.readFileSync(filename, 'utf-8');
  const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);

  return request(app)
    .post('/api/notebooks')
    .send({
      'ui-specification': uiSpec,
      metadata: metadata,
      name: 'test notebook',
    })
    .set('Authorization', `Bearer ${adminToken}`)
    .set('Content-Type', 'application/json')
    .expect(200)
    .expect(response => {
      expect(response.body.notebook).toMatch('-test-notebook');
    });
});

test('get notebook', async () => {
  const filename = 'notebooks/sample_notebook.json';
  const jsonText = fs.readFileSync(filename, 'utf-8');
  const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);

  const project_id = await createNotebook('test-notebook', uiSpec, metadata);

  if (project_id) {
    return request(app)
      .get('/api/notebooks/' + project_id)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(response => {
        expect(response.body.metadata.name).toEqual('test-notebook');
      });
  } else {
    fail('unable to create test notebook');
  }
});

test('update admin user - no auth', async () => {
  return request(app)
    .post(`/api/users/${username}/admin`)
    .send({addrole: true})
    .set('Content-Type', 'application/json')
    .expect(401);
});

test('update admin user - add role', () => {
  return request(app)
    .post(`/api/users/${username}/admin`)
    .set('Authorization', `Bearer ${adminToken}`)
    .set('Content-Type', 'application/json')
    .send({addrole: true})
    .expect(200)
    .expect({status: 'success'});
});

test('update admin user - remove role', () => {
  return request(app)
    .post(`/api/users/${username}/admin`)
    .set('Authorization', `Bearer ${adminToken}`)
    .set('Content-Type', 'application/json')
    .send({addrole: false})
    .expect(200)
    .expect({status: 'success'});
});

test('update notebook roles', async () => {
  // make some notebooks
  const nb1 = await createNotebook('NB1', uispec, {});

  if (nb1) {
    return request(app)
      .post(`/api/notebooks/${nb1}/users/`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .send({
        username: username,
        role: 'user',
        addrole: true,
      })
      .expect({status: 'success'})
      .expect(200);
  } else {
    throw new Error('could not make test notebooks');
  }
});

test('create random record', async () => {
  const nb1 = await createNotebook('NB1', uispec, {});

  if (nb1) {
    return request(app)
      .post(`/api/notebooks/${nb1}/generate`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .send({count: 10})
      .expect(200);
  } else {
    throw new Error('could not make test notebook');
  }
});