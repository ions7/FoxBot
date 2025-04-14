
require('dotenv').config();
const { Telegraf } = require('telegraf');
const bot = new Telegraf(process.env.BOT_TOKEN);
const fs = require('fs');
const scriptTemplate = require('./testScripts/scriptTemplate');
const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');
const Redis = require('ioredis');
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_ACCESS_KEY;
const RedisSession = require('telegraf-session-redis');
const session = require('telegraf/session');



const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

bot.launch()
    .then(() => console.log('🚀 Botul rulează perfect acum!'))
    .catch((err) => console.error('Eroare:', err));

const countryCodes = {
    CA: "Canada", AT: "Austria", GR: "Greece", AU: "Australia",
    DE: "Germany", NL: "Netherlands", IRL: "Ireland", ES: "Spain", PT: "Portugal", IN: "India",PL:"Poland"
};




// async function fetchSingleImage(keyword, width, height) {
//     const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}`;
//     const response = await axios.get(url);
//     const photo = response.data.results[0];
//
//     if (!photo) throw new Error(`No image found for keyword: ${keyword}`);
//
//     return `https://images.unsplash.com/photo-${photo.id}?w=${width}&h=${height}&auto=format&fit=crop`;
// }
//
// const session = new RedisSession({
//      store: { url: process.env.REDIS_URL }
//  });

// Conectăm la Redis Upstash cu TLS
const redis = new Redis(process.env.REDIS_URL, {
    tls: {}
});
const statsRedis = redis;
// Sesiune în memorie (fallback)
bot.use(session());

// Sesiune personalizată salvată în Redis
bot.use(async (ctx, next) => {
    const userKey = `session:${ctx.from?.id}`;
    try {
        const raw = await redis.get(userKey);
        ctx.session = raw ? JSON.parse(raw) : {};
    } catch (err) {
        console.error('Redis read error:', err);
        ctx.session = {};
    }

    await next();

    try {
        await redis.set(userKey, JSON.stringify(ctx.session));
    } catch (err) {
        console.error('Redis write error:', err);
    }
});

