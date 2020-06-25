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
      ['😎 Посоветовать'],
    ])
    .oneTime()
    .resize()
    .extra());

  ctx.session.currentIdx++;
});

display.hears('➡ Следующие совпадение', (ctx) => ctx.scene.enter('display'));

stage.register(display);

const genre = new Scene('genre');

genre.enter(async (ctx) => ctx.reply('Выберите интересующий вас жанр книги 📖', Markup
  .keyboard([
    ['Классика', 'Приключения', 'Проза'],
    ['Ужасы', 'История', 'Роман'],
    ['Фантастика', 'Фэнтези', 'Детектив'],
    ['Наука', 'Юмор', 'Компьютеры'],
  ])
  .oneTime()
  .resize()
  .extra()));

genre.on('message', async (ctx) => {
  const allowable = ['классика', 'приключения', 'проза', 'ужасы', 'история', 'роман', 'фантастика', 'фэнтези', 'детектив', 'наука', 'юмор', 'компьютеры'];
  const messageText = ctx.message.text.toLowerCase();

  if (!allowable.includes(messageText)) {
    return ctx.reply('Выберите жанр', Markup
      .keyboard([
        ['Классика', 'Приключения', 'Проза'],
        ['Ужасы', 'История', 'Роман'],
        ['Фантастика', 'Фэнтези', 'Детектив'],
        ['Наука', 'Юмор', 'Компьютеры'],
      ])
      .oneTime()
      .resize()
      .extra());
  }

  const uri = encodeURI(messageText);
  const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${uri}&maxResults=40&langRestrict=ru`);
  ctx.session.data = await response.json();

  // const newData = data.items.filter((item) => item.volumeInfo.averageRating > 4);
  // for (let i = 40; i < data.totalItems; i += 40) {
  //   const portion = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${uri}&startIndex=${i}&maxResults=40&langRestrict=ru`);
  //   const portionData = await portion.json();
  //   data.items.push(...portionData.items);
  // }

});

stage.register(genre);

const bot = new Telegraf(process.env.BOT_TOKEN);
bot.use(session());
bot.use(stage.middleware());
bot.start((ctx) => ctx.scene.enter('start'));

bot.hears('🔍 Найти книгу', (ctx) => ctx.scene.enter('search'));
bot.hears('😎 Посоветовать', (ctx) => ctx.scene.enter('genre'));

bot.launch();
