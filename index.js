
require('dotenv').config();
const { Telegraf } = require('telegraf');
const RedisSession = require('telegraf-session-redis');
const bot = new Telegraf(process.env.BOT_TOKEN);
const fs = require('fs');
const scriptTemplate = require('./scripttemplate');
const axios = require('axios');
const cheerio = require('cheerio');
const OpenAI = require('openai');
const puppeteer = require('puppeteer');
const path = require('path');
const archiver = require('archiver');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

bot.launch()
    .then(() => console.log('🚀 Botul rulează perfect acum!'))
    .catch((err) => console.error('Eroare:', err));

const countryCodes = {
    CA: "Canada", AT: "Austria", GR: "Greece", AU: "Australia",
    DE: "Germany", NL: "Netherlands", IRL: "Ireland", ES: "Spain", PT: "Portugal", IN: "India"
};


const session = new RedisSession({
    store: { url: process.env.REDIS_URL }
});

bot.use(session.middleware());

// Comanda start cu mesaj personalizat și tastatură explicită
bot.start((ctx) => {
    const username = ctx.from.username || ctx.from.first_name;

    const welcomeMessage = ctx.session.visited
        ? `Welcome back to FoxFarm🦊, ${username}!`
        : `Welcome to FoxFarm🦊, ${username}!`;

    ctx.session.visited = true;

    bot.telegram.sendMessage(ctx.chat.id, welcomeMessage, {
        reply_markup: {
            keyboard: [['📝 Create Camp', '📊 DataScript'],['📂 Extract Data','☣️ Get SourceCode'] ,['🪄 Generate assets','🪄 Deep Assets']],
            resize_keyboard: true,
        },
    });
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
    const filePath = `./${scriptName}.txt`;

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


bot.hears('📝 Create Camp', (ctx) => {
    ctx.session.state = 'awaiting_domain_location';
    ctx.reply('Please enter domain & location(format: domain.com-CA)');
});

bot.hears('☣️ Get SourceCode', (ctx) => {
    ctx.session.state = 'awaiting_domain_for_get_source_code';
    ctx.reply('🌐 Enter web site:');
});

bot.on('text', async (ctx) => {
    const state = ctx.session.state;
    const text = ctx.message.text;
    if (['📊 DataScript', '📝 Create Camp', '🪄 Generate assets','☣️ Get SourceCode', '🪄 Deep Assets','📂 Extract Data'].includes(text)) {
        return;
    }

    if (state === 'awaiting_domain_for_assets') {
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

            await ctx.reply('✨ Se generează acum descrierea adaptată prin ChatGPT...');

            // apel OpenAI
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    store: true,
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
            const relevantTags = ['p'];

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
        const parts = text.split('-');
        if (parts.length !== 2 || !countryCodes[parts[1].trim().toUpperCase()]) {
            return ctx.reply('⚠️ Invalid format or country code. Try again (e.g., example.com/CA).');
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






