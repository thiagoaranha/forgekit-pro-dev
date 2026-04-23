const fs = require('fs');
const path = require('path');

const serviceName = process.argv[2];
if (!serviceName) {
    console.error('ERROR: You must provide a service name. Example: pnpm scaffold my-new-service');
    process.exit(1);
}

const templateDir = path.join(__dirname, '../../packages/service-template');
const targetDir = path.join(__dirname, '../../apps/services', serviceName);

if (fs.existsSync(targetDir)) {
    console.error(`ERROR: Service ${serviceName} already exists at apps/services/${serviceName}`);
    process.exit(1);
}

// 1. Copy over files
fs.cpSync(templateDir, targetDir, { recursive: true });

// 2. Replace {{SERVICE_NAME}} tags in the targeted strings
function replaceInFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (content.includes('{{SERVICE_NAME}}')) {
        content = content.replace(/\{\{SERVICE_NAME\}\}/g, serviceName);
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

replaceInFile(path.join(targetDir, 'package.json'));
replaceInFile(path.join(targetDir, 'src/index.ts'));

console.log(`\nSUCCESS! Service ${serviceName} created at ${targetDir}`);
console.log(`Remember to run 'pnpm install' from root if you modify dependencies.`);
