// Facebook Scraper Module
class FacebookScraper extends EventTarget {
    constructor(config) {
        super();
        this.config = {
            ...config,
            fireKeywords: config.fireKeywords || ['sunog', 'fire', 'nasusunog', 'fire alert'], // Ensure defaults
            locationKeywords: config.locationKeywords || ['near', 'malapit sa', 'sa', 'at', 'barangay', 'brgy', 'sitio', 'purok']
        };
        this.isInitialized = false;
        this.pageAccessTokens = new Map();
        this.lastCheckTime = new Date().getTime();
        this.websocket = null;
        this.subscriptions = new Set();
        this.lastCheck = null;
        this.incidents = new Map();
        this.geocodingQueue = [];
        this.geocodingTimeout = null;
        this.apiCalls = {
            hourly: 0,
            daily: 0,
            lastReset: Date.now()
        };
        this.mapMarkers = new Map();
        this.eventListeners = new Map();
        this.fbAuthHandler = null;
        this.isReady = false;
        this.initializeGraphApi();
        this.initializeMap();
    }

    updateKeywords(newKeywords) {
        this.config.fireKeywords = newKeywords.length > 0 ? newKeywords : ['sunog', 'fire', 'nasusunog', 'fire alert']; // Default if empty
        console.log('FacebookScraper keywords updated:', this.config.fireKeywords);
    }

    async initializeGraphApi() {
        try {
            this.dispatchEvent(new CustomEvent('scraperApiStatusUpdate', { detail: { status: 'Connecting to API...', color: 'var(--warning)' } }));

            // Load Facebook SDK
            await this.loadFacebookSDK();
            
            // Initialize SDK
            FB.init({
                appId: this.config.appId,
                cookie: true,
                xfbml: true,
                version: this.config.graphApi.version
            });

            // Check login status
            const response = await this.checkLoginStatus();
            if (response.status === 'connected') {
                this.accessToken = response.authResponse.accessToken;
                this.userId = response.authResponse.userID;
                this.setupWebhook();
                this.dispatchEvent(new CustomEvent('scraperApiStatusUpdate', { detail: { status: 'Online', color: 'var(--success)' } }));
            } else {
                this.dispatchEvent(new CustomEvent('scraperApiStatusUpdate', { detail: { status: 'Login Required', color: 'var(--warning)' } }));
                await this.login(); // Wait for login attempt
                // After login attempt, check status again or rely on login() to dispatch its own status
                const loginAttemptResponse = await this.checkLoginStatus();
                if (loginAttemptResponse.status === 'connected') {
                    this.accessToken = loginAttemptResponse.authResponse.accessToken;
                    this.userId = loginAttemptResponse.authResponse.userID;
                    this.setupWebhook();
                    this.dispatchEvent(new CustomEvent('scraperApiStatusUpdate', { detail: { status: 'Online', color: 'var(--success)' } }));
                } else {
                    this.dispatchEvent(new CustomEvent('scraperApiStatusUpdate', { detail: { status: 'Offline - Login Failed', color: 'var(--danger)' } }));
                    throw new Error('Graph API login failed after attempt.');
                }
            }
        } catch (error) {
            console.error('Error initializing Graph API:', error);
            this.dispatchEvent(new CustomEvent('scraperApiStatusUpdate', { detail: { status: 'Offline - Init Error', color: 'var(--danger)' } }));
            this.handleError(error); // Ensure this doesn't throw unhandled, or scraper init might halt dashboard
        }
    }

