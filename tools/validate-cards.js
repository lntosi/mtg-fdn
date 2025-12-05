#!/usr/bin/env node

/**
 * Card Validation Script
 *
 * Validates cards in cards.js against the Scryfall API.
 * Checks for:
 * - Card existence (name matches a real MTG card)
 * - Oracle text comparison
 * - Keywords verification
 * - Power/Toughness accuracy
 * - Mana cost accuracy
 *
 * Usage:
 *   node tools/validate-cards.js           # Validate all cards
 *   node tools/validate-cards.js cats      # Validate specific deck
 *   node tools/validate-cards.js --missing # Show only cards without tests
 */

const fs = require('fs');
const path = require('path');

// Rate limiting for Scryfall API (100ms between requests)
const REQUEST_DELAY = 100;
let lastRequest = 0;

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchFromScryfall(cardName) {
    // Respect rate limit
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequest;
    if (timeSinceLastRequest < REQUEST_DELAY) {
        await delay(REQUEST_DELAY - timeSinceLastRequest);
    }
    lastRequest = Date.now();

    try {
        const url = `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`;
        const response = await fetch(url);

        if (!response.ok) {
            return { error: `Card not found: ${cardName}` };
        }

        return await response.json();
    } catch (error) {
        return { error: error.message };
    }
}

// Load cards.js content and extract CARD_DATABASE
function loadCardDatabase() {
    const cardsPath = path.join(__dirname, '..', 'js', 'cards.js');
    const content = fs.readFileSync(cardsPath, 'utf-8');

    // Execute the cards.js in a sandbox to get CARD_DATABASE
    const sandbox = { window: {} };
    const script = content.replace('window.CARD_DATABASE', 'sandbox.CARD_DATABASE')
                          .replace('window.expandDeck', 'sandbox.expandDeck')
                          .replace('window.createCombinedDeck', 'sandbox.createCombinedDeck')
                          .replace('window.shuffleDeck', 'sandbox.shuffleDeck');

    // Simple extraction using regex
    const match = content.match(/const CARD_DATABASE = (\{[\s\S]*?\n\});/);
    if (!match) {
        throw new Error('Could not parse CARD_DATABASE from cards.js');
    }

    // Use eval to parse the object (safe in this context as we control the file)
    const CARD_DATABASE = eval('(' + match[1] + ')');
    return CARD_DATABASE;
}

// Load test files to check which cards have tests
function loadTestCoverage() {
    const testsDir = path.join(__dirname, '..', 'tests');
    const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));

    const testedCards = new Set();

    for (const file of testFiles) {
        const content = fs.readFileSync(path.join(testsDir, file), 'utf-8');
        // Look for card names in test descriptions and CREATURES/SPELLS references
        const matches = content.match(/['"]([A-Z][a-zA-Z\s'-]+)['"]/g) || [];
        matches.forEach(m => {
            const name = m.slice(1, -1);
            if (name.length > 2 && !name.includes('test') && !name.includes('should')) {
                testedCards.add(name.toLowerCase());
            }
        });
    }

    return testedCards;
}

// Parse keywords from oracle text
function extractKeywordsFromOracle(oracleText) {
    if (!oracleText) return [];

    const keywordMap = {
        'flying': 'flying',
        'lifelink': 'lifelink',
        'deathtouch': 'deathtouch',
        'trample': 'trample',
        'first strike': 'first_strike',
        'double strike': 'double_strike',
        'vigilance': 'vigilance',
        'haste': 'haste',
        'reach': 'reach',
        'menace': 'menace',
        'hexproof': 'hexproof',
        'indestructible': 'indestructible'
    };

    const found = [];
    const lowerOracle = oracleText.toLowerCase();

    for (const [keyword, mapped] of Object.entries(keywordMap)) {
        // Check if keyword appears at start of text or after newline (as a keyword ability)
        if (lowerOracle.startsWith(keyword) ||
            lowerOracle.includes('\n' + keyword) ||
            lowerOracle.match(new RegExp(`^${keyword}[,\\s]`, 'i')) ||
            lowerOracle.match(new RegExp(`\\n${keyword}[,\\s]`, 'i'))) {
            found.push(mapped);
        }
    }

    return found;
}

// Compare our card with Scryfall data
function compareCard(ourCard, scryfallCard) {
    const issues = [];

    // Skip lands for most checks
    if (ourCard.type === 'land') {
        return issues;
    }

    // Check mana cost
    if (ourCard.cost && scryfallCard.mana_cost) {
        const ourCost = ourCard.cost.toUpperCase().replace(/[{}]/g, '');
        const scryfallCost = scryfallCard.mana_cost.replace(/[{}]/g, '');
        if (ourCost !== scryfallCost) {
            issues.push({
                type: 'mana_cost',
                our: ourCard.cost,
                scryfall: scryfallCard.mana_cost
            });
        }
    }

    // Check power/toughness for creatures
    if (ourCard.type === 'creature') {
        if (scryfallCard.power && ourCard.power !== parseInt(scryfallCard.power)) {
            issues.push({
                type: 'power',
                our: ourCard.power,
                scryfall: scryfallCard.power
            });
        }
        if (scryfallCard.toughness && ourCard.toughness !== parseInt(scryfallCard.toughness)) {
            issues.push({
                type: 'toughness',
                our: ourCard.toughness,
                scryfall: scryfallCard.toughness
            });
        }
    }

    // Check keywords
    const scryfallKeywords = (scryfallCard.keywords || []).map(k => k.toLowerCase().replace(' ', '_'));
    const ourKeywords = (ourCard.keywords || []).filter(k =>
        !['tap_for_mana', 'etb_draw', 'lifelink_conditional', 'goblin_lord'].includes(k)
    );

    const missingKeywords = scryfallKeywords.filter(k => !ourKeywords.includes(k));
    const extraKeywords = ourKeywords.filter(k => !scryfallKeywords.includes(k));

    if (missingKeywords.length > 0) {
        issues.push({
            type: 'missing_keywords',
            keywords: missingKeywords
        });
    }

    if (extraKeywords.length > 0) {
        issues.push({
            type: 'extra_keywords',
            keywords: extraKeywords
        });
    }

    return issues;
}

