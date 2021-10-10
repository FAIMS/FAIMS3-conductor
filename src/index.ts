import express from 'express';
import {users_db} from './sync/databases';
import passport from 'passport';
import OAuth2Strategy from 'passport-oauth2';
import {initialize} from './sync/initialize';
import PouchDB from 'pouchdb';
import PouchDBFind from 'pouchdb-find';
import {add_initial_listener} from './sync/event-handler-registration';
import {
  register_listings_known,
  register_projects_known,
  register_metas_complete,
  register_projects_created,
} from './sync/state';
import {auth_mechanisms} from './authconfig';
import {NonUniqueProjectID} from './datamodel/core';
import {getUserByEmail, updateUser} from './users';
import {v4 as uuidv4} from 'uuid';
import {PouchUser} from './datamodel/database';

process.on('unhandledRejection', error => {
  console.error(error); // This prints error with stack included (as for normal errors)
  throw error; // Following best practices re-throw error and let the process exit with error code
});

const app = express();

// Only parse query parameters into strings, not objects
app.set('query parser', 'simple');

app.post('/project/:project_id/invite/:role', async (req, res) => {
  if (typeof req.query['email'] !== 'string') {
    throw Error('Expected 1 string parameter email');
  }
  if (typeof req.query['role'] !== 'string') {
    throw Error('Expected 1 string parameter role');
  }
  const email: string = req.query['email'];
  const project_id: NonUniqueProjectID = req.params.project_id;
  const role: string = req.query['role'];

  // TODO: Check if you're authenticated

  // Create a user with the email if it doesn't exist yet
  const user_id = uuidv4();
  const existing_user: PouchUser = (await getUserByEmail(email)) ?? {
    _id: 'org.couchdb.user:' + user_id,
    name: user_id,
    emails: [email],
  };

  // Append to the role list for the given project:
  existing_user.project_roles = {
    ...(existing_user.project_roles ?? {}),
    [project_id]: [...(existing_user.project_roles?.[project_id] ?? []), role],
  };

  updateUser(existing_user);
});

app.get('/auth', (req, res)=> {
  // Allow the user to decide what auth mechanism to use
  res.send()
})

app.get('/auth/:auth_id', (req, res) => {
  if (
    typeof req.query?.state === 'string' ||
    typeof req.query?.state === 'undefined'
  ) {
    passport.authenticate(req.params.auth_id)(req, res, (err?: {}) => {
      throw err ?? Error('Authentication failed (next, no error)');
    });
  } else {
    throw Error(
      `state must be a string, or not set, not ${typeof req.query?.state}`
    );
  }
});

app.get(
  '/auth-return',
  passport.authenticate('oauth2', {failureRedirect: '/login'}),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/');
  }
);

app.get('/', async (req, res) => {
  res.send(await users_db.allDocs({include_docs: true, endkey: '_'}));
});

PouchDB.plugin(PouchDBFind);

add_initial_listener(register_listings_known, 'listings_known');
add_initial_listener(register_projects_known, 'projects_known');
add_initial_listener(register_metas_complete);
add_initial_listener(register_projects_created);

initialize().then(async () => {
  for (const auth_id in auth_mechanisms) {
    passport.use(
      'default',
      new OAuth2Strategy(
        auth_mechanisms[auth_id].strategy,
        (
          accessToken: string,
          refreshToken: string,
          profile: any,
          cb: (err?: Error | null, user?: Express.User, info?: unknown) => void
        ) => {
          console.debug(
            accessToken,
            refreshToken,
            profile,
            JSON.stringify(profile)
          );
          cb(null, undefined, undefined);
        }
      )
    );
  }
  app.listen(8080, () => {
    console.log('The hello is listening on port 8080!');
  });
});
