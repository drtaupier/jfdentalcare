import Client from '../database';
import bcrypt from 'bcrypt';

export type User = {
    user_id?: number;
    firstname?: string;
    lastname?: string;
    username:string;
    password: string;
    status_id?: number;
    dob?: Date;
    role_id?:number
}
export class UserStore {
    async index(): Promise<User[]>{
        try{
            const conn = await Client.connect();
            const sql = 'SELECT u.firstname, u.lastname, u.username, us.status, u.dob, ur.user_role FROM users AS u INNER JOIN user_roles AS ur ON u.role_id=ur.role_id INNER JOIN user_status AS us ON u.status_id=us.status_id';
            const result = await conn.query(sql);
            conn.release();
            return result.rows;
        }catch(error){
            throw new Error(`Cannot get users. ${error}`);
        }
    }

    async activeUsers(): Promise<User[]>{
        try {
            const conn = await Client.connect();
            const sql = 'SELECT u.firstname, u.lastname, u.username, us.status, u.dob, ur.user_role FROM users AS u INNER JOIN user_roles AS ur ON u.role_id=ur.role_id INNER JOIN user_status AS us ON u.status_id=us.status_id AND us.status_id=1';
            const result = await conn.query(sql);
            conn.release();
            return result.rows;
        } catch (error) {
            throw new Error(`Cannot get active users ${error}`);
        }
    }

    async inactiveUsers(): Promise<User[]>{
        try {
            const conn = await Client.connect();
            const sql = 'SELECT u.firstname, u.lastname, u.username, us.status, u.dob, ur.user_role FROM users AS u INNER JOIN user_roles AS ur ON u.role_id=ur.role_id INNER JOIN user_status AS us ON u.status_id=us.status_id AND us.status_id=2';
            const result = await conn.query(sql);
            conn.release();
            return result.rows;
        } catch (error) {
            throw new Error(`Cannot get active users ${error}`);
        }
    }
    
    async show(users_id: string):Promise<User>{
        try{
            const sql = 'SELECT u.firstname, u.lastname, u.username, us.status, u.dob, ur.user_role FROM users AS u INNER JOIN user_status AS us ON u.status_id=us.status_id INNER JOIN user_roles AS ur ON u.role_id=ur.role_id AND u.user_id=$1';
            const conn = await Client.connect();
            const result = await conn.query(sql, [users_id]);
            conn.release();
            return result.rows[0];
        }catch(error){
            throw new Error(`Could not find user ${error}`);
        }
    }

    async create(u: User): Promise<User> {
        try {
          const conn = await Client.connect();
          const sql =
            'INSERT INTO users (firstname, lastname, username, password, dob, role_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *'
      
          const hash = bcrypt.hashSync(
            u.password + process.env.PAPPER,
            parseInt(process.env.SALT_ROUNDS as unknown as string)
          );
      
          const result = await conn.query(sql, [
            u.firstname,
            u.lastname,
            u.username,
            hash,
            u.dob,
            u.role_id,
          ]);
      
          conn.release();
          const user = result.rows[0];
      
          if (!user) {
            throw new Error(`El usuario ya se encuentra registrado.`);
          }
      
          return user;
        } catch (error) {
          throw new Error(`Cannot create the user. Error: ${error}`);
        }
      }
      
    
    async delete(users_id:string):Promise<User>{
        try {
            const sql = 'UPDATE users SET status_id=2 WHERE user_id=$1';
            const conn = await Client.connect();
            const result = await conn.query(sql, [users_id]);
            conn.release();
            return result.rows[0];
        } catch (error) {
            throw new Error(`Could not find user ${error}`);
        }
    }

    async active(users_id:string):Promise<User>{
        try {
            const sql = 'UPDATE users SET status_id=1 WHERE user_id=$1';
            const conn = await Client.connect();
            const result = await conn.query(sql, [users_id]);
            conn.release();
            return result.rows[0];
        } catch (error) {
            throw new Error(`Could not find user ${error}`);
            
        }
    }

    async authenticate(username: string, password: string): Promise<User | null> {
        try {
            const conn = await Client.connect();
            const sql = 'SELECT * FROM users WHERE username=$1';
            const result = await conn.query(sql, [username]);
            conn.release();
            if (result.rows.length) {
                const user = result.rows[0];
                if (bcrypt.compareSync(password + process.env.PAPPER, user.password)) {
                    return user;
                }
            }
            return null; // Usuario no encontrado o contraseña incorrecta
        } catch (error) {
            throw new Error(`Cannot authenticate the user. Error: ${error}`)
        }
    }

    
    
    
}

