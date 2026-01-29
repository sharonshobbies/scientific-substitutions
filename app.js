// Scientific Substitutions - Main Application Logic

// State
let ingredients = {};
let selectedIngredient = null;
let currentContext = 'baking';

// DOM Elements
const searchSection = document.getElementById('search-section');
const resultsSection = document.getElementById('results-section');
const ingredientSearch = document.getElementById('ingredient-search');
const searchResults = document.getElementById('search-results');
const resultsContainer = document.getElementById('results-container');

// Initialize
async function init() {
    try {
        const response = await fetch('data/substitutions.json');
        ingredients = await response.json();
        setupEventListeners();
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
    displaySearchResults(allIngredients);
}

// Display search dropdown
function displaySearchResults(matches) {
    if (matches.length === 0) {
        searchResults.innerHTML = '<div class="search-result-item"><span class="name">No ingredients found</span></div>';
        searchResults.classList.remove('hidden');
        return;
    }

    // Sort alphabetically by name
    matches.sort((a, b) => a[1].name.localeCompare(b[1].name));

    searchResults.innerHTML = matches.map(([key, data]) => `
        <div class="search-result-item" data-key="${key}">
            <div class="name">${data.name}</div>
            <div class="category">${formatCategory(data.category)}</div>
        </div>
    `).join('');

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
                        <span class="toggle-icon">+</span> The Science
                    </button>
                    <div class="science-content hidden" id="${cardId}">
                        <p>${sub.science}</p>
                    </div>
                ` : ''}
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

// Toggle science explanation
function toggleScience(cardId) {
    const content = document.getElementById(cardId);
    const button = content.previousElementSibling;
    const icon = button.querySelector('.toggle-icon');

    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        icon.textContent = '−';
        button.classList.add('active');
    } else {
        content.classList.add('hidden');
        icon.textContent = '+';
        button.classList.remove('active');
    }
}

// Start
document.addEventListener('DOMContentLoaded', init);
