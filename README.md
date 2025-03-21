# Bitquery Pump监控工具

这是一个监控Solana区块链上新创建的Pump Fun代币的工具，能够实时获取和分析代币的相关信息，帮助用户发现潜在的好投资机会。

## 功能

- 实时监控新创建的Pump Fun代币
- 分析代币数据，评估是否是好的买入机会
- 提供REST API和WebSocket实时通知
- 保存代币信息、交易记录和持有者数据到PostgreSQL数据库

## 功能特点

- 使用 Bitquery GraphQL API 获取实时 Solana 代币数据
- 自动监控新代币创建和价格变动
- 提供代币详情、交易历史和持有者分析
- 模拟交易功能，测试不同买卖策略
- 自动化交易策略执行
- 定时任务调度系统
- 绩效分析和报告生成

## 模块介绍

### 基础API模块

- `src/api/bitquery.js` - Bitquery GraphQL API 客户端
- `src/utils/websocketClient.js` - WebSocket 客户端，用于实时数据订阅

### 数据处理模块

- `src/services/tokenService.js` - 代币数据处理服务
- `src/database/models/` - 数据模型定义

### 交易策略模块

- `src/services/tradeStrategies.js` - 交易策略实现
- `src/services/tradeSimulation.js` - 交易模拟服务
- `src/services/scheduler.js` - 定时任务调度服务

### API路由模块

- `src/routes/tokens.js` - 代币相关API
- `src/routes/simulation.js` - 交易模拟API
- `src/routes/scheduler.js` - 定时任务API

## 交易模拟功能

本项目提供交易模拟功能，允许用户测试不同的买卖策略而无需实际投资。主要功能包括：

1. **模拟买卖操作**：记录模拟买卖交易，计算收益和亏损
2. **多种交易策略**：内置多种交易策略，包括毕业代币策略、早期买家持有策略等
3. **绩效分析**：对不同策略进行绩效分析，计算胜率、盈亏比等指标
4. **持仓管理**：查看当前持仓状况，包括持有量、成本价、当前价值等

## 定时任务系统

项目集成了定时任务系统，可以按照预定的时间表执行交易策略：

1. **自动买入**：每天早上9点执行买入策略
2. **自动卖出**：每天下午3点执行卖出策略
3. **定时报告**：每小时检查持仓情况，每天晚上8点生成策略绩效报告
4. **手动控制**：通过API启动/停止定时任务，或手动触发单次执行

## API文档

### 代币API

- `GET /api/tokens` - 获取代币列表
- `GET /api/tokens/:mintAddress` - 获取代币详情
- `GET /api/tokens/:mintAddress/trades` - 获取代币交易历史
- `GET /api/tokens/:mintAddress/holders` - 获取代币持有者列表

### 模拟交易API

- `POST /api/simulation/buy` - 模拟买入操作
- `POST /api/simulation/sell` - 模拟卖出操作
- `GET /api/simulation/holdings` - 获取当前持仓
- `GET /api/simulation/history` - 获取交易历史
- `GET /api/simulation/performance` - 获取策略绩效

### 定时任务API

- `GET /api/scheduler/status` - 获取定时任务状态
- `POST /api/scheduler/start` - 启动定时任务
- `POST /api/scheduler/stop` - 停止定时任务
- `POST /api/scheduler/run-buy` - 手动执行买入策略
- `POST /api/scheduler/run-sell` - 手动执行卖出策略
- `GET /api/scheduler/holdings` - 获取持仓概况
- `GET /api/scheduler/performance` - 获取策略绩效报告

## 技术栈

- Node.js + Express
- PostgreSQL (使用Sequelize ORM)
- Bitquery GraphQL API
- WebSocket (Socket.io)

## 安装和运行

### 前提条件

- Node.js (v14+)
- PostgreSQL
- Bitquery API OAuth令牌 (详见下文)

### Bitquery API认证

Bitquery现在使用OAuth令牌进行API认证，而不是简单的API密钥。请按照以下步骤获取令牌：

1. 访问[Bitquery官网](https://bitquery.io/)并注册/登录
2. 访问[Bitquery OAuth应用页面](https://account.bitquery.io/applications)
3. 点击"创建应用"，填写应用名称并选择令牌过期时间
4. 创建应用后，点击"生成访问令牌"并保存生成的令牌
5. 将此令牌添加到`.env`文件中的`BITQUERY_API_KEY`变量

详细说明请参考[Bitquery官方文档](https://docs.bitquery.io/docs/authorisation/how-to-generate/)

### 步骤

1. 克隆仓库

```bash
git clone https://github.com/yourusername/bitquery-pump.git
cd bitquery-pump
```

2. 安装依赖

```bash
npm install
```

3. 创建PostgreSQL数据库

```bash
# 使用PostgreSQL命令行或管理工具创建数据库
createdb bitquery_pump
```

4. 配置环境变量

复制`.env.example`文件为`.env`并编辑相关配置：

```bash
cp .env.example .env
# 编辑.env文件，填写BITQUERY_API_KEY(OAuth令牌)和数据库配置
```

5. 启动应用

```bash
npm run dev  # 开发模式
# 或
npm start    # 生产模式
```

## API端点

### 代币API

- `GET /api/tokens` - 获取代币列表
- `GET /api/tokens/:mintAddress` - 获取代币详情
- `GET /api/tokens/:mintAddress/trades` - 获取代币交易历史
- `GET /api/tokens/:mintAddress/holders` - 获取代币持有者列表

### WebSocket事件

- `new-token` - 当新代币被创建时触发

## Docker部署

您也可以使用Docker运行此应用：

```bash
# 构建Docker镜像
docker build -t bitquery-pump .

# 运行容器
docker run -d -p 3000:3000 --env-file .env bitquery-pump
```

## 配置Docker Compose (使用PostgreSQL)

```yaml
version: '3'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db
    environment:
      - NODE_ENV=production
      - DB_HOST=db
      - DB_PORT=5432
      - DB_NAME=bitquery_pump
      - DB_USER=postgres
      - DB_PASSWORD=postgres
      - BITQUERY_API_KEY=your_oauth_token_here  # 请替换为您的OAuth令牌

  db:
    image: postgres:13
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=bitquery_pump
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

## 许可

MIT

## 贡献

欢迎贡献和提出问题！请提交PR或创建Issue。