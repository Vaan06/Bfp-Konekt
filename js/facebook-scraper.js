import FB_CONFIG from './facebook-config.js';

class FacebookScraper {
    constructor(config) {
        this.config = config;
        this.lastCheckTime = new Date();
        this.requestCount = 0;
        this.isInCooldown = false;
        this.listeners = new Set();
        this.subscriptions = new Set();
    }

    // Initialize the scraper
    async init() {
        console.log('Initializing Facebook Scraper...');
        await this.initFacebookSDK();
        this.startMonitoring();
    }

    // Initialize Facebook SDK
    async initFacebookSDK() {
        return new Promise((resolve) => {
            window.fbAsyncInit = () => {
                FB.init({
                    appId: this.config.appId,
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
                js = d.createElement(s);
                js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));
        });
    }

    // Start monitoring for new posts
    startMonitoring() {
        console.log('Starting Facebook post monitoring...');
        this.checkForNewPosts();
        
        // Set up periodic checking
        setInterval(() => {
            this.checkForNewPosts();
        }, this.config.search.settings.checkInterval);
    }

    // Check for new posts
    async checkForNewPosts() {
        if (this.isInCooldown) return;

        try {
            const posts = await this.searchPublicPosts();
            const newPosts = posts.filter(post => {
                const postDate = new Date(post.created_time);
                return postDate > this.lastCheckTime && this.isRelevantPost(post);
            });

            if (newPosts.length > 0) {
                this.notifyListeners(newPosts);
            }
            
            this.lastCheckTime = new Date();
        } catch (error) {
            console.error('Error checking for new posts:', error);
            this.handleError(error);
        }
    }

    // Search for public posts
    async searchPublicPosts() {
        this.requestCount++;
        return new Promise((resolve, reject) => {
            FB.api(
                '/search',
                'GET',
                {
                    q: this.config.search.keywords.primary.join(' '),
                    type: 'post',
                    fields: this.config.search.settings.fields,
                    limit: this.config.search.settings.maxPostsPerRequest,
                    center: `${this.config.search.location.latitude},${this.config.search.location.longitude}`,
                    distance: this.config.search.location.distance
                },
                (response) => {
                    if (!response || response.error) {
                        reject(response ? response.error : 'Unknown error');
                        return;
                    }
                    resolve(response.data);
                }
            );
        });
    }

    // Check if post is relevant
    isRelevantPost(post) {
        if (!post.message) return false;
        
        const message = post.message.toLowerCase();
        const hasFireKeyword = this.config.search.keywords.primary.some(keyword => 
            message.includes(keyword.toLowerCase())
        );
        
        const hasLocation = this.config.search.keywords.location.some(location => 
            message.includes(location.toLowerCase())
        );

        const hasEmergency = this.config.search.keywords.emergency.some(keyword => 
            message.includes(keyword.toLowerCase())
        );

        return hasFireKeyword && (hasLocation || hasEmergency);
    }

    // Calculate confidence score for a post
    calculateConfidence(post) {
        let score = 0;
        const message = post.message.toLowerCase();

        // Keyword matches
        this.config.search.keywords.primary.forEach(keyword => {
            if (message.includes(keyword.toLowerCase())) {
                score += 10;
            }
        });

        // Location matches
        this.config.search.keywords.location.forEach(location => {
            if (message.includes(location.toLowerCase())) {
                score += 15;
            }
        });

        // Emergency keyword matches
        this.config.search.keywords.emergency.forEach(keyword => {
            if (message.includes(keyword.toLowerCase())) {
                score += 20;
            }
        });

        // Engagement factor
        const reactions = post.reactions?.summary?.total_count || 0;
        const comments = post.comments?.summary?.total_count || 0;
        
        if (reactions > 10) score += 10;
        if (comments > 5) score += 10;

        // Time factor (recent posts get higher score)
        const postTime = new Date(post.created_time);
        const now = new Date();
        const hoursOld = (now - postTime) / (1000 * 60 * 60);
        
        if (hoursOld < 1) score += 20;
        else if (hoursOld < 6) score += 15;
        else if (hoursOld < 24) score += 10;

        return Math.min(score, 100);
    }

    // Handle errors and implement rate limiting
    handleError(error) {
        console.error('Facebook API Error:', error);
        
        if (error.code === 4 || error.code === 17) { // Rate limit errors
            this.isInCooldown = true;
            setTimeout(() => {
                this.isInCooldown = false;
            }, this.config.safety.cooldownPeriod);
        }
    }

    // Add event listener
    addEventListener(callback) {
        this.listeners.add(callback);
    }

    // Remove event listener
    removeEventListener(callback) {
        this.listeners.delete(callback);
    }

    // Notify listeners about new posts
    notifyListeners(posts) {
        const formattedPosts = posts.map(post => ({
            id: post.id,
            message: post.message,
            createdTime: post.created_time,
            url: post.permalink_url,
            confidence: this.calculateConfidence(post),
            reactions: post.reactions?.summary?.total_count || 0,
            comments: post.comments?.summary?.total_count || 0,
            source: post.from?.name || 'Unknown'
        }));

        this.listeners.forEach(callback => callback(formattedPosts));
    }
}

export default new FacebookScraper(); 