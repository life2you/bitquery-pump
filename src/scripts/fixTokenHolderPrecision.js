const { sequelize } = require('../database');

async function fixTokenHolderPrecision() {
  try {
    console.log('开始修复TokenHolder表字段精度...');
    
    // 检查表结构
    const [columns] = await sequelize.query(
      "SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_name = 'TokenHolders'"
    );
    
    console.log('当前TokenHolders表列详情:', columns);
    
    // 修改percentOfTotal字段精度
    console.log('修改percentOfTotal字段精度...');
    await sequelize.query(
      "ALTER TABLE \"TokenHolders\" ALTER COLUMN \"percentOfTotal\" TYPE DECIMAL(18,8)"
    );
    
    // 修改percentage字段精度
    console.log('修改percentage字段精度...');
    await sequelize.query(
      "ALTER TABLE \"TokenHolders\" ALTER COLUMN \"percentage\" TYPE DECIMAL(18,8)"
    );
    
    // 修改balance字段精度
    console.log('修改balance字段精度...');
    await sequelize.query(
      "ALTER TABLE \"TokenHolders\" ALTER COLUMN \"balance\" TYPE DECIMAL(30,8)"
    );
    
    // 检查修改后的表结构
    const [updatedColumns] = await sequelize.query(
      "SELECT column_name, data_type, character_maximum_length, numeric_precision, numeric_scale FROM information_schema.columns WHERE table_name = 'TokenHolders' AND column_name IN ('percentOfTotal', 'percentage', 'balance')"
    );
    
    console.log('修改后TokenHolders表字段精度:', updatedColumns);
    
    console.log('TokenHolder表字段精度修复完成');
    
    process.exit(0);
  } catch (error) {
    console.error('修复TokenHolder表字段精度失败:', error);
    process.exit(1);
  }
}

// 运行修复脚本
fixTokenHolderPrecision(); 