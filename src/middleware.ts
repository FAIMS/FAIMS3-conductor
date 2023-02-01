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
 * Filename: src/middleware.ts
 * Description:
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */

import Express from 'express';
import {CLUSTER_ADMIN_GROUP_NAME} from './buildconfig';

/*
 * Middleware to ensure that the route is only accessible to logged in users
 */
export function requireAuthentication(
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction
) {
  if (req.user) {
    next();
  } else {
    res.redirect('/auth/');
  }
}

/*
 * Similar but for use in the API, just return an unuthorised repsonse
 * should check for an Authentication header...see passport-http-bearer
 */
export function requireAuthenticationAPI(
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction
) {
  // For testing...just check for an Auth header
  if (req.headers.authorization) {
    next();
  } else {
    res.status(401).json({error: 'authentication required'});
  }
}

export function requireNotebookMembership(
  req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction
) {
  if (req.user) {
    const project_id = req.params.notebook_id;
    if (
      (req.user.project_roles[project_id] ?? []).length !== 0 ||
      req.user.other_roles.includes(CLUSTER_ADMIN_GROUP_NAME)
    ) {
      next();
    } else {
      res.status(404);
    }
  } else {
    res.redirect('/auth/');
  }
}
