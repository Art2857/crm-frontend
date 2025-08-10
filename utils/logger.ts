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
    // eslint-disable-next-line no-console
    debug: (...args: LogArgs) => console.debug(...args),
    // eslint-disable-next-line no-console
    info: (...args: LogArgs) => console.info(...args),
    // eslint-disable-next-line no-console
    warn: (...args: LogArgs) => console.warn(...args),
    // eslint-disable-next-line no-console
    error: (...args: LogArgs) => console.error(...args),
  } as const;
};

export const logger = makeLogger();
