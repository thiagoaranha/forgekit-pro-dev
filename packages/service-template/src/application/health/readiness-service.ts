import type { ReadinessReport } from '../../domain/health/readiness';

export type DependencyProbe = {
    name: string;
    check: () => Promise<boolean>;
};

export class ReadinessService {
    constructor(private readonly dependencies: DependencyProbe[]) {}

    async evaluate(): Promise<ReadinessReport> {
        const dependencies = await Promise.all(
            this.dependencies.map(async (dependency) => {
                try {
                    const ready = await dependency.check();
                    return { name: dependency.name, ready };
                } catch {
                    return { name: dependency.name, ready: false };
                }
            })
        );

        const ready = dependencies.every((dependency) => dependency.ready);
        return { ready, dependencies };
    }
}
