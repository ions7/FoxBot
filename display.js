const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
bot.hears('🤖 Display Camp', async (ctx) => {
    ctx.session.state = 'awaiting_display_autocamp_input';
    await ctx.reply('Send me domain  & GEO (ex: domaincasino.com*CA):');
});

if (state === 'awaiting_display_autocamp_input') {
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
                content: `You are a Google Ads expert.Generates strictly in this JSON format
                {
                    "headlines": ["Text1","Text2","Text3","Text4","Text5","Text6","Text7","Text8"],
                    "descriptions": ["Text1","Text2","Text3","Text4","Text5"]
               
                }
                
                Based on the website content above, I want to run a Google Ads Displau  campaign o. Please provide the following in English:
 8 Headlines:  Maximum 25 characters each
 No punctuation or special characters
 Each word should start with a capital letter
 Use the keywords provided below to help generate the headlines
 5 Descriptions: Maximum 85 characters each, Start with capital leter
 No punctuation
 

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

    var campaignName = "Search-${domain.replace(/\./g, '-').slice(0, 15)}-${countryCode}";
    var adGroupName = "AdGroup-${countryCode}-1";
    var finalUrl = "https://${domain}";
    var budget = ${(Math.random() * (8 - 5) + 5).toFixed(2)};
    var location = "${countryName}";
    var headlines = ${JSON.stringify(headlines)};
    var descriptions = ${JSON.stringify(descriptions)};
    var businessName = "My${domain.replace(/\./g, '-').slice(0, 5)}-${countryCode}";
    var longHeadline = "Get Ahead in Fantasy Leagues with Our Expert Tools";
    var imageId=  "https://images.unsplash.com/photo-1575361204480-aadea25e6e68?w=1200&h=628&auto=format&fit=crop";
    var  squareImageId = "https://images.unsplash.com/photo-1511426463457-0571e247d816?w=1200&h=1200&auto=format&fit=crop";
    var logoImageId =  "https://images.unsplash.com/photo-1587280501635-68a0e82cd5ff?w=1200&h=1200&auto=format&fit=crop";

    createDisplyCampaign(campaignName, adGroupName, finalUrl, budget, location,businessName, longHeadline,headlines, descriptions,imageId,squareImageId,logoImageId);

}
function createDisplyCampaign(campaignName, adGroupName, finalUrl, budget, location,businessName, longHeadline,headlines, descriptions,imageId,squareImageId,logoImageId) {

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

for (var i = 0; i < headlines.length; i++) {
    adData["Headline " + (i + 1)] = headlines[i];
  }

  for (var i = 0; i < descriptions.length; i++) {
    adData["Description " + (i + 1)] = descriptions[i];
  }

    upload.append({
        "Row Type": "Ad",
        "Action": "Add",
        "Ad status": "Enabled",
        "Campaign": campaignName,
        "Ad group": adGroupName,
        "Ad type": "Responsive display ad",
        "Headline": headlines1,
        "Headline 2": headlines2,
        "Headline 3": headlines3,
        "Headline 4": headlines4,
        "Headline 5": headlines5,
        "Long headline": longHeadline,
        "Description": descriptions1,
        "Description 2": descriptions2,
        "Image ID": imageId,  // Landscape Image
        "Square image ID": squareImageId,  // Square Image
        "Logo image": logoImageId,
        "Business name": businessName,
        "Final URL": finalUrl
    });
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