DROP TABLE IF EXISTS user_status;
DROP SEQUENCE IF EXISTS user_status_status_id_seq;
CREATE TABLE user_status(status_id SERIAL PRIMARY KEY, user_status VARCHAR(10) NOT NULL);

INSERT INTO user_status(user_status) VALUES ('ACTIVE');
INSERT INTO user_status(user_status) VALUES ('INACTIVE');
