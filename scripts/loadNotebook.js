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
 * Filename: loadNotebooks.js
 * Description:
 *   Load notebooks into the running couchdb instance from the ./notebooks folder
 *    any .json file in that folder is treated as a notebook and uploaded.
 */

const fs = require('fs');
// how to import fetch in a node script...
// needed to add this file to .eslintignore because it complains about 'import'
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args)); 

const CONDUCTOR_URL = process.env.CONDUCTOR_PUBLIC_URL;

if (!process.env.USER_TOKEN) {
    console.log('USER_TOKEN not set in .env - login to Conductor and copy your user token');
    process.exit();
}

const token = process.env.USER_TOKEN;

const main = async filename => {
  console.log(filename);
  const jsonText = fs.readFileSync(filename, 'utf-8');
  const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);
  const name = metadata.name;
  fetch(CONDUCTOR_URL + '/api/notebooks/', {
    method: 'POST',
    headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
    body: JSON.stringify({metadata, 'ui-specification': uiSpec, name}),
  })
  .then(response => response.json())
  .then(data => {
    console.log('data:', data);
  })
  .catch(error => {
    console.log(error);
  })

};


const extension = (filename) => {
    return filename.substring(filename.lastIndexOf('.')+1, filename.length) || filename;
}

const dirname = './notebooks/';
fs.readdir(dirname, (err, files) => {
    files.forEach(filename => {
        if (extension(filename) === 'json') {
            main(dirname + filename);
        }
    });
});
