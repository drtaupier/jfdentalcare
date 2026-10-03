import express, { Request, Response } from 'express';
import Client from '../database';

const healthRoutes = (app: express.Application): void => {
	app.get('/health', async (_req: Request, res: Response) => {
		const timestamp = new Date().toISOString();

		try {
			await Client.query('SELECT 1');

			res.status(200).json({
				status: 'ok',
				services: {
					api: 'up',
					database: 'up',
				},
				timestamp,
			});
		} catch (error) {
			console.error('Health check database error:', error);

			res.status(503).json({
				status: 'degraded',
				services: {
					api: 'up',
					database: 'down',
				},
				timestamp,
			});
		}
	});
};

export default healthRoutes;
