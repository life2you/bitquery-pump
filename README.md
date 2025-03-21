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

### 使用启动脚本（推荐）

1. 克隆仓库
```bash
git clone https://github.com/yourusername/bitquery-pump.git
cd bitquery-pump
```

2. 配置环境变量
```bash
cp .env.example .env
```
编辑 `.env` 文件，配置您的API密钥和数据库连接信息。

3. 运行启动脚本
```bash
./start.sh
```

启动脚本会自动:
- 检查和安装前后端依赖
- 启动后端服务
- 启动前端开发服务器
- 提供访问链接
- 支持一键停止所有服务 (Ctrl+C)

### 手动启动

#### 后端

1. 安装依赖
```bash
npm install
```

2. 启动服务
```bash
npm run dev
```

#### 前端

1. 进入前端目录
```bash
cd src/client
```

2. 安装依赖
```bash
npm install
```

3. 启动开发服务器
```bash
npm start
```

## 访问应用

- 前端: [http://localhost:3000](http://localhost:3000)
- 后端API: [http://localhost:3001/api](http://localhost:3001/api)

## 项目结构

```
bitquery-pump/
├── src/                  # 项目源代码
│   ├── client/           # 前端React应用
│   │   ├── public/       # 静态文件
│   │   ├── src/          # 源代码
│   │   │   ├── components/   # 组件
│   │   │   ├── pages/        # 页面组件
│   │   │   ├── services/     # API服务
│   │   │   ├── hooks/        # 自定义Hooks
│   │   │   ├── utils/        # 工具函数
│   │   │   └── styles/       # 样式文件
│   ├── api/              # 后端API
│   ├── services/         # 后端服务
│   ├── models/           # 数据模型
│   ├── utils/            # 工具函数
│   └── index.js          # 应用入口
├── .env                  # 环境变量
├── .env.example          # 环境变量示例
├── package.json          # 项目依赖
├── start.sh              # 启动脚本
└── README.md             # 项目文档
```

## 贡献指南

1. Fork 这个仓库
2. 创建您的特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交您的更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 打开一个 Pull Request

## 许可证

[MIT](LICENSE)

## 联系方式

如有任何问题或建议，请通过以下方式联系我们：

- 邮箱: your.email@example.com
- GitHub Issues: [https://github.com/yourusername/bitquery-pump/issues](https://github.com/yourusername/bitquery-pump/issues)

## 快速开始

### 使用服务管理脚本

我们提供了两个服务管理脚本，分别用于控制前端和后端服务。

#### 后端服务管理

```bash
# 启动后端服务
./backend.sh start

# 停止后端服务
./backend.sh stop

# 重启后端服务
./backend.sh restart

# 查看后端服务状态
./backend.sh status

# 查看日志
./backend.sh logs         # 显示完整日志
./backend.sh logs tail    # 实时跟踪最新日志
./backend.sh logs last    # 显示最后50行日志
./backend.sh logs last 100 # 显示最后100行日志
./backend.sh logs 50      # 显示前50行日志
./backend.sh logs clear   # 清空日志
```

#### 前端服务管理

```bash
# 启动前端服务
./frontend.sh start

# 停止前端服务
./frontend.sh stop

# 重启前端服务
./frontend.sh restart

# 查看前端服务状态
./frontend.sh status

# 查看日志
./frontend.sh logs         # 显示完整日志
./frontend.sh logs tail    # 实时跟踪最新日志
./frontend.sh logs last    # 显示最后50行日志
./frontend.sh logs last 100 # 显示最后100行日志
./frontend.sh logs 50      # 显示前50行日志
./frontend.sh logs clear   # 清空日志
```

这些脚本自动处理进程管理、依赖安装和错误恢复等功能，让服务管理变得简单。

### 日志文件位置

- 前端日志: `src/frontend.log`
- 后端日志: `backend.log`

这些日志文件包含了服务运行过程中的详细信息，对于故障排查和性能监控非常有用。