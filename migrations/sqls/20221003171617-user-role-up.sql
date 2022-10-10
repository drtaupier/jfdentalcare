DROP TABLE IF EXISTS user_role;
DROP SEQUENCE IF EXISTS user_role__role_id_seq;
CREATE TABLE user_role(role_id SERIAL PRIMARY KEY, user_role VARCHAR(80) NOT NULL);

INSERT INTO user_role(user_role) VALUES ('ADMIN');
INSERT INTO user_role(user_role) VALUES ('USER');
