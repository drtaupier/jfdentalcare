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
    status_id INT REFERENCES message_status(status_id) DEFAULT 1,
    fecha_mensaje DATE DEFAULT NOW()
);
