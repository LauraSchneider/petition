const express = require("express");
const app = express();
const hb = require("express-handlebars");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");
const bodyParser = require("body-parser");
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

const checkForSigId = function(req, res, next) {
    if (req.session.sigId) {
        next();
    } else {
        res.redirect('/petition');
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

//routes

app.get("/profile", function(req, res) {
    res.render("profile", {layout: "main"});
});

app.post("/profile", function(req, res) {
    console.log("HERE", req.session);
    userProfile(req.body.age, req.body.city, req.body.url, req.session.user.id).then(function(results) {
        res.redirect('/petition')
    })
});

app.get("/login", function(req, res) {
    res.render("login", {layout: "main"});
});

app.post("/login", function(req, res) {
    console.log(req.body.email);
    if (!req.body.email || !req.body.password) {
        res.render("login", {
            layout: "main",
            error: "There was an error. Please retry."
        })
    } else {
        userLogin(req.body.email).then(function(results) { //results is coming from db, the hashed pw
            checkPassword(req.body.password, results.rows[0].hash).then(function(doesMatch) {
                if (doesMatch) {

                    // req.session.userId = {
                    //     id: results.rows[0].id,
                    //     email: req.body.email
                    // };
                    res.redirect("/petition");
                }
            });

        });
    }
});

app.get("/petition", function(req, res) {
    console.log("SESSION", req.session);
    if (req.session.sigId) {
        console.log("PETITION ROUTE");
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
        console.log("LOOK HERE", req.body.singature);
        signPetition(req.body.signature).then(function(results) {
            //results contains the id from database
            const sigId = results.rows[0].id;
            req.session = {
                sigId
            };
            res.redirect("/thankyou"); //linked to thanks page
        });
    }
});

app.get("/registration", function(req, res) {
    res.render("registration", {layout: "main"});
});

app.post("/registration", function(req, res) {
    if (!req.body.first || !req.body.last || !req.body.email || !req.body.password) {
        res.render("registration", {
            layout: "main",
            error: "There was an error. Please retry."
        });

    } else {
        hashPassword(req.body.password).then(function(hashedPassword) { //access to hashed password inside .then function
            userRegistration(req.body.first, req.body.last, req.body.email, hashedPassword).then(function(results) {
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

app.get("/thankyou", checkForSigId, function(req, res) {
    Promise.all([
        getSigURL(req.session.sigId),
        getSigCount()
    ]).then(function(results) {
        res.render("thankyou", {
            layout: "main",
            signature: results[0],
            count: results[1]
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

app.get("/signers", checkForSigId, function(req, res) {
    getSigners().then(function(signers) {
        res.render("signers", {
            layout: "main",
            signers
        });
    });
});

app.get("/petition/signers/:city", function(req, res) {
    getSignersbyCity(req.params.city).then(function(signers) {
        res.render("signers", {
            layout: "main",
            hideCity: true,
            signers
        });
    });
});

app.listen(8080, () => console.log("I'm listening"));
