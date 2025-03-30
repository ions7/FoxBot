const { countryCodes } = require('../config');
const { filterAdContent } = require('/utils/filters.js');
const { generateAutoCampScript } = require('/utils/generators');
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

module.exports = async function generateText_Assets(bot){
    bot.hears('🪄 Generate assets', async (ctx) => {
        ctx.session.state = 'awaiting_domain_for_assets';
        await ctx.reply('Please enter your web site:');
    });

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

    });

}