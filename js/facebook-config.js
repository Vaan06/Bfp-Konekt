// Facebook API Configuration
const FB_CONFIG = {
    appId: 'YOUR_APP_ID', // Replace with your Facebook App ID
    version: 'v19.0',     // Current Facebook API version
    pageIds: [
        'PAGE_ID_1',      // Replace with Dasma Spotted page ID
        'PAGE_ID_2',      // Replace with Dasmariñas Community page ID
        'PAGE_ID_3'       // Replace with other relevant page IDs
    ],
    accessToken: 'YOUR_ACCESS_TOKEN', // Replace with your page access token
    // Keywords to monitor
    keywords: {
        primary: ['sunog', 'fire', 'apoy', 'nasusunog'],
        location: ['dasma', 'dasmariñas', 'dasmarinas'],
        emergency: ['emergency', 'help', 'tulong']
    },
    // Safety configurations
    safety: {
        monitoringInterval: 300000,     // Check every 5 minutes (300000ms) instead of 30 seconds
        maxRequestsPerHour: 100,        // Maximum API requests per hour
        cooldownPeriod: 3600000,        // 1 hour cooldown if rate limit is hit
        retryAttempts: 3,              // Number of retry attempts for failed requests
        retryDelay: 5000,              // Delay between retries (5 seconds)
        errorThreshold: 5,             // Number of errors before temporary shutdown
        backoffMultiplier: 2,          // Exponential backoff multiplier for retries
        useGraphBatch: true,           // Use batch requests when possible
        respectRetryAfter: true        // Respect Facebook's Retry-After header
    }
};

export default FB_CONFIG; 