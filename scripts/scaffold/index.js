const fs = require('fs');
const path = require('path');

// ─── Constants ───────────────────────────────────────────────────────────────

const COMPOSE_FILE_PATH = path.join(__dirname, '../../infra/compose/docker-compose.yml');
const GATEWAY_INDEX_PATH = path.join(__dirname, '../../apps/gateway/src/index.ts');
const BOOTSTRAP_SCRIPT_PATH = path.join(__dirname, '../bootstrap/start.js');
const TEMPLATE_DIR = path.join(__dirname, '../../packages/service-template');
const SERVICES_DIR = path.join(__dirname, '../../apps/services');

const EXCLUDED_DIRECTORIES = new Set(['node_modules', 'dist', '.git']);
const EXCLUDED_FILES = new Set(['tsconfig.tsbuildinfo']);
const TEXT_FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.json', '.md', '.yml', '.yaml', '']);

const REQUIRED_TEMPLATE_PATHS = [
    'package.json',
    'Dockerfile',
    'src/index.ts',
    'src/transport',
    'src/application',
    'src/domain',
    'src/infrastructure',
    'src/infrastructure/config/service-config.ts',
    'src/transport/http/error-handler.ts',
    'src/transport/http/routes/health-routes.ts',
    'src/transport/http/routes/metrics-routes.ts',
    'src/transport/http/routes/example-routes.ts',
    'src/infrastructure/messaging/example-messaging.ts',
];

// The minimum port for application services. Gateway is fixed at 3000.
const MIN_APPLICATION_PORT = 3001;

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Validates the service name against allowed naming rules.
 * Must be lowercase alphanumeric + hyphens, 2-50 chars, not starting/ending with hyphen.
 */
function validateServiceName(name) {
    if (!/^[a-z0-9][a-z0-9-]{0,48}[a-z0-9]$/.test(name)) {
        throw new Error(
            `Invalid service name "${name}". ` +
            'Names must be 2-50 lowercase alphanumeric characters or hyphens, ' +
            'and must not start or end with a hyphen.'
        );
    }
}

// ─── Port Allocation ─────────────────────────────────────────────────────────

/**
 * Scans the Docker Compose file to find all host-side port mappings,
 * then returns the next available port starting from MIN_APPLICATION_PORT.
 */
function allocatePort(composeContent) {
    const portPattern = /["']?(\d+):\d+["']?/g;
    const usedPorts = new Set();
    let match;

    while ((match = portPattern.exec(composeContent)) !== null) {
        usedPorts.add(parseInt(match[1], 10));
    }

    let port = MIN_APPLICATION_PORT;
    while (usedPorts.has(port)) {
        port += 1;
    }

    return port;
}

// ─── File Helpers ─────────────────────────────────────────────────────────────

function shouldCopy(sourcePath) {
    const name = path.basename(sourcePath);
    return !EXCLUDED_DIRECTORIES.has(name) && !EXCLUDED_FILES.has(name);
}

function listFilesRecursive(rootPath) {
    const files = [];
    for (const entry of fs.readdirSync(rootPath, { withFileTypes: true })) {
        const fullPath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...listFilesRecursive(fullPath));
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

function replacePlaceholders(content, serviceName, servicePort) {
    return content
        .replace(/\{\{SERVICE_NAME\}\}/g, serviceName)
        .replace(/\{\{SERVICE_PORT\}\}/g, String(servicePort));
}

function applyPlaceholdersToDirectory(rootPath, serviceName, servicePort) {
    for (const filePath of listFilesRecursive(rootPath)) {
        const ext = path.extname(filePath);
        // Dockerfile has no extension — include it via empty string ext check
        if (!TEXT_FILE_EXTENSIONS.has(ext)) continue;

        let content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('{{SERVICE_NAME}}') && !content.includes('{{SERVICE_PORT}}')) continue;

        fs.writeFileSync(filePath, replacePlaceholders(content, serviceName, servicePort), 'utf8');
    }
}

function assertNoRemainingPlaceholders(rootPath) {
    for (const filePath of listFilesRecursive(rootPath)) {
        const ext = path.extname(filePath);
        if (!TEXT_FILE_EXTENSIONS.has(ext)) continue;

        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('{{SERVICE_NAME}}') || content.includes('{{SERVICE_PORT}}')) {
            throw new Error(`Placeholder replacement failed in ${path.relative(rootPath, filePath)}`);
        }
    }
}

