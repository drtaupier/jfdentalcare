DROP TABLE IF EXISTS message_status;
DROP SEQUENCE IF EXISTS message_status_status_id_seq;
CREATE TABLE message_status (status_id SERIAL PRIMARY KEY, status VARCHAR(15) NOT NULL);

INSERT INTO message_status (status) VALUES ('New Message');
INSERT INTO message_status (status) VALUES ('First attempt');
INSERT INTO message_status (status) VALUES ('Second attempt');
INSERT INTO message_status (status) VALUES ('No Contact');
INSERT INTO message_status (status) VALUES ('In process');
INSERT INTO message_status (status) VALUES ('Attended');