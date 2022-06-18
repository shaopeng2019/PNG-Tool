<p align="center"><a href="http://tool.xiaofanblog.net" target="_blank" rel="noopener noreferrer"><img width="160" src="http://tool.xiaofanblog.net/cn/images/github/git-logo.png" alt="PNG-Tool logo"></a></p>


#### PNG Tool
- **概述**
  [PNG Tool](http://tool.xiaofanblog.net/) 是一个功能较为全面的图像压缩和转换工具的源代码，实现主要基于 [sharp](https://github.com/lovell/sharp) 图像处理库。支持：png、jpg、gif、webp、tiff 格式。该项目仅作为一个学习Demo。
  
  ⚡️PNG Tool Website：[tool.xiaofanblog.net](http://tool.xiaofanblog.net/)
  ⚡️小樊博客：[xiaofanblog.net](http://xiaofanblog.net/)

- **项目特点**
  
  - **隐私安全**
    你不用担心上传到我们服务器的图片作品会被我们使用。我们创建了定时清除的程序任务，每过1个小时会自动清除1个小时以前的图片，可在GitHub上查看源码。

  - **功能全面**
    包含常用的功能且简单易用，是PNG Tool的优势所在。支持自定义像素、质量压缩、中心裁剪、格式转换。并且为摄影师的朋友提供自定义一键添加水印的福利功能。单张图片最大支持20MB，数量不限！

  - **高性能**
    服务端由Nodejs开发，基于事件循环机制，非阻塞I/O，很好的支撑高并发。图像处理方面引用Nodejs开源模块sharp，该模块由速度极快的 libvips 图像处理库提供支持。由于使用了libvips，调整图像大小通常比使用最快的 ImageMagick、GraphicsMagick 快4到5倍。并且不会因此牺牲图片质量。
    
    PNG Tool项目的源码已上传至GitHub，可共广大爱好者交流学习使用。 也希望能为大家提供帮助，提高工作效率。在此感谢所有开源库的作者及团队，让我们能站在巨人的肩膀上，一同见证程序的魅力。
