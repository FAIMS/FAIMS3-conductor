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
 *   This module provides functions to access notebooks from the database
 */

import PouchDB from 'pouchdb';
import {createProjectDB, getProjectMetaDB, getProjectsDB} from '.';
import {CLUSTER_ADMIN_GROUP_NAME} from '../buildconfig';
import {ProjectID, resolve_project_id} from '../datamodel/core';
import {
  ProjectInformation,
  ProjectMetadata,
  ProjectObject,
  ProjectUIFields,
  ProjectUIModel,
  PROJECT_METADATA_PREFIX,
} from '../datamodel/database';
import securityPlugin from 'pouchdb-security-helper';
PouchDB.plugin(securityPlugin);

/**
 * Determine whether we should return this project
 *  based on user permissions I guess (copied from FAIMS3)
 * @param _project_id - project identifier
 * @returns true if the user has access to this project
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const shouldDisplayProject = async (_project_id: string) => {
  return true;
};

/**
 * getNotebooks -- return an array of notebooks from the database
 * @returns an array of ProjectObject objects
 */
export const getNotebooks = async (): Promise<ProjectInformation[]> => {
  const output: ProjectInformation[] = [];
  const projects: ProjectObject[] = [];
  // in the frontend, the listing_id names the backend instance,
  // so far it's either 'default' or 'locallycreatedproject'
  const listing_id = 'default';
  const projects_db = getProjectsDB();
  if (projects_db) {
    const res = await projects_db.allDocs({
      include_docs: true,
    });
    res.rows.forEach(e => {
      if (e.doc !== undefined && !e.id.startsWith('_')) {
        projects.push(e.doc as unknown as ProjectObject);
      }
    });
    for (const project of projects) {
      const project_id = project._id;
      const full_project_id = resolve_project_id(listing_id, project_id);
      if (await shouldDisplayProject(full_project_id)) {
        output.push({
          name: project.name,
          last_updated: project.last_updated,
          created: project.created,
          status: project.status,
          project_id: full_project_id,
          listing_id: listing_id,
          non_unique_project_id: project_id,
        });
      }
    }
  }
  return output;
};

/**
 * Slugify a string, replacing special characters with less special ones
 * @param str input string
 * @returns url safe version of the string
 * https://ourcodeworld.com/articles/read/255/creating-url-slugs-properly-in-javascript-including-transliteration-for-utf-8
 */
const slugify = (str: string) => {
  str = str.replace(/^\s+|\s+$/g, ''); // trim
  str = str.toLowerCase();

  // remove accents, swap ñ for n, etc
  const from = 'ãàáäâáº½èéëêìíïîõòóöôùúüûñç·/_,:;';
  const to = 'aaaaaeeeeeiiiiooooouuuunc------';
  for (let i = 0, l = from.length; i < l; i++) {
    str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
  }

  str = str
    .replace(/[^a-z0-9 -]/g, '') // remove invalid chars
    .replace(/\s+/g, '-') // collapse whitespace and replace by -
    .replace(/-+/g, '-'); // collapse dashes

  return str;
};

/**
 * Generate a good project identifier for a new project
 * @param projectName the project name string
 * @returns a suitable project identifier
 */
const generateProjectID = (projectName: string): ProjectID => {
  return `${Date.now().toFixed()}-${slugify(projectName)}`;
};

type AutoIncReference = {
  form_id: string;
  field_id: string;
  label: string;
};

type AutoIncrementObject = {
  _id: string;
  references: AutoIncReference[];
};

/**
 * Derive an autoincrementers object from a UI Spec
 *   find all of the autoincrement fields in the UISpec and create an
 *   entry for each of them.
 * @param uiSpec a project UI Model
 * @returns an autoincrementers object suitable for insertion into the db or
 *          undefined if there are no such fields
 */
const getAutoIncrementers = (uiSpec: ProjectUIModel) => {
  const autoinc: AutoIncrementObject = {
    _id: 'local-autoincrementers',
    references: [],
  };

  const fields = uiSpec.fields as ProjectUIFields;
  for (const field in fields) {
    // TODO are there other names?
    if (fields[field]['component-name'] === 'BasicAutoIncrementer') {
      autoinc.references.push({
        form_id: fields[field]['component-parameters'].form_id,
        field_id: fields[field]['component-parameters'].name,
        label: fields[field]['component-parameters'].label,
      });
    }
  }

  if (autoinc.references.length > 0) {
    return autoinc;
  } else {
    return undefined;
  }
};

/**
 * Create notebook databases and initialise them with required contents
 *
 * @param project_id A project identifier
 * @param uispec A project Ui Specification
 * @param metadata A metadata object with properties/values
 * @returns the project id
 */
