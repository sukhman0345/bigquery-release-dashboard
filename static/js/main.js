// State management
let releaseUpdates = [];
let activeTypeFilter = 'all';
let searchQuery = '';
let currentSortOrder = 'desc';
let selectedUpdateForTweet = null;

// DOM Elements
const refreshBtn = document.getElementById('refresh-btn');
const refreshIcon = document.getElementById('refresh-icon');
const searchInput = document.getElementById('search-input');
const typeFiltersContainer = document.getElementById('type-filters');
const sortSelect = document.getElementById('sort-select');
const notesGrid = document.getElementById('notes-grid');
const loadingState = document.getElementById('loading-state');
const emptyState = document.getElementById('empty-state');
const syncBanner = document.getElementById('sync-banner');
const syncMessage = document.getElementById('sync-message');

// Stats Elements
const statTotal = document.getElementById('stat-total');
const statFeatures = document.getElementById('stat-features');
const statIssues = document.getElementById('stat-issues');
const statDeprecations = document.getElementById('stat-deprecations');

// Modal Elements
const tweetModal = document.getElementById('tweet-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalContextContent = document.getElementById('modal-context-content');
const tweetTextarea = document.getElementById('tweet-textarea');
const charCount = document.getElementById('char-count');
const tweetPreviewText = document.getElementById('tweet-preview-text');
const copyTweetBtn = document.getElementById('copy-tweet-btn');
const postTweetBtn = document.getElementById('post-tweet-btn');

/* --------------------------------------------------
   API & DATA FETCHING
   -------------------------------------------------- */

/**
 * Fetch release notes from backend API
 * @param {boolean} forceRefresh - If true, bypasses server cache
 */
async function fetchReleaseNotes(forceRefresh = false) {
    showLoading(true);
    
    // Animate spin on refresh icon
    refreshIcon.classList.add('animate-spin-once');
    setTimeout(() => refreshIcon.classList.remove('animate-spin-once'), 800);
    
    try {
        const url = `/api/release-notes${forceRefresh ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        releaseUpdates = data.updates || [];
        
        // Show status banner
        showSyncBanner(data.source, forceRefresh);
        
        // Update dashboard
        updateStats();
        renderUpdates();
        
    } catch (error) {
        console.error('Error fetching release notes:', error);
        alert('Failed to load release notes. Please check your connection and try again.');
        showLoading(false);
    }
}

function showLoading(isLoading) {
    if (isLoading) {
        loadingState.classList.remove('hidden');
        notesGrid.classList.add('hidden');
        emptyState.classList.add('hidden');
    } else {
        loadingState.classList.add('hidden');
    }
}

/**
 * Display visual banner of sync source
 */
function showSyncBanner(source, isManual) {
    let message = '';
    if (isManual) {
        message = 'Refreshed! Latest release notes synchronized.';
    } else {
        message = source === 'cache' 
            ? 'Loaded from local cache. Sync\'d with GCP.' 
            : 'Synchronized with latest Google BigQuery release notes.';
    }
    
    syncMessage.textContent = message;
    syncBanner.classList.remove('hidden');
    
    // Hide banner after 5 seconds
    setTimeout(() => {
        syncBanner.classList.add('hidden');
    }, 5000);
}

/* --------------------------------------------------
   STATS & SUMMARY
   -------------------------------------------------- */
function updateStats() {
    const total = releaseUpdates.length;
    const features = releaseUpdates.filter(u => u.type === 'Feature').length;
    const issues = releaseUpdates.filter(u => u.type === 'Issue').length;
    const deprecations = releaseUpdates.filter(u => u.type === 'Deprecation').length;
    
    animateCounter(statTotal, total);
    animateCounter(statFeatures, features);
    animateCounter(statIssues, issues);
    animateCounter(statDeprecations, deprecations);
}

function animateCounter(element, targetValue) {
    element.textContent = targetValue;
}

/* --------------------------------------------------
   FILTERING, SORTING & RENDERING
   -------------------------------------------------- */

/**
 * Render updates card grid based on filters, search query, and sort order
 */
function renderUpdates() {
    showLoading(false);
    
    // 1. Filter
    let filtered = releaseUpdates.filter(update => {
        // Type filter
        const typeMatch = activeTypeFilter === 'all' || update.type === activeTypeFilter;
        
        // Search filter (fuzzy match on content, title/date, or type)
        const lowerSearch = searchQuery.toLowerCase();
        const searchMatch = !searchQuery || 
            update.text_content.toLowerCase().includes(lowerSearch) || 
            update.date.toLowerCase().includes(lowerSearch) ||
            update.type.toLowerCase().includes(lowerSearch);
            
        return typeMatch && searchMatch;
    });
    
    // 2. Sort
    filtered.sort((a, b) => {
        const dateA = new Date(a.timestamp || a.date);
        const dateB = new Date(b.timestamp || b.date);
        return currentSortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
    
    // 3. Render
    if (filtered.length === 0) {
        notesGrid.classList.add('hidden');
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    notesGrid.classList.remove('hidden');
    notesGrid.innerHTML = '';
    
    filtered.forEach((update, index) => {
        const card = document.createElement('article');
        card.className = 'note-card';
        card.style.animationDelay = `${index * 0.05}s`;
        
        // Identify correct badge class
        let typeBadgeClass = 'type-generic';
        if (update.type === 'Feature') typeBadgeClass = 'type-feature';
        else if (update.type === 'Issue') typeBadgeClass = 'type-issue';
        else if (update.type === 'Deprecation') typeBadgeClass = 'type-deprecation';
        
        card.innerHTML = `
            <div class="card-header">
                <div class="card-meta">
                    <span class="card-date">${update.date}</span>
                    <span class="card-type-badge ${typeBadgeClass}">${update.type}</span>
                </div>
                <a href="${update.link}" target="_blank" class="card-source-link" title="Open source feed entry">
                    <i class="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
            </div>
            <div class="card-body">
                ${update.content}
            </div>
            <div class="card-footer">
                <button class="btn btn-secondary btn-sm share-btn" data-id="${update.id}">
                    <i class="fa-brands fa-x-twitter"></i>
                    <span>Share Update</span>
                </button>
            </div>
        `;
        
        notesGrid.appendChild(card);
    });
    
    // Attach click events to "Share Update" buttons
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const updateId = btn.getAttribute('data-id');
            const selected = releaseUpdates.find(u => u.id === updateId);
            if (selected) openTweetModal(selected);
        });
    });
}

/* --------------------------------------------------
   TWITTER SHARING & COMPOSER MODAL
   -------------------------------------------------- */

/**
 * Formats a default tweet draft based on the release note details
 */
function generateTweetDraft(update) {
    let emoji = "📢";
    let typeLabel = "Update";
    
    if (update.type === "Feature") {
        emoji = "🚀";
        typeLabel = "Feature";
    } else if (update.type === "Issue") {
        emoji = "⚠️";
        typeLabel = "Issue/Fix";
    } else if (update.type === "Deprecation") {
        emoji = "🚫";
        typeLabel = "Deprecation";
    }
    
    const prefix = `${emoji} BigQuery ${typeLabel}: `;
    const suffix = `\n\nLink: ${update.link}`;
    
    // We reserve room for tags and URL. Max length is 280.
    const tags = " #BigQuery #GoogleCloud";
    const reservedLength = prefix.length + suffix.length + tags.length;
    const maxDescLength = 280 - reservedLength;
    
    let description = update.text_content;
    if (description.length > maxDescLength) {
        description = description.substring(0, maxDescLength - 3) + "...";
    }
    
    return `${prefix}${description}${suffix}${tags}`;
}

function openTweetModal(update) {
    selectedUpdateForTweet = update;
    
    // Display context text
    modalContextContent.textContent = `[${update.type} - ${update.date}] ${update.text_content}`;
    
    // Generate and insert default draft text
    const draftText = generateTweetDraft(update);
    tweetTextarea.value = draftText;
    
    // Update counter and preview
    updateTweetComposerState();
    
    // Display modal
    tweetModal.classList.remove('hidden');
    tweetModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Lock background scroll
    tweetTextarea.focus();
}

function closeTweetModal() {
    tweetModal.classList.add('hidden');
    tweetModal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = ''; // Unlock scroll
    selectedUpdateForTweet = null;
}

function updateTweetComposerState() {
    const text = tweetTextarea.value;
    const len = text.length;
    
    // Counter styling
    charCount.textContent = len;
    
    charCount.classList.remove('warning', 'danger');
    if (len >= 260 && len <= 280) {
        charCount.classList.add('warning');
    } else if (len > 280) {
        charCount.classList.add('danger');
    }
    
    // Disable/Enable post button based on content length
    if (len === 0 || len > 280) {
        postTweetBtn.disabled = true;
        postTweetBtn.style.opacity = '0.5';
        postTweetBtn.style.cursor = 'not-allowed';
    } else {
        postTweetBtn.disabled = false;
        postTweetBtn.style.opacity = '1';
        postTweetBtn.style.cursor = 'pointer';
    }
    
    // Update visual preview
    tweetPreviewText.textContent = text || "Start typing your post details...";
}

/* --------------------------------------------------
   EVENT LISTENERS SETUP
   -------------------------------------------------- */

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchReleaseNotes();
    
    // Sync Button
    refreshBtn.addEventListener('click', () => fetchReleaseNotes(true));
    
    // Live Search
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderUpdates();
    });
    
    // Type Filters
    typeFiltersContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('filter-badge')) {
            // Remove active class from siblings
            document.querySelectorAll('.filter-badge').forEach(b => b.classList.remove('active'));
            
            // Add active class to target
            e.target.classList.add('active');
            
            // Set state and render
            activeTypeFilter = e.target.getAttribute('data-type');
            renderUpdates();
        }
    });
    
    // Sort Select
    sortSelect.addEventListener('change', (e) => {
        currentSortOrder = e.target.value;
        renderUpdates();
    });
    
    // Close Modal Button
    closeModalBtn.addEventListener('click', closeTweetModal);
    
    // Close Modal when clicking overlay background
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) closeTweetModal();
    });
    
    // Close Modal on Escape Key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !tweetModal.classList.contains('hidden')) {
            closeTweetModal();
        }
    });
    
    // Composer Live Update
    tweetTextarea.addEventListener('input', updateTweetComposerState);
    
    // Hashtag Quick Helper insertion
    document.querySelectorAll('.tag-helper-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const hashtag = btn.getAttribute('data-tag');
            const text = tweetTextarea.value;
            
            // If already contains hashtag, ignore
            if (text.includes(hashtag)) return;
            
            // Append or insert spacing
            if (text.endsWith(' ') || text.length === 0) {
                tweetTextarea.value = text + hashtag;
            } else {
                tweetTextarea.value = text + ' ' + hashtag;
            }
            
            updateTweetComposerState();
            tweetTextarea.focus();
        });
    });
    
    // Copy Draft Tweet Button
    copyTweetBtn.addEventListener('click', async () => {
        const text = tweetTextarea.value;
        try {
            await navigator.clipboard.writeText(text);
            
            // Feedback animation
            const icon = copyTweetBtn.querySelector('i');
            const label = copyTweetBtn.querySelector('span');
            
            icon.className = 'fa-solid fa-check text-green';
            label.textContent = 'Copied!';
            copyTweetBtn.classList.add('success-border');
            
            setTimeout(() => {
                icon.className = 'fa-regular fa-copy';
                label.textContent = 'Copy Text';
                copyTweetBtn.classList.remove('success-border');
            }, 2000);
            
        } catch (err) {
            console.error('Failed to copy text: ', err);
            alert('Failed to copy to clipboard.');
        }
    });
    
    // Post Tweet on X (Twitter Intent Link)
    postTweetBtn.addEventListener('click', () => {
        const text = tweetTextarea.value;
        if (text.length === 0 || text.length > 280) return;
        
        const encodedText = encodeURIComponent(text);
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
        
        window.open(twitterUrl, '_blank', 'width=550,height=420,scrollbars=yes,resizable=yes');
    });
});
