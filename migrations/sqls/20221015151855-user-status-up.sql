DROP TABLE IF EXISTS user_status CASCADE;
DROP SEQUENCE IF EXISTS user_status_status_id_seq;
CREATE TABLE user_status(status_id SERIAL PRIMARY KEY, status VARCHAR(10) NOT NULL);

INSERT INTO user_status(status) VALUES ('ACTIVE');
INSERT INTO user_status(status) VALUES ('INACTIVE');
