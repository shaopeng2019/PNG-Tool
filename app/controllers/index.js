const express = require('express');
const { ToolController } = require('./cn');

// 路由中间件
const router = express.Router();

const toolController = new ToolController(router)

module.exports = router;