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
import {
  getUserFromEmailOrUsername,
  createUser,
  saveUser,
} from '../src/couchdb/users';
import {createAuthKey} from '../src/authkeys/create';
import {getSigningKey} from '../src/authkeys/signing_keys';
import fs from 'fs';
import {createNotebook, getNotebooks} from '../src/couchdb/notebooks';
import {ProjectUIModel} from 'faims3-datamodel';
import {DEVELOPER_MODE} from '../src/buildconfig';
import {expect} from 'chai';
import {resetDatabases} from './mocks';
import {restoreFromBackup} from '../src/couchdb/backupRestore';

const uispec: ProjectUIModel = {
  fields: [],
  views: {},
  viewsets: {},
  visible_types: [],
};

let adminToken = '';
const username = 'bobalooba';

describe('API tests', () => {
  beforeEach(async () => {
    await resetDatabases();
    const signing_key = await getSigningKey();
    const adminUser = await getUserFromEmailOrUsername('admin');
    if (adminUser) {
      adminToken = await createAuthKey(adminUser, signing_key);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [user, _error] = await createUser('', username);
      if (user) {
        await saveUser(user);
      }
    }
  });

  it('check is up - not authenticated', async () => {
    const result = await request(app).get('/api/hello');
    expect(result.statusCode).to.equal(401);
  });

  it('check is up - authenticated', async () => {
    console.log('check is up - authenticated');
    const result = await request(app)
      .get('/api/hello')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(result.statusCode).to.equal(200);
  });

  it('get notebooks', async () => {
    const filename = 'notebooks/sample_notebook.json';
    const jsonText = fs.readFileSync(filename, 'utf-8');
    const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);

    await createNotebook('test-notebook', uiSpec, metadata);

    return request(app)
      .get('/api/notebooks')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200)
      .expect(response => {
        expect(response.body).to.have.lengthOf(1);
      });
  });

  it('create notebook', () => {
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
        expect(response.body.notebook).to.include('-test-notebook');
      });
  });

  it('update notebook', () => {
    const filename = 'notebooks/sample_notebook.json';
    const jsonText = fs.readFileSync(filename, 'utf-8');
    const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);

    let projectID;

    // create notebook
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
      .expect(async response => {
        projectID = response.body.notebook;
        console.log('got response', response.body);

        metadata['name'] = 'Updated Test Notebook';
        metadata['project_lead'] = 'Bob Bobalooba';
        uiSpec.fviews['FORM1SECTION1']['label'] = 'Updated Label';

        // add a new autoincrementer field
        const newField = {
          'component-namespace': 'faims-custom',
          'component-name': 'BasicAutoIncrementer',
          'type-returned': 'faims-core::String',
          'component-parameters': {
            name: 'newincrementor',
            id: 'newincrementor',
            variant: 'outlined',
            required: false,
            num_digits: 5,
            form_id: 'FORM1SECTION1',
            label: 'FeatureIDincrementor',
          },
          validationSchema: [['yup.string'], ['yup.required']],
          initialValue: null,
          access: ['admin'],
          meta: {
            annotation_label: 'annotation',
            annotation: true,
            uncertainty: {
              include: false,
              label: 'uncertainty',
            },
          },
        };

        uiSpec.fields['newincrementor'] = newField;
        uiSpec.fviews['FORM1SECTION1']['fields'].push('newincrementor');

        await request(app)
          .put(`/api/notebooks/${projectID}`)
          .send({
            'ui-specification': uiSpec,
            metadata: metadata,
            name: 'test notebook',
          })
          .set('Authorization', `Bearer ${adminToken}`)
          .set('Content-Type', 'application/json')
          .expect(200)
          .expect(response => {
            expect(response.body.notebook).to.include('-test-notebook');
          });
      });
  });

  it('get notebook', async () => {
    const filename = 'notebooks/sample_notebook.json';
    const jsonText = fs.readFileSync(filename, 'utf-8');
    const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);

    const project_id = await createNotebook('test-notebook', uiSpec, metadata);

    expect(project_id).not.to.be.undefined;
    return request(app)
      .get('/api/notebooks/' + project_id)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect(response => {
        expect(response.body.metadata.name).to.equal('test-notebook');
      });
  });

  it('can delete a notebook', async () => {
    await resetDatabases();
    const filename = 'notebooks/sample_notebook.json';
    const jsonText = fs.readFileSync(filename, 'utf-8');
    const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);
    const adminUser = await getUserFromEmailOrUsername('admin');

    if (adminUser) {
      const project_id = await createNotebook(
        'test-notebook',
        uiSpec,
        metadata
      );
      let notebooks = await getNotebooks(adminUser);
      expect(notebooks).to.have.lengthOf(1);
      console.log('deleting', project_id);
      expect(project_id).not.to.be.undefined;
      await request(app)
        .post('/api/notebooks/' + project_id + '/delete')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .expect(302)
        .expect('Location', '/notebooks/');
      notebooks = await getNotebooks(adminUser);
      expect(notebooks).to.be.empty;
    }
  });

  it('update admin user - no auth', async () => {
    return await request(app)
      .post(`/api/users/${username}/admin`)
      .send({addrole: true})
      .set('Content-Type', 'application/json')
      .expect(401);
  });

  it('update admin user - add role', async () => {
    return await request(app)
      .post(`/api/users/${username}/admin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .send({addrole: true})
      .expect(200)
      .expect({status: 'success'});
  });

  it('update admin user - remove role', () => {
    return request(app)
      .post(`/api/users/${username}/admin`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .send({addrole: false})
      .expect(200)
      .expect({status: 'success'});
  });

  it('get notebook users', async () => {
    const filename = 'notebooks/sample_notebook.json';
    const jsonText = fs.readFileSync(filename, 'utf-8');
    const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);

    const project_id = await createNotebook('test-notebook', uiSpec, metadata);

    return request(app)
      .get(`/api/notebooks/${project_id}/users`)
      .set('Authorization', `Bearer ${adminToken}`)
      .set('Content-Type', 'application/json')
      .expect(200)
      .then(response => {
        expect(response.body.roles).to.deep.equal([
          'admin',
          'moderator',
          'team',
          'user',
        ]);
        expect(response.body.users.length).to.equal(1);
      });
  });

  it('update notebook roles', async () => {
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

  it('can download records as csv', async () => {
    // pull in some test data
    await restoreFromBackup('test/backup.jsonl');

    const adminUser = await getUserFromEmailOrUsername('admin');
    if (adminUser) {
      const notebooks = await getNotebooks(adminUser);
      expect(notebooks).to.have.lengthOf(2);

      await request(app)
        .get('/api/notebooks/1693291182736-campus-survey-demo/FORM2.csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .set('Content-Type', 'application/json')
        .expect(200)
        .expect('Content-Type', 'text/csv')
        .expect(response => {
          // response body should be csv data
          expect(response.text).to.contain('identifier');
          const lines = response.text.split('\n');
          lines.forEach(line => {
            if (line !== '' && !line.startsWith('identifier')) {
              expect(line).to.contain('rec');
              expect(line).to.contain('FORM2');
              expect(line).to.contain('frev');
            }
          });
          // one more newline than the number of records + header
          expect(lines).to.have.lengthOf(19);
        });
    }
  });

  if (DEVELOPER_MODE) {
    it('create random record', async () => {
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
  }
});
