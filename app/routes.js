var User = require('../app/models/user'),
    Item = require('../app/models/item'),
    List = require('../app/models/list'),
    ejs = require('ejs'),
    read = require('fs').readFileSync,
    getEmailBody = ejs.compile(read(__dirname + '/../views/resetpasswordEmaiTemplate.ejs', 'utf-8')),
    Mail = require('../app/mail');

module.exports = function(app, passport, mongoose) {
    let db = mongoose.connection;

    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function (callback) {
        // yay!
    });

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

    app.post('/login', function(req, res, next) {
        passport.authenticate('local-login', function (err, user, info) {
            if (err !== null) {
                res.status(401).json({error: err.message});
            }

            if (user !== false) {
                res.json(user);
            } else {
                res.status(401).json(info);
            }
        })(req, res, next);
    });

    // =====================================
    // SIGNUP ==============================
    // =====================================
    // show the signup form
    app.get('/signup', function(req, res) {

        // render the page and pass in any flash data if it exists
        res.render('signup.ejs', { message: req.flash('signupMessage') });
    });

    // process the signup form
    app.post('/signup', function(req, res, next) {
        console.log("req.body", req.body);

        passport.authenticate('local-signup', function (err, user, info) {
            if (err !== null) {
                res.status(400).json({error: err.message});
            }

            if (user !== false) {
                res.json(user);
            } else {
                res.status(400).json(info);
            }
        })(req, res, next);
    });

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
    app.get('/auth/facebook', function(req, res, next) { 
        passport.authenticate('facebook', { scope : ['email'] })(req, res, next)
    });

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

    app.post('/connect/local', function(req, res, next) {
        passport.authenticate('local-signup', {
            successRedirect : req.body.successRedirect, // redirect to where form says
            failureRedirect : req.body.failureRedirect, // redirect to where form says
            failureFlash : true // allow flash messages
        })(req, res, next)
    });

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


    // =====================================
    // LISTS ===============================
    // =====================================
    app.get(['/list', '/list/:userId'], function (req, res) {
        console.log("get lists, optionally filtered by userid");
        console.log("req.params", req.params);
        let opts = req.params.userId === undefined ? {} : {userIds: { $in: [req.params.userId]}};

        List.find(opts, function (err, lists) {
            if (err) {
                return console.error(err);
            } else {
                res.send({result: lists});
            }
        })
    });

    app.post('/list', function (req, res) {
        console.log("add list");
        console.log("req.body.name", req.body.name);

        let list = new List({name: req.body.name, userIds: [req.body.userId]});

        list.save(function (err, list) {
            if (err) {
                res.status(500).send(err);
            } else {
                res.send({success: true, id: list._id});
            }
        });
    });

    app.put('/list/:listid/adduser/:email', function (req, res) {
        let email = req.params.email.toLowerCase();
        console.log("add user to list");
        console.log("req.body", req.body);

        List.findOne({_id: req.params.listid}, function (err, list) {
            if (err) {
                return console.error(err);
            }

            if (list === null) {
                res.send({success: false, message: "Could not find the list to share."});
                return;
            }

            User.findOne({ "local.email": email }, function (err, user) {
                if (err) {
                    return console.error(err);
                }

                if (user === null) {
                    res.send({success: false, message: "Nobody was found with that email address."});
                    return;
                }

                if ( list.userIds.indexOf(user._id) === -1 ) {
                    list.userIds.push(user._id);

                    list.save(function (err, list) {
                        if (err) {
                            res.status(500).send(err);
                        } else {
                            res.send({success: true, message: "Successfully shared the list to email address " + email + "."});
                        }
                    });
                } else {
                    res.send({success: true, message: "Person with email address " + email + " already has that list."});
                }
            })
        });
    });

    app.delete('/list/:id', function (req, res) {
        console.log("delete list");
        console.log("req.params", req.params);

        List.findOne({_id: req.params.id}, function (err, list) {
            if (err) {
                return console.error(err);
            }

            console.log("list", list);
            list.remove();
            res.send();
        })
    });


    // =====================================
    // LIST ITEMS ==========================
    // =====================================
    app.get('/list/:id/item', function (req, res) {
        let listId = req.params.id;
        console.log("get list items");
        console.log("req.params", req.params);

        List.findOne({_id: listId}, function (err, list) {
            let listObj = list.toObject();

            if (err) {
                return console.error(err);
            } else {
                Item.find({listId: listId}, function (err, items) {
                    let myItems = [];
                    let itemsLen = items.length;
                    let count = 0;

                    if (err) {
                        return console.error(err);
                    } else {

                        items.forEach(function(itemDoc) {
                            let itemObj = itemDoc.toObject();

                            User.findOne({"_id": itemObj.creatorId}, function (err, userDoc) {
                                count = count + 1;

                                if (userDoc !== null) {
                                    let userObj = userDoc.toObject();
                                    itemObj.creatorEmail = userObj.local.email;
                                } else {
                                    itemObj.creatorEmail = null;
                                }

                                myItems.push(itemObj);

                                if (count === itemsLen) {
                                    console.log("myItems", myItems);
                                    res.send({name: listObj.name, result: myItems});
                                }
                            });
                        });
                    }
                });
            }
        })
    });

    app.post('/list/:id/item', function (req, res) {
        console.log("add list item");
        console.log("req.params", req.params);
        console.log("req.body", req.body);

        let item = new Item({name: req.body.name, listId: req.params.id, done: false, creatorId: req.body.creatorId});

        item.save(function (err, item) {
            if (err) {
                res.status(500).send(err);
            } else {
                res.send({success: true, id: item._id});
            }
        });
    });

    app.put('/list/:listid/item/:itemid', function (req, res) {
        console.log("update done...");
        console.log("req.params", req.params);
        console.log("req.body", req.body);

        Item.update({ _id: req.params.itemid, listId: req.params.listid }, { $set: { done: req.body.done }}, function (err, itemDoc) {
            if (err) {
                return console.error(err);
            }

            if (itemDoc === null) {
                res.status(500).send(err);
            } else {
                res.send({success: true, id: itemDoc._id});
            }
        });
    });

    app.delete('/list/:listid/item/:itemid', function (req, res) {
        console.log("req.params", req.params);

        Item.findOne({_id: req.params.itemid, listId: req.params.listid}, function (err, item) {
            if (err) {
                return console.error(err);
            }

            console.log("item", item);

            if (item === null) {
                res.status(500).send();
            } else {
                item.remove();
                res.send();
            }
        })
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