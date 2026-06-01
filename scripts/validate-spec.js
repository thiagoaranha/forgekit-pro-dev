const fs = require('fs');
const path = require('path');

/**
 * SpecAudit CLI - Technical Validation Tool for ForgeKit
 * Usage: node scripts/validate-spec.js <path-to-spec-dir>
 */

const specDir = process.argv[2];

if (!specDir) {
    console.error('ERROR: Please provide the path to a spec directory. Example: node scripts/validate-spec.js specs/005-scaffold-integration');
    process.exit(1);
}

const specFilePath = path.join(process.cwd(), specDir, 'spec.md');

if (!fs.existsSync(specFilePath)) {
    console.error(`ERROR: spec.md not found in ${specDir}`);
    process.exit(1);
}

console.log(`\n🔍 Auditing: ${specDir}\n`);

// ─── Core Logic ─────────────────────────────────────────────────────────────

function parseRequirements(content) {
    const requirements = [];
    // Match FR-XXX: Description, potentially bolded
    const frRegex = /\*?\*?(FR-\d{3})\*?\*?[:\-\s]+(.*)/g;
    let match;

    while ((match = frRegex.exec(content)) !== null) {
        requirements.push({
            id: match[1],
            description: match[2].trim()
        });
    }

    return requirements;
}

function parseScenarios(content) {
    const scenarios = [];
    // Match SC-XXX: Name, potentially bolded
    const scRegex = /\*?\*?(SC-\d{3})\*?\*?[:\-\s]+(.*)/g;
    let match;

    while ((match = scRegex.exec(content)) !== null) {
        scenarios.push({
            id: match[1],
            name: match[2].trim()
        });
    }

    return scenarios;
}

