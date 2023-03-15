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
 * Filename: routes.ts
 * Description:
 *   This module contains the route definitions for the conductor api
 */

import express from 'express';
import {
  getNotebooks,
  createNotebook,
  getNotebookMetadata,
  getNotebookUISpec,
  getNotebookRecords,
  getRolesForNotebook,
} from '../couchdb/notebooks';
import {requireAuthenticationAPI} from '../middleware';
import {initialiseDatabases} from '../couchdb';
import {
  addProjectRoleToUser,
  getUserFromEmailOrUsername,
  getUserInfoForNotebook,
  removeProjectRoleFromUser,
  saveUser,
  userHasPermission,
} from '../couchdb/users';

export const api = express.Router();

api.get('/hello/', requireAuthenticationAPI, (_req: any, res: any) => {
  res.send({message: 'hello from the api!'});
});

/**
 * POST to /api/initialise does initialisation on the databases
 * - not sure how we'll use this or what protection it needs
 */
api.post('/initialise/', requireAuthenticationAPI, async (req, res) => {
  initialiseDatabases();
  res.json({success: true});
});

api.get('/notebooks/', requireAuthenticationAPI, async (req, res) => {
  // get a list of notebooks from the db
  if (req.user) {
    const notebooks = await getNotebooks(req.user);
    res.json(notebooks);
  } else {
    res.json([]);
  }
});

/**
 * POST to /notebooks/ to create a new notebook
 */
api.post('/notebooks/', requireAuthenticationAPI, async (req, res) => {
  // post a new notebook
  const uiSpec = req.body['ui-specification'];
  const projectName = req.body.name;
  const metadata = req.body.metadata;

  try {
    const projectID = await createNotebook(projectName, uiSpec, metadata);
    res.json({notebook: projectID});
  } catch {
    res.json({error: 'there was an error creating the notebook'});
    res.status(500).end();
  }
});

api.get('/notebooks/:id', requireAuthenticationAPI, async (req, res) => {
  // get full details of a single notebook
  const project_id = req.params.id;
  if (req.user && userHasPermission(req.user, project_id, 'read')) {
    const metadata = await getNotebookMetadata(project_id);
    const uiSpec = await getNotebookUISpec(project_id);
    if (metadata && uiSpec) {
      res.json({metadata, 'ui-specification': uiSpec});
    } else {
      res.json({error: 'not found'});
      res.status(404).end();
    }
  } else {
    // unauthorised response
    res.status(401).end();
  }
});

// export current versions of all records in this notebook
api.get(
  '/notebooks/:id/records/',
  requireAuthenticationAPI,
  async (req, res) => {
    let records = [];
    if (req.user && userHasPermission(req.user, req.params.id, 'read')) {
      records = await getNotebookRecords(req.params.id);
    }
    if (records) {
      res.json({records});
    } else {
      res.json({error: 'notebook not found'});
      res.status(404).end();
    }
  }
);

api.get('/notebooks/:id/users/', requireAuthenticationAPI, async (req, res) => {
  const userInfo = await getUserInfoForNotebook(req.params.id);
  res.json(userInfo);
});

// POST to give a user permissions on this notebook
// body includes: 
//   {
//     username: 'a username or email',
//     role: a valid role for this notebook,
//     addrole: boolean, true to add, false to delete
//   }
api.post(
  '/notebooks/:id/users/',
  requireAuthenticationAPI,
  async (req, res) => {
    let error = '';
    const notebook = await getNotebookMetadata(req.params.id);
    if (notebook) {
      const username = req.body.username;
      const role = req.body.role;
      const addrole = req.body.addrole;

      // check that this is a legitimate role for this notebook
      const notebookRoles = await getRolesForNotebook(notebook.project_id);
      if (notebookRoles.indexOf(role) >= 0) {
        const user = await getUserFromEmailOrUsername(username);
        if (user) {
          if (addrole) {
            await addProjectRoleToUser(user, notebook.project_id, role);
          } else {
            await removeProjectRoleFromUser(user, notebook.project_id, role);
          }
          await saveUser(user);
          res.json({status: 'success'});
          return;
        } else {
          error = 'Unknown user ' + username;
        }
      } else {
        error = 'Unknow role';
      }
    } else {
      error = 'Unknown notebook';
    }
    // user or project not found or bad role
    res.json({status: 'error', error});
    res.status(404).end();
  }
);
