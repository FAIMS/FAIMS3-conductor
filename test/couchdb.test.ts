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
 * Filename: couchdb.tests.ts
 * Description:
 *   Tests for the interface to couchDB
 */
import PouchDB from 'pouchdb';
PouchDB.plugin(require('pouchdb-adapter-memory')); // enable memory adapter for testing
PouchDB.plugin(require('pouchdb-find'));

import {
  getDirectoryDB,
  getProjectMetaDB,
  getProjectsDB,
  getUsersDB,
  initialiseDatabases,
} from '../src/couchdb';
import {
  createNotebook,
  getNotebookMetadata,
  getNotebooks,
  getNotebookUISpec,
  getRolesForNotebook,
  updateNotebook,
} from '../src/couchdb/notebooks';
import * as fs from 'fs';
import {
  addProjectRoleToUser,
  createUser,
  getUserFromEmailOrUsername,
  removeProjectRoleFromUser,
  saveUser,
  userHasPermission,
} from '../src/couchdb/users';
import {CONDUCTOR_INSTANCE_NAME} from '../src/buildconfig';
import {ProjectUIModel} from 'faims3-datamodel';

const uispec: ProjectUIModel = {
  fields: [],
  views: {},
  viewsets: {},
  visible_types: [],
};

const clearDB = async (db: PouchDB.Database) => {
  const docs = await db.allDocs();
  for (let index = 0; index < docs.rows.length; index++) {
    const doc = docs.rows[index];
    await db.remove(doc.id, doc.value.rev);
  }
};

const resetDatabases = async () => {
  const usersDB = getUsersDB();
  if (usersDB) {
    await clearDB(usersDB);
  }
  const projectsDB = getProjectsDB();
  if (projectsDB) {
    await clearDB(projectsDB);
  }
  await initialiseDatabases();
};

const username = 'bobalooba';
let bobalooba: Express.User;

beforeEach(async () => {
  await resetDatabases();
  const adminUser = await getUserFromEmailOrUsername('admin');
  if (adminUser) {
    const [user, error] = await createUser('', username);
    if (user) {
      await saveUser(user);
      bobalooba = user;
    } else {
      throw new Error(error);
    }
  }
});

test('check initialise', async () => {
  await initialiseDatabases();

  const directoryDB = getDirectoryDB();
  expect(directoryDB).not.toBe(undefined);
  if (directoryDB) {
    const default_document = (await directoryDB.get('default')) as any;
    expect(default_document.name).toBe(CONDUCTOR_INSTANCE_NAME);

    const permissions_document = (await directoryDB.get(
      '_design/permissions'
    )) as any;
    expect(permissions_document['_id']).toBe('_design/permissions');
  }
});

test('project roles', async () => {
  // make some notebooks
  const nb1 = await createNotebook('NB1', uispec, {});
  const nb2 = await createNotebook('NB2', uispec, {});

  if (nb1 && nb2) {
    // give user access to two of them
    addProjectRoleToUser(bobalooba, nb1, 'user');
    expect(userHasPermission(bobalooba, nb1, 'read')).toBe(true);
    addProjectRoleToUser(bobalooba, nb2, 'admin');
    expect(userHasPermission(bobalooba, nb2, 'modify')).toBe(true);
    // and this should still be true
    expect(userHasPermission(bobalooba, nb1, 'read')).toBe(true);

    removeProjectRoleFromUser(bobalooba, nb1, 'user');
    expect(userHasPermission(bobalooba, nb1, 'read')).toBe(false);
    // but still...
    expect(userHasPermission(bobalooba, nb2, 'modify')).toBe(true);
  }
});

test('getNotebooks', async () => {
  // make some notebooks
  const nb1 = await createNotebook('NB1', uispec, {});
  const nb2 = await createNotebook('NB2', uispec, {});
  const nb3 = await createNotebook('NB3', uispec, {});
  const nb4 = await createNotebook('NB4', uispec, {});

  if (nb1 && nb2 && nb3 && nb4) {
    // give user access to two of them
    addProjectRoleToUser(bobalooba, nb1, 'user');
    addProjectRoleToUser(bobalooba, nb2, 'user');
    await saveUser(bobalooba);

    const notebooks = await getNotebooks(bobalooba);
    expect(notebooks.length).toBe(2);
  } else {
    throw new Error('could not make test notebooks');
  }
});

