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
 *   This module exports the configuration of the build, including things like
 *   which server to use and whether to include test data
 */
import handlebars from 'handlebars';
import {body, validationResult} from 'express-validator';

import {app} from './core';
import {NonUniqueProjectID} from './datamodel/core';
import {AllProjectRoles} from './datamodel/users';

// BBS 20221101 Adding this as a proxy for the pouch db url
import {
  CONDUCTOR_USER_DB,
  WEBAPP_PUBLIC_URL,
  IOS_APP_URL,
  ANDROID_APP_URL,
} from './buildconfig';
import {
  requireAuthentication,
  requireClusterAdmin,
  requireNotebookMembership,
} from './middleware';
import {inviteEmailToProject, acceptInvite, rejectInvite} from './registration';
import {getInvite, getInvitesForEmails} from './couchdb/invites';
import {
  getUserFromEmailOrUsername,
  getUserInfoForNotebook,
  getUsers,
  removeProjectRoleFromUser,
  saveUser,
  userHasPermission,
  userHasProjectRole,
} from './couchdb/users';
import {
  getNotebookMetadata,
  getNotebooks,
  getRolesForNotebook,
} from './couchdb/notebooks';
import {getSigningKey} from './authkeys/signing_keys';
import {createAuthKey} from './authkeys/create';

export {app};

app.get('/invite/', requireAuthentication, async (req, res) => {
  let notebooks = [];
  if (req.user) {
    notebooks = await getNotebooks(req.user);
  }
  res.render('invite', {
    notebooks: notebooks,
    roles: ['user', 'team', 'admin'], // TODO: should be per notebook
  });
});

app.post(
  '/invite/',
  requireAuthentication,
  body('email').isEmail(),
  body('role').trim(),
  body('project_id').trim(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('invite-error', {errors: errors.array()});
    }
    const email: string = req.body.email;
    const project_id: NonUniqueProjectID = req.body.project_id;
    const role: string = req.body.role;

    if (!userHasPermission(req.user, project_id, 'modify')) {
      res.render('invite-error', {
        errors: [
          {
            msg: `You do not have permission to invite users to project ${project_id}`,
            location: 'header',
            param: 'user',
          },
        ],
      });
    } else {
      await inviteEmailToProject(
        req.user as Express.User,
        email,
        project_id,
        role
      );
      res.render('invite-success', {
        email,
        project_id,
        role,
      });
    }
  }
);

app.get(
  '/accept-invite/:invite_id/',
  requireAuthentication,
  async (req, res) => {
    const user = req.user as Express.User; // requireAuthentication ensures user
    const invite_id = req.params.invite_id;
    const invite = await getInvite(invite_id);
    if (!invite) {
      res.sendStatus(404);
      return;
    }
    if (user.emails.includes(invite.email)) {
      await acceptInvite(user, invite);
    }
    res.redirect('/my-invites/');
  }
);

app.get(
  '/reject-invite/:invite_id/',
  requireAuthentication,
  async (req, res) => {
    const user = req.user as Express.User; // requireAuthentication ensures user
    const invite_id = req.params.invite_id;
    const invite = await getInvite(invite_id);
    if (!invite) {
      res.sendStatus(404);
      return;
    }
    if (user.emails.includes(invite.email)) {
      await rejectInvite(invite);
    }
    res.redirect('/my-invites/');
  }
);

app.get('/my-invites/', requireAuthentication, async (req, res) => {
  const user = req.user as Express.User; // requireAuthentication ensures user
  const invites = await getInvitesForEmails(user.emails);
  console.log('my invites', invites);
  res.render('my-invites', {invites: invites});
});

app.get('/notebooks/', requireAuthentication, async (req, res) => {
  const user = req.user;
  if (user) {
    const notebooks = await getNotebooks(user);
    res.render('notebooks', {
      user: user,
      notebooks: notebooks,
    });
  } else {
    res.status(401).end();
  }
});

