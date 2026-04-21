import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const getCorrelationId = (): string => {
    // Placeholder logic for correlation ID context
    return 'req-uuid-placeholder';
};
