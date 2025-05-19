const FB_CONFIG = {
    // Facebook App Credentials
    appId: process.env.FB_APP_ID || '',
    appSecret: process.env.FB_APP_SECRET || '',
    
    // BFP Dasmariñas City Fire Station Page
    pageId: '100069248977961',
    
    // API Configuration
    apiVersion: 'v18.0',
    graphApiUrl: 'https://graph.facebook.com',
    
    // Webhook Configuration
    webhookUrl: `${process.env.APP_URL}/webhook`,
    verifyToken: process.env.FB_WEBHOOK_VERIFY_TOKEN || '',
    
    // Permissions Required
    permissions: [
        'pages_read_engagement',
        'pages_show_list',
        'public_profile'
    ],
    
    // Monitoring Settings
    keywords: [
        'sunog',
        'fire',
        'emergency',
        'apoy',
        'incident',
        'fire alarm',
        'fire incident',
        'residential fire',
        'commercial fire',
        'structural fire',
        '#BFPDasma',
        '#FireAlert'
    ],
    
    // Location Settings
    locationDetection: {
        enabled: true,
        defaultCity: 'Dasmariñas City',
        defaultProvince: 'Cavite',
        coordinates: {
            lat: 14.3294,
            lng: 120.9367
        }
    },
    
    // Notification Settings
    notifications: {
        enabled: true,
        sound: true,
        desktop: true,
        timeout: 5000
    },
    
    // Monitoring Intervals (in milliseconds)
    intervals: {
        postCheck: 300000,  // 5 minutes
        commentCheck: 180000,  // 3 minutes
        hashtagCheck: 300000  // 5 minutes
    },
    
    // Confidence Threshold Settings
    confidenceThreshold: 75,
    confidenceFactors: {
        keywordMatch: 50,
        locationPresent: 25,
        coordinatesPresent: 25
    }
};

module.exports = FB_CONFIG; 