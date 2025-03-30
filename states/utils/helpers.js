function getFormattedDate(daysToAdd = 0) {
    const date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

function escapeMarkdown(text) {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

function validateDomain(domain) {
    return /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i.test(domain);
}

module.exports = {
    getFormattedDate,
    escapeMarkdown,
    validateDomain
};