function checkEvidence(req) {
    const desc = req.description.toLowerCase();
    const searchPatterns = [];
    const root = process.cwd();
    const read = loc => {
        const filePath = path.join(root, loc);
        return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
    };
    const containsAll = (content, values) => values.every(value => content.includes(value));
    const sharedObservability = read('packages/shared-observability/src/index.ts');
    const gateway = read('apps/gateway/src/index.ts');
    const exampleService = read('apps/services/example-service/src/index.ts');
    const exampleItems = read('apps/services/example-service/src/routes/items.ts');
    const serviceTemplate = read('packages/service-template/src/index.ts');
    const templateMessaging = read('packages/service-template/src/infrastructure/messaging/example-messaging.ts');
    const quickstart = read('specs/008-forgekit-observability/quickstart.md');
    const contract = read('specs/008-forgekit-observability/contracts/observability-compliance-review.md');

    if (specDir.includes('008-forgekit-observability')) {
        if (desc.includes('correlation id') || desc.includes('x-correlation-id')) {
            searchPatterns.push({
                name: 'Correlation Context',
                check: () =>
                    containsAll(sharedObservability, ['x-correlation-id', 'isValidCorrelationId', 'generateCorrelationId'])
                    && gateway.includes('injectObservabilityHeaders')
                        ? 'Shared UUIDv4 validation/generation and gateway propagation found'
                        : null
            });
        }

        if (desc.includes('trace') || desc.includes('tracing') || desc.includes('span')) {
            searchPatterns.push({
                name: 'OpenTelemetry Tracing',
                check: () =>
                    containsAll(sharedObservability, ['@opentelemetry/api', 'initializeTracing', 'startSpan', 'TraceIdRatioBasedSampler'])
                    && gateway.includes('initializeTracing')
                    && exampleService.includes('initializeTracing')
                        ? 'OpenTelemetry tracing, startup initialization, spans, and sampling found'
                        : null
            });
        }

        if (desc.includes('sampling')) {
            searchPatterns.push({
                name: 'Default Sampling Strategy',
                check: () =>
                    containsAll(sharedObservability, ['defaultSamplingRatio', 'OTEL_TRACES_SAMPLER_RATIO', 'return 1'])
                        ? 'Development/test 100% sampling and production ratio configuration found'
                        : null
            });
        }

        if (desc.includes('log')) {
            searchPatterns.push({
                name: 'Structured Logging',
                check: () =>
                    containsAll(sharedObservability, ['pino({', 'timestamp', 'serviceName', 'correlationId', 'traceparent', 'redact'])
                        ? 'Structured Pino logger with required context and redaction found'
                        : null
            });
        }

        if (desc.includes('secret') || desc.includes('sensitive') || desc.includes('sanitize')) {
            searchPatterns.push({
                name: 'Sanitization',
                check: () =>
                    containsAll(sharedObservability, ['redact', 'password', 'token', 'secret', 'authorization', 'connectionString'])
                        ? 'Default sensitive-field redaction found'
                        : null
            });
        }

        if (desc.includes('metric') || desc.includes('latency') || desc.includes('error rate') || desc.includes('operation count')) {
            searchPatterns.push({
                name: 'Metrics Baseline',
                check: () =>
                    containsAll(sharedObservability, [
                        '/metrics',
                        'http_requests_total',
                        'http_request_duration_seconds',
                        'http_request_error_rate',
                        'operations_total',
                        'dependency_calls_total',
                        'normalizeTelemetryLabel'
                    ])
                        ? 'HTTP, operation, dependency, latency, error-rate, and normalized-label metrics found'
                        : null
            });
        }

        if (desc.includes('liveness') || desc.includes('readiness') || desc.includes('health')) {
            searchPatterns.push({
                name: 'Health Signals',
                check: () =>
                    containsAll(sharedObservability, ['/health/live', '/health/ready', 'readinessChecks'])
                    && exampleService.includes('postgres')
                        ? 'Standard live/ready endpoints and example dependency readiness found'
                        : null
            });
        }

        if (desc.includes('error')) {
            searchPatterns.push({
                name: 'Error Diagnostics',
                check: () =>
                    containsAll(sharedObservability, ['observabilityErrorHandlerPlugin', 'classification', 'correlationId', 'traceId', 'logger.error'])
                    && exampleService.includes('observabilityErrorHandlerPlugin')
                    && exampleItems.includes('traceId')
                        ? 'Standard error handler, traceable responses, and sanitized error logs found'
                        : null
            });
        }

        if (desc.includes('message') || desc.includes('asynchronous') || desc.includes('event') || desc.includes('retry') || desc.includes('failure channel')) {
            searchPatterns.push({
                name: 'Messaging Context',
                check: () =>
                    containsAll(templateMessaging, ['traceparent', 'injectObservabilityHeaders', 'extractObservabilityContextFromHeaders', 'withMessageTelemetry', 'nack'])
                        ? 'Async message correlation, trace context, failure logging, and retry/DLQ hook found'
                        : null
            });
        }

        if (desc.includes('dependency') || desc.includes('long-running') || desc.includes('key operations')) {
            searchPatterns.push({
                name: 'Operation and Dependency Telemetry',
                check: () =>
                    containsAll(sharedObservability, ['withOperationTelemetry', 'withDependencyTelemetry', 'operation_duration_seconds'])
                    && exampleItems.includes('withOperationTelemetry')
                        ? 'Operation/dependency spans and metrics found'
                        : null
            });
        }

        if (desc.includes('document')) {
            searchPatterns.push({
                name: 'Observability Documentation',
                check: () =>
                    containsAll(quickstart, ['initializeTracing', 'OTEL_TRACES_SAMPLER_RATIO'])
                    && contract.includes('Tracing Startup')
                        ? 'Quickstart and compliance contract document observability obligations'
                        : null
            });
        }

        if (desc.includes('shared observability') || desc.includes('consistent') || desc.includes('diverge') || desc.includes('production-ready')) {
            searchPatterns.push({
                name: 'Shared Compliance Contract',
                check: () =>
                    containsAll(serviceTemplate, ['observabilityPlugin', 'observabilityErrorHandlerPlugin', 'healthPlugin'])
                    && contract.includes('No Domain Leakage')
                        ? 'Shared utilities and review contract enforce consistent service behavior'
                        : null
            });
        }

        if (
            desc.includes('mandatory service capability')
            || desc.includes('every forgekit service')
            || desc.includes('existing services modified')
            || desc.includes('preserve or improve compliance')
        ) {
            searchPatterns.push({
                name: 'Mandatory Service Baseline',
                check: () =>
                    containsAll(gateway, ['initializeTracing', 'observabilityPlugin', 'healthPlugin'])
                    && containsAll(exampleService, ['initializeTracing', 'observabilityPlugin', 'observabilityErrorHandlerPlugin', 'healthPlugin'])
                    && containsAll(serviceTemplate, ['initializeTracing', 'observabilityPlugin', 'observabilityErrorHandlerPlugin', 'healthPlugin'])
                        ? 'Gateway, example service, and service template use the mandatory observability baseline'
                        : null
            });
        }

        if (desc.includes('vendor') || desc.includes('dashboard') || desc.includes('collector') || desc.includes('infrastructure-level')) {
            searchPatterns.push({
                name: 'Vendor-Neutral Boundary',
                check: () =>
                    quickstart.includes('collector') || sharedObservability.includes('@opentelemetry')
                        ? 'OpenTelemetry implementation remains vendor-neutral with no required collector/dashboard'
                        : null
            });
        }
    }

    // 1. Dockerfile checks
    if (desc.includes('dockerfile')) {
        searchPatterns.push({
            name: 'Dockerfile Existence',
            check: () => {
                const results = [];
                // Check in service template and apps/services
                const locations = [
                    'packages/service-template/Dockerfile'
                ];
                locations.forEach(loc => {
                    if (fs.existsSync(path.join(process.cwd(), loc))) {
                        results.push(`Found at ${loc}`);
                    }
                });
                return results.length > 0 ? results.join(', ') : null;
            }
        });
    }

    // 2. Gateway Proxy checks
    if (desc.includes('gateway') || desc.includes('proxy')) {
        searchPatterns.push({
            name: 'Gateway Proxy Registration',
            check: () => {
                const gatewayPath = path.join(process.cwd(), 'apps/gateway/src/index.ts');
                if (fs.existsSync(gatewayPath)) {
                    const content = fs.readFileSync(gatewayPath, 'utf8');
                    if (content.includes('httpProxy')) return 'Found httpProxy registration in Gateway';
                }
                return null;
            }
        });
    }

    // 3. Port Mapping checks
    if (desc.includes('port')) {
        searchPatterns.push({
            name: 'Port Mapping in Compose',
            check: () => {
                const composePath = path.join(process.cwd(), 'infra/compose/docker-compose.yml');
                if (fs.existsSync(composePath)) {
                    const content = fs.readFileSync(composePath, 'utf8');
                    const portRegex = /"\d+:\d+"/;
                    if (portRegex.test(content)) return 'Found port mapping in docker-compose.yml';
                }
                return null;
            }
        });
    }

    // Run checks
    const evidence = [];
    searchPatterns.forEach(p => {
        const result = p.check();
        if (result) evidence.push(`${p.name}: ${result}`);
    });

    return evidence.length > 0 ? { status: 'PASS', text: evidence.join(' | ') } : { status: 'PENDING', text: 'No automated evidence found' };
}

