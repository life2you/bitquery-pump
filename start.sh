#!/bin/bash

# Bitquery Pump 启动脚本
# 这个脚本用于启动 Bitquery Pump 的前端和后端服务

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 打印标题
echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}    Bitquery Pump 启动脚本    ${NC}"
echo -e "${BLUE}====================================${NC}"

# 检查环境变量文件
if [ ! -f .env ]; then
  echo -e "${RED}错误: .env 文件不存在!${NC}"
  echo -e "${YELLOW}请从 .env.example 复制一份并配置您的环境变量${NC}"
  exit 1
fi

# 定义函数
start_backend() {
  echo -e "${YELLOW}启动后端服务...${NC}"
  # 检查是否安装了依赖
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装后端依赖...${NC}"
    npm install
  fi
  
  npm run dev &
  BACKEND_PID=$!
  echo -e "${GREEN}后端服务已启动，PID: $BACKEND_PID${NC}"
}

start_frontend() {
  echo -e "${YELLOW}启动前端服务...${NC}"
  # 检查前端目录是否存在
  if [ ! -d "src/client" ]; then
    echo -e "${RED}错误: 前端目录不存在!${NC}"
    return 1
  fi
  
  # 进入前端目录
  cd src/client
  
  # 检查是否安装了依赖
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装前端依赖...${NC}"
    npm install
  fi
  
  # 启动前端服务
  npm start &
  FRONTEND_PID=$!
  echo -e "${GREEN}前端服务已启动，PID: $FRONTEND_PID${NC}"
  
  # 返回项目根目录
  cd ../..
}

# 主函数
main() {
  echo -e "${YELLOW}准备启动 Bitquery Pump...${NC}"
  
  # 启动后端
  start_backend
  
  # 等待后端服务启动完成
  echo -e "${YELLOW}等待后端服务初始化...${NC}"
  sleep 5
  
  # 启动前端
  start_frontend
  
  # 显示访问信息
  echo -e "\n${GREEN}Bitquery Pump 服务已启动!${NC}"
  echo -e "${GREEN}------------------------------${NC}"
  echo -e "${GREEN}前端访问地址: ${NC}http://localhost:3000"
  echo -e "${GREEN}后端API地址: ${NC}http://localhost:3001/api"
  echo -e "${GREEN}------------------------------${NC}"
  echo -e "${YELLOW}按 Ctrl+C 停止所有服务${NC}\n"
  
  # 处理退出信号
  trap cleanup SIGINT SIGTERM
  
  # 等待子进程
  wait
}

# 清理函数，用于处理脚本终止时的操作
cleanup() {
  echo -e "\n${YELLOW}正在停止所有服务...${NC}"
  
  # 关闭前端进程
  if [ ! -z "$FRONTEND_PID" ]; then
    kill -TERM $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}前端服务已停止${NC}"
  fi
  
  # 关闭后端进程
  if [ ! -z "$BACKEND_PID" ]; then
    kill -TERM $BACKEND_PID 2>/dev/null
    echo -e "${GREEN}后端服务已停止${NC}"
  fi
  
  echo -e "${GREEN}所有服务已停止${NC}"
  exit 0
}

# 执行主函数
main 