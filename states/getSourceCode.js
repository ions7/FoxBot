const { countryCodes } = require('../config');
const { filterAdContent } = require('/utils/filters');
const { generateAutoCampScript } = require('/utils/generators');
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

module.exports = async function getSourceCode(bot){
    bot.hears('☣️ Get SourceCode', (ctx) => {
        ctx.session.state = 'awaiting_domain_for_extract_data';
        ctx.reply('🌐 Enter web site:');
    });

    bot.on('text', async (ctx) => {
        const state = ctx.session.state;
        const text = ctx.message.text;
        if (['📊 DataScript', '📝 Create Camp', '🔎 Search Camp', '🖼️ Display Camp', '🪄 Generate assets', '☣️ Get SourceCode', '🪄 Deep Assets', '📂 Extract Data'].includes(text)) {
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
                    const relevantTags = ['h1', 'h2', 'h3', 'p'];

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


        });


}
