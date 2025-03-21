const { 
  fetchTokenDetails, 
  fetchTokenTrades, 
  fetchTokenStats, 
  fetchTokenPrice 
} = require('../api/bitquery');
const { analyzeToken } = require('../utils/tokenAnalyzer');
const { Op } = require('sequelize');
const { executeBitqueryQuery } = require('../api/bitquery');
const { tokenTradesQuery } = require('../api/queries/tokenTrades');
const { tokenHoldersQuery } = require('../api/queries/tokenHolders');
const db = require('../database');
const { Token, TokenHolder, TokenTrade } = require('../database').models;
const { ensureValidAddress, validateTokenHolderData } = require('../utils/tokenHelper');

class TokenService {
  constructor() {
    // 标记数据库是否可用的状态
    this.dbAvailable = true;
  }

  /**
   * 保存新代币信息
   * @param {Object} tokenData - 从WebSocket接收的代币数据
   * @returns {Object} 返回保存的代币和是否为新代币的标志
   */
  async saveNewToken(tokenData) {
    try {
      if (!tokenData || !tokenData.TokenSupplyUpdate) {
        console.error('无效的代币数据');
        return null;
      }
      
      // 从通知数据中提取信息
      const { 
        Currency: currency, 
        PostBalance: totalSupply 
      } = tokenData.TokenSupplyUpdate;
      
      const blockTime = tokenData.Block.Time;
      const creatorAddress = tokenData.Transaction.Signer;
      
      // 准备代币数据
      const token = {
        mintAddress: currency.MintAddress,
        name: currency.Name || 'Unknown',
        symbol: currency.Symbol || 'Unknown',
        decimals: currency.Decimals,
        creatorAddress: creatorAddress,
        creationTime: new Date(blockTime),
        uri: currency.Uri,
        totalSupply: totalSupply
      };
      
      // 保存到数据库
      const [createdToken, created] = await Token.findOrCreate({
        where: { mintAddress: token.mintAddress },
        defaults: token
      });
      
      // 如果是新创建的代币，添加创建者作为持有者
      if (created) {
        // 确保address字段不为null
        const holderAddress = ensureValidAddress(creatorAddress);
        
        // 解析数值
        const balance = parseFloat(totalSupply);
        
        // 创建者持有100%的代币
        const percentOfTotal = 100;
        
        // 创建持有者数据
        const holderData = validateTokenHolderData({
          tokenMintAddress: token.mintAddress,
          address: holderAddress,
          ownerAddress: holderAddress,
          balance: balance,
          percentOfTotal: percentOfTotal,
          percentage: percentOfTotal,
          lastUpdateTime: new Date(),
          lastUpdated: new Date(),
          isCreator: true
        });
        
        await TokenHolder.create(holderData);
        
        console.log(`已保存新代币: ${token.name || token.mintAddress}`);
      }
      
      return { token: createdToken, isNew: created };
    } catch (error) {
      console.error('保存新代币时出错:', error);
      
      // 如果是数据库错误，标记数据库为不可用
      if (error.name === 'SequelizeDatabaseError' || 
          error.name === 'SequelizeConnectionError' ||
          (error.parent && error.parent.code === '42P01')) { // 42P01是PostgreSQL中表不存在的错误代码
        console.log('数据库不可用，将禁用数据库相关功能');
        this.dbAvailable = false;
        
        // 返回基本代币信息
        const { 
          Currency: currency, 
          PostBalance: totalSupply 
        } = tokenData.TokenSupplyUpdate;
        
        const blockTime = tokenData.Block.Time;
        const creatorAddress = tokenData.Transaction.Signer;
        
        // 准备代币数据
        const token = {
          mintAddress: currency.MintAddress,
          name: currency.Name || 'Unknown',
          symbol: currency.Symbol || 'Unknown',
          decimals: currency.Decimals,
          creatorAddress: creatorAddress,
          creationTime: new Date(blockTime),
          uri: currency.Uri,
          totalSupply: totalSupply,
          isPotentialBuy: false
        };
        
        return { token, isNew: true };
      }
      
      throw error;
    }
  }
  
