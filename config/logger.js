const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize } = format;

// custom log format
const logFormat = printf(({ level, message, timestamp }) => {
  return `${timestamp} [${level}]: ${message}`;
});

const logger = createLogger({
  level: 'info',
  format: combine(
    colorize({ all: true }),    // ✅ Enables color for all log levels
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // new transports.Console(),
    new transports.File({ filename: 'logs/combined.log', format: format.uncolorize() }), // ✅ remove colors from file
    new transports.File({ filename: 'logs/error.log', level: 'error', format: format.uncolorize() })
  ]
});

module.exports = logger;


