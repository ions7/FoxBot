const { filterAdContent } = require('/states/utils/filters');
const { getFormattedDate } = require('/states/utils/helpers');

/**
 * Generează script pentru Search Campaign
 */
function generateSearchCampaignScript(domain, countryCode, countryName, content) {
    const { filteredHeadlines, filteredDescriptions } = filterAdContent(
        content.headlines,
        content.descriptions
    );

    return `
function main() {
  var campaignName = "Search-${domain.replace(/\./g, '-').slice(0, 15)}-${countryCode}";
  var adGroupName = "AdGroup-${countryCode}-1";
  var finalUrl = "https://${domain}";
  var budget = ${(Math.random() * (8 - 5) + 5).toFixed(2)};
  var location = "${countryName}";
  var headlines = ${JSON.stringify(filteredHeadlines)};
  var descriptions = ${JSON.stringify(filteredDescriptions)};
  var keywords = ${JSON.stringify(content.keywords || [])};

  createCampaign(campaignName, adGroupName, finalUrl, budget, location, headlines, descriptions, keywords);
}

${getCampaignCreationFunction()}
${getFormattedDateFunction()}
`.trim();
}

function getCampaignCreationFunction() {
    return `
function createCampaign(campaignName, adGroupName, finalUrl, budget, location, headlines, descriptions, keywords) {
  var columns = [
    "Row Type", "Action", "Campaign status", "Ad group status", "Ad status", "Keyword status",
    "Campaign", "Campaign type", "Networks", "Ad group", "Budget", "Bid strategy type", 
    "Campaign start date", "Campaign end date", "Location", "Ad type", "Keyword", "Type", 
    "Headline 1", "Headline 2", "Headline 3", "Headline 4", "Headline 5", "Headline 6", "Headline 7", 
    "Description 1", "Description 2", "Description 3", "Description 4", "Description 5", "Final URL"
  ];

  var upload = AdsApp.bulkUploads().newCsvUpload(columns, {moneyInMicros: false});

  // ... restul funcției
}`.trim();
}

module.exports = {
    generateSearchCampaignScript,
    generateDisplayCampaignScript
};