    async loadFacebookSDK() {
        return new Promise((resolve, reject) => {
            if (window.FB) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = `https://connect.facebook.net/en_US/sdk.js`;
            script.async = true;
            script.defer = true;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }

    async checkLoginStatus() {
        return new Promise((resolve) => {
            FB.getLoginStatus(response => resolve(response));
        });
    }

    async login() {
        return new Promise((resolve, reject) => {
            FB.login(response => {
                if (response.authResponse) {
                    this.accessToken = response.authResponse.accessToken;
                    this.userId = response.authResponse.userID;
                    resolve(response);
                } else {
                    reject(new Error('User cancelled login or did not fully authorize.'));
                }
            }, {
                scope: this.config.graphApi.permissions.join(',')
            });
        });
    }

    async makeGraphApiRequest(endpoint, params = {}) {
        try {
            // Check rate limits
            this.checkRateLimits();

            // Add version and access token
            const url = new URL(`${this.config.graphApi.baseUrl}/${this.config.graphApi.version}/${endpoint}`);
            url.searchParams.append('access_token', this.accessToken);
            
            // Add other parameters
            Object.entries(params).forEach(([key, value]) => {
                url.searchParams.append(key, value);
            });

            const response = await fetch(url.toString());
            
            if (!response.ok) {
                throw new Error(`Graph API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            
            // Update API call counters
            this.incrementApiCalls();
            
            return data;
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    checkRateLimits() {
        const now = Date.now();
        const hourDiff = (now - this.apiCalls.lastReset) / (1000 * 60 * 60);
        const dayDiff = (now - this.apiCalls.lastReset) / (1000 * 60 * 60 * 24);

        if (hourDiff >= 1) {
            this.apiCalls.hourly = 0;
        }
        if (dayDiff >= 1) {
            this.apiCalls.daily = 0;
            this.apiCalls.lastReset = now;
        }

        if (this.apiCalls.hourly >= this.config.graphApi.rateLimits.callsPerHour) {
            throw new Error('Hourly API rate limit exceeded');
        }
        if (this.apiCalls.daily >= this.config.graphApi.rateLimits.callsPerDay) {
            throw new Error('Daily API rate limit exceeded');
        }
    }

    incrementApiCalls() {
        this.apiCalls.hourly++;
        this.apiCalls.daily++;
    }

    setupWebhook() {
        if (!this.config.graphApi.webhook.enabled) return;

        // Subscribe to page updates
        this.makeGraphApiRequest(`${this.userId}/subscribed_apps`, {
            subscribed_fields: 'feed,posts'
        }).catch(error => {
            console.error('Error setting up webhook:', error);
        });
    }

    handleError(error) {
        if (this.config.errorHandling.logErrors) {
            console.error('Facebook Scraper Error:', error);
        }

        if (this.config.errorHandling.notifyOnError) {
            this.dispatchEvent(new CustomEvent('error', { 
                detail: { 
                    message: error.message,
                    timestamp: new Date(),
                    retryCount: this.retryCount || 0
                }
            }));
        }
    }

    async initialize() {
        if (this.isInitialized) {
            // If already initialized, perhaps re-dispatch current status or ensure it was last set correctly.
            // For now, just return if isInitialized is true.
            return;
        }
        
        try {
            // Dispatch initial connecting status for the overall scraper initialization process
            // This is different from API specific status, but good for UX.
            // this.dispatchEvent(new CustomEvent('scraperApiStatusUpdate', { detail: { status: 'Scraper Initializing...', color: 'var(--info)' } }));

            // The initializeGraphApi is now the primary source for API status events.
            // Ensure initializeGraphApi is called if it hasn't been implicitly by constructor or other means.
            // However, the current structure calls initializeGraphApi from the constructor.

            // The existing FB.init within this.initialize() seems redundant if initializeGraphApi also does it.
            // Let's ensure FB.init is primarily managed by initializeGraphApi for clarity.
            
            // The fbAsyncInit pattern is for when the SDK script loads asynchronously.
            // If loadFacebookSDK in initializeGraphApi handles this, we might not need fbAsyncInit here.

            // Original fbAsyncInit logic - needs to be harmonized with initializeGraphApi
            // await new Promise((resolve, reject) => {
            //     window.fbAsyncInit = function() {
            //         FB.init({
            //             appId: this.config.appId, // Ensure this.config is available
            //             cookie: true,
            //             xfbml: true,
            //             version: 'v18.0' // Consider using config version
            //         });
            //         resolve();
            //     }.bind(this); // Bind `this` context

            //      // Trigger SDK load if not already loaded by initializeGraphApi
            //     if (!document.getElementById('facebook-jssdk')) {
            //         const script = document.createElement('script');
            //         script.id = 'facebook-jssdk'; // Ensure ID matches for checks
            //         script.src = 'https://connect.facebook.net/en_US/sdk.js';
            //         script.async = true;
            //         script.defer = true;
            //         script.onerror = reject; // Handle script load error
            //         document.body.appendChild(script);
            //     } else if (window.FB) {
            //         // If SDK script is there and FB object exists, but fbAsyncInit didn't run for this init call
            //         // we might need to re-run FB.init or ensure it was done correctly.
            //         // This part is tricky due to SDK loading states.
            //         // For now, assume initializeGraphApi correctly handles SDK loading and init.
            //         resolve(); 
            //     }
            // });

            this.isInitialized = true;
            console.log("Facebook Scraper fully initialized with config:", this.config);
            // Dispatch a general scraper ready event if needed, separate from API status.
            // this.dispatchEvent(new CustomEvent('scraperReady'));

        } catch (error) {
            console.error("Error during Facebook Scraper full initialization:", error);
            this.dispatchEvent(new CustomEvent('scraperApiStatusUpdate', { detail: { status: 'Scraper Init Failed', color: 'var(--danger)' } }));
            throw error; // Re-throw if this init is critical
        }
    }

    async loadFacebookSDK() {
        return new Promise((resolve, reject) => {
            if (window.FB) {
                resolve();
                return;
            }

            window.fbAsyncInit = function() {
                FB.init({
                    appId: FB_SCRAPER_CONFIG.appId,
                    cookie: true,
                    xfbml: true,
                    version: 'v18.0'
                });
                resolve();
            };

            // Load Facebook SDK
            (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s); js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));
        });
    }

    async initializeFacebookSDK() {
        return new Promise((resolve, reject) => {
            FB.getLoginStatus((response) => {
                if (response.status === 'connected') {
                    resolve(response.authResponse);
                } else {
                    FB.login((loginResponse) => {
                        if (loginResponse.authResponse) {
                            resolve(loginResponse.authResponse);
                        } else {
                            reject(new Error('User cancelled login or did not fully authorize.'));
                        }
                    }, { scope: 'pages_read_engagement,pages_show_list' });
                }
            });
        });
    }

    async authenticatePages() {
        for (const pageId of this.config.pages) {
            try {
                const response = await this.getPageAccessToken(pageId);
                this.pageAccessTokens.set(pageId, response.access_token);
            } catch (error) {
                console.error(`Failed to authenticate page ${pageId}:`, error);
            }
        }
    }

    async getPageAccessToken(pageId) {
        return new Promise((resolve, reject) => {
            FB.api(
                `/${pageId}?fields=access_token`,
                'GET',
                {},
                (response) => {
                    if (!response || response.error) {
                        reject(new Error(response?.error?.message || 'Failed to get page access token'));
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }

    async setupRealTimeUpdates() {
        // Initialize WebSocket connection for real-time updates
        this.websocket = new WebSocket('wss://streaming-graph.facebook.com/');
        
        this.websocket.onopen = () => {
            console.log('WebSocket connection established');
            this.subscribeToUpdates();
        };

        this.websocket.onmessage = (event) => {
            this.handleRealTimeUpdate(JSON.parse(event.data));
        };

        this.websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.websocket.onclose = () => {
            console.log('WebSocket connection closed');
            // Attempt to reconnect after 5 seconds
            setTimeout(() => this.setupRealTimeUpdates(), 5000);
        };
    }

    async subscribeToUpdates() {
        // Subscribe to public post updates
        await this.subscribeToPublicPosts();
        // Subscribe to hashtag updates
        await this.subscribeToHashtags();
        // Subscribe to configured pages
        await this.subscribeToPagesUpdates();
    }

    async subscribeToPublicPosts() {
        const subscription = {
            object: 'page',
            fields: ['feed', 'comments'],
            include_values: true
        };
        
        FB.api('/app/subscriptions', 'POST', subscription, (response) => {
            if (response && !response.error) {
                this.subscriptions.add('public_posts');
            }
        });
    }

    async subscribeToHashtags() {
        const keywords = this.config.keywords.map(keyword => keyword.replace(/^#?/, '#'));
        
        for (const hashtag of keywords) {
            const subscription = {
                object: 'hashtag',
                fields: ['feed'],
                object_id: hashtag
            };
            
            FB.api('/app/subscriptions', 'POST', subscription, (response) => {
                if (response && !response.error) {
                    this.subscriptions.add(hashtag);
                }
            });
        }
    }

    async subscribeToPagesUpdates() {
        for (const [pageId, accessToken] of this.pageAccessTokens) {
            const subscription = {
                object: 'page',
                callback_url: window.location.origin + '/webhook',
                fields: ['feed', 'comments'],
                access_token: accessToken,
                include_values: true
            };
            
            FB.api(`/${pageId}/subscribed_apps`, 'POST', subscription, (response) => {
                if (response && !response.error) {
                    this.subscriptions.add(`page_${pageId}`);
                }
            });
        }
    }

    handleRealTimeUpdate(update) {
        if (!update || !update.entry) return;

        for (const entry of update.entry) {
            if (entry.changes) {
                for (const change of entry.changes) {
                    this.processRealTimeChange(change);
                }
            }
        }
    }

    async processRealTimeChange(change) {
        try {
            switch (change.value.item) {
                case 'post':
                    await this.processPost(change.value);
                    break;
                case 'comment':
                    await this.processComment(change.value);
                    break;
                case 'hashtag':
                    await this.processHashtagPost(change.value);
                    break;
            }
        } catch (error) {
            console.error('Error processing real-time update:', error);
        }
    }

    async processHashtagPost(post) {
        if (!this.isRelevantPost(post)) return;

        const incident = await this.createIncident(post, 'hashtag');
        if (incident) {
            this.notifyNewIncident(incident);
        }
    }

    async processComment(comment) {
        if (!this.isRelevantContent(comment.message)) return;

        // Get the parent post to provide context
        const post = await this.getPostDetails(comment.post_id);
        const incident = await this.createIncident({
            ...post,
            comment: comment,
            type: 'comment'
        });

        if (incident) {
            this.notifyNewIncident(incident);
        }
    }

    isRelevantContent(content) {
        if (!content) return false;
        
        const text = content.toLowerCase();
        return this.config.keywords.some(keyword => {
            // Remove # from keyword if present
            const cleanKeyword = keyword.replace(/^#/, '').toLowerCase();
            return text.includes(cleanKeyword);
        });
    }

    async createIncident(data, type = 'post') {
        try {
            const location = await this.extractLocation(data);
            if (!location && this.config.locationDetection.required) return null;

            const incident = {
                id: data.id,
                type: type,
                message: data.message,
                timestamp: new Date(data.created_time).getTime(),
                location: location,
                source: {
                    type: 'facebook',
                    pageId: data.from?.id,
                    pageName: data.from?.name,
                    postId: type === 'comment' ? data.post_id : data.id,
                    commentId: type === 'comment' ? data.id : null
                },
                hashtags: this.extractHashtags(data.message),
                confidence: this.calculateConfidence(data)
            };

            // Add comment information if available
            if (data.comment) {
                incident.comment = {
                    id: data.comment.id,
                    message: data.comment.message,
                    timestamp: new Date(data.comment.created_time).getTime(),
                    from: data.comment.from
                };
            }

            return incident.confidence >= this.config.confidenceThreshold ? incident : null;
        } catch (error) {
            console.error('Error creating incident:', error);
            return null;
        }
    }

    extractHashtags(text) {
        if (!text) return [];
        const hashtagRegex = /#[\w\u0590-\u05ff]+/g;
        return text.match(hashtagRegex) || [];
    }

    async getPostDetails(postId) {
        return new Promise((resolve, reject) => {
            FB.api(
                `/${postId}`,
                'GET',
                {
                    fields: 'message,created_time,place,from,coordinates'
                },
                (response) => {
                    if (!response || response.error) {
                        reject(new Error(response?.error?.message || 'Failed to get post details'));
                    } else {
                        resolve(response);
                    }
                }
            );
        });
    }

    notifyNewIncident(incident) {
        // Dispatch event for new incident
        const event = new CustomEvent('newIncident', { detail: incident });
        this.dispatchEvent(event);

        // Show notification if enabled
        if (this.config.notifications.enabled) {
            this.showNotification(incident);
        }
    }

    showNotification(incident) {
        // Desktop notification
        if (this.config.notifications.desktop && "Notification" in window) {
            if (Notification.permission === "granted") {
                new Notification("New Fire Incident Detected", {
                    body: incident.message,
                    icon: "/path/to/notification-icon.png"
                });
            }
        }

        // Sound notification
        if (this.config.notifications.sound) {
            const audio = new Audio('/path/to/notification-sound.mp3');
            audio.play();
        }
    }

    isRelevantPost(post) {
        if (!post.message) return false;
        
        const message = post.message.toLowerCase();
        return this.config.keywords.some(keyword => 
            message.includes(keyword.toLowerCase())
        );
    }

    async processPost(post, sourceType = 'page') {
        if (!post.message) return;

        const text = post.message.toLowerCase();
        const timestamp = new Date(post.created_time);
        const pageName = post.from?.name || "Unknown User";

        // Check if post is within time window
        if (this.lastCheck && (timestamp - this.lastCheck) > (this.config.timeWindow * 60 * 1000)) {
            return;
        }

        // Check for fire-related keywords
        const fireMatch = this.config.keywords.fire.find(keyword => text.includes(keyword.toLowerCase()));
        if (!fireMatch) return;

        // Determine severity
        const severity = this.determineSeverity(text);

        // Extract location
        const location = await this.extractLocation(text, post.place);

        // Calculate confidence
        const confidence = this.calculateConfidence(text, fireMatch, location, severity, sourceType);

        // Only process if confidence meets threshold
        if (confidence < this.config.confidenceThreshold) return;

        // Create incident object
        const incident = {
            id: post.id,
            message: post.message,
            location: location.name,
            coordinates: location.coordinates,
            severity: severity,
            confidence: confidence,
            timestamp: timestamp,
            source: {
                type: sourceType,
                pageId: post.from.id,
                pageName: pageName,
                postType: 'page_post'
            },
            status: 'new'
        };

        // Add map marker if coordinates are available
        if (location.coordinates) {
            this.addMapMarker(incident);
        }

        // Check if incident is already processed
        if (this.incidents.has(incident.id)) return;

        // Store incident
        this.incidents.set(incident.id, incident);

        // Dispatch event
        this.dispatchEvent(new CustomEvent('fireIncidentFound', { detail: incident }));
    }

    async extractLocation(text, place) {
        // Try to get location from Facebook place data
        if (place && place.name) {
            const coordinates = await this.geocodeLocation(place.name);
            return {
                name: place.name,
                coordinates: coordinates
            };
        }

        // Extract barangay
        const barangayMatch = this.config.keywords.location.barangays.find(barangay => 
            text.includes(barangay.toLowerCase())
        );
        if (barangayMatch) {
            const locationName = `Barangay ${barangayMatch}, Dasmariñas, Cavite`;
            const coordinates = await this.geocodeLocation(locationName);
            return {
                name: locationName,
                coordinates: coordinates
            };
        }

        // Extract street
        const streetMatch = this.config.keywords.location.streets.find(street => 
            text.includes(street.toLowerCase())
        );
        if (streetMatch) {
            const match = text.match(new RegExp(`${streetMatch}\\s+\\w+`, 'i'));
            if (match) {
                const locationName = `${match[0]}, Dasmariñas, Cavite`;
                const coordinates = await this.geocodeLocation(locationName);
                return {
                    name: locationName,
                    coordinates: coordinates
                };
            }
        }

        // Extract subdivision
        const subdivisionMatch = this.config.keywords.location.subdivisions.find(subdivision => 
            text.includes(subdivision.toLowerCase())
        );
        if (subdivisionMatch) {
            const match = text.match(new RegExp(`${subdivisionMatch}\\s+\\w+`, 'i'));
            if (match) {
                const locationName = `${match[0]}, Dasmariñas, Cavite`;
                const coordinates = await this.geocodeLocation(locationName);
                return {
                    name: locationName,
                    coordinates: coordinates
                };
            }
        }

        // Default location
        const coordinates = await this.geocodeLocation(this.config.defaultLocation);
        return {
            name: this.config.defaultLocation,
            coordinates: coordinates
        };
    }

    async geocodeLocation(query) {
        return new Promise((resolve) => {
            // Add to queue
            this.geocodingQueue.push({ query, resolve });

            // Process queue if not already processing
            if (!this.geocodingTimeout) {
                this.processGeocodingQueue();
            }
        });
    }

    async processGeocodingQueue() {
        if (this.geocodingQueue.length === 0) {
            this.geocodingTimeout = null;
            return;
        }

        const { query, resolve } = this.geocodingQueue.shift();

        try {
            const { endpoint, format, limit } = this.config.geocoding;
            const url = `${endpoint}?format=${format}&q=${encodeURIComponent(query)}&limit=${limit}`;
            
            const response = await fetch(url);
            const results = await response.json();

            if (results.length > 0) {
                resolve({
                    lat: parseFloat(results[0].lat),
                    lng: parseFloat(results[0].lon)
                });
            } else {
                resolve(null);
            }
        } catch (error) {
            console.error("Geocoding failed:", error);
            resolve(null);
        }

        // Schedule next geocoding request
        this.geocodingTimeout = setTimeout(() => {
            this.processGeocodingQueue();
        }, this.config.geocoding.delay);
    }

    determineSeverity(text) {
        if (this.config.keywords.severity.high.some(keyword => 
            text.includes(keyword.toLowerCase())
        )) return 'high';

        if (this.config.keywords.severity.medium.some(keyword => 
            text.includes(keyword.toLowerCase())
        )) return 'medium';

        if (this.config.keywords.severity.low.some(keyword => 
            text.includes(keyword.toLowerCase())
        )) return 'low';

        return 'medium'; // Default to medium if no severity keywords found
    }

    calculateConfidence(text, fireMatch, location, severity, sourceType) {
        let confidence = 50; // Base confidence

        // Add points for source type
        confidence += this.config.alertSources.alertTypes[sourceType].confidence * 100;

        // Add points for fire keyword match
        confidence += (fireMatch.length / text.length) * 20;

        // Add points for location specificity
        if (location.name !== this.config.defaultLocation) {
            confidence += 15;
        }

        // Add points for coordinates
        if (location.coordinates) {
            confidence += 10;
        }

        // Add points for severity
        if (severity === 'high') confidence += 15;
        else if (severity === 'medium') confidence += 10;
        else confidence += 5;

        // Cap at 100
        return Math.min(100, confidence);
    }

    stopScraping() {
        if (this.websocket) {
            this.websocket.close();
        }

        // Unsubscribe from all subscriptions
        this.subscriptions.forEach(subscription => {
            if (subscription.startsWith('page_')) {
                const pageId = subscription.replace('page_', '');
                FB.api(`/${pageId}/subscribed_apps`, 'DELETE');
            } else {
                FB.api('/app/subscriptions', 'DELETE', { object: subscription });
            }
        });

        this.subscriptions.clear();
    }

    async scrapePages() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            // Scrape all sources
            await Promise.all([
                this.scrapeOfficialPages(),
                this.scrapeCommunityPages(),
                this.scrapeHashtags(),
                this.scrapeKeywordSearch()
            ]);

            this.lastCheck = new Date();
        } catch (error) {
            console.error("Error scraping Facebook:", error);
            this.dispatchEvent(new CustomEvent('error', { detail: error }));
        }
    }

    async scrapeKeywordSearch() {
        try {
            for (const term of this.config.search.terms) {
                const searchQuery = {
                    q: term,
                    type: 'post',
                    fields: 'id,message,created_time,from,place,permalink_url,shares,reactions.summary(total_count),comments.summary(total_count)',
                    limit: 100
                };

                // Add location filter if configured
                if (this.config.search.location) {
                    const { lat, lng } = this.config.search.location.center;
                    const radius = this.config.search.location.radius;
                    searchQuery.center = `${lat},${lng}`;
                    searchQuery.distance = radius;
                }

                await this.executeSearch(searchQuery, 'keyword');
            }
        } catch (error) {
            console.error('Error in keyword search:', error);
        }
    }

    async scrapeHashtags() {
        try {
            // Search primary hashtags
            for (const hashtag of this.config.search.hashtags.primary) {
                await this.searchHashtag(hashtag, true);
            }

            // Search secondary hashtags
            for (const hashtag of this.config.search.hashtags.secondary) {
                await this.searchHashtag(hashtag, false);
            }
        } catch (error) {
            console.error('Error in hashtag search:', error);
        }
    }

    async searchHashtag(hashtag, isPrimary) {
        try {
            const searchQuery = {
                q: hashtag,
                type: 'post',
                fields: 'id,message,created_time,from,place,permalink_url,shares,reactions.summary(total_count),comments.summary(total_count)',
                limit: this.config.search.hashtags.settings.maxResults
            };

            // Add location parameters
            if (this.config.search.location) {
                const { lat, lng } = this.config.search.location.center;
                searchQuery.center = `${lat},${lng}`;
                searchQuery.distance = this.config.search.location.radius;
            }

            await this.executeSearch(searchQuery, 'hashtag', isPrimary);
                } catch (error) {
            console.error(`Error searching hashtag ${hashtag}:`, error);
        }
    }

    async executeSearch(searchQuery, searchType, isPrimary = true) {
        return new Promise((resolve, reject) => {
            FB.api('/search', 'GET', searchQuery, async (response) => {
                if (!response || response.error) {
                    reject(response ? response.error : 'Unknown error');
                    return;
                }

                try {
                    for (const post of response.data) {
                        // Check engagement requirements
                        if (!this.meetsEngagementRequirements(post)) {
                            continue;
                        }

                        // Process the post with higher confidence for primary sources
                        const confidence = isPrimary ? 90 : 70;
                        await this.processPost({
                            ...post,
                            searchType,
                            confidence
                        });
                    }
                    resolve();
        } catch (error) {
                    console.error('Error processing search results:', error);
                    reject(error);
                }
            });
        });
    }

    meetsEngagementRequirements(post) {
        const settings = this.config.search.hashtags.settings.minEngagement;
        const reactions = post.reactions?.summary?.total_count || 0;
        const comments = post.comments?.summary?.total_count || 0;
        const shares = post.shares?.count || 0;

        return (
            reactions >= settings.likes ||
            comments >= settings.comments ||
            shares >= settings.shares
        );
    }

    initializeMap() {
        // Initialize map if not already initialized
        if (!window.map) {
            window.map = L.map('map').setView(
                [this.config.map.defaultCenter.lat, this.config.map.defaultCenter.lng],
                this.config.map.defaultZoom
            );

            // Add tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(window.map);

            // Initialize marker cluster group
            this.markerCluster = L.markerClusterGroup(this.config.map.clusterOptions);
            window.map.addLayer(this.markerCluster);
        }
    }

    addMapMarker(incident) {
        // Remove existing marker if any
        this.removeMapMarker(incident.id);

        // Create marker icon
        const icon = L.icon({
            iconUrl: this.config.map.markerIcon.url,
            iconSize: this.config.map.markerIcon.size,
            iconAnchor: this.config.map.markerIcon.anchor
        });

        // Create marker
        const marker = L.marker(
            [incident.coordinates.lat, incident.coordinates.lng],
            { icon: icon }
        );

        // Create popup content
        const popupContent = this.createMarkerPopup(incident);
        marker.bindPopup(popupContent);

        // Add marker to cluster group
        this.markerCluster.addLayer(marker);

        // Store marker reference
        this.mapMarkers.set(incident.id, marker);

        // Pan to marker if it's a new incident
        if (incident.status === 'new') {
            window.map.panTo([incident.coordinates.lat, incident.coordinates.lng]);
        }

        // Dispatch marker added event
        this.dispatchEvent(new CustomEvent('markerAdded', { 
            detail: { 
                incident: incident,
                marker: marker
            }
        }));
    }

    removeMapMarker(incidentId) {
        const marker = this.mapMarkers.get(incidentId);
        if (marker) {
            this.markerCluster.removeLayer(marker);
            this.mapMarkers.delete(incidentId);
        }
    }

    createMarkerPopup(incident) {
        return `
            <div class="incident-popup">
                <h3>${incident.severity.toUpperCase()} SEVERITY INCIDENT</h3>
                <p><strong>Location:</strong> ${incident.location}</p>
                <p><strong>Time:</strong> ${incident.timestamp.toLocaleString()}</p>
                <p><strong>Source:</strong> ${incident.source.pageName}</p>
                <p><strong>Confidence:</strong> ${Math.round(incident.confidence)}%</p>
                <div class="incident-message">${incident.message}</div>
                <div class="incident-actions">
                    <button onclick="window.scraper.verifyIncident('${incident.id}')">Verify</button>
                    <button onclick="window.scraper.dismissIncident('${incident.id}')">Dismiss</button>
                </div>
            </div>
        `;
    }

    verifyIncident(incidentId) {
        const incident = this.incidents.get(incidentId);
        if (incident) {
            incident.status = 'verified';
            this.updateMarkerStyle(incidentId);
            this.dispatchEvent(new CustomEvent('incidentVerified', { detail: incident }));
        }
    }

    dismissIncident(incidentId) {
        this.removeMapMarker(incidentId);
        this.incidents.delete(incidentId);
        this.dispatchEvent(new CustomEvent('incidentDismissed', { detail: { id: incidentId } }));
    }

    updateMarkerStyle(incidentId) {
        const marker = this.mapMarkers.get(incidentId);
        if (marker) {
            const incident = this.incidents.get(incidentId);
            const style = this.config.map.styles[incident.status];
            
            // Update marker style based on incident status
            marker.setStyle(style);
        }
    }

    addEventListener(eventName, callback) {
        if (!this.eventListeners.has(eventName)) {
            this.eventListeners.set(eventName, new Set());
        }
        this.eventListeners.get(eventName).add(callback);
    }

    dispatchIncidentEvent(incident) {
        const event = new CustomEvent('fireIncidentFound', {
            detail: incident
        });
        
        const callbacks = this.eventListeners.get('fireIncidentFound');
        if (callbacks) {
            callbacks.forEach(callback => callback(event));
        }
    }
}

// Export the module
window.FacebookScraper = FacebookScraper; 