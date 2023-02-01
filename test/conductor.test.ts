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
 * Filename: conductor.test.ts
 * Description:
 *   Implement some basic tests for API functionality of conductor
 */

jest.mock('pouchdb');

import request from 'supertest';
import {app} from '../src/routes';


test('check is up', async () => {
  const result = await request(app).get('/up');
  expect(result.statusCode).toEqual(200);
});

describe('Auth', () => {
  it('redirect to auth', done => {
    request(app)
      .get('/')
      .expect(302)
      .expect('Location', /\/auth/, done);
  });

  it('logout redirects to /', done => {
    request(app).get('/logout/').expect(302).expect('Location', '/', done);
  });

  // hmm. doesn't work becuase the auth routes don't get added until index.ts
  // need to modify to make a testable exported app
  //
  // it('auth returns HTML', done => {
  //   request(app)
  //     .get('/auth')
  //     .expect(200)
  //     .expect('Content-Type', /text\/html/, done);
  // });
});
