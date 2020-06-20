const { Telegraf } = require('telegraf');
const session = require('telegraf/session');

require('dotenv').config();

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());
bot.start((ctx) => ctx.reply('Привет я могу помочь тебе при выборе литературы'));
bot.help((ctx) => ctx.reply('Send me a sticker'));

bot.on('sticker', (ctx) => ctx.reply('👍'));

bot.launch();
