# Bitquery-Pump 功能文档

## 项目概述

Bitquery-Pump 是一个用于监控 Solana 区块链上新创建代币的工具，它能够实时捕获新代币信息，分析代币潜力，并提供交易模拟功能。系统使用 WebSocket 实时订阅 Bitquery 服务获取区块链数据，并将数据存储在 PostgreSQL 数据库中。

## 系统架构

### 核心组件

1. **API 层**：提供与 Bitquery GraphQL API 的交互
2. **数据库层**：使用 Sequelize ORM 管理 PostgreSQL 数据库
3. **服务层**：包含各种业务逻辑处理服务
4. **路由层**：定义 REST API 接口
5. **工具层**：提供各种辅助功能
6. **脚本层**：包含数据修复和维护脚本

### 技术栈

- **后端框架**：Express.js
- **数据库**：PostgreSQL
- **ORM**：Sequelize
- **WebSocket**：socket.io (服务端) + ws (客户端)
- **API**：Bitquery GraphQL API
- **任务调度**：node-cron

## 数据模型

### 1. Token（代币）

代币是系统的核心数据模型，用于存储 Solana 代币的基本信息和统计数据。

**主要字段**：
- `mintAddress`：代币铸造地址（主键）
- `name`：代币名称
- `symbol`：代币符号
- `decimals`：小数位数
- `creatorAddress`：创建者地址
- `creationTime`：创建时间
- `uri`：代币元数据 URI
- `totalSupply`：总供应量
- `lastPrice`：最新价格
- `lastPriceUsd`：美元价格
- `marketCap`：市值
- `tradeVolume`：总交易量
- `buyVolume`/`sellVolume`：买入/卖出交易量
- `buyCount`/`sellCount`：买入/卖出交易次数
- `holderCount`：持有者数量
- `isPotentialBuy`：是否是潜在买入机会
- `metadata`：元数据（JSON）

### 2. TokenHolder（代币持有者）

记录代币的持有者信息，包括余额和占比。

**主要字段**：
- `id`：主键
- `tokenMintAddress`：代币铸造地址（外键）
- `address`：持有者地址
- `ownerAddress`：所有者地址
- `balance`：持有余额
- `percentage`：占总供应量百分比
- `percentOfTotal`：占总供应量百分比（冗余）
- `isCreator`：是否是创建者
- `lastUpdateTime`/`lastUpdated`：最后更新时间

### 3. TokenTrade（代币交易）

记录代币的交易历史，包括价格、数量和交易方向。

**主要字段**：
- `id`：主键
- `tokenMintAddress`：代币铸造地址（外键）
- `transactionSignature`：交易签名
- `blockTime`：区块时间
- `buyerAddress`：买方地址
- `sellerAddress`：卖方地址
- `amount`：交易数量
- `price`：交易价格
- `priceUsd`：美元价格
- `type`：交易类型（买入/卖出）
- `programMethod`：程序方法
- `dexName`：DEX 名称

## 核心功能

### 1. 实时代币监控

系统通过 WebSocket 连接订阅 Bitquery API，实时捕获 Solana 区块链上新代币创建事件。

**关键流程**：
- 初始化 WebSocket 客户端连接 Bitquery
- 订阅 `NEW_TOKEN_SUBSCRIPTION` 查询
- 收到新代币数据时，保存到数据库
- 通过 `monitorService` 触发新代币事件，通知前端

### 2. 代币信息更新

系统会定期更新已存储代币的详细信息，包括价格、交易量和持有者分布。

**数据来源**：
- 从 Bitquery API 获取代币详情
- 获取代币交易历史
- 获取代币持有者数据
- 获取代币统计数据和价格

### 3. 代币分析

系统对代币进行多维度分析，评估其投资潜力。

**分析维度**：
- 价格趋势：短期和长期价格变动
- 交易活跃度：交易频率和交易量
- 持有者分布：头部持有者集中度
- 流动性深度：价格稳定性和交易活跃度

### 4. 交易模拟

提供交易模拟功能，可以根据不同策略模拟代币交易，评估策略效果。

**支持策略**：
- 定时平均成本策略
- 价格条件触发策略
- 基于持有者变化的策略
- 基于交易量变化的策略

