import { MeterProvider } from '@opentelemetry/sdk-metrics-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor, BatchSpanProcessor, ConsoleSpanExporter, } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ExpressInstrumentation, ExpressRequestHookInformation } from 'opentelemetry-instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { Span, Baggage } from '@opentelemetry/api';
import { AlwaysOnSampler, AlwaysOffSampler, ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/core';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis'
import { serviceSyncDetector } from 'opentelemetry-resource-detector-service';
import { CollectorTraceExporter, CollectorMetricExporter, } from '@opentelemetry/exporter-collector';
import WsInstrumentation from './ws-instrumentation/ws';
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-http');



const init = function (serviceName: string, metricPort: number) {

    // Define metrics
    // const metricExporter = new PrometheusExporter({ port: metricPort }, () => {
    //     console.log(`scrape: http://localhost:${metricPort}${PrometheusExporter.DEFAULT_OPTIONS.endpoint}`);
    // });
    const metricExporter = new CollectorMetricExporter({
        url: 'http://localhost:4318/v1/metrics'
    })
    const meter = new MeterProvider({ exporter: metricExporter, interval: 100000 }).getMeter(serviceName);

    // Define traces
    const traceExporter = new JaegerExporter({ endpoint: 'http://localhost:14268/api/traces'});
    const traceExporter2 = new OTLPTraceExporter({ url: 'http://localhost:3001/'})
    const provider = new NodeTracerProvider({
        resource: new Resource({
            [SemanticResourceAttributes.SERVICE_NAME]: serviceName
        }),
        sampler:new ParentBasedSampler({
            root: new TraceIdRatioBasedSampler(1)
        })
    });
    // const provider2 = new NodeTracerProvider({
    //     resource: new Resource({
    //         [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    //         'http-reqBodySize': HttpInstrumentation.respon
    //     })
    // })

    // const provider2 = new NodeTracerProvider({
    //     resource: new Resource({
    //         [SemanticResourceAttributes.SERVICE_NAME]: serviceName
    //     }),
    //     sampler:new ParentBasedSampler({
    //         root: new TraceIdRatioBasedSampler(1)
    //     })
    // });
    // const traceExporter = new CollectorTraceExporter({
    //     url: 'http://localhost:4318/v1/trace'
    // })
    provider.addSpanProcessor(new BatchSpanProcessor(traceExporter));
    provider.addSpanProcessor(new SimpleSpanProcessor(traceExporter2));
    provider.register();
    registerInstrumentations({
        instrumentations: [
            new ExpressInstrumentation({
                requestHook: (span, reqInfo) => {
                    span.setAttribute('request-headers', JSON.stringify(reqInfo.req.headers))
                    // span.setAttributes('request', )
                    // span.setAttribute('request', JSON.stringify(reqInfo.request))
                    // span.setAttribute('response', JSON.stringify(reqInfo.res))
                    // span.setAttribute('newReqAttribute', http.request.body.size)
                    
                }
            }),
            new HttpInstrumentation({
                requestHook: (span, request) => {
                    // span.setAttribute("additional req info", JSON.stringify(request))
                    // request.on('end', () => {
                    //     span.setAttribute('request', JSON.stringify(request));
                    // })
                }
            }),
            new IORedisInstrumentation(),
            new WsInstrumentation()
        ]
    });
    const tracer = provider.getTracer(serviceName);
    // const tracer2 = provider2.getTracer(serviceName);
    return { meter, tracer };
}

export default init;

// import { MeterProvider } from '@opentelemetry/sdk-metrics-base';
// import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
// import { SimpleSpanProcessor, BatchSpanProcessor, ConsoleSpanExporter, } from '@opentelemetry/sdk-trace-base';
// import { Resource } from '@opentelemetry/resources';
// import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
// import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
// import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
// import { registerInstrumentations } from '@opentelemetry/instrumentation';
// import { ExpressInstrumentation, ExpressRequestHookInformation } from 'opentelemetry-instrumentation-express';
// import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
// import { Span, Baggage, diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';
// import { AlwaysOnSampler, AlwaysOffSampler, ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/core';
// import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis'
// import { serviceSyncDetector } from 'opentelemetry-resource-detector-service';
// import { CollectorTraceExporter, CollectorMetricExporter, } from '@opentelemetry/exporter-collector';


// const init = function (serviceName: string, metricPort: number) {
//     // diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ALL);
//     // Define metrics
//     //metrics to be exported to promotheus
//         //promotheus scrapes the data from the service
        
//     const metricExporter = new CollectorMetricExporter({
//         url: 'http://localhost:4318/v1/metrics'
//     })

//     //configure your port to send metrics directly to your backend
//     // const metricExporter = new PrometheusExporter({ port: metricPort }, () => {
//     //     console.log(`scrape: http://localhost:${metricPort}${PrometheusExporter.DEFAULT_OPTIONS.endpoint}`);
//     // });
//     //creating a new meter instatior 
//         //exporter is promoethus
//         //interval is how often it scrapes
//         //getMeter() is a function that tells otel how to reference the meter based on the service name you 
//         //pass it during instationation 
//     const meter = new MeterProvider({ exporter: metricExporter, interval: 10000 }).getMeter(serviceName);



//     // Define traces
//     //traces are to be exported to jaeger

//     // const traceExporter = new JaegerExporter({ endpoint: 'http://localhost:14268/api/traces' });
//     // const serviceResources = serviceSyncDetector.detect();
//     // const customResources = new Resource({'my-resource':1});

//     const provider = new NodeTracerProvider({
//         resource: new Resource({
//             [SemanticResourceAttributes.SERVICE_NAME]: serviceName
//         }),
//         // sampler: new ParentBasedSampler({
//         //     root: new TraceIdRatioBasedSampler(1)
//         // })
//     });
//     const collectorTraceExporter = new CollectorTraceExporter({
//         url: 'http://localhost:4318/v1/trace'
//     })

//     //** span processor simply procsses the spans and it must connect to an exporter*/
//     //** batch span processor would buffer the span also allows us to provide additional configuratiions*/
    
//     provider.addSpanProcessor(new BatchSpanProcessor(collectorTraceExporter));
//     // provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
//     // provider.addSpanProcessor(new BatchSpanProcessor(traceExporter));
//     provider.register();
//     registerInstrumentations({
//         instrumentations: [
//             // new ExpressInstrumentation({
//             //     requestHook: (span, reqInfo) => {
//             //         span.setAttribute('request-headers', JSON.stringify(reqInfo.req.headers))
//             //     } 
//             // }), 
//             new HttpInstrumentation({
//                 requestHook: (span, reqInfo) => {
//                     span.setAttribute('method', JSON.stringify(reqInfo.method));
//                 }
//             }),
//             new ExpressInstrumentation({
//                 requestHook: (span, reqInfo) => {
//                     span.setAttribute('request-headers', JSON.stringify(reqInfo.req.headers))
//                 }
//             })
//         ]
//     });
//     const tracer = provider.getTracer(serviceName);

//     return { meter, tracer };
// }

// export default init;