DROP TABLE IF EXISTS users;
DROP SEQUENCE IF EXISTS users_user_id_seq;

CREATE TABLE users (
user_id SERIAL PRIMARY KEY,
firstname VARCHAR(50) NOT NULL,
lastname VARCHAR(80) NOT NULL,
username VARCHAR(50) NOT NULL,
password VARCHAR(100) NOT NULL,
status_id INT REFERENCES user_status(status_id) DEFAULT 1,
DOB DATE NOT NULL,
role_id INT REFERENCES user_roles(role_id)
);
