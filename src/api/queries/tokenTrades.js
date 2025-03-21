/**
 * Bitquery GraphQL 查询 - 获取代币交易历史
 */
const tokenTradesQuery = `
  query ($tokenAddress: String!, $limit: Int = 100) {
    solana {
      dexTrades(
        options: {limit: $limit, desc: "block.height"}
        baseCurrency: {is: $tokenAddress}
      ) {
        block {
          height
          timestamp
        }
        transaction {
          hash
        }
        buyerAddress: buyer {
          address
        }
        sellerAddress: seller {
          address
        }
        baseCurrency {
          symbol
          address
          name
          decimals
        }
        quoteCurrency {
          symbol
          address
        }
        quoteAmount
        baseAmount
        price
        side
        exchange {
          fullName
        }
        count
      }
    }
  }
`;

module.exports = {
  tokenTradesQuery
}; 