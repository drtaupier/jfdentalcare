import bodyParser from 'body-parser';
import cors from 'cors';
import express, { Request, Response } from 'express';
import morgan from 'morgan';
import messageRoutes from './handlers/message';
import message_usersRoutes from './handlers/message_users';
import userRoutes from './handlers/users';

const path = require('path');
const port = 'jfdentalcare.com';
const app: express.Application = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(morgan('dev'));
app.use(cors());

app.use(express.static(path.resolve(__dirname, "../../public")));
app.use(express.static(__dirname));

app.get('/', (_req: Request, res: Response) => {
	res.sendFile(__dirname + "/index.html")
});

userRoutes(app);
messageRoutes(app);
message_usersRoutes(app);

app.listen(port, () => {
	console.log(`Server started at localhost ${port}`);
});

export default app;