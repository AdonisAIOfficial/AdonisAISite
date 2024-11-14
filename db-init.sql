CREATE TABLE users (
email VARCHAR(255) PRIMARY KEY,
paid float4 DEFAULT 0 NOT NULL,
paying bool DEFAULT FALSE NOT NULL,
auth_token VARCHAR(255) NOT NULL,
auth_token_created_on DATE DEFAULT CURRENT_DATE NOT NULL,
password VARCHAR(255) NOT NULL,
chat_updated_at TIMESTAMP(1) DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    email VARCHAR(255) REFERENCES users(email) NOT NULL,
    message TEXT NOT NULL,
    timestamp TIMESTAMP(1) DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create a composite index on email and timestamp
CREATE INDEX idx_messages_email_timestamp ON messages(email, timestamp);

CREATE TABLE titles (
    title VARCHAR(255) PRIMARY KEY,
    is_book BOOLEAN NOT NULL,
    vector VECTOR(1024)  -- Ensure this matches the embedding dims
);

CREATE TABLE contents (
    content TEXT,  -- Or use VARCHAR()
    title VARCHAR(255) REFERENCES titles(title) ON DELETE CASCADE,
    vector VECTOR(1024),  -- Ensure this matches the embedding dims
    PRIMARY KEY (title, content)
);

-- Create an index on title to optimize queries filtering by it
CREATE INDEX idx_contents_title ON contents(title);

CREATE TABLE memories (
    memory TEXT DEFAULT '' NOT NULL,
    timestamp TIMESTAMP(1) DEFAULT CURRENT_TIMESTAMP NOT NULL,
    email VARCHAR(255) REFERENCES users(email) NOT NULL
);

CREATE INDEX idx_memories_email_timestamp ON memories(email, timestamp);

CREATE TABLE feedback (
    feedback VARCHAR(1024) NOT NULL,
    email VARCHAR(255) REFERENCES users(email) NOT NULL,
    date DATE DEFAULT CURRENT_DATE NOT NULL
);
