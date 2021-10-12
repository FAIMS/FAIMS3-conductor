import express from 'express';

export const app = express();

// Only parse query parameters into strings, not objects
app.set('query parser', 'simple');
