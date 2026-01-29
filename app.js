// Scientific Substitutions - Main Application Logic

// Supabase Configuration
const SUPABASE_URL = 'https://bplzudmselhnzzucqibg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwbHp1ZG1zZWxobnp6dWNxaWJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3MDc0MTcsImV4cCI6MjA4NTI4MzQxN30.DxvVdQi4YOgyVJAiSI92vEh6HnJE5_3ilZWRqfASQPA';

// Supabase client (initialized later if configured)
let supabaseClient = null;

// State
let ingredients = {};
let selectedIngredient = null;
let currentContext = 'baking';
let globalStats = { searches: {}, votes: {}, totalSearches: 0 };
const USER_VOTES_KEY = 'scientificSubstitutions_userVotes';
const USER_HISTORY_KEY = 'scientificSubstitutions_history';

// DOM Elements
const searchSection = document.getElementById('search-section');
const resultsSection = document.getElementById('results-section');
const ingredientSearch = document.getElementById('ingredient-search');
const searchResults = document.getElementById('search-results');
const resultsContainer = document.getElementById('results-container');

// Initialize
async function init() {
    try {
        // Initialize Supabase if configured
        if (SUPABASE_URL !== 'YOUR_SUPABASE_URL' && window.supabase && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }

        const response = await fetch('data/substitutions.json');
        ingredients = await response.json();
        setupEventListeners();

        // Load global stats from Supabase (if configured)
        if (supabaseClient) {
            await loadGlobalStats();
        }

        updatePopularSwaps();
        updateSwapCounter();
        ingredientSearch.focus();
    } catch (error) {
        console.error('Failed to load ingredients:', error);
    }
}

// Event Listeners
function setupEventListeners() {
    // Search
    ingredientSearch.addEventListener('input', handleSearch);
    ingredientSearch.addEventListener('focus', handleSearch);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.classList.add('hidden');
        }
    });

    // Back button
    document.getElementById('back-to-search').addEventListener('click', () => {
        resultsSection.classList.add('hidden');
        searchSection.classList.remove('hidden');
        ingredientSearch.value = '';
        ingredientSearch.focus();
    });

    // Context tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentContext = tab.dataset.context;
            if (selectedIngredient) {
                displaySubstitutions(ingredients[selectedIngredient]);
            }
        });
    });

}

// Search Handler
function handleSearch() {
    const query = ingredientSearch.value.toLowerCase().trim();

    if (query.length === 0) {
        showAllIngredients();
        return;
    }

    const matches = Object.entries(ingredients).filter(([key, data]) => {
        return key.includes(query) ||
               data.name.toLowerCase().includes(query) ||
               (data.aliases && data.aliases.some(a => a.toLowerCase().includes(query)));
    });

    displaySearchResults(matches);
}

// Show all ingredients
function showAllIngredients() {
    const allIngredients = Object.entries(ingredients);
    displaySearchResults(allIngredients, true);
}

// Display search dropdown
function displaySearchResults(matches, showRecent = false) {
    if (matches.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item"><span class="name">No ingredients found</span></div>';
        searchResults.classList.remove('hidden');
        return;
    }

    // Sort alphabetically by name
    matches.sort((a, b) => a[1].name.localeCompare(b[1].name));

    let html = '';

    // Show recent section if applicable
    if (showRecent) {
        const history = getUserHistory();
        const recentItems = history
            .filter(key => ingredients[key])
            .slice(0, 5);

        if (recentItems.length > 0) {
            html += '<div class="search-section-label">Recent</div>';
            html += recentItems.map(key => {
                const data = ingredients[key];
                return `
                    <div class="search-result-item" data-key="${key}">
                        <div class="name">${data.name}</div>
                        <div class="category">${formatCategory(data.category)}</div>
                    </div>
                `;
            }).join('');
            html += '<div class="search-section-label">All Ingredients</div>';
        }
    }

    html += matches.map(([key, data]) => `
        <div class="search-result-item" data-key="${key}">
            <div class="name">${data.name}</div>
            <div class="category">${formatCategory(data.category)}</div>
        </div>
    `).join('');

    searchResults.innerHTML = html;

    searchResults.querySelectorAll('.search-result-item').forEach(item => {
        item.addEventListener('click', () => {
            const key = item.dataset.key;
            if (key && ingredients[key]) {
                selectIngredient(key);
            }
        });
    });

    searchResults.classList.remove('hidden');
}

// Select ingredient
function selectIngredient(key) {
    selectedIngredient = key;
    const data = ingredients[key];

    // Track this search for popularity and personal history
    trackSearch(key);
    addToUserHistory(key);

    document.getElementById('selected-ingredient').textContent = data.name;
    document.getElementById('ingredient-function').textContent = data.properties.function;

    // Reset to "Baking" tab
    currentContext = 'baking';
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector('.tab[data-context="baking"]').classList.add('active');

    displaySubstitutions(data);

    searchSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    searchResults.classList.add('hidden');
}