  // 获取代币详细信息并更新
  async updateTokenDetails(mintAddress) {
    try {
      // 如果数据库不可用，仅获取API数据但不保存
      if (!this.dbAvailable) {
        console.log(`数据库不可用，仅获取代币${mintAddress}信息但不保存`);
        // 尝试从API获取详细信息
        try {
          // 从Bitquery获取详细信息
          const detailsData = await fetchTokenDetails(mintAddress);
          // 返回简单的代币信息
          return {
            mintAddress,
            name: detailsData?.name || 'Unknown',
            symbol: detailsData?.symbol || 'Unknown',
            isPotentialBuy: false
          };
        } catch (apiError) {
          console.error(`获取代币${mintAddress}API数据时出错:`, apiError);
          // 返回基本信息
          return { mintAddress, name: 'Unknown', symbol: 'Unknown', isPotentialBuy: false };
        }
      }

      // 从数据库获取代币信息
      const token = await Token.findByPk(mintAddress);
      if (!token) {
        console.error(`未找到代币: ${mintAddress}`);
        return null;
      }
      
      // 从Bitquery获取详细信息
      const devAddress = token.creatorAddress;
      const detailsData = await fetchTokenDetails(mintAddress, devAddress);
      const tradesData = await fetchTokenTrades(mintAddress);
      const statsData = await fetchTokenStats(mintAddress);
      const priceData = await fetchTokenPrice(mintAddress);
      
      // 如果有交易数据，更新价格信息
      if (priceData) {
        // 根据新的API结构计算价格
        const buyAmount = priceData.Buy?.Amount ? parseFloat(priceData.Buy.Amount) : 0;
        const sellAmount = priceData.Sell?.Amount ? parseFloat(priceData.Sell.Amount) : 0;
        
        // 更新价格信息
        if (priceData.Buy?.Price) {
          token.lastPrice = parseFloat(priceData.Buy.Price);
        } else if (buyAmount > 0 && sellAmount > 0) {
          // 如果没有直接价格，计算 sellAmount/buyAmount 作为价格
          token.lastPrice = sellAmount / buyAmount;
        }
        
        // 更新USD价格
        if (priceData.Buy?.PriceInUSD) {
          token.lastPriceUsd = parseFloat(priceData.Buy.PriceInUSD);
        } else if (priceData.Buy?.AmountInUSD && buyAmount > 0) {
          token.lastPriceUsd = parseFloat(priceData.Buy.AmountInUSD) / buyAmount;
        }
        
        // 计算市值 = 价格 * 总供应量
        if (token.totalSupply && token.lastPrice) {
          token.marketCap = token.totalSupply * token.lastPrice;
        }
      }
      
      // 更新交易统计数据
      if (statsData) {
        token.buyVolume = statsData.buyVolume || 0;
        token.sellVolume = statsData.sellVolume || 0;
        token.buyCount = statsData.buyCount || 0;
        token.sellCount = statsData.sellCount || 0;
        // 计算总交易量，确保正确格式化
        token.tradeVolume = parseFloat(token.buyVolume || 0) + parseFloat(token.sellVolume || 0);
        token.holderCount = (statsData.distinctBuyers || 0) + (statsData.distinctSellers || 0);
      }
      
      // 分析代币是否是潜在的好投资
      const analysis = analyzeToken(token, tradesData, statsData, detailsData);
      token.isPotentialBuy = analysis.isPotentialBuy;
      token.metadata = {
        ...token.metadata,
        analysis: {
          score: analysis.score,
          reasons: analysis.reasons,
          updatedAt: new Date().toISOString()
        }
      };
      
      // 保存更新
      await token.save();
      
      // 如果有新的交易，保存到数据库
      if (tradesData && tradesData.length > 0) {
        await this.saveTokenTrades(mintAddress, tradesData);
      }
      
      // 如果有持有者数据，更新持有者信息
      if (detailsData && detailsData.topHoldings) {
        await this.updateTokenHolders(mintAddress, detailsData.topHoldings);
      }
      
      console.log(`已更新代币详情: ${token.name || token.mintAddress}`);
      return token;
    } catch (error) {
      console.error(`更新代币${mintAddress}详情时出错:`, error);
      
      // 如果是数据库错误，标记数据库为不可用
      if (error.name === 'SequelizeDatabaseError' || 
          error.name === 'SequelizeConnectionError' ||
          (error.parent && error.parent.code === '42P01')) {
        console.log('数据库不可用，将禁用数据库相关功能');
        this.dbAvailable = false;
        
        // 返回基本信息
        return { mintAddress, name: 'Unknown', symbol: 'Unknown', isPotentialBuy: false };
      }
      
      throw error;
    }
  }
  
