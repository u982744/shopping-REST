var User = require('../app/models/user'),
    ejs = require('ejs'),
    read = require('fs').readFileSync,
    getEmailBody = ejs.compile(read(__dirname + '/../views/resetpasswordEmaiTemplate.ejs', 'utf-8')),
    Mail = require('../app/mail');

module.exports = function(app, passport) {

    // =====================================
    // HOME PAGE (with login links) ========
    // =====================================
    app.get('/', function(req, res) {
        res.render('index.ejs'); // load the index.ejs file
    });

    // =====================================
    // LOGIN ===============================
    // =====================================
    // show the login form
    app.get('/login', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('login.ejs', { message: req.flash('loginMessage') }); 
    });

    // process the login form
    app.post('/login', passport.authenticate('local-login', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/login', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    // process the signup form
    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/signup', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // =====================================
    // RESET PASSWORD =====================
    // =====================================
    // show the forgot password form
    app.get('/resetpassword', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render('resetpassword.ejs', {
            success: req.query.success || null,
            message: req.query.message || null
        });
    });

    // process the resetpassword form
    app.post('/resetpassword', function(req, res) {
        //console.log("handle post of resetpassword form data...", req.body);

        User.findOne({ 'local.email' :  req.body.email }, function(err, user) {
            //console.log("findOne response...", err, user);
            // if there are any errors, return the error before anything else
            if (err) {
                res.redirect('/resetpassword?success=false&message=' + encodeURIComponent('Something went wrong...'));
                return;
            }

            if (!user) {
                res.redirect('/resetpassword?success=false&message=' + encodeURIComponent('User with email address ' + req.body.email + ' not found'));
            } else {
                Mail.send(user.local.email, "Shopping app reset password instructions", getEmailBody({id: user._id}), function (response) {
                    if (response.success) {
                        res.redirect('/resetpassword?success=true&message=' + encodeURIComponent('An email has been sent to ' + user.local.email + ' with instructions for creating a new password.'));
                    } else {
                        //console.log(response);
                        res.redirect('/resetpassword?success=false&message=' + encodeURIComponent('Your account was found but there was an error sending reset instructions to ' + user.local.email + '.'));
                    }
                });
            }
        });
    });


    // =====================================
    // CHANGE PASSWORD =====================
    // =====================================
    // show the forgot password form
    app.get('/changepassword', function(req, res) {
        // render the page and pass in any flash data if it exists
        res.render('changepassword.ejs', {
            id: req.query.id,
            success: req.query.success || null,
            message: req.query.message || null
        });
    });

    // process the changepassword form
    app.post('/changepassword', function(req, res) {
        User.findOne({ '_id' :  req.body.id }, function(err, user) {
            console.log("findOne response...", err, user);
            // if there are any errors, return the error before anything else
            if (err) {
                res.redirect('/changepassword?success=false&message=' + encodeURIComponent('Something went wrong...'));
                return;
            }

            if (!user) {
                res.redirect('/changepassword?success=false&message=' + encodeURIComponent('User not found.'));
            } else {
                console.log("do change password handling...");
                user.local.password = user.generateHash(req.body.password);

                // save the user
                user.save(function(err) {
                    if (err) {
                        throw err;
                    } else {
                        res.redirect('/changepassword?success=true&message=' + encodeURIComponent('Password successfully changed!'));
                    }
                });
            }
        });
    });

    // =====================================
    // PROFILE SECTION =====================
    // =====================================
    // we will want this protected so you have to be logged in to visit
    // we will use route middleware to verify this (the isLoggedIn function)
    app.get('/profile', isLoggedIn, function(req, res) {
        res.render('profile.ejs', {
            user : req.user // get the user out of session and pass to template
        });
    });


    // =====================================
    // FACEBOOK ROUTES =====================
    // =====================================
    // route for facebook authentication and login
    app.get('/auth/facebook', passport.authenticate('facebook', { scope : ['email'] }));

    // handle the callback after facebook has authenticated the user
    app.get(
        '/auth/facebook/callback', 
        passport.authenticate('facebook', {
            successRedirect : '/profile',
            failureRedirect : '/'
        })
    );


    // =============================================================================
    // AUTHORIZE (ALREADY LOGGED IN / CONNECTING OTHER SOCIAL ACCOUNT) =============
    // =============================================================================

    // locally --------------------------------
    app.get('/connect/local', function(req, res) {
        res.render('connect-local.ejs', { message: req.flash('loginMessage') });
    });

    app.post('/connect/local', passport.authenticate('local-signup', {
        successRedirect : '/profile', // redirect to the secure profile section
        failureRedirect : '/connect/local', // redirect back to the signup page if there is an error
        failureFlash : true // allow flash messages
    }));

    // facebook -------------------------------

    // send to facebook to do the authentication
    app.get('/connect/facebook', passport.authorize('facebook', { scope : 'email' }));

    // handle the callback after facebook has authorized the user
    app.get( '/connect/facebook/callback', passport.authorize('facebook', {
        successRedirect : '/profile',
        failureRedirect : '/'
    }));


    // =============================================================================
    // UNLINK ACCOUNTS =============================================================
    // =============================================================================
    // used to unlink accounts. for social accounts, just remove the token
    // for local account, remove email and password
    // user account will stay active in case they want to reconnect in the future

    // local -----------------------------------
    app.get('/unlink/local', function(req, res) {
        var user            = req.user;
        user.local.email    = undefined;
        user.local.password = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });

    // facebook -------------------------------
    app.get('/unlink/facebook', function(req, res) {
        var user            = req.user;
        user.facebook.token = undefined;
        user.save(function(err) {
            res.redirect('/profile');
        });
    });


    // =====================================
    // LOGOUT ==============================
    // =====================================
    app.get('/logout', function(req, res) {
        req.logout();
        res.redirect('/');
    });
};

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on 
    // isAuthenticated is a feature of Passport lib
    if (req.isAuthenticated()) {
        return next();
    } else {
        // if they aren't redirect them to the home page
        res.redirect('/');
    }
}