async function fetchSingleImage(keyword, width, height) {
    const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(keyword)}&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}`;
    const response = await axios.get(url);
    const photo = response.data.results[0];

    if (!photo) throw new Error(`No image found for keyword: ${keyword}`);

    // Extragem doar partea de bază a URL-ului fără parametrii
    const baseUrl = photo.urls.raw.split('?')[0]; // Elimină tot ce vine după '?'

    // Adăugăm parametrii doriți
    return `${baseUrl}?w=${width}&h=${height}&auto=format&fit=crop`;
}





bot.use(async (ctx, next) => {
    if (ctx.message && ctx.message.text) {
        const userId = ctx.from.id;
        const command = ctx.message.text;


        await statsRedis.hincrby(`user:${userId}:commands`, command, 1);


        await statsRedis.hset(`user:${userId}:info`, 'username', ctx.from.username || ctx.from.first_name);
        await statsRedis.hsetnx(`user:${userId}:info`, 'first_used', new Date().toISOString());
    }
    await next();
});

// Comanda start cu mesaj personalizat și tastatură explicită
bot.start((ctx) => {
    const username = ctx.from.username || ctx.from.first_name;

    const welcomeMessage = ctx.session.visited
        ? `${username} Do you know why Google doesn’t love casinos? `
        : `Welcome to FoxFarm🦊, ${username}!`;



    bot.telegram.sendMessage(ctx.chat.id, welcomeMessage, {

        reply_markup: {
            keyboard: [['🤖 Display Camp', '🤖 Auto Campaign'],['📝 Create Camp','📊 DataScript'],['📂 Extract Data','☣️ Get SourceCode'] ,['🪄 Generate assets','🪄 Deep Assets']],
            resize_keyboard: true,
        },
    });
    const joke  = 'Because every time it tried to play, it lost everything…' +
        ' in “cookies” and got banned for “❌Circumventing Systems”! 😆🎰';
    bot.telegram.sendMessage(ctx.chat.id,joke);
});


bot.hears('🤖 Auto Campaign', async (ctx) => {
    ctx.session.state = 'awaiting_autocampSearch_input';
    await ctx.reply('Send me domain GEO (ex: domaincasino.com*CA):');
});


bot.hears('🪄 Generate assets', async (ctx) => {
    ctx.session.state = 'awaiting_domain_for_assets';
    await ctx.reply('Please enter your web site:');
});

bot.hears('🪄 Deep Assets', async (ctx) => {
    ctx.session.state = 'awaiting_domain_for_deepseek_assets';
    await ctx.reply('Please enter your web site:');
});
bot.hears('📂 Extract Data', async (ctx) => {
    ctx.session.state = 'awaiting_domain_for_extract_data';
    await ctx.reply('🌐 Enter web site: ');
});
bot.hears('📊 DataScript', async (ctx) => {
    ctx.session.state = null; // Reset state pentru a nu interfera cu alt handler
    try {
        await ctx.reply('Selectează scriptul dorit:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: '🎭 CDS', callback_data: 'script_CDS' }],
                    [{ text: '🎲 ONP', callback_data: 'script_ONP' }],
                    [{ text: '🎰 OTY', callback_data: 'script_OTY' }],
                    [{ text: '👽 Yojoy', callback_data: 'script_Yojoy' }],
                    [{ text: '🛞 Nova', callback_data: 'script_Nova' }],
                    [{ text: '🥷 Zmatic', callback_data: 'script_Zmatic' }],
                    [{ text: '🗽 Hexra', callback_data: 'script_Hexra' }],
                ]
            }
        });
    } catch (error) {
        console.error('Eroare la afișarea meniului scripturilor:', error);
        await ctx.reply('A apărut o eroare. Încearcă din nou mai târziu.');
    }
});
// Handler pentru trimiterea fișierului corespunzător scriptului ales
bot.action(/script_(.+)/, async (ctx) => {
    const scriptName = ctx.match[1];
    const filePath = `./trackers/${scriptName}.txt`;

    try {
        // Șterge mesajul anterior (cel cu variantele)
        await ctx.deleteMessage();

        // Informează utilizatorul că se încarcă fișierul
        await ctx.answerCbQuery(`Se încarcă scriptul ${scriptName}...`);

        // Trimite fișierul corespunzător
        await ctx.replyWithDocument({ source: filePath });

    } catch (error) {
        console.error(`Eroare la trimiterea fișierului ${scriptName}:`, error);
        await ctx.reply('Fișierul nu a putut fi trimis. Asigură-te că acesta există și încearcă din nou.');
    }
});


bot.hears('🤖 Display Camp', async (ctx) => {
    ctx.session.state = 'awaiting_display_andAssets_input';
    await ctx.reply('Send me domain GEO (ex: domaincasino.com*CA):');
});

bot.hears('📝 Create Camp', (ctx) => {
    ctx.session.state = 'awaiting_domain_location';
    ctx.reply('Please enter domain & location(format: domain.com-CA)');
});

bot.hears('☣️ Get SourceCode', (ctx) => {
    ctx.session.state = 'awaiting_domain_for_get_source_code';
    ctx.reply('🌐 Enter web site:');
});
function escapeMarkdown(text) {
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}
bot.hears('/stats', async (ctx) => {
    if (ctx.from.id !== 6742445633) {
        return ctx.reply("❌ Nu ai acces la această comandă.");
    }

    // Obține toți utilizatorii
    const userKeys = await statsRedis.keys('user:*:info');
    let stats = "📊 *Statistici utilizatori:*\n\n";

    for (const key of userKeys) {
        const userId = key.split(':')[1];
        const userInfo = await statsRedis.hgetall(key);
//
        stats += `👤 ${escapeMarkdown(userInfo.username || 'N/A')} (${userId}):\n`;
        stats += "\n";
    }
//
    await ctx.reply(stats, { parse_mode: 'Markdown' });
});


const userStats = {};

bot.use((ctx, next) => {
    if (ctx.message) {
        const userId = ctx.from.id;
        userStats[userId] = userStats[userId] || {
            username: ctx.from.username,
            commands: {}
        };
        userStats[userId].commands[ctx.message.text] =
            (userStats[userId].commands[ctx.message.text] || 0) + 1;
    }
    next();
});

// Salvează periodic pe disk (opțional)
setInterval(() => {
    fs.writeFileSync('userStats.json', JSON.stringify(userStats));
}, 60000);

function filterAdContent(headlines, descriptions) {
    const maxHeadlineLength = 28;
    const maxDescriptionLength = 88;

    const filteredHeadlines = headlines.filter(h => h.length <= maxHeadlineLength);
    const filteredDescriptions = descriptions.filter(d => d.length <= maxDescriptionLength);

    return { filteredHeadlines, filteredDescriptions };
}

bot.on('text', async (ctx) => {
    const state = ctx.session.state;
    const text = ctx.message.text;
    if (['📊 DataScript', '📝 Create Camp','🤖 Display Camp','🤖 Auto Campaign', '🪄 Generate assets','☣️ Get SourceCode', '🪄 Deep Assets','📂 Extract Data'].includes(text)) {
        return;
    }

    if (state === 'awaiting_domain_for_assets') {
        // Validare domeniu introdus
        // if (!/^([\w-]+\.)+[\w-]{2,}$/.test(text)) {
        //     return ctx.reply('⚠️ Domeniu invalid. Încearcă din nou (ex: domeniu.com).');
        // }

        await ctx.reply(`🔄 Se extrage conținutul de pe ${text}...`);

        try {
            // Extrage conținutul HTML al website-ului
            const response = await axios.get(`https://${text}`);

            const $ = cheerio.load(response.data);
            let content = '';
            $('h1, h2, h3, p').each((_, el) => {
                content += $(el).text().trim() + '\n';
            });

            if (!content) {
                ctx.session.state = null;
                return ctx.reply('⚠️ Nu s-a putut extrage conținut relevant din acest site.');
            }

            await ctx.reply('✨ Se generează acum descrierea adaptată prin ChatGPT...');

            // apel OpenAI
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    store: true,
                    messages: [
                        {
                            role: 'system',
                            content: 'Suppose you  are a experienced copywriter who writes text for advertising campaigns for Google Ads .'
                        },
                        {
                            role: 'user',
                            content: `: Website content:
\\n\\n${content}
Based on the website content above, I want to run a Google Ads campaign on Search. Please provide the following in English:
4 Headlines:
No punctuation or special characters
Maximum 25 characters each
Each word should start with a capital letter
Use the keywords provided below to help generate the headlines
4 Descriptions:
No punctuation
Maximum 85 characters each
Only the first word should start with a capital letter
4 Unique Keywords:
No punctuation or special characters
All lowercase
Should include general terms a user might search for
Do not use words like luxury, win(and related to win, winning etc.), or anything related to casino(casino games, casino hotel, best casino etc.)
Do not mention the country
Formatting:
Separate each element with a forward slash ( / ) like this:
Headlines:
Headline1/Headline2/Headline3/Headline4
Descriptions:
Description1/
Description2/
Description3/
Description4
Unique Keywords:
keyword1/keyword2/keyword3/keyword4`
                        }
                    ]
                });

                const generatedDescription = completion.choices[0].message.content;

                await ctx.reply(`🚀 Descriere generată pentru ${text}:\n\n${generatedDescription}`);

            } catch (error) {
                console.error('Eroare la OpenAI API:', error);
                await ctx.reply(`🚀 Text Extras din domen \n  ${text}:`)
                await ctx.reply('❌ A apărut o eroare la generarea descrierii. Încearcă din nou.');
            }

        } catch (error) {
            console.error('Eroare la extragerea conținutului site-ului:', error);
            await ctx.reply('❌ A apărut o eroare la accesarea site-ului. Asigură-te că domeniul este corect și accesibil.');
        }

        ctx.session.state = null; // resetare state
        return;
    }
    if (state === 'awaiting_autocampSearch_input') {
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
                `}, {
                    role: "user",
                    content: content.substring(0, 8000)
                }],
                temperature: 0.3
            });





            const { headlines, descriptions, keywords } = JSON.parse(gptResponse.choices[0].message.content);

            var { filteredHeadlines, filteredDescriptions } = filterAdContent(headlines, descriptions);
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
            $('h1, h2, h3,h4, p').each((_, el) => {
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
-Keywordl need to be generical like : travel , shoping , device, Please select select keyworsd generical not use name of site or something else

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

            const rawContent = gptResponse.choices[0].message.content;

// Extrage doar blocul JSON valid
            const jsonMatch = rawContent.match(/```json([\s\S]*?)```/);

            if (!jsonMatch) throw new Error("JSON block not found in GPT response");

            const cleanJson = jsonMatch[1].trim();
            const { headlines, descriptions, keywords } = JSON.parse(cleanJson);




            const imageId = await fetchSingleImage(keywords[1], 1200, 628);
            const squareImageId = await fetchSingleImage(keywords[2], 1200, 1200);
            const logoImageId = await fetchSingleImage(keywords[3], 1200, 1200);


            var { filteredHeadlines, filteredDescriptions } = filterAdContent(headlines, descriptions);
            const scriptContent = `
  function main() {
            var campaignName = "Display-${domain.replace(/\./g, '-').slice(0, 15)}-${countryCode}";
            var adGroupName = "AdGroup-${countryCode}-1";
            var finalUrl = "https://${domain}";
            var budget = ${(Math.random() * (8 - 5) + 5).toFixed(2)};
            var location = "${countryName}";
            var headlines = ${JSON.stringify(filteredHeadlines)};
            var descriptions = ${JSON.stringify(filteredDescriptions)};
            var businessName = "My${domain.replace(/\./g, '-').slice(0, 5)}-${countryCode}";
            var longHeadline = ${JSON.stringify(filteredDescriptions)};
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
    if (state === 'awaiting_domain_for_deepseek_assets') {
        // Validare domeniu introdus
        if (!/^([\w-]+\.)+[\w-]{2,}$/.test(text)) {
            return ctx.reply('⚠️ Domeniu invalid. Încearcă din nou (ex: domeniu.com).');
        }

        await ctx.reply(`🔄 Se extrage conținutul de pe ${text}...`);

        try {
            // Extrage conținutul HTML al website-ului
            const response = await axios.get(`https://${text}`);
            const $ = cheerio.load(response.data);
            let content = '';
            $('h1, h2, h3, p').each((_, el) => {
                content += $(el).text().trim() + '\n';
            });

            if (!content) {
                ctx.session.state = null;
                return ctx.reply('⚠️ Nu s-a putut extrage conținut relevant din acest site.');
            }

            await ctx.reply('✨ Se generează acum descrierea adaptată prin DeepSeek...');

            // Apel DeepSeek API
            try {
                const deepseekResponse = await axios.post(
                    'https://api.deepseek.com/v1/chat/completions', // URL-ul API-ului DeepSeek
                    {
                        model: 'deepseek-chat', // Modelul DeepSeek (verifică documentația pentru opțiuni)
                        messages: [
                            {
                                role: 'system',
                                content: 'You are an assistant who writes engaging and concise website descriptions based on provided text.'
                            },
                            {
                                role: 'user',
                                content: `Generează o descriere atractivă și adaptată pentru website-ul ${text} folosind textele următoare:\n\n${content}`
                            }
                        ]
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                const generatedDescription = deepseekResponse.data.choices[0].message.content;

                await ctx.reply(`🚀 Descriere generată pentru ${text}:\n\n${generatedDescription}`);

            } catch (error) {
                console.error('Eroare la DeepSeek API:', error);
                await ctx.reply('❌ A apărut o eroare la generarea descrierii. Încearcă din nou.');
            }

        } catch (error) {
            console.error('Eroare la extragerea conținutului site-ului:', error);
            await ctx.reply('❌ A apărut o eroare la accesarea site-ului. Asigură-te că domeniul este corect și accesibil.');
        }

        ctx.session.state = null; // Resetare stare
        return;
    }
    if (state === 'awaiting_domain_for_extract_data') {
        // Validare domeniu introdus
        if (!/^([\w-]+\.)+[\w-]{2,}$/.test(text)) {
            return ctx.reply('⚠️ Invalid domain.');
        }

        await ctx.reply(`🔄 Extract data from .. ${text}...`);

        try {
            const response = await axios.get(`https://${text}`);
            const $ = cheerio.load(response.data);

            let content = '';
            const seenText = new Set();
            const relevantTags = ['h1','h2','h3','p'];

            relevantTags.forEach((tag) => {
                $(tag).each((_, el) => {
                    const textContent = $(el).text().trim();
                    if (textContent && !seenText.has(textContent)) {
                        seenText.add(textContent);
                        content += textContent + '\n\n';
                    }
                });
            });

            if (!content) {
                ctx.session.state = null;
                return ctx.reply('⚠️Cant extract text form site.');
            }

            // Limitează conținutul la 4.000 de caractere (pentru a evita depășirea limitelor Telegram)
            if (content.length > 4000) {
                content = content.substring(0, 4000) + '...';
            }

            // Trimite conținutul extras utilizatorului
            await ctx.reply(`📄 Conținut extras de pe ${text}:\n\n${content}`);

        } catch (error) {
            console.error('Eroare la extragerea conținutului site-ului:', error);
            await ctx.reply('❌ A apărut o eroare la accesarea site-ului. Asigură-te că domeniul este corect și accesibil.');
        }

        ctx.session.state = null; // Resetare stare
        return;
    }
    if (state === 'awaiting_domain_for_get_source_code') {
        const validator = require('validator');
        const puppeteer = require('puppeteer');
        const fs = require('fs');
        const path = require('path');
        const axios = require('axios');
        const archiver = require('archiver');
        const { URL } = require('url');

        if (!validator.isFQDN(text)) {
            return ctx.reply('⚠️ Domeniu invalid. Încearcă din nou (ex: domeniu.com).');
        }

        await ctx.reply(`🔄 Se obține codul sursă și resursele de pe ${text}...`);

        let browser;
        try {
            browser = await puppeteer.launch();
            const page = await browser.newPage();

            await page.goto(`https://${text}`, { waitUntil: 'networkidle2', timeout: 30000 });

            const domainName = text.replace(/[^a-zA-Z0-9]/g, '_');
            const siteFolder = path.join(__dirname, domainName);
            if (!fs.existsSync(siteFolder)) {
                fs.mkdirSync(siteFolder);
            }

            async function downloadPage(currentUrl) {
                const localPage = await browser.newPage();
                await localPage.goto(currentUrl, { waitUntil: 'networkidle2', timeout: 30000 });
                await new Promise(resolve => setTimeout(resolve, 2000));

                let htmlContent = await localPage.content();
                const domainRegex = new RegExp(`https?://${text}`, 'g');
                htmlContent = htmlContent.replace(domainRegex, '.');

                const urlPath = new URL(currentUrl).pathname;
                const filePath = urlPath === '/' ? 'index.html' : path.join(urlPath, 'index.html');
                const fullFilePath = path.join(siteFolder, filePath);

                if (!fs.existsSync(path.dirname(fullFilePath))) {
                    fs.mkdirSync(path.dirname(fullFilePath), { recursive: true });
                }

                fs.writeFileSync(fullFilePath, htmlContent);

                const resources = await localPage.evaluate(() => {
                    const baseURL = window.location.origin;
                    const resources = [];

                    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
                        resources.push({ url: new URL(link.href, baseURL).href });
                    });
                    document.querySelectorAll('img').forEach(img => {
                        resources.push({ url: new URL(img.src, baseURL).href });
                    });
                    document.querySelectorAll('script[src]').forEach(script => {
                        resources.push({ url: new URL(script.src, baseURL).href });
                    });
                    return resources;
                });

                for (const resource of resources) {
                    try {
                        const resourceUrl = new URL(resource.url);
                        const resourcePathname = resourceUrl.pathname;
                        const resourcePath = path.join(siteFolder, resourcePathname);

                        if (!fs.existsSync(path.dirname(resourcePath))) {
                            fs.mkdirSync(path.dirname(resourcePath), { recursive: true });
                        }

                        const response = await axios.get(resource.url, { responseType: 'arraybuffer', validateStatus: null });

                        if (response.status === 200) {
                            fs.writeFileSync(resourcePath, response.data);
                        } else {
                            console.warn(`Resursa ${resource.url} a returnat status ${response.status}`);
                        }
                    } catch (error) {
                        console.error(`Eroare la descărcarea resursei ${resource.url}:`, error);
                    }
                }

                await localPage.close();
            }

            const headerLinks = await page.evaluate((domain) => {
                return Array.from(document.querySelectorAll('header a[href]'))
                    .map(a => a.href)
                    .filter(href => href.startsWith(domain));
            }, `https://${text}`);

            const uniqueLinks = Array.from(new Set([`https://${text}`, ...headerLinks]));

            for (const link of uniqueLinks) {
                await downloadPage(link);
            }

            const zipFilePath = path.join(__dirname, `${domainName}.zip`);
            const output = fs.createWriteStream(zipFilePath);
            const archive = archiver('zip', { zlib: { level: 9 } });

            output.on('close', async () => {
                await ctx.replyWithDocument({ source: zipFilePath });
                fs.rmSync(siteFolder, { recursive: true, force: true });
                fs.unlinkSync(zipFilePath);
            });

            archive.pipe(output);
            archive.directory(siteFolder, false);
            archive.finalize();

        } catch (error) {
            console.error('Eroare la obținerea codului sursă și resurselor:', error);
            await ctx.reply('❌ A apărut o eroare la accesarea site-ului. Verifică dacă domeniul este corect și accesibil.');
        } finally {
            if (browser) await browser.close();
        }

        ctx.session.state = null;
        return;
    }

    if (state === 'awaiting_domain_location') {
        const parts = text.split('*');
        if (parts.length !== 2 || !countryCodes[parts[1].trim().toUpperCase()]) {
            return ctx.reply('⚠️ Invalid format or country code. Try again (e.g., example.com*CA).');
        }
        ctx.session.domain = parts[0].trim();
        ctx.session.location = countryCodes[parts[1].trim().toUpperCase()];
        ctx.session.countryCode = parts[1].trim().toUpperCase();
        ctx.session.state = 'awaiting_headlines';
        return ctx.reply('Enter headlines separated by "/":');
    }

    if (state === 'awaiting_headlines') {
        const rawHeadlines = text.split('/').map(h => h.trim());
        const validHeadlines = rawHeadlines.filter(h => h.length <= 28);
        const invalidHeadlines = rawHeadlines.filter(h => h.length > 28);

        if (invalidHeadlines.length) {
            ctx.reply(`⚠️ Removed headlines (>28 chars):\n- ${invalidHeadlines.join('\n- ')}`);
        }

        ctx.session.headlines = validHeadlines;
        ctx.session.state = 'awaiting_descriptions';
        return ctx.reply('Enter descriptions separated by "/":');
    }

    if (state === 'awaiting_descriptions') {
        const rawDescriptions = text.split('/').map(d => d.trim());
        const validDescriptions = rawDescriptions.filter(d => d.length <= 88);
        const invalidDescriptions = rawDescriptions.filter(d => d.length > 88);

        if (invalidDescriptions.length) {
            ctx.reply(`⚠️ Removed descriptions (>88 chars):\n- ${invalidDescriptions.join('\n- ')}`);
        }

        ctx.session.descriptions = validDescriptions;
        ctx.session.state = 'awaiting_keywords';
        return ctx.reply('Enter keywords separated by "/" (or "0" for none):');
    }

    if (state === 'awaiting_keywords') {
        ctx.session.keywords = text.trim() === '0' ? [] : text.split('/').map(k => k.trim());

        const scriptContent = scriptTemplate
            .replace('{{campaignName}}', `Search-${ctx.session.domain.slice(0,8)}-${ctx.session.countryCode}`)
            .replace('{{adGroupName}}', `Ad group${ctx.session.countryCode}1`)
            .replace('{{finalUrl}}', `https://${ctx.session.domain}`)
            .replace('{{budget}}', (Math.random() * (8 - 5) + 5).toFixed(2))
            .replace('{{location}}', ctx.session.location)
            .replace('{{headlines}}', JSON.stringify(ctx.session.headlines))
            .replace('{{descriptions}}', JSON.stringify(ctx.session.descriptions))
            .replace('{{keywords}}', JSON.stringify(ctx.session.keywords));

        const fileName = `Campaign-${ctx.session.domain}-${ctx.session.countryCode}.txt`;
        fs.writeFileSync(fileName, scriptContent);

        await ctx.replyWithDocument({ source: fileName });
        fs.unlinkSync(fileName);

        ctx.session.state = null;
        return ctx.reply('🎉 Campaign script generated successfully!');
    }

});