export const createNotebook = async (
  projectName: string,
  uispec: ProjectUIModel,
  metadata: any
) => {
  const project_id = generateProjectID(projectName);

  const attachmentFilterDoc = {
    _id: '_design/attachment_filter',
    views: {
      attachment_filter: {
        map: `function (doc) {
          if (doc.attach_format_version === undefined) {
            emit(doc._id);
          }
        }`,
      },
    },
  };
  const userPermissionsDoc = {
    _id: '_design/permissions',
    validate_doc_update: `function (newDoc, oldDoc, userCtx, _secObj) {
      if (userCtx === null || userCtx === undefined) {
        throw {unauthorized: 'You must be logged in. No token given.'};
      }
      if (userCtx.name === null || userCtx.name === undefined) {
        throw {unauthorized: 'You must be logged in. No username given.'};
      }
      return;
    }`,
  };

  const metaDBName = `metadata-${project_id}`;
  const dataDBName = `data-${project_id}`;
  const projectDoc = {
    _id: project_id,
    name: projectName,
    metadata_db: {
      db_name: metaDBName,
    },
    data_db: {
      db_name: dataDBName,
    },
    status: 'published',
  };

  // TODO: check whether the project database exists already...
  const metaDB = createProjectDB(metaDBName);
  if (!metaDB) {
    console.log('returning undefined');
    return undefined;
  }

  const metaSecurity = await metaDB.security();
  metaSecurity.admins.roles.add(CLUSTER_ADMIN_GROUP_NAME);
  metaSecurity.members.roles.add(`${project_id}||team`);
  metaSecurity.members.roles.add(`${project_id}||admin`);
  await metaSecurity.save();

  // derive autoincrementers from uispec
  const autoIncrementers = getAutoIncrementers(uispec);
  if (autoIncrementers) {
    await metaDB.put(autoIncrementers);
  }
  uispec['_id'] = 'ui-specification';
  await metaDB.put(uispec as PouchDB.Core.PutDocument<ProjectUIModel>);

  // ensure that the name is in the metadata
  metadata.name = projectName;
  await writeProjectMetadata(metaDB, metadata);

  // data database
  const dataDB = createProjectDB(dataDBName);
  if (!dataDB) {
    return undefined;
  }

  const dataSecurity = await dataDB.security();
  dataSecurity.admins.roles.add(CLUSTER_ADMIN_GROUP_NAME);
  dataSecurity.members.roles.add(`${project_id}||team`);
  dataSecurity.members.roles.add(`${project_id}||admin`);
  await dataSecurity.save();

  try {
    await dataDB.put(attachmentFilterDoc);
    await dataDB.put(userPermissionsDoc);

    // finally add an entry to the projects db about this project
    const projectsDB = getProjectsDB();
    if (projectsDB) {
      await projectsDB.put(projectDoc);
    }
  } catch (error) {
    console.log(error);
  }
  return project_id;
};

export const writeProjectMetadata = async (
  metaDB: PouchDB.Database,
  metadata: any
) => {
  // add metadata, one document per attribute value pair
  for (const field in metadata) {
    const doc = {
      _id: PROJECT_METADATA_PREFIX + '-' + field,
      is_attachment: false, // TODO: well it might not be false! Deal with attachments
      metadata: metadata[field],
    };
    await metaDB.put(doc);
  }
  // also add the whole metadata as 'projectvalue'
  metadata._id = PROJECT_METADATA_PREFIX + '-projectvalue';
  await metaDB.put(metadata);
  return metadata;
};

/**
 * getNotebookMetadata -- return metadata for a single notebook from the database
 * @param project_id a project identifier
 * @returns a ProjectObject object or null if it doesn't exist
 */
export const getNotebookMetadata = async (
  project_id: string
): Promise<ProjectMetadata | null> => {
  const result: ProjectMetadata = {};
  try {
    if (await shouldDisplayProject(project_id)) {
      // get the metadata from the db
      const projectDB = await getProjectMetaDB(project_id);
      if (projectDB) {
        const metaDocs = await projectDB.allDocs({include_docs: true});
        metaDocs.rows.forEach((doc: any) => {
          const id: string = doc['id'];
          if (id && id.startsWith(PROJECT_METADATA_PREFIX)) {
            const key: string = id.substring(
              PROJECT_METADATA_PREFIX.length + 1
            );
            result[key] = doc.doc.metadata;
          }
        });
        return result;
      } else {
        console.error('no metadata database found for', project_id);
      }
    } else {
      console.error('permission denied for project', project_id);
    }
  } catch (error) {
    console.log('unknown project', project_id);
  }
  return null;
};