// ─── Template Assertions ─────────────────────────────────────────────────────

function assertTemplateStructure() {
    for (const relativePath of REQUIRED_TEMPLATE_PATHS) {
        const absolutePath = path.join(TEMPLATE_DIR, relativePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Template is missing required path: packages/service-template/${relativePath}`);
        }
    }
}

function assertGeneratedStructure(targetDir, serviceName) {
    for (const relativePath of REQUIRED_TEMPLATE_PATHS) {
        const absolutePath = path.join(targetDir, relativePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Generated service is missing required path: apps/services/${serviceName}/${relativePath}`);
        }
    }
}

// ─── Docker Compose Injection ─────────────────────────────────────────────────

/**
 * Derives the Docker-internal hostname for the new service
 * (Docker Compose uses the service key as the hostname on the shared network).
 */
function buildComposeServiceBlock(serviceName, servicePort) {
    const dbName = serviceName.replace(/-/g, '_') + '_db';

    return `
  ${serviceName}:
    build:
      context: ../../
      dockerfile: apps/services/${serviceName}/Dockerfile
    ports:
      - "${servicePort}:${servicePort}"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://forgekit:secret@postgres:5432/${dbName}?schema=public
      - RABBITMQ_URL=amqp://forgekit:secret@rabbitmq:5672
    depends_on:
      postgres:
        condition: service_healthy
      rabbitmq:
        condition: service_healthy
    networks:
      - forgekit-net`;
}

function buildGatewayEnvVar(serviceName, servicePort) {
    const envVarName = serviceName.toUpperCase().replace(/-/g, '_') + '_SERVICE_URL';
    return `      - ${envVarName}=http://${serviceName}:${servicePort}`;
}

function injectIntoCompose(composeContent, serviceName, servicePort) {
    // Detect line endings from the existing file to stay consistent.
    const lineEnding = composeContent.includes('\r\n') ? '\r\n' : '\n';
    const le = lineEnding;

    // Inject service block before the top-level `postgres:` service.
    // We use a regex that matches `postgres:` only when preceded by a blank line
    // (two consecutive line endings), which is how Docker Compose separates top-level services.
    // This avoids matching `postgres:` inside another service's `depends_on` block.
    const topLevelPostgresPattern = new RegExp('(' + le.replace('\r', '\\r') + le.replace('\r', '\\r') + ')(  postgres:)');
    if (!topLevelPostgresPattern.test(composeContent)) {
        throw new Error(
            'Cannot inject service into docker-compose.yml: ' +
            'expected top-level "  postgres:" service not found. ' +
            'The file may have been manually restructured.'
        );
    }

    const serviceBlock = buildComposeServiceBlock(serviceName, servicePort)
        .replace(/\n/g, le);
    let updated = composeContent.replace(
        topLevelPostgresPattern,
        le + serviceBlock + '$1$2'
    );

    // Inject gateway env var into its environment section.
    // The gateway depends_on block uses a simple list (not the condition map).
    const gatewayEnvVar = buildGatewayEnvVar(serviceName, servicePort);

    // Marker: the gateway depends_on block uses a flat list starting with `- example-service`.
    const gatewayDependsOnMarker = '    depends_on:' + le + '      - example-service';

    if (!updated.includes(gatewayDependsOnMarker)) {
        throw new Error(
            'Cannot inject gateway env var into docker-compose.yml: ' +
            'expected gateway depends_on marker not found. ' +
            'The file may have been manually restructured.'
        );
    }

    // Insert env var before depends_on, and add new depends_on entry.
    updated = updated.replace(
        gatewayDependsOnMarker,
        gatewayEnvVar + le +
        '    depends_on:' + le +
        '      - example-service' + le +
        '      - ' + serviceName
    );

    return updated;
}

// ─── Gateway Injection ───────────────────────────────────────────────────────

