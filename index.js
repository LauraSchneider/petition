const express = require("express");
const app = express();
const hb = require("express-handlebars");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const bodyParser = require("body-parser");
const csurf = require("csurf");
const db = require("./db");

const checkForSigId = function(req, res, next) {
    if (req.session.user.sigId) {
        next();
    } else {
        res.redirect('/petition');
    }
};

const checkForLogin = function(req,res,next) {
    if(req.session.user) {
        next();

    } else {
        res.redirect('/login');
    }
};

const checkForLogout = function(req, res, next) {
    if(req.session.user) {
        return res.redirect('/petition');
    } else {
        next();
    }
};
//boilerplate for static files
app.use(express.static(__dirname + "/public"));

//boilerplate handlebars
app.engine("handlebars", hb());
app.set("view engine", "handlebars");

//boilerplate for cookieParser
app.use(cookieParser());

//boilerplate for bodyParser
app.use(bodyParser.urlencoded({extended: false}));

//boilerplate for cookie-Session middleware
app.use(cookieSession({
    secret: "a really hard to guess secret",
    maxAge: 1000 * 60 * 60 * 24 * 14
}));

app.use(csurf());

app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
});

//routes

app.get("/", function(req, res) {
    res.redirect('/registration');
});
app.get("/profile", checkForLogin, function(req, res) {
    res.render("profile", {layout: "main"});
});

app.post("/profile", function(req, res) {
    db.userProfile(req.body.age, req.body.city, req.body.url, req.session.user.id).then(function() {
        res.redirect('/petition');
    });
});

app.get("/login", checkForLogout, function(req, res) {
    if(req.session.user) {
        return res.redirect('/petition');
    }
    res.render("login", {layout: "loggedoutMain"});
});

app.post("/login", function(req, res) {
    // console.log(req.body.email);
    if (!req.body.email || !req.body.password) {
        console.log("PLEASE SHOW UP");
        res.render("login", {
            layout: "loggedoutMain",
            error: "There was an error. Please retry."
        });

    } else {
        db.userLogin(req.body.email).then(function(results) { //results is coming from db, the hashed pw
            if (results.rows[0]) {
                db.checkPassword(req.body.password, results.rows[0].hash).then(function(doesMatch) {
                    if (doesMatch) {
                        db.getUserInfo(results.rows[0].id).then(function(userInfo) {
                            req.session.user = {
                                id: results.rows[0].id,
                                // email: req.body.email
                                email: userInfo.email,
                                age: userInfo.age,
                                city: userInfo.city,
                                sigId: userInfo.sig_id,
                                first: userInfo.first,
                                last: userInfo.last,
                                url: userInfo.url,
                        };
                        console.log("ABOUT TO SET SESSION", req.session);
                        res.redirect("/petition");
                    });
                    } else {
                        res.render("login", {
                            layout: "loggedoutMain",
                            error: "Invalid password. Please try again."
                        });
                    }
                });
            }
        });
    }
});

app.get("/petition", checkForLogin, function(req, res) {
    // console.log("SESSION", req.session);
    if (req.session.user.sigId) {
        // console.log("PETITION ROUTE");
        res.redirect('/thankyou');
    } else {
        res.render("petition", {layout: "signthepetition"});
    }
});

app.post("/petition", function(req, res) {
    //capturing user input
    if (!req.body.signature) {
        res.render("petition", {
            layout: "main",
            //if the user didn't fill  out  all the fields an error occours
            error: "There was an error. Please retry."
        });
    } else {
        //if signed successfully with all fields filled out
        db.signPetition(req.body.signature).then(function(results) {
            //results contains the id from database
            const sigId = results.rows[0].id;
            req.session.user.sigId = sigId;
            // req.session = {
            //     sigId
            // };
            // console.log("NEW SESSION", req.session);
            res.redirect("/thankyou"); //linked to thanks page
        });
    }
});

app.get("/registration", checkForLogout, function(req, res) {
    res.render("registration", {layout: "loggedoutMain"});

});

