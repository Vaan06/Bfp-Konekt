// Apify Configuration
const APIFY_CONFIG = {
    // Apify API Token
    token: 'apify_api_bfKwGpgO03VZdl6OsCyIguoYNsmJpv4cB8Tw',
    
    // Actor Configuration
    actor: {
        id: 'danek~facebook-search-rental',
        version: '1.0.0'
    },
    
    // Search Configuration
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
            ]
        },
        settings: {
            maxPosts: 100,
            minLikes: 5,
            minComments: 2,
            timeRange: '24h'
        }
    },
    
    // Monitoring Settings
    monitoring: {
        interval: 5 * 60 * 1000, // 5 minutes
        maxRetries: 3,
        retryDelay: 5000
    },
    
    // API Endpoints
    endpoints: {
        runs: 'https://api.apify.com/v2/acts/danek~facebook-search-rental/runs',
        datasets: 'https://api.apify.com/v2/datasets'
    }
};

export default APIFY_CONFIG; 