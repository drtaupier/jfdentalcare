import Client from '../database';

export type Message = {
    message_id?: number;
    firstname: string;
    lastname: string;
    phone: string;
    email?: string;
    possible_appointment: string;
    message: string;
    status_id?: number;
    fecha_mensaje?: Date;
}

export class MessageStore {
    async index(): Promise<Message[]>{
        try {
            const conn = await Client.connect();
            const sql = 'SELECT * FROM messages';
            const result = await conn.query(sql);
            conn.release();
            return result.rows;
        } catch (error) {
            throw new Error(`Cannot get messages. ${error}`);
            
        }
    }

    async show(message_id: string):Promise<Message>{
        try {
            const sql = 'SELECT * FROM messages WHERE message_id = ($1)';
            const conn = await Client.connect();
            const result = await conn.query(sql, [message_id]);
            conn.release();
            return result.rows[0];
        } catch (error) {
            throw new Error(`Could not find message ${error}`);
            
        };
    }

    async create(m: Message):Promise<Message>{
        try {
            const conn = await Client.connect();
            const sql = 'INSERT INTO messages (firstname, lastname, phone, email, possible_appointment, message) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *';
            const result = await conn.query(sql, [
                m.firstname,
                m.lastname,
                m.phone,
                m.email,
                m.possible_appointment,
                m.message
            ]);
            const message = result.rows[0];
            conn.release();
            return message;
        } catch (error) {
            throw new Error(`Cannot create the message ${error}`);
        }
    }

    async delete(message_id:string):Promise<Message>{
        try {
            const sql = 'DELETE FROM messages WHERE message_id=$1';
            const conn = await Client.connect();
            const result = await conn.query(sql, [message_id]);
            conn.release();
            return result.rows[0];
        } catch (error) {
            throw new Error(`Could not find the message ${error}`);
        }
    }
}