import PouchDB from 'pouchdb';
PouchDB.plugin(require('pouchdb-adapter-memory')); // enable memory adapter for testing
import {ProjectID, DBCallbackObject} from 'faims3-datamodel';
import {getProjectsDB, getUsersDB, initialiseDatabases} from '../src/couchdb';

const databaseList: any = {};

const getDatabase = async (databaseName: string) => {
  if (databaseList[databaseName] === undefined) {
    const db = new PouchDB(databaseName, {adapter: 'memory'});
    databaseList[databaseName] = db;
  }
  return databaseList[databaseName];
};

const mockGetDataDB = async (project_id: ProjectID) => {
  const databaseName = 'data-' + project_id;
  return getDatabase(databaseName);
};

const mockGetProjectDB = async (project_id: ProjectID) => {
  return getDatabase('metadatadb-' + project_id);
};

const mockShouldDisplayRecord = () => {
  return true;
};

const clearDB = async (db: PouchDB.Database) => {
  const docs = await db.allDocs();
  for (let index = 0; index < docs.rows.length; index++) {
    const doc = docs.rows[index];
    await db.remove(doc.id, doc.value.rev);
  }
};
export const resetDatabases = async () => {
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

export const cleanDataDBS = async () => {
  let db: PouchDB.Database;
  for (const name in databaseList) {
    db = databaseList[name];
    delete databaseList[name];
    console.log('recreating database ', name);
    if (db !== undefined) {
      try {
        await db.destroy();
        //await db.close();
      } catch (err) {
        console.error(err);
      }
    }
  }
};
// register our mock database clients with the module
export const callbackObject: DBCallbackObject = {
  getDataDB: mockGetDataDB,
  getProjectDB: mockGetProjectDB,
  shouldDisplayRecord: mockShouldDisplayRecord,
};