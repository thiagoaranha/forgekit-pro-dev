# Quickstart: ForgeKit Observability

This guide explains how to properly implement and use the observability standards defined in Spec 008 within your ForgeKit services.

## 1. Setup & Integration

All ForgeKit observability features are encapsulated in the `@forgekit/shared-observability` package.

To integrate it into a new Fastify service:

```typescript
import Fastify from 'fastify';
import { 
  initializeTracing,
  observabilityPlugin, 
  logger, 
  healthPlugin,
  observabilityErrorHandlerPlugin
} from '@forgekit/shared-observability';

initializeTracing({ serviceName: 'my-new-service' });

const buildService = async () => {
  const server = Fastify({ logger: false });

  // 1. Register Observability (Handles Context, Logs, and Metrics)
  server.register(observabilityPlugin, {
    serviceName: 'my-new-service'
  });
  server.register(observabilityErrorHandlerPlugin);

  // 2. Register Health Endpoints (Liveness and Readiness)
  server.register(healthPlugin, {
    // Add external dependencies here for /health/ready
    readinessChecks: [
      async () => await myDatabase.ping(),
      async () => await myExternalService.check()
    ]
  });

  return server;
};
```

Tracing must be initialized exactly once during service startup, before the service starts accepting HTTP requests or processing background work. Development and test environments sample 100% of traces by default. Production sampling may be configured with `OTEL_TRACES_SAMPLER_RATIO`.

## 2. Using the Logger

Do NOT use `console.log`. Use the standardized `logger` exported by `shared-observability`. Because of our `AsyncLocalStorage` implementation, the `logger` automatically attaches the `x-correlation-id` and `traceparent` to every log.

```typescript
import { logger } from '@forgekit/shared-observability';

// Correct: simple message
logger.info('User successfully authenticated');

// Correct: structured payload (Sanitization happens automatically for keys like 'password')
logger.error({ 
  err, 
  userId: user.id, 
  action: 'authentication' 
}, 'Authentication failed due to invalid credentials');

// Incorrect: NEVER log raw secrets or full request payloads without selecting safe properties
logger.info({ payload: request.body }, 'Received request'); // BAD
```

### Log Levels
- `debug`: Detailed execution steps (disabled by default in production).
- `info`: Normal lifecycle events, significant state transitions.
- `warn`: Recoverable problems, invalid inputs.
- `error`: Unrecoverable errors, failed operations.

## 3. Propagating Context (HTTP & Messaging)

### Outbound HTTP Requests
When making synchronous calls to other services, you must forward the active correlation ID and trace context. 

```typescript
import { injectObservabilityHeaders } from '@forgekit/shared-observability';

await fetch('http://another-service/api', {
  headers: injectObservabilityHeaders()
});
```

### Asynchronous Messaging
When publishing events to a broker (e.g., RabbitMQ), attach the context to the message headers/metadata.

```typescript
import { injectObservabilityHeaders } from '@forgekit/shared-observability';

channel.publish('exchange', 'routingKey', Buffer.from(JSON.stringify(payload)), {
  headers: injectObservabilityHeaders()
});
```

Message consumers must restore both identifiers before handling the message. Processing failures must be logged with correlation and trace context, then integrated with retry or dead-letter behavior where the broker supports it.

## 4. Custom Metrics

The `observabilityPlugin` automatically records HTTP request counts, error rates, and latencies. If you need to track custom business metrics:

```typescript
import { metrics } from '@forgekit/shared-observability';

const myBusinessCounter = new metrics.Counter({
  name: 'my_service_business_events_total',
  help: 'Total number of business events processed'
});

// Increment later in code
myBusinessCounter.inc();
```

For meaningful business or system operations, prefer `withOperationTelemetry`, `withDependencyTelemetry`, and `withMessageTelemetry`. Do not wrap trivial helper functions. Operation and dependency names must be stable normalized labels such as `items.create` or `postgres/items.create`; never include IDs, usernames, raw URLs, payload values, or other high-cardinality data.
