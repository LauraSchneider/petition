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

const checkForSigId = function(req, res, next) {
    if (req.session.sigId) {
        next();
    } else {
        res.redirect('/petition');
    }
};

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

//boilerplate for static files
app.use(express.static(__dirname + "/public"));

//routes
app.get("/petition", function(req, res) {
    if (req.session.sigId) {
        res.redirect('/thankyou');
    } else {
        res.render("petition", {layout: "signthepetition"});
    }
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
});

app.get("/signers", checkForSigId, function(req, res) {
    getSigners().then(function(signers) {
        res.render("signers", {
            layout: "main",
            signers
        });
    });
});

app.post("/petition", function(req, res) {
    //capturing user input
    if (!req.body.first || !req.body.last || !req.body.signature) {
        res.render("petition", {
            layout: "main",
            //if the user didn't fill  out  all the fields an error occours
            error: "Please fix."
        });
    } else {
        //if signed successfully with all fields filled out
        signPetition(req.body.first, req.body.last, req.body.signature).then(function(results) {
            //results contains the id from database
            const sigId = results.rows[0].id;
            req.session = {
                sigId
            };
            res.redirect("/thankyou"); //linked to thanks page
        });
    }
});

app.listen(8080, () => console.log("I'm listening"));
