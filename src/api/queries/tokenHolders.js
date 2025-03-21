/**
 * Bitquery GraphQL 查询 - 获取代币持有者信息
 */
const tokenHoldersQuery = `
  query ($tokenAddress: String!, $limit: Int = 100) {
    solana {
      transfers(
        options: {limit: $limit, desc: "value"}
        currency: {is: $tokenAddress}
      ) {
        address: receiver {
          address
        }
        balance: value
        currency {
          symbol
          name
          decimals
        }
        count
      }
    }
  }
`;

module.exports = {
  tokenHoldersQuery
}; 