test('createNotebook', async () => {
  await initialiseDatabases();
  const user = await getUserFromEmailOrUsername('admin');

  const jsonText = fs.readFileSync('./notebooks/sample_notebook.json', 'utf-8');
  const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);

  const projectID = await createNotebook(' Test   Nõtebõõk', uiSpec, metadata);

  expect(projectID).not.toBe(undefined);
  expect(user).not.toBeNull();

  if (projectID && user) {
    expect(projectID.substring(13)).toBe('-test-notebook');

    const notebooks = await getNotebooks(user);
    expect(notebooks.length).toBe(1);
    const db = await getProjectMetaDB(projectID);
    if (db) {
      const autoInc = (await db.get('local-autoincrementers')) as any;
      expect(autoInc.references.length).toBe(2);
      expect(autoInc.references[0].form_id).toBe('FORM1SECTION1');
    }
  }
});

test('getNotebookMetadata', async () => {
  await initialiseDatabases();

  const jsonText = fs.readFileSync('./notebooks/sample_notebook.json', 'utf-8');
  const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);
  const name = 'Test Notebook';
  const projectID = await createNotebook(name, uiSpec, metadata);
  expect(projectID).not.toBe(undefined);
  if (projectID) {
    const retrievedMetadata = await getNotebookMetadata(projectID);

    expect(retrievedMetadata).not.toBeNull();
    if (retrievedMetadata) {
      expect(retrievedMetadata['lead_institution']).toBe(
        metadata['lead_institution']
      );
      expect(retrievedMetadata['name']).toBe(name);
    }
  }
});

test('getNotebookUISpec', async () => {
  await initialiseDatabases();

  const jsonText = fs.readFileSync('./notebooks/sample_notebook.json', 'utf-8');
  const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);
  const name = 'Test Notebook';
  const projectID = await createNotebook(name, uiSpec, metadata);

  expect(projectID).not.toBe(undefined);
  if (projectID) {
    const retrieved = await getNotebookUISpec(projectID);

    expect(retrieved).not.toBeNull();
    if (retrieved) {
      expect(retrieved['fviews'].length).toBe(uiSpec.fviews.length);
      expect(retrieved['fields']).not.toBe(undefined);
    }
  }
});

test('get notebook roles', async () => {
  await initialiseDatabases();

  const jsonText = fs.readFileSync('./notebooks/sample_notebook.json', 'utf-8');
  const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);
  const name = 'Test Notebook';
  const projectID = await createNotebook(name, uiSpec, metadata);

  expect(projectID).not.toBe(undefined);
  if (projectID) {
    const roles = await getRolesForNotebook(projectID);
    expect(roles.length).toBe(4);
    expect(roles).toContain('admin'); // admin role should always be present
    expect(roles).toContain('team'); // specified in the UISpec
    expect(roles).toContain('moderator'); // specified in the UISpec
    expect(roles).toContain('user'); // user role should always be present
  }
});

test('updateNotebook', async () => {
  await initialiseDatabases();
  const user = await getUserFromEmailOrUsername('admin');

  const jsonText = fs.readFileSync('./notebooks/sample_notebook.json', 'utf-8');
  const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);

  const projectID = await createNotebook(' Test   Nõtebõõk', uiSpec, metadata);

  expect(projectID).not.toBe(undefined);
  expect(user).not.toBeNull();

  if (projectID && user) {
    // now update it with a minor change

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

    // now update the notebook
    const newProjectID = await updateNotebook(projectID, uiSpec, metadata);

    expect(newProjectID).toEqual(projectID);

    expect(projectID.substring(13)).toBe('-test-notebook');

    const notebooks = await getNotebooks(user);
    expect(notebooks.length).toBe(1);
    const db = await getProjectMetaDB(projectID);
    if (db) {
      const newUISpec = await getNotebookUISpec(projectID);
      if (newUISpec) {
        expect(newUISpec['fviews']['FORM1SECTION1']['label']).toBe(
          'Updated Label'
        );
      }
      const newMetadata = await getNotebookMetadata(projectID);
      if (newMetadata) {
        expect(newMetadata['name']).toBe('Updated Test Notebook');
        expect(newMetadata['project_lead']).toBe('Bob Bobalooba');
      }
      const metaDB = await getProjectMetaDB(projectID);
      if (metaDB) {
        const autoInc = (await metaDB.get('local-autoincrementers')) as any;
        expect(autoInc.references.length).toBe(3);
      }
    }
  }
});
