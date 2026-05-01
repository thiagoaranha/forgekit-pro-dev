import { AsyncLocalStorage } from 'node:async_hooks';
import { randomBytes, randomUUID } from 'node:crypto';
import {
    SpanKind,
    SpanStatusCode,
    TraceFlags,
    context as otelContext,
    propagation,
    trace,
    type Attributes,
    type Context,
    type Span,
} from '@opentelemetry/api';
import {
    ConsoleSpanExporter,
    NoopSpanProcessor,
    SimpleSpanProcessor,
    TraceIdRatioBasedSampler,
} from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
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
const NORMALIZED_LABEL_PATTERN = /^[a-z][a-z0-9]*(?:[._/-][a-z0-9]+)*$/;

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

export type TracingOptions = {
    serviceName: string;
    samplingRatio?: number;
};

export type TelemetryMetadata = {
    operation?: string;
    dependency?: string;
    outcome?: 'success' | 'error';
    attributes?: Record<string, string | number | boolean | undefined>;
};

export type ErrorClassification = 'validation' | 'auth' | 'dependency' | 'unexpected';

const contextStorage = new AsyncLocalStorage<ObservabilityContext>();
const requestSpanStorage = new WeakMap<FastifyRequest, Span>();
const requestOtelContextStorage = new WeakMap<FastifyRequest, Context>();
let configuredServiceName = process.env.SERVICE_NAME || 'unknown-service';
let tracingInitialized = false;

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

const resolveIncomingCorrelationId = (headers: Record<string, string | string[] | undefined>): string => {
    const incoming = firstHeaderValue(headers[CORRELATION_HEADER]);

    if (incoming && isValidCorrelationId(incoming)) {
        return incoming;
    }

    return generateCorrelationId();
};

const resolveIncomingTraceparent = (headers: Record<string, string | string[] | undefined>): string => {
    const incoming = firstHeaderValue(headers[TRACEPARENT_HEADER]);

    if (incoming && isValidTraceparent(incoming)) {
        return incoming;
    }

    return generateTraceparent();
};

export const configureObservability = (options: { serviceName: string }): void => {
    configuredServiceName = options.serviceName;
};

const defaultSamplingRatio = (): number => {
    if (process.env.NODE_ENV === 'production') {
        const configured = Number(process.env.OTEL_TRACES_SAMPLER_RATIO);
        return Number.isFinite(configured) ? Math.min(Math.max(configured, 0), 1) : 0.1;
    }

    return 1;
};

export const initializeTracing = (options: TracingOptions): void => {
    configureObservability({ serviceName: options.serviceName });

    if (tracingInitialized) {
        return;
    }

    const samplingRatio = options.samplingRatio ?? defaultSamplingRatio();
    const exportToConsole = process.env.NODE_ENV !== 'production' || process.env.OTEL_CONSOLE_EXPORTER === 'true';
    const spanProcessor = exportToConsole
        ? new SimpleSpanProcessor(new ConsoleSpanExporter())
        : new NoopSpanProcessor();
    const provider = new NodeTracerProvider({
        sampler: new TraceIdRatioBasedSampler(samplingRatio),
        spanProcessors: [spanProcessor],
    });

    provider.register();
    tracingInitialized = true;
};

export const getObservabilityContext = (): ObservabilityContext | undefined => contextStorage.getStore();

export const runWithObservabilityContext = <T>(context: ObservabilityContext, callback: () => T): T => {
    const extractedContext = propagation.extract(otelContext.active(), {
        [TRACEPARENT_HEADER]: context.traceparent,
    });

    return otelContext.with(extractedContext, () => contextStorage.run(context, callback));
};

export const getCorrelationId = (): string => getObservabilityContext()?.correlationId ?? generateCorrelationId();

const serializeSpanContext = (span: Span | undefined): string | undefined => {
    const spanContext = span?.spanContext();

    if (!spanContext || !spanContext.traceId || !spanContext.spanId) {
        return undefined;
    }

    const flags = spanContext.traceFlags === TraceFlags.SAMPLED ? '01' : '00';
    return `00-${spanContext.traceId}-${spanContext.spanId}-${flags}`;
};

