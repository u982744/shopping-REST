    // third party dependencies
var express = require('express'),
    mongoose = require('mongoose'),
    flash = require('connect-flash'),

    morgan = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    session = require('express-session')

    // internal dependencies
    configDB = require('./config/database.js'),
    passport = require('passport'),
    userModule = require('./user'),
    //users = require('./users'),
    //lists = require('./lists'),
    //items = require('./items'),

    port = process.env.PORT || 3001,
    app = express(),
    user = express();

// configuration ===============================================================
mongoose.connect(configDB.url); // connect to our database

require('./config/passport')(passport); // pass passport for configuration

// set up our express application
app.use(morgan('dev')); // log every request to the console
app.use(cookieParser()); // read cookies (needed for auth)
app.use(bodyParser()); // get information from html forms

// required for passport
app.use(session({ secret: 'ilovescotchscotchyscotchscotch' })); // session secret
app.use(passport.initialize());
app.use(passport.session()); // persistent login sessions
app.use(flash()); // use connect-flash for flash messages stored in session

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  next();
});


// routes ======================================================================
require('./app/routes.js')(app, passport, mongoose);

/*
app.use('/user', user);

user.get('/login', userModule.login);
user.get('/signup', userModule.signup);
*/

// launch ======================================================================
app.listen(port, function () {
    console.log('REST service listening on port ' + port);
});