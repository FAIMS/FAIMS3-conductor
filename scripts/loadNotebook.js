const fs = require('fs');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const CONDUCTOR_URL = 'http://localhost:8080/';
const token = 'eyJhbGciOiJSUzI1NiIsImtpZCI6InN0ZXZlIn0.eyJfY291Y2hkYi5yb2xlcyI6WyJjbHVzdGVyLWFkbWluIl0sIm5hbWUiOiJTdGV2ZSBDYXNzaWR5Iiwic3ViIjoic3RldmVjYXNzaWR5IiwiaWF0IjoxNjc2MzUzMjQ2LCJpc3MiOiJzdGV2ZSJ9.orlPMqVLZf-RXx4YKuPeftTpRBZRl244jekX9QsDFZhsWMfWi8Zqt067dhVInFY1ezHJHvOyold0FBrE6EnE8nqIK0U9QOhs1ByRP4Ineym8_rdfJOzUWVs520HqK3ef7n5oUJ2sfy-uVXvyqlwO7MxHwFefcLl_cw9EywxfmbpG_wIONRSlh0_lrlIUVGvdBodQzz0lRp3_x_BwAEap8v4hA4f4W1Nx9BVsa5jRkF_3n2KiPpDjZVbzTfdqjhM9XitHyBMcqtH3QZw4WK35a_1-0DUiqnjtFLOVm5zKNMRg2aOwTrooxkAJY7tACesPZaL8DnqdnaAWEsg7St9lsw';

const main = async filename => {
  const jsonText = fs.readFileSync(filename, 'utf-8');
  const {metadata, 'ui-specification': uiSpec} = JSON.parse(jsonText);
  const name = 'Test Notebook';
  fetch(CONDUCTOR_URL + 'api/notebooks/', {
    method: 'POST',
    headers: {'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json'},
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
