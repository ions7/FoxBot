
require('dotenv').config();
const { Telegraf } = require('telegraf');
const RedisSession = require('telegraf-session-redis');
const bot = new Telegraf(process.env.BOT_TOKEN);
const fs = require('fs');
const scriptTemplate = require('./scripttemplate');

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
            keyboard: [['📝 Create Camp', '📊 DataScript'], ['🪄 Generate assets']],
            resize_keyboard: true,
        },
    });
});
bot.hears('🪄 Generate assets', (ctx) => ctx.reply('Generate assets selected 🪄'));
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

bot.on('text', async (ctx) => {
    const state = ctx.session.state;
    const text = ctx.message.text;
    if (['📊 DataScript', '📝 Create Camp', '🪄 Generate assets'].includes(text)) {
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



