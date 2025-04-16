/**
 * Profile UI Handler
 * Manages the profile UI and connects it to the Profile Manager
 */

class ProfileUI {
    constructor() {
        this.initialized = false;
        this.containerId = 'profile-panel';
        this.container = null;
        this.profileManager = window.profileManager;
    }
    
    /**
     * Initialize the profile UI
     */
    init() {
        console.log('Initializing Profile UI...');
        
        // Make sure profile manager exists
        if (!window.profileManager) {
            console.error('Profile Manager not found, creating a new one');
            window.profileManager = new ProfileManager().init();
            this.profileManager = window.profileManager;
        }
        
        // Find or create container
        this.container = document.getElementById(this.containerId);
        if (!this.container) {
            console.log('Creating profile panel container');
            this.container = document.createElement('div');
            this.container.id = this.containerId;
            this.container.className = 'panel profile-panel';
            
            // Add to main content area
            const contentMain = document.querySelector('.content-main');
            if (contentMain) {
                contentMain.appendChild(this.container);
            } else {
                // Delay initialization if content main isn't ready
                console.log('Content main not found, waiting...');
                setTimeout(() => this.init(), 500);
                return;
            }
        }
        
        // Load the profile component if not already loaded
        if (this.container.children.length === 0) {
            this.loadProfileComponent();
            return;
        }
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update UI with profile data
        this.updateProfileUI();
        
        this.initialized = true;
        console.log('Profile UI initialized');
        return this;
    }
    
    /**
     * Load the profile component HTML
     */
    loadProfileComponent() {
        console.log('Loading profile component...');
        
        // Load the component using fetch
        fetch('components/profile.html')
            .then(response => response.text())
            .then(html => {
                this.container.innerHTML = html;
                console.log('Profile component loaded');
                
                // Now that the component is loaded, finish initialization
                this.setupEventListeners();
                this.updateProfileUI();
                this.initialized = true;
            })
            .catch(error => {
                console.error('Error loading profile component:', error);
                // Create an error message
                this.container.innerHTML = `
                    <div class="profile-container">
                        <div class="settings-header">
                            <h2>User Profile</h2>
                        </div>
                        <div class="settings-section">
                            <div class="setting-group">
                                <div class="setting-label warning-text">Error loading profile component</div>
                            </div>
                        </div>
                    </div>
                `;
            });
    }
    
