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

// Footer quotes (randomly selected on each page load)
const FOOTER_QUOTES = [
    "The kitchen is a laboratory where science creates art.",
    "Cooking is chemistry. And chemistry is life.",
    "Cooking isn't magic, it's just chemistry, thermal dynamics, and a little art."
];

// Ingredient descriptions for Popular Swaps display
const INGREDIENT_DESCRIPTIONS = {
    all_purpose_flour: 'The base of most baked goods',
    almond_flour: 'Gluten-free, low-carb alternative',
    anchovy_paste: 'Umami depth in sauces and dressings',
    apple_cider_vinegar: 'Tangy acid for dressings and baking',
    baking_powder: 'Chemical leavening for quick breads',
    baking_soda: 'Activates with acid for rise',
    balsamic_vinegar: 'Rich, sweet-tangy finishing acid',
    black_pepper: 'Essential aromatic heat',
    bread_flour: 'High-protein for chewy breads',
    brown_sugar: 'Molasses-rich sweetness and moisture',
    butter: 'The gold standard of baking fats',
    buttermilk: 'Tangy dairy for tender baked goods',
    cake_flour: 'Low-protein for delicate crumb',
    capers: 'Briny pop in Mediterranean dishes',
    cheddar: 'Sharp, melty cheese for any dish',
    chicken_broth: 'Savory liquid base for cooking',
    cocoa_powder: 'Pure chocolate flavor for baking',
    coconut_cream: 'Rich dairy-free cream alternative',
    coconut_flour: 'Highly absorbent gluten-free flour',
    coconut_milk_canned: 'Creamy base for curries and desserts',
    cornstarch: 'Silky thickener for sauces',
    cream_cheese: 'Tangy spread and baking essential',
    cream_of_tartar: 'Stabilizes egg whites and activates soda',
    creme_fraiche: 'Rich, tangy French cream',
    dijon_mustard: 'Sharp, smooth emulsifier',
    dried_herbs: 'Concentrated flavor for slow cooking',
    egg_whites: 'Protein for structure and foam',
    egg_yolks: 'Rich emulsifier and thickener',
    eggs: 'Binding, leavening, and structure',
    evaporated_milk: 'Concentrated milk for richness',
    feta: 'Salty, crumbly Greek cheese',
    fish_sauce: 'Funky umami bomb',
    fresh_garlic: 'Aromatic foundation flavor',
    fresh_ginger: 'Bright, spicy warmth',
    fresh_herbs: 'Bright finishing flavors',
    gelatin: 'Sets liquids into gels',
    gochujang: 'Korean fermented chili paste',
    guar_gum: 'Gluten-free binding and thickening',
    half_and_half: 'Light cream for coffee and cooking',
    heavy_cream: 'Rich fat for whipping and sauces',
    hoisin_sauce: 'Sweet-savory Chinese glaze',
    honey: 'Natural liquid sweetener',
    lard: 'Traditional fat for flaky pastry',
    lemon_juice: 'Bright acid and freshness',
    maple_syrup: 'Complex natural sweetness',
    milk: 'Essential liquid dairy',
    mirin: 'Sweet Japanese rice wine',
    miso: 'Fermented umami paste',
    molasses: 'Deep, bittersweet syrup',
    nutritional_yeast: 'Cheesy vegan seasoning',
    oat_flour: 'Hearty whole grain flour',
    oyster_sauce: 'Rich, briny Chinese sauce',
    parmesan: 'Sharp, nutty aged cheese',
    peanut_butter: 'Creamy nut spread',
    pectin: 'Natural fruit-based gelling',
    powdered_sugar: 'Fine sugar for frostings',
    red_wine: 'Depth for braises and sauces',
    rice_vinegar: 'Mild Asian cooking acid',
    ricotta: 'Creamy, mild fresh cheese',
    sake: 'Japanese rice wine for cooking',
    sambal_oelek: 'Pure chili paste heat',
    self_rising_flour: 'Pre-mixed with leavening',
    semisweet_chocolate: 'Balanced sweet chocolate',
    sesame_oil: 'Nutty Asian finishing oil',
    shaoxing_wine: 'Chinese cooking wine',
    shortening: 'Neutral fat for flaky texture',
    sour_cream: 'Tangy cultured dairy',
    soy_sauce: 'Salty umami essential',
    sriracha: 'Garlicky hot sauce',
    sweetened_condensed_milk: 'Thick, sweet milk for desserts',
    tahini: 'Creamy sesame seed paste',
    tomato_paste: 'Concentrated tomato umami',
    unsweetened_chocolate: 'Pure cacao for baking',
    vanilla_extract: 'Warm, sweet aromatic',
    vegetable_broth: 'Savory plant-based liquid',
    white_sugar: 'Pure sweetness and structure',
    white_wine: 'Bright acid for deglazing',
    worcestershire_sauce: 'Complex savory seasoning',
    xanthan_gum: 'Powerful gluten-free binder',
    yeast: 'Living leavening for bread',
    yogurt: 'Tangy cultured dairy'
};

