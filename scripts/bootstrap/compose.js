const { spawnSync } = require('child_process');
const path = require('path');

const composeFile = path.resolve(__dirname, '../../infra/compose/docker-compose.yml');

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    throw result.error;
  }

  return result;
}

function canRun(command, args) {
  const result = spawnSync(command, args, { stdio: 'ignore' });
  return result.status === 0;
}

function detectCompose() {
  if (canRun('docker', ['compose', 'version'])) {
    return { command: 'docker', baseArgs: ['compose'] };
  }

  if (canRun('docker-compose', ['version'])) {
    return { command: 'docker-compose', baseArgs: [] };
  }

  throw new Error(
    'Docker Compose not found. Install Docker Compose plugin (`docker compose`) or docker-compose binary.'
  );
}

function ensureDockerRunning() {
  const result = spawnSync('docker', ['info'], { stdio: 'ignore' });
  if (result.status !== 0) {
    throw new Error('Docker is not running. Please start Docker first.');
  }
}

function runCompose(compose, args) {
  const fullArgs = [...compose.baseArgs, '-f', composeFile, ...args];
  const result = runCommand(compose.command, fullArgs);

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

module.exports = {
  composeFile,
  detectCompose,
  ensureDockerRunning,
  runCompose,
};