  /**
   * 保存代币交易历史
   * @param {string} tokenMintAddress - 代币铸造地址
   * @param {Array} tradesData - 交易数据
   */
  async saveTokenTrades(tokenMintAddress, tradesData) {
    if (!this.dbAvailable) return;
    
    try {
      if (!tradesData || tradesData.length === 0) {
        console.log(`代币${tokenMintAddress}没有交易数据`);
        return;
      }
      
      console.log(`正在保存${tradesData.length}条交易数据`);
      
      for (const trade of tradesData) {
        // 检查交易是否有效
        if (!trade || !trade.Transaction || !trade.Transaction.Signature) {
          console.log('跳过无效交易数据:', trade);
          continue;
        }
        
        // 获取交易签名
        const transactionSignature = trade.Transaction.Signature;
        
        try {
          // 检查交易是否已存在
          const existingTrade = await TokenTrade.findOne({
            where: {
              tokenMintAddress,
              transactionSignature
            }
          });
          
          if (existingTrade) {
            // 交易已存在，跳过
            continue;
          }
          
          const tradeData = trade.Trade;
          if (!tradeData || !tradeData.Buy || !tradeData.Sell) {
            console.log('交易数据缺少Buy或Sell信息，跳过');
            continue;
          }
          
          // 确定这是买入还是卖出操作（对于该代币而言）
          const isBuy = tradeData.Buy.Currency?.MintAddress === tokenMintAddress;
          const type = isBuy ? 'buy' : 'sell';
          
          // 获取金额和价格信息
          const buyAmount = parseFloat(tradeData.Buy.Amount || 0);
          const sellAmount = parseFloat(tradeData.Sell.Amount || 0);
          
          // 确定要保存的金额（如果是买入交易保存买入金额，否则保存卖出金额）
          const amount = isBuy ? buyAmount : sellAmount;
          
          // 计算价格 (卖出代币数量/买入代币数量)
          let price = 0;
          if (tradeData.Buy.Price) {
            price = parseFloat(tradeData.Buy.Price);
          } else if (buyAmount > 0 && sellAmount > 0) {
            price = sellAmount / buyAmount;
          }
          
          // 获取USD价格
          let priceUsd = 0;
          if (tradeData.Buy.PriceInUSD) {
            priceUsd = parseFloat(tradeData.Buy.PriceInUSD);
          } else if (tradeData.Buy.AmountInUSD && buyAmount > 0) {
            priceUsd = parseFloat(tradeData.Buy.AmountInUSD) / buyAmount;
          }
          
          // 获取交易方地址
          const buyerAddress = tradeData.Buy.Buyer || trade.Transaction.Signer;
          const sellerAddress = tradeData.Sell.Seller || '';
          
          // 创建交易记录
          const newTrade = {
            tokenMintAddress,
            transactionSignature,
            blockTime: new Date(trade.Block?.Time || Date.now()),
            buyerAddress,
            sellerAddress,
            amount,
            price,
            priceUsd,
            type,
            programMethod: tradeData.Transaction?.Method || '',
            dexName: tradeData.Dex?.ProtocolName || ''
          };
          
          await TokenTrade.create(newTrade);
          console.log(`已保存交易: ${transactionSignature.substring(0, 8)}...`);
        } catch (tradeError) {
          console.error(`保存交易${transactionSignature}失败:`, tradeError);
          // 继续处理其他交易
        }
      }
    } catch (error) {
      console.error(`保存代币${tokenMintAddress}交易历史时出错:`, error);
      if (error.name === 'SequelizeDatabaseError') {
        this.dbAvailable = false;
      }
    }
  }
  
