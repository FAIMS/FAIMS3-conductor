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
 * Filename: index.ts
 * Description:
 *    Core functions to access the various databases used by the application
 */

import PouchDB from 'pouchdb';

import {COUCHDB_URL, LOCAL_COUCHDB_AUTH} from '../buildconfig';
import {ProjectID} from '../datamodel/core';
import {ProjectDataObject, ProjectObject} from '../datamodel/database';
import {initialiseDirectoryDB, initialiseProjectsDB} from './initialise';

const DIRECTORY_DB_NAME = 'directory';
const PROJECTS_DB_NAME = 'projects';
// const PEOPLE_DB_NAME = 'people';  // TODO: move this in here from users.ts
// const INVITE_DB_NAME = 'invites'; // TODO: move here from invites.ts

let _directoryDB: PouchDB.Database | undefined;
let _projectsDB: PouchDB.Database | undefined;

export const getDirectoryDB = (): PouchDB.Database | undefined => {
  if (!_directoryDB) {
    const pouch_options: PouchDB.Configuration.RemoteDatabaseConfiguration = {};

    if (LOCAL_COUCHDB_AUTH !== undefined) {
      pouch_options.auth = LOCAL_COUCHDB_AUTH;
    }
    const directorydb = COUCHDB_URL + DIRECTORY_DB_NAME;
    try {
      _directoryDB = new PouchDB(directorydb, pouch_options);
    } catch (error) {
      console.log('bad thing happened', error);
    }
  }
  return _directoryDB;
};

export const getProjectsDB = (): PouchDB.Database | undefined => {
  if (!_projectsDB) {
    const pouch_options: PouchDB.Configuration.RemoteDatabaseConfiguration = {};

    if (LOCAL_COUCHDB_AUTH !== undefined) {
      pouch_options.auth = LOCAL_COUCHDB_AUTH;
    }
    const dbName = COUCHDB_URL + PROJECTS_DB_NAME;
    _projectsDB = new PouchDB(dbName, pouch_options);
  }

  return _projectsDB;
};

export const getProjectMetaDB = (
  projectID: ProjectID
): PouchDB.Database | undefined => {
  if (_projectsDB) {
    try {
      const projectDoc = _projectsDB.get(projectID) as unknown as ProjectObject;
      if (projectDoc.metadata_db) {
        const dbname = projectDoc.metadata_db.db_name;
        const pouch_options: PouchDB.Configuration.RemoteDatabaseConfiguration =
          {};

        if (LOCAL_COUCHDB_AUTH !== undefined) {
          pouch_options.auth = LOCAL_COUCHDB_AUTH;
        }
        return new PouchDB(dbname, pouch_options);
      }
    } catch (error) {
      return undefined;
    }
  }
  return undefined;
};

export const initialiseDatabases = async () => {
  const directoryDB = getDirectoryDB();
  try {
    await initialiseDirectoryDB(directoryDB);
  } catch (error) {
    console.log('something wrong with directory db init', error);
  }

  const projectsDB = getProjectsDB();
  try {
    await initialiseProjectsDB(projectsDB);
  } catch (error) {
    console.log('something wrong with projects db init', error);
  }
};

export const closeDatabases = async () => {
  if (_projectsDB) {
    try {
      await _projectsDB.close();
      _projectsDB = undefined;
    } catch (error) {
      console.log(error);
    }
  }
  if (_directoryDB) {
    try {
      await _directoryDB.close();
      _directoryDB = undefined;
    } catch (error) {
      console.log(error);
    }
  }
};
