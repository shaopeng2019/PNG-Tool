const schedule = require('node-schedule');
const fs = require('fs');
const path = require('path');

const cleanFiles = (filesPath) => {
  try {
    var currentTimeStamp = Date.now();
    fs.readdir(filesPath, (error, files) => {
      if (error) {
        console.log(error);
        return false;
      }
      files.forEach(fileName => {
        var filePath = path.resolve(filesPath, fileName)
        var stat = fs.statSync(filePath);
        // 如果文件在1个小时以前创建的，则进行删除
        if (stat.birthtimeMs < (currentTimeStamp - 1000*60*60*1)) {
          if (stat.isDirectory()) {
            fs.rm(filePath, { recursive: true, maxRetries: 5, retryDelay: 1000 }, (err) => {
              if (err) {
                console.log(err)
              }
            })
          } else {
            fs.unlink(filePath, (err) => {
              if (err) {
                console.log(err)
              }
            });
          }
        }
      })
    })
  } catch (error) {
    console.log(error)
  }
}



module.exports = () => {
  const rule = new schedule.RecurrenceRule();
  // rule.hour = 23;
  rule.minute = 10
  // rule.second = [10,20,30,40,50];
  const job = schedule.scheduleJob(rule, () => {
    // 压缩资源完整路径
    const compressFilesPath = path.resolve(__dirname, '../../public/compress');
    // 缓存资源的完整路径
    const cacheFilesPath = path.resolve(__dirname, '../../cache/slice_temp');
    cleanFiles(compressFilesPath);
    cleanFiles(cacheFilesPath);
    console.log('执行定时任务');
  });
}



