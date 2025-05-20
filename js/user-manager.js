class UserManager {
    constructor() {
        this.userPrefix = 'BFPK000FB';
        this.storageKey = 'bfp_users';
    }

    // Get all registered users
    getUsers() {
        const users = localStorage.getItem(this.storageKey);
        return users ? JSON.parse(users) : {};
    }

    // Save users to storage
    saveUsers(users) {
        localStorage.setItem(this.storageKey, JSON.stringify(users));
    }

    // Get or create user ID for Facebook user
    getOrCreateUserId(fbUserId) {
        const users = this.getUsers();
        
        // If user exists, return their ID
        if (users[fbUserId]) {
            return users[fbUserId];
        }

        // Find the highest existing number
        let highestNumber = 0;
        Object.values(users).forEach(userId => {
            const number = parseInt(userId.replace(this.userPrefix, ''));
            if (!isNaN(number) && number > highestNumber) {
                highestNumber = number;
            }
        });

        // Create new user ID
        const newNumber = highestNumber + 1;
        const newUserId = `${this.userPrefix}${newNumber}`;
        
        // Save new user
        users[fbUserId] = newUserId;
        this.saveUsers(users);

        return newUserId;
    }

    // Get user ID for Facebook user
    getUserId(fbUserId) {
        const users = this.getUsers();
        return users[fbUserId] || null;
    }
}

// Export the class
window.UserManager = UserManager; 