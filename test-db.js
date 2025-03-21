const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('bitquery_pump', 'postgres', 'postgres', {
  host: 'localhost',
  port: 5433,
  dialect: 'postgres'
});

async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    await sequelize.close();
  } catch (error) {
    console.error('数据库连接失败:', error);
  }
}

testConnection(); 