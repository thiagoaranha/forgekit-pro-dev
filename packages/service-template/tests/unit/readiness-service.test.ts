import { describe, expect, it } from 'vitest';
import { ReadinessService } from '../../src/application/health/readiness-service';

describe('ReadinessService', () => {
    it('returns ready when all required dependencies are healthy', async () => {
        const service = new ReadinessService([
            { name: 'database', check: async () => true },
            { name: 'broker', check: async () => true },
        ]);

        const report = await service.evaluate();

        expect(report.ready).toBe(true);
        expect(report.dependencies).toEqual([
            { name: 'database', ready: true },
            { name: 'broker', ready: true },
        ]);
    });

    it('returns not ready when one dependency fails', async () => {
        const service = new ReadinessService([
            { name: 'database', check: async () => true },
            { name: 'broker', check: async () => false },
        ]);

        const report = await service.evaluate();

        expect(report.ready).toBe(false);
        expect(report.dependencies).toEqual([
            { name: 'database', ready: true },
            { name: 'broker', ready: false },
        ]);
    });
});
