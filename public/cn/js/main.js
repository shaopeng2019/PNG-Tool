;(function(){
  var compressItem=window.CompressItem=function(options){
    this.file=options.file || null;
    // 完成时用于通知队列
    this.params=options.params;
    this.complateBack = options.complateBack||function(){};
    this.$container = $('.main .queue');
    this.state=0;// 0 表示候选中 1 表示进行中 2表示完成 -1表示失败
    this.initDomRender();
  }
  compressItem.prototype.initDomRender=function(){
    var self=this;
    // 校验
    var typeCheck=function(type){
      var types=[
        'image/gif',
        'image/png',
        'image/webp',
        'image/jpeg',
        'image/tiff'
      ];
      for(var i=0;i<types.length;i++){
        if (type === types[i]){
          return true;
        }
      }
      return false;
    }

    var progressDom = '<div class="progress-value">' +
        '<h2 class="result-tips"></h2>' +
      '</div>';
    if(self.file.size>(1024*1024*20)){
      self.state= -1;// 标记失败状态
      progressDom = '<div class="progress-value error" style="width:100%;">' +
        '<h2 class="result-tips">文件过大，不能超过20MB</h2>' +
        '</div>';
    } else if (!typeCheck(self.file.type)){
      self.state = -1;// 标记失败状态
      progressDom = '<div class="progress-value error" style="width:100%;">' +
        '<h2 class="result-tips">无法处理该格式的文件</h2>' +
        '</div>';
    }

    var html = '<div class="queue-item">'+
      '<h2 class="name" >'+self.file.name+'</h2>'+
          '<div class="middle">' +
            '<h2 class="original-size">'+self.getSizeText(self.file.size)+'</h2>' +
            '<div class="progress-box">' + progressDom +'</div>'+
            '<h2 class="after-size"></h2>'+
          '</div>'+
          '<div class="right-group">'+
            '<a class="download-link" href="javascript:void(0)">点击下载</a>'+
            '<h2 class="percentage"></h2>'+
          '</div>'+
        '</div >';
    self.$el=$(html);
    self.$progressValue = self.$el.find('.progress-value');
    self.$progressTips = self.$progressValue.children('.result-tips');
    self.$afterSize = self.$el.find('.after-size');
    self.$rightGroup = self.$el.find('.right-group');
    self.$percentage = self.$rightGroup.children('.percentage');
    self.$download = self.$rightGroup.children('.download-link');
    self.$container.append(self.$el);
  }
  compressItem.prototype.start=function(){
    var self=this;
    self.state=1;// 状态：进行中
    // 选择上传方案
    if(self.file.size < (1024*1024*2)) {
      // SIZE <= 1MB 单次上传
      self.fileRender(function(base64){
        self.uploadService(function(data){
          self.complateBack();
        })
      })
    } else {
      // 分片上传
      self.sliceSize = 1024*1024*1; // 1MB 分片
      self.totalSliceCount = Math.ceil(self.file.size / self.sliceSize); // 总片数
      self.currentSliceCount = 0; // 当前分片数
      self.fileSign = APP.utils.uuidCreate(); // 分片签名
      self.sliceUploadService(function(data) {
        self.complateBack();
      })
    }
  }
  compressItem.prototype.fileRender = function (callback) {
    var self=this;
    var fr = new FileReader()
    fr.onload = function (e) {
      // 如果是图片的话,这里输出base64
      callback(this.result)
    }
    fr.onprogress=function(e){
      var total = e.total;
      var current = e.loaded;
      var progress = Math.floor(current/total*100);
      if (progress >= 50 && progress < 100) {
        self.updateProgress(progress,'Reading...')
      } else if (progress >= 100) {
        self.updateProgress(progress, 'Processing...')
      }
    }
    fr.onerror=function(e){
      self.state=-1;
      self.updateProgress(100, '读取错误，请刷新重试')
    }
    fr.onabort=function(e){
      self.state = -1;
      self.updateProgress(100, '读取已中断')
    }
    fr.readAsDataURL(self.file);
  }
  compressItem.prototype.uploadService=function(callback){
    var self=this;
    var formData=new FormData();
    formData.append('file', self.file);
    var keys = Object.keys(self.params);
    for(var i=0;i<keys.length;i++){
      var key = keys[i]
      formData.append(key, self.params[key]);
    }
    $.ajax({
      method: 'POST',
      url: '/processing',
      data: formData,
      // 不对FromData中的url进行编码，原样发送
      processData: false,
      // 不修改contentType属性，使用默认
      contentType: false,
      success: function (res) {
        if(res.error===-1){
          self.state = -1;
          self.updateProgress(100, res.message);
          callback();
          return false;
        }
        var url=res.data.url;
        var size = res.data.size;
        self.$afterSize.html(self.getSizeText(size));
        self.$rightGroup.addClass('show');
        var percentage = Math.floor((self.file.size - size) / self.file.size*1000)/10;
        if (percentage>=0){
          self.$percentage.html('- '+percentage+'%');
        }else {
          percentage = Math.abs(percentage);
          self.$percentage.addClass('red');
          self.$percentage.html('+ ' + percentage + '%');
        }
        self.$download.attr('href',url);
        self.$download.attr('download', self.file.name);
        self.state=2;
        self.updateProgress(100, 'Finished');
        var $total = $('.download-all-btn .total');
        var total = Number($total.html());
        $total.html(total+1);
        callback();
      },
      error:function(res){
        self.state=-1;
        self.updateProgress(100,'网络不稳定，请重试');
      }
    })
  }
  compressItem.prototype.sliceUploadService=function(callback){
    var self=this;
    // 分片上传
    var start = self.currentSliceCount * self.sliceSize;
    var end = start + self.sliceSize;
    var slice = self.file.slice(start, end);//切割文件
    var formData = new FormData();
    formData.append("currentSliceCount", self.currentSliceCount);
    formData.append("totalSliceCount", self.totalSliceCount);
    formData.append("fileName", self.file.name);
    formData.append("fileSign", self.fileSign);
    formData.append("slice", slice);
    var keys = Object.keys(self.params);
    for(var i=0;i<keys.length;i++){
      var key = keys[i]
      if (key === 'id') {
        formData.append(key, self.params[key]);
      } else if (self.currentSliceCount + 1 >= self.totalSliceCount) {
        // 如果是最后一片，合并后需要压缩，所以再传入压缩需要的参数包括水印文件等，节省流量
        formData.append(key, self.params[key]);
      }
    }
    $.ajax({
      method: 'POST',
      url: '/sliceprocessing',
      data: formData,
      // 不对FromData中的url进行编码，原样发送
      processData: false,
      // 不修改contentType属性，使用默认
      contentType: false,
      success: function (res) {
        if(res.error===-1){
          self.state = -1;
          self.updateProgress(100, res.message);
          callback();
          return false;
        }
        if (res.data.url){
          // 返回url代表已经压缩完成
          var url = res.data.url;
          var size = res.data.size;
          self.$afterSize.html(self.getSizeText(size));
          self.$rightGroup.addClass('show');
          var percentage = Math.floor((self.file.size - size) / self.file.size * 1000) / 10;
          if (percentage >= 0) {
            self.$percentage.html('- ' + percentage + '%');
          } else {
            percentage = Math.abs(percentage);
            self.$percentage.addClass('red');
            self.$percentage.html('+ ' + percentage + '%');
          }
          self.$download.attr('href', url);
          self.$download.attr('download', self.file.name);
          var $total = $('.download-all-btn .total');
          var total = Number($total.html());
          $total.html(total + 1);

          self.state = 2;
          self.updateProgress(100, 'Finished');

          callback();
          return false;
        }
        var current = res.data.currentSliceCount + 1;
        var total = res.data.totalSliceCount;
        if (current >= total) {
          self.updateProgress(100, 'Processing...');
        }else {
          var percentage = Math.floor(current / total*100);
          self.updateProgress(percentage, percentage>16?percentage+'%':'');
        }
        self.currentSliceCount=res.data.currentSliceCount;
        self.sliceUploadService(callback); //递归
      },
      error:function(res){
        self.state=-1;
        self.updateProgress(100,'网络不稳定，请重试');
      }
    })
  }
  compressItem.prototype.updateProgress = function (progress,message) {
    var self=this;
    self.$progressValue[0].style.cssText = 'width:' + progress + '%';
    self.$progressTips.html(message)
    if(self.state===-1){
      // 失败
      self.$progressValue.addClass('error');
    } else if (self.state === 2) {
      self.$progressValue.addClass('success');
    }
  }
  compressItem.prototype.getSizeText = function (size) {
    if((size/1024)<1){
      return Math.floor(size*100) / 100 + ' B';
    }else {
      size=size/1024;
      if(size/1024<1){
        return Math.floor(size * 100) / 100 + ' KB';
      }else {
        size = size / 1024;
        if (size / 1024 < 1){
          return Math.floor(size * 100) / 100 + ' MB';
        }else {
          size = size / 1024;
          return Math.floor(size * 100) / 100 + ' TB';
        }
      }
    }
  }

  var queue = window.Queue = function(options){
    this.concurrencyNumber = options.concurrencyNumber || 3;
    this.endCallback = options.endCallback || function(){};
    this.historyFiles = [];
    this.candidateQueue = [];//候选
    this.currentNumber = 0;
  }
  queue.prototype.add = function (files, params){
    var self=this;
    if(files.length<=0){
      return false;
    }
    for(var i=0;i<files.length;i++){
      self.candidateQueue.push(new CompressItem({
        file: files[i],
        params: params,
        complateBack:function(){
          self.currentNumber--;
          self.checkQueue();
        }
      }))
      self.historyFiles.push(files[i])
    }
    self.checkQueue();
  }
  queue.prototype.isExist = function (file) {
    var self=this;
    for (var i = 0; i < self.historyFiles.length;i++){
      var fileItem = self.historyFiles[i];
      if (fileItem.name === file.name){
        return true;
      }
    }
    return false;
  }
  queue.prototype.checkQueue=function(){
    var self=this;
    if(self.currentNumber>=self.concurrencyNumber){
      return false;
    }
    var isEnd=true;
    // hasSuccess看是否存在成功的，有成功则可以显示全部下载
    var hasSuccess = false;
    for(var i=0;i<self.candidateQueue.length;i++){
      var compressItem = self.candidateQueue[i];
      if (compressItem.state===2) {
        hasSuccess=true;
      }
      if (compressItem.state===0){
        compressItem.start();
        self.currentNumber++;
        isEnd=false;
        if (self.currentNumber >= self.concurrencyNumber){
          break;
        }
      }
    }
    if (isEnd && self.currentNumber<=0){
      self.candidateQueue=[];//已经全部完成，清除所有候选实例
      if (hasSuccess){
        // 有成功则可以显示全部下载
        self.endCallback.call(self)
      }
    }
  }

})();

