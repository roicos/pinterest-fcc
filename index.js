const http = require("http");
const express = require("express");
const app = express();

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");
app.set('port', (process.env.PORT || 5000));


// static files
const fs = require("fs");
const path = require("path");

// auth
const bcrypt = require("bcrypt");
const session = require("express-session");
app.use(session(
	{secret: "very-long-and-reliable-secret-word",
         resave: false,
         saveUninitialized: false
    }));


// db
const pg = require("pg");
var dbClient = new pg.Client({
    user: "kqrrmlvmbmiuxo",
    password: "9905205bd96665bcfeff239da6bf6a6740bbe6cea52227e2553c889f4fb9778a",
    database: "d5n6384osfuqnh",
    port: 5432,
    host: "ec2-184-73-196-65.compute-1.amazonaws.com",
    ssl: true
});
dbClient.connect();

// post request parser, sould be before routing
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
  	extended: true
}));

// routing
const modulesDir = "./modules"
require(modulesDir + "/routes")(express, app, path, bcrypt, dbClient, http);


// OTHER MODULES

// START THE APP
app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
