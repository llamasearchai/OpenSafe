"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const logFormat = winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json());
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    defaultMeta: { service: 'openai-safe' },
    transports: [
        new winston_1.default.transports.Console({
            format: process.env.LOG_FORMAT === 'pretty'
                ? winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
                : logFormat,
        }),
    ],
});
if (process.env.NODE_ENV === 'production') {
    exports.logger.add(new winston_1.default.transports.File({ filename: 'error.log', level: 'error' }));
    exports.logger.add(new winston_1.default.transports.File({ filename: 'combined.log' }));
}
//# sourceMappingURL=logger.js.map