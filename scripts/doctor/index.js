const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');
const readline = require('readline');

const COMPOSE_FILE_PATH = path.join(__dirname, '../../infra/compose/docker-compose.yml');
const GATEWAY_INDEX_PATH = path.join(__dirname, '../../apps/gateway/src/index.ts');

const serviceName = process.argv[2];

if (!serviceName) {
    console.error('ERROR: You must provide a service name. Example: pnpm service:doctor my-new-service');
    process.exit(1);
}

console.log(`\n🩺 ForgeKit Service Doctor: Analyzing '${serviceName}'...\n`);

let hasErrors = false;

function printResult(step, status, message = '', suggestion = '') {
    const icon = status ? '✅' : '❌';
    const color = status ? '\x1b[32m' : '\x1b[31m';
    const reset = '\x1b[0m';
    console.log(`${color}${icon} ${step}${reset}`);
    if (message) console.log(`   └─ ${message}`);
    if (!status && suggestion) {
        console.log(`   └─ 💡 FIX: ${suggestion}`);
        hasErrors = true;
    }
}

function fetchHttp(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, data }));
        });
        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.abort();
            reject(new Error('Timeout'));
        });
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        req.end();
    });
}

async function getDevToken() {
    try {
        const { data } = await fetchHttp('http://localhost:3000/auth/dev-token');
        const { token } = JSON.parse(data);
        return token;
    } catch (e) {
        return null;
    }
}

const patterns = [
    {
        regex: /PrismaClientInitializationError|relation.*does not exist|database.*does not exist/i,
        diagnosis: 'Missing Database Schema or Unreachable DB',
        fixMessage: `Run 'pnpm --filter ${serviceName} run db:push' to sync the schema.`,
        command: `pnpm --filter ${serviceName} run db:push`
    },
    {
        regex: /ECONNREFUSED/i,
        diagnosis: 'Connection Refused (Likely RabbitMQ or Postgres down)',
        fixMessage: `Ensure dependencies are healthy via 'docker compose ps'.`,
        command: null
    },
    {
        regex: /Cannot find module|Cannot resolve module/i,
        diagnosis: 'Missing dependency or build failed',
        fixMessage: `Run 'pnpm install' and 'pnpm --filter ${serviceName} build'.`,
        command: `pnpm install && pnpm --filter ${serviceName} build`
    }
];

function analyzeLogs(containerName) {
    try {
        const logs = execSync(`docker logs ${containerName} --tail 100 2>&1`, { encoding: 'utf8' });
        for (const pattern of patterns) {
            if (pattern.regex.test(logs)) {
                return pattern;
            }
        }
    } catch (e) { }
    return null;
}

