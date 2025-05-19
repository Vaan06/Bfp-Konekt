// Environment Configuration
const ENV = {
    TEST: 'test',
    PRODUCTION: 'production'
};

// Facebook API Configuration
const FB_CONFIG = {
    test: {
        appId: '1391663538544857',
        pageId: '61574788512420', // BFP Konekt test page
        version: 'v18.0',
        scope: 'public_profile,pages_read_engagement'
    },
    production: {
        appId: '', // Will be set for production later
        pageId: '', // Will be set for production later
        version: 'v18.0',
        scope: 'public_profile,pages_read_engagement'
    },
    rateLimit: {
        maxRequests: 200,
        interval: 3600000
    }
};

class FacebookAPI {
    constructor(environment = ENV.TEST) {
        this.environment = environment;
        this.config = FB_CONFIG[environment];
        this.requestCount = 0;
        this.lastReset = Date.now();
        this.isInitialized = false;
        this.accessToken = null;
    }

    // Initialize Facebook SDK with secure configuration
    async initialize() {
        return new Promise((resolve, reject) => {
            if (this.isInitialized) {
                resolve();
                return;
            }

            window.fbAsyncInit = () => {
                FB.init({
                    appId: this.config.appId,
                    cookie: true,
                    xfbml: true,
                    version: this.config.version
                });
                
                this.isInitialized = true;
                console.log(`Initialized Facebook API in ${this.environment} mode`);
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

    // Test the connection to the page
    async testPageConnection() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        try {
            return new Promise((resolve, reject) => {
                FB.api(
                    `/${this.config.pageId}`,
                    'GET',
                    {
                        fields: 'name,id',
                        access_token: this.accessToken
                    },
                    (response) => {
                        if (!response || response.error) {
                            reject(response ? response.error : 'Unknown error');
                            return;
                        }
                        console.log('Successfully connected to page:', response.name);
                        resolve(response);
                    }
                );
            });
        } catch (error) {
            console.error('Error testing page connection:', error);
            throw error;
        }
    }

    // Test post creation (only available in test environment)
    async createTestPost(message) {
        if (this.environment !== ENV.TEST) {
            throw new Error('Test posts can only be created in test environment');
        }

        try {
            this.checkRateLimit();
            
            return new Promise((resolve, reject) => {
                FB.api(
                    `/${this.config.pageId}/feed`,
                    'POST',
                    {
                        message: message,
                        access_token: this.accessToken
                    },
                    (response) => {
                        if (!response || response.error) {
                            reject(response ? response.error : 'Unknown error');
                            return;
                        }
                        resolve(response);
                    }
                );
            });
        } catch (error) {
            console.error('Error creating test post:', error);
            throw error;
        }
    }

    // Check rate limiting
    checkRateLimit() {
        const now = Date.now();
        if (now - this.lastReset >= FB_CONFIG.rateLimit.interval) {
            this.requestCount = 0;
            this.lastReset = now;
        }
        
        if (this.requestCount >= FB_CONFIG.rateLimit.maxRequests) {
            throw new Error('Rate limit exceeded. Please try again later.');
        }
        
        this.requestCount++;
    }

    // Login and get access token
    async login() {
        return new Promise((resolve, reject) => {
            FB.login((response) => {
                if (response.authResponse) {
                    this.accessToken = response.authResponse.accessToken;
                    resolve(this.accessToken);
                } else {
                    reject('User cancelled login or did not fully authorize.');
                }
            }, { scope: this.config.scope });
        });
    }

    // Fetch public posts from a specific page
    async fetchPagePosts(pageId) {
        try {
            this.checkRateLimit();
            
            return new Promise((resolve, reject) => {
                FB.api(
                    `/${pageId}/posts`,
                    'GET',
                    {
                        access_token: this.accessToken,
                        fields: 'message,created_time,permalink_url',
                        limit: 100 // Fetch maximum allowed posts per request
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
        } catch (error) {
            console.error('Error fetching posts:', error);
            throw error;
        }
    }

    // Filter posts for fire-related content
    filterFireRelatedPosts(posts, keywords) {
        return posts.filter(post => {
            if (!post.message) return false;
            
            const message = post.message.toLowerCase();
            return keywords.some(keyword => message.includes(keyword.toLowerCase()));
        });
    }

    // Modified startMonitoring to use configured pageId
    async startMonitoring(keywords, callback) {
        if (!this.isInitialized) {
            await this.initialize();
        }

        if (!this.accessToken) {
            await this.login();
        }

        console.log(`Starting monitoring in ${this.environment} mode`);
        
        setInterval(async () => {
            try {
                const posts = await this.fetchPagePosts(this.config.pageId);
                const fireRelatedPosts = this.filterFireRelatedPosts(posts, keywords);
                
                if (fireRelatedPosts.length > 0) {
                    callback(fireRelatedPosts);
                }
            } catch (error) {
                if (error.message.includes('Rate limit')) {
                    console.warn('Rate limit reached, waiting for next interval');
                } else {
                    console.error('Error monitoring posts:', error);
                }
            }
        }, 300000); // Check every 5 minutes
    }
}

// Export the FacebookAPI class and environment constants
export { FacebookAPI, ENV }; 