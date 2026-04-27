const fs = require('fs');
const path = require('path');

/**
 * SpecAudit CLI - Technical Validation Tool for ForgeKit
 * Usage: node scripts/validate-spec.js <path-to-spec-dir>
 */

const specDir = process.argv[2];

if (!specDir) {
    console.error('ERROR: Please provide the path to a spec directory. Example: node scripts/validate-spec.js specs/005-scaffold-integration');
    process.exit(1);
}

const specFilePath = path.join(process.cwd(), specDir, 'spec.md');

if (!fs.existsSync(specFilePath)) {
    console.error(`ERROR: spec.md not found in ${specDir}`);
    process.exit(1);
}

console.log(`\n🔍 Auditing: ${specDir}\n`);

// ─── Core Logic ─────────────────────────────────────────────────────────────

function parseRequirements(content) {
    const requirements = [];
    // Match FR-XXX: Description, potentially bolded
    const frRegex = /\*?\*?(FR-\d{3})\*?\*?[:\-\s]+(.*)/g;
    let match;

    while ((match = frRegex.exec(content)) !== null) {
        requirements.push({
            id: match[1],
            description: match[2].trim()
        });
    }

    return requirements;
}

function parseScenarios(content) {
    const scenarios = [];
    // Match SC-XXX: Name, potentially bolded
    const scRegex = /\*?\*?(SC-\d{3})\*?\*?[:\-\s]+(.*)/g;
    let match;

    while ((match = scRegex.exec(content)) !== null) {
        scenarios.push({
            id: match[1],
            name: match[2].trim()
        });
    }

    return scenarios;
}

function checkEvidence(req) {
    const desc = req.description.toLowerCase();
    const searchPatterns = [];

    // 1. Dockerfile checks
    if (desc.includes('dockerfile')) {
        searchPatterns.push({
            name: 'Dockerfile Existence',
            check: () => {
                const results = [];
                // Check in service template and apps/services
                const locations = [
                    'packages/service-template/Dockerfile',
                    'apps/services/order-service/Dockerfile' // Example service from SC-001
                ];
                locations.forEach(loc => {
                    if (fs.existsSync(path.join(process.cwd(), loc))) {
                        results.push(`Found at ${loc}`);
                    }
                });
                return results.length > 0 ? results.join(', ') : null;
            }
        });
    }

    // 2. Gateway Proxy checks
    if (desc.includes('gateway') || desc.includes('proxy')) {
        searchPatterns.push({
            name: 'Gateway Proxy Registration',
            check: () => {
                const gatewayPath = path.join(process.cwd(), 'apps/gateway/src/index.ts');
                if (fs.existsSync(gatewayPath)) {
                    const content = fs.readFileSync(gatewayPath, 'utf8');
                    if (content.includes('httpProxy')) return 'Found httpProxy registration in Gateway';
                }
                return null;
            }
        });
    }

    // 3. Port Mapping checks
    if (desc.includes('port')) {
        searchPatterns.push({
            name: 'Port Mapping in Compose',
            check: () => {
                const composePath = path.join(process.cwd(), 'infra/compose/docker-compose.yml');
                if (fs.existsSync(composePath)) {
                    const content = fs.readFileSync(composePath, 'utf8');
                    const portRegex = /"\d+:\d+"/;
                    if (portRegex.test(content)) return 'Found port mapping in docker-compose.yml';
                }
                return null;
            }
        });
    }

    // Run checks
    const evidence = [];
    searchPatterns.forEach(p => {
        const result = p.check();
        if (result) evidence.push(`${p.name}: ${result}`);
    });

    return evidence.length > 0 ? { status: 'PASS', text: evidence.join(' | ') } : { status: 'PENDING', text: 'No automated evidence found' };
}

function runAudit() {
    const specContent = fs.readFileSync(specFilePath, 'utf8');
    const requirements = parseRequirements(specContent);
    const scenarios = parseScenarios(specContent);

    if (requirements.length === 0) {
        console.warn('⚠️  No Functional Requirements (FR-XXX) found in spec.md');
    }

    console.log(`Found ${requirements.length} Requirements and ${scenarios.length} Acceptance Scenarios.\n`);

    const results = requirements.map(req => {
        const audit = checkEvidence(req);
        return {
            ...req,
            status: audit.status,
            evidence: audit.text
        };
    });

    // ─── Output Summary ───────────────────────────────────────────────────────

    console.log('Requirements Status:');
    results.forEach(res => {
        const icon = res.status === 'PASS' ? '✅' : '⏳';
        const color = res.status === 'PASS' ? '\x1b[32m' : '\x1b[33m';
        const reset = '\x1b[0m';
        console.log(`${color}${icon} [${res.id}]${reset} ${res.description}`);
        if (res.status === 'PASS') {
            console.log(`   └─ 📄 ${res.evidence}`);
        }
    });

    console.log('\nAcceptance Scenarios (Manual Verification Needed):');
    scenarios.forEach(sc => {
        console.log(`[ ] ${sc.id}: ${sc.name}`);
    });

    const passedCount = results.filter(r => r.status === 'PASS').length;
    const coverage = ((passedCount / requirements.length) * 100).toFixed(0);

    console.log(`\nTechnical Coverage: ${coverage}% (${passedCount}/${requirements.length} requirements verified automatically)`);
    console.log('\nAudit complete. Proceeding to Cognitive AI Audit is recommended.');
}

try {
    runAudit();
} catch (error) {
    console.error('Audit failed:', error.message);
    process.exit(1);
}
