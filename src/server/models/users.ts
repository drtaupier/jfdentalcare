import Client from '../database';
import { hashPassword, verifyPassword } from '../utils/password';

export type User = {
	user_id?: number;
	firstname?: string;
	lastname?: string;
	username: string;
	password?: string;
	status_id?: number;
	dob?: Date;
	role_id?: number;
	user_role?: string;
	display_name?: string;
	must_change_password?: boolean;
};

export type AuthenticatedUser = {
	user_id: number;
	username: string;
	role_id: number;
	user_role: string;
	status_id: number;
	must_change_password: boolean;
	temporary_password_expires_at?: Date | string | null;
};
export class UserStore {
	async roleNameById(roleId: number): Promise<string | null> {
		const conn = await Client.connect();
		try {
			const result = await conn.query(
				'SELECT user_role FROM user_roles WHERE role_id = $1',
				[roleId]
			);
			return result.rows[0]?.user_role || null;
		} finally {
			conn.release();
		}
	}

	async index(): Promise<User[]> {
		try {
			const conn = await Client.connect();
			const sql =
				'SELECT u.firstname, u.lastname, u.username, us.status, u.dob, ur.user_role FROM users AS u INNER JOIN user_roles AS ur ON u.role_id=ur.role_id INNER JOIN user_status AS us ON u.status_id=us.status_id';
			const result = await conn.query(sql);
			conn.release();
			return result.rows;
		} catch (error) {
			throw new Error(`Cannot get users. ${error}`);
		}
	}

	async activeUsers(): Promise<User[]> {
		try {
			const conn = await Client.connect();
			const sql =
				'SELECT u.firstname, u.lastname, u.username, us.status, u.dob, ur.user_role FROM users AS u INNER JOIN user_roles AS ur ON u.role_id=ur.role_id INNER JOIN user_status AS us ON u.status_id=us.status_id AND us.status_id=1';
			const result = await conn.query(sql);
			conn.release();
			return result.rows;
		} catch (error) {
			throw new Error(`Cannot get active users ${error}`);
		}
	}

	async inactiveUsers(): Promise<User[]> {
		try {
			const conn = await Client.connect();
			const sql =
				'SELECT u.firstname, u.lastname, u.username, us.status, u.dob, ur.user_role FROM users AS u INNER JOIN user_roles AS ur ON u.role_id=ur.role_id INNER JOIN user_status AS us ON u.status_id=us.status_id AND us.status_id=2';
			const result = await conn.query(sql);
			conn.release();
			return result.rows;
		} catch (error) {
			throw new Error(`Cannot get active users ${error}`);
		}
	}

	async show(users_id: string): Promise<User> {
		try {
			const sql =
				'SELECT u.firstname, u.lastname, u.username, us.status, u.dob, ur.user_role FROM users AS u INNER JOIN user_status AS us ON u.status_id=us.status_id INNER JOIN user_roles AS ur ON u.role_id=ur.role_id AND u.user_id=$1';
			const conn = await Client.connect();
			const result = await conn.query(sql, [users_id]);
			conn.release();
			return result.rows[0];
		} catch (error) {
			throw new Error(`Could not find user ${error}`);
		}
	}

	async create(u: User): Promise<User> {
		try {
			if (!u.password) {
				throw new Error('Password is required');
			}
			const conn = await Client.connect();
			const sql = `INSERT INTO users (firstname, lastname, username, password, dob, role_id, display_name)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING user_id, firstname, lastname, username, status_id, dob, role_id,
                       display_name, must_change_password, created_at`;

			const hash = await hashPassword(u.password);

			const result = await conn.query(sql, [
				u.firstname,
				u.lastname,
				u.username,
				hash,
				u.dob,
				u.role_id,
				u.display_name,
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

	async delete(users_id: string): Promise<User> {
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

	async active(users_id: string): Promise<User> {
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

	async authenticate(
		username: string,
		password: string
	): Promise<AuthenticatedUser | null> {
		try {
			const conn = await Client.connect();
			const sql = `SELECT u.*, ur.user_role
                         FROM users AS u
                         INNER JOIN user_roles AS ur ON u.role_id = ur.role_id
                         WHERE LOWER(u.username) = LOWER($1) AND u.status_id = 1`;
			const result = await conn.query(sql, [username]);
			conn.release();
			if (result.rows.length) {
				const user = result.rows[0];
				if (
					user.must_change_password &&
					user.temporary_password_expires_at &&
					new Date(user.temporary_password_expires_at).getTime() <= Date.now()
				) {
					return null;
				}
				if (await verifyPassword(password, user.password)) {
					const { password: _passwordHash, ...safeUser } = user;
					return safeUser as AuthenticatedUser;
				}
			}
			return null; // Usuario no encontrado o contraseña incorrecta
		} catch (error) {
			throw new Error(`Cannot authenticate the user. Error: ${error}`);
		}
	}

	async changePassword(
		userId: number,
		currentPassword: string,
		newPassword: string,
		ipAddress?: string
	): Promise<void> {
		const conn = await Client.connect();
		try {
			await conn.query('BEGIN');
			const result = await conn.query(
				`SELECT password FROM users
                 WHERE user_id = $1 AND status_id = 1
                 FOR UPDATE`,
				[userId]
			);

			if (!result.rowCount) throw new Error('USER_NOT_FOUND');
			const currentHash = result.rows[0].password as string;
			if (!(await verifyPassword(currentPassword, currentHash))) {
				throw new Error('CURRENT_PASSWORD_INCORRECT');
			}
			if (await verifyPassword(newPassword, currentHash)) {
				throw new Error('PASSWORD_UNCHANGED');
			}

			const newHash = await hashPassword(newPassword);
			await conn.query(
				`UPDATE users
                 SET password = $1,
                     must_change_password = FALSE,
                     temporary_password_expires_at = NULL,
                     password_changed_at = NOW(),
                     failed_login_attempts = 0,
                     locked_until = NULL,
                     updated_at = NOW()
                 WHERE user_id = $2`,
				[newHash, userId]
			);
			await conn.query(
				`INSERT INTO audit_logs
                 (actor_user_id, action, resource_type, resource_id, ip_address, metadata)
                 VALUES ($1, 'PASSWORD_CHANGED', 'USER', $2, $3, $4::jsonb)`,
				[
					userId,
					String(userId),
					ipAddress || null,
					JSON.stringify({ method: 'self_service' }),
				]
			);
			await conn.query('COMMIT');
		} catch (error) {
			await conn.query('ROLLBACK');
			throw error;
		} finally {
			conn.release();
		}
	}
}
