import dotenv from 'dotenv';
import Client from '../database';
import { hashPassword } from '../utils/password';

dotenv.config();

const required = (name: string): string => {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
};

const bootstrapOwner = async (): Promise<void> => {
	const username = required('INITIAL_OWNER_USERNAME').toLowerCase();
	const password = required('INITIAL_OWNER_PASSWORD');
	const firstName = required('INITIAL_OWNER_FIRST_NAME');
	const lastName = required('INITIAL_OWNER_LAST_NAME');

	const connection = await Client.connect();
	try {
		await connection.query('BEGIN');

		const existingOwner = await connection.query(
			`SELECT u.user_id
       FROM users u
       INNER JOIN user_roles r ON r.role_id = u.role_id
       WHERE r.user_role = 'OWNER'
       LIMIT 1`
		);

		if (existingOwner.rowCount) {
			throw new Error('An OWNER account already exists; no account was created');
		}

		const role = await connection.query(
			`SELECT role_id FROM user_roles WHERE user_role = 'OWNER' LIMIT 1`
		);
		if (!role.rowCount) {
			throw new Error('OWNER role is missing. Run migrations first.');
		}

		const passwordHash = await hashPassword(password);
		await connection.query(
			`INSERT INTO users
         (firstname, lastname, username, password, role_id, display_name, must_change_password)
       VALUES ($1, $2, $3, $4, $5, $6, TRUE)`,
			[
				firstName,
				lastName,
				username,
				passwordHash,
				role.rows[0].role_id,
				'Practice Owner',
			]
		);

		await connection.query('COMMIT');
		console.log(
			`OWNER account created for ${username}. Password change required at first login.`
		);
	} catch (error) {
		await connection.query('ROLLBACK');
		throw error;
	} finally {
		connection.release();
		await Client.end();
	}
};

bootstrapOwner().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
