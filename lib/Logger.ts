const __DEV__ = process.env.NODE_ENV !== 'production';

export const Logger = {
  debug: (...args: any[]) => { if (__DEV__) console.log(...args); },
  info:  (...args: any[]) => { console.log(...args); },
  warn:  (...args: any[]) => { console.warn(...args); },
  error: (...args: any[]) => { console.error(...args); },
};
