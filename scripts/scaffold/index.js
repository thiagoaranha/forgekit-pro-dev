const fs = require('fs');
const path = require('path');

const serviceName = process.argv[2];
if (!serviceName) {
    console.error('ERROR: You must provide a service name. Example: pnpm scaffold my-new-service');
    process.exit(1);
}

const templateDir = path.join(__dirname, '../../packages/service-template');
const targetDir = path.join(__dirname, '../../apps/services', serviceName);

const REQUIRED_TEMPLATE_PATHS = [
    'package.json',
    'src/index.ts',
    'src/transport',
    'src/application',
    'src/domain',
    'src/infrastructure',
    'src/infrastructure/config/service-config.ts',
    'src/transport/http/error-handler.ts',
    'src/transport/http/routes/health-routes.ts',
    'src/transport/http/routes/metrics-routes.ts',
];

const EXCLUDED_DIRECTORIES = new Set(['node_modules', 'dist', '.git']);
const EXCLUDED_FILES = new Set(['tsconfig.tsbuildinfo']);
const TEXT_FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.json', '.md', '.yml', '.yaml']);

function assertTemplateStructure() {
    for (const relativePath of REQUIRED_TEMPLATE_PATHS) {
        const absolutePath = path.join(templateDir, relativePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Template is missing required path: packages/service-template/${relativePath}`);
        }
    }
}

function shouldCopy(sourcePath) {
    const name = path.basename(sourcePath);
    if (EXCLUDED_DIRECTORIES.has(name)) {
        return false;
    }

    if (EXCLUDED_FILES.has(name)) {
        return false;
    }

    return true;
}

function listFilesRecursive(rootPath) {
    const files = [];
    const entries = fs.readdirSync(rootPath, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(rootPath, entry.name);
        if (entry.isDirectory()) {
            files.push(...listFilesRecursive(fullPath));
            continue;
        }

        files.push(fullPath);
    }

    return files;
}

function replaceServiceNamePlaceholders(rootPath) {
    const files = listFilesRecursive(rootPath);

    for (const filePath of files) {
        const extension = path.extname(filePath);
        if (!TEXT_FILE_EXTENSIONS.has(extension)) {
            continue;
        }

        let content = fs.readFileSync(filePath, 'utf8');
        if (!content.includes('{{SERVICE_NAME}}')) {
            continue;
        }

        content = content.replace(/\{\{SERVICE_NAME\}\}/g, serviceName);
        fs.writeFileSync(filePath, content, 'utf8');
    }
}

function assertPlaceholderReplacement(rootPath) {
    const files = listFilesRecursive(rootPath);

    for (const filePath of files) {
        const extension = path.extname(filePath);
        if (!TEXT_FILE_EXTENSIONS.has(extension)) {
            continue;
        }

        const content = fs.readFileSync(filePath, 'utf8');
        if (content.includes('{{SERVICE_NAME}}')) {
            throw new Error(`Placeholder replacement failed in ${path.relative(targetDir, filePath)}`);
        }
    }
}

function assertGeneratedStructure() {
    for (const relativePath of REQUIRED_TEMPLATE_PATHS) {
        const absolutePath = path.join(targetDir, relativePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`Generated service is missing required path: apps/services/${serviceName}/${relativePath}`);
        }
    }
}

if (fs.existsSync(targetDir)) {
    console.error(`ERROR: Service ${serviceName} already exists at apps/services/${serviceName}`);
    process.exit(1);
}

try {
    assertTemplateStructure();

    fs.cpSync(templateDir, targetDir, {
        recursive: true,
        filter: (sourcePath) => shouldCopy(sourcePath),
    });

    replaceServiceNamePlaceholders(targetDir);
    assertGeneratedStructure();
    assertPlaceholderReplacement(targetDir);

    console.log(`\nSUCCESS! Service ${serviceName} created at ${targetDir}`);
    console.log("Template validation passed and required structure was generated.");
    console.log("Remember to run 'pnpm install' from root if you modify dependencies.");
} catch (error) {
    if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error(`ERROR: Failed to scaffold service ${serviceName}. ${message}`);
    process.exit(1);
}
