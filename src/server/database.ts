import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const client = process.env.DB_CONNECTION_URL
	? new Pool({
			connectionString: process.env.DB_CONNECTION_URL,
	  })
	: new Pool({
			host: process.env.POSTGRES_HOST || process.env.DB_HOST,
			database: process.env.POSTGRES_DB || process.env.DB_NAME,
			user: process.env.POSTGRES_USER || process.env.DB_USER,
			password: process.env.POSTGRES_PASSWORD || process.env.DB_PASSWORD,
			port: Number(process.env.POSTGRES_PORT || process.env.DB_PORT || 5432),
	  });

export default client;
