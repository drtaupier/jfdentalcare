DROP TABLE IF EXISTS user_roles CASCADE;
DROP SEQUENCE IF EXISTS user_roles__role_id_seq;
CREATE TABLE user_roles(role_id SERIAL PRIMARY KEY, user_role VARCHAR(20) NOT NULL);

INSERT INTO user_roles(user_role) VALUES ('ADMIN');
INSERT INTO user_roles(user_role) VALUES ('USER');
