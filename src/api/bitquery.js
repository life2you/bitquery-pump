const { request, gql } = require('graphql-request');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
require('dotenv').config();

// 更新API端点为EAP端点
const BITQUERY_API_URL = 'https://streaming.bitquery.io/eap';
const API_KEY = process.env.BITQUERY_API_KEY;

// 代理设置
const proxyUrl = process.env.HTTP_PROXY || process.env.HTTPS_PROXY;

// 创建GraphQL客户端头部 - 使用V2 Bearer认证方式
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_KEY}`  // 使用Bearer token认证
};

// 创建配置对象
const getRequestOptions = () => {
  const options = {};
  
  // 如果配置了代理，设置代理
  if (proxyUrl) {
    options.agent = new HttpsProxyAgent(proxyUrl);
    console.log(`API请求将使用代理: ${proxyUrl}`);
  }
  
  return options;
};

// 获取新创建的代币订阅查询
const NEW_TOKEN_SUBSCRIPTION = gql`
  subscription {
    Solana {
      TokenSupplyUpdates(
        where: {Instruction: {Program: {Address: {is: "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P"}, Method: {is: "create"}}}}
      ) {
        Block{
          Time
        }
        Transaction{
          Signer
        }
        TokenSupplyUpdate {
          Amount
          Currency {
            Symbol
            ProgramAddress
            PrimarySaleHappened
            Native
            Name
            MintAddress
            MetadataAddress
            Key
            IsMutable
            Fungible
            EditionNonce
            Decimals
            Wrapped
            VerifiedCollection
            Uri
            UpdateAuthority
            TokenStandard
          }
          PostBalance
        }
      }
    }
  }
`;

// 获取代币详细信息查询
const TOKEN_DETAILS_QUERY = gql`
  query ($tokenAddress: String!, $devAddress: String) {
    Solana {
      volume: DEXTradeByTokens(
        where: {Trade: {Currency: {MintAddress: {is: $tokenAddress}}}}
      ) {
        sum(of: Trade_Side_AmountInUSD)
      }
      devHolding: BalanceUpdates(
        where: {BalanceUpdate: {Account: {Owner: {is: $devAddress}}, Currency: {MintAddress: {is: $tokenAddress}}}}
      ) {
        BalanceUpdate {
          balance: PostBalance(maximum: Block_Slot, selectWhere: {gt: "0"})
        }
      }
      topHoldings: BalanceUpdates(
        limit: {count: 10}
        orderBy: {descendingByField: "BalanceUpdate_Holding_maximum"}
        where: {BalanceUpdate: {Currency: {MintAddress: {is: $tokenAddress}}}, Transaction: {Result: {Success: true}}}
      ) {
        BalanceUpdate {
          Currency {
            Name
            MintAddress
            Symbol
          }
          Account {
            Owner
          }
          Holding: PostBalance(maximum: Block_Slot, selectWhere: {gt: "0"})
        }
      }
    }
  }
`;

// 获取代币最新交易查询
const TOKEN_TRADES_QUERY = gql`
  query ($tokenAddress: String!) {
    Solana {
      DEXTrades(
        limit: {count: 20}
        orderBy: {descending: Block_Time}
        where: {
          Transaction: {Result: {Success: true}},
          Trade: {
            Dex: {ProtocolName: {is: "pump"}},
            Buy: {Currency: {MintAddress: {is: $tokenAddress}}}
          }
        }
      ) {
        Block {
          Time
        }
        Transaction {
          Signature
          Signer
        }
        Trade {
          Dex {
            ProtocolFamily
            ProtocolName
          }
          Buy {
            Amount
            AmountInUSD
            Account {
              Address
            }
            Currency {
              Symbol
              MintAddress
            }
          }
          Sell {
            Amount
            AmountInUSD
            Account {
              Address
            }
            Currency {
              Symbol
              MintAddress
            }
          }
        }
      }
    }
  }
`;

// 获取代币交易统计查询
const TOKEN_STATS_QUERY = gql`
  query ($tokenAddress: String!) {
    Solana {
      DEXStats: DEXTrades(
        where: {
          Transaction: {Result: {Success: true}},
          Trade: {
            Dex: {ProtocolName: {is: "pump"}},
            Buy: {Currency: {MintAddress: {is: $tokenAddress}}}
          }
        }
      ) {
        buyCount: count(
          distinct: Trade_Buy_Account_Address
        )
        sellCount: count(
          distinct: Trade_Sell_Account_Address
        )
        buyVolume: sum(
          of: Trade_Buy_Amount
        )
        sellVolume: sum(
          of: Trade_Sell_Amount
        )
        buyVolumeUSD: sum(
          of: Trade_Buy_AmountInUSD
        )
        sellVolumeUSD: sum(
          of: Trade_Sell_AmountInUSD
        )
        distinctBuyers: count(
          distinct: Trade_Buy_Account_Address
        )
        distinctSellers: count(
          distinct: Trade_Sell_Account_Address
        )
      }
    }
  }