// Display substitutions
function displaySubstitutions(ingredientData) {
    const subs = ingredientData.substitutions;

    // Filter by context
    const filteredSubs = subs.filter(sub => sub.context.includes(currentContext));
    const otherContext = currentContext === 'baking' ? 'cooking' : 'baking';

    if (filteredSubs.length === 0) {
        resultsContainer.innerHTML = `
            <div class="no-results">
                <p>No substitutions available for ${currentContext}.</p>
                <p>Try switching to ${otherContext} to see other options.</p>
            </div>
        `;
        return;
    }

    // Sort by reliability
    const reliabilityOrder = { excellent: 0, good: 1, fair: 2 };
    filteredSubs.sort((a, b) => reliabilityOrder[a.reliability] - reliabilityOrder[b.reliability]);

    // Count subs available in other context
    const otherContextSubs = subs.filter(sub => sub.context.includes(otherContext) && !sub.context.includes(currentContext));

    let html = '';

    if (otherContextSubs.length > 0) {
        html += `
            <div class="context-notice">
                ${otherContextSubs.length} more substitution${otherContextSubs.length > 1 ? 's' : ''} available for ${otherContext}.
            </div>
        `;
    }

    html += filteredSubs.map((sub, index) => {
        const isWarning = sub.notes && (
            sub.notes.toLowerCase().includes('not recommended') ||
            sub.notes.toLowerCase().includes('not for')
        );
        const cardId = `card-${Date.now()}-${index}`;
        // Create a stable vote ID based on ingredient and substitution name
        const voteId = `${selectedIngredient}-${sub.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

        return `
            <div class="sub-card">
                <div class="sub-card-header">
                    <span class="sub-name">${sub.name}</span>
                    <span class="reliability-badge ${sub.reliability}">${sub.reliability}</span>
                </div>
                <div class="sub-ratio">${sub.ratio}</div>
                <div class="sub-details">
                    <p>${sub.why}</p>
                </div>
                ${sub.notes ? `<div class="${isWarning ? 'sub-warning' : 'sub-note'}">${sub.notes}</div>` : ''}
                ${sub.science ? `
                    <button class="science-toggle" onclick="toggleScience('${cardId}')">
                        <span class="toggle-icon">▼</span> 🔬 The Science
                    </button>
                    <div class="science-content hidden" id="${cardId}">
                        ${sub.science}
                    </div>
                ` : ''}
                ${getVoteButtonsHTML(voteId)}
            </div>
        `;
    }).join('');

    resultsContainer.innerHTML = html;
}

// Format category
function formatCategory(category) {
    const categories = {
        dairy: 'Dairy',
        leavening: 'Leavening',
        eggs: 'Eggs',
        fats: 'Fats & Oils',
        sweeteners: 'Sweeteners',
        acids: 'Acids',
        thickeners: 'Thickeners',
        asian: 'Asian',
        alcohol: 'Cooking Alcohol',
        flour: 'Flour',
        chocolate: 'Chocolate',
        condiments: 'Condiments',
        flavorings: 'Flavorings'
    };
    return categories[category] || category;
}

// Voting System
function getUserVotes() {
    try {
        const data = localStorage.getItem(USER_VOTES_KEY);
        return data ? JSON.parse(data) : {};
    } catch {
        return {};
    }
}

function saveUserVotes(userVotes) {
    try {
        localStorage.setItem(USER_VOTES_KEY, JSON.stringify(userVotes));
    } catch {
        // localStorage might be full
    }
}

async function handleVote(voteId, voteType) {
    const userVotes = getUserVotes();
    const currentUserVote = userVotes[voteId];

    // Initialize vote counts if not exists
    if (!globalStats.votes[voteId]) {
        globalStats.votes[voteId] = { up: 0, down: 0 };
    }

    let action = 'add';

    // If clicking the same vote type, toggle it off
    if (currentUserVote === voteType) {
        globalStats.votes[voteId][voteType]--;
        delete userVotes[voteId];
        action = 'remove';
    } else {
        // If switching votes, remove old vote first
        if (currentUserVote) {
            globalStats.votes[voteId][currentUserVote]--;
        }
        // Add new vote
        globalStats.votes[voteId][voteType]++;
        userVotes[voteId] = voteType;
        action = currentUserVote ? 'switch' : 'add';
    }

    saveUserVotes(userVotes);
    updateVoteButtons(voteId);

    // Sync to Supabase
    if (supabaseClient) {
        try {
            await supabaseClientClient.rpc('update_vote', {
                vote_id_param: voteId,
                vote_type: voteType,
                action: action,
                previous_vote: currentUserVote || null
            });
        } catch (error) {
            console.error('Failed to sync vote:', error);
        }
    }
}

function updateVoteButtons(voteId) {
    const userVotes = getUserVotes();
    const voteData = globalStats.votes[voteId] || { up: 0, down: 0 };
    const userVote = userVotes[voteId];

    const upBtn = document.querySelector(`[data-vote-id="${voteId}"][data-vote-type="up"]`);
    const downBtn = document.querySelector(`[data-vote-id="${voteId}"][data-vote-type="down"]`);

    if (upBtn) {
        upBtn.classList.toggle('active-up', userVote === 'up');
        upBtn.querySelector('.vote-count').textContent = voteData.up;
    }

    if (downBtn) {
        downBtn.classList.toggle('active-down', userVote === 'down');
        downBtn.querySelector('.vote-count').textContent = voteData.down;
    }
}

function getVoteButtonsHTML(voteId) {
    const userVotes = getUserVotes();
    const voteData = globalStats.votes[voteId] || { up: 0, down: 0 };
    const userVote = userVotes[voteId];

    return `
        <div class="vote-section">
            <span class="vote-label">Helpful?</span>
            <button class="vote-btn ${userVote === 'up' ? 'active-up' : ''}"
                    data-vote-id="${voteId}"
                    data-vote-type="up"
                    onclick="handleVote('${voteId}', 'up')">
                <span class="vote-icon">👍</span>
                <span class="vote-count">${voteData.up}</span>
            </button>
            <button class="vote-btn ${userVote === 'down' ? 'active-down' : ''}"
                    data-vote-id="${voteId}"
                    data-vote-type="down"
                    onclick="handleVote('${voteId}', 'down')">
                <span class="vote-icon">👎</span>
                <span class="vote-count">${voteData.down}</span>
            </button>
        </div>
    `;
}

// Toggle science explanation
function toggleScience(cardId) {
    const content = document.getElementById(cardId);
    const button = content.previousElementSibling;
    const icon = button.querySelector('.toggle-icon');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.textContent = '▲';
        button.classList.add('active');
    } else {
        content.classList.add('hidden');
        icon.textContent = '▼';
        button.classList.remove('active');
    }
}

// User Search History (personal, localStorage)
function getUserHistory() {
    try {
        const data = localStorage.getItem(USER_HISTORY_KEY);
        return data ? JSON.parse(data) : [];
    } catch {
        return [];
    }
}

function addToUserHistory(ingredientKey) {
    let history = getUserHistory();

    // Remove if already exists (we'll add to front)
    history = history.filter(key => key !== ingredientKey);

    // Add to front
    history.unshift(ingredientKey);

    // Keep only last 10 (we show 5, but keep more for filtering)
    history = history.slice(0, 10);

    try {
        localStorage.setItem(USER_HISTORY_KEY, JSON.stringify(history));
    } catch {
        // localStorage might be full
    }
}

// Global Stats - Supabase Integration
async function loadGlobalStats() {
    if (!supabaseClient) return;

    try {
        // Load search counts
        const { data: searches } = await supabaseClient
            .from('ingredient_searches')
            .select('ingredient_key, count');

        if (searches) {
            globalStats.searches = {};
            globalStats.totalSearches = 0;
            searches.forEach(row => {
                globalStats.searches[row.ingredient_key] = row.count;
                globalStats.totalSearches += row.count;
            });
        }

        // Load vote counts
        const { data: votes } = await supabaseClient
            .from('substitution_votes')
            .select('vote_id, up_count, down_count');

        if (votes) {
            globalStats.votes = {};
            votes.forEach(row => {
                globalStats.votes[row.vote_id] = { up: row.up_count, down: row.down_count };
            });
        }

        updatePopularSwaps();
        updateSwapCounter();
    } catch (error) {
        console.error('Failed to load global stats:', error);
    }
}

async function trackSearch(ingredientKey) {
    // Update local state immediately for responsive UI
    globalStats.searches[ingredientKey] = (globalStats.searches[ingredientKey] || 0) + 1;
    globalStats.totalSearches++;
    updatePopularSwaps();
    updateSwapCounter();

    // Sync to Supabase
    if (supabaseClient) {
        try {
            await supabaseClientClient.rpc('increment_search', { ingredient: ingredientKey });
        } catch (error) {
            console.error('Failed to track search:', error);
        }
    }
}

function updateSwapCounter() {
    const counterEl = document.getElementById('swap-counter');
    const numberEl = document.getElementById('counter-number');

    if (globalStats.totalSearches > 0) {
        numberEl.textContent = globalStats.totalSearches.toLocaleString();
        counterEl.classList.remove('hidden');
    } else {
        counterEl.classList.add('hidden');
    }
}

function updatePopularSwaps() {
    const popularSection = document.getElementById('popular-swaps');
    const popularList = document.getElementById('popular-list');

    // Get top 6 most searched ingredients
    const sorted = Object.entries(globalStats.searches)
        .filter(([key]) => ingredients[key])
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

    if (sorted.length === 0) {
        popularSection.classList.add('hidden');
        return;
    }

    popularSection.classList.remove('hidden');

    popularList.innerHTML = sorted.map(([key, count]) => {
        const data = ingredients[key];
        return `
            <div class="popular-item" data-key="${key}">
                <div class="popular-item-info">
                    <span class="item-name">${data.name}</span>
                    <span class="item-meta">${formatCategory(data.category)}</span>
                </div>
                <span class="item-searches">${count} search${count !== 1 ? 'es' : ''}</span>
            </div>
        `;
    }).join('');

    popularList.querySelectorAll('.popular-item').forEach(item => {
        item.addEventListener('click', () => {
            const key = item.dataset.key;
            if (key && ingredients[key]) {
                selectIngredient(key);
            }
        });
    });
}

// Start
document.addEventListener('DOMContentLoaded', init);
