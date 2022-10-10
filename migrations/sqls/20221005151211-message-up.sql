DROP TABLE IF EXISTS messages;
DROP SEQUENCE IF EXISTS messages_message_id_seq;

CREATE TABLE messages (
    message_id SERIAL PRIMARY KEY,
    firstname VARCHAR(50) NOT NULL,
    lastname VARCHAR(50) NOT NULL,
    phone VARCHAR(10) NOT NULL,
    email VARCHAR(60),
    possible_appointment VARCHAR (40) NOT NULL,
    message VARCHAR(200),
    status_id INT REFERENCES message_status(status_id) DEFAULT 1,
    fecha_mensaje DATE DEFAULT NOW()
);