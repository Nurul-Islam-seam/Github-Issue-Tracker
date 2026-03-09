// Authentication check
const AUTH_MODULE = (() => {
    const TOKEN_KEY = 'auth_token';
    const USERNAME_KEY = 'username';

    const getUsername = () => {
        return localStorage.getItem(USERNAME_KEY);
    };

    const clearAuth = () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USERNAME_KEY);
    };

    const isAuthenticated = () => {
        return !!localStorage.getItem(TOKEN_KEY);
    };

    return {
        getUsername,
        clearAuth,
        isAuthenticated
    };
})();

// API Module
const API_MODULE = (() => {
    const BASE_URL = 'https://phi-lab-server.vercel.app/api/v1/lab';

    const extractPayload = (responseJson) => {
        if (Array.isArray(responseJson)) return responseJson;
        if (responseJson && Array.isArray(responseJson.data)) return responseJson.data;
        if (responseJson && Array.isArray(responseJson.issues)) return responseJson.issues;
        return [];
    };

    const extractSinglePayload = (responseJson) => {
        if (responseJson && responseJson.data && !Array.isArray(responseJson.data)) {
            return responseJson.data;
        }
        if (responseJson && !Array.isArray(responseJson)) {
            return responseJson;
        }
        return null;
    };

    const getAllIssues = async () => {
        try {
            const response = await fetch(`${BASE_URL}/issues`);
            if (!response.ok) throw new Error('Failed to fetch issues');
            const json = await response.json();
            return extractPayload(json);
        } catch (error) {
            console.error('Error fetching issues:', error);
            return [];
        }
    };

    const getSingleIssue = async (id) => {
        try {
            const response = await fetch(`${BASE_URL}/issue/${id}`);
            if (!response.ok) throw new Error('Failed to fetch issue');
            const json = await response.json();
            return extractSinglePayload(json);
        } catch (error) {
            console.error('Error fetching issue:', error);
            return null;
        }
    };

    const searchIssues = async (query) => {
        try {
            const response = await fetch(`${BASE_URL}/issues/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Failed to search issues');
            const json = await response.json();
            return extractPayload(json);
        } catch (error) {
            console.error('Error searching issues:', error);
            return [];
        }
    };

    return {
        getAllIssues,
        getSingleIssue,
        searchIssues
    };
})();

// State Management
const STATE = {
    allIssues: [],
    filteredIssues: [],
    currentTab: 'all',
    isSearching: false,
    searchQuery: ''
};

const TAB_LABELS = {
    all: 'All',
    open: 'Open',
    closed: 'Closed'
};

// UI Elements
const issuesGrid = document.getElementById('issuesGrid');
const loadingSpinner = document.getElementById('loadingSpinner');
const noResults = document.getElementById('noResults');
const issueCount = document.getElementById('issueCount');
const infoText = document.getElementById('infoText');
const tabButtons = document.querySelectorAll('.tab-btn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const logoutBtn = document.getElementById('logoutBtn');
const issueModal = document.getElementById('issueModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.querySelector('.modal-close');

// ============= Initialization =============
document.addEventListener('DOMContentLoaded', () => {
    // Check authentication
    if (!AUTH_MODULE.isAuthenticated()) {
        window.location.href = 'index.html';
        return;
    }

    // Initialize app
    initializeEventListeners();
    setActiveTabButton(STATE.currentTab);
    loadIssues();
});

// ============= Event Listeners =============
const initializeEventListeners = () => {
    // Tab buttons
    tabButtons.forEach(btn => {
        btn.addEventListener('click', handleTabClick);
    });

    // Search
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Logout
    logoutBtn.addEventListener('click', handleLogout);

    // Modal
    modalClose.addEventListener('click', closeModal);
    issueModal.addEventListener('click', (e) => {
        if (e.target === issueModal) {
            closeModal();
        }
    });

    // Clear search on input clear
    searchInput.addEventListener('input', (e) => {
        if (e.target.value === '' && STATE.isSearching) {
            STATE.isSearching = false;
            STATE.searchQuery = '';
            filterAndDisplayIssues();
        }
    });
};

// ============= Issue Loading =============
const loadIssues = async () => {
    showLoadingSpinner(true);
    try {
        const issues = await API_MODULE.getAllIssues();
        STATE.allIssues = Array.isArray(issues) ? issues : [];
        filterAndDisplayIssues();
    } finally {
        showLoadingSpinner(false);
    }
};

// ============= Tab Handling =============
const handleTabClick = (e) => {
    const tabBtn = e.currentTarget;
    const tabName = tabBtn.dataset.tab;

    setActiveTabButton(tabName);

    // Update state and display
    STATE.currentTab = tabName;
    STATE.isSearching = false;
    STATE.searchQuery = '';
    searchInput.value = '';

    filterAndDisplayIssues();
};

const setActiveTabButton = (tabName) => {
    tabButtons.forEach(btn => {
        const isActive = btn.dataset.tab === tabName;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', String(isActive));
    });
};

// ============= Filtering & Display =============
const filterAndDisplayIssues = () => {
    let issuesToDisplay = STATE.allIssues;

    // Apply tab filter
    if (STATE.currentTab === 'open') {
        issuesToDisplay = issuesToDisplay.filter(issue => 
            issue.state === 'open' || issue.status === 'open'
        );
    } else if (STATE.currentTab === 'closed') {
        issuesToDisplay = issuesToDisplay.filter(issue => 
            issue.state === 'closed' || issue.status === 'closed'
        );
    }

    // Apply search filter
    if (STATE.isSearching && STATE.searchQuery) {
        const query = STATE.searchQuery.toLowerCase();
        issuesToDisplay = issuesToDisplay.filter(issue => 
            (issue.title && issue.title.toLowerCase().includes(query)) ||
            (issue.description && issue.description.toLowerCase().includes(query))
        );
    }

    STATE.filteredIssues = issuesToDisplay;
    displayIssues(issuesToDisplay);
    updateIssueCount(issuesToDisplay.length);
};

const displayIssues = (issues) => {
    issuesGrid.innerHTML = '';

    if (issues.length === 0) {
        issuesGrid.classList.add('hidden');
        noResults.classList.remove('hidden');
        return;
    }

    issuesGrid.classList.remove('hidden');
    noResults.classList.add('hidden');

    issues.forEach(issue => {
        const card = createIssueCard(issue);
        issuesGrid.appendChild(card);
    });
};

const createIssueCard = (issue) => {
    const card = document.createElement('div');
    const status = issue.state || issue.status || 'unknown';
    const cardClass = status === 'open' ? 'open' : 'closed';

    const formattedDate = formatDate(issue.createdAt || issue.created_at);
    const priority = issue.priority || 'medium';
    const priorityClass = getPriorityClass(priority);

    card.className = `issue-card ${cardClass}`;
    card.innerHTML = `
        <div class="issue-card-header">
            <h3 class="issue-title">${escapeHtml(issue.title)}</h3>
            ${renderStatusPill(status)}
        </div>
        
        <p class="issue-description">${escapeHtml(issue.description || 'No description provided')}</p>
        
        <div class="issue-meta">
            <div class="meta-item">
                <strong>Priority:</strong>
                <span class="priority-badge ${priorityClass}">${priority}</span>
            </div>
            ${issue.labels && issue.labels.length > 0 ? `
                <div class="meta-item">
                    <strong>Labels:</strong>
                    ${issue.labels.slice(0, 2).map(label => renderLabelChip(label)).join('')}
                </div>
            ` : ''}
        </div>
        
        <div class="issue-footer">
            <div class="issue-author">
                <strong>${escapeHtml(issue.author || 'Unknown')}</strong>
            </div>
            <div class="issue-date">${formattedDate}</div>
        </div>
    `;

    card.addEventListener('click', () => openModal(issue));
    return card;
};

// ============= Modal =============
const openModal = async (issue) => {
    const fullIssue = await API_MODULE.getSingleIssue(issue.id);
    const issueData = fullIssue || issue;
    
    const status = issueData.state || issueData.status || 'unknown';
    const priority = issueData.priority || 'medium';
    const priorityClass = getPriorityClass(priority);

    modalBody.innerHTML = `
        <div class="modal-header">
            <h2 class="modal-title">${escapeHtml(issueData.title)}</h2>
            ${renderStatusPill(status, 'modal-status-pill')}
        </div>

        <div class="modal-section">
            <div class="modal-section-title">Description</div>
            <div class="modal-section-content">
                ${escapeHtml(issueData.description || 'No description provided')}
            </div>
        </div>

        <div class="modal-meta-grid">
            <div class="modal-meta-item">
                <div class="modal-meta-label">Status</div>
                <div class="modal-meta-value">${renderStatusPill(status, 'modal-status-pill compact')}</div>
            </div>
            <div class="modal-meta-item">
                <div class="modal-meta-label">Priority</div>
                <div class="modal-meta-value">
                    <span class="priority-badge ${priorityClass}">${priority}</span>
                </div>
            </div>
            <div class="modal-meta-item">
                <div class="modal-meta-label">Author</div>
                <div class="modal-meta-value">${escapeHtml(issueData.author || 'Unknown')}</div>
            </div>
            <div class="modal-meta-item">
                <div class="modal-meta-label">Created At</div>
                <div class="modal-meta-value">${formatDate(issueData.createdAt || issueData.created_at)}</div>
            </div>
        </div>

        ${issueData.labels && issueData.labels.length > 0 ? `
            <div class="modal-section">
                <div class="modal-section-title">Labels</div>
                <div class="modal-labels">
                    ${issueData.labels.map(label => renderLabelChip(label, 'modal-label')).join('')}
                </div>
            </div>
        ` : ''}

        ${issueData.assignee ? `
            <div class="modal-section">
                <div class="modal-section-title">Assignee</div>
                <div class="modal-section-content">${escapeHtml(issueData.assignee)}</div>
            </div>
        ` : ''}
    `;

    issueModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
};

const closeModal = () => {
    issueModal.classList.add('hidden');
    document.body.style.overflow = 'auto';
};

// ============= Search =============
const handleSearch = async () => {
    const query = searchInput.value.trim();

    if (!query) {
        STATE.isSearching = false;
        STATE.searchQuery = '';
        filterAndDisplayIssues();
        return;
    }

    showLoadingSpinner(true);
    try {
        const results = await API_MODULE.searchIssues(query);
        const searchResults = Array.isArray(results) ? results : [];

        STATE.isSearching = true;
        STATE.searchQuery = query;
        STATE.filteredIssues = searchResults;

        displayIssues(searchResults);
        updateIssueCount(searchResults.length);
        updateTabInfo(`Search results for "${query}"`);
    } finally {
        showLoadingSpinner(false);
    }
};

// ============= UI Updates =============
const updateIssueCount = (count) => {
    const tabLabel = TAB_LABELS[STATE.currentTab] || 'All';
    issueCount.textContent = count;
    infoText.textContent = `${tabLabel} ${count === 1 ? 'issue' : 'issues'}`;
};

const updateTabInfo = (text) => {
    infoText.textContent = text;
};

const showLoadingSpinner = (show) => {
    if (show) {
        issuesGrid.classList.add('hidden');
        noResults.classList.add('hidden');
        loadingSpinner.classList.remove('hidden');
    } else {
        loadingSpinner.classList.add('hidden');
    }
};

// ============= Logout =============
const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
        AUTH_MODULE.clearAuth();
        window.location.href = 'index.html';
    }
};

// ============= Utility Functions =============
const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years}y ago`;
    if (months > 0) return `${months}mo ago`;
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'Just now';
};

const getPriorityClass = (priority) => {
    if (!priority) return 'low';
    const lowerPriority = priority.toLowerCase();
    if (lowerPriority === 'high') return 'high';
    if (lowerPriority === 'medium') return 'medium';
    return 'low';
};

const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

const getStatusAssetPath = (status) => {
    const normalizedStatus = String(status || '').toLowerCase();
    return normalizedStatus === 'closed'
        ? 'assets/Closed- Status .png'
        : 'assets/Open-Status.png';
};

const renderStatusPill = (status, extraClass = '') => {
    const normalizedStatus = String(status || 'open').toLowerCase();
    const statusLabel = normalizedStatus === 'closed' ? 'Closed' : 'Open';
    const className = `status-pill ${normalizedStatus} ${extraClass}`.trim();

    return `
        <span class="${className}">
            <img src="${getStatusAssetPath(normalizedStatus)}" alt="${statusLabel} status" class="status-pill-icon">
            <span>${statusLabel}</span>
        </span>
    `;
};

const renderLabelChip = (label, extraClass = '') => {
    const safeLabel = escapeHtml(label || '');
    const normalizedLabel = String(label || '').trim().toLowerCase();
    const className = `${extraClass} label-chip ${normalizedLabel === 'help wanted' ? 'label-help-wanted' : ''}`.trim();

    if (normalizedLabel === 'help wanted') {
        return `
            <span class="${className}">
                <img src="assets/Aperture.png" alt="Help Wanted" class="label-chip-icon">
                <span>${safeLabel}</span>
            </span>
        `;
    }

    return `<span class="${className}">${safeLabel}</span>`;
};
