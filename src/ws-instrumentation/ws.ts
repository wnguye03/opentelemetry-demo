//Open telemetry packages  to build our own instrumentation
import { InstrumentationBase, InstrumentationModuleDefinition, InstrumentationNodeModuleDefinition, isWrapped } from "@opentelemetry/instrumentation";
import * as api from '@opentelemetry/api';

//created a class WSinstrumentation which uses the base feature of open telemetry and extends on it 
export default class WsInstrumentation extends InstrumentationBase<any> {

    //in our constructor:
        //provide it with a name "my-ws-instrumentation"
        //second parameter is version of the package
    constructor() {
        super('my-ws-instrumentation', '0.0.1');
    }

    //all the core functionality resides in this init function and will return either void, instrumentation module def, or an array of instrumentation module def 
    protected init(): void | InstrumentationModuleDefinition<any> | InstrumentationModuleDefinition<any>[] {
        console.log(`ws init`)

        return [
            new InstrumentationNodeModuleDefinition<any>(
                //indicate that any time the ws module is loaded, this function will be invoked
                //second parameter: [*] is a version limitation we can do (based on which version we support )
                'ws', ['*'],
                //once this module is loaded we get this callback
                // this first function is to patch the model
                (moduleExports, moduleVersion) => {
                    const self = this;
                    console.log(`ws version :${moduleVersion}`)
                    console.log(`on :${moduleVersion}`, moduleExports.prototype.on)
                    console.log(`send :${moduleVersion}`, moduleExports.prototype.send)

                    //allows you to invoke this function automatically when a certain function is being called ie, like 'on' for web socket 
                    this._wrap(moduleExports.prototype, 'on', (original) =>{

                        //everytime this on function is being used, this function is actually being used under the hood
                        //this list of parameters below is actually all the parameters that the websocket on method accepts under the hood    
                            return function(ev:any, originalListener: Function){

                            console.log(`on was register`, { ev, originalListener });
                            
                            // 
                            if(ev === "message"){
                                const wrapMessage = function (args){
                                    const payload = JSON.parse(args?.toString());
                                    const propagatedContext = api.propagation.extract(api.ROOT_CONTEXT, payload);
                                    const wsSpan = self.tracer.startSpan('got ws message', {
                                        attributes: {
                                            'payload': args?.toString()
                                        }
                                    }, propagatedContext)
                                    originalListener.apply(this, args)
                                    wsSpan.end();
                                }
                                // return wrapMessage
                                return original.apply(this, [ev, wrapMessage]);

                            }

                            return original.apply(this,[ev, originalListener]);


                        }
                    });

                    //allows you to invoke this function automatically when a certain function is being called ie, like 'send' for web socket 
                    this._wrap(moduleExports.prototype, 'send', (original) => {
                        //when send is called we get a callback function
                        //we are gramted access to the original method

                        //just a message to checl if we wrapped the send method correctly
                        console.log(`Wrapping send method`);

                        //everytime this send function is being used, this function is actually being used under the hood
                        //this list of parameters below is actually all the parameters that the websocket send method accepts under the hood                            
                        return function (
                            data: any,
                            options: { mask?: boolean | undefined; binary?: boolean | undefined; compress?: boolean | undefined; fin?: boolean | undefined },
                            cb?: (err?: Error) => void) {
                                //then in the body of the function you are injecting your functionality to monitor and inject a trace

                                console.log(`ws.send is called`)

                                //this is the custom span you are injecting
                                const sendSpan = self.tracer.startSpan('send ws message (custom)');

                                // parsing the data here since in our original code we are stringyfying the original data for the websocket message
                                const payload = JSON.parse(data);

                                //now we are injecting the context in order to propogate our spans to be process once the other service recieves a message
                                api.propagation.inject(api.trace.setSpan(api.context.active(), sendSpan), payload);

                                //adding additional attributes to modify our data to have more visibility over what's being sent 
                                sendSpan.setAttribute('payload', JSON.stringify(payload));

                                //now we have to actually invoke the original function to allow for the normal usability of websocket 
                                const result = original.apply(this, [JSON.stringify(payload), options, cb]);

                                //we must end the span as normal
                                sendSpan.end();


                                return result;

                        }
                    })

                    //we need to return the moduleExports to be able to import it into another file
                    return moduleExports;
                },
                //the second function is to unpatch the module
                (moduleExports) => { },
                []
            )
        ]

    }
}