app.post("/registration", function(req, res) {
    if (!req.body.first || !req.body.last || !req.body.email || !req.body.password) {
        res.render("registration", {
            layout: "loggedoutMain",
            error: "There was an error. Please retry."
        });

    } else {

        db.hashPassword(req.body.password).then(function(hashedPassword) { //access to hashed password inside .then function
            db.userRegistration(req.body.first, req.body.last, req.body.email, hashedPassword).then(function(results) {
                req.session.user = {
                    id: results.rows[0].id,
                    first: req.body.first,
                    last: req.body.last
                };
                res.redirect("/profile");
            });
        });
    }
});

app.get("/thankyou", checkForLogin, checkForSigId, function(req, res) {
    Promise.all([
        db.getSigURL(req.session.user.sigId),
        db.getSigCount()
    ]).then(function(results) {
        res.render("thankyou", {
            layout: "main",
            signature: results[0],
            count: results[1],
            csrfToken: req.csrfToken()
        });
    });
    // getSigURL(req.session.user.sigId).then(function(signature) {
    // getSigCount().then(function(count) {
    //     res.render('thankyou', {
    //         layout: 'main',
    //         signature,
    //         count
    //         });
    //     });
    // });

}); //ENDS THANK YOU ROUTE

app.get("/signers", checkForLogin, checkForSigId, function(req, res) {
    db.getSigners().then(function(signers) {
        res.render("signers", {
            layout: "main",
            signers
        });
    });
});

app.get("/petition/signers/:city", checkForLogin, checkForSigId, function(req, res) {
    db.getSignersbyCity(req.params.city).then(function(signers) {
        res.render("signers", {
            layout: "main",
            hideCity: true,
            signers
        });
    });
});

app.get('/edit', checkForLogin, function(req, res) {
    db.checkForRowInUserProfile(req.session.user.id).then(function(rowExists) {
        if (rowExists) {
            db.populateProfile(req.session.user.id).then(function(results) {
                // console.log("RESULTS", req.body);
                res.render("edit", {
                    layout: "main",
                    first: results.first,
                    last: results.last,
                    email: results.email,
                    age: results.age,
                    url: results.url,
                    city: results.city
                });
            });
        } else {
            db.selectInfoFromUsersTable(req.session.user.id).then(function(results) {
                res.render('edit', {
                    layout: 'main',
                    first: results.first,
                    last: results.last,
                    email: results.email
                });
            });

        }
    });

});

app.post('/edit', function(req, res) {
    // console.log("REQ.SESSIONS", req.session);
    const {
        first,
        last,
        email,
        age,
        city,
        homepage,
        password
    } = req.body;
    // const first = req.body.first
    if (password) {
        db.hashPassword(password).then(function(hashPassword) {
            db.updateWithPasswordProfile(hashPassword, req.session.user.id).then(function() {
                res.redirect('/petition')
                //updated table w new password, still need to update the other stuff in user table as well as the stuff in user profiles table . then redirect.
            });
        });
    } else {
        db.updateWithoutPasswordProfile(first, last, email, req.session.user.id).then(function() {

            //updates all the values for the user table we still need to update the user_profiles TABLE
            //we have updated the user_profiles table. Redirect here.
            // res.redirect('/edit')
            db.checkForRowInUserProfile(req.session.user.id).then(function(rowExists) {

                if (rowExists) {
                    db.updateUserProfile(age, city, homepage, req.session.user.id).then(function() {

                        res.redirect('/petition');
                    });

                    //write a new function that updates the user profile table row. else a function that insert user profile table
                } else {
                    db.insertProfile(req.session.user.id, age, city, homepage).then(function() {
                        res.redirect('/petition');

                    });
                }

            });

        });

    }
    // if (checkForRowInUserProfile) {
    //     console.log(checkForRowInUserProfile);
    // };

});

app.post('/delete', function(req, res) {
    db.deleteSigId(req.session.user.sigId).then(function(results) {
        req.session.user.sigId = null;
        res.redirect('/petition');
    });
});

app.get('/logout', function(req, res) {
    req.session = null;
    res.redirect('/login');
});


//include middle ware when adding csrf
//req.body is infomration from a fomr
app.listen(process.env.PORT || 8080, () => console.log("I'm listening"));
