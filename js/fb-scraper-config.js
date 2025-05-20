// Facebook Scraper Configuration
const FB_SCRAPER_CONFIG = {
    // Facebook App credentials
    appId: '1328501121552066',
    appSecret: '',
    displayName: "BFP Konekt Alert",
    contactEmail: "bfpkonek@gmail.com",
    
    // Pages to monitor (add the Facebook pages you want to monitor)
    pagesToMonitor: [
        '100069248977961', // BFP Dasmariñas
        'gocavite',        // Go Cavite
        'DasmaCityNews'    // Dasmariñas City News
    ],
    
    // Keywords to detect fire incidents
    fireKeywords: ['sunog', 'fire', 'nasusunog', 'fire alert', ' apoy'],

    // Scanning interval in milliseconds (5 minutes)
    scanInterval: 300000,
    
    // Minimum confidence score (0-100) for fire incident detection
    minConfidence: 70,
    
    // Location keywords to help with geocoding
    locationKeywords: [
        'sa', 'at', 'in', 'near', 'along',
        'corner', 'beside', 'behind', 'front',
        'brgy', 'barangay', 'street', 'st.',
        'avenue', 'ave', 'road', 'rd'
    ],
    
    // Graph API Configuration
    graphApi: {
        version: "v18.0",
        baseUrl: "https://graph.facebook.com",
        permissions: [
            "pages_read_engagement",
            "pages_show_list",
            "public_profile",
            "pages_manage_posts",
            "pages_manage_metadata"
        ],
        webhook: {
            enabled: true,
            verifyToken: "bfpkonekt_verify_token",
            callbackUrl: "https://your-domain.com/webhook"
        },
        rateLimits: {
            callsPerHour: 200,
            callsPerDay: 5000
        }
    },
    
    // Alert Sources Configuration
    alertSources: {
        // Official BFP Pages to monitor
        officialPages: [
            {
                id: "100069248977961",
                name: "BFP Dasmariñas",
                type: "official",
                accessToken: "YOUR_PAGE_ACCESS_TOKEN"
            }
        ],
        
        // Community Pages to monitor
        communityPages: [
            {
                id: "gocavite",
                name: "Go Cavite",
                type: "community",
                accessToken: "YOUR_PAGE_ACCESS_TOKEN"
            },
            {
                id: "DasmaCityNews",
                name: "Dasmariñas City News",
                type: "community",
                accessToken: "YOUR_PAGE_ACCESS_TOKEN"
            }
        ],
        
        // Keywords for different types of alerts
        keywords: {
            fire: ["sunog", "apoy", "fire", "emergency", "incident"],
            severity: {
                high: ["emergency", "urgent", "critical", "major"],
                medium: ["incident", "fire", "sunog"],
                low: ["smoke", "alarm", "report"]
            },
            location: {
                barangays: [
                    "Salawag", "Burol", "Paliparan", "Sampaloc", "San Agustin",
                    "San Jose", "San Miguel", "San Nicolas", "Santa Cruz",
                    "Santa Fe", "Santa Lucia", "Santa Maria", "Santo Cristo",
                    "Santo Niño", "Vergara", "Zapote"
                ],
                streets: ["street", "st", "ave", "avenue", "road", "rd"],
                subdivisions: ["subdivision", "subd", "village", "vlg"]
            }
        },
        
        // Hashtags to monitor
        hashtags: {
            primary: [
                "#SunogDasma",
                "#FireAlertDasma",
                "#EmergencyDasma",
                "#BarangayFire"
            ],
            secondary: [
                "#DasmariñasFire",
                "#DasmaEmergency",
                "#FireIncident",
                "#FireReport"
            ],
            // Additional hashtag settings
            settings: {
                searchRadius: 10, // kilometers
                maxResults: 100,
                minLikes: 5,
                minComments: 2
            }
        },
        
        // Alert Types and their priorities
        alertTypes: {
            official: {
                priority: 1,
                confidence: 0.9
            },
            community: {
                priority: 2,
                confidence: 0.7
            },
            public: {
                priority: 3,
                confidence: 0.5
            }
        }
    },
    
    // Monitoring Settings
    pollInterval: 300000, // 5 minutes
    defaultLocation: "Dasmariñas, Cavite",
    
    // Notification Settings
    notifications: {
        enabled: true,
        sound: true,
        desktop: true,
        email: true,
        sms: false
    },
    
    // Geocoding Settings
    geocodingService: {
        url: "https://nominatim.openstreetmap.org/search",
        format: "json"
    },

    // Page Configuration
    accessToken: "YOUR_PAGE_ACCESS_TOKEN",
    pageId: "YOUR_PAGE_ID",
    pageName: "Sunog Alert Dasmariñas",
    
    // Confidence Settings
    confidenceThreshold: 75,
    timeWindow: 30, // minutes
    
    // Reporting Instructions
    reportingInstructions: {
        title: "HOW TO REPORT A FIRE IN DASMA",
        steps: [
            "Go to Facebook",
            "Post what's happening (photo/video optional)",
            `Tag @${this.pageName}`,
            "Include the hashtag #SunogDasma (or #FireAlertDasma)",
            "Optional: Include the barangay or location in your post"
        ],
        example: {
            text: "May sunog po sa Barangay Salawag! 🧯\nPlease respond immediately!\n@Sunog Alert Dasmariñas\n#SunogDasma #FireAlertDasma",
            location: "Barangay Salawag",
            hashtags: ["#SunogDasma", "#FireAlertDasma"]
        }
    },
    
    // Error Handling
    errorHandling: {
        maxRetries: 3,
        retryDelay: 5000,
        logErrors: true,
        notifyOnError: true
    },

    // Map Configuration
    map: {
        defaultCenter: {
            lat: 14.3294,
            lng: 120.9367
        },
        defaultZoom: 12,
        markerIcon: {
            url: '/images/fire-marker.png',
            size: [32, 32],
            anchor: [16, 32]
        },
        clusterOptions: {
            maxZoom: 15,
            radius: 50
        },
        styles: {
            incident: {
                color: '#ff0000',
                fillColor: '#ff0000',
                fillOpacity: 0.5,
                radius: 8
            },
            verified: {
                color: '#ff4500',
                fillColor: '#ff4500',
                fillOpacity: 0.7,
                radius: 10
            }
        }
    },

    // Enhanced Search Configuration
    search: {
        // Combined search terms
        terms: [
            'sunogsadasma',
            'dasmafire',
            'sunogdasma',
            'sunog dasmarinas',
            'fire dasmarinas',
            'emergency dasma',
            'bfp dasma'
        ],
        
        // Hashtag monitoring
        hashtags: {
            primary: [
                '#SunogSaDasma',
                '#SunogDasma',
                '#DasmaFire',
                '#EmergencyDasma',
                '#BFPDasma',
                '#SunogAlert',
                '#DasmaEmergency'
            ],
            secondary: [
                '#Dasmarinas',
                '#DasmaNews',
                '#CaviteFire',
                '#DasmaUpdate',
                '#EmergencyAlert'
            ],
            settings: {
                searchRadius: '25km',
                maxResults: 100,
                minEngagement: {
                    likes: 5,
                    comments: 2,
                    shares: 1
                },
                refreshInterval: 300000 // 5 minutes
            }
        },

        // Location-based search
        location: {
            center: {
                lat: 14.3294,
                lng: 120.9367
            },
            radius: '25km',
            places: [
                'Dasmarinas',
                'Dasmarinas City',
                'Dasmariñas',
                'Cavite'
            ]
        }
    }
};

// Export configuration
window.FB_SCRAPER_CONFIG = FB_SCRAPER_CONFIG; 