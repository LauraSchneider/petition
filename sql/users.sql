DROP TABLE IF EXISTS users;

CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        first VARCHAR (255) NOT NULL,
        last VARCHAR (255) NOT NULL,
        email TEXT NOT NULL UNIQUE,
        hash VARCHAR (100) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
