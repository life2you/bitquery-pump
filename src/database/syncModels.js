const { sequelize, models } = require('./index');

/**
 * 同步所有数据库模型
 */
async function syncModels() {
  try {
    console.log('开始同步数据库模型...');
    
    // 启用日志以查看SQL查询
    sequelize.options.logging = console.log;
    
    // 同步所有模型 - alter: true会自动添加缺失的列
    await sequelize.sync({ alter: true });
    
    console.log('数据库模型同步完成');
    
    // 检查TokenHolder表结构
    const [results] = await sequelize.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'TokenHolders'");
    console.log('TokenHolders表的列:', results.map(r => r.column_name));
    
    return true;
  } catch (error) {
    console.error('数据库模型同步失败:', error);
    return false;
  }
}

// 执行同步
syncModels()
  .then(success => {
    if (success) {
      console.log('数据库同步成功');
    } else {
      console.log('数据库同步失败');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('执行同步时出错:', error);
    process.exit(1);
  }); 