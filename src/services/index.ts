import { logger } from '../utils/logger';
import { monitoringService } from './monitoring.service';
import { policyService } from './policy.service'; // Import PolicyService

export async function initializeServices(): Promise<void> {
  try {
    logger.info('Initializing services...');
    
    // Initialize monitoring
    monitoringService.emit('system.startup', {
      timestamp: new Date(),
      version: process.env.npm_package_version || 'unknown'
    });

    // Initialize default safety policies if none exist
    await policyService.initializeDefaultPolicies();
    
    logger.info('Services initialized successfully');
  } catch (error) {
    logger.error('Service initialization failed', error);
    throw error; // Re-throw to prevent server from starting in a bad state
  }
} 