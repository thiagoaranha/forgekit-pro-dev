const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const SERVICE_NAME = 'e2e-test-svc';
const ROOT_DIR = path.join(__dirname, '../../');

function runCommand(command, args = [], options = {}) {
    console.log(`\n> Running: ${command} ${args.join(' ')}`);
    const result = spawnSync(command, args, {
        cwd: ROOT_DIR,
        stdio: 'inherit',
        shell: true,
        ...options
    });
    if (result.error) {
        throw result.error;
    }
    return result;
}

async function main() {
    console.log('--- Starting E2E Architecture Test ---');

    // 1. Pre-cleanup
    console.log('\n--- 1. Pre-cleanup ---');
    try {
        runCommand('docker', ['compose', '-f', 'infra/compose/docker-compose.yml', 'down', '--remove-orphans', '--volumes']);
        const serviceDir = path.join(ROOT_DIR, 'apps/services', SERVICE_NAME);
        if (fs.existsSync(serviceDir)) {
            fs.rmSync(serviceDir, { recursive: true, force: true });
        }
    } catch (e) {
        console.error('Error during pre-cleanup', e);
    }

    let success = false;

    try {
        // 2. Generation (Scaffold)
        console.log('\n--- 2. Generation (Scaffold) ---');
        const scaffoldResult = runCommand('pnpm', ['scaffold', SERVICE_NAME, '--with-database', '--with-messaging']);
        if (scaffoldResult.status !== 0) throw new Error('Scaffold failed');

        // 3. Boot (Infra + Build)
        console.log('\n--- 3. Boot (Infra + Build) ---');
        const bootResult = runCommand('pnpm', ['boot']);
        if (bootResult.status !== 0) throw new Error('Boot failed');

        // 4. Validation (Doctor)
        console.log('\n--- 4. Validation (Doctor) ---');
        const doctorResult = runCommand('pnpm', ['service:doctor', SERVICE_NAME]);
        if (doctorResult.status !== 0) throw new Error('Doctor validation failed');

        success = true;
        console.log('\n--- E2E Architecture Test Passed! ---');
    } catch (error) {
        console.error('\n--- E2E Architecture Test Failed! ---');
        console.error(error);
    } finally {
        // 5. Teardown
        console.log('\n--- 5. Teardown (Clean up) ---');
        try {
            // Turn down containers and clean up volumes
            runCommand('docker', ['compose', '-f', 'infra/compose/docker-compose.yml', 'down', '--remove-orphans', '--volumes']);
            
            // Remove the generated folder
            const serviceDir = path.join(ROOT_DIR, 'apps/services', SERVICE_NAME);
            if (fs.existsSync(serviceDir)) {
                fs.rmSync(serviceDir, { recursive: true, force: true });
            }

            // Undo git changes
            runCommand('git', ['checkout', '--', 'infra/compose/docker-compose.yml', 'apps/gateway/src/index.ts', 'scripts/bootstrap/start.js']);
            
        } catch (e) {
            console.error('Error during teardown', e);
        }

        process.exit(success ? 0 : 1);
    }
}

main();
