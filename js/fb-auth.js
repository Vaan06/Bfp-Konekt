// Facebook Authentication Configuration
class FacebookAuth {
    constructor(config) {
        this.appId = config.appId;
        this.apiVersion = 'v18.0';
        this.requiredPermissions = [
            'pages_read_engagement',
            'pages_show_list',
            'public_profile'
        ];
        this.isInitialized = false;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            // Load Facebook SDK
            window.fbAsyncInit = () => {
                FB.init({
                    appId: this.appId,
                    cookie: true,
                    xfbml: true,
                    version: this.apiVersion
                });

                FB.getLoginStatus((response) => {
                    this.isInitialized = true;
                    this.handleAuthResponse(response);
                    resolve(response);
                });
            };

            // Load SDK asynchronously
            (function(d, s, id) {
                var js, fjs = d.getElementsByTagName(s)[0];
                if (d.getElementById(id)) return;
                js = d.createElement(s); js.id = id;
                js.src = "https://connect.facebook.net/en_US/sdk.js";
                fjs.parentNode.insertBefore(js, fjs);
            }(document, 'script', 'facebook-jssdk'));
        });
    }

    async login() {
        if (!this.isInitialized) {
            await this.initialize();
        }

        return new Promise((resolve, reject) => {
            FB.login((response) => {
                if (response.authResponse) {
                    this.handleAuthResponse(response);
                    resolve(response);
                } else {
                    reject(new Error('User cancelled login or did not fully authorize.'));
                }
            }, {
                scope: this.requiredPermissions.join(','),
                return_scopes: true
            });
        });
    }

    async checkPermissions() {
        return new Promise((resolve, reject) => {
            FB.api('/me/permissions', (response) => {
                if (!response || response.error) {
                    reject(new Error('Failed to check permissions'));
                    return;
                }

                const grantedPermissions = response.data
                    .filter(p => p.status === 'granted')
                    .map(p => p.permission);

                const missingPermissions = this.requiredPermissions
                    .filter(p => !grantedPermissions.includes(p));

                resolve({
                    granted: grantedPermissions,
                    missing: missingPermissions,
                    hasAllRequired: missingPermissions.length === 0
                });
            });
        });
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

    handleAuthResponse(response) {
        if (response.status === 'connected') {
            // Store access token
            localStorage.setItem('fb_access_token', response.authResponse.accessToken);
            this.accessToken = response.authResponse.accessToken;
            
            // Update UI to show logged in state
            this.updateLoginState(true);
            
            // Check permissions
            this.checkPermissions().then(permissions => {
                if (!permissions.hasAllRequired) {
                    console.warn('Missing required permissions:', permissions.missing);
                    this.requestAdditionalPermissions(permissions.missing);
                }
            });
        } else {
            // Clear stored token
            localStorage.removeItem('fb_access_token');
            this.accessToken = null;
            
            // Update UI to show logged out state
            this.updateLoginState(false);
        }
    }

    async requestAdditionalPermissions(permissions) {
        return new Promise((resolve, reject) => {
            FB.login((response) => {
                if (response.authResponse) {
                    resolve(response);
                } else {
                    reject(new Error('Failed to get additional permissions'));
                }
            }, { scope: permissions.join(',') });
        });
    }

    updateLoginState(isLoggedIn) {
        // Update UI elements
        const loginButton = document.getElementById('fbLoginBtn');
        const userInfo = document.getElementById('userInfo');
        
        if (loginButton && userInfo) {
            if (isLoggedIn) {
                loginButton.style.display = 'none';
                userInfo.style.display = 'block';
                
                // Get and display user info
                this.getUserProfile().then(profile => {
                    userInfo.innerHTML = `
                        <img src="${profile.picture.data.url}" alt="Profile" class="profile-pic">
                        <span>${profile.name}</span>
                    `;
                });
            } else {
                loginButton.style.display = 'block';
                userInfo.style.display = 'none';
                userInfo.innerHTML = '';
            }
        }
    }

    logout() {
        return new Promise((resolve, reject) => {
            FB.logout((response) => {
                this.handleAuthResponse({ status: 'unknown' });
                resolve(response);
            });
        });
    }
}

// Export the class
window.FacebookAuth = FacebookAuth; 