const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

const UNSPLASH_ACCESS_KEY = 'q286XqIk2rHkcpDl6OMlfTn1aBb5bTqCruXsPoW3804';

async function fetchSingleImage(keyword, width, height) {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}`;
    const response = await axios.get(url);
    const photo = response.data.results[0];

    if (!photo) throw new Error(`No image found for keyword: ${keyword}`);

    return `${photo.urls.raw}?w=${width}&h=${height}&auto=format&fit=crop`;
}

bot.hears('🖼️ Display Camp', async (ctx) => {
    ctx.session.state = 'awaiting_display_andAssets_input';
    await ctx.reply('Send me domain GEO (ex: domaincasino.com*CA):');
});



if (state === 'awaiting_display_andAssets_input') {
    try {
        const [domain, countryCode] = ctx.message.text.split('*');
        const countryName = countryCodes[countryCode?.toUpperCase()];

        if (!domain || !countryName) {
            return ctx.reply(`⚠️ Invalid Format. Accept content: domeniu.com*RO\n\nValid country code: ${Object.keys(countryCodes).join(', ')}`);
        }

        await ctx.reply(`🔍 Get text from ${domain}...`);
        const response = await axios.get(`https://${domain}`, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        const $ = cheerio.load(response.data);
        let content = '';
        $('h1, h2, h3, p').each((_, el) => {
            content += $(el).text().trim() + '\n';
        });

        if (!content || content.length < 100) {
            throw new Error('Not enough content');
        }

        await ctx.reply('🧠 Thinking...');
        const gptResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{
                role: "system",
                content: `You are a Google Ads expert.

Based strictly on the provided website content, perform the following tasks:

### Task 1: Headlines and Descriptions for Google Display Ads
Generate content strictly following this JSON structure:
\`\`\`json
{
    "headlines": ["Text1", "Text2", "Text3", "Text4", "Text5", "Text6", "Text7", "Text8"],
    "descriptions": ["Text1", "Text2", "Text3", "Text4", "Text5"],
    "keywords": ["Keyword1", "Keyword2", "Keyword3", "Keyword4", "Keyword5"]
}
\`\`\`

**Requirements for Headlines:**
- Provide exactly **8 headlines**.
- Maximum of **25 characters each**.
- No punctuation or special characters.
- Each word must start with a capital letter.
- Ensure relevance to the provided website content.

**Requirements for Descriptions:**
- Provide exactly **5 descriptions**.
- Maximum of **85 characters each**.
- Start each description with a capital letter.
- Do not use punctuation or special characters.
- Ensure relevance to the provided website content.

### Task 2: Generate 5 Keywords for Image Search
- Analyze the provided website content carefully.
- Generate exactly **5 keywords** that represent the main theme and subject of the website content.
- These keywords should be suitable for searching relevant images on Unsplash.

**Important:**
- The keywords generated will NOT be used directly in the Google Ads Display campaign structure but will be used exclusively to fetch thematic images from Unsplash.
- Ensure the keywords are highly accurate and relevant for image search purposes.

`
            }, {
                role: "user",
                content: content.substring(0, 8000)
            }],
            temperature: 0.3
        });

        const { headlines, descriptions, keywords } = JSON.parse(gptResponse.choices[0].message.content);

        const imageId = await fetchSingleImage(keywords[0], 1200, 628);
        const squareImageId = await fetchSingleImage(keywords[1], 1200, 1200);
        const logoImageId = await fetchSingleImage(keywords[2], 1200, 1200);


        var { filteredHeadlines, filteredDescriptions } = filterAdContent(headlines, descriptions);
        const scriptContent = `
  function main() {
            var campaignName = "Display-${domain.replace(/\./g, '-').slice(0, 15)}-${countryCode}";
            var adGroupName = "AdGroup-${countryCode}-1";
            var finalUrl = "https://${domain}";
            var budget = ${(Math.random() * (8 - 5) + 5).toFixed(2)};
            var location = "${countryName}";
            var headlines = ${JSON.stringify(headlines)};
            var descriptions = ${JSON.stringify(descriptions)};
            var businessName = "My${domain.replace(/\./g, '-').slice(0, 5)}-${countryCode}";
            var longHeadline = ${JSON.stringify(descriptions)};
            var imageId = "${imageId}";
            var squareImageId = "${squareImageId}";
            var logoImageId = "${logoImageId}";

            createDisplayCampaign(campaignName, adGroupName, finalUrl, budget, location, businessName, longHeadline, headlines, descriptions, imageId, squareImageId, logoImageId);
        }
function createDisplayCampaign(campaignName, adGroupName, finalUrl, budget, location,businessName, longHeadline,headlines, descriptions,imageId,squareImageId,logoImageId) {

    var upload = AdsApp.bulkUploads().newCsvUpload(
        ["Row Type", "Action","Campaign status", "Ad status", "Campaign", "Campaign type","Networks",
            "Bid strategy type","Campaign start date","Campaign end date","Budget","Location","Ad group","Ad group status", "Ad type",
            "Long headline", "Headline", "Headline 2", "Headline 3", "Headline 4", "Headline 5",
            "Description", "Description 2", "Final URL", "Image ID", "Square image ID", "Logo image",
            "Business name"], {moneyInMicros: false});


    upload.append({
        "Row Type": "Campaign",
        "Action": "Add",
        "Campaign status": "Enabled",
        "Campaign": campaignName,
        "Campaign type": "Display",
        "Networks": "Google Display Network",
        "Budget": budget,
        "Bid strategy type": "Maximize conversions",
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
        "Ad type": "Responsive display ad",
        "Headline":headlines[0],
        "Long headline": descriptions[0],
        "Description": descriptions[1],
        "Image ID": imageId,  // Landscape Image
        "Square image ID": squareImageId,  // Square Image
        "Logo image": logoImageId,
        "Business name": businessName,
        "Final URL": finalUrl
    };

    for (var i = 1; i < headlines.length; i++) {
        adData["Headline " + (i + 1)] = headlines[i];
      }

      for (var i = 1 ;i < descriptions.length; i++) {
        adData["Description " + (i + 1)] = descriptions[i+1];
      }

        upload.append(adData);

    upload.apply();
}
function getFormattedDate(daysToAdd) {
    var date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return Utilities.formatDate(date, AdsApp.currentAccount().getTimeZone(), "yyyy-MM-dd");
}
`;




        const fileName = `campaign_display${domain.replace(/\./g, '_')}_${countryCode}.txt`;
        fs.writeFileSync(fileName, scriptContent);

        await ctx.replyWithDocument({
            source: fileName,
            filename: fileName
        });

        fs.unlinkSync(fileName);
        ctx.session.state = null;

    } catch (error) {
        console.error('Eroare:', error);
        await ctx.reply(`❌ Eroare: ${error.message}\nÎncearcă din nou.`);
        ctx.session.state = null;
    }
}



