DROP TABLE IF EXISTS users;
DROP SEQUENCE IF EXISTS users_user_id_seq;

CREATE TABLE users (
user_id SERIAL PRIMARY KEY,
firstname VARCHAR(50) NOT NULL,
lastname VARCHAR(80) NOT NULL,
username VARCHAR(50) NOT NULL,
password VARCHAR(20) NOT NULL,
status_id INT REFERENCES user_status(status_id) DEFAULT 1, 
dob DATE NOT NULL,
role_id INT REFERENCES user_role(role_id) DEFAULT 2);

ALTER TABLE users ALTER COLUMN dob DROP NOT NULL;