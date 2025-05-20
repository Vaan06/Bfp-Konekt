class FacebookMonitor {
    constructor(config) {
        this.config = config;
        this.pages = [];
        this.isMonitoring = false;
        this.checkInterval = 5 * 60 * 1000; // 5 minutes
    }

    async init() {
        try {
            // Initialize Facebook SDK
            await this.loadFacebookSDK();
            
            // Get user's pages
            const response = await this.getUserPages();
            this.pages = response.data;
            
            console.log('Facebook Monitor initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize Facebook Monitor:', error);
            return false;
        }
    }

    async loadFacebookSDK() {
        return new Promise((resolve, reject) => {
            window.fbAsyncInit = function() {
                FB.init({
                    appId: this.config.appId,
                    cookie: true,
                    xfbml: true,
                    version: 'v18.0'
                });
                resolve();
            }.bind(this);

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

    async getUserPages() {
        return new Promise((resolve, reject) => {
            FB.api('/me/accounts', function(response) {
                if (response && !response.error) {
                    resolve(response);
                } else {
                    reject(response.error);
                }
            });
        });
    }

    async startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        console.log('Starting Facebook monitoring...');
        
        // Initial check
        await this.checkPages();
        
        // Set up interval
        this.monitorInterval = setInterval(() => {
            this.checkPages();
        }, this.checkInterval);
    }

    async stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        clearInterval(this.monitorInterval);
        console.log('Facebook monitoring stopped');
    }

    async checkPages() {
        for (const page of this.pages) {
            try {
                const posts = await this.getPagePosts(page.id);
                this.analyzePosts(posts, page);
            } catch (error) {
                console.error(`Error checking page ${page.name}:`, error);
            }
        }
    }

    async getPagePosts(pageId) {
        return new Promise((resolve, reject) => {
            FB.api(
                `/${pageId}/posts`,
                'GET',
                {
                    fields: 'message,created_time,place,attachments',
                    limit: 100
                },
                function(response) {
                    if (response && !response.error) {
                        resolve(response.data);
                    } else {
                        reject(response.error);
                    }
                }
            );
        });
    }

    analyzePosts(posts, page) {
        const fireKeywords = [
            'fire', 'sunog', 'nasusunog', 'nasusunog',
            'emergency', 'emergency response', 'bumbero',
            'fire truck', 'fire station', 'BFP'
        ];

        posts.forEach(post => {
            if (!post.message) return;

            const message = post.message.toLowerCase();
            const hasFireKeyword = fireKeywords.some(keyword => 
                message.includes(keyword.toLowerCase())
            );

            if (hasFireKeyword) {
                this.handleFireIncident(post, page);
            }
        });
    }

    handleFireIncident(post, page) {
        // Create incident object
        const incident = {
            id: post.id,
            source: page.name,
            message: post.message,
            timestamp: new Date(post.created_time),
            location: post.place ? post.place.name : 'Unknown',
            confidence: this.calculateConfidence(post.message)
        };

        // Dispatch event
        const event = new CustomEvent('fireIncidentFound', {
            detail: incident
        });
        window.dispatchEvent(event);

        // Show notification
        this.showNotification(incident);
    }

    calculateConfidence(message) {
        // Simple confidence calculation based on keyword matches
        const fireKeywords = ['fire', 'sunog', 'emergency', 'bumbero'];
        const matches = fireKeywords.filter(keyword => 
            message.toLowerCase().includes(keyword)
        ).length;
        
        return (matches / fireKeywords.length) * 100;
    }

    showNotification(incident) {
        if (!("Notification" in window)) return;

        if (Notification.permission === "granted") {
            new Notification("Fire Incident Detected", {
                body: `New incident reported by ${incident.source}\nLocation: ${incident.location}`,
                icon: "/images/logo.png"
            });
        } else if (Notification.permission !== "denied") {
            Notification.requestPermission().then(permission => {
                if (permission === "granted") {
                    this.showNotification(incident);
                }
            });
        }
    }
}

// Export the class
window.FacebookMonitor = FacebookMonitor; 