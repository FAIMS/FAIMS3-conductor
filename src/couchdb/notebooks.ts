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
import {
  createProjectDB,
  getProjectDataDB,
  getProjectMetaDB,
  getProjectsDB,
} from '.';
import {CLUSTER_ADMIN_GROUP_NAME} from '../buildconfig';
import {ProjectID, resolve_project_id} from '../datamodel/core';
import {
  ProjectMetadata,
  ProjectObject,
  ProjectUIFields,
  ProjectUIModel,
  PROJECT_METADATA_PREFIX,
} from '../datamodel/database';
import archiver from 'archiver';
import {Stream} from 'stream';

import securityPlugin from 'pouchdb-security-helper';
import {
  file_attachments_to_data,
  file_data_to_attachments,
  getDataDB,
  getFullRecordData,
  getRecordsWithRegex,
  setAttachmentDumperForType,
  setAttachmentLoaderForType,
  HRID_STRING,
} from 'faims3-datamodel';
import {userHasPermission} from './users';
PouchDB.plugin(securityPlugin);
import {Stringifier, stringify} from 'csv-stringify';

/**
 * getNotebooks -- return an array of notebooks from the database
 * @oaram user - only return notebooks that this user can see
 * @returns an array of ProjectObject objects
 */
export const getNotebooks = async (user: Express.User): Promise<any[]> => {
  const output: any[] = [];
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
      const projectMeta = await getNotebookMetadata(project_id);
      if (userHasPermission(user, project_id, 'read')) {
        output.push({
          name: project.name,
          last_updated: project.last_updated,
          created: project.created,
          status: project.status,
          project_id: full_project_id,
          listing_id: listing_id,
          non_unique_project_id: project_id,
          metadata: projectMeta,
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
  str = str.trim();
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
  // Note that this relies on the name 'local-autoincrementers' being the same as that
  // used in the front-end code (LOCAL_AUTOINCREMENTERS_NAME in src/local-data/autoincrementers.ts)
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

export const addDesignDocsForNotebook = async (
  dataDB: PouchDB.Database<any>
) => {
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

  try {
    await dataDB.put(attachmentFilterDoc);
    await dataDB.put(userPermissionsDoc);
  } catch (error) {
    console.log('Error adding design documents to database:', error);
  }
};

/**
 * Create notebook databases and initialise them with required contents
 *
 * @param projectName Human readable project name
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

  const metaDBName = `metadata-${project_id}`;
  const dataDBName = `data-${project_id}`;
  const projectDoc = {
    _id: project_id,
    name: projectName.trim(),
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
    return undefined;
  }

  // get roles from the notebook, ensure that 'user' and 'admin' are included
  const roles = metadata.accesses || ['admin', 'user', 'team'];
  if (roles.indexOf('user') < 0) {
    roles.push('user');
  }
  if (roles.indexOf('admin') < 0) {
    roles.push('admin');
  }

  // can't save security on a memory database so skip this if we're testing
  if (process.env.NODE_ENV !== 'test') {
    const metaSecurity = await metaDB.security();
    metaSecurity.admins.roles.add(CLUSTER_ADMIN_GROUP_NAME);
    roles.forEach((role: string) => {
      metaSecurity.members.roles.add(`${project_id}||${role}`);
    });
    await metaSecurity.save();
  }

  // derive autoincrementers from uispec
  const autoIncrementers = getAutoIncrementers(uispec);
  if (autoIncrementers) {
    await metaDB.put(autoIncrementers);
  }
  uispec['_id'] = 'ui-specification';
  await metaDB.put(uispec as PouchDB.Core.PutDocument<ProjectUIModel>);

  // ensure that the name is in the metadata
  metadata.name = projectName.trim();
  await writeProjectMetadata(metaDB, metadata);

  // data database
  const dataDB = createProjectDB(dataDBName);
  if (!dataDB) {
    return undefined;
  }

  // can't save security on a memory database so skip this if we're testing
  if (process.env.NODE_ENV !== 'test') {
    const dataSecurity = await dataDB.security();
    dataSecurity.admins.roles.add(CLUSTER_ADMIN_GROUP_NAME);
    roles.forEach((role: string) => {
      dataSecurity.members.roles.add(`${project_id}||${role}`);
    });
    await dataSecurity.save();
  }

  try {
    await addDesignDocsForNotebook(dataDB);

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

/**
 * Update an existing notebook definition
 * @param project_id Project identifier
 * @param uispec Project UI Spec object
 * @param metadata Project Metadata
 * @returns project_id or undefined if the project doesn't exist
 */
export const updateNotebook = async (
  project_id: string,
  uispec: ProjectUIModel,
  metadata: any
) => {
  const metaDB = await getProjectMetaDB(project_id);
  const dataDB = await getProjectDataDB(project_id);
  if (!dataDB || !metaDB) {
    return undefined;
  }

  // get roles from the notebook, ensure that 'user' and 'admin' are included
  const roles = metadata.accesses || ['admin', 'user', 'team'];
  if (roles.indexOf('user') < 0) {
    roles.push('user');
  }
  if (roles.indexOf('admin') < 0) {
    roles.push('admin');
  }

  // can't save security on a memory database so skip this if we're testing
  if (process.env.NODE_ENV !== 'test') {
    const metaSecurity = metaDB.security();
    const dataSecurity = dataDB.security();

    if (!(CLUSTER_ADMIN_GROUP_NAME in metaSecurity.admins.roles)) {
      metaSecurity.admins.roles.add(CLUSTER_ADMIN_GROUP_NAME);
      dataSecurity.admins.roles.add(CLUSTER_ADMIN_GROUP_NAME);
    }
    roles.forEach((role: string) => {
      const permission = `${project_id}||${role}`;
      if (!(permission in metaSecurity.members.roles)) {
        metaSecurity.members.roles.add(permission);
        dataSecurity.members.roles.add(permission);
      }
    });
    await metaSecurity.save();
  }

  // derive autoincrementers from uispec
  const autoIncrementers = getAutoIncrementers(uispec);
  if (autoIncrementers) {
    // need to update any existing autoincrementer document
    // this should have the _rev property so that our update will work
    const existingAutoInc = (await metaDB.get(
      'local-autoincrementers'
    )) as AutoIncrementObject;
    if (existingAutoInc) {
      existingAutoInc.references = autoIncrementers.references;
      await metaDB.put(existingAutoInc);
    } else {
      await metaDB.put(autoIncrementers);
    }
  }

  // update the existing uispec document
  // need the revision id of the existing one to do this...
  const existingUISpec = await metaDB.get('ui-specification');
  // set the id and rev
  uispec['_id'] = 'ui-specification';
  uispec['_rev'] = existingUISpec['_rev'];
  // now store it to update the spec
  await metaDB.put(uispec as PouchDB.Core.PutDocument<ProjectUIModel>);

  // ensure that the name is in the metadata
  // metadata.name = projectName.trim();
  await writeProjectMetadata(metaDB, metadata);

  // no need to write design docs for existing projects
  return project_id;
};

/**
 * deleteNotebook - DANGER!! Delete a notebook and all its data
 * @param project_id - project identifier
 */
export const deleteNotebook = async (project_id: string) => {
  const projectsDB = getProjectsDB();
  if (projectsDB) {
    const projectDoc = await projectsDB.get(project_id);
    if (projectDoc) {
      const metaDB = await getProjectMetaDB(project_id);
      const dataDB = await getProjectDataDB(project_id);
      if (metaDB && dataDB) {
        await metaDB.destroy();
        await dataDB.destroy();
        // remove the project from the projectsDB
        await projectsDB.remove(projectDoc);
      }
    }
  }
};

export const writeProjectMetadata = async (
  metaDB: PouchDB.Database,
  metadata: any
) => {
  // add metadata, one document per attribute value pair
  for (const field in metadata) {
    const doc: any = {
      _id: PROJECT_METADATA_PREFIX + '-' + field,
      is_attachment: false, // TODO: well it might not be false! Deal with attachments
      metadata: metadata[field],
    };
    // is there already a version of this document?
    try {
      const existingDoc = await metaDB.get(doc._id);
      doc['_rev'] = existingDoc['_rev'];
    } catch {
      // no existing document, so don't set the rev
    }
    await metaDB.put(doc);
  }
  // also add the whole metadata as 'projectvalue'
  metadata._id = PROJECT_METADATA_PREFIX + '-projectvalue';
  try {
    const existingDoc = await metaDB.get(metadata._id);
    metadata['_rev'] = existingDoc['_rev'];
  } catch {
    // no existing document, so don't set the rev
  }
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
    // get the metadata from the db
    const projectDB = await getProjectMetaDB(project_id);
    if (projectDB) {
      const metaDocs = await projectDB.allDocs({include_docs: true});
      metaDocs.rows.forEach((doc: any) => {
        const id: string = doc['id'];
        if (id && id.startsWith(PROJECT_METADATA_PREFIX)) {
          const key: string = id.substring(PROJECT_METADATA_PREFIX.length + 1);
          result[key] = doc.doc.metadata;
        }
      });
      result.project_id = project_id;
      return result;
    } else {
      console.error('no metadata database found for', project_id);
    }
  } catch (error) {
    console.log('unknown project', project_id);
  }
  return null;
};

/**
 * getNotebookUISpec -- return metadata for a single notebook from the database
 * @param project_id a project identifier
 * @returns the UISPec of the project or null if it doesn't exist
 */
export const getNotebookUISpec = async (
  project_id: string
): Promise<ProjectMetadata | null> => {
  try {
    // get the metadata from the db
    const projectDB = await getProjectMetaDB(project_id);
    if (projectDB) {
      const uiSpec = (await projectDB.get('ui-specification')) as any;
      delete uiSpec._id;
      delete uiSpec._rev;
      return uiSpec;
    } else {
      console.error('no metadata database found for', project_id);
    }
  } catch (error) {
    console.log('unknown project', project_id);
  }
  return null;
};

/**
 * validateNotebookID - check that a project_id is a real notebook
 * @param project_id - a project identifier
 * @returns true if this is a valid project identifier
 */
export const validateNotebookID = async (
  project_id: string
): Promise<boolean> => {
  try {
    const projectDB = await getProjectMetaDB(project_id);
    if (projectDB) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    return false;
  }
};

/**
 * getNotebookRecords - retrieve all data records for this notebook
 * including record metadata, data fields and annotations
 * @param project_id project identifier
 * @returns an array of records
 */
export const getNotebookRecords = async (
  project_id: string
): Promise<any | null> => {
  const records = await getRecordsWithRegex(project_id, '.*', true);
  const fullRecords: any[] = [];
  for (let i = 0; i < records.length; i++) {
    const data = await getFullRecordData(
      project_id,
      records[i].record_id,
      records[i].revision_id,
      true
    );
    fullRecords.push(data);
  }
  return fullRecords;
};

/**
 * Return an iterator over the records in a notebook
 * @param project_id project identifier
 */
export const notebookRecordIterator = async (
  project_id: string,
  viewid: string
) => {
  let records = await getRecordsWithRegex(project_id, '.*', true);
  let index = 0;

  // select just those in this view
  records = records.filter((record: any) => {
    return record.type === viewid;
  });

  const recordIterator = {
    async next() {
      if (index < records.length - 1) {
        const data = await getFullRecordData(
          project_id,
          records[index].record_id,
          records[index].revision_id,
          true
        );
        index++;
        return {record: data, done: false};
      } else {
        return {record: null, done: true};
      }
    },
  };
  return recordIterator;
};

const getRecordHRID = (record: any) => {
  for (const possible_name of Object.keys(record.data)) {
    if (possible_name.startsWith(HRID_STRING)) {
      return record.data[possible_name];
    }
  }
  return record.record_id;
};

/**
 * generate a suitable value for the CSV export from a field
 * value.  Serialise filenames, gps coordinates, etc.
 */
const csvFormatValue = (fieldName: string, value: any, hrid: string) => {
  const result: {[key: string]: any} = {};
  if (value instanceof Array) {
    if (value.length === 0) {
      result[fieldName] = '';
      return result;
    }
    const valueList = value.map((v: any) => {
      if (v instanceof File) {
        return generateFilename(v, fieldName, hrid);
      } else {
        return v;
      }
    });
    result[fieldName] = valueList.join(';');
    return result;
  }

  // gps locations
  if (value instanceof Object && 'geometry' in value) {
    result[fieldName] = value;
    result[fieldName + '_latitude'] = value.geometry.coordinates[0];
    result[fieldName + '_longitude'] = value.geometry.coordinates[1];
    return result;
  }
  // default to just the value
  result[fieldName] = value;
  return result;
};

const convertDataForOutput = (data: any, hrid: string) => {
  let result: {[key: string]: any} = {};
  Object.keys(data).forEach((key: string) => {
    const formattedValue = csvFormatValue(key, data[key], hrid);
    result = {...result, ...formattedValue};
  });
  return result;
};

export const streamNotebookRecordsAsCSV = async (
  project_id: ProjectID,
  viewID: string,
  res: NodeJS.WritableStream
) => {
  const iterator = await notebookRecordIterator(project_id, viewID);

  let stringifier: Stringifier | null = null;
  let {record, done} = await iterator.next();
  let header_done = false;
  while (record && !done) {
    const hrid = getRecordHRID(record);
    const row = [
      hrid,
      record.record_id,
      record.revision_id,
      record.type,
      record.updated_by,
      record.updated.toISOString(),
    ];
    const outputData = convertDataForOutput(record.data, hrid);
    Object.keys(outputData).forEach((property: string) => {
      row.push(outputData[property]);
    });

    if (!header_done) {
      const columns = [
        'identifier',
        'record_id',
        'revision_id',
        'type',
        'updated_by',
        'updated',
      ];
      // take the keys in the generated output data which may have more than
      // the original data
      Object.keys(outputData).forEach((key: string) => {
        columns.push(key);
      });
      stringifier = stringify({columns, header: true});
      // pipe output to the respose
      stringifier.pipe(res);
      header_done = true;
    }
    if (stringifier) stringifier.write(row);
    const next = await iterator.next();
    record = next.record;
    done = next.done;
  }
  if (stringifier) stringifier.end();
};

export const streamNotebookFilesAsZip = async (
  project_id: ProjectID,
  viewID: string,
  res: NodeJS.WritableStream
) => {
  let allFilesAdded = false;
  const iterator = await notebookRecordIterator(project_id, viewID);
  const archive = archiver('zip', {zlib: {level: 9}});
  // good practice to catch warnings (ie stat failures and other non-blocking errors)
  archive.on('warning', err => {
    if (err.code === 'ENOENT') {
      // log warning
    } else {
      // throw error
      throw err;
    }
  });

  // good practice to catch this error explicitly
  archive.on('error', err => {
    throw err;
  });

  // check on progress, if we've finished adding files and they are
  // all processed then we can finalize the archive
  archive.on('progress', (entries: any) => {
    if (allFilesAdded && entries.total === entries.processed) {
      archive.finalize();
    }
  });

  archive.pipe(res);

  let {record, done} = await iterator.next();
  while (!done) {
    // iterate over the fields, if it's a file, then
    // append it to the archive
    if (record !== null) {
      const hrid = getRecordHRID(record);

      Object.keys(record.data).forEach(async (key: string) => {
        if (record && record.data[key] instanceof Array) {
          if (record.data[key].length === 0) {
            return;
          }
          if (record.data[key][0] instanceof File) {
            const file_list = record.data[key] as File[];
            file_list.forEach(async (file: File) => {
              const buffer = await file.stream();
              const reader = buffer.getReader();
              // this is how we turn a File object into
              // a Buffer to pass to the archiver, insane that
              // we can't derive something from the file that will work
              const chunks: Uint8Array[] = [];
              while (true) {
                const {done, value} = await reader.read();
                if (done) {
                  break;
                }
                chunks.push(value);
              }
              const stream = Stream.Readable.from(chunks);
              const filename = generateFilename(file, key, hrid);
              await archive.append(stream, {
                name: filename,
              });
            });
          }
        }
      });
    }

    const next = await iterator.next();
    record = next.record;
    done = next.done;
  }
  allFilesAdded = true;
};

const generateFilename = (file: File, key: string, hrid: string) => {
  const fileTypes: {[key: string]: string} = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/tiff': 'tif',
    'text/plain': 'txt',
    'application/pdf': 'pdf',
    'application/json': 'json',
  };

  const type = file.type;
  const extension = fileTypes[type] || 'dat';
  const filename = `${key}/${hrid}-${key}.${extension}`;
  return filename;
};

export const getRolesForNotebook = async (project_id: ProjectID) => {
  const meta = await getNotebookMetadata(project_id);
  if (meta) {
    const roles = meta.accesses || [];
    if (roles.indexOf('admin') < 0) {
      roles.push('admin');
    }
    if (roles.indexOf('user') < 0) {
      roles.push('user');
    }
    return roles;
  } else {
    return [];
  }
};

export async function countRecordsInNotebook(
  project_id: ProjectID
): Promise<Number> {
  const dataDB = await getDataDB(project_id);
  const res = await dataDB.find({
    selector: {
      record_format_version: 1,
    },
    limit: 10000,
  });
  return res.docs.length;
}

/*
 * For saving and loading attachment with type faims-attachment::Files
 */

setAttachmentLoaderForType('faims-attachment::Files', file_attachments_to_data);
setAttachmentDumperForType('faims-attachment::Files', file_data_to_attachments);
