const express = require("express");
const app = express();
const hb = require("express-handlebars");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const bodyParser = require("body-parser");
const csurf = require("csurf");
const db = require("./db");
const signPetition = db.signPetition;
const getSigners = db.getSigners;
const getSigURL = db.getSigURL;
const getSigCount = db.getSigCount;
const userRegistration = db.userRegistration;
const hashPassword = db.hashPassword;
const checkPassword = db.checkPassword;
const userLogin = db.userLogin;
const userProfile = db.userProfile;
const getSignersbyCity = db.getSignersbyCity;
const populateProfile = db.populateProfile;
const updateWithPasswordProfile = db.updateWithPasswordProfile;
const updateWithoutPasswordProfile = db.updateWithoutPasswordProfile;
const insertProfile = db.insertProfile;
const updateUserProfile = db.updateUserProfile;
const checkForRowInUserProfile = db.checkForRowInUserProfile;
const selectInfoFromUsersTable = db.selectInfoFromUsersTable;
const deleteSigId = db.deleteSigId;
//const cache = require('./cache');
const checkForSigId = function(req, res, next) {
    if (req.session.sigId) {
        next();
    } else {
        res.redirect('/petition');
    }
};

const checkForLogin = function(req,res,next) {
    if(req.session.user) {
        next();

    } else {
        res.redirect('/login')
    }
};

const checkForLogout = function(req, res, next) {
    if(req.session.user) {
        return res.redirect('/petition')
    } else {
        next()
    }
}
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
    res.redirect('/registration')
})
app.get("/profile", checkForLogin, function(req, res) {
    res.render("profile", {layout: "main"});
});

app.post("/profile", function(req, res) {
    userProfile(req.body.age, req.body.city, req.body.url, req.session.user.id).then(function(results) {
        res.redirect('/petition')
    });
});

app.get("/login", checkForLogout, function(req, res) {
    if(req.session.user) {
        return res.redirect('/petition')
    }
    res.render("login", {layout: "main"});
});

app.post("/login", function(req, res) {
    // console.log(req.body.email);
    if (!req.body.email || !req.body.password) {
        res.render("login", {
            layout: "main",
            error: "There was an error. Please retry."
        });

    } else {
        userLogin(req.body.email).then(function(results) { //results is coming from db, the hashed pw
            if (results.rows[0]) {
                checkPassword(req.body.password, results.rows[0].hash).then(function(doesMatch) {
                    console.log("CHECKPASSWORD")
                    if (doesMatch) {

                        req.session.user = {
                            id: results.rows[0].id,
                            email: req.body.email
                        };
                        res.redirect("/petition");
                    } else {
                        res.render("login", {
                            layout: "main",
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
    if (req.session.sigId) {
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
        signPetition(req.body.signature).then(function(results) {
            //results contains the id from database
            const sigId = results.rows[0].id;
            req.session.sigId = sigId;
            // req.session = {
            //     sigId
            // };
            // console.log("NEW SESSION", req.session);
            res.redirect("/thankyou"); //linked to thanks page
        });
    }
});

app.get("/registration", checkForLogout, function(req, res) {
    res.render("registration", {layout: "main"});

});

app.post("/registration", function(req, res) {
    console.log("CHECKING POST REG ROUTE");
    if (!req.body.first || !req.body.last || !req.body.email || !req.body.password) {
        console.log("CHECK IF BLOCK");
        res.render("registration", {
            layout: "main",
            error: "There was an error. Please retry."
        });

    } else {
        console.log("CHECK ELSE BLOCK");
        hashPassword(req.body.password).then(function(hashedPassword) { //access to hashed password inside .then function
            userRegistration(req.body.first, req.body.last, req.body.email, hashedPassword).then(function(results) {
                console.log("RESULTS", results);
                req.session.user = {
                    id: results.rows[0].id,
                    first: req.body.first,
                    last: req.body.last
                };
                res.redirect("/profile");
            });
        });
    } //END OF else
});

app.get("/thankyou", checkForLogin, checkForSigId, function(req, res) {
    Promise.all([
        getSigURL(req.session.sigId),
        getSigCount()
    ]).then(function(results) {
        res.render("thankyou", {
            layout: "main",
            signature: results[0],
            count: results[1],
            csrfToken: req.csrfToken()
        });
    });
    // getSigURL(req.session.sigId).then(function(signature) {
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
    getSigners().then(function(signers) {
        res.render("signers", {
            layout: "main",
            signers
        });
    });
});

app.get("/petition/signers/:city", checkForLogin, checkForSigId, function(req, res) {
    getSignersbyCity(req.params.city).then(function(signers) {
        res.render("signers", {
            layout: "main",
            hideCity: true,
            signers
        });
    });
});

app.get('/edit', checkForLogin, function(req, res) {
    console.log("REQ SESSION", req.session);
    checkForRowInUserProfile(req.session.user.id).then(function(rowExists) {
        if (rowExists) {
            populateProfile(req.session.user.id).then(function(results) {
                // console.log("RESULTS", req.body);
                res.render("edit", {
                    layout: "main",
                    first: results.first,
                    last: results.last,
                    email: results.email,
                    age: results.age,
                    url: results.url
                });
            });
        } else {
            selectInfoFromUsersTable(req.session.user.id).then(function(results) {
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
        hashPassword(password).then(function(hashPassword) {
            updateWithPasswordProfile(hashPassword, req.session.user.id).then(function() {
                res.redirect('/petition')
                //updated table w new password, still need to update the other stuff in user table as well as the stuff in user profiles table . then redirect.
            });
        });
    } else {
        updateWithoutPasswordProfile(first, last, email, req.session.user.id).then(function() {

            //updates all the values for the user table we still need to update the user_profiles TABLE
            //we have updated the user_profiles table. Redirect here.
            // res.redirect('/edit')
            checkForRowInUserProfile(req.session.user.id).then(function(rowExists) {

                if (rowExists) {
                    updateUserProfile(age, city, homepage, req.session.user.id).then(function() {

                        res.redirect('/petition');
                    });

                    //write a new function that updates the user profile table row. else a function that insert user profile table
                } else {
                    insertProfile(req.session.user.id, age, city, homepage).then(function() {
                        res.redirect('/petition');

                    })
                }

            });

        });

    }
    // if (checkForRowInUserProfile) {
    //     console.log(checkForRowInUserProfile);
    // };

});

app.post('/delete', function(req, res) {
    deleteSigId(req.session.sigId).then(function(results) {
        console.log("RESULTS", results);
        req.session.sigId = null;
        res.redirect('/petition')
    });
});

app.get('/logout', function(req, res) {
    req.session = null;
    res.redirect('/login');
});


//include middle ware when adding csrf
//req.body is infomration from a fomr
app.listen(process.env.PORT || 8080), () => console.log("I'm listening");
