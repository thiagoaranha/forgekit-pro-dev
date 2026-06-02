#!/usr/bin/env node
// @ts-check

/**
 * Hook: validate-commit-message.js
 *
 * Validates that a commit message follows the Conventional Commits specification.
 * Exits with code 1 and a descriptive error if the format is invalid.
 *
 * Usage:
 *   node .ai/hooks/validate-commit-message.js "<commit message>"
 *
 * Or as a Git commit-msg hook (optional):
 *   Copy to .git/hooks/commit-msg and make it executable.
 *   The hook will read the commit message file automatically.
 *
 * References:
 *   - specs/004-forgekit-version-control/spec.md
 *   - https://www.conventionalcommits.org/
 */

import { readFileSync } from 'node:fs';

const CONVENTIONAL_COMMIT_PATTERN =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?(!)?: .{1,100}/;

const VALID_TYPES = [
  'feat',
  'fix',
  'docs',
  'style',
  'refactor',
  'perf',
  'test',
  'build',
  'ci',
  'chore',
  'revert',
];

/**
 * Resolves the commit message from either:
 * 1. A command-line argument (direct usage)
 * 2. A file path argument (Git hook usage — receives the commit-msg file path)
 *
 * @returns {string} The commit message to validate.
 */
function resolveCommitMessage() {
  const argument = process.argv[2];

  if (!argument) {
    console.error('❌ Error: No commit message provided.');
    console.error('Usage: node .ai/hooks/validate-commit-message.js "<message>"');
    process.exit(1);
  }

  // If the argument looks like a file path (Git hook passes a file), read it.
  if (argument.endsWith('.txt') || argument.includes('/') || argument.includes('\\')) {
    try {
      return readFileSync(argument, 'utf8').trim();
    } catch {
      // Argument is not a readable file — treat it as the message itself.
    }
  }

  return argument.trim();
}

/**
 * Validates the commit message against the Conventional Commits pattern.
 *
 * @param {string} message - The commit message to validate.
 * @returns {{ valid: boolean; reason?: string }} Validation result.
 */
function validateCommitMessage(message) {
  if (!message || message.length === 0) {
    return { valid: false, reason: 'Commit message cannot be empty.' };
  }

  // Ignore merge commits and automated revert commits.
  if (message.startsWith('Merge ') || message.startsWith("Revert '")) {
    return { valid: true };
  }

  if (!CONVENTIONAL_COMMIT_PATTERN.test(message)) {
    return {
      valid: false,
      reason: `Message does not follow Conventional Commits format.

Expected format:
  <type>(<optional scope>): <description>

Valid types: ${VALID_TYPES.join(', ')}

Examples:
  feat: add user authentication endpoint
  fix(gateway): handle missing correlation ID header
  refactor(shared-observability): extract logger factory
  docs: update AGENTS.md with new service ports
  test(example-service): add integration tests for /items

Your message: "${message}"`,
    };
  }

  if (message.length > 120) {
    return {
      valid: false,
      reason: `Commit message subject line is too long (${message.length} chars). Maximum: 120 characters.`,
    };
  }

  return { valid: true };
}

// --- Main ---

const commitMessage = resolveCommitMessage();
const result = validateCommitMessage(commitMessage);

if (!result.valid) {
  console.error('❌ Commit message validation FAILED\n');
  console.error(result.reason);
  console.error('\nFor more details, see: specs/004-forgekit-version-control/spec.md');
  process.exit(1);
}

console.log('✅ Commit message is valid.');
process.exit(0);
