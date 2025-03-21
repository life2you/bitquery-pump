const { sequelize } = require('../database');

async function fixTokenTradeModel() {
  try {
    console.log('开始修复TokenTrade表结构...');
    
    // 检查表结构
    const [columns] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'TokenTrades'"
    );
    
    console.log('当前TokenTrades表列:', columns.map(c => c.column_name));
    
    // 检查是否有txHash列
    const hasTxHash = columns.some(c => c.column_name === 'txHash');
    const hasTransactionSignature = columns.some(c => c.column_name === 'transactionSignature');
    
    if (hasTxHash && !hasTransactionSignature) {
      console.log('发现txHash列但缺少transactionSignature列，开始重命名...');
      
      // 添加新列
      await sequelize.query(
        "ALTER TABLE \"TokenTrades\" ADD COLUMN \"transactionSignature\" VARCHAR(255)"
      );
      
      // 复制数据
      await sequelize.query(
        "UPDATE \"TokenTrades\" SET \"transactionSignature\" = \"txHash\""
      );
      
      // 设置NOT NULL约束
      await sequelize.query(
        "ALTER TABLE \"TokenTrades\" ALTER COLUMN \"transactionSignature\" SET NOT NULL"
      );
      
      // 删除旧列
      await sequelize.query(
        "ALTER TABLE \"TokenTrades\" DROP COLUMN \"txHash\""
      );
      
      console.log('成功将txHash列重命名为transactionSignature');
    } else if (!hasTxHash && !hasTransactionSignature) {
      console.log('未发现txHash和transactionSignature列，添加transactionSignature列...');
      
      await sequelize.query(
        "ALTER TABLE \"TokenTrades\" ADD COLUMN \"transactionSignature\" VARCHAR(255) NOT NULL DEFAULT ''"
      );
      
      console.log('成功添加transactionSignature列');
    } else if (hasTxHash && hasTransactionSignature) {
      console.log('同时发现txHash和transactionSignature列，保留transactionSignature并删除txHash...');
      
      await sequelize.query(
        "ALTER TABLE \"TokenTrades\" DROP COLUMN \"txHash\""
      );
      
      console.log('成功删除txHash列');
    } else {
      console.log('表结构已正确，无需修改');
    }
    
    // 更新模型
    await sequelize.query(
      "CREATE INDEX IF NOT EXISTS \"tokenTrades_transactionSignature_idx\" ON \"TokenTrades\" (\"transactionSignature\")"
    );
    
    console.log('TokenTrade表结构修复完成');
    
    // 检查更新后的表结构
    const [updatedColumns] = await sequelize.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'TokenTrades'"
    );
    
    console.log('更新后TokenTrades表列:', updatedColumns.map(c => c.column_name));
    
    process.exit(0);
  } catch (error) {
    console.error('修复TokenTrade表结构失败:', error);
    process.exit(1);
  }
}

// 运行修复脚本
fixTokenTradeModel(); 