const bcrypt = require('bcryptjs');

var spicedPg = require("spiced-pg");

var {
    dbUser,
    dbPass
} = require("./secrets");

var db = spicedPg(`postgres:${dbUser}:${dbPass}@localhost:5432/signatures`);

function hashPassword(plainTextPassword) { //for registration
    return new Promise(function(resolve, reject) {
        bcrypt.genSalt(function(err, salt) {
            if (err) {
                return reject(err);
            }
            // console.log(salt);
            bcrypt.hash(plainTextPassword, salt, function(err, hash) {
                if (err) {
                    return reject(err);
                }
                // console.log(hash);
                resolve(hash);
            });
        });
    });
}

function userRegistration(first, last, email, hash) {
    return new Promise(function(resolve, reject) {
        const q = "INSERT INTO users (first, last, email, hash) VALUES ($1, $2, $3, $4) RETURNING id";
        const params = [first, last, email, hash];

        db.query(q, params).then(function(results) {
            resolve(results);
        }).catch(function(err) {
            reject(err);
        });
    });
};

function checkPassword(textEnteredInLoginForm, hashedPasswordFromDatabase) { //for login
    return new Promise(function(resolve, reject) {
        bcrypt.compare(textEnteredInLoginForm, hashedPasswordFromDatabase, function(err, doesMatch) {
            if (err) {
                reject(err);
            } else {
                resolve(doesMatch);
            }
        });
    });
}

// hashPassword('trustno1').then(function(hash) {
//      console.log(hash);
//     return checkPassword('trustno1', hash);
// }).then(function(doesMatch) {
//      console.log(doesMatch)
// })

function signPetition(first, last, signature) {
    return new Promise(function(resolve, reject) {
        const q = "INSERT INTO signatures (first, last, signature) VALUES ($1, $2, $3) RETURNING id";
        const params = [first, last, signature];

        db.query(q, params)
        //targeting table called signatures
        //$ corresponds to number of params. Prevent sql injection, basically avoiding user messing with table.
            .then(function(results) {
            resolve(results); //ASK!!
        }).catch(function(err) {
            reject(err);
        });
    }); //ends promise
}

function getSigURL(sigId) {
    return new Promise(function(resolve, reject) {
        const q = "SELECT signature FROM signatures WHERE id = $1";
        const params = [sigId];
        db.query(q, params).then(function(results) {
            // console.log("RESUTLTS", results);
            resolve(results.rows[0].signature); //results is the sigature id
        }).catch(function(err) {
            reject(err);
        });
    });
}

function getSigCount() {
    return new Promise(function(resolve, reject) {
        const q = "SELECT COUNT(*) FROM signatures";
        db.query(q).then(function(results) {
            resolve(results.rows[0].count);
        }).catch(function(err) {
            reject(err);
        });
    });
}
function getSigners() {
    return new Promise(function(resolve, reject) {
        const q = "SELECT first, last FROM signatures";
        db.query(q).then(function(results) {
            resolve(results.rows);
        }).catch(function(err) {
            reject(err);
        });
    });
}

module.exports = {
    hashPassword,
    userRegistration,
    checkPassword,
    signPetition,
    getSigURL,
    getSigCount,
    getSigners
};
