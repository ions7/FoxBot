const { escapeMarkdown } = require('../utils/helpers');
const { countryCodes } = require('../config');

module.exports = (bot) => {
    bot.start(async (ctx) => {
        const username = ctx.from.username || ctx.from.first_name;
        const isReturning = ctx.session.visited;

        // Mesaj de bun venit personalizat
        const welcomeMessage = isReturning
            ? `${username} Do you know why Google doesn’t love casinos?`
            : `Welcome to FoxFarm🦊, ${username}!`;

        // Setăm flag-ul de vizită în sesiune
        ctx.session.visited = true;
        ctx.session.userId = ctx.from.id;

        try {
            // Trimitem mesajul principal cu butoanele
            await ctx.reply(welcomeMessage, {
                reply_markup: {
                    keyboard: [
                        ['🤖 Display Camp', '🤖 Auto Campaign'],
                        ['📝 Create Camp', '📊 DataScript'],
                        ['📂 Extract Data', '☣️ Get SourceCode'],
                        ['🪄 Generate assets', '🪄 Deep Assets']
                    ],
                    resize_keyboard: true,
                },
                parse_mode: 'Markdown'
            });

            // Trimitem gluma separat
            const joke = 'Because every time it tried to play, it lost everything... ' +
                'in "cookies" and got banned for "❌Circumventing Systems"! 😆🎰';

            await ctx.reply(joke);

            // Actualizăm statisticile în Redis
            if (ctx.from.id === 6742445633) { // ID admin
                await ctx.reply(
                    `👑 *Admin Panel*\n` +
                    `Total users: ${await statsRedis.keys('user:*:info').length}`,
                    { parse_mode: 'Markdown' }
                );
            }

        } catch (error) {
            console.error('Eroare la comanda /start:', error);

            await ctx.reply(
                `Welcome to FoxFarm🦊, ${escapeMarkdown(username)}!\n\n` +
                'Use commands:\n' +
                '- /help - Show available commands\n' +
                '- /menu - Show interactive menu'
            );
        }
    });

    // Handler pentru comanda /menu care reafișează butoanele
    bot.command('menu', async (ctx) => {
        await ctx.reply('Main menu:', {
            reply_markup: {
                keyboard: [
                    ['🔎 Search Camp', '🖼️ Display Camp'],
                    ['📝 Create Camp', '📊 DataScript'],
                    ['📂 Extract Data', '☣️ Get SourceCode'],
                    ['🪄 Generate assets', '🪄 Deep Assets']
                ],
                resize_keyboard: true
            }
        });
    });
};