  /**
   * 更新代币持有者信息
   * @param {String} mintAddress - 代币铸造地址
   * @param {Array} holdingsData - 持有者数据
   */
  async updateTokenHolders(mintAddress, holdingsData) {
    if (!this.dbAvailable) return;
    
    try {
      if (!holdingsData || holdingsData.length === 0) {
        console.log(`代币${mintAddress}没有持有者数据`);
        return;
      }

      console.log(`开始更新${holdingsData.length}个持有者信息`);
      
      // 首先计算总供应量
      const token = await Token.findByPk(mintAddress);
      const totalSupply = token ? parseFloat(token.totalSupply || 0) : 0;
      
      for (const holdingData of holdingsData) {
        const { Account, Holding } = holdingData.BalanceUpdate;
        
        if (!Account || !Holding) {
          continue; // 跳过无效数据
        }
        
        // 确保持有者地址不为空
        const holderAddress = ensureValidAddress(Account.Owner);
        
        try {
          // 计算百分比，确保不超过范围
          const balance = parseFloat(Holding);
          let percentOfTotal = 0;
          
          if (totalSupply > 0 && balance > 0) {
            // 计算百分比(0-100)而不是比例(0-1)
            percentOfTotal = (balance / totalSupply) * 100;
            
            // 限制最大值，防止溢出
            if (percentOfTotal > 100) {
              percentOfTotal = 100;
            }
          }
          
          // 使用验证函数确保数据有效
          const validatedHolderData = validateTokenHolderData({
            tokenMintAddress: mintAddress,
            address: holderAddress,
            ownerAddress: Account.Owner,
            balance: balance,
            percentOfTotal: percentOfTotal,
            percentage: percentOfTotal,  // 同时设置percentage字段
            lastUpdateTime: new Date(),
            lastUpdated: new Date(),
            isCreator: false // 默认不是创建者
          });
          
          // 查找或创建持有者记录
          const [holder, created] = await TokenHolder.findOrCreate({
            where: {
              tokenMintAddress: mintAddress,
              address: holderAddress
            },
            defaults: validatedHolderData
          });
          
          // 如果持有者记录已存在，更新余额
          if (!created) {
            holder.balance = balance;
            holder.percentOfTotal = percentOfTotal;
            holder.percentage = percentOfTotal;
            holder.lastUpdateTime = new Date();
            holder.lastUpdated = new Date();
            await holder.save();
          }
        } catch (holderError) {
          console.error(`更新持有者${holderAddress}失败:`, holderError);
          // 继续处理其他持有者
        }
      }
      
      console.log(`已更新${holdingsData.length}个持有者信息`);
    } catch (error) {
      console.error(`更新代币${mintAddress}持有者信息时出错:`, error);
      
      // 如果是数据库错误，标记数据库为不可用
      if (error.name === 'SequelizeDatabaseError' || 
          error.name === 'SequelizeConnectionError') {
        console.log('数据库不可用，将禁用数据库相关功能');
        this.dbAvailable = false;
      }
    }
  }
  
  // 获取所有潜在买入机会
  async getPotentialBuyTokens() {
    try {
      // 如果数据库不可用，返回空数组
      if (!this.dbAvailable) {
        console.log('数据库不可用，无法获取潜在买入机会');
        return [];
      }

      const tokens = await Token.findAll({
        where: { isPotentialBuy: true },
        order: [['creationTime', 'DESC']]
      });
      
      return tokens;
    } catch (error) {
      console.error('获取潜在买入机会时出错:', error);
      
      // 如果是数据库错误，标记数据库为不可用
      if (error.name === 'SequelizeDatabaseError' || 
          error.name === 'SequelizeConnectionError' ||
          (error.parent && error.parent.code === '42P01')) {
        console.log('数据库不可用，将禁用数据库相关功能');
        this.dbAvailable = false;
        return [];
      }
      
      throw error;
    }
  }
  
