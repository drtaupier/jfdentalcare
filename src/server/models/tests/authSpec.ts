import request from 'supertest';
import app from '../../app';
import Client from '../../database';
import { hashPassword } from '../../utils/password';

describe('POST /api/auth/login', () => {
	const username = 'login-test@jfdentalcare.test';
	const password = 'Testing123!';

	beforeAll(async () => {
		await Client.query('DELETE FROM users WHERE username = $1', [username]);

		const passwordHash = await hashPassword(password);

		await Client.query(
			`INSERT INTO users
			 (firstname, lastname, username, password, status_id, role_id,
			  display_name, must_change_password)
			 VALUES ($1, $2, $3, $4, 1, 4, $5, FALSE)`,
			['Login', 'Test', username, passwordHash, 'Login Test']
		);
	});

	afterAll(async () => {
		await Client.query('DELETE FROM users WHERE username = $1', [username]);
	});

	it('returns 200 and a token with valid credentials', async () => {
		const response = await request(app).post('/api/auth/login').send({
			username,
			password,
		});

		expect(response.status).toBe(200);
		expect(typeof response.body.token).toBe('string');
		expect(response.body.role).toBe('MANAGER');
		expect(response.body.must_change_password).toBe(false);
	});

	it('returns 401 with invalid credentials for an incorrect password', async () => {
		const response = await request(app).post('/api/auth/login').send({
			username,
			password: 'WrongPassword123!',
		});

		expect(response.status).toBe(401);
		expect(response.body.error).toEqual({
			code: 'INVALID_CREDENTIALS',
			message: 'Invalid username or password.',
		});
	});
	it('returns 401 when the temporary password has expired', async () => {
		await Client.query(
			`UPDATE users
			 SET must_change_password = TRUE,
			     temporary_password_expires_at = NOW() - INTERVAL '1 minute'
			 WHERE username = $1`,
			[username]
		);

		const response = await request(app).post('/api/auth/login').send({
			username,
			password,
		});

		expect(response.status).toBe(401);
		expect(response.body.error).toEqual({
			code: 'TEMPORARY_PASSWORD_EXPIRED',
			message: 'Temporary password expired. Contact technical support.',
		});
	});
	it('locks the account after five incorrect passwords', async () => {
		await Client.query(
			`UPDATE users
			 SET must_change_password = FALSE,
			     temporary_password_expires_at = NULL,
			     failed_login_attempts = 0,
			     locked_until = NULL
			 WHERE username = $1`,
			[username]
		);

		for (let attempt = 1; attempt <= 4; attempt += 1) {
			const response = await request(app).post('/api/auth/login').send({
				username,
				password: 'WrongPassword123!',
			});

			expect(response.status).toBe(401);
			expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
		}

		const lockedResponse = await request(app).post('/api/auth/login').send({
			username,
			password: 'WrongPassword123!',
		});

		expect(lockedResponse.status).toBe(429);
		expect(lockedResponse.body.error.code).toBe('ACCOUNT_TEMPORARILY_LOCKED');

		const result = await Client.query(
			`SELECT failed_login_attempts, locked_until
			 FROM users
			 WHERE username = $1`,
			[username]
		);

		expect(result.rows[0].failed_login_attempts).toBe(5);
		expect(result.rows[0].locked_until).not.toBeNull();
	});
	it('allows login after the lock expires and resets failed attempts', async () => {
		await Client.query(
			`UPDATE users
			 SET failed_login_attempts = 5,
			     locked_until = NOW() - INTERVAL '1 minute'
			 WHERE username = $1`,
			[username]
		);

		const response = await request(app).post('/api/auth/login').send({
			username,
			password,
		});

		expect(response.status).toBe(200);
		expect(typeof response.body.token).toBe('string');

		const result = await Client.query(
			`SELECT failed_login_attempts, locked_until
			 FROM users
			 WHERE username = $1`,
			[username]
		);

		expect(result.rows[0].failed_login_attempts).toBe(0);
		expect(result.rows[0].locked_until).toBeNull();
	});
});
