var express = require('express'),
    bodyParser = require('body-parser'),
    request = require('superagent');

//987d4c350d2523a6305b2d44c1108509

//Create app instance
var app = express();
//Connect to MongoDB
var mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI);

//displays homepage
app.get('/', function (req, res) {
Post.find({}).sort('-created_at').populate('author').exec(function (err, posts) {
    Event.find({
        happens: {
            $gte: new Date()
        }
    })
        .sort('happens')
        .exec(function (err, events) {
            res.render('home', {
                user: req.user,
                news: posts,
                events: events,
                message: req.flash('message'),
                resetPass: req.flash('resetPass')
            });
        });
});
});

//sends the request through local signup strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/getinfo', passport.authenticate('local-signup', {
successRedirect: '/',
failureRedirect: '/signup'
})
);

//sends the request through local login/signin strategy, and if successful takes user to homepage, otherwise returns then to signin page
app.post('/login', passport.authenticate('local-signin', {
successRedirect: '/',
failureRedirect: '/'
})
);

//logs user out of site, deleting them from the session, and returns to homepage

//User/Admin Management Panel

//Render reset password screen

//API for deleting users
app.get('/deluser/:id', isAdmin, function (req, res) {
User.find({ '_id': req.params.id })
    .remove()
    .exec(function (err) {
        if (err) {
            res.setHeader('Content-Type', 'text/html');
            res.status(500).send({ error: '' });
        }
        res.redirect('/members');
    });
});

//API for creating posts through HTTP POST
app.post('/newuser', function (req, res) {

var newUser = new User();
newUser.username = req.body.username;
newUser.password = req.body.password;
newUser.email = req.body.email;
newUser.bankID = req.body.bankID;
newUser.firstname = req.body.firstname;
newUser.lastname = req.body.lastname;
newUser.isVendor = req.body.isVendor;

// save the user
User.findOne({ 'username': username },
function (err, user) {
    // In case of any error, return using the done method
    if (err)
        return done(err);
    // Username does not exist, log error & redirect back
    if (!user) {
        newUser.save(function (err) {
            if (err) {
                console.log('Error in Saving user: ' + err);
                res.status(500).send({ error: 'Error while creating user.' });
            }
            if (!err) {
                res.status(200).send('OK');
            }
        });
    } else if (user) {
        res.status(500).send({ error: 'User already exists.' });
    }
    return done(null, user);
}
);
});

//API for READing Event data
app.get('/event/:id', isRegistered, function (req, res) {
Event.findOne({ '_id': req.params.id },
    function (err, event) {
        // In case of any error, return using the done method
        if (err) {
            return done(err);
        }
        if (req.user.events.indexOf(req.params.id) > -1) {
            console.log('This event is in your events');
            if (req.user.admin) {
                res.render('event', {
                    event: event,
                    admin: true
                })
            } else {
                res.render('event', {
                    event: event
                })
            }
        } else {
            console.log('This event is not your events');
            if (req.user.admin) {
                res.render('event', {
                    event: event,
                    admin: true,
                    inevents: 'no'
                })
            } else {
                res.render('event', {
                    event: event,
                    inevents: 'no'
                })
            }
        }
    }
);
});

//API for adding Events to Users
app.get('/addevent/:id', isRegistered, function (req, res) {
User.findByIdAndUpdate(
    req.user,
    { $push: { 'events': req.params.id } },
    { safe: true, upsert: true, new: true },
    function (err, user) {
        if (err) {
            console.log(err);
            return done(err);
        }
        User.find({})
            .populate('events')
            .exec(function (err, user) {
                console.log(JSON.stringify(user, null, "\t"));
            });
        res.redirect('/members');
    }
);
});

//API for removing Events from Users
app.get('/rmevent/:id', isRegistered, function (req, res) {
User.findByIdAndUpdate(
    req.user,
    { $pull: { 'events': req.params.id } },
    { safe: true, upsert: true, new: true },
    function (err, user) {
        if (err) {
            console.log(err);
            return done(err);
        }
        User.find({})
            .exec(function (err, user) {
                console.log(JSON.stringify(user, null, "\t"));
            });
        res.redirect('/members');
    }
);
});

//API for UPDATING User password field w/password verification & admin privileges
app.post('/resetpwd/:id', isRegistered, function (req, res) {
User.findOne({ '_id': req.params.id })
    .exec(function (err, user) {
        if (err) {
            return done(err);
        }
        console.log('old password hash is : ' + user.password);
        if (req.user.admin) {
            User.findOneAndUpdate({ '_id': req.params.id }, {
                $set:
                {
                    password: createHash(req.body.password)
                }
            }, function (err, user) {
                console.log('password has reset to: ' + user.password);
                req.flash('resetPass', 'Successfully Changed Password');
                res.redirect("/");
            });
        } else {
            if (bCrypt.compareSync(req.body.oldpass, user.password)) {
                User.findOneAndUpdate({ '_id': req.params.id }, {
                    $set: {
                        password: createHash(req.body.password)
                    }
                }, function (err, user) {
                    console.log('password has reset to: ' + user.password);
                    req.flash('resetPass', 'Successfully Changed Password');
                    res.redirect("/");
                });
            } else {
                req.flash('message', 'Incorrect Old Password');
                res.render('resetpwd', { message: req.flash('message') });
            }
        }
    });
});

/*
===========AUXILIARY FUNCTIONS============
*/

//Middleware for detecting if a user is verified
function isRegistered(req, res, next) {
if (req.isAuthenticated()) {
    console.log('cool you are a member, carry on your way');
    next();
} else {
    console.log('You are not a member');
    res.redirect('/signup');
}
}

//Middleware for detecting if a user is an admin
function isAdmin(req, res, next) {
if (req.isAuthenticated() && req.user.admin) {
    console.log('cool you are an admin, carry on your way');
    next();
} else {
    console.log('You are not an admin');
    res.send('You are not an administrator.', 403);
}
}

//===============PORT=================
var port = process.env.PORT || 3000; //select your port or let it pull from your .env file
app.listen(port);
console.log("listening on " + port + "!");