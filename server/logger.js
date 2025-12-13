const buildPayload = (level, event, metadata = {}) => ({
  timestamp: new Date().toISOString(),
  level,
  event,
  ...metadata
});

const info = (event, metadata = {}) => {
  console.log(JSON.stringify(buildPayload('info', event, metadata)));
};

const warn = (event, metadata = {}) => {
  console.warn(JSON.stringify(buildPayload('warn', event, metadata)));
};

const error = (event, metadata = {}) => {
  console.error(JSON.stringify(buildPayload('error', event, metadata)));
};

module.exports = {
  info,
  warn,
  error
};


