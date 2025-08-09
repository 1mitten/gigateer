import pino from "pino";

// Create a simple logger configuration to avoid serialization issues
const loggerConfig = {
  level: process.env.LOG_LEVEL || "info"
};

// Add transport only in development
if (process.env.NODE_ENV !== 'production') {
  (loggerConfig as any).transport = {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss Z",
      ignore: "pid,hostname",
    },
  };
}

export const logger = pino(loggerConfig);

// Helper function to format messages with bright colors for "Local:" text
export function formatLocalMessage(message: string): string {
  if (typeof message === 'string' && message.includes('Local:')) {
    // Make the Local: part bright cyan and clickable-looking with underline
    return message.replace(/Local:\s*([^\s]+)/g, '\u001b[96m\u001b[4mLocal: $1\u001b[0m');
  }
  return message;
}

export type Logger = typeof logger;