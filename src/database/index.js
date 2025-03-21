const { Sequelize } = require('sequelize');
const config = require('./config');
const fs = require('fs');
const path = require('path');

// 初始化数据库连接
const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: config.dialect,
    logging: config.logging,
    pool: config.pool
  }
);

// 模型容器
const models = {};

// 自动导入所有模型
const modelsDir = path.join(__dirname, 'models');
fs.readdirSync(modelsDir)
  .filter(file => file.endsWith('.js'))
  .forEach(file => {
    const model = require(path.join(modelsDir, file));
    if (model.name && model.attributes) {
      models[model.name] = sequelize.define(model.name, model.attributes, model.options || {});
    }
  });

// 建立模型之间的关联
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

module.exports = {
  sequelize,
  models,
  Sequelize
}; 