//公用方法
var handleEvns = {
  pageLayoutFunc: function () {

  }
}

// 页面管理
var PageManage = {
  toolCompress: function () {
    var queue = new Queue({
      concurrencyNumber:5,
      endCallback:function(){
        $('.download-all-box').addClass('show');
      }
    });
    var uuid = 'pngtool'+APP.utils.uuidCreate();
    $('.download-all-btn').click(function(){
      window.location.href = '/downloadzip/' + uuid;
    })
    // 上传图片
    $('#file').on('change',function(e){
      var files = $(this)[0].files;
      var addFiles=[];
      // 类型校验
      for(var i=0;i<files.length;i++){
        var file = files[i];
        if (!queue.isExist(file)){
          // 如果不存在则添加
          addFiles.push(file);
        }
      }

      var params={
        id: uuid
      }
      var width = $('#width').val().trim();
      var height = $('#height').val().trim();
      var quality = $('#quality').val().trim();
      if (width !== '' && !Object.is(Number(width), NaN)){
        width = Math.floor(Number(width));
        width = width < 1 ? 1 : width;
        width = width > 10000?10000:width;
        params['width']=width;
      }
      if (height !== '' && !Object.is(Number(height), NaN)) {
        height = Math.floor(Number(height));
        height = height < 1 ? 1 : height;
        height = height > 10000 ? 10000 : height;
        params['height'] = height;
      }
      if (quality !== '' && !Object.is(Number(quality), NaN)) {
        quality = Math.floor(Number(quality));
        quality = quality < 1 ? 1 : quality;
        quality = quality > 100 ? 100 : quality;
        params['quality'] = quality;
      }
      // 转换的格式
      var ext = $('.user-options .select.ext .current').html().trim();
      params['ext'] = ext;
      // 黑白
      var greyscale = $('.check-box.greyscale').hasClass('active');
      if (greyscale){
        params['greyscale'] = greyscale;
      }
      // 水印
      var $watermask = $('#watermark-file');
      if($watermask[0].files.length>0){
        params['watermask'] = $watermask[0].files[0];
        var watermaskPosition = $('.watermask-position .current .item.active').index();
        params['watermaskPosition'] = Number(watermaskPosition)+1;
      }

      queue.add(addFiles, params);
      e.target.value = '';
    })
    $('#width,#height').keyup(function(){
      var $this=$(this);
      var value = $this.val().trim();
      if (value===''){
        $this.val('')
        return false;
      }
      value = Number(value);
      if(Object.is(value,NaN)){
        $this.val('');
        return false;
      }
      if (value>10000){
        $this.val(10000);
      } else if (value < 1){
        $this.val(1);
      }
    })
    $('#quality').keyup(function () {
      var $this = $(this);
      var value = $this.val().trim();
      if (value === '') {
        $this.val('')
        return false;
      }
      value = Number(value);
      if (Object.is(value, NaN)) {
        $this.val('');
        return false;
      }
      if (value > 100) {
        $this.val(100);
      } else if (value < 1) {
        $this.val(1);
      }
    })
    $('.user-options .option-group .select').click(function(e){
      e.stopPropagation();
    })
    $('.user-options .option-group .select .current').click(function(e){
      e.stopPropagation();
      var $parent = $(this).parent();
      if (!$parent.hasClass('active')){
        $parent.addClass('active');
      }else {
        $parent.removeClass('active');
      }
      $('.watermask-position').removeClass('active');
    })
    $('.user-options .option-group .select .option-item').click(function(e){
      e.stopPropagation();
      var val = $(this).html();
      $(this).parent().siblings('.current').html(val);
      $(this).addClass('active').siblings().removeClass('active');
      var $select = $(this).parents('.select');
      $select.removeClass('active');
    })
    $('.check-box.greyscale').click(function(){
      var $self=$(this);
      if(!$self.hasClass('active')){
        $self.addClass('active');
      }else {
        $self.removeClass('active');
      }
    })
    // 清除水印
    $('.uplad-watermark .clean-btn').click(function(){
      var $self=$(this);
      $self.parent().removeClass('active');
      $('#watermark-file').val('');
    })
    // 添加水印
    $('#watermark-file').change(function () {
      var $self = $(this);
      var size = $('#watermark-file')[0].files[0].size;
      if(size>1024*1024*1){
        alert('水印大小不能超过1MB');
        $('#watermark-file').val('');
        return false;
      }
      $('.uplad-watermark').addClass('active');
    })
    // 水印位置选择
    $('.watermask-position .current').click(function(e){
      e.stopPropagation();
      var $parent=$(this).parent();
      if (!$parent.hasClass('active')) {
        $parent.addClass('active')
      } else {
        $parent.removeClass('active')
      }
      $('.user-options .option-group .select').removeClass('active');
    })
    $('.watermask-position .options .item').click(function(){
      var $self = $(this);
      $self.addClass('active').siblings().removeClass('active');
      var index=$self.index();
      $('.watermask-position .current .item').eq(index).addClass('active').siblings().removeClass('active');
    })
    $(document).click(function () {
      $('.user-options .option-group .select').removeClass('active');
      $('.watermask-position').removeClass('active');
    })

    // 使用说明锚点
    $('.instructions-btn').click(function(){
      var top = $('.instructions').offset().top;
      $('html,body').stop().animate({ scrollTop: top},800);
    })
  }
}

var app = new APP({
  pageManage: PageManage,
  handleEvns: handleEvns,
  before: function () {
    this.handleEvns.pageLayoutFunc();
  },
  after: function () {}
});