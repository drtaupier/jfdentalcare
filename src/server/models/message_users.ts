import Client from '../database';

export type Message_users = {
    message_users_id?: number;
    message_id?: number;
    status_id: number;
    fecha_cambio?: Date;
    user_id: number;
}

export class Message_usersStore {
    async index(): Promise<Message_users[]>{
        try {
            const conn = await Client.connect();
            const sql = 'SELECT mu.message_users_id, m.message_id, m.firstname, m.lastname, m.phone, m.email, pa.possible_appt , m.message, m.fecha_mensaje, ms.status, u.username FROM message_users AS mu INNER JOIN messages AS m ON mu.message_id=m.message_id INNER JOIN possible_appts AS pa ON m.possible_appt=pa.possible_appt_id INNER JOIN message_status AS ms ON mu.status_id=ms.status_id INNER JOIN users AS u ON mu.user_id=u.user_id';
            const result = await conn.query(sql);
            conn.release();
            return result.rows;
        } catch (error) {
            throw new Error(`Cannot get Messages. ${error}`);
            
        }
    }

    async show(message_users_id:string):Promise<Message_users>{
        try {
            const sql = 'SELECT mu.message_users_id, m.firstname, m.lastname, m.phone, m.email, pa.possible_appt, m.message, m.fecha_mensaje, ms.status, u.username FROM message_users AS mu INNER JOIN messages AS m ON mu.message_id=m.message_id INNER JOIN message_status AS ms ON mu.status_id=ms.status_id INNER JOIN users AS u ON mu.user_id=u.user_id INNER JOIN possible_appts AS pa ON m.possible_appt=pa.possible_appt_id AND mu.status_id=6 WHERE mu.message_users_id=$1';
            const conn = await Client.connect();
            const result = await conn.query(sql, [message_users_id]);
            conn.release();
            return result.rows[0];
        } catch (error) {
            throw new Error(`Could not find message ${error}`);
        }
    }

    async showNewMessage(message_users_id:string):Promise<Message_users>{
        try {
            const sql = 'SELECT mu.message_users_id, m.message_id, m.firstname, m.lastname, m.phone, m.email, pa.possible_appt, m.message, m.fecha_mensaje, ms.status, u.username FROM message_users AS mu INNER JOIN messages AS m ON mu.message_id=m.message_id INNER JOIN message_status AS ms ON mu.status_id=ms.status_id INNER JOIN users AS u ON mu.user_id=u.user_id INNER JOIN possible_appts AS pa ON m.possible_appt=pa.possible_appt_id AND mu.status_id=1 WHERE mu.message_users_id=$1';
            const conn = await Client.connect();
            const result = await conn.query(sql, [message_users_id]);
            conn.release();
            return result.rows[0];
        } catch (error) {
            throw new Error(`Could not find message ${error}`);
        }
    }


    async showFirstAttempt():Promise<Message_users[]>{
        try {
            const sql = 'SELECT m.firstname, m.lastname, m.phone, m.email, pa.possible_appt, m.message, m.fecha_mensaje, ms.status, u.username FROM message_users AS mu INNER JOIN messages AS m ON mu.message_id=m.message_id INNER JOIN message_status AS ms ON mu.status_id=ms.status_id INNER JOIN users AS u ON mu.user_id=u.user_id INNER JOIN possible_appts AS pa ON m.possible_appt=pa.possible_appt_id AND mu.status_id=2';
            const conn = await Client.connect();
            const result = await conn.query(sql);
            conn.release();
            return result.rows;
        } catch (error) {
            throw new Error(`Could not find the message ${error}`);
        }
    }

    async showSecondAttempt():Promise<Message_users[]>{
        try {
            const sql = 'SELECT m.firstname, m.lastname, m.phone, m.email, pa.possible_appt, m.message, m.fecha_mensaje, ms.status, u.username FROM message_users AS mu INNER JOIN messages AS m ON mu.message_id=m.message_id INNER JOIN message_status AS ms ON mu.status_id=ms.status_id INNER JOIN users AS u ON mu.user_id=u.user_id INNER JOIN possible_appts AS pa ON m.possible_appt=pa.possible_appt_id AND mu.status_id=3';
            const conn = await Client.connect();
            const result = await conn.query(sql);
            conn.release();
            return result.rows;
        } catch (error) {
            throw new Error(`Could not find the message ${error}`);
        }
    }