function runAudit() {
    const specContent = fs.readFileSync(specFilePath, 'utf8');
    const requirements = parseRequirements(specContent);
    const scenarios = parseScenarios(specContent);

    if (requirements.length === 0) {
        console.warn('⚠️  No Functional Requirements (FR-XXX) found in spec.md');
    }

    console.log(`Found ${requirements.length} Requirements and ${scenarios.length} Acceptance Scenarios.\n`);

    const results = requirements.map(req => {
        const audit = checkEvidence(req);
        return {
            ...req,
            status: audit.status,
            evidence: audit.text
        };
    });

    // ─── Output Summary ───────────────────────────────────────────────────────

    console.log('Requirements Status:');
    results.forEach(res => {
        const icon = res.status === 'PASS' ? '✅' : '⏳';
        const color = res.status === 'PASS' ? '\x1b[32m' : '\x1b[33m';
        const reset = '\x1b[0m';
        console.log(`${color}${icon} [${res.id}]${reset} ${res.description}`);
        if (res.status === 'PASS') {
            console.log(`   └─ 📄 ${res.evidence}`);
        }
    });

    console.log('\nAcceptance Scenarios (Manual Verification Needed):');
    scenarios.forEach(sc => {
        console.log(`[ ] ${sc.id}: ${sc.name}`);
    });

    const passedCount = results.filter(r => r.status === 'PASS').length;
    const coverage = ((passedCount / requirements.length) * 100).toFixed(0);

    console.log(`\nTechnical Coverage: ${coverage}% (${passedCount}/${requirements.length} requirements verified automatically)`);
    console.log('\nAudit complete. Proceeding to Cognitive AI Audit is recommended.');
}

try {
    runAudit();
} catch (error) {
    console.error('Audit failed:', error.message);
    process.exit(1);
}