export const getTraceId = (): string | undefined => trace.getActiveSpan()?.spanContext().traceId;

export const getTraceContext = (): string =>
    serializeSpanContext(trace.getActiveSpan()) ?? getObservabilityContext()?.traceparent ?? generateTraceparent();

export const extractObservabilityContextFromHeaders = (
    headers: Record<string, string | string[] | undefined>,
    serviceName = configuredServiceName
): ObservabilityContext => ({
    correlationId: resolveIncomingCorrelationId(headers),
    traceparent: resolveIncomingTraceparent(headers),
    serviceName,
});

export const injectObservabilityHeaders = (headers?: Record<string, string>): Record<string, string> => {
    const target: Record<string, string> = { ...(headers ?? {}) };

    if (!target[CORRELATION_HEADER] || !isValidCorrelationId(target[CORRELATION_HEADER])) {
        target[CORRELATION_HEADER] = getCorrelationId();
    }

    if (!target[TRACEPARENT_HEADER] || !isValidTraceparent(target[TRACEPARENT_HEADER])) {
        target[TRACEPARENT_HEADER] = getTraceContext();
    }

    propagation.inject(otelContext.active(), target);

    if (!target[TRACEPARENT_HEADER] || !isValidTraceparent(target[TRACEPARENT_HEADER])) {
        target[TRACEPARENT_HEADER] = getTraceContext();
    }

    return target;
};

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
            traceId: getTraceId(),
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

const operationCounter = getOrCreateMetric(
    'operations_total',
    () =>
        new Counter({
            name: 'operations_total',
            help: 'Total meaningful business or system operations processed.',
            labelNames: ['service', 'operation', 'outcome'] as const,
        })
);

const operationErrorCounter = getOrCreateMetric(
    'operation_errors_total',
    () =>
        new Counter({
            name: 'operation_errors_total',
            help: 'Total failed meaningful business or system operations.',
            labelNames: ['service', 'operation'] as const,
        })
);

const operationDuration = getOrCreateMetric(
    'operation_duration_seconds',
    () =>
        new Histogram({
            name: 'operation_duration_seconds',
            help: 'Duration of meaningful business or system operations.',
            labelNames: ['service', 'operation', 'outcome'] as const,
            buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
        })
);

const dependencyCounter = getOrCreateMetric(
    'dependency_calls_total',
    () =>
        new Counter({
            name: 'dependency_calls_total',
            help: 'Total dependency calls.',
            labelNames: ['service', 'dependency', 'operation', 'outcome'] as const,
        })
);

const dependencyDuration = getOrCreateMetric(
    'dependency_call_duration_seconds',
    () =>
        new Histogram({
            name: 'dependency_call_duration_seconds',
            help: 'Duration of dependency calls.',
            labelNames: ['service', 'dependency', 'operation', 'outcome'] as const,
            buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
        })
);

const totalsByLabel = new Map<string, { total: number; errors: number }>();

const normalizeTelemetryLabel = (value: string, fallback: string): string => {
    const normalized = value
        .trim()
        .toLowerCase()
        .replace(/\{[^}]+}/g, 'param')
        .replace(/:[a-z0-9_-]+/g, 'param')
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi, 'id')
        .replace(/\d+/g, 'n')
        .replace(/[^a-z0-9._/-]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^[^a-z]+/, '')
        .replace(/[^a-z0-9]+$/, '');

    if (!normalized || !NORMALIZED_LABEL_PATTERN.test(normalized)) {
        return fallback;
    }

    return normalized;
};

const normalizeAttributes = (metadata?: TelemetryMetadata): Attributes => {
    const attributes: Attributes = {};

    Object.entries(metadata?.attributes ?? {}).forEach(([key, value]) => {
        if (value !== undefined) {
            attributes[normalizeTelemetryLabel(key, 'attribute')] = value;
        }
    });

    return attributes;
};

const routeLabel = (request: FastifyRequest): string =>
    normalizeTelemetryLabel(request.routeOptions.url ?? request.url.split('?')[0], 'unknown_route');

const setContextHeaders = (reply: FastifyReply, context: ObservabilityContext): void => {
    reply.header(CORRELATION_HEADER, context.correlationId);
    reply.header(TRACEPARENT_HEADER, context.traceparent);
};

