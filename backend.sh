#!/bin/bash

# Bitquery Pump 后端服务脚本
# 用于管理后端服务的启动、重启和停止

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# PID文件路径
PID_FILE="/tmp/bitquery-pump-backend.pid"
# 日志文件路径
LOG_FILE="backend.log"

# 打印标题
echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}    Bitquery Pump 后端服务脚本     ${NC}"
echo -e "${BLUE}====================================${NC}"

# 检查环境变量文件
if [ ! -f .env ]; then
  echo -e "${RED}错误: .env 文件不存在!${NC}"
  echo -e "${YELLOW}请从 .env.example 复制一份并配置您的环境变量${NC}"
  exit 1
fi

# 启动后端服务
start_backend() {
  echo -e "${YELLOW}启动后端服务...${NC}"
  
  # 检查服务是否已经在运行
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null; then
      echo -e "${YELLOW}后端服务已经在运行，PID: $PID${NC}"
      return 0
    else
      # PID文件存在但进程不存在，删除PID文件
      rm "$PID_FILE"
    fi
  fi
  
  # 检查是否安装了依赖
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装后端依赖...${NC}"
    npm install
  fi
  
  # 启动后端服务
  nohup npm run dev > "$LOG_FILE" 2>&1 &
  BACKEND_PID=$!
  
  # 将PID写入文件
  echo $BACKEND_PID > "$PID_FILE"
  
  echo -e "${GREEN}后端服务已启动，PID: $BACKEND_PID${NC}"
  echo -e "${GREEN}API地址: http://localhost:3001/api${NC}"
  echo -e "${GREEN}日志文件: $LOG_FILE${NC}"
}

# 停止后端服务
stop_backend() {
  echo -e "${YELLOW}停止后端服务...${NC}"
  
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null; then
      kill -TERM $PID
      sleep 2
      
      # 检查进程是否仍在运行
      if ps -p $PID > /dev/null; then
        echo -e "${YELLOW}进程未响应，强制终止...${NC}"
        kill -9 $PID
      fi
      
      echo -e "${GREEN}后端服务已停止${NC}"
    else
      echo -e "${YELLOW}后端服务未运行${NC}"
    fi
    rm "$PID_FILE"
  else
    echo -e "${YELLOW}未找到PID文件，后端服务可能未运行${NC}"
    # 尝试查找可能的后端进程并终止
    PIDS=$(ps aux | grep 'node.*src/index.js' | grep -v grep | awk '{print $2}')
    if [ ! -z "$PIDS" ]; then
      echo -e "${YELLOW}发现后端相关进程，尝试终止...${NC}"
      kill -TERM $PIDS 2>/dev/null
      sleep 2
      kill -9 $PIDS 2>/dev/null
      echo -e "${GREEN}后端相关进程已终止${NC}"
    fi
  fi
}

# 重启后端服务
restart_backend() {
  echo -e "${YELLOW}重启后端服务...${NC}"
  stop_backend
  sleep 2
  start_backend
}

# 显示状态
status_backend() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null; then
      echo -e "${GREEN}后端服务正在运行，PID: $PID${NC}"
      echo -e "${GREEN}API地址: http://localhost:3001/api${NC}"
      echo -e "${GREEN}日志文件: $LOG_FILE${NC}"
      return 0
    else
      echo -e "${YELLOW}PID文件存在但后端服务未运行${NC}"
      rm "$PID_FILE"
      return 1
    fi
  else
    echo -e "${YELLOW}后端服务未运行${NC}"
    return 1
  fi
}

# 查看日志
logs_backend() {
  if [ ! -f "$LOG_FILE" ]; then
    echo -e "${YELLOW}日志文件不存在: $LOG_FILE${NC}"
    return 1
  fi
  
  if [ "$1" == "tail" ]; then
    echo -e "${GREEN}正在显示后端服务的最新日志 (按 Ctrl+C 退出)...${NC}"
    tail -f "$LOG_FILE"
  elif [ "$1" == "last" ]; then
    LINES=${2:-50}
    echo -e "${GREEN}显示后端服务最后 $LINES 行日志...${NC}"
    tail -n $LINES "$LOG_FILE"
  elif [ "$1" == "clear" ]; then
    echo -e "${YELLOW}清空后端服务日志文件...${NC}"
    > "$LOG_FILE"
    echo -e "${GREEN}日志已清空${NC}"
  else
    if [ -z "$1" ]; then
      echo -e "${GREEN}显示后端服务完整日志...${NC}"
      cat "$LOG_FILE"
    else
      # 假设是数字，显示前N行
      echo -e "${GREEN}显示后端服务前 $1 行日志...${NC}"
      head -n $1 "$LOG_FILE"
    fi
  fi
}

# 主函数
case "$1" in
  start)
    start_backend
    ;;
  stop)
    stop_backend
    ;;
  restart)
    restart_backend
    ;;
  status)
    status_backend
    ;;
  logs)
    logs_backend "$2" "$3"
    ;;
  *)
    echo -e "${YELLOW}用法: $0 {start|stop|restart|status|logs [tail|last|clear|<行数>] [<行数>]}${NC}"
    echo -e "${YELLOW}示例:${NC}"
    echo -e "${YELLOW}  $0 logs         # 显示完整日志${NC}"
    echo -e "${YELLOW}  $0 logs tail    # 持续显示最新日志${NC}"
    echo -e "${YELLOW}  $0 logs last    # 显示最后50行日志${NC}"
    echo -e "${YELLOW}  $0 logs last 100 # 显示最后100行日志${NC}"
    echo -e "${YELLOW}  $0 logs 50      # 显示前50行日志${NC}"
    echo -e "${YELLOW}  $0 logs clear   # 清空日志${NC}"
    exit 1
    ;;
esac

exit 0 