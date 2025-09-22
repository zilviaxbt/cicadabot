import winston from 'winston';

export class Logger {
  private static instance: winston.Logger;

  public static getInstance(level: string = 'info'): winston.Logger {
    if (!Logger.instance) {
      Logger.instance = winston.createLogger({
        level,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        defaultMeta: { service: 'galaswap-bot' },
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.simple()
            )
          }),
          new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error' 
          }),
          new winston.transports.File({ 
            filename: 'logs/combined.log' 
          })
        ]
      });
    }
    return Logger.instance;
  }

  public static info(message: string, meta?: any): void {
    Logger.getInstance().info(message, meta);
  }

  public static error(message: string, error?: any): void {
    Logger.getInstance().error(message, { error: error?.message || error, stack: error?.stack });
  }

  public static warn(message: string, meta?: any): void {
    Logger.getInstance().warn(message, meta);
  }

  public static debug(message: string, meta?: any): void {
    Logger.getInstance().debug(message, meta);
  }
}
