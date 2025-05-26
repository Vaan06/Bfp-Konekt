// Facebook Public Post Scraper
const FB_PUBLIC_SCRAPER = {
    // Configuration
    config: {
        appId: 'YOUR_APP_ID', // Replace with your App ID
        appSecret: 'YOUR_APP_SECRET', // Replace with your App Secret
        searchParams: {
            q: 'sunog fire emergency apoy incident', // Search keywords
            type: 'post',
            fields: 'id,message,created_time,from,permalink_url,attachments,place',
            limit: 100, // Maximum posts per request
            location: {
                latitude: 14.3294, // Dasmariñas City coordinates
                longitude: 120.9367,
                distance: 10000 // 10km radius
            }
        },
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
            'nasusunog',
            'may sunog',
            'fire department',
            'fire station',
            'bumbero',
            'fire truck'
        ],
        locationKeywords: [
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
        checkInterval: 5 * 60 * 1000, // Check every 5 minutes
        minConfidence: 70 // Minimum confidence score for relevant posts
    },

    // Initialize the scraper
    init: function() {
        console.log('Initializing Facebook Public Post Scraper...');
        this.initFacebookSDK();
        this.initGoogleMaps();
    },

    // Initialize Google Maps
    initGoogleMaps: function() {
        // Wait for Google Maps to be loaded
        if (typeof google === 'undefined') {
            console.error('Google Maps not loaded');
            return;
        }

        // Get the map instance from the dashboard
        const map = window.dashboardMap; // Assuming this is your map instance
        if (!map) {
            console.error('Dashboard map not found');
            return;
        }

        this.map = map;
        this.markers = new Map(); // Store markers for later reference
    },

    // Initialize Facebook SDK
    initFacebookSDK: function() {
        window.fbAsyncInit = function() {
            FB.init({
                appId: FB_PUBLIC_SCRAPER.config.appId,
                cookie: true,
                xfbml: true,
                version: 'v18.0',
                status: true
            });

            FB_PUBLIC_SCRAPER.checkLoginState();
        };

        // Load Facebook SDK
        (function(d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) return;
            js = d.createElement(s);
            js.id = id;
            js.src = "https://connect.facebook.net/en_US/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    },

    // Check login state
    checkLoginState: function() {
        FB.getLoginStatus(function(response) {
            if (response.status === 'connected') {
                console.log('Connected to Facebook');
                FB_PUBLIC_SCRAPER.startScraping();
            } else {
                console.log('Please login to Facebook');
                FB_PUBLIC_SCRAPER.showLoginButton();
            }
        }, true); // Force a fresh check
    },

    // Start the scraping process
    startScraping: function() {
        console.log('Starting to scrape public posts...');
        this.searchPublicPosts();
        
        // Set up periodic checking
        setInterval(() => {
            this.searchPublicPosts();
        }, this.config.checkInterval);
    },

    // Search for public posts
    searchPublicPosts: function() {
        const searchParams = this.config.searchParams;
        
        FB.api(
            '/search',
            'GET',
            {
                q: searchParams.q,
                type: searchParams.type,
                fields: searchParams.fields,
                limit: searchParams.limit,
                center: `${searchParams.location.latitude},${searchParams.location.longitude}`,
                distance: searchParams.location.distance
            },
            (response) => {
                if (response && response.data) {
                    console.log(`Found ${response.data.length} public posts`);
                    this.processPosts(response.data);
                } else {
                    console.error('Error searching posts:', response.error);
                }
            }
        );
    },

    // Process and filter posts
    processPosts: function(posts) {
        posts.forEach(post => {
            if (this.isRelevantPost(post)) {
                const analysis = this.analyzePost(post);
                if (analysis.confidence >= this.config.minConfidence) {
                    this.addIncidentToMap(analysis);
                    this.notifyNewPost(analysis);
                }
            }
        });
    },

    // Check if post is relevant
    isRelevantPost: function(post) {
        if (!post.message) return false;

        const message = post.message.toLowerCase();
        const hasKeyword = this.config.keywords.some(keyword => 
            message.includes(keyword.toLowerCase())
        );

        const hasLocation = this.config.locationKeywords.some(location => 
            message.includes(location.toLowerCase())
        );

        return hasKeyword && hasLocation;
    },

    // Analyze post content
    analyzePost: function(post) {
        const analysis = {
            postId: post.id,
            message: post.message,
            createdTime: post.created_time,
            url: post.permalink_url,
            confidence: this.calculateConfidence(post),
            location: this.extractLocation(post),
            attachments: post.attachments,
            source: post.from ? post.from.name : 'Unknown'
        };

        return analysis;
    },

    // Calculate confidence score
    calculateConfidence: function(post) {
        let score = 0;
        const message = post.message.toLowerCase();

        // Keyword matches
        this.config.keywords.forEach(keyword => {
            if (message.includes(keyword.toLowerCase())) {
                score += 10;
            }
        });

        // Location matches
        this.config.locationKeywords.forEach(location => {
            if (message.includes(location.toLowerCase())) {
                score += 15;
            }
        });

        // Time factor (recent posts get higher score)
        const postTime = new Date(post.created_time);
        const now = new Date();
        const hoursOld = (now - postTime) / (1000 * 60 * 60);
        
        if (hoursOld < 1) score += 20;
        else if (hoursOld < 6) score += 15;
        else if (hoursOld < 24) score += 10;

        return Math.min(score, 100);
    },

    // Extract location information
    extractLocation: function(post) {
        if (post.place) {
            return {
                name: post.place.name,
                location: post.place.location
            };
        }

        // Try to extract location from message
        const message = post.message.toLowerCase();
        const location = this.config.locationKeywords.find(loc => 
            message.includes(loc.toLowerCase())
        );

        return location || 'Unknown';
    },

    // Add incident to Google Maps
    addIncidentToMap: function(analysis) {
        if (!this.map) return;

        // Remove existing marker if it exists
        if (this.markers.has(analysis.postId)) {
            this.markers.get(analysis.postId).setMap(null);
        }

        // Create marker position
        const position = this.getLocationCoordinates(analysis.location);
        if (!position) return;

        // Create marker
        const marker = new google.maps.Marker({
            position: position,
            map: this.map,
            title: 'Fire Incident',
            icon: {
                url: 'images/fire-marker.svg',
                scaledSize: new google.maps.Size(32, 32),
                anchor: new google.maps.Point(16, 16)
            },
            animation: google.maps.Animation.DROP
        });

        // Create info window
        const infoWindow = new google.maps.InfoWindow({
            content: `
                <div class="incident-info">
                    <h3>Fire Incident Report</h3>
                    <p>${analysis.message.substring(0, 100)}...</p>
                    <p><strong>Location:</strong> ${analysis.location}</p>
                    <p><strong>Time:</strong> ${new Date(analysis.createdTime).toLocaleString()}</p>
                    <p><strong>Confidence:</strong> ${analysis.confidence}%</p>
                    <a href="${analysis.url}" target="_blank">View Post</a>
                </div>
            `
        });

        // Add click event to marker
        marker.addListener('click', () => {
            infoWindow.open(this.map, marker);
        });

        // Store marker reference
        this.markers.set(analysis.postId, marker);

        // Center map on new incident if it's the first one
        if (this.markers.size === 1) {
            this.map.setCenter(position);
        }
    },

    // Get coordinates from location
    getLocationCoordinates: function(location) {
        if (location.latitude && location.longitude) {
            return { lat: location.latitude, lng: location.longitude };
        }

        // Try to geocode the location name
        const geocoder = new google.maps.Geocoder();
        let coordinates = null;

        geocoder.geocode({ address: location }, (results, status) => {
            if (status === 'OK' && results[0]) {
                coordinates = results[0].geometry.location;
            }
        });

        return coordinates;
    },

    // Notify about new relevant post
    notifyNewPost: function(analysis) {
        console.log('New relevant post found:', analysis);
        
        // Create notification
        const notification = {
            title: 'New Fire Incident Report',
            body: analysis.message.substring(0, 100) + '...',
            url: analysis.url,
            timestamp: new Date().toISOString(),
            confidence: analysis.confidence,
            location: analysis.location,
            coordinates: this.getLocationCoordinates(analysis.location)
        };

        // Store in database or send to server
        this.saveNotification(notification);

        // Show notification on dashboard
        this.showDashboardNotification(notification);
    },

    // Show notification on dashboard
    showDashboardNotification: function(notification) {
        const notificationContainer = document.getElementById('notifications-container');
        if (!notificationContainer) return;

        const notificationElement = document.createElement('div');
        notificationElement.className = 'notification';
        notificationElement.innerHTML = `
            <div class="notification-content">
                <h4>${notification.title}</h4>
                <p>${notification.body}</p>
                <p><strong>Location:</strong> ${notification.location}</p>
                <div class="notification-actions">
                    <button onclick="FB_PUBLIC_SCRAPER.centerMapOnIncident('${notification.coordinates.lat}', '${notification.coordinates.lng}')">
                        View on Map
                    </button>
                    <a href="${notification.url}" target="_blank">View Post</a>
                </div>
            </div>
        `;

        notificationContainer.appendChild(notificationElement);
    },

    // Center map on specific incident
    centerMapOnIncident: function(lat, lng) {
        if (!this.map) return;
        this.map.setCenter({ lat: parseFloat(lat), lng: parseFloat(lng) });
        this.map.setZoom(15);
    },

    // Save notification (to be implemented based on your backend)
    saveNotification: function(notification) {
        // TODO: Implement saving to your database or sending to server
        console.log('Saving notification:', notification);
    },

    // Show login button
    showLoginButton: function() {
        const loginBtn = document.createElement('button');
        loginBtn.innerHTML = 'Login with Facebook';
        loginBtn.onclick = function() {
            FB.login(function(response) {
                if (response.authResponse) {
                    console.log('Successfully logged in');
                    FB_PUBLIC_SCRAPER.startScraping();
                }
            }, {
                scope: 'public_profile,pages_read_engagement',
                return_scopes: true
            });
        };
        document.body.appendChild(loginBtn);
    }
};

// Start the scraper when document is ready
document.addEventListener('DOMContentLoaded', function() {
    FB_PUBLIC_SCRAPER.init();
}); 