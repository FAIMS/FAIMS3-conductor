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
 * Filename: initCouchDB.js
 * Description:
 *   Functions to create database contents in couchdb
 */

import {CONDUCTOR_PUBLIC_URL} from '../buildconfig';

export const initialiseProjectsDB = async (
  db: PouchDB.Database | undefined
) => {
  // Permissions doc goes into _design/permissions in a project
  // javascript in here will run inside CouchDB
  const projectPermissionsDoc = {
    _id: '_design/permissions',
    validate_doc_update: `function (newDoc, oldDoc, userCtx) {
      // Reject update if user does not have an _admin role
      if (userCtx.roles.indexOf('_admin') < 0) {
        throw {
          unauthorized:
            'Access denied. Only the FAIMS server may modify projects',
        };
      }
    }`,
  };
  if (db) {
    try {
      await db.get(projectPermissionsDoc._id);
    } catch {
      await db.put(projectPermissionsDoc);
    }
  }
};

export const initialiseDirectoryDB = async (
  db: PouchDB.Database | undefined
) => {
  const directoryDoc = {
    _id: 'default',
    name: 'Default instance',
    description: `FAIMS instance on ${CONDUCTOR_PUBLIC_URL}`,
    people_db: {
      db_name: 'people',
    },
    projects_db: {
      db_name: 'projects',
    },
    conductor_url: `${CONDUCTOR_PUBLIC_URL}/`,
    // this is no longer used....TODO: remove
    auth_mechanisms: {
      demo: {
        portal: `${CONDUCTOR_PUBLIC_URL}/`,
        type: 'oauth',
        name: 'DataCentral',
      },
    },
  };

  if (db) {
    // do we already have a default document?
    try {
      await db.get('default');
    } catch {
      await db.put(directoryDoc);
    }
  }
};