    /**
     * Set up event listeners for profile controls
     */
    setupEventListeners() {
        // Save profile button
        const saveButton = document.getElementById('save-profile');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.saveProfile();
            });
        }
        
        // Add email button
        const addEmailButton = document.getElementById('add-email');
        if (addEmailButton) {
            addEmailButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.addEmailField();
            });
        }
        
        // Set up remove buttons for existing email fields
        document.querySelectorAll('.array-item .remove-button').forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                if (document.querySelectorAll('.email-input').length > 1) {
                    button.closest('.array-item').remove();
                }
            });
        });
        
        // Profile button in left panel
        const profileButton = document.getElementById('profile-button');
        if (profileButton) {
            profileButton.addEventListener('click', () => {
                this.showProfile();
            });
        }
    }
    
    /**
     * Update the UI with profile data
     */
    updateProfileUI() {
        if (!this.initialized) return;
        
        const profile = this.profileManager.profile;
        
        // Update text fields
        document.getElementById('given-name').value = profile.givenName || '';
        document.getElementById('family-name').value = profile.familyName || '';
        document.getElementById('phone-number').value = profile.phoneNumber || '';
        
        // Update social accounts
        document.getElementById('x-account').value = profile.socialAccounts.x || '';
        document.getElementById('bluesky-account').value = profile.socialAccounts.bluesky || '';
        document.getElementById('wechat-account').value = profile.socialAccounts.wechat || '';
        document.getElementById('whatsapp-account').value = profile.socialAccounts.whatsapp || '';
        document.getElementById('github-account').value = profile.socialAccounts.github || '';
        
        // Update email fields
        const emailFields = document.getElementById('email-fields');
        emailFields.innerHTML = '';
        
        // Create fields for each email
        profile.emails.forEach((email, index) => {
            const emailItem = document.createElement('div');
            emailItem.className = 'array-item';
            emailItem.innerHTML = `
                <input type="email" class="profile-input email-input" placeholder="Email Address" value="${email || ''}">
                <button class="remove-button">
                    <span class="button-icon">-</span>
                </button>
            `;
            emailFields.appendChild(emailItem);
            
            // Add event listener to remove button
            const removeButton = emailItem.querySelector('.remove-button');
            removeButton.addEventListener('click', (e) => {
                e.preventDefault();
                if (document.querySelectorAll('.email-input').length > 1) {
                    emailItem.remove();
                }
            });
        });
        
        // If no emails were added, add an empty field
        if (profile.emails.length === 0) {
            this.addEmailField();
        }
    }
    
    /**
     * Add a new email input field
     */
    addEmailField() {
        const emailFields = document.getElementById('email-fields');
        
        const emailItem = document.createElement('div');
        emailItem.className = 'array-item';
        emailItem.innerHTML = `
            <input type="email" class="profile-input email-input" placeholder="Email Address">
            <button class="remove-button">
                <span class="button-icon">-</span>
            </button>
        `;
        emailFields.appendChild(emailItem);
        
        // Add event listener to remove button
        const removeButton = emailItem.querySelector('.remove-button');
        removeButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (document.querySelectorAll('.email-input').length > 1) {
                emailItem.remove();
            }
        });
        
        // Focus the new input
        emailItem.querySelector('input').focus();
    }
    
    /**
     * Save profile data from UI
     */
    saveProfile() {
        const profile = {
            givenName: document.getElementById('given-name').value,
            familyName: document.getElementById('family-name').value,
            phoneNumber: document.getElementById('phone-number').value,
            emails: Array.from(document.querySelectorAll('.email-input')).map(input => input.value).filter(email => email.trim() !== ''),
            socialAccounts: {
                x: document.getElementById('x-account').value,
                bluesky: document.getElementById('bluesky-account').value,
                wechat: document.getElementById('wechat-account').value,
                whatsapp: document.getElementById('whatsapp-account').value,
                github: document.getElementById('github-account').value
            }
        };
        
        // Update profile in manager
        this.profileManager.updateProfile(profile);
        
        // Show confirmation
        this.showSaveConfirmation();
    }
    
    /**
     * Show the profile panel
     */
    showProfile() {
        // Hide all panels
        document.querySelectorAll('.panel').forEach(panel => {
            panel.classList.remove('active');
        });
        
        // Show profile panel
        this.container.classList.add('active');
        
        // Update UI with latest data
        this.updateProfileUI();
    }
    
    /**
     * Show a save confirmation message
     */
    showSaveConfirmation() {
        // Create or get the notification element
        let notification = document.getElementById('profile-saved-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'profile-saved-notification';
            notification.style.position = 'fixed';
            notification.style.bottom = '20px';
            notification.style.right = '20px';
            notification.style.padding = '10px 20px';
            notification.style.background = 'var(--accent-primary)';
            notification.style.color = 'white';
            notification.style.borderRadius = '4px';
            notification.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
            notification.style.zIndex = '9999';
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s ease';
            
            document.body.appendChild(notification);
        }
        
        // Set message and show
        notification.textContent = 'Profile saved successfully';
        notification.style.opacity = '1';
        
        // Hide after a delay
        setTimeout(() => {
            notification.style.opacity = '0';
        }, 3000);
    }
}

// Initialize the profile UI when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // Create global instance
    window.profileUI = new ProfileUI();
    
    // Initialize after UI elements are available
    setTimeout(() => {
        window.profileUI.init();
    }, 1000);
});
