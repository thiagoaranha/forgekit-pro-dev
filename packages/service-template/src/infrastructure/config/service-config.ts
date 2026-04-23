import { parseEnv, z } from '@forgekit/shared-tooling';

const serviceConfigSchema = z.object({
    PORT: z.coerce.number().int().min(1).max(65535).default(3000),
    HOST: z.string().min(1).default('0.0.0.0'),
});

export type ServiceConfig = z.infer<typeof serviceConfigSchema>;

export const loadConfig = (env: NodeJS.ProcessEnv = process.env): ServiceConfig => {
    return parseEnv(serviceConfigSchema, env);
};
