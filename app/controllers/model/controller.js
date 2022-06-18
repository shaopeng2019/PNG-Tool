const path = require('path');

module.exports = class Controller {
  constructor() {
    // 根目录
    this.rootPath=path.resolve(__dirname,'../../../');
  }
}