app.get(
  '/notebooks/:notebook_id/',
  requireNotebookMembership,
  async (req, res) => {
    const user = req.user as Express.User; // requireAuthentication ensures user
    const project_id = req.params.notebook_id;
    const notebook = await getNotebookMetadata(project_id);
    if (notebook) {
      const isAdmin = userHasPermission(user, project_id, 'modify');
      res.render('notebook-landing', {
        isAdmin: isAdmin,
        notebook: notebook,
      });
    } else {
      res.sendStatus(404);
    }
  }
);

function make_html_safe(s: string): string {
  return handlebars.escapeExpression(s);
}

function render_project_roles(roles: AllProjectRoles): handlebars.SafeString {
  const all_project_sections = [];
  for (const project in roles) {
    const project_sections = [];
    for (const role of roles[project]) {
      project_sections.push('<li>' + make_html_safe(role) + '</li>');
    }
    const safe_name = make_html_safe(project);
    all_project_sections.push(
      '<h6>Roles for project "' +
        `<a href="./notebooks/${safe_name}/">` +
        safe_name +
        '</a>' +
        '"</h6>' +
        '<ul>' +
        project_sections.join('') +
        '</ul>'
    );
  }
  return new handlebars.SafeString(all_project_sections.join(''));
}

app.get('/', async (req, res) => {
  if (req.user) {
    // Handlebars is pretty useless at including render logic in templates, just
    // parse the raw, pre-processed string in...
    const rendered_project_roles = render_project_roles(req.user.project_roles);
    const provider = Object.keys(req.user.profiles)[0];
    // BBS 20221101 Adding token to here so we can support copy from conductor
    const signing_key = await getSigningKey();
    const jwt_token = await createAuthKey(req.user, signing_key);
    const token = {
      jwt_token: jwt_token,
      public_key: signing_key.public_key_string,
      alg: signing_key.alg,
      userdb: CONDUCTOR_USER_DB,
    };
    if (signing_key === null || signing_key === undefined) {
      res.status(500).send('Signing key not set up');
    } else {
      res.render('home', {
        user: req.user,
        token: Buffer.from(JSON.stringify(token)).toString('base64'),
        project_roles: rendered_project_roles,
        other_roles: req.user.other_roles,
        provider: provider,
        userdb: CONDUCTOR_USER_DB,
        public_key: signing_key.public_key,
      });
    }
  } else {
    res.redirect('/auth/');
  }
});

app.get('/logout/', (req, res) => {
  if (req.user) {
    req.logout();
  }
  res.redirect('/');
});

app.get('/send-token/', (req, res) => {
  if (req.user) {
    console.log('hello send-token');
    res.render('send-token', {
      user: req.user,
      web_url: WEBAPP_PUBLIC_URL,
      android_url: ANDROID_APP_URL,
      ios_url: IOS_APP_URL,
    });
  } else {
    res.redirect('/');
  }
});

app.get('/get-token/', async (req, res) => {
  if (req.user) {
    const signing_key = await getSigningKey();
    if (signing_key === null || signing_key === undefined) {
      res.status(500).send('Signing key not set up');
    } else {
      const token = await createAuthKey(req.user, signing_key);

      res.send({
        token: token,
        pubkey: signing_key.public_key_string,
        pubalg: signing_key.alg,
      });
    }
  } else {
    res.status(403).end();
  }
  return;
});

app.get('/notebooks/:id/users', requireClusterAdmin, async (req, res) => {
  if (req.user) {
    const project_id = req.params.id;

    const notebook = await getNotebookMetadata(project_id);

    const userList = await getUserInfoForNotebook(project_id);
    res.render('users', {
      roles: userList.roles,
      users: userList.users,
      notebook: notebook,
    });
  } else {
    res.status(401).end();
  }
});

app.get('/up/', (req, res) => {
  res.status(200).json({up: 'true'});
});
