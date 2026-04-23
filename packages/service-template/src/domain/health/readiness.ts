export type DependencyStatus = {
    name: string;
    ready: boolean;
};

export type ReadinessReport = {
    ready: boolean;
    dependencies: DependencyStatus[];
};
