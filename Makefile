# ===================================
# SNMP MIB Explorer Pro - Makefile
# ===================================
#
# 常用命令：
#   make build      - 构建镜像
#   make up         - 启动服务
#   make down       - 停止服务
#   make restart    - 重启服务
#   make logs       - 查看日志
#   make test       - 运行测试
#   make clean      - 清理镜像和容器
#   make help       - 显示帮助信息
#
# ===================================

.PHONY: help build up down restart logs test clean

# 默认目标
.DEFAULT_GOAL := help

# 颜色定义
BLUE  := \033[0;34m
GREEN := \033[0;32m
YELLOW:= \033[0;33m
NC   := \033[0m # No Color

help: ## 显示帮助信息
	@echo "$(BLUE)SNMP MIB Explorer Pro - 常用命令$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-15s$(NC) %s\n", $$1, $$2}'
	@echo ""

build: ## 构建所有镜像
	@echo "$(BLUE)构建 Docker 镜像...$(NC)"
	docker-compose build
	@echo "$(GREEN)构建完成！$(NC)"

build-backend: ## 仅构建后端镜像
	@echo "$(BLUE)构建后端镜像...$(NC)"
	docker-compose build backend
	@echo "$(GREEN)后端镜像构建完成！$(NC)"

build-frontend: ## 仅构建前端镜像
	@echo "$(BLUE)构建前端镜像...$(NC)"
	docker-compose build frontend
	@echo "$(GREEN)前端镜像构建完成！$(NC)"

up: ## 启动所有服务
	@echo "$(BLUE)启动服务...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)服务已启动！$(NC)"
	@echo "访问地址: $(YELLOW)http://localhost:3000$(NC)"

down: ## 停止所有服务
	@echo "$(BLUE)停止服务...$(NC)"
	docker-compose down
	@echo "$(GREEN)服务已停止！$(NC)"

restart: ## 重启所有服务
	@echo "$(BLUE)重启服务...$(NC)"
	docker-compose restart
	@echo "$(GREEN)服务已重启！$(NC)"

logs: ## 查看所有服务日志
	docker-compose logs -f

logs-backend: ## 查看后端日志
	docker-compose logs -f backend

logs-frontend: ## 查看前端日志
	docker-compose logs -f frontend

ps: ## 查看服务状态
	docker-compose ps

test: ## 运行所有测试
	@echo "$(BLUE)运行测试...$(NC)"
	@echo "$(YELLOW)后端测试:$(NC)"
	cd backend && go test -v ./...
	@echo "$(YELLOW)前端测试:$(NC)"
	cd frontend && npm test
	@echo "$(GREEN)测试完成！$(NC)"

test-backend: ## 运行后端测试
	@echo "$(BLUE)运行后端测试...$(NC)"
	cd backend && go test -v ./...

test-frontend: ## 运行前端测试
	@echo "$(BLUE)运行前端测试...$(NC)"
	cd frontend && npm test

clean: ## 清理镜像和容器
	@echo "$(YELLOW)警告: 这将删除所有容器和镜像！$(NC)"
	@read -p "确认继续? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)清理中...$(NC)"; \
		docker-compose down -v --rmi all; \
		docker system prune -f; \
		echo "$(GREEN)清理完成！$(NC)"; \
	else \
		echo "$(YELLOW)已取消$(NC)"; \
	fi

clean-containers: ## 仅清理容器
	@echo "$(BLUE)清理容器...$(NC)"
	docker-compose down -v
	@echo "$(GREEN)容器已清理！$(NC)"

clean-images: ## 仅清理镜像
	@echo "$(YELLOW)警告: 这将删除所有镜像！$(NC)"
	@read -p "确认继续? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		echo "$(BLUE)清理镜像...$(NC)"; \
		docker-compose down --rmi all; \
		echo "$(GREEN)镜像已清理！$(NC)"; \
	else \
		echo "$(YELLOW)已取消$(NC)"; \
	fi

pull: ## 拉取最新镜像
	@echo "$(BLUE)拉取最新镜像...$(NC)"
	docker-compose pull
	@echo "$(GREEN)镜像已更新！$(NC)"

update: ## 更新并重启服务
	@echo "$(BLUE)更新服务...$(NC)"
	docker-compose pull
	docker-compose up -d
	@echo "$(GREEN)服务已更新！$(NC)"

dev: ## 开发模式（本地运行）
	@echo "$(BLUE)开发模式...$(NC)"
	@echo "$(YELLOW)后端:$(NC) cd backend && go run main.go"
	@echo "$(YELLOW)前端:$(NC) cd frontend && npm run dev"
	@echo "$(YELLOW)API 地址: http://localhost:8080$(NC)"
	@echo "$(YELLOW)前端地址: http://localhost:5173$(NC)"

install: ## 安装依赖
	@echo "$(BLUE)安装依赖...$(NC)"
	@echo "$(YELLOW)后端:$(NC)"
	cd backend && go mod download
	@echo "$(YELLOW)前端:$(NC)"
	cd frontend && npm install
	@echo "$(GREEN)依赖安装完成！$(NC)"

lint: ## 代码检查
	@echo "$(BLUE)代码检查...$(NC)"
	@echo "$(YELLOW)后端:$(NC)"
	cd backend && go fmt ./...
	@echo "$(YELLOW)前端:$(NC)"
	cd frontend && npm run lint
	@echo "$(GREEN)代码检查完成！$(NC)"

fmt: ## 代码格式化
	@echo "$(BLUE)格式化代码...$(NC)"
	@echo "$(YELLOW)后端:$(NC)"
	cd backend && go fmt ./...
	@echo "$(YELLOW)前端:$(NC)"
	cd frontend && npm run format
	@echo "$(GREEN)代码格式化完成！$(NC)"

info: ## 显示项目信息
	@echo "$(BLUE)项目信息:$(NC)"
	@echo "  项目名称: SNMP MIB Explorer Pro"
	@echo "  Git 仓库: https://github.com/Oumu33/snmp-mib-ui"
	@echo "  后端端口: 8080"
	@echo "  前端端口: 3000"
	@echo "  数据目录: ./data"
	@echo ""
	@echo "$(BLUE)Docker 信息:$(NC)"
	@docker-compose version
	@echo ""
	@echo "$(BLUE)服务状态:$(NC)"
	@docker-compose ps