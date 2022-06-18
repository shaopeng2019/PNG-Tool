const sharp = require("sharp");
const path = require('path');
const fs = require('fs');

// 参数检查
const resizeCheck = (value) => {
  if (!value) {
    // 不存在
    return null
  }
  value = Number(value);
  if (Object.is(value, NaN)) {
    // 类型不是数字
    return null
  }
  value = Math.floor(value);
  value = value < 1 ? 1 : value;
  value = value > 10000 ? 10000 : value;
  return value;
}
const qualityCheck = (value) => {
  if (!value) {
    // 不存在
    return 85
  }
  value = Number(value);
  if (Object.is(value, NaN)) {
    // 类型不是数字
    return 85
  }
  value = Math.floor(value);
  value = value < 1 ? 1 : value;
  value = value > 100 ? 100 : value;
  return value;
}

// 检查目录是否存在，不存在则创建
const isDirExisted = async (dirPath, recursive = false)=>{
  return new Promise((resolve, reject)=>{
    fs.access(dirPath, (err) => {
      if (err) {
        fs.mkdir(dirPath, { recursive: recursive }, (createDirErr) => {
          if (createDirErr) {
            reject(false)
          }else {
            resolve(true)
          }
        })
      } else {
        resolve(true)
      }
    });
  })
}

// id简单过滤，防止攻击
const dirIdFilter = (dirId) => {
  var result = dirId
  .replaceAll('/', 'a')
  .replaceAll('-', 'b')
  .replaceAll(' ', 'c')
  .replaceAll('_', 'd')
  .replaceAll('$', 'e')
  .replaceAll('.', 'f')
  .replaceAll('@', 'g')
  .replaceAll('^', 'h')
  .replaceAll('&', 'i')
  .replaceAll(',', 'j')
  .replaceAll('!', 'k')
  .replaceAll('%', 'l')
  .replaceAll('*', 'm')
  .replace(/\\/g,'z');
  return result.slice(0, 40);
}