// Format oracle text for display
function formatOracleText(text) {
    if (!text) return '(no text)';
    return text.replace(/\n/g, ' | ').substring(0, 100) + (text.length > 100 ? '...' : '');
}

async function validateDeck(deckName, deckData, testedCards, options = {}) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Validating: ${deckData.name} (${deckData.color})`);
    console.log('='.repeat(60));

    const results = {
        valid: 0,
        issues: 0,
        notFound: 0,
        noTests: 0,
        cards: []
    };

    // Get unique cards (ignore qty)
    const uniqueCards = deckData.cards.filter((card, index, self) =>
        index === self.findIndex(c => c.name === card.name)
    );

    for (const card of uniqueCards) {
        // Skip basic lands
        if (card.subtype === 'basic') continue;

        const scryfallData = await fetchFromScryfall(card.name);
        const hasTest = testedCards.has(card.name.toLowerCase());

        const cardResult = {
            name: card.name,
            type: card.type,
            hasTest,
            scryfallFound: !scryfallData.error,
            issues: [],
            oracleText: scryfallData.oracle_text
        };

        if (scryfallData.error) {
            cardResult.issues.push({ type: 'not_found', message: scryfallData.error });
            results.notFound++;
        } else {
            const issues = compareCard(card, scryfallData);
            cardResult.issues = issues;

            if (issues.length > 0) {
                results.issues++;
            } else {
                results.valid++;
            }
        }

        if (!hasTest) {
            results.noTests++;
        }

        results.cards.push(cardResult);

        // Print result
        if (options.missingOnly && hasTest) continue;

        const status = cardResult.issues.length === 0 ? '✓' : '✗';
        const testStatus = hasTest ? '[TESTED]' : '[NO TEST]';

        if (cardResult.issues.length > 0 || !hasTest || options.verbose) {
            console.log(`\n${status} ${card.name} ${testStatus}`);

            if (cardResult.oracleText && options.verbose) {
                console.log(`  Oracle: ${formatOracleText(cardResult.oracleText)}`);
            }

            if (card.text) {
                console.log(`  Our text: ${card.text}`);
            }

            for (const issue of cardResult.issues) {
                switch (issue.type) {
                    case 'not_found':
                        console.log(`  ⚠ Card not found in Scryfall`);
                        break;
                    case 'mana_cost':
                        console.log(`  ⚠ Mana cost: ours=${issue.our}, scryfall=${issue.scryfall}`);
                        break;
                    case 'power':
                        console.log(`  ⚠ Power: ours=${issue.our}, scryfall=${issue.scryfall}`);
                        break;
                    case 'toughness':
                        console.log(`  ⚠ Toughness: ours=${issue.our}, scryfall=${issue.scryfall}`);
                        break;
                    case 'missing_keywords':
                        console.log(`  ⚠ Missing keywords: ${issue.keywords.join(', ')}`);
                        break;
                    case 'extra_keywords':
                        console.log(`  ⚠ Extra keywords: ${issue.keywords.join(', ')}`);
                        break;
                }
            }
        }
    }

    return results;
}

async function main() {
    const args = process.argv.slice(2);
    const options = {
        verbose: args.includes('--verbose') || args.includes('-v'),
        missingOnly: args.includes('--missing') || args.includes('-m')
    };

    const specificDeck = args.find(a => !a.startsWith('-'));

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║           MTG Card Validation Tool                         ║');
    console.log('║           Validates cards against Scryfall API             ║');
    console.log('╚════════════════════════════════════════════════════════════╝');

    try {
        const CARD_DATABASE = loadCardDatabase();
        const testedCards = loadTestCoverage();

        console.log(`\nLoaded ${Object.keys(CARD_DATABASE).length} decks`);
        console.log(`Found ${testedCards.size} cards referenced in tests`);

        const allResults = {};

        for (const [deckName, deckData] of Object.entries(CARD_DATABASE)) {
            if (specificDeck && deckName !== specificDeck) continue;

            allResults[deckName] = await validateDeck(deckName, deckData, testedCards, options);
        }

        // Print summary
        console.log('\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));

        let totalValid = 0, totalIssues = 0, totalNotFound = 0, totalNoTests = 0;

        for (const [deckName, results] of Object.entries(allResults)) {
            console.log(`\n${deckName.toUpperCase()}:`);
            console.log(`  ✓ Valid: ${results.valid}`);
            console.log(`  ✗ Issues: ${results.issues}`);
            console.log(`  ? Not found: ${results.notFound}`);
            console.log(`  📝 Without tests: ${results.noTests}`);

            totalValid += results.valid;
            totalIssues += results.issues;
            totalNotFound += results.notFound;
            totalNoTests += results.noTests;
        }

        console.log('\n' + '-'.repeat(60));
        console.log('TOTAL:');
        console.log(`  ✓ Valid: ${totalValid}`);
        console.log(`  ✗ Issues: ${totalIssues}`);
        console.log(`  ? Not found: ${totalNotFound}`);
        console.log(`  📝 Without tests: ${totalNoTests}`);

        // Exit with error if there are issues
        if (totalIssues > 0 || totalNotFound > 0) {
            process.exit(1);
        }

    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
}

main();
