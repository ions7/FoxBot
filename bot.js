require('dotenv').config();
const { Telegraf } = require('telegraf');
const RedisSession = require('telegraf-session-redis');
const bot = new Telegraf(process.env.BOT_TOKEN);

// Încărcare handler-e din fișiere separate
const generateText_Assets = require('./states/generate_text_assets');
const setupAutoSearchCamp = require('./states/searchCamp');
const setupDisplayCamp  = require('states/displayCamp');
const getTextFromSite = require('/states/getTextfromSite');
const getSourceCode = require('/states/getSourceCode');
const getTrackerCode = require('./states/tracker');
const searchCampStep = require('/states/searchCampStep')
// Configurare middleware și sesiune
const { sessionMiddleware, statsMiddleware } = require('states/utils/redis');
bot.use(sessionMiddleware);
bot.use(statsMiddleware);

// Comenzi de bază
bot.start(require('./states/start'));

// Înregistrare handler-e
setupDisplayCamp(bot); // display camp
setupAutoSearchCamp(bot); //search camp
generateText_Assets(bot); // generate text assets like headlines , description , keywords
getSourceCode(bot);  // get source code for website
getTextFromSite(bot); // get h1,h2,h3, p from a web site
searchCampStep(bot); //semi auto search camp
getTrackerCode(bot);  //traker for day3

bot.launch()
    .then(() => console.log('🚀 Botul rulează perfect acum!'))
    .catch((err) => console.error('Eroare:', err));