### 5. 定时任务

系统设置多个定时任务自动执行各种维护和更新操作。

**主要任务**：
- 更新代币详情
- 更新代币持有者信息
- 更新代币交易历史
- 分析代币投资潜力
- 清理过期数据

## API 接口

### 代币相关接口

1. **获取代币列表**：`GET /api/tokens`
   - 支持分页、排序
   - 返回代币基本信息

2. **获取代币详情**：`GET /api/tokens/:mintAddress`
   - 返回指定代币的详细信息

3. **获取代币交易历史**：`GET /api/tokens/:mintAddress/trades`
   - 支持分页
   - 返回代币交易记录

4. **获取代币持有者**：`GET /api/tokens/:mintAddress/holders`
   - 支持分页
   - 返回代币持有者信息

5. **分析代币**：`POST /api/tokens/:mintAddress/analyze`
   - 手动触发代币分析
   - 返回分析结果

### 交易模拟接口

1. **启动模拟**：`POST /api/simulation/start`
   - 启动特定代币的交易模拟

2. **停止模拟**：`POST /api/simulation/stop`
   - 停止指定的模拟任务

3. **获取模拟结果**：`GET /api/simulation/results`
   - 返回模拟交易结果

### 定时任务接口

1. **启动任务**：`POST /api/scheduler/start`
   - 启动一个或多个定时任务

2. **停止任务**：`POST /api/scheduler/stop`
   - 停止指定的定时任务

3. **获取任务状态**：`GET /api/scheduler/status`
   - 返回所有定时任务的状态

## 数据流程

### 新代币处理流程

1. WebSocket 客户端接收新代币创建事件
2. `tokenService.saveNewToken()` 保存代币基本信息
3. 创建 TokenHolder 记录，设置创建者持有 100% 的代币
4. `monitorService.triggerNewToken()` 触发新代币事件
5. 延迟 5 秒后，`tokenService.updateTokenDetails()` 更新代币详情

### 代币分析流程

1. 获取代币基本信息
2. 获取代币最近交易历史
3. 获取代币持有者分布
4. 计算价格变动、交易量变化等指标
5. 综合评估代币投资潜力
6. 更新代币 `isPotentialBuy` 标志和分析结果

## 技术细节

### 错误处理

系统采用多层次错误处理策略：
- 捕获数据库连接错误，标记 `dbAvailable` 状态
- 捕获 API 请求错误，提供降级功能
- 处理未捕获的异常和未处理的 Promise 拒绝

### 数据库索引

为提高查询性能，系统在关键字段上建立索引：
- Token：`creationTime`、`isPotentialBuy`
- TokenHolder：`tokenMintAddress`、`address`
- TokenTrade：`tokenMintAddress`、`transactionSignature`、`blockTime`、`type`

### 数据校验

系统对输入数据进行严格验证：
- 使用 `ensureValidAddress` 确保地址有效
- 使用 `validateTokenHolderData` 验证持有者数据完整性
- 解析和格式化数值数据，确保数据类型正确

## 项目维护

### 数据修复脚本

系统提供多个数据修复脚本，修复数据库表结构和数据问题：
- `fixTokenTradeModel.js`：修复 TokenTrade 表结构
- `fixTokenHolderModel.js`：修复 TokenHolder 表结构
- `fixTokenHolderPrecision.js`：修复 TokenHolder 表数据精度

### 性能优化

- 使用批量操作减少数据库请求
- 采用延迟加载策略，按需获取详细数据
- 使用缓存减少重复 API 请求

## 部署说明

### 环境变量

系统依赖多个环境变量：
- `PORT`：服务器端口
- `DATABASE_URL`：PostgreSQL 连接字符串
- `BITQUERY_API_KEY`：Bitquery API 密钥
- `AUTO_START_SCHEDULER`：是否自动启动定时任务

### 启动命令

- 开发环境：`npm run dev`
- 生产环境：`npm start`

## 总结

Bitquery-Pump 是一个功能完整的 Solana 代币监控和分析系统，它通过实时数据采集、多维度分析和交易模拟，帮助用户发现潜在的投资机会。系统架构清晰，数据流程完整，具有良好的扩展性和可维护性。 