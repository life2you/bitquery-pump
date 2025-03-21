const { sequelize } = require('../database');

async function fixTokenHolderModel() {
  try {
    console.log('开始修复TokenHolder表结构...');
    
    // 检查表结构
    const [columns] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'TokenHolders'"
    );
    
    console.log('当前TokenHolders表列:', columns.map(c => c.column_name));
    
    // 检查是否有lastUpdated列
    const hasLastUpdated = columns.some(c => c.column_name === 'lastUpdated');
    
    if (!hasLastUpdated) {
      console.log('缺少lastUpdated列，添加此列...');
      try {
        await sequelize.query(
          "ALTER TABLE \"TokenHolders\" ADD COLUMN \"lastUpdated\" TIMESTAMP WITH TIME ZONE DEFAULT NOW()"
        );
        console.log('已添加lastUpdated列');
      } catch (error) {
        console.error('添加lastUpdated列失败:', error);
      }
    }
    
    // 检查表结构是否正确
    const [updatedColumns] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'TokenHolders'"
    );
    
    console.log('更新后TokenHolders表列:', updatedColumns.map(c => c.column_name));
    
    process.exit(0);
  } catch (error) {
    console.error('修复TokenHolder表结构失败:', error);
    process.exit(1);
  }
}

// 运行修复脚本
fixTokenHolderModel(); 