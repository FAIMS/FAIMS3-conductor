// read env from .env
require("dotenv").config()

var fs = require('fs');
const { env } = require('process');

const url = `http://${env.USERNAME}:${env.PASSWORD}@${env.HOST}:${env.PORT}/`
var nano = require('nano')(url)

const directoryDoc = {
    "_id": "default",
    "name": "Default instance",
    "description": `Default FAIMS instance on ${env.HOST}`,
    "people_db": {
      "db_name": "people"
    },
    "projects_db": {
      "db_name": "projects"
    },
    "auth_mechanisms": {
      "demo": {
        "portal": `${env.CONDUCTOR_HOST}`,
        "type": "oauth",
        "name": "DataCentral"
      }
    }
  }

// Permissions doc goes into _design/permissions in a project
const projectPermissionsDoc = {
  _id: "_design/permissions",
  validate_doc_update: function(newDoc, oldDoc, userCtx) {
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
    if(userCtx.roles.indexOf('_admin') < 0) {
      throw({unauthorized: "Access denied. Only the FAIMS server may modify projects"});
    }
  }
}

const attachmentFilterDoc = {
  _id: "_design/attachment_filter",
  views: {
    attachment_filter: {
      map: function(doc) {
              log('attachment_filter on:', doc);
              if (doc.attach_format_version === undefined) {
                  emit(doc._id);
              } else {
                log('attachment_filter skipping:', doc);
              }
           }
    }
  }
}


const userPermissionsDoc = {
  _id: "_design/permissions",
  validate_doc_update: function(newDoc, oldDoc, userCtx, secObj) {
    log('_design/permissions/validate_doc_update', newDoc, oldDoc, userCtx, secObj);
    if (userCtx === null || userCtx === undefined) {
      throw({ unauthorized: 'You must be logged in. No token given.' });
    }
    if (userCtx.name === null || userCtx.name === undefined) {
      throw({ unauthorized: 'You must be logged in. No username given.' });
    }
    return;
  }
}

const securityDoc = {
  "admins": {
    "names": [],
    "roles": []
  },
  "members": {
    "names": [],
    "roles": []
  }
}



const createDirectory = async () => {

    const dbname = 'directory'

    await createDatabase(dbname)

    const db = nano.use(dbname)
    await db.insert(directoryDoc)
}


const createDatabase = async (dbname) => {

    const info = await nano.db.list()

    if (info.indexOf(dbname) >= 0) {
        console.log("Database", dbname, "exists, destroying")
        await nano.db.destroy(dbname)
    }

    console.log("Creating database", dbname)
    const response = await nano.db.create(dbname)
    if (response.ok) {
        const db = nano.use(dbname)
        await db.insert(securityDoc, '_security')
    }
}


const createProjectsDb = async () => {

  await createDatabase('projects')
  const db = nano.use('projects')
  db.insert(projectPermissionsDoc)

}

// create a project in the database - incomplete port from shell script
// needs to read projects from github instead
const createProject = async () => {

  const UUID = '1234'
  const dbname = `metadata-test_proj-${UUID}`

  const info = await nano.db.list()

  if (info.indexOf(dbname) >= 0) {
      console.log("Database", dbname, "exists, destroying")
      await nano.db.destroy(dbname)
  }

  const response = await nano.db.create(dbname)
  if (response.ok) {
    const db = nano.use(dbname)
    // clone securityDoc
    const security = Object.assign({}, securityDoc)
    // add project specific roles
    security.admins.roles.push(env.REACT_APP_CLUSTER_ADMIN_GROUP_NAME)
    security.members.roles.push(`${env.PROJECT_KEY}||team`)
    security.members.roles.push(`${env.PROJECT_KEY}||admin`)
    await db.insert(security, '_security')

    // Insert project documents 
    const documents = [
      'local-autoincrementers',
      'project-metadata-lead_institution',
      'project-metadata-project_lead',
      'ui-specification'
    ]
    documents.forEach(doc => {
      const content = JSON.parse(fs.readFileSync(`documents/project/${doc}.json`))
      db.insert(content, doc)  
    })
  }
  

  // setting up data-test_proj database
  const dataDbname = `data-test_proj-${UUID}`

  if (info.indexOf(dataDbname) >= 0) {
      console.log("Database", dataDbname, "exists, destroying")
      await nano.db.destroy(dataDbname)
  }

  const responseDat = await nano.db.create(dataDbname)
  if (responseDat.ok) {
    const db = nano.use(dataDbname)
    const security = Object.assign({}, securityDoc)
    // add project specific roles
    security.admins.roles.push(env.REACT_APP_CLUSTER_ADMIN_GROUP_NAME)
    security.members.roles.push(`${env.PROJECT_KEY}||team`)
    security.members.roles.push(`${env.PROJECT_KEY}||admin`)
    await db.insert(security, '_security')

    await db.insert(attachmentFilterDoc, '_design/attachment_filter')
    await db.insert(userPermissionsDoc, '_design/permissions')
  }
}


const main = async () => {
    await createDirectory()
    await createProjectsDb()
    await createDatabase('people') 
}

main()
