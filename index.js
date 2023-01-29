// Use the dotenv package, to create environment variables
require ('dotenv').config()
// Create a constant variable, PORT, based on what's in process.env.PORT or fallback to 3000
const PORT = process.env.PORT || 3000;
// Import express, and create a server
const express = require('express');
const app = express();
// Require morgan and body-parser middleware
// Have the server use morgan with setting 'dev'
const morgan = require ('morgan');
app.use(morgan('dev'))

// Import cors 
const cors = require ('cors');

app.use(cors())
// Have the server use cors()

// Have the server use bodyParser.json()
const bodyParser = require('body-parser');
app.use(bodyParser.json());
// Have the server use your api router with prefix '/api'
app.use('/api', require('./api'))
// Import the client from your db/index.js
const { client } = require ('./db')
// Create custom 404 handler that sets the status code to 404.
app.use('*', (req,res,next) => {
    res.status(404);
    res.send({error: "Route not found"})
})
// Create custom error handling that sets the status code to 500
// and returns the error as an object
app.use('*', (req,res,next) => {
    res.status(500);
    res.send({error: error.message})
})


// Start the server listening on port PORT
app.listen (PORT , () => {
    console.log(`Server successfully started at http://localhost:${PORT}`)
});
client.connect();
// On success, connect to the database