const getTracer = () => trace.getTracer('@forgekit/shared-observability');

const markSpanError = (span: Span, error: unknown): void => {
    span.recordException(error instanceof Error ? error : new Error(String(error)));
    span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
    });
};

const observeOperationMetrics = (name: string, outcome: 'success' | 'error', durationSeconds: number): void => {
    const service = getObservabilityContext()?.serviceName ?? configuredServiceName;
    operationCounter.inc({ service, operation: name, outcome });
    operationDuration.observe({ service, operation: name, outcome }, durationSeconds);

    if (outcome === 'error') {
        operationErrorCounter.inc({ service, operation: name });
    }
};

const observeDependencyMetrics = (
    dependency: string,
    operation: string,
    outcome: 'success' | 'error',
    durationSeconds: number
): void => {
    const service = getObservabilityContext()?.serviceName ?? configuredServiceName;
    dependencyCounter.inc({ service, dependency, operation, outcome });
    dependencyDuration.observe({ service, dependency, operation, outcome }, durationSeconds);
};

const withTelemetry = <T>(
    name: string,
    metadata: TelemetryMetadata | undefined,
    kind: SpanKind,
    observe: (normalizedName: string, outcome: 'success' | 'error', durationSeconds: number) => void,
    callback: () => T
): T => {
    const normalizedName = normalizeTelemetryLabel(name, 'operation');
    const startedAt = process.hrtime.bigint();
    const attributes = {
        ...normalizeAttributes(metadata),
        'service.name': getObservabilityContext()?.serviceName ?? configuredServiceName,
        correlation_id: getCorrelationId(),
    };

    return getTracer().startActiveSpan(normalizedName, { kind, attributes }, (span) => {
        const complete = (outcome: 'success' | 'error', error?: unknown): void => {
            const durationSeconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000_000;
            span.setAttribute('outcome', outcome);

            if (error) {
                markSpanError(span, error);
            } else {
                span.setStatus({ code: SpanStatusCode.OK });
            }

            observe(normalizedName, outcome, durationSeconds);
            span.end();
        };

        try {
            const result = callback();

            if (result instanceof Promise) {
                return result.then(
                    (value) => {
                        complete('success');
                        return value;
                    },
                    (error: unknown) => {
                        complete('error', error);
                        throw error;
                    }
                ) as T;
            }

            complete('success');
            return result;
        } catch (error) {
            complete('error', error);
            throw error;
        }
    });
};

export const withOperationTelemetry = <T>(
    name: string,
    metadata: TelemetryMetadata | undefined,
    callback: () => T
): T => withTelemetry(name, metadata, SpanKind.INTERNAL, observeOperationMetrics, callback);

export const withDependencyTelemetry = <T>(
    dependency: string,
    metadata: TelemetryMetadata | undefined,
    callback: () => T
): T => {
    const normalizedDependency = normalizeTelemetryLabel(dependency, 'dependency');
    const operation = normalizeTelemetryLabel(metadata?.operation ?? dependency, 'operation');

    return withTelemetry(
        `${normalizedDependency}/${operation}`,
        { ...metadata, dependency: normalizedDependency, operation },
        SpanKind.CLIENT,
        (_name, outcome, durationSeconds) =>
            observeDependencyMetrics(normalizedDependency, operation, outcome, durationSeconds),
        callback
    );
};

export const withMessageTelemetry = <T>(
    name: string,
    metadata: TelemetryMetadata | undefined,
    callback: () => T
): T => withTelemetry(name, metadata, SpanKind.CONSUMER, observeOperationMetrics, callback);

