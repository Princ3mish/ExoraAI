import winston from 'winston';

// Phase 2: Create a structured global winston logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }), // Captures and serializes full javascript stack
    winston.format.json() // Phase 2: Outputs cleanly parseable JSON mapping format internally to system streams
  ),
  transports: [
    new winston.transports.Console() // Attaches the transport listener onto Node's internal stdout processing
  ]
});

export default logger;