function buildGatewayProxyBlock(serviceName, servicePort) {
    const envVarName = serviceName.toUpperCase().replace(/-/g, '_') + '_SERVICE_URL';
    const localFallback = `http://localhost:${servicePort}`;

    return `
  // SCAFFOLD EXAMPLE — Proxy for ${serviceName}.
  // Requests to /api/${serviceName}/* are forwarded to the ${serviceName} service.
  server.register(httpProxy, {
    upstream: process.env.${envVarName} || '${localFallback}',
    prefix: '/api/${serviceName}',
    preHandler: async (request, reply) => {
      try {
        await request.jwtVerify();
        const user = request.user as any;
        request.headers['x-forgekit-user-id'] = user.sub;
        request.headers['x-forgekit-role'] = user.role;
        request.headers['x-correlation-id'] = request.headers['x-correlation-id'] || getCorrelationId();
      } catch (err) {
        reply.code(401).send({ error: 'Unauthorized', message: 'Valid dev token is required' });
      }
    }
  });`;
}

function injectIntoGateway(gatewayContent, serviceName, servicePort) {
    // Inject before the closing `return server;` line.
    const returnMarker = '\n  return server;';
    if (!gatewayContent.includes(returnMarker)) {
        throw new Error(
            'Cannot inject proxy into apps/gateway/src/index.ts: ' +
            'expected "return server;" marker not found. ' +
            'The gateway may have been restructured.'
        );
    }

    const proxyBlock = buildGatewayProxyBlock(serviceName, servicePort);
    return gatewayContent.replace(returnMarker, proxyBlock + '\n' + returnMarker);
}

// ─── Bootstrap Script Injection ───────────────────────────────────────────────

function injectIntoBootstrap(bootstrapContent, serviceName, servicePort) {
    // Append new service URL after the last existing console.log service line.
    const lastServiceLogMarker = `console.log('RabbitMQ Mgmt: http://localhost:15672 (forgekit:secret)');`;
    if (!bootstrapContent.includes(lastServiceLogMarker)) {
        // Non-fatal: just return null to indicate manual step is needed.
        return null;
    }

    const newLogLine = `  console.log('${serviceName}: http://localhost:${servicePort}');`;
    return bootstrapContent.replace(lastServiceLogMarker, lastServiceLogMarker + '\n' + newLogLine);
}

// ─── Atomic Rollback ─────────────────────────────────────────────────────────

/**
 * Holds backups of modified files so that any failure can be rolled back.
 */
class RollbackTracker {
    constructor() {
        this._backups = [];
        this._createdDir = null;
    }

    backupFile(filePath) {
        if (fs.existsSync(filePath)) {
            this._backups.push({ filePath, content: fs.readFileSync(filePath, 'utf8') });
        }
    }

    setCreatedDir(dirPath) {
        this._createdDir = dirPath;
    }

