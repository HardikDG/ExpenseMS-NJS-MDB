const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const mongoose = require('mongoose');
// const config = require('./config'); // get our config file
const bodyParser = require('body-parser');
const morgan = require('morgan');

//Environment configration
var config = require('./config/env/development');
if (process.env.NODE_ENV === 'development') {
    config = require('./config/env/development');
} else if (process.env.NODE_ENV === 'production') {
    config = require('./config/env/production');
}

var port = config.PORT || 9090;
console.log("DB :" + config.database);

var options = {
    user: 'hardik',
    pass: 'abc123', auth: {
        authdb: 'EMS'
    }
}

/* 
use admin
db.system.users.remove({})    <== removing all users
db.system.version.remove({}) <== removing current version 
db.system.version.insert({ "_id" : "authSchema", "currentVersion" : 3 })

 db.createUser ( { user: "hardikdg", pwd: "abc123", roles: [ "readWrite", "dbAdmin", "dbOwner" ] } )

 db.system.users.find()
*/

mongoose.connect(config.database,options);
// mongoose.connect(config.database); //Home

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(morgan('dev'));

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'mongodb connection error:'));
db.once('open', function () {
    console.log('✓ MongoDB connection established!');
});

const api = require('./routes/api');
app.use('/api/v1', api);

app.listen(port);
console.log('✓ server connected on port ' + port);
