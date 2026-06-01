export class InMemoryMetrics {
    private requestCount = 0;
    private errorCount = 0;
    private totalLatencyMs = 0;

    observeRequest(durationMs: number, statusCode: number): void {
        this.requestCount += 1;
        this.totalLatencyMs += durationMs;

        if (statusCode >= 500) {
            this.errorCount += 1;
        }
    }

    observeError(): void {
        this.errorCount += 1;
    }

    renderPrometheus(): string {
        const averageLatencyMs = this.requestCount === 0 ? 0 : this.totalLatencyMs / this.requestCount;
        const errorRate = this.requestCount === 0 ? 0 : this.errorCount / this.requestCount;

        return [
            '# TYPE forgekit_request_count counter',
            `forgekit_request_count ${this.requestCount}`,
            '# TYPE forgekit_error_count counter',
            `forgekit_error_count ${this.errorCount}`,
            '# TYPE forgekit_error_rate gauge',
            `forgekit_error_rate ${errorRate}`,
            '# TYPE forgekit_latency_avg_ms gauge',
            `forgekit_latency_avg_ms ${averageLatencyMs}`,
        ].join('\n');
    }
}
