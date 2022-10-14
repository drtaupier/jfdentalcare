DROP TABLE IF EXISTS message_users;
DROP SEQUENCE IF EXISTS message_users_message_users_id_seq;

CREATE TABLE message_users (
message_users_id SERIAL PRIMARY KEY,
message_id INT REFERENCES messages(message_id),
status_id INT REFERENCES message_status(status_id),
fecha_cambio DATE DEFAULT NOW(),
users_id INT REFERENCES users(users_id)
)
