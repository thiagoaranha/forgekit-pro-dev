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

// ─── Configuration Enhancement ───────────────────────────────────────────────

function enhanceServiceConfiguration(targetDir, serviceName, withDatabase, withMessaging) {
    // 1. Update package.json
    const pkgPath = path.join(targetDir, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    
    if (withDatabase) {
        pkg.dependencies = pkg.dependencies || {};
        pkg.dependencies['@prisma/client'] = '^5.12.1';
        pkg.devDependencies = pkg.devDependencies || {};
        pkg.devDependencies['prisma'] = '^5.12.1';
        pkg.scripts = pkg.scripts || {};
        pkg.scripts['db:push'] = 'prisma db push';
        pkg.scripts['db:generate'] = 'prisma generate';
    }
    
    if (withMessaging) {
        pkg.dependencies = pkg.dependencies || {};
        pkg.dependencies['amqplib'] = '^0.10.3';
        pkg.devDependencies = pkg.devDependencies || {};
        pkg.devDependencies['@types/amqplib'] = '^0.10.8';
    }
    
    fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');

    // 2. Adjust Service Config (Optional Database)
    const configPath = path.join(targetDir, 'src/infrastructure/config/service-config.ts');
    if (fs.existsSync(configPath)) {
        let configContent = fs.readFileSync(configPath, 'utf8');
        if (!withDatabase) {
            // Make DATABASE_URL optional in Zod schema
            configContent = configContent.replace(
                'DATABASE_URL: z.string().min(1),',
                'DATABASE_URL: z.string().optional(),'
            );
            fs.writeFileSync(configPath, configContent, 'utf8');
        }
    }

    // 3. Auto-wire Messaging in index.ts and routes
    if (withMessaging) {
        const indexPath = path.join(targetDir, 'src/index.ts');
        if (fs.existsSync(indexPath)) {
            let indexContent = fs.readFileSync(indexPath, 'utf8');
            
            // Add imports
            indexContent = `import amqp from 'amqplib';\nimport { startExampleConsumer } from './infrastructure/messaging/example-messaging';\n` + indexContent;
            
            // Add initialization logic before server.listen
            const listenMarker = 'await server.listen({ port: config.PORT, host: config.HOST });';
            const initLogic = `
        if (config.RABBITMQ_URL) {
            const connection = await amqp.connect(config.RABBITMQ_URL);
            const channel = await connection.createChannel();
            server.decorate('amqpChannel', channel);
            await startExampleConsumer(channel);
        }
        `;
            indexContent = indexContent.replace(listenMarker, initLogic + '\n        ' + listenMarker);
            fs.writeFileSync(indexPath, indexContent, 'utf8');
        }

        const routesPath = path.join(targetDir, 'src/transport/http/routes/example-routes.ts');
        if (fs.existsSync(routesPath)) {
            let routesContent = fs.readFileSync(routesPath, 'utf8');
            routesContent = `import crypto from 'crypto';\nimport { publishExampleEvent } from '../../../infrastructure/messaging/example-messaging';\n` + routesContent;
            
            const returnMarker = 'return {';
            const publishLogic = `
            const channel = (server as any).amqpChannel;
            if (channel) {
                await publishExampleEvent(channel, {
                    id: crypto.randomUUID(),
                    occurredAt: new Date().toISOString(),
                    correlationId
                });
            }
            `;
            routesContent = routesContent.replace(returnMarker, publishLogic + '\n            ' + returnMarker);
            fs.writeFileSync(routesPath, routesContent, 'utf8');
        }
    }

    // 4. Add prisma schema
    if (withDatabase) {
        const prismaDir = path.join(targetDir, 'prisma');
        fs.mkdirSync(prismaDir, { recursive: true });
        const schemaContent = `// This is your Prisma schema file

generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Example {
  id    String @id @default(uuid())
  name  String
}
`;
        fs.writeFileSync(path.join(prismaDir, 'schema.prisma'), schemaContent, 'utf8');
        
        // 3. Update Dockerfile to run db:generate before build
        const dockerfilePath = path.join(targetDir, 'Dockerfile');
        let dockerfileContent = fs.readFileSync(dockerfilePath, 'utf8');
        const buildLine = `RUN pnpm --filter ${serviceName} build`;
        if (dockerfileContent.includes(buildLine)) {
            dockerfileContent = dockerfileContent.replace(
                buildLine, 
                `RUN pnpm --filter ${serviceName} run db:generate\n${buildLine}`
            );
            fs.writeFileSync(dockerfilePath, dockerfileContent, 'utf8');
        }
    }
}

// ─── Docker Compose Injection ─────────────────────────────────────────────────

function buildComposeServiceBlock(serviceName, servicePort, withDatabase, withMessaging) {
    const dbName = serviceName.replace(/-/g, '_') + '_db';
    let envs = `      - NODE_ENV=development\n`;
    let depends = ``;
    
    if (withDatabase) {
        envs += `      - DATABASE_URL=postgresql://forgekit:secret@postgres:5432/${dbName}?schema=public\n`;
        depends += `      postgres:\n        condition: service_healthy\n`;
    }
    if (withMessaging) {
        envs += `      - RABBITMQ_URL=amqp://forgekit:secret@rabbitmq:5672\n`;
        depends += `      rabbitmq:\n        condition: service_healthy\n`;
    }

    let block = `
  ${serviceName}:
    container_name: forgekit-${serviceName}
    build:
      context: ../../
      dockerfile: apps/services/${serviceName}/Dockerfile
    ports:
      - "${servicePort}:${servicePort}"
    environment:
${envs.trimEnd()}`;

    if (depends) {
        block += `\n    depends_on:\n${depends.trimEnd()}`;
    }
    block += `\n    networks:\n      - forgekit-net`;
    return block;
}

function buildGatewayEnvVar(serviceName, servicePort) {
    const envVarName = serviceName.toUpperCase().replace(/-/g, '_') + '_SERVICE_URL';
    return `      - ${envVarName}=http://${serviceName}:${servicePort}`;
}

function injectIntoCompose(composeContent, serviceName, servicePort, withDatabase, withMessaging) {
    const lineEnding = composeContent.includes('\r\n') ? '\r\n' : '\n';
    const le = lineEnding;

    const topLevelPostgresPattern = new RegExp('(' + le.replace('\r', '\\r') + le.replace('\r', '\\r') + ')(  postgres:)');
    if (!topLevelPostgresPattern.test(composeContent)) {
        throw new Error(
            'Cannot inject service into docker-compose.yml: ' +
            'expected top-level "  postgres:" service not found. ' +
            'The file may have been manually restructured.'
        );
    }

    const serviceBlock = buildComposeServiceBlock(serviceName, servicePort, withDatabase, withMessaging)
        .replace(/\n/g, le);
    let updated = composeContent.replace(
        topLevelPostgresPattern,
        le + serviceBlock + '$1$2'
    );

    const gatewayEnvVar = buildGatewayEnvVar(serviceName, servicePort);
    const gatewayDependsOnMarker = '    depends_on:' + le + '      - example-service';

    if (!updated.includes(gatewayDependsOnMarker)) {
        throw new Error(
            'Cannot inject gateway env var into docker-compose.yml: ' +
            'expected gateway depends_on marker not found. ' +
            'The file may have been manually restructured.'
        );
    }

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
      if (request.url.includes('/health/')) return;
      try {
        await request.jwtVerify();
        const user = request.user as any;
        request.headers['x-forgekit-user-id'] = user.sub;
        request.headers['x-forgekit-role'] = user.role;
        Object.assign(request.headers, injectObservabilityHeaders());
      } catch (err) {
        reply.code(401).send({
          error: 'Unauthorized',
          message: 'Valid dev token is required',
          correlationId: getCorrelationId(),
          traceId: getTraceId(),
        });
      }
    }
  });`;
}

function injectIntoGateway(gatewayContent, serviceName, servicePort) {
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

function injectIntoBootstrap(bootstrapContent, serviceName, servicePort, withDatabase) {
    let updated = bootstrapContent;
    const lastServiceLogMarker = `console.log('RabbitMQ Mgmt: http://localhost:15672 (forgekit:secret)');`;
    
    if (updated.includes(lastServiceLogMarker)) {
        const newLogLine = `  console.log('${serviceName}: http://localhost:${servicePort}');`;
        updated = updated.replace(lastServiceLogMarker, lastServiceLogMarker + '\n' + newLogLine);
    }

    if (withDatabase) {
        const dbPushMarker = `runCompose(compose, ['exec', '-T', 'example-service', 'npx', 'prisma', 'db', 'push', '--accept-data-loss']);`;
        if (updated.includes(dbPushMarker)) {
            const newDbPushLine = `  runCompose(compose, ['exec', '-T', '${serviceName}', 'npx', 'prisma', 'db', 'push', '--accept-data-loss']);`;
            updated = updated.replace(dbPushMarker, dbPushMarker + '\n' + newDbPushLine);
        }
    }
    
    return updated !== bootstrapContent ? updated : null;
}

// ─── Atomic Rollback ─────────────────────────────────────────────────────────

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
            }
        }

        if (this._createdDir && fs.existsSync(this._createdDir)) {
            try {
                fs.rmSync(this._createdDir, { recursive: true, force: true });
            } catch (_) {
            }
        }
    }
}

// ─── Entry Point ─────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const serviceName = args.find(a => !a.startsWith('--'));
const withDatabase = args.includes('--with-database');
const withMessaging = args.includes('--with-messaging');

if (!serviceName) {
    console.error('ERROR: You must provide a service name. Example: pnpm scaffold my-new-service [--with-database] [--with-messaging]');
    process.exit(1);
}

const targetDir = path.join(SERVICES_DIR, serviceName);
const rollback = new RollbackTracker();

try {
    validateServiceName(serviceName);

    if (fs.existsSync(targetDir)) {
        console.error(`ERROR: Service ${serviceName} already exists at apps/services/${serviceName}`);
        process.exit(1);
    }

    assertTemplateStructure();

    const composeContent = fs.readFileSync(COMPOSE_FILE_PATH, 'utf8');
    const gatewayContent = fs.readFileSync(GATEWAY_INDEX_PATH, 'utf8');
    let bootstrapContent = null;
    try {
        bootstrapContent = fs.readFileSync(BOOTSTRAP_SCRIPT_PATH, 'utf8');
    } catch (_) {}

    const servicePort = allocatePort(composeContent);

    rollback.backupFile(COMPOSE_FILE_PATH);
    rollback.backupFile(GATEWAY_INDEX_PATH);
    if (bootstrapContent !== null) rollback.backupFile(BOOTSTRAP_SCRIPT_PATH);

    fs.cpSync(TEMPLATE_DIR, targetDir, {
        recursive: true,
        filter: (sourcePath) => shouldCopy(sourcePath),
    });
    rollback.setCreatedDir(targetDir);

    applyPlaceholdersToDirectory(targetDir, serviceName, servicePort);
    assertNoRemainingPlaceholders(targetDir);
    assertGeneratedStructure(targetDir, serviceName);

    // ZERO-CONFIG ENHANCEMENTS
    enhanceServiceConfiguration(targetDir, serviceName, withDatabase, withMessaging);

    const updatedCompose = injectIntoCompose(composeContent, serviceName, servicePort, withDatabase, withMessaging);
    fs.writeFileSync(COMPOSE_FILE_PATH, updatedCompose, 'utf8');

    const updatedGateway = injectIntoGateway(gatewayContent, serviceName, servicePort);
    fs.writeFileSync(GATEWAY_INDEX_PATH, updatedGateway, 'utf8');

    let bootstrapUpdated = false;
    if (bootstrapContent !== null) {
        const updatedBootstrap = injectIntoBootstrap(bootstrapContent, serviceName, servicePort, withDatabase);
        if (updatedBootstrap !== null) {
            fs.writeFileSync(BOOTSTRAP_SCRIPT_PATH, updatedBootstrap, 'utf8');
            bootstrapUpdated = true;
        }
    }

    console.log('\n✓ SUCCESS! Service scaffolded and wired into the ForgeKit ecosystem.\n');
    console.log('FILES CREATED:');
    console.log(`  apps/services/${serviceName}/  (full service directory)`);
    if (withDatabase) console.log(`  apps/services/${serviceName}/prisma/schema.prisma`);
    console.log('\nFILES MODIFIED:');
    console.log(`  infra/compose/docker-compose.yml  (new service block + gateway env var)`);
    console.log(`  apps/gateway/src/index.ts         (proxy route /api/${serviceName}/*)`);
    if (bootstrapUpdated) console.log(`  scripts/bootstrap/start.js        (console output updated)`);

    console.log('\nCONFIGURATION:');
    console.log(`  Service name : ${serviceName}`);
    console.log(`  Allocated port: ${servicePort}`);
    console.log(`  Gateway proxy : /api/${serviceName}/*`);
    console.log(`  Database     : ${withDatabase ? 'Enabled' : 'Disabled'}`);
    console.log(`  Messaging    : ${withMessaging ? 'Enabled' : 'Disabled'}`);

    console.log('\nNEXT STEPS (manual):');
    console.log(`  1. Run 'pnpm install' from the repository root to register the new workspace package.`);
    console.log(`  2. Run 'pnpm boot' to start the full stack — your service will be included.`);
    console.log(`  3. Replace the scaffold example routes in apps/services/${serviceName}/src/transport/http/routes/example-routes.ts`);
    if (withMessaging) {
        console.log(`  4. Replace the scaffold messaging stubs in apps/services/${serviceName}/src/infrastructure/messaging/example-messaging.ts`);
    }
    console.log('');

} catch (error) {
    rollback.rollback();
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\nERROR: Scaffold failed. ${message}`);
    console.error('All changes have been rolled back.\n');
    process.exit(1);
}
