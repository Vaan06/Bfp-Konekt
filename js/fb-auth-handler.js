class FacebookAuthHandler {
    constructor(config) {
        this.config = config;
        this.ui = null;
        this.isInitialized = false;
        this.accessToken = null;
        this.userId = null;
    }

    async initialize(mountElement) {
        // Initialize UI
        this.ui = new FacebookAuthUI();
        this.ui.mount(mountElement);

        // Load Facebook SDK
        await this.loadFacebookSDK();
        
        // Initialize SDK
        window.fbAsyncInit = () => {
            FB.init({
                appId: this.config.appId,
                cookie: true,
                xfbml: true,
                version: 'v18.0'
            });

            this.isInitialized = true;
            this.checkLoginStatus();
        };
    }

    loadFacebookSDK() {
        return new Promise((resolve) => {
            if (document.getElementById('facebook-jssdk')) {
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = 'https://connect.facebook.net/en_US/sdk.js';
            script.async = true;
            script.defer = true;
            
            script.onload = () => resolve();
            document.head.appendChild(script);
        });
    }

    async checkLoginStatus() {
        if (!this.isInitialized) {
            console.error('Facebook SDK not initialized');
            return;
        }

        FB.getLoginStatus(async (response) => {
            if (response.status === 'connected') {
                this.accessToken = response.authResponse.accessToken;
                this.userId = response.authResponse.userID;
                
                // Get user profile
                const userData = await this.getUserProfile();
                this.ui.updateConnectionStatus(true, userData);
                
                // Trigger connected event
                this.onConnected();
            } else {
                this.ui.updateConnectionStatus(false);
            }
        });
    }

    async login() {
        if (!this.isInitialized) {
            console.error('Facebook SDK not initialized');
            return;
        }

        try {
            const response = await new Promise((resolve, reject) => {
                FB.login((response) => {
                    if (response.authResponse) {
                        resolve(response);
                    } else {
                        reject(new Error('User cancelled login or did not fully authorize.'));
                    }
                }, {
                    scope: 'public_profile,email,pages_read_engagement,pages_show_list'
                });
            });

            this.accessToken = response.authResponse.accessToken;
            this.userId = response.authResponse.userID;

            // Get user profile
            const userData = await this.getUserProfile();
            this.ui.updateConnectionStatus(true, userData);

            // Trigger connected event
            this.onConnected();

            return response;
        } catch (error) {
            console.error('Login error:', error);
            this.ui.updateConnectionStatus(false);
            throw error;
        }
    }

    async logout() {
        if (!this.isInitialized) {
            console.error('Facebook SDK not initialized');
            return;
        }

        try {
            await new Promise((resolve) => {
                FB.logout((response) => {
                    resolve(response);
                });
            });

            this.accessToken = null;
            this.userId = null;
            this.ui.updateConnectionStatus(false);
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    async getUserProfile() {
        return new Promise((resolve, reject) => {
            FB.api('/me', { fields: 'id,name,email,picture' }, (response) => {
                if (!response || response.error) {
                    reject(new Error('Failed to get user profile'));
                    return;
                }
                resolve(response);
            });
        });
    }

    onConnected() {
        // This method can be overridden to handle post-connection logic
        console.log('Facebook connected successfully');
    }
} 