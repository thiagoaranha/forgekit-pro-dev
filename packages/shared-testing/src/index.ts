import { PostgreSqlContainer } from 'testcontainers';

export const startDbContainer = async () => {
    const container = await new PostgreSqlContainer("postgres:16-alpine").start();
    return {
        uri: container.getConnectionUri(),
        stop: () => container.stop()
    };
};
