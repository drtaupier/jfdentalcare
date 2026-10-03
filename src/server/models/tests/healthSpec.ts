import request from 'supertest';
import app from '../../app';
import Client from '../../database';

describe('GET /health', () => {
	it('returns 200 when the database is available', async () => {
		const response = await request(app).get('/health');

		expect(response.status).toBe(200);
		expect(response.body.status).toBe('ok');
		expect(response.body.services).toEqual({
			api: 'up',
			database: 'up',
		});
		expect(typeof response.body.timestamp).toBe('string');
	});

	it('returns 503 when the database is unavailable', async () => {
		spyOn(Client, 'query').and.rejectWith(
			new Error('Database unavailable during health test')
		);

		const response = await request(app).get('/health');

		expect(response.status).toBe(503);
		expect(response.body.status).toBe('degraded');
		expect(response.body.services).toEqual({
			api: 'up',
			database: 'down',
		});
		expect(typeof response.body.timestamp).toBe('string');
	});
});
