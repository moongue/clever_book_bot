const { Telegraf } = require('telegraf');
const Stage = require('telegraf/stage');
const Scene = require('telegraf/scenes/base');
const Markup = require('telegraf/markup');
const session = require('telegraf/session');
const fetch = require('node-fetch');

require('dotenv').config();

const stage = new Stage();

const start = new Scene('start');
start.enter((ctx) => {
  ctx.reply('Привет, чем могу помочь?😊', Markup
    .keyboard([
      ['🔍 Найти книгу', '😎 Посоветовать'], // Row1 with 2 buttons
    ])
    .oneTime()
    .resize()
    .extra());
});

start.hears('🔍 Найти книгу', (ctx) => {
  ctx.scene.enter('search');
});

stage.register(start);

const search = new Scene('search');

search.enter((ctx) => ctx.reply('Введите название киниги или имя автора'));
search.hears('🔍 Найти книгу', (ctx) => ctx.reply('Введите название киниги или имя автора'));

search.on('text', async (ctx) => {
  ctx.session.currentIdx = ctx.session.currentIdx || 0;
  ctx.session.currentIdx++;

  const message = ctx.message.text;
  const uri = encodeURI(message);
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${uri}`);
  ctx.session.data = await response.json();

  await ctx.replyWithPhoto(ctx.session.data.items[ctx.session.currentIdx].volumeInfo.imageLinks.smallThumbnail);
  await ctx.reply(`
📙 Название: ${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.title}
😺 Автор/ы: ${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.authors.join(' ')}

${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.publisher ? `🏬 Издатель: ${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.publisher}` : ''} 
${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.pageCount ? `📏 Кол-во страниц: ${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.pageCount}` : ''}
${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.averageRating ? `📝 Рейтинг: ${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.averageRating}⭐` : ''}
${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.description ? `📌 Описание: 👉${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.description}👈` : ''}

  `);

  ctx.reply('', Markup
    .keyboard([
      ['🔍 Найти книгу', '➡Следующие совпадение'],
    ])
    .oneTime()
    .resize()
    .extra());
});

stage.register(search);

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());
bot.use(stage.middleware());
bot.start((ctx) => ctx.scene.enter('start'));

bot.launch();
