DROP TABLE IF EXISTS user_profiles;

CREATE TABLE user_profiles (
        id SERIAL PRIMARY KEY, --equal to req.session.user_id
        user_id INTEGER REFERENCES users(id),
        age INTEGER,
        city VARCHAR (255),
        url VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
