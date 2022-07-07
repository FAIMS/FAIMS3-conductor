/* eslint-disable node/no-unpublished-require */
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
 *   Initialise the couchdb instance with required databases
 */

const fs = require('fs');
const {env} = require('process');

// here we're configuring for running inside of the conductor container
// where couchdb is running on the host `couchdb`  Other info comes from
// the environment
const url = `http://admin:${env.COUCHDB_PASSWORD}@couchdb:${env.COUCHDB_PORT}/`;
console.log('COUCHDB URL', url);
const nano = require('nano')(url);

const directoryDoc = {
  _id: 'default',
  name: 'Default instance',
  description: `Default FAIMS instance on ${env.DEPLOY_HOST}`,
  people_db: {
    db_name: 'people',
  },
  projects_db: {
    db_name: 'projects',
  },
  auth_mechanisms: {
    demo: {
      portal: `${env.CONDUCTOR_PROTOCOL}://${env.DEPLOY_HOST}:${env.CONDUCTOR_PORT}/`,
      type: 'oauth',
      name: 'DataCentral',
    },
  },
};

// Permissions doc goes into _design/permissions in a project
const projectPermissionsDoc = {
  _id: '_design/permissions',
  validate_doc_update: function (newDoc, oldDoc, userCtx) {
    // eslint-disable-next-line no-undef
    log('_design/permissions/validate_doc_update', newDoc, oldDoc, userCtx);

    // These lines don't seem to do anything
    //
    // const MEMBER_PREFIX='member_';
    // const LEADER_PREFIX='leader_';
    // const includes = function(array, searchElement, fromIndex) {
    //     return array.lastIndexOf(searchElement) >= (fromIndex || 0);
    // };
    // const diff_ = function(user1, user2) {

    // };

    // Reject update if user does not have an _admin role
    if (userCtx.roles.indexOf('_admin') < 0) {
      throw {
        unauthorized:
          'Access denied. Only the FAIMS server may modify projects',
      };
    }
  },
};

const attachmentFilterDoc = {
  _id: '_design/attachment_filter',
  views: {
    attachment_filter: {
      map: function (doc) {
        // eslint-disable-next-line no-undef
        log('attachment_filter on:', doc);
        if (doc.attach_format_version === undefined) {
          // eslint-disable-next-line no-undef
          emit(doc._id);
        } else {
          // eslint-disable-next-line no-undef
          log('attachment_filter skipping:', doc);
        }
      },
    },
  },
};

const userPermissionsDoc = {
  _id: '_design/permissions',
  validate_doc_update: function (newDoc, oldDoc, userCtx, secObj) {
    // eslint-disable-next-line no-undef
    log(
      '_design/permissions/validate_doc_update',
      newDoc,
      oldDoc,
      userCtx,
      secObj
    );
    if (userCtx === null || userCtx === undefined) {
      throw {unauthorized: 'You must be logged in. No token given.'};
    }
    if (userCtx.name === null || userCtx.name === undefined) {
      throw {unauthorized: 'You must be logged in. No username given.'};
    }
    return;
  },
};

const securityDoc = {
  admins: {
    names: [],
    roles: [],
  },
  members: {
    names: [],
    roles: [],
  },
};

// Create a database
// if the recreate argument is true then destroy any existing
// database and create a new one
// Return true if a new database has been created, false otherwise
const createDatabase = async (dbname, recreate) => {
  const info = await nano.db.list();

  if (info.indexOf(dbname) >= 0) {
    console.log('Database', dbname, 'exists');
    if (recreate) {
      console.log('...destroying');
      await nano.db.destroy(dbname);
    } else {
      return false;
    }
  }

  console.log('Creating database', dbname);
  const response = await nano.db.create(dbname);
  if (response.ok) {
    const db = nano.use(dbname);
    await db.insert(securityDoc, '_security');
    return true;
  }
  //
  return false;
};

const createProjectsDb = async recreate => {
  const created = await createDatabase('projects', recreate);
  if (created) {
    const db = nano.use('projects');
    db.insert(projectPermissionsDoc);
  }
};

const createDirectory = async () => {
  const dbname = 'directory';

  const created = await createDatabase(dbname);

  if (created) {
    const db = nano.use(dbname);
    await db.insert(directoryDoc);
  }
};

// create a project in the database - incomplete port from shell script
// needs to read projects from github instead
// eslint-disable-next-line no-unused-vars
const createProject = async () => {
  const UUID = '1234';
  const dbname = `metadata-test_proj-${UUID}`;

  const info = await nano.db.list();

  if (info.indexOf(dbname) >= 0) {
    console.log('Database', dbname, 'exists, destroying');
    await nano.db.destroy(dbname);
  }

  const response = await nano.db.create(dbname);
  if (response.ok) {
    const db = nano.use(dbname);
    // clone securityDoc
    const security = Object.assign({}, securityDoc);
    // add project specific roles
    security.admins.roles.push(env.REACT_APP_CLUSTER_ADMIN_GROUP_NAME);
    security.members.roles.push(`${env.PROJECT_KEY}||team`);
    security.members.roles.push(`${env.PROJECT_KEY}||admin`);
    await db.insert(security, '_security');

    // Insert project documents
    const documents = [
      'local-autoincrementers',
      'project-metadata-lead_institution',
      'project-metadata-project_lead',
      'ui-specification',
    ];
    documents.forEach(doc => {
      const content = JSON.parse(
        fs.readFileSync(`documents/project/${doc}.json`)
      );
      db.insert(content, doc);
    });
  }

  // setting up data-test_proj database
  const dataDbname = `data-test_proj-${UUID}`;

  if (info.indexOf(dataDbname) >= 0) {
    console.log('Database', dataDbname, 'exists, destroying');
    await nano.db.destroy(dataDbname);
  }

  const responseDat = await nano.db.create(dataDbname);
  if (responseDat.ok) {
    const db = nano.use(dataDbname);
    const security = Object.assign({}, securityDoc);
    // add project specific roles
    security.admins.roles.push(env.REACT_APP_CLUSTER_ADMIN_GROUP_NAME);
    security.members.roles.push(`${env.PROJECT_KEY}||team`);
    security.members.roles.push(`${env.PROJECT_KEY}||admin`);
    await db.insert(security, '_security');

    await db.insert(attachmentFilterDoc, '_design/attachment_filter');
    await db.insert(userPermissionsDoc, '_design/permissions');
  }
};

const main = async () => {
  // do we destroy and recreate databases if present, no for now
  const recreate = false;

  await createDirectory(recreate);
  await createProjectsDb(recreate);
  await createDatabase('people', recreate);
};

main();
