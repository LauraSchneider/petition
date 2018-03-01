const bcrypt = require('bcryptjs');

var spicedPg = require("spiced-pg");

var {
    dbUser,
    dbPass
} = require("./secrets");
//to be modified:
const db = spicedPg(`postgres:${dbUser}:${dbPass}@localhost:5432/signatures`);

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

function userProfile(age, city, url, userID) {
    return new Promise(function(resolve, reject) {
        const q = "INSERT INTO user_profiles (age, city, url, user_id) VALUES ($1, $2, $3, $4) RETURNING id";
        const params = [age, city, url, userID];
        db.query(q, params).then(function(results) {
            resolve(results);
        }).catch(function(err) {
            reject(err);
        });
    });
}

function checkPassword(textEnteredInLoginForm, hashedPasswordFromDatabase) {
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
}

function userLogin(email) {
    return new Promise(function(resolve, reject) {
        const q = "SELECT hash, id FROM users WHERE email = $1";
        const params = [email];
        db.query(q, params).then(function(results) {
            // console.log("HASH BACK", results);
            resolve(results);
        }).catch(function(err) {
            reject(err);
        });
    });
}

// hashPassword('trustno1').then(function(hash) {
//      console.log(hash);
//     return checkPassword('trustno1', hash);
// }).then(function(doesMatch) {
//      console.log(doesMatch)
// })

function signPetition(signature) {
    return new Promise(function(resolve, reject) {
        const q = "INSERT INTO signatures (signature) VALUES ($1) RETURNING id";
        const params = [signature];

        db.query(q, params)
        //targeting table called signatures
        //$ corresponds to number of params. Prevent sql injection, basically avoiding user messing with table.
            .then(function(results) {
            resolve(results);
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
            // console.log("ROOOOWWS", results.rows);
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
            // console.log("ROW RESULTS", results.rows);
            resolve(results.rows[0].count);
        }).catch(function(err) {
            reject(err);
        });
    });
}
function getSigners() {
    return new Promise(function(resolve, reject) {
        const q = `SELECT users.first, users.last, user_profiles.city, user_profiles.age, user_profiles.url
        FROM users
        JOIN user_profiles
        ON users.id = user_profiles.user_id`;
        db.query(q).then(function(results) {
            resolve(results.rows);
        }).catch(function(err) {
            reject(err);
        });
    });
}

function getSignersbyCity(city) {
    return new Promise(function(resolve, reject) {
        const q = `SELECT users.first, users.last, user_profiles.age, user_profiles.url
    FROM users
    JOIN user_profiles
    ON users.id = user_profiles.user_id
    WHERE city = $1`;
        const params = [city];
        db.query(q, params).then(function(results) {
            resolve(results.rows);
        }).catch(function(err) {
            reject(err);
        });
    });
}

function populateProfile(id) {
    return new Promise(function(resolve, reject) {
        const q = `SELECT users.first, users.last, users.email, user_profiles.age, user_profiles.url
    FROM users
    JOIN user_profiles
    ON users.id = user_profiles.user_id
    WHERE users.id = $1`;
        const params = [id];
        db.query(q, params).then(function(results) {
            resolve(results.rows[0]);
        }).catch(function(err) {
            reject(err);
        });
    });
}

function updateWithoutPasswordProfile(first, last, email, id) {
    return new Promise(function(resolve, reject) {
        const q = `UPDATE users
        SET first = $1, last = $2, email = $3 WHERE id = $4`;
        const params = [first, last, email, id];
        db.query(q, params).then(function(results) {
            resolve(results.rows[0]);
        }).catch(function(err) {
            reject(err);
        });
    });

}
function updateWithPasswordProfile(hash, id) {
    return new Promise(function(resolve, reject) {
        const q = `UPDATE users
        SET hash = $1 WHERE id = $2`;
        const params = [hash, id];
        db.query(q, params).then(function(results) {
            resolve(results.rows[0]);
        }).catch(function(err) {
            reject(err);
        });
    });

}

function insertProfile(userId, age, city, url) {
    return new Promise(function(resolve, reject) {
        const q = `INSERT INTO user_profiles(user_id, age, city, url) VALUES ($1, $2, $3, $4) RETURNING id`;
        const params = [
            userId || null,
            age || null,
            city || null,
            url || null
        ];
        db.query(q, params).then(function(results) {
            resolve(results.rows[0]);
        }).catch(function(err) {
            reject(err);
        });
    });
}

function checkForRowInUserProfile(userId) {
    return new Promise(function(resolve, reject) {
        const q = `SELECT * FROM user_profiles WHERE user_id =$1`
        const params = [userId];
        db.query(q, params).then(function(results) {
            if (results.rows.length > 0) {
                resolve(true);
            } else {
                resolve(false);
            }
        }).catch(function(err) {
            reject(err);
        });
    });
}

function updateUserProfile(age, city, url, userId) {
    return new Promise(function(resolve, reject) {
        const q = `UPDATE user_profiles SET age=$1, city=$2, url=$3 WHERE user_id = $4`;
        const params = [age, city, url, userId];
        db.query(q, params).then(function(results) {
            resolve(results.rows[0]);
        }).catch(function(err) {
            reject(err);
        });

    })
}

function selectInfoFromUsersTable(userId) {
    return new Promise(function(resolve, reject) {
        const q = `SELECT first, last, email FROM users WHERE id = $1`;
        const params = [userId];
        db.query(q, params).then(function() {
            resolve();
        }).catch(function(err) {
            reject(err);
        });
    });
}

function deleteSigId(sigId) {
    return new Promise(function(resolve, reject) {
        const q = `DELETE FROM signatures WHERE id = $1`;
        const params = [sigId]
        db.query(q,params).then(function(results) {
            resolve(results.rows[0]);
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
    getSigners,
    userLogin,
    userProfile,
    getSignersbyCity,
    populateProfile,
    updateWithoutPasswordProfile,
    updateWithPasswordProfile,
    insertProfile,
    updateUserProfile,
    checkForRowInUserProfile,
    selectInfoFromUsersTable,
    deleteSigId

};
