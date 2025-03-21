const { sequelize, models } = require('../database');

// 同步数据库表结构
async function syncDatabase() {
  try {
    console.log('开始同步数据库表结构...');
    
    // 使用alter:true选项同步模型
    // 这会保留现有数据并添加缺失的列
    await sequelize.sync({ alter: true });
    
    console.log('基本表结构同步完成');
    
    // 特别检查TokenHolders表是否有address列
    const [tokenHolderColumns] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'TokenHolders'"
    );
    
    console.log('TokenHolders表的列:', tokenHolderColumns.map(c => c.column_name));
    
    // 如果没有address列，添加它
    if (!tokenHolderColumns.some(c => c.column_name === 'address')) {
      console.log('TokenHolders表缺少address列，正在添加...');
      await sequelize.query(
        "ALTER TABLE \"TokenHolders\" ADD COLUMN address VARCHAR(255) NOT NULL DEFAULT ''"
      );
      console.log('已添加address列到TokenHolders表');
    }
    
    console.log('数据库表结构同步成功');
    process.exit(0);
  } catch (error) {
    console.error('数据库表结构同步失败:', error);
    process.exit(1);
  }
}

// 运行同步
syncDatabase(); 