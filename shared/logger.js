// ===================================================
// 结构化日志模块
// 输出 JSON 格式日志，包含时间戳、级别、模块、消息、详情
// 生产环境只输出 WARN 和 ERROR 级别
// ===================================================

const LOG_LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const isProduction = process.env.NODE_ENV === 'production';
const minLevel = isProduction ? LOG_LEVELS.WARN : LOG_LEVELS.DEBUG;

function formatLog(level, module, msg, detail) {
    const entry = { time: new Date().toISOString(), level, module, msg };
    if (detail !== undefined) entry.detail = detail;
    return JSON.stringify(entry);
}

function createLogger(module) {
    return {
        debug: (msg, detail) => {
            if (minLevel <= LOG_LEVELS.DEBUG) console.debug(formatLog('DEBUG', module, msg, detail));
        },
        info: (msg, detail) => {
            if (minLevel <= LOG_LEVELS.INFO) console.log(formatLog('INFO', module, msg, detail));
        },
        warn: (msg, detail) => {
            if (minLevel <= LOG_LEVELS.WARN) console.warn(formatLog('WARN', module, msg, detail));
        },
        error: (msg, detail) => {
            if (minLevel <= LOG_LEVELS.ERROR) console.error(formatLog('ERROR', module, msg, detail));
        },
    };
}

module.exports = { createLogger };