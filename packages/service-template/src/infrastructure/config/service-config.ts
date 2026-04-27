import { parseEnv, z } from '@forgekit/shared-tooling';

const serviceConfigSchema = z.object({
    PORT: z.coerce.number().int().min(1).max(65535).default({{SERVICE_PORT}}),
    HOST: z.string().min(1).default('0.0.0.0'),
    // Required: connection string for this service's PostgreSQL database.
    DATABASE_URL: z.string().min(1),
    // RabbitMQ connection string — defaults to the local Docker network address.
    RABBITMQ_URL: z.string().min(1).default('amqp://forgekit:secret@localhost:5672'),
});

export type ServiceConfig = z.infer<typeof serviceConfigSchema>;

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): ServiceConfig => {
    return parseEnv(serviceConfigSchema, env);
};
