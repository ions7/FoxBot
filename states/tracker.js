const { countryCodes } = require('../config');
const { filterAdContent } = require('/utils/filters');
const { generateAutoCampScript } = require('/utils/generators');
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");

module.exports = async function getTrackerCode(bot){


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


}
