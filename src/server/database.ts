import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const environment = (
	process.env.ENV ||
	process.env.NODE_ENV ||
	'dev'
).toLowerCase();

const isTestEnvironment = environment === 'test';

const databaseName = isTestEnvironment
	? process.env.POSTGRES_TEST_DB
	: process.env.POSTGRES_DB || process.env.DB_NAME;

if (isTestEnvironment) {
	if (!databaseName?.endsWith('_test')) {
		throw new Error(
			'Test database name must end with "_test". Refusing to continue.'
		);
	}

	if (databaseName === process.env.POSTGRES_DB) {
		throw new Error(
			'Test and development databases must be different. Refusing to continue.'
		);
	}
}

const connectionString = isTestEnvironment
	? process.env.TEST_DB_CONNECTION_URL
	: process.env.DB_CONNECTION_URL;

const client = connectionString
	? new Pool({
			connectionString,
	  })
	: new Pool({
			host: process.env.POSTGRES_HOST || process.env.DB_HOST,
			database: databaseName,
			user: process.env.POSTGRES_USER || process.env.DB_USER,
			password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
			port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT || 5432),
	  });

export default client;