export const observabilityPlugin = fp(
    async (fastify: FastifyInstance, options: ObservabilityPluginOptions): Promise<void> => {
        configureObservability({ serviceName: options.serviceName });

        if (!defaultMetricsStarted) {
            collectDefaultMetrics({ register: registry, prefix: 'forgekit_' });
            defaultMetricsStarted = true;
        }

        fastify.addHook('onRequest', (request, reply, done) => {
            const context = extractObservabilityContextFromHeaders(request.headers, options.serviceName);
            const carrier = {
                [TRACEPARENT_HEADER]: context.traceparent,
            };
            const parentContext = propagation.extract(otelContext.active(), carrier);
            const span = getTracer().startSpan(
                `http ${request.method} ${request.url.split('?')[0]}`,
                {
                    kind: SpanKind.SERVER,
                    attributes: {
                        'service.name': options.serviceName,
                        'http.method': request.method,
                        'http.route': request.url.split('?')[0],
                        correlation_id: context.correlationId,
                    },
                },
                parentContext
            );
            const activeContext = trace.setSpan(parentContext, span);
            const activeTraceparent = serializeSpanContext(span) ?? context.traceparent;

            requestSpanStorage.set(request, span);
            requestOtelContextStorage.set(request, activeContext);
            request.headers[CORRELATION_HEADER] = context.correlationId;
            request.headers[TRACEPARENT_HEADER] = activeTraceparent;

            const activeObservabilityContext = {
                ...context,
                traceparent: activeTraceparent,
            };

            setContextHeaders(reply, activeObservabilityContext);

            otelContext.with(activeContext, () => {
                contextStorage.run(activeObservabilityContext, done);
            });
        });

        fastify.addHook('onError', async (request, _reply, error) => {
            const span = requestSpanStorage.get(request);

            if (span) {
                markSpanError(span, error);
            }
        });

        fastify.addHook('onResponse', async (request, reply) => {
            const activeContext = requestOtelContextStorage.get(request) ?? otelContext.active();

            return otelContext.with(activeContext, () => {
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

                const span = requestSpanStorage.get(request);
                if (span) {
                    span.setAttribute('http.route', route);
                    span.setAttribute('http.status_code', reply.statusCode);
                    span.setAttribute('outcome', outcome);
                    span.setStatus({ code: reply.statusCode >= 500 ? SpanStatusCode.ERROR : SpanStatusCode.OK });
                    span.end();
                }

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
        });

        fastify.get('/metrics', async (_, reply) => {
            reply.header('content-type', registry.contentType);
            return registry.metrics();
        });
    },
    { name: 'forgekit-observability' }
);

export const healthPlugin = fp(
    async (fastify: FastifyInstance, options: HealthPluginOptions = {}): Promise<void> => {
        const readinessChecks = options.readinessChecks ?? [];

        fastify.get('/health/live', async () => ({
            status: 'OK',
            serviceName: options.serviceName ?? configuredServiceName,
        }));

        fastify.get('/health/ready', async (_, reply) => {
            const dependencies = await Promise.all(
                readinessChecks.map(async (readinessCheck) => {
                    const dependencyName = normalizeTelemetryLabel(readinessCheck.name, 'dependency');

                    try {
                        const result = await withDependencyTelemetry(
                            dependencyName,
                            { operation: 'health.ready' },
                            readinessCheck.check
                        );
                        return { name: dependencyName, ready: result !== false };
                    } catch {
                        return { name: dependencyName, ready: false };
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
    },
    { name: 'forgekit-health' }
);

const classifyError = (statusCode: number): ErrorClassification => {
    if (statusCode === 401 || statusCode === 403) {
        return 'auth';
    }

    if (statusCode >= 500) {
        return 'unexpected';
    }

    return 'validation';
};

export const observabilityErrorHandlerPlugin = fp(
    async (fastify: FastifyInstance): Promise<void> => {
        fastify.setErrorHandler((error, request, reply) => {
            const statusCode = typeof error.statusCode === 'number' && error.statusCode >= 400 ? error.statusCode : 500;
            const classification = classifyError(statusCode);
            const correlationId = getCorrelationId();
            const traceId = getTraceId();
            const message = statusCode >= 500 ? 'Unexpected internal error' : error.message;

            logger.error(
                {
                    err: error,
                    statusCode,
                    classification,
                    method: request.method,
                    route: routeLabel(request),
                },
                'Request failed'
            );

            reply.status(statusCode).send({
                code: classification === 'unexpected' ? 'INTERNAL_ERROR' : classification.toUpperCase(),
                message,
                correlationId,
                traceId,
            });
        });
    },
    { name: 'forgekit-observability-error-handler' }
);
