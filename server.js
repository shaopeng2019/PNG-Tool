const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const router = require('./app/controllers')
const scheduleTask = require('./app/services/scheduleTask')

const app = express();

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())

// view engine setup
app.engine('html', require('express-art-template'));
app.set('view options', {
  debug: process.env.NODE_ENV !== 'production',
  escape: true,
  extname: '.html'
});
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'html');

app.use('/', router)
app.use(express.static('public'))

app.use((req, res, next) => {
  var err = new Error('Not Found');
  err.status = 404;
  res.send('404');
})

app.listen(5000, () => {
  console.log('应用程序已启动')
  console.log('http://localhost:5000')
})

// app.listen(process.env.PORT, () => {
//   console.log('应用程序已启动')
// })

// 执行定时任务
scheduleTask();
