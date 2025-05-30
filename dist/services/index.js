"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeServices = void 0;
const logger_1 = require("../utils/logger");
const monitoring_service_1 = require("./monitoring.service");
const policy_service_1 = require("./policy.service"); // Import PolicyService
async function initializeServices() {
    try {
        logger_1.logger.info('Initializing services...');
        // Initialize monitoring
        monitoring_service_1.monitoringService.emit('system.startup', {
            timestamp: new Date(),
            version: process.env.npm_package_version || 'unknown'
        });
        // Initialize default safety policies if none exist
        await policy_service_1.policyService.initializeDefaultPolicies();
        logger_1.logger.info('Services initialized successfully');
    }
    catch (error) {
        logger_1.logger.error('Service initialization failed', error);
        throw error; // Re-throw to prevent server from starting in a bad state
    }
}
exports.initializeServices = initializeServices;
//# sourceMappingURL=index.js.map