const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const http = require('http');

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

// Helper for HTTP requests
function fetchHttp(url) {
    return new Promise((resolve, reject) => {
        const req = http.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ statusCode: res.statusCode, data }));
        });
        req.on('error', reject);
        req.setTimeout(5000, () => {
            req.abort();
            reject(new Error('Timeout'));
        });
    });
}

async function runDiagnostics() {
    // ─── 1. Static Checks ───────────────────────────────────────────────────
    
    // 1.1 Check docker-compose.yml
    let composeContent = '';
    try {
        composeContent = fs.readFileSync(COMPOSE_FILE_PATH, 'utf8');
        const serviceBlockRegex = new RegExp(`^\\s{2}${serviceName}:`, 'm');
        if (serviceBlockRegex.test(composeContent)) {
            const blockStartIndex = composeContent.search(new RegExp(`^  ${serviceName}:`, 'm'));
            const remaining = composeContent.substring(blockStartIndex);
            // Find the next line that starts with exactly 2 spaces (next service or top level)
            const nextBlockMatch = remaining.match(/\n  [a-z0-9]/);
            const blockContent = nextBlockMatch ? remaining.substring(0, nextBlockMatch.index) : remaining;
            
            if (!blockContent.includes('DATABASE_URL')) {
                printResult(`Compose Config`, false, `Missing DATABASE_URL in '${serviceName}' block`, `Add DATABASE_URL to the service environment in docker-compose.yml`);
            } else if (!blockContent.includes('RABBITMQ_URL')) {
                printResult(`Compose Config`, false, `Missing RABBITMQ_URL in '${serviceName}' block`, `Add RABBITMQ_URL to the service environment in docker-compose.yml`);
            } else {
                printResult(`Compose Config`, true, `Found required ENVs (DATABASE_URL, RABBITMQ_URL)`);
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
    try {
        // Try to find the container name dynamically using docker ps
        const psOutput = execSync(`docker ps --filter "label=com.docker.compose.service=${serviceName}" --format "{{.Names}}|{{.Status}}"`, { encoding: 'utf8' }).trim();
        
        if (psOutput) {
            const [name, status] = psOutput.split('|');
            actualContainerName = name;
            if (status.includes('Up')) {
                isContainerRunning = true;
                printResult(`Container Status`, true, `Container '${name}' is running (${status})`);
            } else {
                printResult(`Container Status`, false, `Container '${name}' is not running`, `Run 'pnpm boot' to start the docker stack.`);
            }
        } else {
            printResult(`Container Status`, false, `No container found for service '${serviceName}'`, `Run 'pnpm boot' to start the docker stack.`);
        }
    } catch (err) {
        printResult(`Container Status`, false, `Docker command failed`, `Ensure Docker is running and accessible.`);
    }

    // If container isn't running, network checks will definitely fail, so we can skip them to avoid timeouts.
    if (!isContainerRunning) {
        console.log(`\n⚠️  Skipping network checks because container is down.\n`);
        process.exit(1);
    }

    // ─── 3. Network Checks ──────────────────────────────────────────────────

    // 3.1 Health Endpoint Check
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

    // 3.2 Sync Endpoint Check
    try {
        const { statusCode, data } = await fetchHttp(`http://localhost:3000/api/${serviceName}/items`);
        if (statusCode === 200) {
            printResult(`Sync Endpoint`, true, `GET /api/${serviceName}/items returned 200 OK`);
        } else if (statusCode === 401 || statusCode === 403) {
             printResult(`Sync Endpoint`, true, `Endpoint secured (returned ${statusCode}), request reached service.`);
        } else {
            printResult(`Sync Endpoint`, false, `Endpoint returned status ${statusCode}`, `Check the service routes.`);
        }
    } catch (err) {
        printResult(`Sync Endpoint`, false, `Failed to reach sync endpoint: ${err.message}`);
    }

    // 3.3 Async Check (Log sniffing)
    try {
        // Trigger the async flow
        await fetchHttp(`http://localhost:3000/api/${serviceName}/items`);
        
        // Wait for consumer to process
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const logs = execSync(`docker logs ${actualContainerName} --tail 100`, { encoding: 'utf8' });
        if (logs.includes('Processed item_created event') || logs.includes('correlationId') || logs.includes('x-correlation-id')) {
            printResult(`Async Messaging`, true, `Found consumer processing logs`);
        } else {
            printResult(`Async Messaging`, false, `Did not find consumer processing logs recently`, `Check RabbitMQ connectivity or service logs.`);
        }
    } catch (err) {
        printResult(`Async Messaging`, false, `Could not verify async logs: ${err.message}`);
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
