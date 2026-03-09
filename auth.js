// Authentication module for login page
const AUTH_MODULE = (() => {
    const VALID_USERNAME = 'admin';
    const VALID_PASSWORD = 'admin123';
    const TOKEN_KEY = 'auth_token';
    const USERNAME_KEY = 'username';

    const validateCredentials = (username, password) => {
        return username === VALID_USERNAME && password === VALID_PASSWORD;
    };

    const setAuthToken = (username) => {
        const token = btoa(`${username}:${Date.now()}`);
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USERNAME_KEY, username);
    };

    const getAuthToken = () => {
        return localStorage.getItem(TOKEN_KEY);
    };

    const getUsername = () => {
        return localStorage.getItem(USERNAME_KEY);
    };

    const clearAuth = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USERNAME_KEY);
    };

    const isAuthenticated = () => {
        return !!getAuthToken();
    };

    return {
        validateCredentials,
        setAuthToken,
        getAuthToken,
        getUsername,
        clearAuth,
        isAuthenticated
    };
})();

// Initialize login page
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    if (AUTH_MODULE.isAuthenticated()) {
        window.location.href = 'main.html';
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // Handle form submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        // Validate inputs
        if (!username || !password) {
            showError('Please fill in all fields');
            return;
        }

        // Validate credentials
        if (AUTH_MODULE.validateCredentials(username, password)) {
            AUTH_MODULE.setAuthToken(username);
            // Success animation
            loginForm.style.opacity = '0';
            setTimeout(() => {
                window.location.href = 'main.html';
            }, 300);
        } else {
            showError('Invalid username or password');
            passwordInput.value = '';
            passwordInput.focus();
        }
    });

    const showError = (message) => {
        errorMessage.textContent = message;
        errorMessage.classList.add('show');

        // Hide error after 5 seconds
        setTimeout(() => {
            errorMessage.classList.remove('show');
        }, 5000);
    };

    // Allow Enter key for form submission
    loginForm.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            loginForm.dispatchEvent(new Event('submit'));
        }
    });

    // Focus effect
    usernameInput.focus();
});
