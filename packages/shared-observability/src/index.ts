import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import pino from 'pino';
import {
    Counter,
    Gauge,
    Histogram,
    Registry,
    collectDefaultMetrics,
    register as defaultMetricsRegister,
} from 'prom-client';

export { Counter, Gauge, Histogram, Registry };
export * as metrics from 'prom-client';

const CORRELATION_HEADER = 'x-correlation-id';
const TRACEPARENT_HEADER = 'traceparent';
const UUID_V4_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TRACEPARENT_PATTERN = /^00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}$/i;

export type ObservabilityContext = {
    correlationId: string;
    traceparent: string;
    serviceName: string;
};

export type ReadinessCheck = {
    name: string;
    check: () => Promise<void> | Promise<boolean> | void | boolean;
};

export type ObservabilityPluginOptions = {
    serviceName: string;
};

export type HealthPluginOptions = {
    serviceName?: string;
    readinessChecks?: ReadinessCheck[];
};

const contextStorage = new AsyncLocalStorage<ObservabilityContext>();
let configuredServiceName = process.env.SERVICE_NAME || 'unknown-service';

export const isValidCorrelationId = (value: string): boolean => UUID_V4_PATTERN.test(value);

export const generateCorrelationId = (): string => randomUUID();

const randomHex = (bytes: number): string => randomBytes(bytes).toString('hex');

export const generateTraceparent = (): string => `00-${randomHex(16)}-${randomHex(8)}-01`;

export const isValidTraceparent = (value: string): boolean => TRACEPARENT_PATTERN.test(value);

const firstHeaderValue = (value: string | string[] | undefined): string | undefined => {
    if (Array.isArray(value)) {
        return value[0];
    }

    return value;
};

const resolveIncomingCorrelationId = (request: FastifyRequest): string => {
    const incoming = firstHeaderValue(request.headers[CORRELATION_HEADER]);

    if (incoming && isValidCorrelationId(incoming)) {
        return incoming;
    }

    return generateCorrelationId();
};

const resolveIncomingTraceparent = (request: FastifyRequest): string => {
    const incoming = firstHeaderValue(request.headers[TRACEPARENT_HEADER]);

    if (incoming && isValidTraceparent(incoming)) {
        return incoming;
    }

    return generateTraceparent();
};

export const configureObservability = (options: { serviceName: string }): void => {
    configuredServiceName = options.serviceName;
};

export const getObservabilityContext = (): ObservabilityContext | undefined => contextStorage.getStore();

export const runWithObservabilityContext = <T>(context: ObservabilityContext, callback: () => T): T =>
    contextStorage.run(context, callback);

export const getCorrelationId = (): string => getObservabilityContext()?.correlationId ?? generateCorrelationId();

export const getTraceContext = (): string => getObservabilityContext()?.traceparent ?? generateTraceparent();

