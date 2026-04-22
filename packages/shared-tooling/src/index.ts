import { z } from 'zod';

export const parseEnv = <T extends z.ZodTypeAny>(schema: T, env: NodeJS.ProcessEnv): z.infer<T> => {
    return schema.parse(env);
};
