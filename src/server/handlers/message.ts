import express, { Request, Response } from 'express';
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
        const message = await store.show(req.params.message_id)
        res.status(200).json(message);
    } catch (error) {
        res.status(400).json(error)
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
            possible_appointment: body.possible_appointment,
            message: body.message
        }
        const newMessage = await store.create(message);
        res.status(200).json(newMessage);
    } catch (error) {
        res.status(400).json(error)
    }
};

const destroy = async (req: Request, res: Response) => {
    try {
        const message = await store.delete(req.params.message_id);
        res.status(200).json(message);
    } catch (error){
        res.status(400).json(error);
    }
}

const messageRoutes = (app: express.Application): void => {
    app.get('/messages', index);
    app.get('/messages/:message_id', show);
    app.post('/message/sendingmessage', create);
    app.delete('/message/:message_id', destroy);
}

export default messageRoutes;