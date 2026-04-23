const { detectCompose, ensureDockerRunning, runCompose } = require('./compose');

function main() {
  ensureDockerRunning();
  const compose = detectCompose();
  runCompose(compose, ['down']);
}

try {
  main();
} catch (error) {
  console.error(`ERROR: ${error.message}`);
  process.exit(1);
}
