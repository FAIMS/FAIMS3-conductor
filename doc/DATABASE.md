# Structure of the FAIMS CouchDB Database

FAIMS uses CouchDB for data storage and requires a particular structure to be in
place. This structure is described here.

## Databases

All databases have a default `_security` document that contains empty entries
for admins and members.

### `directory`

The `directory` database holds a default document as follows:

```json
{
    "_id": "default",
    "name": "Default instance",
    "description": "Default FAIMS instance on hostname",
    "people_db": {
      "db_name": "people"
    },
    "projects_db": {
      "db_name": "projects"
    },
    "auth_mechanisms": {
      "demo": {
        "portal": "conductor_host",
        "type": "oauth",
        "name": "DataCentral"
      }
    }
  }
  ```

Under `auth_mechanisms` we have one entry for each authentication mechanism, currently only one 
tested option which is DataCentral.  The `portal` property is the URL of the Conductor host that
the front end should authenticate with.  `type` should be `oauth`.  `name` is used to display the name
of the authentication service in the front end.

### `people`

Database referenced in `directory` as `people_db`.

Used to store records of users with the username as the record `_id`.  

### `projects`

Database referenced in `directory` as `projects_db` contains information about the
projects stored on this couchdb instance.

Document `_design/permissions` is added to implement a permissions check that
restricts access to users with the `_admin` role.
