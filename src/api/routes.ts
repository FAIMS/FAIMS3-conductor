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
import {getNotebooks, createNotebook} from '../couchdb/notebooks';
import {requireAuthenticationAPI} from '../middleware';
import {initialiseDatabases} from '../couchdb';

export const api = express.Router();

api.get('/hello/', requireAuthenticationAPI, (_req: any, res: any) => {
  res.send({message: 'hello from the api!'});
});

api.get('/notebooks/', requireAuthenticationAPI, async (req, res) => {
  // get a list of notebooks from the db
  const notebooks = await getNotebooks();
  res.json(notebooks);
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
    console.log('creating notebook', projectName)
    const projectID = await createNotebook(projectName, uiSpec, metadata);
    console.log('projectID', projectID);
    res.json({notebook: projectID});
  } catch {
    res.json({error: 'there was an error'});
  }
});

/**
 * POST to /api/initialise does initialisation on the databases
 * - not sure how we'll use this or what protection it needs
 */
api.post('/initialise/', requireAuthenticationAPI, async (req, res) => {
  initialiseDatabases();
  res.json({success: true});
});
