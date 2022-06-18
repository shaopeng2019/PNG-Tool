/**
 * MVC项目前端框架JS
 * version: 1.0.0
 * updateTime:2021/12/21
 * author:xiaofanblog.net
 */
(function(){
  /**
   * @function 创建应用
   * @param {Object} options 自定义配置参数
   */
  var app=window.APP=function(options){
    this.pageManage=options.pageManage||{};
    this.handleEvns = app.utils.objectsBindThis(options.handleEvns||{},this);
    this.before=options.before||function(){};
    this.after=options.after||function(){};
    this.events=[];//所有的滚动事件
    this.eventListenerInit();
  };
  
  /**
   * @function 运行指定页面
   * @param {String} pageName 页面名
   */
  app.prototype.run=function(pageName){
    var self=this;
    self.before.call(this);
    if(!self.pageManage[pageName]){
      throw new Error('APP.run(pagename) "pagename"页面名不存在!');
    }
    self.pageManage[pageName].call(this);
    self.after.call(this);
  }

  /**
   * @function 通用事件监听
   */
  app.prototype.eventListenerInit=function(){
    var self=this;
    var eventRun=function(eventTypeName,e){
      for(var i=0;i<self.events.length;i++){
        var event=self.events[i];
        if(event.eventTypeName===eventTypeName){
          event.func(e);
        }
      }
    }
    //滚动事件
    $(document).scroll(function(e){
      eventRun('scroll',e);
    })
    // 屏幕缩放事件
    $(window).resize(function(e){
      eventRun('resize',e);
    })
    // requestAnimationFrame
    var frameRun=function(e){
      eventRun('frame',e);
      requestAnimationFrame(frameRun)
    }
    frameRun();
  }

  /**
  * @function 添加事件
  * @param {String} eventTypeName 事件类名 如click scroll ...
  * @param {String} eventName 自定义事件名
  * @param {Function} func 事件回调
  * @param {String} [option] throttle 或者 debounce，默认false
  * @param {Number} [delay] 选择节流或防抖后设置间隔时间 默认100
  */
  app.prototype.addEvent=function(eventTypeName,eventName,func,option,delay){
    var self=this;
    var optArr=['throttle','debounce'];
    //创建新事件
    var eventFunc=(function(){
      if(!option){
        return func;
      }
      for(var i=0;i<optArr.length;i++){
        if(optArr[i]===option){
          return app.utils[option](function(e){
            func(e);
          },delay||100)
        }
      }
    })();
    //查找重复
    for(var i=0;i<self.events.length;i++){
      var event=self.events[i];
      if(event.eventTypeName===eventTypeName&&event.eventName===eventName){
        event.func=eventFunc;
        return false;
      }
    }
    //没有重复，生成新事件
    self.events.push({
      eventTypeName:eventTypeName,
      eventName:eventName,
      func:eventFunc
    })
  }

  /**
  * @function 删除事件
  * @param {String} eventTypeName 事件类名 如click scroll ...
  * @param {String} eventName 自定义事件名
  */
  app.prototype.removeEvent=function(eventTypeName,eventName){
    var self=this;
    var index=null;
    for(var i=0;i<self.events.length;i++){
      var event=self.events[i];
      if(event.eventTypeName===eventTypeName&&event.eventName===eventName){
        index=i;
        break;
      }
    }
    if(index){
      self.events.splice(index,1);
    }
  }

  // 挂载工具库
  app.utils = {
    //处理input focus时被键盘遮挡问题-兼容问题
    AndroidInputTextarea: function () {
      if (/Android/.test(navigator.appVersion)) {
        window.addEventListener("resize", function () {
          if (document.activeElement.tagName == "INPUT" || document.activeElement.tagName == "TEXTAREA") {
            window.setTimeout(function () {
              document.activeElement.scrollIntoViewIfNeeded();
            }, 0);
          }
        })
      }
    },
    // 获取url参数
    getQueryVariable: function (variable) {
      var query = window.location.search.substring(1);
      var vars = query.split("&");
      for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) { return decodeURI(pair[1]); }
      }
      return false;
    },
    // 获取井号后面的参数
    getPoundAfterVariable: function () {
      var value = window.location.href.split("#")[1];
      return value ? decodeURIComponent(value) : false;
    },
    //计算rem值
    getResponsiveFlex: function (val) {
      var screenWidth = document.documentElement.clientWidth
      var whdef = 100 / 750
      return ((screenWidth * whdef) / 100) * val;
    },
    // 节流函数
    throttle: function (func, delay) {
      var run = true
      return function () {
        self=this
        arg=arguments;
        if (!run) {
          return false
        }
        run = false
        setTimeout(function () {
          func.apply(self, arg)
          run = true
        }, delay || 500)
      }
    },
    // 防抖函数
    debounce:function(func,delay){
      let timer=null;
      return function(){
        self=this
        arg=arguments;
        if(timer){
          clearTimeout(timer)
        }
        timer=setTimeout(function(){
          func.apply(self,arg)
        },delay||500);
      }
    },
    // 秒 =>转=> mm:ss
    getTimeToString: function (ss) {
      var m = Math.floor(ss / 60)
      // 秒获取
      var s = ss % 60
      if (m.toString().length < 2) {
        m = '0' + m
      }
      if (s.toString().length < 2) {
        s = '0' + s
      }
      return m + ':' + s
    },
    // 一些常用且可靠的表单验证
    isFixedPhone: function (val) {
      return /^bai0[1-9]{2,3}-[1-9]\d{5,7}$/.test(val)
    },
    // 手机号验证
    isPhone: function (val) {
      return /^1[3456789]\d{9}$/.test(val)
    },
    // 邮箱验证
    isEmail:function(val){
      return /^([a-zA-Z]|[0-9]|\-|\_)(\w|\-|\_)+@([a-zA-Z0-9]|\-|\_)+\.([a-zA-Z]{2,4})$/.test(val)
    },
    //判断是否是指定的浏览器
    navigator: {
      isFirefox: function () {
        return navigator.userAgent.indexOf("Firefox") >= 0;
      },
      isChrome: function () {
        return navigator.userAgent.indexOf("Chrome") >= 0;
      },
      isSafari: function () {
        return navigator.userAgent.indexOf("Safari") >= 0;
      },
      isIE: function () {
        return navigator.userAgent.indexOf("MSIE") >= 0;
      }
    },
    configMerge: function (m, n) {
      var keys = Object.keys(m)
      for (var i = 0; i < keys.length; i++) {
        var currentKey = n[keys[i]]
        if (currentKey) {
          m[keys[i]] = currentKey
        }
      }
      return m
    },
    // 20220223新增方法，为了将一个对象下的所有方法改变this指向
    objectsBindThis:function(object,self){
      var cloneObj=app.utils.deepClone(object);
      var keys= Object.keys(cloneObj);
      for(var i=0;i<keys.length;i++){
        cloneObj[keys[i]] = cloneObj[keys[i]].bind(self);
      }
      return cloneObj;
    },
    isExist: function (val) {
      //判断是否为空,多用于字符串模板拼接
      if (typeof val !== 'undefined' && val !== '') {
        return val
      }
      return false
    },
    deepClone: function (target) {
      //深拷贝
      var result;
      if (typeof target === 'object') {
        // 如果是一个数组的话
        if (Array.isArray(target)) {
          result = [];
          for (var i in target) {
            // 递归克隆数组中的每一项
            result.push(app.utils.deepClone(target[i]))
          }
        } else if (target === null) {
          result = null;
          // 判断如果当前的值是一个RegExp对象的话，直接赋值    
        } else if (target.constructor === RegExp) {
          result = target;
        } else {
          result = {};
          for (var i in target) {
            result[i] = app.utils.deepClone(target[i]);
          }
        }
      } else {
        result = target;
      }
      return result;
    },
    uuidCreate: function () {
      // 创建唯一编号
      var s4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
      }
      return (s4() + s4() + s4() + s4() + s4() + s4() + s4() + s4());
    }
  }

})();

Array.prototype.remove = function(val) { 
  var index = this.indexOf(val); 
  if (index > -1) { 
  this.splice(index, 1); 
  } 
};