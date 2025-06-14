import winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'openai-safe' },
  transports: [
    new winston.transports.Console({
      format:
        process.env.LOG_FORMAT === 'pretty'
          ? winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          : logFormat,
    }),
  ],
});

if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.File({ filename: 'error.log', level: 'error' }));
  logger.add(new winston.transports.File({ filename: 'combined.log' }));
} 