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
});