export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    formatters: {
        level: (label) => ({ level: label }),
    },
    mixin: () => {
        const context = getObservabilityContext();

        return {
            serviceName: context?.serviceName ?? configuredServiceName,
            correlationId: context?.correlationId,
            traceparent: context?.traceparent,
        };
    },
    redact: {
        paths: [
            'password',
            '*.password',
            'token',
            '*.token',
            'secret',
            '*.secret',
            'authorization',
            '*.authorization',
            'headers.authorization',
            'req.headers.authorization',
            'request.headers.authorization',
            'connectionString',
            '*.connectionString',
        ],
        censor: '[REDACTED]',
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

const registry = defaultMetricsRegister;
let defaultMetricsStarted = false;

const getOrCreateMetric = <T>(name: string, create: () => T): T => {
    const existing = registry.getSingleMetric(name);

    if (existing) {
        return existing as T;
    }

    return create();
};

const requestCounter = getOrCreateMetric(
    'http_requests_total',
    () =>
        new Counter({
            name: 'http_requests_total',
            help: 'Total HTTP requests processed.',
            labelNames: ['service', 'method', 'route', 'status', 'outcome'] as const,
        })
);

const requestDuration = getOrCreateMetric(
    'http_request_duration_seconds',
    () =>
        new Histogram({
            name: 'http_request_duration_seconds',
            help: 'HTTP request duration in seconds.',
            labelNames: ['service', 'method', 'route', 'status', 'outcome'] as const,
            buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        })
);

const requestErrorRate = getOrCreateMetric(
    'http_request_error_rate',
    () =>
        new Gauge({
            name: 'http_request_error_rate',
            help: 'HTTP error rate by service and route.',
            labelNames: ['service', 'method', 'route'] as const,
        })
);

const totalsByLabel = new Map<string, { total: number; errors: number }>();

const routeLabel = (request: FastifyRequest): string => request.routeOptions.url ?? request.url.split('?')[0];

const setContextHeaders = (reply: FastifyReply, context: ObservabilityContext): void => {
    reply.header(CORRELATION_HEADER, context.correlationId);
    reply.header(TRACEPARENT_HEADER, context.traceparent);
};

export const observabilityPlugin = fp(async (
    fastify: FastifyInstance,
    options: ObservabilityPluginOptions
): Promise<void> => {
    configureObservability({ serviceName: options.serviceName });

    if (!defaultMetricsStarted) {
        collectDefaultMetrics({ register: registry, prefix: 'forgekit_' });
        defaultMetricsStarted = true;
    }

    fastify.addHook('onRequest', (request, reply, done) => {
        const context: ObservabilityContext = {
            correlationId: resolveIncomingCorrelationId(request),
            traceparent: resolveIncomingTraceparent(request),
            serviceName: options.serviceName,
        };

        request.headers[CORRELATION_HEADER] = context.correlationId;
        request.headers[TRACEPARENT_HEADER] = context.traceparent;
        setContextHeaders(reply, context);

        contextStorage.run(context, done);
    });

    fastify.addHook('onResponse', async (request, reply) => {
        const status = String(reply.statusCode);
        const outcome = reply.statusCode >= 400 ? 'error' : 'success';
        const route = routeLabel(request);
        const labels = {
            service: options.serviceName,
            method: request.method,
            route,
            status,
            outcome,
        };

        requestCounter.inc(labels);

        const responseTimeMs = reply.elapsedTime;
        if (typeof responseTimeMs === 'number') {
            requestDuration.observe(labels, responseTimeMs / 1000);
        }

        const rateKey = `${options.serviceName}|${request.method}|${route}`;
        const totals = totalsByLabel.get(rateKey) ?? { total: 0, errors: 0 };
        totals.total += 1;
        if (reply.statusCode >= 400) {
            totals.errors += 1;
        }
        totalsByLabel.set(rateKey, totals);
        requestErrorRate.set(
            {
                service: options.serviceName,
                method: request.method,
                route,
            },
            totals.total === 0 ? 0 : totals.errors / totals.total
        );

        logger.info(
            {
                method: request.method,
                route,
                statusCode: reply.statusCode,
                outcome,
                durationMs: typeof responseTimeMs === 'number' ? responseTimeMs : undefined,
            },
            'HTTP request completed'
        );
    });

    fastify.get('/metrics', async (_, reply) => {
        reply.header('content-type', registry.contentType);
        return registry.metrics();
    });
}, { name: 'forgekit-observability' });

export const healthPlugin = fp(async (fastify: FastifyInstance, options: HealthPluginOptions = {}): Promise<void> => {
    const readinessChecks = options.readinessChecks ?? [];

    fastify.get('/health/live', async () => ({
        status: 'OK',
        serviceName: options.serviceName ?? configuredServiceName,
    }));

    fastify.get('/health/ready', async (_, reply) => {
        const dependencies = await Promise.all(
            readinessChecks.map(async (readinessCheck) => {
                try {
                    const result = await readinessCheck.check();
                    return { name: readinessCheck.name, ready: result !== false };
                } catch {
                    return { name: readinessCheck.name, ready: false };
                }
            })
        );
        const ready = dependencies.every((dependency) => dependency.ready);

        if (!ready) {
            reply.status(503);
        }

        return {
            status: ready ? 'READY' : 'NOT_READY',
            serviceName: options.serviceName ?? configuredServiceName,
            dependencies,
        };
    });
}, { name: 'forgekit-health' });
