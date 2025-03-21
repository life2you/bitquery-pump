const { sequelize, testConnection } = require('../config');
const { Token, initTokenModel } = require('./Token');
const { TokenHolder, initTokenHolderModel } = require('./TokenHolder');
const { TokenTrade, initTokenTradeModel } = require('./TokenTrade');

const initModels = async () => {
  await testConnection();
  await initTokenModel();
  await initTokenHolderModel();
  await initTokenTradeModel();
};

module.exports = {
  sequelize,
  Token,
  TokenHolder,
  TokenTrade,
  initModels
}; 