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

	beforeEach(async () => {
		const passwordHash = await hashPassword(password);

		await Client.query(
			`UPDATE users
                 SET password = $1,
                     must_change_password = FALSE,
                     temporary_password_expires_at = NULL,
                     failed_login_attempts = 0,
                     locked_until = NULL
                 WHERE username = $2`,
			[passwordHash, username]
		);

		await Client.query(
			`DELETE FROM audit_logs
                 WHERE resource_type = 'USER'
                   AND resource_id = (
                           SELECT user_id::text FROM users WHERE username = $1
                   )`,
			[username]
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
		const audit = await Client.query(
			`SELECT actor_user_id, metadata
         FROM audit_logs
         WHERE action = 'ACCOUNT_LOCKED'
           AND resource_type = 'USER'
           AND resource_id = (
                   SELECT user_id::text FROM users WHERE username = $1
           )`,
			[username]
		);

		expect(audit.rows.length).toBe(1);
		expect(audit.rows[0].actor_user_id).toBeNull();
		expect(audit.rows[0].metadata).toEqual({
			reason: 'TOO_MANY_FAILED_LOGIN_ATTEMPTS',
			failed_login_attempts: 5,
			lock_duration_minutes: 15,
		});
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

	it('returns 429 with the correct password while the account is locked', async () => {
		await Client.query(
			`UPDATE users
                         SET failed_login_attempts = 5,
                             locked_until = NOW() + INTERVAL '15 minutes'
                         WHERE username = $1`,
			[username]
		);

		const response = await request(app).post('/api/auth/login').send({
			username,
			password,
		});

		expect(response.status).toBe(429);
		expect(response.body.error.code).toBe('ACCOUNT_TEMPORARILY_LOCKED');
		expect(response.body.token).toBeUndefined();

		const result = await Client.query(
			`SELECT failed_login_attempts, locked_until
                         FROM users WHERE username = $1`,
			[username]
		);

		expect(result.rows[0].failed_login_attempts).toBe(5);
		expect(new Date(result.rows[0].locked_until).getTime()).toBeGreaterThan(
			Date.now()
		);
	});
	it('changes the password, records audit and revokes the old token', async () => {
		const newPassword = 'Updated456!';

		const login = await request(app).post('/api/auth/login').send({
			username,
			password,
		});
		expect(login.status).toBe(200);

		const token = login.body.token;

		const response = await request(app)
			.post('/api/auth/change-password')
			.set('Authorization', `Bearer ${token}`)
			.send({
				current_password: password,
				new_password: newPassword,
			});

		expect(response.status).toBe(200);
		expect(response.body.must_change_password).toBe(false);

		const revoked = await request(app)
			.post('/api/auth/change-password')
			.set('Authorization', `Bearer ${token}`)
			.send({
				current_password: newPassword,
				new_password: 'Another789!',
			});

		expect(revoked.status).toBe(401);

		const oldLogin = await request(app).post('/api/auth/login').send({
			username,
			password,
		});
		expect(oldLogin.status).toBe(401);

		const newLogin = await request(app).post('/api/auth/login').send({
			username,
			password: newPassword,
		});
		expect(newLogin.status).toBe(200);
		expect(typeof newLogin.body.token).toBe('string');

		const state = await Client.query(
			`SELECT must_change_password, temporary_password_expires_at,
                        password_changed_at, failed_login_attempts, locked_until
                 FROM users WHERE username = $1`,
			[username]
		);

		expect(state.rows[0].must_change_password).toBe(false);
		expect(state.rows[0].temporary_password_expires_at).toBeNull();
		expect(state.rows[0].password_changed_at).not.toBeNull();
		expect(state.rows[0].failed_login_attempts).toBe(0);
		expect(state.rows[0].locked_until).toBeNull();

		const audit = await Client.query(
			`SELECT actor_user_id, metadata
                 FROM audit_logs
                 WHERE action = 'PASSWORD_CHANGED'
                   AND resource_type = 'USER'
                   AND resource_id = (
                           SELECT user_id::text FROM users WHERE username = $1
                   )`,
			[username]
		);

		expect(audit.rows.length).toBe(1);
		expect(audit.rows[0].actor_user_id).toBe(login.body.user_id);
		expect(audit.rows[0].metadata).toEqual({ method: 'self_service' });
	});

	it('rejects an incorrect current password without revoking the token', async () => {
		const login = await request(app).post('/api/auth/login').send({
			username,
			password,
		});
		expect(login.status).toBe(200);

		const response = await request(app)
			.post('/api/auth/change-password')
			.set('Authorization', `Bearer ${login.body.token}`)
			.send({
				current_password: 'WrongPassword123!',
				new_password: 'Updated456!',
			});

		expect(response.status).toBe(400);
		expect(response.body.error).toBe('Current password is incorrect');

		const unchangedLogin = await request(app).post('/api/auth/login').send({
			username,
			password,
		});
		expect(unchangedLogin.status).toBe(200);

		const retry = await request(app)
			.post('/api/auth/change-password')
			.set('Authorization', `Bearer ${login.body.token}`)
			.send({
				current_password: password,
				new_password: 'Updated456!',
			});

		expect(retry.status).toBe(200);
	});
	it('allows an owner to reset a password and revokes the target token', async () => {
		const ownerUsername = 'reset-owner@jfdentalcare.test';
		let ownerId: number | undefined;

		try {
			const ownerHash = await hashPassword(password);
			const owner = await Client.query(
				`INSERT INTO users
                         (firstname, lastname, username, password, status_id,
                          role_id, display_name, must_change_password)
                         VALUES ('Reset', 'Owner', $1, $2, 1,
                                 (SELECT role_id FROM user_roles WHERE user_role = 'OWNER'),
                                 'Reset Owner', FALSE)
                         RETURNING user_id`,
				[ownerUsername, ownerHash]
			);
			ownerId = owner.rows[0].user_id;

			const targetLogin = await request(app).post('/api/auth/login').send({
				username,
				password,
			});
			expect(targetLogin.status).toBe(200);

			const ownerLogin = await request(app).post('/api/auth/login').send({
				username: ownerUsername,
				password,
			});
			expect(ownerLogin.status).toBe(200);

			const response = await request(app)
				.post(`/api/users/${targetLogin.body.user_id}/reset-password`)
				.set('Authorization', `Bearer ${ownerLogin.body.token}`)
				.send({});

			expect(response.status).toBe(200);
			expect(typeof response.body.temporary_password).toBe('string');
			expect(response.body.must_change_password).toBe(true);
			expect(response.body.temporary_password_expires_in).toBe('24 hours');

			const revoked = await request(app)
				.post('/api/auth/change-password')
				.set('Authorization', `Bearer ${targetLogin.body.token}`)
				.send({
					current_password: password,
					new_password: 'Updated456!',
				});
			expect(revoked.status).toBe(401);

			const oldLogin = await request(app).post('/api/auth/login').send({
				username,
				password,
			});
			expect(oldLogin.status).toBe(401);

			const temporaryLogin = await request(app).post('/api/auth/login').send({
				username,
				password: response.body.temporary_password,
			});
			expect(temporaryLogin.status).toBe(200);
			expect(temporaryLogin.body.must_change_password).toBe(true);

			const state = await Client.query(
				`SELECT temporary_password_expires_at
                         FROM users WHERE username = $1`,
				[username]
			);
			const remaining =
				new Date(state.rows[0].temporary_password_expires_at).getTime() - Date.now();

			expect(remaining).toBeGreaterThan(23 * 60 * 60 * 1000);
			expect(remaining).toBeLessThanOrEqual(24 * 60 * 60 * 1000);

			const audit = await Client.query(
				`SELECT actor_user_id, metadata FROM audit_logs
                         WHERE action = 'PASSWORD_RESET'
                           AND resource_type = 'USER'
                           AND resource_id = $1`,
				[String(targetLogin.body.user_id)]
			);
			expect(audit.rows.length).toBe(1);
			expect(audit.rows[0].actor_user_id).toBe(ownerId);
			expect(audit.rows[0].metadata).toEqual({
				method: 'administrative',
				actor_role: 'OWNER',
				target_role: 'MANAGER',
			});

			const change = await request(app)
				.post('/api/auth/change-password')
				.set('Authorization', `Bearer ${temporaryLogin.body.token}`)
				.send({
					current_password: response.body.temporary_password,
					new_password: 'Updated456!',
				});
			expect(change.status).toBe(200);

			const finalLogin = await request(app).post('/api/auth/login').send({
				username,
				password: 'Updated456!',
			});
			expect(finalLogin.status).toBe(200);
			expect(finalLogin.body.must_change_password).toBe(false);
		} finally {
			if (ownerId !== undefined) {
				await Client.query('DELETE FROM users WHERE user_id = $1', [ownerId]);
			}
		}
	});

	it('rejects password reset by a manager without changing the password', async () => {
		const login = await request(app).post('/api/auth/login').send({
			username,
			password,
		});
		expect(login.status).toBe(200);

		const response = await request(app)
			.post(`/api/users/${login.body.user_id}/reset-password`)
			.set('Authorization', `Bearer ${login.body.token}`)
			.send({});

		expect(response.status).toBe(403);
		expect(response.body.temporary_password).toBeUndefined();

		const retry = await request(app).post('/api/auth/login').send({
			username,
			password,
		});
		expect(retry.status).toBe(200);
		expect(retry.body.must_change_password).toBe(false);

		const audit = await Client.query(
			`SELECT audit_log_id FROM audit_logs
                 WHERE action = 'PASSWORD_RESET'
                   AND resource_type = 'USER'
                   AND resource_id = $1`,
			[String(login.body.user_id)]
		);
		expect(audit.rows.length).toBe(0);
	});
	it('returns the authenticated manager profile without password data', async () => {
		const login = await request(app).post('/api/auth/login').send({
			username,
			password,
		});
		expect(login.status).toBe(200);

		const response = await request(app)
			.get('/api/auth/me')
			.set('Authorization', `Bearer ${login.body.token}`);

		expect(response.status).toBe(200);
		expect(response.body.user_id).toBe(login.body.user_id);
		expect(response.body.username).toBe(username);
		expect(response.body.user_role).toBe('MANAGER');
		expect(response.body.must_change_password).toBe(false);
		expect(response.body.password).toBeUndefined();
		expect(response.body.token_version).toBeUndefined();
		expect(response.headers['cache-control']).toBe('no-store');
	});

	it('rejects a profile request without a token', async () => {
		const response = await request(app).get('/api/auth/me');

		expect(response.status).toBe(401);
		expect(response.body.username).toBeUndefined();
	});

	it('returns the required password change status in the profile', async () => {
		await Client.query(
			`UPDATE users
                 SET must_change_password = TRUE,
                     temporary_password_expires_at = NOW() + INTERVAL '24 hours'
                 WHERE username = $1`,
			[username]
		);

		const login = await request(app).post('/api/auth/login').send({
			username,
			password,
		});
		expect(login.status).toBe(200);

		const response = await request(app)
			.get('/api/auth/me')
			.set('Authorization', `Bearer ${login.body.token}`);

		expect(response.status).toBe(200);
		expect(response.body.must_change_password).toBe(true);
	});
	it('blocks protected routes until the required password change is completed', async () => {
		await Client.query(
			`UPDATE users
                 SET must_change_password = TRUE,
                     temporary_password_expires_at = NOW() + INTERVAL '24 hours'
                 WHERE username = $1`,
			[username]
		);

		const login = await request(app).post('/api/auth/login').send({
			username,
			password,
		});
		expect(login.status).toBe(200);

		const blocked = await request(app)
			.get('/users')
			.set('Authorization', `Bearer ${login.body.token}`);

		expect(blocked.status).toBe(403);
		expect(blocked.body.error.code).toBe('PASSWORD_CHANGE_REQUIRED');

		const change = await request(app)
			.post('/api/auth/change-password')
			.set('Authorization', `Bearer ${login.body.token}`)
			.send({
				current_password: password,
				new_password: 'Updated456!',
			});
		expect(change.status).toBe(200);

		const newLogin = await request(app).post('/api/auth/login').send({
			username,
			password: 'Updated456!',
		});
		expect(newLogin.status).toBe(200);

		const profile = await request(app)
			.get('/api/auth/me')
			.set('Authorization', `Bearer ${newLogin.body.token}`);

		expect(profile.status).toBe(200);
		expect(profile.body.must_change_password).toBe(false);

		const restricted = await request(app)
			.get('/users')
			.set('Authorization', `Bearer ${newLogin.body.token}`);

		expect(restricted.status).toBe(403);
		expect(restricted.body.error).toBe(
			'You do not have permission to perform this action'
		);
	});
});