const sharpCompress = async function (options) {
  var params = options.params;
  const uuid = dirIdFilter(params.id);
  const extSupport=['.jpg','.png','.webp','.gif','.tiff']
  const original = path.parse(options.file.originalname);
  var ext = original.ext; // 存储最近确定的扩展名
  if (!extSupport.includes(ext)){
    // 上传的文件格式不匹配
    return Promise.reject(false);
  }
  if (params.ext && extSupport.includes(params.ext)){
    ext = params.ext;
  }
  const outDirPath = path.resolve(__dirname, `../../public/compress/${uuid}`);
  const outputPath = path.resolve(__dirname, `../../public/compress/${uuid}/${original.name}${ext}`);
  // 检查目录是否存在，不存在则创建
  if (!await isDirExisted(outDirPath)){
    return Promise.reject(false);
  }
  // 用户指定大小
  const customWidth = resizeCheck(params.width);
  const customHeight = resizeCheck(params.height);

  const sharpObj = sharp(options.file.buffer, { animated: true });
  sharpObj.resize({
    width: customWidth,
    height: customHeight
  })
  const metadata = await sharpObj.metadata();
  switch (metadata.orientation) {
    case 6: //需要顺时针（向左）90度旋转
      sharpObj.rotate(90);
      break;
    case 8: //需要逆时针（向右）90度旋转
      sharpObj.rotate(-90);
      break;
    case 3: //需要180度旋转
      sharpObj.rotate(180);
      break;
  }
  // sharpObj.extend({
  //   top: 50,
  //   bottom: 50,
  //   left: 50,
  //   right: 50,
  //   background: { r: 230, g: 230, b: 230, alpha: 1 }
  // })
  //格式转换
  switch(ext){
    case '.jpg':
      sharpObj.toFormat('jpeg', {
        quality: qualityCheck(params.quality),
        mozjpeg:true
      });
      break;
    case '.png':
      sharpObj.toFormat('png', {
        quality: qualityCheck(params.quality),
        palette:true
      });
      break;
    case '.gif':
      sharpObj.toFormat('gif');
      break;
    case '.tiff':
      sharpObj.toFormat('tiff',{
        quality: qualityCheck(params.quality)
      });
      break;
    case '.webp':
      sharpObj.toFormat('webp', {
        quality: qualityCheck(params.quality)
      });
      break;
  }
  if (params.greyscale){
    sharpObj.greyscale();
  }
  // 添加水印
  if (options.watermask){
    // console.log(options.watermask)
    const watermaskSharp = sharp(options.watermask.buffer);
    const { width, height } = await watermaskSharp.metadata();
    
    // 计算主图压缩后的宽高
    var photoResize = {
      width: metadata.width, // 先赋值压缩的图片原始大小
      height: metadata.height
    }
    if (metadata.orientation === 6 || metadata.orientation === 8) {
      //互换宽高，方便水印计算
      let resizeTemp = photoResize.width;
      photoResize.width = photoResize.height;
      photoResize.height = resizeTemp;
    }

    const ratio = photoResize.width / photoResize.height;
    if (customWidth || customHeight){
      if (customWidth && customHeight){
        photoResize.width = customWidth;
        photoResize.height = customHeight;
      } else if (customWidth) {
        photoResize.width = customWidth;
        photoResize.height = Math.floor(customWidth / ratio);
      }else {
        photoResize.width = Math.floor(customHeight * ratio);
        photoResize.height = customHeight;
      }
    }
    // 根据主图的宽高计算水印的宽高和定位
    var maskResize = { width, height };
    const maskRatio = maskResize.width / maskResize.height;
    maskResize.height = Math.floor(photoResize.height / 20);
    maskResize.width = Math.floor(maskResize.height * maskRatio);

    watermaskSharp.resize({
      width: maskResize.width,
      height: maskResize.height
    })
    const waterMaskBuffer = await watermaskSharp
    .toBuffer({ resolveWithObject: true }).then((data)=>{
      return data.data
    }).catch(err=>{
      return null;
    })
    if (!waterMaskBuffer) {
      return Promise.reject(false);
    }

    // 水印位置
    var maskTop = 0;
    var maskLeft = 0;
    switch (Number(params.watermaskPosition)){
      case 1:
        // 左上
        maskTop = maskResize.height;
        maskLeft = maskResize.height;
        break;
      case 2:
        // 中上
        maskTop = maskResize.height;
        maskLeft = (photoResize.width / 2) - (maskResize.width/2);
        break;
      case 3:
        // 右上
        maskTop = maskResize.height;
        maskLeft = photoResize.width - maskResize.width - maskResize.height;
        break;
      case 4:
        // 左中
        maskTop = (photoResize.height / 2) - (maskResize.height / 2);
        maskLeft = maskResize.height;
        break;
      case 5:
        // 中中
        maskTop = (photoResize.height / 2) - (maskResize.height / 2);
        maskLeft = (photoResize.width / 2) - (maskResize.width / 2);
        break;
      case 6:
        // 右中
        maskTop = (photoResize.height / 2) - (maskResize.height / 2);
        maskLeft = photoResize.width - maskResize.width - maskResize.height;
        break;
      case 7:
        // 左下
        maskTop = photoResize.height - maskResize.height * 2;
        maskLeft = maskResize.height;
        break;
      case 8:
        // 中下
        maskTop = photoResize.height - maskResize.height * 2;
        maskLeft = (photoResize.width / 2) - (maskResize.width / 2);
        break;
      default:
        // 默认右下
        maskTop = photoResize.height - maskResize.height * 2;
        maskLeft = photoResize.width - maskResize.width - maskResize.height;
        break;
    }

    sharpObj.composite([
      {
        input: waterMaskBuffer,
        top: Math.floor(maskTop),
        left: Math.floor(maskLeft)
      }
    ])
  }
  return await sharpObj.toFile(outputPath).then(res=>{
    // console.log(res)
    return Promise.resolve({
      fileSrc: outputPath,
      url: `/compress/${uuid}/${original.name}${ext}`
    });
  }).catch(err=>{
    console.log(err)
    return Promise.reject(false);
  });
}

module.exports = {
  sharpCompress,
  isDirExisted,
  dirIdFilter
};