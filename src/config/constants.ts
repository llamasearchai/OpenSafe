export const CRON_JOB_SCHEDULES = {
    ANOMALY_DETECTION_MS: process.env.NODE_ENV === 'test' ? 60 * 1000 : 1 * 60 * 60 * 1000, // 1 min for test, 1 hour for others
    // Add other schedules here
};

export const MAX_CONCURRENT_EXPERIMENTS = process.env.NODE_ENV === 'test' ? 1 : 2;

// Add more constants as needed for the application 