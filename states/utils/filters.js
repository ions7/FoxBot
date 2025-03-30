/**
 * Filtrează conținutul pentru anunțuri conform limitelor Google Ads
 * @param {string[]} headlines - Array de titluri
 * @param {string[]} descriptions - Array de descrieri
 * @returns {Object} Obiect cu titluri și descrieri filtrate
 */
function filterAdContent(headlines, descriptions) {
    const maxHeadlineLength = 28;
    const maxDescriptionLength = 88;

    const filteredHeadlines = headlines
        .filter(h => h.length <= maxHeadlineLength)
        .map(h => h.trim());

    const filteredDescriptions = descriptions
        .filter(d => d.length <= maxDescriptionLength)
        .map(d => d.trim());

    return {
        filteredHeadlines,
        filteredDescriptions
    };
}

/**
 * Validare și formatare keywords
 * @param {string[]} keywords - Array de cuvinte cheie
 * @returns {string[]} Array de keywords validate
 */
function filterKeywords(keywords) {
    return keywords
        .filter(k => k.length > 0)
        .map(k => k.toLowerCase().trim())
        .filter(k => !/[^a-z0-9\s]/.test(k)); // Remove special chars
}

module.exports = {
    filterAdContent,
    filterKeywords
};