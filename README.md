# 🔥 SNMP MIB Explorer Pro

> **告别手写 SNMP 配置的痛苦！** 一站式可视化 SNMP 监控配置生成平台

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)](https://golang.org)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](https://www.docker.com)

---

## 📖 项目简介

SNMP MIB Explorer Pro 是一个专为网络运维工程师设计的可视化 SNMP 监控配置生成工具。通过直观的 Web 界面，你可以轻松上传厂商 MIB 文件、浏览 OID 树形结构、选择需要采集的指标，并一键生成适用于多种采集引擎的配置文件。

### 🎯 解决的痛点

- ❌ **手动翻阅 MIB 文档**：在海量的 MIB 文件中寻找需要的 OID，耗时耗力
- ❌ **配置文件格式复杂**：SNMP Exporter、Telegraf、Categraf 的配置格式各不相同
- ❌ **厂商 MIB 管理混乱**：不同厂商、不同版本的 MIB 文件难以统一管理
- ❌ **设备资产管理困难**：监控目标设备信息分散，难以维护

### ✨ 核心价值

- ✅ **可视化选择**：树形结构展示 MIB 文件，点击即可选择指标
- ✅ **智能生成**：自动生成多种采集引擎的配置文件
- ✅ **品牌管理**：按厂商分类管理 MIB 文件包
- ✅ **设备管理**：统一管理监控目标设备信息
- ✅ **一键部署**：Docker 一键启动，开箱即用

---

## 🚀 核心特性

| 特性 | 描述 |
|------|------|
| 🎯 **可视化 OID 选择** | 树形结构展示 MIB 文件，支持搜索、展开/折叠，点击即可选择指标 |
| ⚡ **多引擎支持** | SNMP Exporter / Telegraf / Categraf 一网打尽 |
| 📱 **响应式设计** | PC / 平板 / 手机全端适配，随时随地管理配置 |
| 🔧 **智能配置生成** | 自动生成 snmp.yml / prometheus.yml / vmagent.yml / telegraf.conf |
| 📦 **品牌包管理** | 上传厂商 MIB 包（ZIP 格式），按品牌分类管理 |
| 🖥️ **设备资产管理** | 统一管理监控目标设备，支持批量导入导出 |
| 🔍 **OID 信息展示** | 显示 OID 名称、类型、访问权限、描述等详细信息 |
| 📋 **配置预览复制** | 实时预览生成的配置文件，一键复制到剪贴板 |

---

## 🎬 工作流程

### SNMP Exporter 配置流程（8 步）

```
1. 选择采集引擎 → 2. 设置 SNMP 版本 → 3. 选择品牌包
→ 4. 细选指标（OID） → 5. 生成 snmp.yml → 6. 选择采集器
→ 7. 选择目标设备 → 8. 生成采集配置
```

### Telegraf / Categraf 配置流程（6 步）

```
1. 选择采集引擎 → 2. 设置 SNMP 版本 → 3. 选择品牌包
→ 4. 细选指标（OID） → 5. 选择目标设备 → 6. 生成配置
```

---

## 🛠️ 快速开始

### 方式一：Docker 一键部署（推荐）

这是最简单快速的部署方式，支持两种模式：

#### 模式 A：直接使用阿里云镜像（推荐国内用户 ⭐）

**适用场景：** 快速部署、生产环境、不想本地构建

**优点：**
- ✅ 无需本地构建，开箱即用
- ✅ 阿里云镜像源，国内访问速度快
- ✅ 镜像经过优化，体积小（后端 26.2MB，前端 54MB）

**步骤：**
```bash
# 1. 克隆项目
git clone https://github.com/Oumu33/snmp-mib-ui.git
cd snmp-mib-ui

# 2. 一键启动（默认使用阿里云镜像）
docker-compose up -d

# 3. 查看服务状态
docker-compose ps

# 4. 访问应用
# 浏览器打开 http://localhost:3000
```

**服务说明：**
- **前端服务**：http://localhost:3000 （Nginx + React）
- **后端服务**：http://localhost:8080 （Go API）
- **数据持久化**：`./data` 目录（MIB 文件和 SQLite 数据库）

**常用命令：**
```bash
# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 重启服务
docker-compose restart

# 更新镜像并重启
docker-compose pull && docker-compose up -d
```

**镜像信息：**
- **后端**: `registry.cn-hangzhou.aliyuncs.com/snmp-mib/snmp-mib-explorer-pro-backend:latest` (26.2MB)
- **前端**: `registry.cn-hangzhou.aliyuncs.com/snmp-mib/snmp-mib-explorer-pro-frontend:latest` (54MB)

#### 模式 B：从本地源码构建镜像

**适用场景：** 需要自定义修改代码、调试或学习源码

**步骤：**
```bash
# 1. 克隆项目
git clone https://github.com/Oumu33/snmp-mib-ui.git
cd snmp-mib-ui

# 2. 修改 docker-compose.yml
# 注释掉 backend 和 frontend 服务中的 image 行
# 取消注释 build 配置部分

# 3. 构建并启动
docker-compose up -d --build

# 4. 访问应用
# 浏览器打开 http://localhost:3000
```

**详细说明：**
1. 打开 `docker-compose.yml`
2. 找到 `backend` 服务，注释掉 `image: registry.cn-hangzhou.aliyuncs.com/...` 行
3. 取消注释 `build:` 配置部分
4. 对 `frontend` 服务重复上述操作
5. 执行 `docker-compose up -d --build` 开始构建

> 💡 **提示**：本地构建需要较长时间，建议使用模式 A（直接使用镜像）

### 方式二：手动部署

适合需要自定义开发或调试的场景。

#### 环境要求
- **Go**: 1.21 或更高版本
- **Node.js**: 18 或更高版本
- **net-snmp**: 用于 MIB 解析（Linux: `apt install snmp` 或 `yum install net-snmp`）

#### 1. 克隆项目
```bash
git clone https://github.com/Oumu33/snmp-mib-ui.git
cd snmp-mib-ui
```

#### 2. 启动后端
```bash
cd backend

# 安装依赖
go mod tidy

# 运行服务
go run main.go

# 后端运行在 http://localhost:8080
```

#### 3. 启动前端
```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 前端运行在 http://localhost:3000
```

### 方式三：使用预构建镜像

如果你已经有 Docker 环境，也可以直接拉取镜像运行。

```bash
# 拉取后端镜像
docker pull registry.cn-hangzhou.aliyuncs.com/snmp-mib/snmp-mib-explorer-pro-backend:latest

# 拉取前端镜像
docker pull registry.cn-hangzhou.aliyuncs.com/snmp-mib/snmp-mib-explorer-pro-frontend:latest

# 创建数据目录
mkdir -p ./data/mibs

# 启动后端
docker run -d \
  --name snmp-backend \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  registry.cn-hangzhou.aliyuncs.com/snmp-mib/snmp-mib-explorer-pro-backend:latest

# 启动前端
docker run -d \
  --name snmp-frontend \
  -p 3000:80 \
  registry.cn-hangzhou.aliyuncs.com/snmp-mib/snmp-mib-explorer-pro-frontend:latest
```

---

## 📖 使用指南

### 1. 上传 MIB 文件包

1. 点击"品牌包管理"标签页
2. 点击"上传品牌包"按钮
3. 选择厂商的 MIB 文件包（ZIP 格式）
4. 输入品牌名称和描述
5. 点击上传

**MIB 文件包要求：**
- 文件格式：ZIP 压缩包
- 内容：包含 `.mib` 或 `.my` 文件
- 建议：按厂商分类打包，如 `HUAWEI.zip`、`CISCO.zip`

### 2. 添加设备信息

1. 点击"设备管理"标签页
2. 点击"添加设备"按钮
3. 填写设备信息：
   - 设备名称
   - IP 地址
   - SNMP 版本（v1/v2c/v3）
   - Community 字符串或 v3 认证信息
4. 保存设备

### 3. 生成配置文件

1. 点击"配置生成器"标签页
2. 选择采集引擎（SNMP Exporter / Telegraf / Categraf）
3. 设置 SNMP 版本参数
4. 选择品牌包
5. 树形浏览 MIB 文件，勾选需要采集的 OID
6. 选择目标设备
7. 点击"生成配置"
8. 预览并复制配置文件

---

## 🐳 Docker 镜像

### 阿里云镜像（推荐国内用户 ⭐）

| 镜像 | 地址 | 大小 | 说明 |
|------|------|------|------|
| 后端 | `registry.cn-hangzhou.aliyuncs.com/snmp-mib/snmp-mib-explorer-pro-backend:latest` | 26.2MB | Go 语言构建，轻量高效 |
| 前端 | `registry.cn-hangzhou.aliyuncs.com/snmp-mib/snmp-mib-explorer-pro-frontend:latest` | 54MB | React + Nginx，静态资源服务 |

**拉取命令：**
```bash
docker pull registry.cn-hangzhou.aliyuncs.com/snmp-mib/snmp-mib-explorer-pro-backend:latest
docker pull registry.cn-hangzhou.aliyuncs.com/snmp-mib/snmp-mib-explorer-pro-frontend:latest
```

### Docker Hub（国际用户）

| 镜像 | 地址 | 大小 | 说明 |
|------|------|------|------|
| 后端 | `evans743/snmp-mib-explorer-pro-backend:latest` | 26.2MB | Go 语言构建，轻量高效 |
| 前端 | `evans743/snmp-mib-explorer-pro-frontend:latest` | 54MB | React + Nginx，静态资源服务 |

**拉取命令：**
```bash
docker pull evans743/snmp-mib-explorer-pro-backend:latest
docker pull evans743/snmp-mib-explorer-pro-frontend:latest
```

---

## 📂 项目结构

```
snmp-mib-explorer-pro/
├── docker-compose.yml          # Docker Compose 配置文件
├── .env.example               # 环境变量示例
├── .gitignore                 # Git 忽略文件
├── README.md                  # 项目文档
├── backend/                   # Go 后端服务
│   ├── Dockerfile             # 后端镜像构建文件
│   ├── go.mod                 # Go 模块依赖
│   ├── go.sum                 # Go 依赖版本锁定
│   ├── main.go                # 后端入口文件
│   ├── internal/              # 内部包
│   │   ├── handler/           # HTTP 请求处理器
│   │   │   ├── handler.go     # 主处理器
│   │   │   └── extended.go    # 扩展处理器
│   │   ├── service/           # 业务逻辑层
│   │   │   ├── generator.go   # 配置生成服务
│   │   │   ├── github.go      # GitHub 集成服务
│   │   │   └── preset.go      # 预设数据服务
│   │   ├── model/             # 数据模型
│   │   │   └── model.go       # 数据结构定义
│   │   └── snmp/              # SNMP 相关
│   │       └── client.go      # SNMP 客户端
│   └── data/                  # 数据目录
│       ├── app.db             # SQLite 数据库
│       └── mibs/              # MIB 文件存储
├── frontend/                  # React 前端应用
│   ├── Dockerfile             # 前端镜像构建文件
│   ├── nginx.conf             # Nginx 配置文件
│   ├── package.json           # Node.js 依赖
│   ├── tsconfig.json          # TypeScript 配置
│   ├── vite.config.ts         # Vite 构建配置
│   ├── index.html             # HTML 入口
│   ├── index.tsx              # React 入口
│   ├── App.tsx                # 主应用组件
│   ├── types.ts               # TypeScript 类型定义
│   ├── components/            # UI 组件
│   │   ├── ConfigGenerator.tsx  # 配置生成器组件
│   │   ├── DeviceManager.tsx    # 设备管理组件
│   │   ├── Icons.tsx            # 图标组件
│   │   ├── MibTreeView.tsx      # MIB 树形视图组件
│   │   └── OidDetails.tsx       # OID 详情组件
│   └── services/              # 服务层
│       ├── api.ts             # API 调用服务
│       ├── githubService.ts   # GitHub 服务
│       ├── localConfigService.ts # 本地配置服务
│       ├── mibParser.ts       # MIB 解析服务
│       └── presetData.ts      # 预设数据
└── data/                      # 数据持久化目录
    ├── app.db                 # SQLite 数据库
    └── mibs/                  # MIB 文件存储
```

---

## 🔧 技术栈

### 后端
- **语言**: Go 1.21+
- **框架**: Gin Web Framework
- **数据库**: SQLite
- **MIB 解析**: net-snmp
- **容器**: Docker

### 前端
- **框架**: React 18+
- **语言**: TypeScript 5+
- **构建工具**: Vite
- **UI**: Bootstrap 5 + Material Design
- **HTTP 客户端**: Fetch API

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出建议！

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

### 代码规范

- **后端**: 遵循 [Go Code Review Comments](https://github.com/golang/go/wiki/CodeReviewComments)
- **前端**: 遵循 [React 官方文档](https://react.dev/learn) 最佳实践
- **提交信息**: 遵循 [Conventional Commits](https://www.conventionalcommits.org/)

---

## 📄 License

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

---

## 🙏 致谢

感谢以下开源项目：

- [Gin](https://github.com/gin-gonic/gin) - Go Web 框架
- [React](https://react.dev/) - UI 框架
- [Vite](https://vitejs.dev/) - 前端构建工具
- [Bootstrap](https://getbootstrap.com/) - UI 组件库
- [SNMP Exporter](https://github.com/prometheus/snmp_exporter) - Prometheus SNMP 采集器

---

## 📮 联系方式

- **GitHub Issues**: [提交问题](https://github.com/Oumu33/snmp-mib-ui/issues)
- **Email**: oumu33@github.com

---

<p align="center">
  <b>⭐ 如果这个项目对你有帮助，请给个 Star！⭐</b>
</p>

<p align="center">
  Made with ❤️ by Oumu33
</p>