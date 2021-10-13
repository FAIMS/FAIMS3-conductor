import express from 'express';
import bodyParser from 'body-parser';

export const app = express();

// Only parse query parameters into strings, not objects
app.set('query parser', 'simple');
app.use(bodyParser.urlencoded({ extended: true }));
