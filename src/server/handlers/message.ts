import express, { Request, Response } from 'express';
import verifyAuthToken from '../middlewares/auth';
import { Message, MessageStore } from '../models/message';

const store = new MessageStore();

const index = async (_req: Request, res: Response) => {
    try {
        const messages = await store.index();
        res.status(200).json(messages);
    } catch (error) {
        res.status(400).json(error)
    }
};

const show = async (req: Request, res: Response) => {
    try {
        const message = await store.show(req.params.message_id);
        res.status(200).json(message);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
};

const create = async (req: Request, res: Response) => {
    try {
        const body = req.body;
        const message:  Message = {
            firstname: body.firstname,
            lastname: body.lastname,
            phone: body.phone,
            email: body.email,
            possible_appt: body.possible_appt,
            message: body.message,
            status_id: 1
        }
        const newMessage = await store.create(message);
        res.status(201).json(newMessage);
    } catch (error) {        
        res.status(400).json(error)
    }
};

const messageRoutes = (app: express.Application): void => {
    app.get('/messages', verifyAuthToken ,index); //Muestra todos los mensajes
    app.get('/messages/:message_id', verifyAuthToken, show); //Muestra un mensaje específico por el ID
    app.post('/message/sendingmessage', create); //Pacientes envian mensajes     
}

export default messageRoutes;