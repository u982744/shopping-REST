// config/database.js
var username = "heroku_bhkj4ckg",
    password = "na0ausnqjenr60fe883r954l6l",
    host = "ds017896.mlab.com",
    port = 17896,
    dbname = "heroku_bhkj4ckg";

module.exports = {
    // looks like mongodb://<user>:<pass>@mongo.onmodulus.net:27017/Mikha4ot
    'url': 'mongodb://' + username + ':' + password + "@" + host + ":" + port + "/" + dbname
    //'url' : 'mongodb://heroku_bhkj4ckg:na0ausnqjenr60fe883r954l6l@ds017896.mlab.com:17896/heroku_bhkj4ckg'
};