async function runDiagnostics() {
    // ─── 0. Detect Capabilities & Auth ──────────────────────────────────────
    const token = await getDevToken();
    const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {};

    let hasDatabase = false;
    let hasMessaging = false;
    try {
        const pkgPath = path.join(__dirname, `../../apps/services/${serviceName}/package.json`);
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        hasDatabase = !!(pkg.dependencies && pkg.dependencies['@prisma/client']);
        hasMessaging = !!(pkg.dependencies && pkg.dependencies['amqplib']);
    } catch (e) {
        // Fallback to true to be safe if package.json is missing (not standard ForgeKit)
        hasDatabase = true;
        hasMessaging = true;
    }

    // ─── 1. Static Checks ───────────────────────────────────────────────────

    // 1.1 Check docker-compose.yml
    let composeContent = '';
    try {
        composeContent = fs.readFileSync(COMPOSE_FILE_PATH, 'utf8');
        const serviceBlockRegex = new RegExp(`^\\s{2}${serviceName}:`, 'm');
        if (serviceBlockRegex.test(composeContent)) {
            const blockStartIndex = composeContent.search(new RegExp(`^  ${serviceName}:`, 'm'));
            const remaining = composeContent.substring(blockStartIndex);
            const nextBlockMatch = remaining.match(/\n  [a-z0-9]/);
            const blockContent = nextBlockMatch ? remaining.substring(0, nextBlockMatch.index) : remaining;

            let configOk = true;
            if (hasDatabase && !blockContent.includes('DATABASE_URL')) {
                printResult(`Compose Config`, false, `Missing DATABASE_URL in '${serviceName}' block`, `Add DATABASE_URL to the service environment in docker-compose.yml`);
                configOk = false;
            }
            if (hasMessaging && !blockContent.includes('RABBITMQ_URL')) {
                printResult(`Compose Config`, false, `Missing RABBITMQ_URL in '${serviceName}' block`, `Add RABBITMQ_URL to the service environment in docker-compose.yml`);
                configOk = false;
            }

            if (configOk) {
                const envs = [];
                if (hasDatabase) envs.push('DATABASE_URL');
                if (hasMessaging) envs.push('RABBITMQ_URL');
                printResult(`Compose Config`, true, `Found required ENVs (${envs.join(', ') || 'None required'})`);
            }
        } else {
            printResult(`Compose Registration`, false, `Service '${serviceName}' not found in docker-compose.yml`, `Run 'pnpm scaffold ${serviceName}' to register the service, or add it manually.`);
        }
    } catch (err) {
        printResult(`Compose Registration`, false, `Could not read docker-compose.yml: ${err.message}`);
    }

    // 1.2 Check Gateway routing
    try {
        const gatewayContent = fs.readFileSync(GATEWAY_INDEX_PATH, 'utf8');
        const proxyRegex = new RegExp(`prefix:\\s*'/api/${serviceName}'`);
        if (proxyRegex.test(gatewayContent)) {
            printResult(`Gateway Routing`, true, `Found proxy route /api/${serviceName} in API Gateway`);
        } else {
            printResult(`Gateway Routing`, false, `Proxy route for /api/${serviceName} not found in gateway`, `Add the httpProxy registration for this service in apps/gateway/src/index.ts.`);
        }
    } catch (err) {
        printResult(`Gateway Routing`, false, `Could not read gateway index.ts`);
    }

    // ─── 2. Runtime Checks ──────────────────────────────────────────────────

    let isContainerRunning = false;
    let actualContainerName = '';
    let isContainerExited = false;
    try {
        // Use 'docker ps -a' to find stopped containers as well
        const psOutput = execSync(`docker ps -a --filter "label=com.docker.compose.service=${serviceName}" --format "{{.Names}}|{{.Status}}"`, { encoding: 'utf8' }).trim();

        if (psOutput) {
            const lines = psOutput.split('\n');
            const [name, status] = lines[0].split('|');
            actualContainerName = name;

            if (status.includes('Up')) {
                isContainerRunning = true;
                printResult(`Container Status`, true, `Container '${name}' is running (${status})`);
            } else {
                isContainerExited = true;
                printResult(`Container Status`, false, `Container '${name}' is not running (${status})`);
            }
        } else {
            printResult(`Container Status`, false, `No container found for service '${serviceName}'`, `Ensure 'pnpm boot' was run and the service is in docker-compose.yml.`);
        }
    } catch (err) {
        printResult(`Container Status`, false, `Docker command failed`, `Ensure Docker is running and accessible.`);
    }

    // ─── Self-Healing (Log Analysis) ────────────────────────────────────────

    if (isContainerExited && actualContainerName) {
        console.log(`\n🔍 Analyzing logs for container '${actualContainerName}'...`);
        const issue = analyzeLogs(actualContainerName);
        if (issue) {
            console.log(`\x1b[31m❌ Detected Issue: ${issue.diagnosis}\x1b[0m`);
            console.log(`   └─ 💡 FIX: ${issue.fixMessage}`);

            if (issue.command) {
                const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
                await new Promise(resolve => {
                    rl.question(`\n❓ Would you like to run the suggested fix now? (y/N): `, (answer) => {
                        if (answer.toLowerCase() === 'y') {
                            console.log(`\n🚀 Running: ${issue.command}...`);
                            try {
                                execSync(issue.command, { stdio: 'inherit', cwd: path.join(__dirname, '../../') });
                                console.log(`\x1b[32m✅ Fix applied.\x1b[0m Try running 'pnpm boot' again.`);
                            } catch (e) {
                                console.log(`\x1b[31m❌ Failed to apply fix.\x1b[0m Run the command manually to see detailed errors.`);
                            }
                        }
                        resolve();
                        rl.close();
                    });
                });
            }
        } else {
            console.log(`   └─ Could not identify a specific error pattern. Run 'docker logs ${actualContainerName}' manually.`);
        }
    }

    if (!isContainerRunning) {
        console.log(`\n⚠️  Skipping network checks because container is down.\n`);
        process.exit(1);
    }

    // ─── 3. Network Checks ──────────────────────────────────────────────────

    try {
        const { statusCode } = await fetchHttp(`http://localhost:3000/api/${serviceName}/health/live`);
        if (statusCode === 200) {
            printResult(`Health Endpoint`, true, `GET /api/${serviceName}/health/live returned 200 OK`);
        } else {
            printResult(`Health Endpoint`, false, `Health endpoint returned status ${statusCode}`, `Check the service logs to see why the health check is failing.`);
        }
    } catch (err) {
        printResult(`Health Endpoint`, false, `Failed to reach health endpoint: ${err.message}`, `Ensure the gateway bypass for health checks is working.`);
    }

    try {
        const { statusCode, data } = await fetchHttp(`http://localhost:3000/api/${serviceName}/items`, { headers: authHeader });
        if (statusCode === 200) {
            printResult(`Sync Endpoint`, true, `GET /api/${serviceName}/items returned 200 OK`);
        } else if (statusCode === 401 || statusCode === 403) {
            printResult(`Sync Endpoint`, false, `Endpoint blocked (returned ${statusCode})`, `The Doctor could not authenticate. Check if the /auth/dev-token endpoint is working.`);
        } else {
            printResult(`Sync Endpoint`, false, `Endpoint returned status ${statusCode}`, `Check the service routes.`);
        }
    } catch (err) {
        printResult(`Sync Endpoint`, false, `Failed to reach sync endpoint: ${err.message}`);
    }

    // Only check messaging if the service actually has the messaging capability
    if (hasMessaging) {
        try {
            await fetchHttp(`http://localhost:3000/api/${serviceName}/items`, { headers: authHeader });
            await new Promise(resolve => setTimeout(resolve, 1500));

            const logs = execSync(`docker logs ${actualContainerName} --tail 100 2>&1`, { encoding: 'utf8' });

            // Look for specific consumption markers, not just general observability strings
            if (logs.includes('event consumed') || logs.includes('Processed') || logs.includes('Handling message')) {
                printResult(`Async Messaging`, true, `Found consumer processing logs`);
            } else {
                printResult(`Async Messaging`, false, `Did not find consumer processing logs recently`, `Check RabbitMQ connectivity or service logs.`);
            }
        } catch (err) {
            printResult(`Async Messaging`, false, `Could not verify async logs: ${err.message}`);
        }
    } else {
        console.log(`\nℹ️  Skipping Async Messaging check (capability not detected in package.json).\n`);
    }

    // ─── Finish ─────────────────────────────────────────────────────────────

    console.log('\n────────────────────────────────────────────────────────────\n');
    if (hasErrors) {
        console.log(`❌ Doctor found issues with '${serviceName}'. Please review the suggestions above.\n`);
        process.exit(1);
    } else {
        console.log(`✅ Service '${serviceName}' is healthy and fully connected!\n`);
        process.exit(0);
    }
}

runDiagnostics();
