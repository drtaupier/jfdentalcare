DROP TABLE IF EXISTS possible_appts;
DROP SEQUENCE IF EXISTS possible_appts_possible_appt_id_seq;

CREATE TABLE possible_appts (possible_appt_id SERIAL PRIMARY KEY, possible_appt VARCHAR(50));

INSERT INTO possible_appts (possible_appt) VALUES ('As soon as possible');
INSERT INTO possible_appts (possible_appt) VALUES ('Within the next 3 days');
INSERT INTO possible_appts (possible_appt) VALUES ('To the next week');
