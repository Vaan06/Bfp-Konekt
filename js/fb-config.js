// Facebook Scraper Configuration
const FB_CONFIG = {
    // Facebook App credentials
    appId: 'YOUR_APP_ID', // Replace with your Facebook App ID
    appSecret: 'YOUR_APP_SECRET', // Replace with your Facebook App Secret
    
    // Search configuration
    search: {
        keywords: {
            primary: [
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
                'nasusunog',
                'may sunog',
                'fire department',
                'fire station',
                'bumbero',
                'fire truck'
            ],
            location: [
                'Dasmariñas',
                'Cavite',
                'Dasmarinas',
                'Dasma',
                'Salawag',
                'Burol',
                'Paliparan',
                'Sampaloc',
                'San Agustin',
                'San Jose',
                'San Miguel',
                'San Nicolas',
                'Santa Cruz',
                'Santa Fe',
                'Santa Lucia',
                'Santa Maria',
                'Santo Cristo',
                'Santo Niño',
                'Vergara',
                'Zapote'
            ],
            emergency: [
                'emergency',
                'urgent',
                'help',
                'tulong',
                'saklolo',
                'emergency response',
                'rescue',
                'evacuation',
                'evacuate'
            ]
        },
        location: {
            latitude: 14.3294, // Dasmariñas City coordinates
            longitude: 120.9367,
            distance: 10000 // 10km radius
        },
        settings: {
            checkInterval: 5 * 60 * 1000, // Check every 5 minutes
            minConfidence: 70, // Minimum confidence score for relevant posts
            maxPostsPerRequest: 100, // Maximum posts to fetch per request
            fields: 'id,message,created_time,from,permalink_url,attachments,place,reactions.summary(total_count),comments.summary(total_count)'
        }
    },
    
    // Rate limiting and safety
    safety: {
        useGraphBatch: true, // Use batch requests when possible
        maxRequestsPerHour: 200,
        cooldownPeriod: 60 * 1000, // 1 minute cooldown between requests
        retryAttempts: 3,
        retryDelay: 5000 // 5 seconds between retries
    }
}; 