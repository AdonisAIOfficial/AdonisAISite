CREATE TABLE users (
email VARCHAR(255) PRIMARY KEY,
paid float4 DEFAULT 0,
paying bool DEFAULT FALSE,
access_token VARCHAR(255),
access_token_created_on DATE,
password VARCHAR(255)
);

CREATE TABLE messages (
id SERIAL PRIMARY KEY,
email VARCHAR(255) REFERENCES users(email),
message TEXT NOT NULL,
timestamp TIMESTAMP(1) DEFAULT CURRENT_TIMESTAMP
);
