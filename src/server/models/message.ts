import Client from '../database';

export type Message = {
    message_id?: number;
    firstname: string;
    lastname: string;
    phone: string;
    email?: string;
    possible_appt?: string;
    message: string;
    status_id?: number;
    fecha_mensaje?: Date;
}

export class MessageStore {
    async index(): Promise<Message[]>{
        try {
            const conn = await Client.connect();
            const sql = 'SELECT m.message_id, m.firstname, m.lastname, m.phone, m.email, pa.possible_appt, m.message, m.fecha_mensaje, ms.status FROM messages AS m INNER JOIN possible_appts AS pa ON m.possible_appt=pa.possible_appt_id INNER JOIN message_status AS ms ON m.status_id=ms.status_id WHERE m.status_id=1;';
            const result = await conn.query(sql);
            conn.release();
            return result.rows;
        } catch (error) {
            throw new Error(`Cannot get messages. ${error}`);
        }
    }

    async show(message_id: string): Promise<Message> {
        try {
          const sql = 'SELECT m.message_id, m.firstname, m.lastname, m.phone, m.email, pa.possible_appt, m.message, m.fecha_mensaje FROM messages AS m INNER JOIN possible_appts AS pa ON m.possible_appt=pa.possible_appt_id WHERE m.message_id=$1';
          const conn = await Client.connect();
          const result = await conn.query(sql, [message_id]);
          conn.release();
          if (result.rowCount === 0) {
            throw new Error(`Could not find message with id ${message_id}`);
          }
          return result.rows[0];
        } catch (error) {
          throw new Error(`Could not find message ${error}`);
        }
      }
      

    async create(m: Message):Promise<Message>{
        try {
            const conn = await Client.connect();
            const sql = 'INSERT INTO messages (firstname, lastname, phone, email, possible_appt, message, status_id) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *';
            const result = await conn.query(sql, [
                m.firstname,
                m.lastname,
                m.phone,
                m.email,
                m.possible_appt,
                m.message,
                m.status_id //Establecerá el status_id en 1.
            ]);
            const message = result.rows[0];
            conn.release();
            return message;
        } catch (error) {
            throw new Error(`Cannot create the message ${error}`);
        }
    }
}