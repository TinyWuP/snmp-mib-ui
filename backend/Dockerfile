# ===================================
# SNMP MIB Explorer Pro - Backend
# Multi-stage build with China proxy
# ===================================

# Stage 1: Build
FROM golang:1.23-alpine AS builder

# 阿里云 Alpine 镜像加速
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装构建依赖
RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Go 代理加速
ENV GOPROXY=https://goproxy.cn,direct
ENV CGO_ENABLED=1

# 先复制依赖文件，利用缓存
COPY go.mod go.sum ./
RUN go mod download

# 复制源码并构建
COPY . .
RUN go build -ldflags="-s -w" -o server ./main.go

# Stage 2: Runtime
FROM alpine:3.19

# 阿里云 Alpine 镜像
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 安装运行时依赖 (net-snmp 用于 MIB 解析)
RUN apk add --no-cache ca-certificates tzdata net-snmp net-snmp-tools

# 设置时区
ENV TZ=Asia/Shanghai

WORKDIR /app

# 从构建阶段复制二进制
COPY --from=builder /app/server .

# 创建数据目录
RUN mkdir -p /app/data/mibs

# 暴露端口
EXPOSE 8080

# 启动
CMD ["./server"]
