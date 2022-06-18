const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite'); //用于转码，解决中文乱码问题
const multer = require('multer')
const upload = multer()
const Controller = require('../model/controller');
const { SuccessModel, ErrorModel } = require('../model/response');
const { sharpCompress, isDirExisted, dirIdFilter } = require('../../services/sharpCompress')

module.exports = class ToolController extends Controller {
  constructor(router) {
    super();

    router.get('/', async (req, res, next) => {
      res.render('./cn/tool.html')
    })

    router.post('/processing', upload.fields([{name:'file',maxCount:1},{name:'watermask',maxCount:1}]),(req, res, next) => {
      var file = null; // 压缩主要图片
      if (!req.files.file){
        res.json(ErrorModel('请上传需要压缩的图片'));
        return false;
      } else {
        file = req.files.file[0];
      }
      // 检查水印是否存在
      var watermask = req.files.watermask ? req.files.watermask[0]:null;
      if(watermask && watermask.size>(1024*1024*1)) {
        res.json(ErrorModel('水印不能超过1MB'));
        return false;
      }

      file.originalname = iconv.decode(file.originalname, 'utf-8')
      if (file.size > (1024 * 1024 * 2)) {
        res.json(ErrorModel('文件过大'));
        return false;
      }
      sharpCompress({ file: file, params: req.body, watermask: watermask }).then(result => {
        fs.readFile(result.fileSrc, (err, buffer) => {
          if (err) {
            res.json(ErrorModel('图片读取异常，请重试'));
            return false;
          }
          res.json(SuccessModel({
            size: buffer.length,
            url: encodeURI(result.url)
          }))
        })
      }).catch(err => {
        // console.log(err)
        res.json(ErrorModel('图片写入异常，请重试'));
        return false;
      })
    })

    router.post('/sliceprocessing', upload.fields([{name:'slice',maxCount:1},{name:'watermask',maxCount:1}]),async (req, res, next) => {
      var sliceBuffer = null; // 分片
      if (!req.files.slice){
        res.json(ErrorModel('请上传需要压缩的图片'));
        return false;
      } else if (req.files.slice[0].size>1024*1024*5){
        // 分片大于1MB 异常
        res.json(ErrorModel('分片大小异常'));
        return false;
      } else if (req.files.watermask && req.files.watermask[0].size > (1024 * 1024 * 1)) {
        // 检查水印大小是否正常
        res.json(ErrorModel('水印不能超过1MB'));
        return false;
      } else {
        sliceBuffer = req.files.slice[0].buffer;
      }
      let currentSliceCount = Number(req.body.currentSliceCount);
      const totalSliceCount = Number(req.body.totalSliceCount);
      const fileSign = dirIdFilter(req.body.fileSign); // 分片签名进行安全过滤
      const id = dirIdFilter(req.body.id); // id进行安全过滤
      const [fileName,ext] = req.body.fileName.split(".");

      const tempDirPath = path.resolve(__dirname,`../../../cache/slice_temp/${id}`);

      if(currentSliceCount >= totalSliceCount) {
        res.json(ErrorModel('分片请求异常'));
        return false;
      }

      // 创建分片
      let slicePath = path.resolve(tempDirPath, `${fileSign}-${currentSliceCount}`);
      await isDirExisted(tempDirPath,true).then(isCreateDir=>{
        return fs.promises.writeFile(slicePath, sliceBuffer)
      }).then(err=>{
        if (err){
          res.json(ErrorModel('分片创建失败'));
          return false;
        }
      }).catch(err=>{
        res.json(ErrorModel('分片创建失败'));
      })

      // 判断是否是最后一片
      currentSliceCount++;
      if (currentSliceCount < totalSliceCount){
        res.json(SuccessModel({
          currentSliceCount: currentSliceCount,
          totalSliceCount: totalSliceCount
        }));
        return false;
      }

      // 合并前 先找到需要合并的分片文件集
      let sliceFiles = await fs.promises.readdir(tempDirPath)
      .then(fileArray => {
        // 找到对应的分片文件
        let files = fileArray.filter(item=>{
          return item.match(fileSign)
        }).sort((a,b)=>{
          // 一定要做排序
          return Number(a.split('-')[1]) - Number(b.split('-')[1])
        });
        return Promise.resolve(files)
      })
      if (!sliceFiles){
        res.json(ErrorModel('合并失败'));
        return false;
      }

      // 准备递归合并
      const outputPath = `${this.rootPath}/public/compress/${id}`;
      // 检查输出目录是否存在,不存在则创建
      if (!await isDirExisted(outputPath, true)){
        res.json(ErrorModel('合并失败'));
        return false;
      }
      
      // 采用Stream方式合并
      let targetStream = fs.createWriteStream(path.resolve(outputPath, `${fileName}.${ext}`));
      const streamMerge = function (filePathArray, success, fail) {
        let filePath = path.resolve(tempDirPath,filePathArray.shift());
        let originStream = fs.createReadStream(filePath);
        originStream.pipe(targetStream, { end: false });
        originStream.on("end", () => {
          // 删除文件
          fs.unlink(filePath,(err)=>{
            if(err) {
              fail(err);
              return false;
            }
            if (filePathArray.length > 0) {
              streamMerge(filePathArray, success, fail);
            } else {
              targetStream.end('关闭流')
              fs.readFile(path.resolve(outputPath, `${fileName}.${ext}`), (err, buffer) => {
                if(err){
                  fail(err);
                  return false;
                }
                success(buffer);
              })
            }
          });
        });
        originStream.on("error", (err) => {
          targetStream.close();
          fail(err);
        });
      };

      // 合并回调 - 开始处理图片
      streamMerge(sliceFiles,(buffer)=>{
        // 检查水印是否存在
        let file = {
          originalname: req.body.fileName,
          buffer: buffer
        }
        let watermask = req.files.watermask ? req.files.watermask[0] : null;
        sharpCompress({ file: file, params: req.body, watermask: watermask }).then(result => {
          fs.readFile(result.fileSrc, (err, buffer) => {
            if (err) {
              res.json(ErrorModel('图片读取异常，请重试'));
              return false;
            }
            res.json(SuccessModel({
              size: buffer.length,
              url: encodeURI(result.url)
            }))
          })
        }).catch(err => {
          res.json(ErrorModel('图片写入异常，请重试'));
          return false;
        })
      },(error)=>{
        res.json(ErrorModel('合并失败'))
      })
      
    })

    // 图片只能下载不能在线预览
    router.get('/compress/*', (req, res, next) => {
      var fileUrl = path.join(this.rootPath,'public',decodeURI(req.url));
      fs.readFile(fileUrl, (error, buffer) => {
        if (error){
          next();
          return false;
        };
        res.download(fileUrl)
      })
    })

    // downloadzip
    router.get('/downloadzip/:dir', (req,res,next)=>{
      const outputPath = `${this.rootPath}/public/compress/${req.params.dir}`;
      fs.readdir(outputPath, (error, buffer) => {
        if (error) {
          next();
          return false;
        };
        const output = fs.createWriteStream(`${outputPath}.zip`);
        const archive = archiver('zip', {
          zlib: { level: 9 }
        });
        output.on('close', () => {
          res.download(`${outputPath}.zip`)
        });
        archive.pipe(output);
        archive.directory(outputPath, false);
        archive.finalize();
      })
    })

  }
}