`;

// 获取代币当前价格查询
const TOKEN_PRICE_QUERY = gql`
  query ($tokenAddress: String!) {
    Solana {
      DEXTrades(
        limit: {count: 1}
        orderBy: {descending: Block_Time}
        where: {
          Transaction: {Result: {Success: true}},
          Trade: {
            Dex: {ProtocolName: {is: "pump"}},
            Buy: {Currency: {MintAddress: {is: $tokenAddress}}}
          }
        }
      ) {
        Block {
          Time
        }
        Trade {
          Buy {
            Amount
            Price
            PriceInUSD
          }
          Sell {
            Amount
            AmountInUSD
          }
        }
      }
    }
  }
`;

// 获取热门代币查询
const TOP_TOKENS_QUERY = gql`
  query {
    Solana {
      DEXTrades(
        limit: {count: 20}
        orderBy: {descending: Block_Time}
        where: {
          Transaction: {Result: {Success: true}},
          Trade: {
            Dex: {ProtocolName: {is: "pump"}}
          }
        }
      ) {
        Block {
          Time
        }
        Trade {
          Dex {
            ProtocolName
          }
          Buy {
            Currency {
              Name
              Symbol
              MintAddress
            }
            Amount
            AmountInUSD
            Price
          }
          Sell {
            Currency {
              Symbol
              MintAddress
            }
            Amount
            AmountInUSD
          }
        }
      }
    }
  }
`;

// 获取代币OHLC数据查询
const TOKEN_OHLC_QUERY = gql`
  query ($tokenAddress: String!, $since: ISO8601DateTime!, $till: ISO8601DateTime!, $interval: String!) {
    Solana {
      DEXTrades(
        where: {
          Transaction: {Result: {Success: true}},
          Trade: {
            Dex: {ProtocolName: {is: "pump"}},
            Buy: {Currency: {MintAddress: {is: $tokenAddress}}}
          },
          Block: {Time: {since: $since, till: $till}}
        }
        orderBy: {ascending: Block_Time}
      ) {
        Block {
          Time
        }
        Trade {
          Buy {
            Amount
            AmountInUSD
            Price
          }
          Sell {
            Amount
            AmountInUSD
          }
        }
      }
    }
  }
`;

// 获取代币流动性
const TOKEN_LIQUIDITY_QUERY = gql`
  query ($tokenAddress: String) {
    Solana {
      BalanceUpdates(
        where: {
          BalanceUpdate: {
            Account: {
              Token: {
                Owner: {
                  in: [
                    "BesTLFfCP9tAuUDWnqPdtDXZRu5xK6XD8TrABXGBECuf",
                    "62dvmMKAfnt8jSdT3ToZtxAasx7Ud1tJ6xWsjwwhfaEQ",
                    "73ZzSgNi27V9MdNQYyE39Vs9m1P9ZKgGPCHAJHin5gLd",
                    "DwPwU1PAjTXtYNYkeR6awYMDBdSEk12npKzJWKbDHMta",
                    "FJ4P2a2FqaWmqYpBw9eEfWD6cXV3F2qLPHvAA5jozscS",
                    "6crUHiCoxZsQuxdMAB18VATKrg7ToyTVxt7MbLYmtugu"
                  ]
                }
              }
            },
            Currency: {MintAddress: {is: $tokenAddress}}
          }
        }
      ) {
        BalanceUpdate {
          Account {
            Token {
              Owner
            }
          }
          PostBalance(maximum: Block_Slot)
        }
      }
    }
  }
`;

// 获取首批100名买家
const FIRST_BUYERS_QUERY = gql`
  query ($tokenAddress: String) {
    Solana {
      DEXTrades(
        limit: {count: 100}
        orderBy: {ascending: Block_Time}
        where: {
          Trade: {
            Buy: {Currency: {MintAddress: {is: $tokenAddress}}},
            Dex: {ProtocolName: {is: "pump"}}
          },
          Transaction: {Result: {Success: true}}
        }
      ) {
        Block {
          Time
        }
        Trade {
          Buy {
            Account {
              Address
            }
            Amount
          }
          Price
          PriceInUSD
        }
        Transaction {
          Signature
        }
      }
    }
  }
