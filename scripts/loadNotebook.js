const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const CONDUCTOR_URL = 'http://localhost:8080/'

const main = async filename => {
  const jsonText = fs.readFileSync(filename, 'utf-8');
  const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);
  const name = 'Test Notebook';
  fetch(CONDUCTOR_URL + 'api/notebooks/', {
    method: 'POST',
    headers: {'Authorization': 'foo', 'Content-Type': 'application/json'},
    body: JSON.stringify({metadata, 'ui-specification': uiSpec, name}),
  })
  .then(response => {
    console.log(response.status);
    response.json();
  })
  .then(data => {
    console.log('data:', data);
  })
  .catch(error => {
    console.log(error);
  })

};

main('./test/sample_notebook.json');