    async showNoContact():Promise<Message_users[]>{
        try {
            const sql = 'SELECT m.firstname, m.lastname, m.phone, m.email, pa.possible_appt, m.message, m.fecha_mensaje, ms.status, u.username FROM message_users AS mu INNER JOIN messages AS m ON mu.message_id=m.message_id INNER JOIN message_status AS ms ON mu.status_id=ms.status_id INNER JOIN users AS u ON mu.user_id=u.user_id INNER JOIN possible_appts AS pa ON m.possible_appt=pa.possible_appt_id AND mu.status_id=4';
            const conn = await Client.connect();
            const result = await conn.query(sql);
            conn.release();
            return result.rows;
        } catch (error) {
            throw new Error(`Could not find the message ${error}`);
        }
    }

    async showInProcess():Promise<Message_users[]>{
        try {
            const conn = await Client.connect();
            const sql = 'SELECT m.firstname, m.lastname, m.phone, m.email, pa.possible_appt, m.message, m.fecha_mensaje, ms.status, u.username FROM message_users AS mu INNER JOIN messages AS m ON mu.message_id=m.message_id INNER JOIN message_status AS ms ON mu.status_id=ms.status_id INNER JOIN users AS u ON mu.user_id=u.user_id INNER JOIN possible_appts AS pa ON m.possible_appt=pa.possible_appt_id AND mu.status_id=5';
            const result = await conn.query(sql);
            conn.release();
            return result.rows;
        } catch (error) {
            throw new Error(`Could not find the message ${error}`);
        }
    }

    async showAttended():Promise<Message_users[]>{
        try {
            const conn = await Client.connect();
            const sql = 'SELECT mu.message_users_id, m.message_id, m.firstname, m.lastname, m.phone, m.email, pa.possible_appt, m.message, m.fecha_mensaje ,mu.fecha_cambio, ms.status, u.username FROM message_users AS mu INNER JOIN messages AS m ON mu.message_id=m.message_id INNER JOIN message_status AS ms ON mu.status_id=ms.status_id INNER JOIN users AS u ON mu.user_id=u.user_id INNER JOIN possible_appts AS pa ON m.possible_appt=pa.possible_appt_id AND mu.status_id=6';
            const result = await conn.query(sql);
            conn.release()
            return result.rows;
        } catch (error) {
            throw new Error(`Cannot get messages ${error}`);
        };
    }

    async create(message_id:number, status_id: number, user_id: number):Promise<Message_users>{
        try {
            const conn = await Client.connect();
            // const sql = 'INSERT INTO message_users(message_id, status_id, user_id) VALUES ($1, $2, $3) RETURNING *';
            const sql = 'INSERT INTO message_users(message_id, status_id, user_id) SELECT $1, $2, $3 WHERE NOT EXISTS (SELECT message_id FROM message_users WHERE message_id = $1) RETURNING *';
            const result = await conn.query(sql, [
                message_id,
                status_id,
                user_id
            ]); 
            const message_users = result.rows[0];

            const updateSql = `
                UPDATE messages SET status_id = (
                    SELECT status_id FROM message_users WHERE message_users.message_id = messages.message_id ORDER BY fecha_cambio DESC LIMIT 1
                ) WHERE EXISTS (
                    SELECT 1 FROM message_users WHERE message_users.message_id = messages.message_id
                ) AND messages.message_id = $1;
                `;
            await conn.query(updateSql, [message_id]);
            conn.release();
            return message_users;
        } catch (error) {
            throw new Error(`Cannot create the message ${error}`);
            
        }
    }

    async edit(m: Message_users):Promise<Message_users>{
        try {
            const sql = 'UPDATE message_users SET status_id=$2, user_id=$3 WHERE message_users_id=$1 RETURNING*';
            const conn = await Client.connect();
            const result = await conn.query(sql, [
                m.message_users_id,
                m.status_id,
                m.user_id
            ]);
            const message_user = result.rows[0]
            conn.release();
            return message_user;
        } catch (error) {
            throw new Error(`Could not find user ${error}`);
        }
    }

    async getMessageUser(message_id: string):Promise<Message_users>{
        try{
            const sql = 'SELECT mu.message_users_id, mu.message_id, m.firstname, m.lastname, m.phone, m.email, m.fecha_mensaje, m.message, mu.status_id, mu.fecha_cambio, u.username FROM message_users AS mu INNER JOIN messages AS m ON mu.message_id=m.message_id INNER JOIN users AS u ON mu.user_id=u.user_id AND mu.message_id=$1';
            const conn = await Client.connect();
            const result = await conn.query(sql, [message_id]);
            conn.release();
            return result.rows[0];
        }catch(error){
            throw new Error(`Could not find message ${error}`);
        }
    }
    
}