`;

// 获取代币的市值和绑定曲线进度
const TOKEN_MARKETCAP_QUERY = gql`
  query ($tokenAddress: String) {
    Solana {
      TokenSupplyUpdates(
        limitBy: {by: Currency_MintAddress, count: 1}
        orderBy: {descending: Block_Time}
        where: {TokenSupplyUpdate: {Currency: {MintAddress: {is: $tokenAddress}}}}
      ) {
        TokenSupplyUpdate {
          Amount
          Currency {
            MintAddress
            Decimals
          }
        }
      }
      DEXTrades(
        limit: {count: 1}
        orderBy: {descending: Block_Time}
        where: {
          Trade: {
            Currency: {MintAddress: {is: $tokenAddress}},
            Dex: {ProtocolName: {is: "pump"}}
          }
        }
      ) {
        Trade {
          Price
          PriceInUSD
        }
      }
      BalanceUpdates(
        where: {
          BalanceUpdate: {
            Account: {
              Token: {
                Owner: {
                  in: [
                    "BesTLFfCP9tAuUDWnqPdtDXZRu5xK6XD8TrABXGBECuf",
                    "62dvmMKAfnt8jSdT3ToZtxAasx7Ud1tJ6xWsjwwhfaEQ",
                    "73ZzSgNi27V9MdNQYyE39Vs9m1P9ZKgGPCHAJHin5gLd",
                    "DwPwU1PAjTXtYNYkeR6awYMDBdSEk12npKzJWKbDHMta",
                    "FJ4P2a2FqaWmqYpBw9eEfWD6cXV3F2qLPHvAA5jozscS",
                    "6crUHiCoxZsQuxdMAB18VATKrg7ToyTVxt7MbLYmtugu"
                  ]
                }
              }
            },
            Currency: {
              MintAddress: {is: $tokenAddress}
            }
          }
        }
      ) {
        BalanceUpdate {
          PostBalance(maximum: Block_Slot)
        }
      }
    }
  }
`;

// 获取即将毕业到Raydium的代币
const GRADUATING_TOKENS_QUERY = gql`
  query {
    Solana {
      DEXTradeByTokens(
        limit: {count: 50}
        orderBy: {descendingByField: "Trade_Buy_Price"}
        where: {
          Trade: {
            Buy: {Currency: {MintAddress: {notIn: ["11111111111111111111111111111111"]}}},
            Dex: {ProtocolName: {is: "pump"}},
            PriceAsymmetry: {le: 0.1}
          },
          Block: {Time: {since: "-7d"}}
        }
      ) {
        Trade {
          Dex {
            ProtocolName
          }
          Buy {
            Currency {
              MintAddress
              Name
              Symbol
              Decimals
            }
            Price
            PriceInUSD
          }
        }
        tradeCount: count
        volume: sum(of: Trade_Side_AmountInUSD)
      }
    }
  }
