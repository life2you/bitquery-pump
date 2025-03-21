/**
 * 用于处理代币相关操作的辅助工具函数
 */

/**
 * 确保持有者地址不为null或空
 * @param {string|null} address 持有者地址
 * @returns {string} 有效的地址或默认地址
 */
const ensureValidAddress = (address) => {
  if (!address || address.trim() === '') {
    return 'unknown-address';
  }
  return address;
};

/**
 * 验证TokenHolder对象的必要字段
 * @param {Object} holderData TokenHolder数据对象
 * @returns {Object} 修正后的TokenHolder数据对象
 */
const validateTokenHolderData = (holderData) => {
  if (!holderData) {
    throw new Error('TokenHolder数据不能为空');
  }
  
  // 确保必要字段存在
  const validatedData = { ...holderData };
  
  // 确保address有效
  validatedData.address = ensureValidAddress(holderData.address);
  
  // 确保ownerAddress有效
  validatedData.ownerAddress = ensureValidAddress(holderData.ownerAddress || holderData.address);
  
  // 确保tokenMintAddress有效
  if (!holderData.tokenMintAddress || holderData.tokenMintAddress.trim() === '') {
    throw new Error('TokenHolder必须有有效的tokenMintAddress');
  }
  
  // 确保balance是数字
  if (holderData.balance === undefined || holderData.balance === null) {
    validatedData.balance = 0;
  } else {
    validatedData.balance = parseFloat(holderData.balance);
  }
  
  // 确保百分比字段是有效数字
  if (holderData.percentOfTotal === undefined || holderData.percentOfTotal === null) {
    validatedData.percentOfTotal = 0;
  } else {
    validatedData.percentOfTotal = parseFloat(holderData.percentOfTotal);
  }
  
  // 确保percentage字段是有效数字
  if (holderData.percentage === undefined || holderData.percentage === null) {
    validatedData.percentage = validatedData.percentOfTotal; // 默认等于percentOfTotal
  } else {
    validatedData.percentage = parseFloat(holderData.percentage);
  }
  
  // 确保lastUpdateTime和lastUpdated是Date对象
  if (!holderData.lastUpdateTime) {
    validatedData.lastUpdateTime = new Date();
  }
  
  if (!holderData.lastUpdated) {
    validatedData.lastUpdated = new Date();
  }
  
  return validatedData;
};

module.exports = {
  ensureValidAddress,
  validateTokenHolderData
}; 