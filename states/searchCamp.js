const { countryCodes } = require('../config');
const { filterAdContent } = require('/utils/filters');
const { generateAutoCampScript } = require('/utils/generators');
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

module.exports = async function setupAutoSearchCamp(bot) {
    bot.hears('🔎 Search Camp', async (ctx) => {
        ctx.session.state = 'awaiting_autocamp_input';
        await ctx.reply('Send me domain GEO (ex: domaincasino.com*CA):');
    });

    bot.on('text', async (ctx) => {
        const state = ctx.session.state;
        const text = ctx.message.text;
        if (['📊 DataScript', '📝 Create Camp', '🔎 Search Camp', '🖼️ Display Camp', '🪄 Generate assets', '☣️ Get SourceCode', '🪄 Deep Assets', '📂 Extract Data'].includes(text)) {
            return;
        }
        if (state === 'awaiting_search_autocamp_input') {
            try {
                // 1. Prelucrare input
                const [domain, countryCode] = ctx.message.text.split('*');
                const countryName = countryCodes[countryCode?.toUpperCase()];

                if (!domain || !countryName) {
                    return ctx.reply(`⚠️ Invalid Format. Accept content: domeniu.com*RO\n\nValid country code: ${Object.keys(countryCodes).join(', ')}`);
                }

                // 2. Extrage conținut
                await ctx.reply(`🔍 Get text  from ${domain}...`);
                const response = await axios.get(`https://${domain}`, {
                    timeout: 10000,
                    headers: {'User-Agent': 'Mozilla/5.0'}
                });

                const $ = cheerio.load(response.data);
                let content = '';
                $('h1, h2, h3, p').each((_, el) => {
                    content += $(el).text().trim() + '\n';
                });

                if (!content || content.length < 100) {
                    throw new Error('Not enough content');
                }

                // 3. Generează elemente cu ChatGPT
                await ctx.reply('🧠 Thinking...');
                const gptResponse = await openai.chat.completions.create({
                    model: "gpt-4",
                    messages: [{
                        role: "system",
                        content: `You are a Google Ads expert.Generates strictly in this JSON format
                {
                    "headlines": ["Text1","Text2","Text3","Text4","Text5","Text6","Text7","Text8"],
                    "descriptions": ["Text1","Text2","Text3","Text4","Text5"],
                    "keywords": ["kw1","kw2","kw3","kw4","kw5"]
                }
                
                Based on the website content above, I want to run a Google Ads campaign on Search. Please provide the following in English:
 8 Headlines:
 No punctuation or special characters
 Maximum 25 characters each
 Each word should start with a capital letter
 Use the keywords provided below to help generate the headlines
 6 Descriptions:
 No punctuation
 Maximum 85 characters each
 Only the first word should start with a capital letter
 4 Unique Keywords:
 No punctuation or special characters
 All lowercase
 Should include general terms a user might search for
 Do not use words like luxury, win(and related to win, winning etc.), or anything related to casino(casino games, casino hotel, best casino etc.)
 Do not mention the country
                `
                    }, {
                        role: "user",
                        content: content.substring(0, 8000)
                    }],
                    temperature: 0.3
                });


                const {headlines, descriptions, keywords} = JSON.parse(gptResponse.choices[0].message.content);

                var {filteredHeadlines, filteredDescriptions} = filterAdContent(headlines, descriptions);
                const scriptContent = `
function main() {
  var campaignName = "Search-${domain.replace(/\./g, '-').slice(0, 15)}-${countryCode}";
  var adGroupName = "AdGroup-${countryCode}-1";
  var finalUrl = "https://${domain}";
  var budget = ${(Math.random() * (8 - 5) + 5).toFixed(2)};
  var location = "${countryName}";
  var headlines = ${JSON.stringify(filteredHeadlines)};
  var descriptions = ${JSON.stringify(filteredDescriptions)};
  var keywords = ${JSON.stringify(keywords)};

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

                // 6. Trimite fișierul
                const fileName = `campaign_${domain.replace(/\./g, '_')}_${countryCode}.txt`;
                fs.writeFileSync(fileName, scriptContent);

                await ctx.replyWithDocument({
                    source: fileName,
                    filename: fileName
                });

                // 7. Curăță
                fs.unlinkSync(fileName);
                ctx.session.state = null;

            } catch (error) {
                console.error('Eroare:', error);
                await ctx.reply(`❌ Eroare: ${error.message}\nÎncearcă din nou.`);
                ctx.session.state = null;
            }
        }

    });
};