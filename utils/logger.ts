import { isDevelopment } from '../config/env';

type LogArgs = [message?: any, ...optionalParams: any[]];

const noop = () => {};

const makeLogger = () => {
  if (!isDevelopment) {
    return {
      debug: noop,
      info: noop,
      warn: noop,
      error: (...args: LogArgs) => console.error(...args),
    } as const;
  }
  return {
    debug: (...args: LogArgs) => console.debug(...args),
    info: (...args: LogArgs) => console.info(...args),
    warn: (...args: LogArgs) => console.warn(...args),
    error: (...args: LogArgs) => console.error(...args),
  } as const;
};

export const logger = makeLogger();