if (state === 'awaiting_display_andAssets_input') {
    try {

        const [domain, countryCode] = ctx.message.text.split('*');
        const countryName = countryCodes[countryCode?.toUpperCase()];

        if (!domain || !countryName) {
            return ctx.reply(`⚠️ Invalid Format. Accept content: domeniu.com*RO\n\nValid country code: ${Object.keys(countryCodes).join(', ')}`);
        }


        await ctx.reply(`🔍 Get text  from ${domain}...`);
        const response = await axios.get(`https://${domain}`, {
            timeout: 10000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
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
                content: `You are a Google Ads expert.

Based strictly on the provided website content, perform the following tasks:

### Task 1: Headlines and Descriptions for Google Display Ads
Generate content strictly following this JSON structure:
\`\`\`json
{
    "headlines": ["Text1", "Text2", "Text3", "Text4", "Text5", "Text6", "Text7", "Text8"],
    "descriptions": ["Text1", "Text2", "Text3", "Text4", "Text5"],
    "keywords": ["Keyword1", "Keyword2", "Keyword3", "Keyword4", "Keyword5"]
}
\`\`\`

**Requirements for Headlines:**
- Provide exactly **8 headlines**.
- Maximum of **25 characters each**.
- No punctuation or special characters.
- Each word must start with a capital letter.
- Ensure relevance to the provided website content.

**Requirements for Descriptions:**
- Provide exactly **5 descriptions**.
- Maximum of **85 characters each**.
- Start each description with a capital letter.
- Do not use punctuation or special characters.
- Ensure relevance to the provided website content.

### Task 2: Generate 5 Keywords for Image Search
- Analyze the provided website content carefully.
- Generate exactly **5 keywords** that represent the main theme and subject of the website content.
- These keywords should be suitable for searching relevant images on Unsplash.

**Important:**
- The keywords generated will NOT be used directly in the Google Ads Display campaign structure but will be used exclusively to fetch thematic images from Unsplash.

Please ensure high accuracy and relevance in all generated elements.


                `}, {
                role: "user",
                content: content.substring(0, 8000)
            }],
            temperature: 0.3
        });





        const { headlines, descriptions } = JSON.parse(gptResponse.choices[0].message.content);

        var { filteredHeadlines, filteredDescriptions } = filterAdContent(headlines, descriptions);
        const scriptContent = `
  function main() {
            var campaignName = "Display-${domain.replace(/\./g, '-').slice(0, 15)}-${countryCode}";
            var adGroupName = "AdGroup-${countryCode}-1";
            var finalUrl = "https://${domain}";
            var budget = ${(Math.random() * (8 - 5) + 5).toFixed(2)};
            var location = "${countryName}";
            var headlines = ${JSON.stringify(headlines)};
            var descriptions = ${JSON.stringify(descriptions)};
            var businessName = "My${domain.replace(/\./g, '-').slice(0, 5)}-${countryCode}";
            var longHeadline = ${JSON.stringify(descriptions)};
            var imageId = "${imageId}";
            var squareImageId = "${squareImageId}";
            var logoImageId = "${logoImageId}";

            createDisplayCampaign(campaignName, adGroupName, finalUrl, budget, location, businessName, longHeadline, headlines, descriptions, imageId, squareImageId, logoImageId);
        }
function createDisplayCampaign(campaignName, adGroupName, finalUrl, budget, location,businessName, longHeadline,headlines, descriptions,imageId,squareImageId,logoImageId) {

    var upload = AdsApp.bulkUploads().newCsvUpload(
        ["Row Type", "Action","Campaign status", "Ad status", "Campaign", "Campaign type","Networks",
            "Bid strategy type","Campaign start date","Campaign end date","Budget","Location","Ad group","Ad group status", "Ad type",
            "Long headline", "Headline", "Headline 2", "Headline 3", "Headline 4", "Headline 5",
            "Description", "Description 2", "Final URL", "Image ID", "Square image ID", "Logo image",
            "Business name"], {moneyInMicros: false});


    upload.append({
        "Row Type": "Campaign",
        "Action": "Add",
        "Campaign status": "Enabled",
        "Campaign": campaignName,
        "Campaign type": "Display",
        "Networks": "Google Display Network",
        "Budget": budget,
        "Bid strategy type": "Maximize conversions",
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
        "Ad type": "Responsive display ad",
        "Headline":headlines[0],
        "Long headline": descriptions[0],
        "Description": descriptions[1],
        "Image ID": imageId,  // Landscape Image
        "Square image ID": squareImageId,  // Square Image
        "Logo image": logoImageId,
        "Business name": businessName,
        "Final URL": finalUrl
    };

    for (var i = 1; i < headlines.length; i++) {
        adData["Headline " + (i + 1)] = headlines[i];
      }

      for (var i = 1 ;i < descriptions.length; i++) {
        adData["Description " + (i + 1)] = descriptions[i+1];
      }

        upload.append(adData);

    upload.apply();
}
function getFormattedDate(daysToAdd) {
    var date = new Date();
    date.setDate(date.getDate() + daysToAdd);
    return Utilities.formatDate(date, AdsApp.currentAccount().getTimeZone(), "yyyy-MM-dd");
}
`;

        // 6. Trimite fișierul
        const fileName = `campaign_display${domain.replace(/\./g, '_')}_${countryCode}.txt`;
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