// Default featured swaps (shown when no search data exists)
const DEFAULT_FEATURED = ['butter', 'eggs', 'buttermilk', 'all_purpose_flour'];

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

        renderFeaturedSwaps();
        updateSwapCounter();
        setRandomFooterQuote();

        // Check for ingredient in URL hash and restore state
        const hash = window.location.hash.slice(1);
        if (hash && ingredients[hash]) {
            selectIngredient(hash, true);
        }
    } catch (error) {
        console.error('Failed to load ingredients:', error);
    }
}

// Navigate back to search
function goToSearch(skipHistory = false) {
    resultsSection.classList.add('hidden');
    searchSection.classList.remove('hidden');
    document.querySelector('.container').classList.remove('viewing-results');
    ingredientSearch.value = '';
    selectedIngredient = null;

    if (!skipHistory) {
        history.pushState(null, '', window.location.pathname);
    }
}

function setRandomFooterQuote() {
    const tagline = document.querySelector('.footer-tagline');
    if (tagline) {
        const randomQuote = FOOTER_QUOTES[Math.floor(Math.random() * FOOTER_QUOTES.length)];
        tagline.innerHTML = `<em>${randomQuote}</em>`;
    }
}

// Event Listeners
function setupEventListeners() {
    // Search
    ingredientSearch.addEventListener('input', handleSearch);
    ingredientSearch.addEventListener('focus', handleSearch);
    ingredientSearch.addEventListener('click', handleSearch);

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.classList.add('hidden');
        }
    });

    // Back button
    document.getElementById('back-to-search').addEventListener('click', () => {
        goToSearch();
    });

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.slice(1);
        if (hash && ingredients[hash]) {
            selectIngredient(hash, true);
        } else {
            goToSearch(true);
        }
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
function selectIngredient(key, skipHistory = false) {
    selectedIngredient = key;
    const data = ingredients[key];

    // Update URL hash for persistence
    if (!skipHistory) {
        window.location.hash = key;
    }

    // Track this search for popularity and personal history
    trackSearch(key);
    addToUserHistory(key);

    document.getElementById('selected-ingredient').textContent = data.name;
    document.getElementById('ingredient-function').textContent = data.properties.function;

    // Check which contexts have substitutions
    const hasBaking = data.substitutions.some(sub => sub.context.includes('baking'));
    const hasCooking = data.substitutions.some(sub => sub.context.includes('cooking'));

    // Default to baking, but switch if no baking subs available
    if (hasBaking) {
        currentContext = 'baking';
    } else if (hasCooking) {
        currentContext = 'cooking';
    } else {
        currentContext = 'baking'; // fallback
    }

    // Update tab UI
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tab[data-context="${currentContext}"]`).classList.add('active');

    displaySubstitutions(data);

    searchSection.classList.add('hidden');
    resultsSection.classList.remove('hidden');
    searchResults.classList.add('hidden');
    document.querySelector('.container').classList.add('viewing-results');
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
                    <div class="science-section">
                        <div class="science-preview" onclick="toggleScience('${cardId}')">
                            <span class="science-label">🔬 The Science</span>
                            <span class="science-teaser">${getScienceTeaser(sub.science)}</span>
                            <span class="toggle-icon" id="icon-${cardId}">▼</span>
                        </div>
                        <div class="science-content hidden" id="${cardId}">
                            ${sub.science}
                        </div>
                    </div>
                ` : ''}
                ${getVoteButtonsHTML(voteId)}
            </div>
        `;
    }).join('');

    resultsContainer.innerHTML = html;
}

// Category emoji mapping
const CATEGORY_EMOJIS = {
    dairy: '🥛',
    leavening: '🫧',
    eggs: '🥚',
    fats: '🧈',
    sweeteners: '🍯',
    acids: '🍋',
    thickeners: '🥣',
    asian: '🥢',
    alcohol: '🍷',
    flour: '🌾',
    chocolate: '🍫',
    condiments: '🫙',
    cheese: '🧀',
    pantry: '🥫',
    broth: '🍲',
    vegan: '🌱',
    nut_butters: '🥫',
    seasonings: '🌿',
    herbs: '🌿',
    aromatics: '🌿',
    flavorings: '🌿',
    spices: '🌿'
};

// Get just the emoji for a category
function getCategoryEmoji(category) {
    return CATEGORY_EMOJIS[category] || '';
}

// Format category with emoji
function formatCategory(category) {
    const categories = {
        dairy: 'Dairy 🥛',
        leavening: 'Leavening 🫧',
        eggs: 'Eggs 🥚',
        fats: 'Fats & Oils 🧈',
        sweeteners: 'Sweeteners 🍯',
        acids: 'Acids 🍋',
        thickeners: 'Thickeners 🥣',
        asian: 'Asian 🥢',
        alcohol: 'Cooking Wine 🍷',
        flour: 'Flour 🌾',
        chocolate: 'Chocolate 🍫',
        condiments: 'Condiments 🫙',
        cheese: 'Cheese 🧀',
        pantry: 'Pantry 🥫',
        broth: 'Broth 🍲',
        vegan: 'Vegan 🌱',
        nut_butters: 'Pantry 🥫',
        // Consolidated into Seasonings
        seasonings: 'Seasonings 🌿',
        herbs: 'Seasonings 🌿',
        aromatics: 'Seasonings 🌿',
        flavorings: 'Seasonings 🌿',
        spices: 'Seasonings 🌿'
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
            await supabaseClient.rpc('update_vote', {
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

// Get a short teaser from science content
function getScienceTeaser(science) {
    // Strip HTML tags and get first ~60 chars
    const text = science.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (text.length <= 60) return text;
    return text.substring(0, 60).trim() + '...';
}

// Toggle science explanation
function toggleScience(cardId) {
    const content = document.getElementById(cardId);
    const preview = content.previousElementSibling;
    const icon = document.getElementById('icon-' + cardId);

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.textContent = '▲';
        preview.classList.add('active');
    } else {
        content.classList.add('hidden');
        icon.textContent = '▼';
        preview.classList.remove('active');
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

        updateSwapCounter();
        renderFeaturedSwaps();
    } catch (error) {
        console.error('Failed to load global stats:', error);
    }
}

async function trackSearch(ingredientKey) {
    // Update local state immediately for responsive UI
    globalStats.searches[ingredientKey] = (globalStats.searches[ingredientKey] || 0) + 1;
    globalStats.totalSearches++;
    updateSwapCounter();
    renderFeaturedSwaps();

    // Sync to Supabase
    if (supabaseClient) {
        try {
            await supabaseClient.rpc('increment_search', { ingredient: ingredientKey });
        } catch (error) {
            console.error('Failed to track search:', error);
        }
    }
}

function renderFeaturedSwaps() {
    const grid = document.getElementById('featured-grid');
    if (!grid) return;

    // Get top 4 most searched ingredients from global stats
    let topIngredients = Object.entries(globalStats.searches)
        .filter(([key]) => ingredients[key]) // Only include valid ingredients
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .slice(0, 4)
        .map(([key]) => key);

    // Fall back to defaults if not enough search data
    if (topIngredients.length < 4) {
        const remaining = DEFAULT_FEATURED.filter(key => !topIngredients.includes(key));
        topIngredients = [...topIngredients, ...remaining].slice(0, 4);
    }

    grid.innerHTML = topIngredients.map(key => {
        const ingredient = ingredients[key];
        if (!ingredient) return '';

        // Get the top substitution for this ingredient
        const topSub = ingredient.substitutions?.[0];
        const topSubName = topSub?.name || 'alternatives';
        const description = INGREDIENT_DESCRIPTIONS[key] || ingredient.properties?.function || '';
        const categoryEmoji = getCategoryEmoji(ingredient.category);

        return `
            <button class="swap-card" data-key="${key}" tabindex="0" aria-label="View ${ingredient.name} substitutions">
                <span class="swap-card-swap">
                    ${categoryEmoji} ${ingredient.name}<span class="swap-card-arrow">→</span>${topSubName}
                </span>
                <span class="swap-card-description">${description}</span>
            </button>
        `;
    }).join('');

    // Add click handlers
    grid.querySelectorAll('.swap-card').forEach(card => {
        card.addEventListener('click', () => {
            const ingredientKey = card.dataset.key;
            if (ingredients[ingredientKey]) {
                selectIngredient(ingredientKey);
            }
        });
    });
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

// Start
document.addEventListener('DOMContentLoaded', init);
