# ===================================
# SNMP MIB Explorer Pro - Frontend
# Multi-stage build with China proxy
# ===================================

# Stage 1: Build
FROM node:20-alpine AS builder

# 阿里云 Alpine 镜像
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

WORKDIR /app

# npm 淘宝镜像加速
RUN npm config set registry https://registry.npmmirror.com

# 先复制依赖文件，利用缓存
COPY package*.json ./
RUN npm ci && \
    npm cache clean --force

# 复制源码并构建
COPY . .
RUN npm run build

# Stage 2: Nginx 运行
FROM nginx:alpine

# 阿里云 Alpine 镜像
RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 Nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
