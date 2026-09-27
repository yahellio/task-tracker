const LEVELS = Object.freeze({ info: 10, warn: 20, error: 30 });

const defaultWrite = (line) => process.stdout.write(`${line}\n`);

export const createLogger = ({ level = 'info', context = {}, write = defaultWrite } = {}) => {
  const threshold = LEVELS[level] ?? LEVELS.info;

  const emit = (entryLevel) => (event, fields = {}) => {
    if (LEVELS[entryLevel] < threshold) {
      return;
    }
    write(JSON.stringify({ time: new Date().toISOString(), level: entryLevel, event, ...context, ...fields }));
  };

  return {
    info: emit('info'),
    warn: emit('warn'),
    error: emit('error'),
    child: (extra) => createLogger({ level, context: { ...context, ...extra }, write })
  };
};