`;

// 实时订阅新代币
const subscribeToNewTokens = async (callback) => {
  try {
    // 使用WebSocket实现订阅
    // 这里需要特定的WebSocket实现
    console.log('需要特定的WebSocket实现');
  } catch (error) {
    console.error('订阅新代币失败:', error);
    throw error;
  }
};

// 获取新创建的代币
const fetchNewTokens = async () => {
  try {
    const response = await request(
      BITQUERY_API_URL,
      NEW_TOKEN_SUBSCRIPTION,
      {}, 
      headers,
      getRequestOptions()
    );
    return response?.Solana?.TokenSupplyUpdates || [];
  } catch (error) {
    console.error('获取新代币失败:', error);
    return [];
  }
};

const fetchTokenDetails = async (tokenAddress, devAddress) => {
  try {
    const response = await request(
      BITQUERY_API_URL,
      TOKEN_DETAILS_QUERY,
      { tokenAddress, devAddress },
      headers,
      getRequestOptions()
    );
    return response?.Solana || null;
  } catch (error) {
    console.error(`获取代币${tokenAddress}详情失败:`, error);
    return null;
  }
};

const fetchTokenTrades = async (tokenAddress) => {
  try {
    const response = await request(
      BITQUERY_API_URL,
      TOKEN_TRADES_QUERY,
      { tokenAddress },
      headers,
      getRequestOptions()
    );
    return response?.Solana?.DEXTrades || [];
  } catch (error) {
    console.error(`获取代币${tokenAddress}交易记录失败:`, error);
    return [];
  }
};

const fetchTokenStats = async (tokenAddress) => {
  try {
    const response = await request(
      BITQUERY_API_URL,
      TOKEN_STATS_QUERY,
      { tokenAddress },
      headers,
      getRequestOptions()
    );
    return response?.Solana?.DEXStats || null;
  } catch (error) {
    console.error(`获取代币${tokenAddress}统计数据失败:`, error);
    return null;
  }
};

const fetchTokenPrice = async (tokenAddress) => {
  try {
    const response = await request(
      BITQUERY_API_URL,
      TOKEN_PRICE_QUERY,
      { tokenAddress },
      headers,
      getRequestOptions()
    );
    return response?.Solana?.DEXTrades?.[0]?.Trade || null;
  } catch (error) {
    console.error(`获取代币${tokenAddress}价格失败:`, error);
    return null;
  }
};

const fetchTokenLiquidity = async (tokenAddress) => {
  try {
    const response = await request(
      BITQUERY_API_URL,
      TOKEN_LIQUIDITY_QUERY,
      { tokenAddress },
      headers,
      getRequestOptions()
    );
    return response?.Solana?.BalanceUpdates || [];
  } catch (error) {
    console.error(`获取代币${tokenAddress}的流动性失败:`, error);
    return [];
  }
};

const fetchFirstBuyers = async (tokenAddress) => {
  try {
    const response = await request(
      BITQUERY_API_URL,
      FIRST_BUYERS_QUERY,
      { tokenAddress },
      headers,
      getRequestOptions()
    );
    return response?.Solana?.DEXTrades || [];
  } catch (error) {
    console.error(`获取代币${tokenAddress}的首批买家失败:`, error);
    return [];
  }
};

const fetchTokenMarketcap = async (tokenAddress) => {
  try {
    const response = await request(
      BITQUERY_API_URL,
      TOKEN_MARKETCAP_QUERY,
      { tokenAddress },
      headers,
      getRequestOptions()
    );
    return response?.Solana || null;
  } catch (error) {
    console.error(`获取代币${tokenAddress}的市值和绑定曲线进度失败:`, error);
    return null;
  }
};

const fetchGraduatingTokens = async () => {
  try {
    const response = await request(
      BITQUERY_API_URL,
      GRADUATING_TOKENS_QUERY,
      {},
      headers,
      getRequestOptions()
    );
    return response?.Solana?.DEXTradeByTokens || [];
  } catch (error) {
    console.error('获取即将毕业到Raydium的代币失败:', error);
    return [];
  }
};

// 添加被删除的函数
const fetchTopTokens = async () => {
  try {
    const response = await request(
      BITQUERY_API_URL,
      TOP_TOKENS_QUERY,
      {},
      headers,
      getRequestOptions()
    );
    return response?.Solana?.DEXTrades || [];
  } catch (error) {
    console.error('获取热门代币失败:', error);
    return [];
  }
};

const fetchTokenOHLC = async (tokenAddress, since, till, interval) => {
  try {
    const response = await request(
      BITQUERY_API_URL,
      TOKEN_OHLC_QUERY,
      { tokenAddress, since, till, interval },
      headers,
      getRequestOptions()
    );
    return response?.Solana?.DEXTrades || [];
  } catch (error) {
    console.error(`获取代币${tokenAddress} OHLC数据失败:`, error);
    return [];
  }
};

module.exports = {
  fetchNewTokens,
  fetchTokenDetails,
  fetchTokenTrades,
  fetchTokenStats,
  fetchTokenPrice,
  fetchTokenLiquidity,
  fetchFirstBuyers,
  fetchTokenMarketcap,
  fetchGraduatingTokens,
  fetchTopTokens,
  fetchTokenOHLC,
  NEW_TOKEN_SUBSCRIPTION,
  TOKEN_DETAILS_QUERY,
  TOKEN_TRADES_QUERY,
  TOKEN_STATS_QUERY,
  TOKEN_PRICE_QUERY,
  TOP_TOKENS_QUERY,
  TOKEN_OHLC_QUERY,
  TOKEN_LIQUIDITY_QUERY,
  FIRST_BUYERS_QUERY,
  TOKEN_MARKETCAP_QUERY,
  GRADUATING_TOKENS_QUERY
}; 