    rollback() {
        for (const { filePath, content } of this._backups) {
            try {
                fs.writeFileSync(filePath, content, 'utf8');
            } catch (_) {
                // Best-effort restore.
            }
        }

        if (this._createdDir && fs.existsSync(this._createdDir)) {
            try {
                fs.rmSync(this._createdDir, { recursive: true, force: true });
            } catch (_) {
                // Best-effort cleanup.
            }
        }
    }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

const serviceName = process.argv[2];

if (!serviceName) {
    console.error('ERROR: You must provide a service name. Example: pnpm scaffold my-new-service');
    process.exit(1);
}

const targetDir = path.join(SERVICES_DIR, serviceName);
const rollback = new RollbackTracker();

try {
    // 1. Validate service name.
    validateServiceName(serviceName);

    // 2. Ensure target directory does not already exist.
    if (fs.existsSync(targetDir)) {
        console.error(`ERROR: Service ${serviceName} already exists at apps/services/${serviceName}`);
        process.exit(1);
    }

    // 3. Assert template is intact.
    assertTemplateStructure();

    // 4. Read infrastructure files before modifying anything.
    const composeContent = fs.readFileSync(COMPOSE_FILE_PATH, 'utf8');
    const gatewayContent = fs.readFileSync(GATEWAY_INDEX_PATH, 'utf8');
    let bootstrapContent = null;
    try {
        bootstrapContent = fs.readFileSync(BOOTSTRAP_SCRIPT_PATH, 'utf8');
    } catch (_) {
        // Non-fatal: bootstrap update is optional.
    }

    // 5. Allocate a unique port.
    const servicePort = allocatePort(composeContent);

    // 6. Register backup of all files that will be modified.
    rollback.backupFile(COMPOSE_FILE_PATH);
    rollback.backupFile(GATEWAY_INDEX_PATH);
    if (bootstrapContent !== null) {
        rollback.backupFile(BOOTSTRAP_SCRIPT_PATH);
    }

    // 7. Copy template to target directory.
    fs.cpSync(TEMPLATE_DIR, targetDir, {
        recursive: true,
        filter: (sourcePath) => shouldCopy(sourcePath),
    });
    rollback.setCreatedDir(targetDir);

    // 8. Replace all template placeholders in the new service directory.
    applyPlaceholdersToDirectory(targetDir, serviceName, servicePort);
    assertNoRemainingPlaceholders(targetDir);
    assertGeneratedStructure(targetDir, serviceName);

    // 9. Inject service block and gateway env var into docker-compose.yml.
    const updatedCompose = injectIntoCompose(composeContent, serviceName, servicePort);
    fs.writeFileSync(COMPOSE_FILE_PATH, updatedCompose, 'utf8');

    // 10. Inject proxy registration into gateway/src/index.ts.
    const updatedGateway = injectIntoGateway(gatewayContent, serviceName, servicePort);
    fs.writeFileSync(GATEWAY_INDEX_PATH, updatedGateway, 'utf8');

    // 11. Optionally update bootstrap output.
    let bootstrapUpdated = false;
    if (bootstrapContent !== null) {
        const updatedBootstrap = injectIntoBootstrap(bootstrapContent, serviceName, servicePort);
        if (updatedBootstrap !== null) {
            fs.writeFileSync(BOOTSTRAP_SCRIPT_PATH, updatedBootstrap, 'utf8');
            bootstrapUpdated = true;
        }
    }

    // 12. Print success summary.
    console.log('\n✓ SUCCESS! Service scaffolded and wired into the ForgeKit ecosystem.\n');
    console.log('FILES CREATED:');
    console.log(`  apps/services/${serviceName}/  (full service directory)`);
    console.log('\nFILES MODIFIED:');
    console.log(`  infra/compose/docker-compose.yml  (new service block + gateway env var)`);
    console.log(`  apps/gateway/src/index.ts         (proxy route /api/${serviceName}/*)`);
    if (bootstrapUpdated) {
        console.log(`  scripts/bootstrap/start.js        (console output updated)`);
    }

    console.log('\nCONFIGURATION:');
    console.log(`  Service name : ${serviceName}`);
    console.log(`  Allocated port: ${servicePort}`);
    console.log(`  Gateway proxy : /api/${serviceName}/*`);

    console.log('\nNEXT STEPS (manual):');
    console.log(`  1. Run 'pnpm install' from the repository root to register the new workspace package.`);
    console.log(`  2. Create the PostgreSQL database '${serviceName.replace(/-/g, '_')}_db' if not using the shared instance.`);
    console.log(`  3. Run 'pnpm boot' to start the full stack — your service will be included.`);
    console.log(`  4. Replace the scaffold example routes in apps/services/${serviceName}/src/transport/http/routes/example-routes.ts`);
    console.log(`  5. Replace the scaffold messaging stubs in apps/services/${serviceName}/src/infrastructure/messaging/example-messaging.ts`);
    console.log(`  6. Add domain-specific authorization rules to the gateway proxy preHandler if needed.`);
    if (!bootstrapUpdated) {
        console.log(`  7. Manually add your service URL to scripts/bootstrap/start.js console output.`);
    }
    console.log('');

} catch (error) {
    rollback.rollback();
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nERROR: Scaffold failed. ${message}`);
    console.error('All changes have been rolled back.\n');
    process.exit(1);
}
