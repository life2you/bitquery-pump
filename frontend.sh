#!/bin/bash

# Bitquery Pump 前端服务脚本
# 用于管理前端服务的启动、重启和停止

# 定义颜色
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 前端目录
FRONTEND_DIR="src/client"
# PID文件路径
PID_FILE="/tmp/bitquery-pump-frontend.pid"
# 日志文件路径
LOG_FILE="src/frontend.log"

# 打印标题
echo -e "${BLUE}====================================${NC}"
echo -e "${BLUE}    Bitquery Pump 前端服务脚本     ${NC}"
echo -e "${BLUE}====================================${NC}"

# 检查前端目录是否存在
if [ ! -d "$FRONTEND_DIR" ]; then
  echo -e "${RED}错误: 前端目录不存在! ($FRONTEND_DIR)${NC}"
  exit 1
fi

# 启动前端服务
start_frontend() {
  echo -e "${YELLOW}启动前端服务...${NC}"
  
  # 检查服务是否已经在运行
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null; then
      echo -e "${YELLOW}前端服务已经在运行，PID: $PID${NC}"
      return 0
    else
      # PID文件存在但进程不存在，删除PID文件
      rm "$PID_FILE"
    fi
  fi
  
  # 进入前端目录
  cd "$FRONTEND_DIR"
  
  # 检查是否安装了依赖
  if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}安装前端依赖...${NC}"
    npm install
  fi
  
  # 创建日志目录（如果不存在）
  mkdir -p $(dirname "../$LOG_FILE")
  
  # 启动前端服务
  nohup npm start > "../$LOG_FILE" 2>&1 &
  FRONTEND_PID=$!
  
  # 将PID写入文件
  echo $FRONTEND_PID > "$PID_FILE"
  
  # 返回项目根目录
  cd ../..
  
  echo -e "${GREEN}前端服务已启动，PID: $FRONTEND_PID${NC}"
  echo -e "${GREEN}访问地址: http://localhost:3000${NC}"
  echo -e "${GREEN}日志文件: $LOG_FILE${NC}"
}

# 停止前端服务
stop_frontend() {
  echo -e "${YELLOW}停止前端服务...${NC}"
  
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
      
      echo -e "${GREEN}前端服务已停止${NC}"
    else
      echo -e "${YELLOW}前端服务未运行${NC}"
    fi
    rm "$PID_FILE"
  else
    echo -e "${YELLOW}未找到PID文件，前端服务可能未运行${NC}"
    # 尝试查找可能的前端进程并终止
    PIDS=$(ps aux | grep 'react-scripts start' | grep -v grep | awk '{print $2}')
    if [ ! -z "$PIDS" ]; then
      echo -e "${YELLOW}发现前端相关进程，尝试终止...${NC}"
      kill -TERM $PIDS 2>/dev/null
      sleep 2
      kill -9 $PIDS 2>/dev/null
      echo -e "${GREEN}前端相关进程已终止${NC}"
    fi
  fi
}

# 重启前端服务
restart_frontend() {
  echo -e "${YELLOW}重启前端服务...${NC}"
  stop_frontend
  sleep 2
  start_frontend
}

# 显示状态
status_frontend() {
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p $PID > /dev/null; then
      echo -e "${GREEN}前端服务正在运行，PID: $PID${NC}"
      echo -e "${GREEN}访问地址: http://localhost:3000${NC}"
      echo -e "${GREEN}日志文件: $LOG_FILE${NC}"
      return 0
    else
      echo -e "${YELLOW}PID文件存在但前端服务未运行${NC}"
      rm "$PID_FILE"
      return 1
    fi
  else
    echo -e "${YELLOW}前端服务未运行${NC}"
    return 1
  fi
}

# 查看日志
logs_frontend() {
  if [ ! -f "$LOG_FILE" ]; then
    echo -e "${YELLOW}日志文件不存在: $LOG_FILE${NC}"
    return 1
  fi
  
  if [ "$1" == "tail" ]; then
    echo -e "${GREEN}正在显示前端服务的最新日志 (按 Ctrl+C 退出)...${NC}"
    tail -f "$LOG_FILE"
  elif [ "$1" == "last" ]; then
    LINES=${2:-50}
    echo -e "${GREEN}显示前端服务最后 $LINES 行日志...${NC}"
    tail -n $LINES "$LOG_FILE"
  elif [ "$1" == "clear" ]; then
    echo -e "${YELLOW}清空前端服务日志文件...${NC}"
    > "$LOG_FILE"
    echo -e "${GREEN}日志已清空${NC}"
  else
    if [ -z "$1" ]; then
      echo -e "${GREEN}显示前端服务完整日志...${NC}"
      cat "$LOG_FILE"
    else
      # 假设是数字，显示前N行
      echo -e "${GREEN}显示前端服务前 $1 行日志...${NC}"
      head -n $1 "$LOG_FILE"
    fi
  fi
}

# 主函数
case "$1" in
  start)
    start_frontend
    ;;
  stop)
    stop_frontend
    ;;
  restart)
    restart_frontend
    ;;
  status)
    status_frontend
    ;;
  logs)
    logs_frontend "$2" "$3"
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