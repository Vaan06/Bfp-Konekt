class FacebookAuthUI {
    constructor() {
        this.authContainer = null;
        this.statusElement = null;
        this.loginButton = null;
        this.userProfileContainer = null;
        this.initializeUI();
    }

    initializeUI() {
        // Create main container
        this.authContainer = document.createElement('div');
        this.authContainer.className = 'fb-auth-container';
        
        // Create status element
        this.statusElement = document.createElement('div');
        this.statusElement.className = 'fb-status';
        this.statusElement.id = 'fbStatus';
        
        // Create login button
        this.loginButton = document.createElement('button');
        this.loginButton.className = 'fb-login-btn';
        this.loginButton.id = 'fbLoginBtn';
        this.loginButton.innerHTML = `
            <i class="fab fa-facebook"></i>
            Connect with Facebook
        `;
        
        // Create user profile container
        this.userProfileContainer = document.createElement('div');
        this.userProfileContainer.className = 'fb-user-profile';
        this.userProfileContainer.id = 'fbUserProfile';
        this.userProfileContainer.style.display = 'none';

        // Append elements
        this.authContainer.appendChild(this.statusElement);
        this.authContainer.appendChild(this.loginButton);
        this.authContainer.appendChild(this.userProfileContainer);

        // Add styles
        this.addStyles();
    }

    addStyles() {
        const styles = `
            .fb-auth-container {
                padding: 15px;
                border-radius: 8px;
                margin: 10px 0;
            }

            .fb-status {
                margin-bottom: 10px;
                font-weight: 500;
            }

            .fb-status.connected {
                color: #4CAF50;
            }

            .fb-status.disconnected {
                color: #F44336;
            }

            .fb-login-btn {
                background-color: #1877F2;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                font-weight: 500;
                transition: background-color 0.3s;
            }

            .fb-login-btn:hover {
                background-color: #166FE5;
            }

            .fb-user-profile {
                display: flex;
                align-items: center;
                gap: 10px;
                margin-top: 10px;
            }

            .fb-user-profile img {
                width: 40px;
                height: 40px;
                border-radius: 50%;
                object-fit: cover;
            }

            .fb-user-info {
                display: flex;
                flex-direction: column;
            }

            .fb-user-name {
                font-weight: 500;
            }

            .fb-logout-btn {
                background-color: #E4E6EB;
                color: #050505;
                border: none;
                padding: 6px 12px;
                border-radius: 6px;
                cursor: pointer;
                margin-left: auto;
                font-size: 14px;
                transition: background-color 0.3s;
            }

            .fb-logout-btn:hover {
                background-color: #D8DADF;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    mount(targetElement) {
        if (typeof targetElement === 'string') {
            targetElement = document.querySelector(targetElement);
        }
        if (targetElement) {
            targetElement.appendChild(this.authContainer);
        }
    }

    updateConnectionStatus(isConnected, userData = null) {
        this.statusElement.className = `fb-status ${isConnected ? 'connected' : 'disconnected'}`;
        this.statusElement.textContent = `Facebook: ${isConnected ? 'Connected' : 'Disconnected'}`;
        
        this.loginButton.style.display = isConnected ? 'none' : 'block';
        this.userProfileContainer.style.display = isConnected ? 'flex' : 'none';

        if (isConnected && userData) {
            this.userProfileContainer.innerHTML = `
                <img src="${userData.picture.data.url}" alt="${userData.name}">
                <div class="fb-user-info">
                    <span class="fb-user-name">${userData.name}</span>
                    <small>${userData.email || ''}</small>
                </div>
                <button class="fb-logout-btn" onclick="fbAuth.logout()">
                    Logout
                </button>
            `;
        }
    }
} 