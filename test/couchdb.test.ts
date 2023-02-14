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

import {getProjectMetaDB, initialiseDatabases} from '../src/couchdb';
import {
  createNotebook,
  getNotebookMetadata,
  getNotebooks,
} from '../src/couchdb/notebooks';
import * as fs from 'fs';

jest.mock('pouchdb');

test('check initialise', () => {
  initialiseDatabases();
});

test('getNotebooks', async () => {
  initialiseDatabases();
  const notebooks = await getNotebooks();
  expect(notebooks).not.toBeNull();
});

test('createNotebook', async () => {
  initialiseDatabases();

  const jsonText = fs.readFileSync('./notebooks/sample_notebook.json', 'utf-8');
  const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);

  const projectID = await createNotebook('Test Nõtebõõk', uiSpec, metadata);

  expect(projectID).not.toBe(undefined);

  if (projectID) {
    expect(projectID.substring(13)).toBe('-test-notebook');

    const notebooks = await getNotebooks();
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
  initialiseDatabases();

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
