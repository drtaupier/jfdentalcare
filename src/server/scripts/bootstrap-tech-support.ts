import dotenv from 'dotenv';
import Client from '../database';
import { hashPassword, validatePassword } from '../utils/password';

dotenv.config();

const required = (name: string): string => {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Missing required environment variable: ${name}`);
	return value;
};

const bootstrapTechSupport = async (): Promise<void> => {
	const username = required('TECH_SUPPORT_USERNAME').toLowerCase();
	const password = required('TECH_SUPPORT_PASSWORD');
	const passwordErrors = validatePassword(password);
	if (passwordErrors.length) {
		throw new Error(
			`TECH_SUPPORT_PASSWORD must contain ${passwordErrors.join(', ')}`
		);
	}

	const connection = await Client.connect();
	try {
		await connection.query('BEGIN');

		const existingAccount = await connection.query(
			`SELECT u.user_id
			 FROM users u
			 INNER JOIN user_roles r ON r.role_id = u.role_id
			 WHERE r.user_role = 'TECH_SUPPORT'
			 LIMIT 1`
		);
		if (existingAccount.rowCount) {
			throw new Error(
				'A TECH_SUPPORT account already exists; no account was created'
			);
		}

		const role = await connection.query(
			`SELECT role_id FROM user_roles WHERE user_role = 'TECH_SUPPORT' LIMIT 1`
		);
		if (!role.rowCount) {
			throw new Error('TECH_SUPPORT role is missing. Run migrations first.');
		}

		const passwordHash = await hashPassword(password);
		const created = await connection.query(
			`INSERT INTO users
			 (firstname, lastname, username, password, role_id, display_name,
			  must_change_password, temporary_password_expires_at)
			 VALUES ('Technical', 'Support', $1, $2, $3, 'Technical Support',
			         TRUE, NOW() + INTERVAL '24 hours')
			 RETURNING user_id`,
			[username, passwordHash, role.rows[0].role_id]
		);

		await connection.query(
			`INSERT INTO audit_logs
			 (action, resource_type, resource_id, metadata)
			 VALUES ('TECH_SUPPORT_BOOTSTRAPPED', 'USER', $1, $2::jsonb)`,
			[
				String(created.rows[0].user_id),
				JSON.stringify({ method: 'secure_command' }),
			]
		);

		await connection.query('COMMIT');
		console.log(
			`TECH_SUPPORT account created for ${username}. Password change required at first login.`
		);
	} catch (error) {
		await connection.query('ROLLBACK');
		throw error;
	} finally {
		connection.release();
		await Client.end();
	}
};

bootstrapTechSupport().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
