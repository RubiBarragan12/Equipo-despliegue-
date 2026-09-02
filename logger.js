/**
 * Logger para la aplicación con timestamps y colores
 */

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function timestamp() {
  return new Date().toLocaleTimeString('es-MX', { hour12: false });
}

const logger = {
  db: {
    info: (msg) => console.log(`${colors.dim}${timestamp()}${colors.reset} ${colors.cyan}[DB]${colors.reset} ${msg}`),
    error: (obj, msg) => {
      const extra = typeof obj === 'string' ? obj : obj?.err?.message || '';
      const finalMsg = msg || extra;
      console.error(`${colors.dim}${timestamp()}${colors.reset} ${colors.red}[DB] ❌ ${finalMsg}${colors.reset}`, extra && msg ? extra : '');
    },
  },
  app: {
    info: (msg) => console.log(`${colors.dim}${timestamp()}${colors.reset} ${colors.green}[APP]${colors.reset} ${msg}`),
    warn: (msg) => console.warn(`${colors.dim}${timestamp()}${colors.reset} ${colors.yellow}[APP] ⚠️  ${msg}${colors.reset}`),
    error: (msg) => console.error(`${colors.dim}${timestamp()}${colors.reset} ${colors.red}[APP] ❌ ${msg}${colors.reset}`),
  },
  req: {
    info: (method, url, status, ms) => {
      const color = status >= 500 ? colors.red : status >= 400 ? colors.yellow : colors.green;
      console.log(`${colors.dim}${timestamp()}${colors.reset} ${colors.magenta}[REQ]${colors.reset} ${colors.white}${method}${colors.reset} ${url} ${color}${status}${colors.reset} ${colors.dim}${ms}ms${colors.reset}`);
    },
  },
};

export default logger;
