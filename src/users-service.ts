// importing tracer code
import init from './tracer';
// initalizing tracer and meter 
const { tracer } = init('users-services', 8091);

import * as api from '@opentelemetry/api';
import axios from 'axios';
import * as express from 'express';
const app = express();
const randomNumber = (min: number, max: number) => Math.floor(Math.random() * max + min);

import { WebSocketServer } from 'ws';
const wss = new WebSocketServer({ port: 8092 });

//websocket recieving
wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        try{
        const payload = JSON.parse(message?.toString());
        // theoretical code if we used manual instrumentation

        // // const propagatedContext = api.propagation.extract(api.ROOT_CONTEXT, payload);
        // const wsSpan = tracer.startSpan('got ws message', {
            // attributes: {
                // 'payload': message?.toString()
            // }});
        // }}, propagatedContext)
        console.log('received: %s', message);
        // wsSpan.end();

        // 
    } catch(e){
        console.error(e)
    }
    });
});

//redis for db
import * as Redis from 'ioredis';
//redis intialization
const redis = new Redis();


app.get('/user', async (request, response) => {
    const apiResponse = await axios('https://mocki.io/v1/d4867d8b-b5d5-4a48-a4ab-79131b5809b8');
    const randomIndex = randomNumber(0, apiResponse.data.length)
    //gets the existing span

    //** this code can be extracted away */ 
    const activeSpan = api.trace.getSpan(api.context.active());
    //add an additional event to the span
    activeSpan.addEvent('A number was randomizaed', {
        randomIndex
    })

    response.json(apiResponse.data[randomIndex]);
})

app.listen(8090);
console.log('users services is up and running on port 8090');

//db related
redis.subscribe('my-channel', (err, data) => {
    console.log(`on subscribe`);
    redis.on("message", (channel, message) => {

        //**Can be abstracted away */
        //De-serializing the object
        const payload = JSON.parse(message);
        // exracting from the payload the propogated context
        const propagatedContext = api.propagation.extract(api.ROOT_CONTEXT, payload);
        //start a new span and providing the attribute and use it until the propagted context is finish
        const span = api.trace.getTracer('@opentelemetry/instrumentation-ioredis').startSpan("consume a message", {
            attributes: {
                message,
            }
        }, propagatedContext);

        //close the span
        span.end();


        console.log(`Received ${message} from ${channel}`);
    });
})


setInterval(async () => {
    api.trace.getTracer('manual').startActiveSpan('Refesh cache', async (span) => {
        const apiResponse = await axios('https://mocki.io/v1/d4867d8b-b5d5-4a48-a4ab-79131b5809b8');
        span.end();
    });

}, 60000)