  // 获取最近创建的代币
  async getRecentTokens(limit = 20) {
    try {
      // 如果数据库不可用，返回空数组
      if (!this.dbAvailable) {
        console.log('数据库不可用，无法获取最近创建的代币');
        return [];
      }

      const tokens = await Token.findAll({
        order: [['creationTime', 'DESC']],
        limit
      });
      
      return tokens;
    } catch (error) {
      console.error('获取最近创建的代币时出错:', error);
      
      // 如果是数据库错误，标记数据库为不可用
      if (error.name === 'SequelizeDatabaseError' || 
          error.name === 'SequelizeConnectionError' ||
          (error.parent && error.parent.code === '42P01')) {
        console.log('数据库不可用，将禁用数据库相关功能');
        this.dbAvailable = false;
        return [];
      }
      
      throw error;
    }
  }
  
  // 按地址获取代币创建者的所有代币
  async getTokensByCreator(creatorAddress) {
    try {
      const tokens = await Token.findAll({
        where: { creatorAddress },
        order: [['creationTime', 'DESC']]
      });
      
      return tokens;
    } catch (error) {
      console.error(`获取创建者${creatorAddress}的代币时出错:`, error);
      throw error;
    }
  }

  /**
   * 获取代币列表
   * @param {Number} limit 返回结果限制数量
   * @param {Number} offset 返回结果偏移量
   * @param {String} sortField 排序字段
   * @param {String} sortOrder 排序方向 (asc, desc)
   * @returns {Promise<Array>} 返回代币列表
   */
  async getTokens(limit = 50, offset = 0, sortField = 'creationTime', sortOrder = 'desc') {
    try {
      return await Token.findAll({
        limit,
        offset,
        order: [[sortField, sortOrder.toUpperCase()]],
      });
    } catch (error) {
      console.error('获取代币列表失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定代币详情
   * @param {String} mintAddress 代币铸造地址
   * @returns {Promise<Object>} 返回代币详情
   */
  async getToken(mintAddress) {
    try {
      return await Token.findOne({
        where: { mintAddress },
      });
    } catch (error) {
      console.error(`获取代币 ${mintAddress} 详情失败:`, error);
      throw error;
    }
  }

  /**
   * 获取代币交易历史
   * @param {String} mintAddress 代币铸造地址
   * @param {Number} limit 返回结果限制数量
   * @param {Number} offset 返回结果偏移量
   * @returns {Promise<Array>} 返回交易历史
   */
  async getTokenTrades(mintAddress, limit = 50, offset = 0) {
    try {
      return await TokenTrade.findAll({
        where: { tokenMintAddress: mintAddress },
        limit,
        offset,
        order: [['blockTime', 'DESC']],
      });
    } catch (error) {
      console.error(`获取代币 ${mintAddress} 交易历史失败:`, error);
      throw error;
    }
  }

  /**
   * 获取代币持有者列表
   * @param {String} mintAddress 代币铸造地址
   * @param {Number} limit 返回结果限制数量
   * @param {Number} offset 返回结果偏移量
   * @returns {Promise<Array>} 返回持有者列表
   */
  async getTokenHolders(mintAddress, limit = 50, offset = 0) {
    try {
      return await TokenHolder.findAll({
        where: { tokenMintAddress: mintAddress },
        limit,
        offset,
        order: [['balance', 'DESC']],
      });
    } catch (error) {
      console.error(`获取代币 ${mintAddress} 持有者失败:`, error);
      throw error;
    }
  }

  /**
   * 更新代币信息
   * @param {String} mintAddress - 代币铸造地址
   * @param {Object} data - 要更新的数据
   * @returns {Object} 更新后的代币信息
   */
  async updateToken(mintAddress, data) {
    try {
      const [updated] = await Token.update(data, { 
        where: { mintAddress } 
      });
      
      if (updated) {
        return await this.getToken(mintAddress);
      }
      return null;
    } catch (error) {
      console.error(`更新代币${mintAddress}信息失败:`, error);
      return null;
    }
  }

  /**
   * 获取代币总数
   * @param {Object} filter - 查询条件
   * @returns {Number} 代币数量
   */
  async getTokensCount(filter = {}) {
    try {
      // 将filter中的特殊条件（如日期比较）转换为Sequelize兼容的格式
      const sequelizeFilter = {};
      
      // 处理日期比较条件
      if (filter.creationTime && filter.creationTime.$gte) {
        sequelizeFilter.creationTime = {
          [Op.gte]: filter.creationTime.$gte
        };
      }
      
      // 处理isPotentialBuy条件
      if (filter.isPotentialBuy !== undefined) {
        sequelizeFilter.isPotentialBuy = filter.isPotentialBuy;
      }
      
      // 查询代币数量
      const count = await Token.count({
        where: sequelizeFilter
      });
      
      return count;
    } catch (error) {
      console.error('获取代币数量失败:', error);
      return 0;
    }
  }
  
  /**
   * 创建新代币
   * @param {Object} tokenData - 代币数据
   * @returns {Object} 创建的代币信息
   */
  async createToken(tokenData) {
    try {
      const [token, created] = await Token.findOrCreate({
        where: { mintAddress: tokenData.mintAddress },
        defaults: tokenData,
      });
      
      if (!created) {
        await token.update(tokenData);
      }
      
      return token;
    } catch (error) {
      console.error(`创建代币 ${tokenData.mintAddress} 记录失败:`, error);
      throw error;
    }
  }

  /**
   * 分析代币数据
   * @param {String} mintAddress 代币铸造地址
   * @returns {Promise<Object>} 分析结果
   */
  async analyzeToken(mintAddress) {
    try {
      // 获取代币数据
      const token = await this.getToken(mintAddress);
      if (!token) {
        throw new Error(`代币 ${mintAddress} 不存在`);
      }
      
      // 获取最新交易数据
      const latestTrades = await this.getTokenTrades(mintAddress, 100, 0);
      
      // 获取持有者分布
      const holders = await this.getTokenHolders(mintAddress, 100, 0);
      
      // 计算各种指标
      const analysis = {
        token: token.toJSON(),
        metrics: {
          // 价格变动
          priceChange24h: this._calculatePriceChange(latestTrades, 24),
          priceChange7d: this._calculatePriceChange(latestTrades, 168),
          
          // 交易量分析
          volumeChange24h: this._calculateVolumeChange(latestTrades, 24),
          volumeChange7d: this._calculateVolumeChange(latestTrades, 168),
          
          // 持有者分析
          totalHolders: holders.length,
          topHoldersConcentration: this._calculateTopHoldersConcentration(holders, 10),
          
          // 流动性分析
          liquidityDepth: this._calculateLiquidityDepth(latestTrades),
          
          // 市场评分
          marketScore: this._calculateMarketScore(token, latestTrades, holders),
        },
      };
      
      return analysis;
    } catch (error) {
      console.error(`分析代币 ${mintAddress} 失败:`, error);
      throw error;
    }
  }

  /**
   * 计算价格变动百分比
   * @private
   * @param {Array} trades 交易记录
   * @param {Number} hours 小时数
   * @returns {Number} 价格变动百分比
   */
  _calculatePriceChange(trades, hours) {
    if (!trades || trades.length < 2) return 0;
    
    const now = new Date();
    const timeThreshold = new Date(now.getTime() - hours * 60 * 60 * 1000);
    
    // 获取最新价格
    const latestPrice = trades[0].price;
    
    // 获取时间范围内的最早价格
    const earliestTrade = trades.find(trade => 
      new Date(trade.blockTime) <= timeThreshold
    );
    
    if (!earliestTrade) return 0;
    
    // 计算价格变动百分比
    const priceChange = ((latestPrice - earliestTrade.price) / earliestTrade.price) * 100;
    return parseFloat(priceChange.toFixed(2));
  }

  /**
   * 计算交易量变动百分比
   * @private
   * @param {Array} trades 交易记录
   * @param {Number} hours 小时数
   * @returns {Number} 交易量变动百分比
   */
  _calculateVolumeChange(trades, hours) {
    if (!trades || trades.length === 0) return 0;
    
    const now = new Date();
    const timeThreshold = new Date(now.getTime() - hours * 60 * 60 * 1000);
    const previousThreshold = new Date(now.getTime() - hours * 2 * 60 * 60 * 1000);
    
    // 计算当前时间段的交易量
    const currentPeriodTrades = trades.filter(trade => 
      new Date(trade.blockTime) >= timeThreshold
    );
    
    const currentVolume = currentPeriodTrades.reduce((sum, trade) => 
      sum + parseFloat(trade.volume), 0);
    
    // 计算前一个时间段的交易量
    const previousPeriodTrades = trades.filter(trade => 
      new Date(trade.blockTime) >= previousThreshold && 
      new Date(trade.blockTime) < timeThreshold
    );
    
    const previousVolume = previousPeriodTrades.reduce((sum, trade) => 
      sum + parseFloat(trade.volume), 0);
    
    // 计算交易量变动百分比
    if (previousVolume === 0) return currentVolume > 0 ? 100 : 0;
    
    const volumeChange = ((currentVolume - previousVolume) / previousVolume) * 100;
    return parseFloat(volumeChange.toFixed(2));
  }

  /**
   * 计算头部持有者集中度
   * @private
   * @param {Array} holders 持有者列表
   * @param {Number} topN 头部持有者数量
   * @returns {Number} 集中度百分比
   */
  _calculateTopHoldersConcentration(holders, topN) {
    if (!holders || holders.length === 0) return 0;
    
    // 确保topN不超过持有者总数
    const actualTopN = Math.min(topN, holders.length);
    
    // 计算总供应量
    const totalSupply = holders.reduce((sum, holder) => 
      sum + parseFloat(holder.balance), 0);
    
    // 计算头部持有者持有量
    const topHoldersBalance = holders
      .sort((a, b) => parseFloat(b.balance) - parseFloat(a.balance))
      .slice(0, actualTopN)
      .reduce((sum, holder) => sum + parseFloat(holder.balance), 0);
    
    // 计算集中度百分比
    const concentration = (topHoldersBalance / totalSupply) * 100;
    return parseFloat(concentration.toFixed(2));
  }

  /**
   * 计算流动性深度
   * @private
   * @param {Array} trades 交易记录
   * @returns {Number} 流动性深度评分 (0-100)
   */
  _calculateLiquidityDepth(trades) {
    if (!trades || trades.length < 10) return 0;
    
    // 计算最近100笔交易的平均交易量
    const avgVolume = trades.reduce((sum, trade) => 
      sum + parseFloat(trade.volume), 0) / trades.length;
    
    // 计算交易频率 (每小时交易数)
    const oldestTradeTime = new Date(trades[trades.length - 1].blockTime);
    const newestTradeTime = new Date(trades[0].blockTime);
    const hoursDiff = (newestTradeTime - oldestTradeTime) / (1000 * 60 * 60);
    const tradesPerHour = hoursDiff > 0 ? trades.length / hoursDiff : 0;
    
    // 计算价格稳定性 (价格波动的标准差)
    const prices = trades.map(t => parseFloat(t.price));
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const priceVariance = prices.reduce((sum, price) => 
      sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const priceStdDev = Math.sqrt(priceVariance);
    const priceStability = Math.max(0, 100 - (priceStdDev / avgPrice) * 100);
    
    // 综合评分 (加权平均)
    const score = (
      (avgVolume * 0.4) + 
      (tradesPerHour * 0.3) + 
      (priceStability * 0.3)
    );
    
    // 标准化到0-100
    return Math.min(100, Math.max(0, parseFloat(score.toFixed(2))));
  }

  /**
   * 计算市场评分
   * @private
   * @param {Object} token 代币信息
   * @param {Array} trades 交易记录
   * @param {Array} holders 持有者列表
   * @returns {Number} 市场评分 (0-100)
   */
  _calculateMarketScore(token, trades, holders) {
    if (!token || !trades || trades.length === 0 || !holders || holders.length === 0) {
      return 0;
    }
    
    // 价格趋势 (25%)
    const priceChange24h = this._calculatePriceChange(trades, 24);
    const priceTrendScore = priceChange24h > 0 ? 
      Math.min(25, priceChange24h / 2) : 
      Math.max(0, 12.5 + priceChange24h / 10);
    
    // 交易活跃度 (25%)
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const recentTrades = trades.filter(t => new Date(t.blockTime) >= dayAgo);
    const tradeActivityScore = Math.min(25, recentTrades.length / 4);
    
    // 持有者分布 (25%)
    const topHolderConcentration = this._calculateTopHoldersConcentration(holders, 5);
    const holderDistributionScore = Math.max(0, 25 - (topHolderConcentration - 50) / 2);
    
    // 流动性 (25%)
    const liquidityScore = this._calculateLiquidityDepth(trades) / 4;
    
    // 综合评分
    const totalScore = priceTrendScore + tradeActivityScore + holderDistributionScore + liquidityScore;
    return parseFloat(totalScore.toFixed(2));
  }

  /**
   * 从Bitquery API获取代币交易数据并更新数据库
   * @param {String} mintAddress 代币铸造地址
   * @returns {Promise<Array>} 获取的交易数据
   */
  async fetchAndUpdateTokenTrades(mintAddress) {
    try {
      const variables = { tokenAddress: mintAddress, limit: 100 };
      const data = await executeBitqueryQuery(tokenTradesQuery, variables);
      
      if (!data || !data.solana || !data.solana.dexTrades) {
        console.warn(`未找到代币 ${mintAddress} 的交易数据`);
        return [];
      }
      
      const trades = data.solana.dexTrades;
      
      // 更新数据库
      for (const trade of trades) {
        await TokenTrade.findOrCreate({
          where: {
            txHash: trade.transaction.hash,
            tokenMintAddress: mintAddress
          },
          defaults: {
            tokenMintAddress: mintAddress,
            txHash: trade.transaction.hash,
            blockHeight: trade.block.height,
            blockTime: trade.block.timestamp,
            side: trade.side,
            price: trade.price,
            volume: trade.quoteAmount,
            count: trade.count || 1,
            buyerAddress: trade.buyerAddress,
            sellerAddress: trade.sellerAddress,
            exchange: trade.exchange.fullName
          }
        });
      }
      
      return trades;
    } catch (error) {
      console.error(`获取代币 ${mintAddress} 交易数据失败:`, error);
      throw error;
    }
  }

  /**
   * 从Bitquery API获取代币持有者数据并更新数据库
   * @param {String} mintAddress 代币铸造地址
   * @returns {Promise<Array>} 获取的持有者数据
   */
  async fetchAndUpdateTokenHolders(mintAddress) {
    try {
      const variables = { tokenAddress: mintAddress, limit: 100 };
      const data = await executeBitqueryQuery(tokenHoldersQuery, variables);
      
      if (!data || !data.solana || !data.solana.transfers) {
        console.warn(`未找到代币 ${mintAddress} 的持有者数据`);
        return [];
      }
      
      const holders = data.solana.transfers;
      
      // 更新数据库
      for (const holder of holders) {
        await TokenHolder.findOrCreate({
          where: {
            address: holder.address,
            tokenMintAddress: mintAddress
          },
          defaults: {
            tokenMintAddress: mintAddress,
            address: holder.address,
            balance: holder.balance,
            lastUpdated: new Date()
          }
        });
      }
      
      return holders;
    } catch (error) {
      console.error(`获取代币 ${mintAddress} 持有者数据失败:`, error);
      throw error;
    }
  }
}

module.exports = new TokenService(); 