module.exports = `
function main() {
  var campaignName = "{{campaignName}}";
  var adGroupName = "{{adGroupName}}";
  var finalUrl = "{{finalUrl}}";
  var budget = {{budget}};
  var location = "{{location}}";
  var headlines = {{headlines}};
  var descriptions = {{descriptions}};
  var keywords = {{keywords}};

  createCampaign(campaignName, adGroupName, finalUrl, budget, location, headlines, descriptions, keywords);
}

function createCampaign(campaignName, adGroupName, finalUrl, budget, location, headlines, descriptions, keywords) {
  var columns = [
    "Row Type", "Action", "Campaign status", "Ad group status", "Ad status", "Keyword status",
    "Campaign", "Campaign type", "Networks", "Ad group", "Budget", "Bid strategy type", 
    "Campaign start date", "Campaign end date", "Location", "Ad type", "Keyword", "Type", 
    "Headline 1", "Headline 2", "Headline 3", "Headline 4", "Headline 5", "Headline 6", "Headline 7", 
    "Description 1", "Description 2", "Description 3", "Description 4", "Description 5", "Final URL"
  ];

  var upload = AdsApp.bulkUploads().newCsvUpload(columns, {moneyInMicros: false});

  upload.append({
    "Row Type": "Campaign",
    "Action": "Add",
    "Campaign status": "Enabled",
    "Campaign": campaignName,
    "Campaign type": "Search",
    "Networks": "Google search",
    "Budget": budget,
    "Bid strategy type": "Maximize clicks",
    "Campaign start date": getFormattedDate(0), 
    "Campaign end date": getFormattedDate(30), 
    "Location": location
  });

  upload.append({
    "Row Type": "Ad group",
    "Action": "Add",
    "Ad group status": "Enabled",
    "Campaign": campaignName,
    "Ad group": adGroupName
  });

  var adData = {
    "Row Type": "Ad",
    "Action": "Add",
    "Ad status": "Enabled",
    "Campaign": campaignName,
    "Ad group": adGroupName,
    "Ad type": "Responsive search ad",
    "Final URL": finalUrl
  };

  for (var i = 0; i < headlines.length; i++) {
    adData["Headline " + (i + 1)] = headlines[i];
  }

  for (var i = 0; i < descriptions.length; i++) {
    adData["Description " + (i + 1)] = descriptions[i];
  }

  upload.append(adData);

  
  if (Array.isArray(keywords) && keywords.length > 0) {
    for (var i = 0; i < keywords.length; i++) {
      upload.append({
        "Row Type": "Keyword",
        "Action": "Add",
        "Keyword status": "Enabled",
        "Campaign": campaignName,
        "Ad group": adGroupName,
        "Keyword": keywords[i],
        "Type": "Broad Match"
      });
    }
  }

  upload.apply();
}


function getFormattedDate(daysToAdd) {
  var date = new Date();
  date.setDate(date.getDate() + daysToAdd); 
  return Utilities.formatDate(date, AdsApp.currentAccount().getTimeZone(), "yyyy-MM-dd");
}
`;
