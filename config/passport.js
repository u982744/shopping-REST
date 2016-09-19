// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;
    FacebookStrategy = require('passport-facebook').Strategy,
    GoogleStrategy = require('passport-google-oauth').OAuth2Strategy,

    // load up the user model
    User = require('../app/models/user'),

    // load the auth variables
    configAuth = require('./auth');

// expose this function to our app using module.exports
module.exports = function(passport) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    // used to deserialize the user
    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    // =========================================================================
    // LOCAL SIGNUP ============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-signup', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) {

            // asynchronous
            // User.findOne wont fire unless data is sent back
            process.nextTick(function() {

                // find a user whose email is the same as the forms email
                // we are checking to see if the user trying to login already exists
                User.findOne({ 'local.email' :  email }, function(err, existingUser) {
                    // if there are any errors, return the error
                    if (err) {
                        return done({error: err.message});
                    }

                    // check to see if theres already a user with that email
                    if (existingUser) {
                        console.log("existingUser");
                        return done(null, false, {name: "signupMessage", message: "Email taken"});
                    } else {
                        //  If we're logged in, we're connecting a new local account.
                        if (req.user) {
                            console.log("connect new local account");
                            var user = req.user;
                            user.local.email = email;
                            user.local.password = user.generateHash(password);
                            user.save(function(err) {
                                if (err) {
                                    throw err;
                                }

                                return done(null, user);
                            });
                        } else {
                            console.log("create new local account");
                            // if there is no user with that email
                            // create the user
                            var newUser = new User();

                            // set the user's local credentials
                            newUser.local.email = email;
                            newUser.local.password = newUser.generateHash(password);

                            // save the user
                            newUser.save(function(err) {
                                if (err) {
                                    throw err;
                                }

                                console.log("");
                                return done(null, newUser);
                            });
                        }
                    }
                });    
            });
        }
    ));

    // =========================================================================
    // LOCAL LOGIN =============================================================
    // =========================================================================
    // we are using named strategies since we have one for login and one for signup
    // by default, if there was no name, it would just be called 'local'

    passport.use('local-login', new LocalStrategy({
            // by default, local strategy uses username and password, we will override with email
            usernameField : 'email',
            passwordField : 'password',
            passReqToCallback : true // allows us to pass back the entire request to the callback
        },
        function(req, email, password, done) { // callback with email and password from our form
            //console.log(email, password);
            // find a user whose email is the same as the forms email
            // we are checking to see if the user trying to login already exists
            User.findOne({ 'local.email' :  email }, function(err, user) {
                // if there are any errors, return the error before anything else
                if (err) {
                    return done({error: err.message});
                }

                // if no user is found, return the message
                if (!user) {
                    return done(null, false, {name: "loginMessage", message: "User not found"});
                }

                // if the user is found but the password is wrong
                if (!user.validPassword(password)) {
                    return done(null, false, {name: "loginMessage", message: "Wrong password"});
                }

                // all is well, return successful user
                return done(null, user);
            });
        })
    );


    // =========================================================================
    // FACEBOOK ================================================================
    // =========================================================================
    passport.use(new FacebookStrategy({
            // pull in our app id and secret from our auth.js file
            clientID        : configAuth.facebookAuth.clientID,
            clientSecret    : configAuth.facebookAuth.clientSecret,
            callbackURL     : configAuth.facebookAuth.callbackURL,
            profileFields: ['id', 'emails', 'name'],
            passReqToCallback : true // allows us to pass in the req from our route (lets us check if a user is logged in or not)
        },

        // facebook will send back the token and profile
        function(req, token, refreshToken, profile, done) {

            // asynchronous
            process.nextTick(function() {
                var user;

                console.log("req", req);
                // check if the user is already logged in
                if (!req.user) {

                    // find the user in the database based on their facebook id
                    User.findOne({ 'facebook.id' : profile.id }, function(err, user) {
                        var newUser;

                        // if there is an error, stop everything and return that
                        // ie an error connecting to the database
                        if (err) {
                            return done(err);
                        }

                        // if the user is found, then log them in
                        if (user) {
                            // if there is a user id already but no token (user was linked at one point and then removed)
                            // just add our token and profile information
                            if (!user.facebook.token) {
                                user.facebook.token = token;
                                user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                                user.facebook.email = profile.emails[0].value;

                                user.save(function(err) {
                                    if (err) {
                                        throw err;
                                    }

                                    return done(null, user);
                                });
                            }

                            return done(null, user); // user found, return that user
                        } else {
                            console.log("profile", profile);
                            // if there is no user found with that facebook id, create them
                            newUser = new User();

                            // set all of the facebook information in our user model
                            newUser.facebook.id = profile.id; // set the users facebook id                   
                            newUser.facebook.token = token; // we will save the token that facebook provides to the user                    
                            newUser.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName; // look at the passport user profile to see how names are returned
                            newUser.facebook.email = profile.emails[0].value; // facebook can return multiple emails so we'll take the first

                            // save our user to the database
                            newUser.save(function(err) {
                                if (err) {
                                    throw err;
                                }

                                // if successful, return the new user
                                return done(null, newUser);
                            });
                        }
                    });
                } else {
                    // user already exists and is logged in, we have to link accounts
                    user = req.user; // pull the user out of the session

                    // update the current users facebook credentials
                    user.facebook.id    = profile.id;
                    user.facebook.token = token;
                    user.facebook.name  = profile.name.givenName + ' ' + profile.name.familyName;
                    user.facebook.email = profile.emails[0].value;

                    // save the user
                    user.save(function(err) {
                        if (err) {
                            throw err;
                        }

                        return done(null, user);
                    });
                }
            });
        }
    ));
};