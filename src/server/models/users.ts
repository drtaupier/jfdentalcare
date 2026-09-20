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
	token_version: number;
};

export type ManagedUserInput = {
	firstname: string;
	lastname: string;
	username: string;
	display_name: string;
	role: 'OWNER' | 'MANAGER' | 'USER';
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

	async createManagedUser(
		user: ManagedUserInput,
		temporaryPassword: string,
		actorUserId: number,
		ipAddress?: string
	): Promise<User> {
		const allowedRoles = ['OWNER', 'MANAGER', 'USER'];
		if (!allowedRoles.includes(user.role)) throw new Error('ROLE_NOT_ALLOWED');

		const conn = await Client.connect();
		try {
			await conn.query('BEGIN');
			const role = await conn.query(
				'SELECT role_id FROM user_roles WHERE user_role = $1',
				[user.role]
			);
			if (!role.rowCount) throw new Error('ROLE_NOT_FOUND');

			const passwordHash = await hashPassword(temporaryPassword);
			const result = await conn.query(
				`INSERT INTO users
				 (firstname, lastname, username, password, role_id, display_name,
				  must_change_password, temporary_password_expires_at)
				 VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW() + INTERVAL '24 hours')
				 RETURNING user_id, firstname, lastname, username, status_id, role_id,
				           display_name, must_change_password,
				           temporary_password_expires_at, created_at`,
				[
					user.firstname,
					user.lastname,
					user.username.toLowerCase(),
					passwordHash,
					role.rows[0].role_id,
					user.display_name,
				]
			);
			const createdUser = result.rows[0] as User;

			await conn.query(
				`INSERT INTO audit_logs
				 (actor_user_id, action, resource_type, resource_id, ip_address, metadata)
				 VALUES ($1, 'USER_CREATED', 'USER', $2, $3, $4::jsonb)`,
				[
					actorUserId,
					String(createdUser.user_id),
					ipAddress || null,
					JSON.stringify({ role: user.role, method: 'owner_managed' }),
				]
			);

			await conn.query('COMMIT');
			return { ...createdUser, user_role: user.role };
		} catch (error) {
			await conn.query('ROLLBACK');
			throw error;
		} finally {
			conn.release();
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
                     token_version = token_version + 1,
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

	async resetPassword(
		targetUserId: number,
		temporaryPassword: string,
		actorUserId: number,
		actorRole: string,
		ipAddress?: string
	): Promise<{ user_id: number; username: string; user_role: string }> {
		if (!['OWNER', 'TECH_SUPPORT', 'ADMIN'].includes(actorRole)) {
			throw new Error('RESET_NOT_ALLOWED');
		}
		if (targetUserId === actorUserId) throw new Error('SELF_RESET_NOT_ALLOWED');

		const conn = await Client.connect();
		try {
			await conn.query('BEGIN');
			const target = await conn.query(
				`SELECT u.user_id, u.username, r.user_role
				 FROM users u
				 JOIN user_roles r ON r.role_id = u.role_id
				 WHERE u.user_id = $1 AND u.status_id = 1
				 FOR UPDATE`,
				[targetUserId]
			);
			if (!target.rowCount) throw new Error('USER_NOT_FOUND');

			const targetUser = target.rows[0] as {
				user_id: number;
				username: string;
				user_role: string;
			};
			if (!['OWNER', 'MANAGER', 'USER'].includes(targetUser.user_role)) {
				throw new Error('TARGET_ROLE_NOT_ALLOWED');
			}

			const passwordHash = await hashPassword(temporaryPassword);
			await conn.query(
				`UPDATE users
				 SET password = $1,
				     must_change_password = TRUE,
				     temporary_password_expires_at = NOW() + INTERVAL '24 hours',
				     failed_login_attempts = 0,
				     locked_until = NULL,
				     token_version = token_version + 1,
				     updated_at = NOW()
				 WHERE user_id = $2`,
				[passwordHash, targetUserId]
			);
			await conn.query(
				`INSERT INTO audit_logs
				 (actor_user_id, action, resource_type, resource_id, ip_address, metadata)
				 VALUES ($1, 'PASSWORD_RESET', 'USER', $2, $3, $4::jsonb)`,
				[
					actorUserId,
					String(targetUserId),
					ipAddress || null,
					JSON.stringify({
						method: 'administrative',
						actor_role: actorRole,
						target_role: targetUser.user_role,
					}),
				]
			);
			await conn.query('COMMIT');
			return targetUser;
		} catch (error) {
			await conn.query('ROLLBACK');
			throw error;
		} finally {
			conn.release();
		}
	}
}
