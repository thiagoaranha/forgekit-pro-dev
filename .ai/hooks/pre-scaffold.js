#!/usr/bin/env node
// @ts-check

/**
 * Hook: pre-scaffold.js
 *
 * Pre-flight checklist that runs before scaffolding a new service.
 * Validates naming, port availability, and reminds the developer of manual
 * post-scaffold steps that the scaffold script does NOT handle automatically.
 *
 * Usage:
 *   node .ai/hooks/pre-scaffold.js <service-name> <port>
 *
 * Example:
 *   node .ai/hooks/pre-scaffold.js billing-service 3002
 *
 * Exit codes:
 *   0 — All checks passed (or only warnings). Safe to scaffold.
 *   1 — Blocking error. Do not proceed.
 *
 * References:
 *   - AGENTS.md (Gotchas Likely To Waste Time)
 *   - .ai/rules/service-architecture.md
 *   - .ai/agents/scaffold-assistant.md
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const KEBAB_CASE_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const MIN_PORT = 3000;
const MAX_PORT = 65535;
const RESERVED_PORTS = [3000]; // Gateway port — never use this for a service.

const WORKSPACE_ROOT = resolve(import.meta.dirname, '..', '..');
const SERVICES_DIR = join(WORKSPACE_ROOT, 'apps', 'services');
const DOCKER_COMPOSE_PATH = join(WORKSPACE_ROOT, 'infra', 'docker-compose.yml');

/**
 * Checks performed before scaffolding:
 * @typedef {{ level: 'error' | 'warn' | 'info'; message: string }} CheckResult
 */

/**
 * Validates that the service name follows kebab-case convention.
 *
 * @param {string} name - The proposed service name.
 * @returns {CheckResult}
 */
function validateServiceName(name) {
  if (!KEBAB_CASE_PATTERN.test(name)) {
    return {
      level: 'error',
      message: `Service name "${name}" is invalid. Must be kebab-case (e.g., "billing-service", "user-auth").`,
    };
  }
  return { level: 'info', message: `Service name "${name}" follows kebab-case convention. ✅` };
}

/**
 * Checks that the service name is not already taken.
 *
 * @param {string} name - The proposed service name.
 * @returns {CheckResult}
 */
function checkServiceNameAvailability(name) {
  if (!existsSync(SERVICES_DIR)) {
    return { level: 'info', message: 'Services directory not found — skipping availability check.' };
  }

  const existingServices = readdirSync(SERVICES_DIR);
  if (existingServices.includes(name)) {
    return {
      level: 'error',
      message: `A service named "${name}" already exists at apps/services/${name}. Choose a different name.`,
    };
  }

  return { level: 'info', message: `Service name "${name}" is available. ✅` };
}

/**
 * Validates the port number and checks if it is already in use in docker-compose.
 *
 * @param {number} port - The proposed port number.
 * @returns {CheckResult}
 */
function validatePort(port) {
  if (isNaN(port) || port < MIN_PORT || port > MAX_PORT) {
    return {
      level: 'error',
      message: `Port ${port} is out of the valid range (${MIN_PORT}–${MAX_PORT}).`,
    };
  }

  if (RESERVED_PORTS.includes(port)) {
    return {
      level: 'error',
      message: `Port ${port} is reserved (used by the Gateway). Choose a different port.`,
    };
  }

  if (!existsSync(DOCKER_COMPOSE_PATH)) {
    return {
      level: 'warn',
      message: `docker-compose.yml not found at expected path. Could not verify port availability.`,
    };
  }

  const dockerComposeContent = readFileSync(DOCKER_COMPOSE_PATH, 'utf8');
  const portPattern = new RegExp(`["\']?${port}:${port}["\']?|["\']?\\d+:${port}["\']?`);

  if (portPattern.test(dockerComposeContent)) {
    return {
      level: 'error',
      message: `Port ${port} is already assigned in infra/docker-compose.yml. Choose an unused port.`,
    };
  }

  return { level: 'info', message: `Port ${port} appears to be available. ✅` };
}

/**
 * Prints a formatted check result line.
 *
 * @param {CheckResult} result
 */
function printResult(result) {
  const icons = { error: '❌', warn: '⚠️ ', info: '✅' };
  const icon = icons[result.level];
  console.log(`  ${icon} ${result.message}`);
}

/**
 * Prints the mandatory post-scaffold reminder checklist.
 *
 * @param {string} serviceName
 * @param {number} port
 */
function printPostScaffoldReminder(serviceName, port) {
  console.log(`
────────────────────────────────────────────────────────
📋 POST-SCAFFOLD MANUAL STEPS (the scaffold script does NOT do these)
────────────────────────────────────────────────────────

After running \`pnpm scaffold ${serviceName}\`, you MUST manually:

  1. [ ] Register the route in the Gateway:
         apps/gateway/src/index.ts → add proxy for /api/${serviceName}/*

  2. [ ] Add service to Docker Compose:
         infra/docker-compose.yml → add container on port ${port}

  3. [ ] Document env variables:
         apps/services/${serviceName}/.env.example

  4. [ ] Update AGENTS.md:
         Add new service (port ${port}) to "Architecture Reality" section.

  5. [ ] If using Prisma, run:
         pnpm --filter ${serviceName} db:generate
         pnpm --filter ${serviceName} db:push

  💡 Tip: Use the Scaffold Assistant agent for guided step-by-step help.
         Say: "Act as scaffold assistant, I want to add ${serviceName} on port ${port}"
────────────────────────────────────────────────────────
`);
}

// --- Main ---

const [serviceName, portArg] = process.argv.slice(2);

if (!serviceName || !portArg) {
  console.error('❌ Usage: node .ai/hooks/pre-scaffold.js <service-name> <port>');
  console.error('   Example: node .ai/hooks/pre-scaffold.js billing-service 3002');
  process.exit(1);
}

const port = parseInt(portArg, 10);

console.log(`\n🔍 ForgeKit Pre-Scaffold Check: "${serviceName}" on port ${port}\n`);

const results = [
  validateServiceName(serviceName),
  checkServiceNameAvailability(serviceName),
  validatePort(port),
];

let hasErrors = false;

for (const result of results) {
  printResult(result);
  if (result.level === 'error') hasErrors = true;
}

if (hasErrors) {
  console.error('\n❌ Pre-scaffold check FAILED. Fix the errors above before proceeding.\n');
  process.exit(1);
}

console.log('\n✅ All pre-scaffold checks passed. Safe to run: pnpm scaffold ' + serviceName);
printPostScaffoldReminder(serviceName, port);
process.exit(0);
