const { countryCodes } = require('../config');
const { filterAdContent } = require('./utils/filters');
const { generateAutoCampScript } = require('./utils/generators');
const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const scriptTemplate = require("../testScripts/scriptTemplate");

module.exports = async function searchCampStep(bot) {
    bot.hears('📝 Create Camp', (ctx) => {
        ctx.session.state = 'awaiting_domain_location';
        ctx.reply('Please enter domain & location(format: domain.com-CA)');
    });

    bot.on('text', async (ctx) => {
        const state = ctx.session.state;
        const text = ctx.message.text;
        if (['📊 DataScript', '📝 Create Camp', '🔎 Search Camp', '🖼️ Display Camp', '🪄 Generate assets', '☣️ Get SourceCode', '🪄 Deep Assets', '📂 Extract Data'].includes(text)) {
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
                .replace('{{campaignName}}', `Search-${ctx.session.domain.slice(0, 8)}-${ctx.session.countryCode}`)
                .replace('{{adGroupName}}', `Ad group${ctx.session.countryCode}1`)
                .replace('{{finalUrl}}', `https://${ctx.session.domain}`)
                .replace('{{budget}}', (Math.random() * (8 - 5) + 5).toFixed(2))
                .replace('{{location}}', ctx.session.location)
                .replace('{{headlines}}', JSON.stringify(ctx.session.headlines))
                .replace('{{descriptions}}', JSON.stringify(ctx.session.descriptions))
                .replace('{{keywords}}', JSON.stringify(ctx.session.keywords));

            const fileName = `Campaign-${ctx.session.domain}-${ctx.session.countryCode}.txt`;
            fs.writeFileSync(fileName, scriptContent);

            await ctx.replyWithDocument({source: fileName});
            fs.unlinkSync(fileName);

            ctx.session.state = null;
            return ctx.reply('🎉 Campaign script generated successfully!');
        }

    });
};