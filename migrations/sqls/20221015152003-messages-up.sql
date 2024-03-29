DROP TABLE IF EXISTS messages;
DROP SEQUENCE IF EXISTS messages_message_id_seq;

CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    phone VARCHAR(10) NOT NULL,
    email VARCHAR(60),
    possible_appt INT REFERENCES possible_appts(possible_appt_id),
    message VARCHAR(200),
    fecha_mensaje DATE DEFAULT NOW()
);

ALTER TABLE messages
ADD COLUMN status_id INT NOT NULL DEFAULT 1;
