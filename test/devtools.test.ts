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
 * Filename: devtools.tests.ts
 * Description:
 *   Tests for the devtools module
 */
import PouchDB from 'pouchdb';
PouchDB.plugin(require('pouchdb-adapter-memory')); // enable memory adapter for testing
PouchDB.plugin(require('pouchdb-find'));

import {
  getProjectDataDB,
  getProjectMetaDB,
  getProjectsDB,
  getUsersDB,
  initialiseDatabases,
} from '../src/couchdb';
import {createNotebook} from '../src/couchdb/notebooks';
import * as fs from 'fs';
import {createRandomRecord} from '../src/couchdb/devtools';
import {registerClient} from 'faims3-datamodel';

// set up the database module faims3-datamodel with our callbacks to get databases
registerClient({
  getDataDB: getProjectDataDB,
  getProjectDB: getProjectMetaDB,
  shouldDisplayRecord: () => true,
});

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

test('createRecords', async () => {
  await initialiseDatabases();

  const jsonText = fs.readFileSync('./notebooks/sample_notebook.json', 'utf-8');
  const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);

  const projectID = await createNotebook('Test Notebook', uiSpec, metadata);

  expect(projectID).not.toBe(undefined);

  if (projectID) {
    await createRandomRecord(projectID);
  }
});
