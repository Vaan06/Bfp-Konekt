// Facebook Graph API Utilities
const FBGraphAPI = {
    // Configuration
    config: {
        baseUrl: 'https://graph.facebook.com/v18.0',
        accessToken: null,
        pageId: null
    },

    // Initialize with access token
    init: function(accessToken) {
        this.config.accessToken = accessToken;
        return this.getUserPages();
    },

    // Get user's pages
    getUserPages: function() {
        return new Promise((resolve, reject) => {
            FB.api('/me/accounts', { access_token: this.config.accessToken }, (response) => {
                if (response && response.data) {
                    console.log('User pages:', response.data);
                    resolve(response.data);
                } else {
                    console.error('Error getting pages:', response.error);
                    reject(response.error);
                }
            });
        });
    },

    // Search for public posts
    searchPublicPosts: function(params) {
        return new Promise((resolve, reject) => {
            FB.api(
                '/search',
                'GET',
                {
                    q: params.q,
                    type: 'post',
                    fields: 'id,message,created_time,from,permalink_url,attachments,place',
                    limit: params.limit || 100,
                    center: `${params.latitude},${params.longitude}`,
                    distance: params.distance || 10000,
                    access_token: this.config.accessToken
                },
                (response) => {
                    if (response && response.data) {
                        resolve(response.data);
                    } else {
                        console.error('Error searching posts:', response.error);
                        reject(response.error);
                    }
                }
            );
        });
    },

    // Get post details
    getPostDetails: function(postId) {
        return new Promise((resolve, reject) => {
            FB.api(
                `/${postId}`,
                'GET',
                {
                    fields: 'id,message,created_time,from,permalink_url,attachments,place,comments',
                    access_token: this.config.accessToken
                },
                (response) => {
                    if (response) {
                        resolve(response);
                    } else {
                        console.error('Error getting post details:', response.error);
                        reject(response.error);
                    }
                }
            );
        });
    },

    // Get post comments
    getPostComments: function(postId) {
        return new Promise((resolve, reject) => {
            FB.api(
                `/${postId}/comments`,
                'GET',
                {
                    fields: 'id,message,created_time,from',
                    limit: 100,
                    access_token: this.config.accessToken
                },
                (response) => {
                    if (response && response.data) {
                        resolve(response.data);
                    } else {
                        console.error('Error getting comments:', response.error);
                        reject(response.error);
                    }
                }
            );
        });
    },

    // Get page insights
    getPageInsights: function(pageId) {
        return new Promise((resolve, reject) => {
            FB.api(
                `/${pageId}/insights`,
                'GET',
                {
                    metric: 'page_impressions,page_engaged_users',
                    period: 'day',
                    access_token: this.config.accessToken
                },
                (response) => {
                    if (response && response.data) {
                        resolve(response.data);
                    } else {
                        console.error('Error getting insights:', response.error);
                        reject(response.error);
                    }
                }
            );
        });
    },

    // Get tagged posts for a page
    getTaggedPosts: async function() {
        try {
            const response = await fetch(`${this.config.baseUrl}/${this.config.pageId}/tagged?` + new URLSearchParams({
                access_token: this.config.accessToken,
                fields: 'message,from,created_time,place,attachments',
                limit: 100
            }));
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Error fetching tagged posts:', error);
            throw error;
        }
    },

    // Error handling
    handleError: function(error) {
        console.error('Graph API Error:', error);
        
        // Handle specific error codes
        switch (error.code) {
            case 190:
                console.error('Access token expired or invalid');
                // Handle token refresh or re-login
                break;
            case 4:
                console.error('Application request limit reached');
                // Implement rate limiting
                break;
            case 17:
                console.error('User request limit reached');
                // Implement user rate limiting
                break;
            default:
                console.error('Unknown error:', error.message);
        }
    },

    // Token validation
    validateToken: function() {
        return new Promise((resolve, reject) => {
            FB.api('/me', { access_token: this.config.accessToken }, (response) => {
                if (response && !response.error) {
                    resolve(true);
                } else {
                    console.error('Token validation failed:', response.error);
                    reject(response.error);
                }
            });
        });
    }
};

// Export for use in other files
window.FBGraphAPI = FBGraphAPI; 