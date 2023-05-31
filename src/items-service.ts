// importing tracer code
import init from './tracer';
// initalizing tracer and meter 
const { meter, tracer } = init('items-service', 8081);

import * as api from '@opentelemetry/api';
import axios from 'axios';
import * as express from 'express';
import * as Redis from 'ioredis';
const redis = new Redis();

import * as WebSocket from 'ws';
const ws = new WebSocket('ws://localhost:8092');


const app = express();

// instrumenting metrics
const httpCounter = meter.createCounter('http_calls');
app.use((request, response, next) => {
    httpCounter.add(1);
    next();
});

// websocket code
app.get('/ws', (req, res) => {
    const payload = { msg: 'Hi over ws' };

    // theoertical code if we are using manual instrumentation

    // const wsSpan = tracer.startSpan('send ws message', {})
    // api.propagation.inject(api.trace.setSpan(api.context.active(), wsSpan), payload);
    // wsSpan.setAttribute('payload',JSON.stringify(payload))
    ws.send(JSON.stringify(payload));
    // wsSpan.end();
    // 
    
    res.json({ ws: true })
})


// set up a data endpoint
app.get('/data', async (request, response) => {
    try {
        if (request.query['fail']) {
            throw new Error('A really bad error :/')
        }
        const user = await axios.get('http://localhost:8090/user');
        response.json(user.data);
    } catch (e) {
        //***this code can be extracted away

        //adds an log to the span in case of failure
        const activeSpan = api.trace.getSpan(api.context.active());
        console.error(`Critical error`, { traceId: activeSpan.spanContext().traceId });
        //records the log to the event span
        activeSpan.recordException(e);
        response.sendStatus(500);
    }
})

//set up a pub endpoint
app.get('/pub', (request, response) => {

    //**CAN BE ABSTRACTED AWAY */
    //getting the active span, the express incoming call
    const activeSpan = api.trace.getSpan(api.context.active());
    //message you want to spend
    let payload = {
        message: 'this-is-my-message'
    };
    //telling the open telmetry api, go to the propogation we have selected
        //inject into the payload into the active span
        // you are injecting; Version, Trace id, Span id, Trace flag (is sampled)
    api.propagation.inject(api.trace.setSpan(api.context.active(), activeSpan), payload);
    //


    redis.publish('my-channel', JSON.stringify(payload));
    response.sendStatus(200);
})

app.listen(8080);
console.log('items services is up and running on port 8080');


