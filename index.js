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

  const message = ctx.message.text;
  const uri = encodeURI(message);
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${uri}`);
  ctx.session.data = await response.json();

  await ctx.scene.enter('display');
});

stage.register(search);

const display = new Scene('display');

display.enter(async (ctx) => {
  if (ctx.session.currentIdx === ctx.session.data.totalItems - 1) {
    return ctx.reply('Вы посмотрели все совпадения😊', Markup
      .keyboard([
        ['🔍 Найти книгу', '😎 Посоветовать'],
      ])
      .oneTime()
      .resize()
      .extra());
  }

  if (ctx.session.data.items[ctx.session.currentIdx].volumeInfo.imageLinks) {
    await ctx.replyWithPhoto(ctx.session.data.items[ctx.session.currentIdx]
      .volumeInfo.imageLinks.smallThumbnail);
  }

  await ctx.replyWithHTML(`
<b>📙 Название:</b> ${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.title}
${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.authors ? `<b>😺 Автор/ы:</b> ${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.authors.join(' ')}` : ''}

${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.publisher ? `<b>🏬 Издатель:</b> ${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.publisher}` : ''} 
${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.pageCount ? `<b>📏 Кол-во страниц:</b> ${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.pageCount}` : ''}
${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.averageRating ? `<b>📝 Рейтинг:</b> ${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.averageRating}⭐` : ''}
${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.description ? `<b>📌 Описание:</b> 👉${ctx.session.data.items[ctx.session.currentIdx].volumeInfo.description}👈` : ''}


Я нашёл ещё ${ctx.session.data.totalItems} совпадений😎
  `, Markup
    .keyboard([
      ['🔍 Найти книгу', '➡ Следующие совпадение'],
    ])
    .oneTime()
    .resize()
    .extra());

  ctx.session.currentIdx++;
});

display.hears('➡ Следующие совпадение', (ctx) => ctx.scene.enter('display'));

stage.register(display);

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());
bot.use(stage.middleware());
bot.start((ctx) => ctx.scene.enter('start'));

bot.hears('🔍 Найти книгу', (ctx) => ctx.scene.enter('search'));

bot.launch();
