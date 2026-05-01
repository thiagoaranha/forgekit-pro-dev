import type { FastifyInstance } from 'fastify';
// SCAFFOLD EXAMPLE - Remove this import once you add domain-specific routes.
import { registerExampleRoutes } from './routes/example-routes';

export const registerRoutes = (server: FastifyInstance): void => {
    // SCAFFOLD EXAMPLE - Remove this registration once you add domain-specific routes.
    registerExampleRoutes(server);
};
