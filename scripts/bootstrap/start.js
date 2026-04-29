const { detectCompose, ensureDockerRunning, runCompose } = require('./compose');

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForGatewayHealth() {
  const maxRetries = 10;

  for (let retryCount = 1; retryCount <= maxRetries; retryCount += 1) {
    await sleep(3000);

    try {
      const response = await fetch('http://localhost:3000/health/live');
      if (response.ok) {
        const body = await response.json();
        if (body.status === 'OK') {
          return true;
        }
      }
    } catch {
      // Not ready yet.
    }

    console.log(`   Waiting... (${retryCount}/${maxRetries})`);
  }

  return false;
}

async function main() {
  console.log('===========================');
  console.log('   ForgeKit Bootstrap      ');
  console.log('===========================');

  ensureDockerRunning();
  const compose = detectCompose();

  console.log('\n[1/4] Starting infrastructure and services via Docker Compose...');
  runCompose(compose, ['down']);
  runCompose(compose, ['up', '-d', '--build']);

  console.log('\n[2/4] Synchronizing database schemas...');
  runCompose(compose, ['exec', '-T', 'example-service', 'npx', 'prisma', 'db', 'push', '--accept-data-loss']);

  console.log('\n[3/4] Waiting for Gateway to report healthy...');
  const healthy = await waitForGatewayHealth();

  if (!healthy) {
    console.error('\nERROR: Gateway failed to report healthy within timeout.');
    console.error('Run docker compose -f infra/compose/docker-compose.yml logs to debug.');
    process.exit(1);
  }

  console.log('\n[4/4] System is running!');
  console.log('Gateway: http://localhost:3000');
  console.log('Example Service: http://localhost:3001');
  console.log('PostgreSQL: localhost:5432');
  console.log('RabbitMQ Mgmt: http://localhost:15672 (forgekit:secret)');
  console.log('test-service: http://localhost:3002');
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
});
