# 🔥 SNMP MIB Explorer Pro

> **告别手写 SNMP 配置的痛苦！** 一站式可视化 SNMP 监控配置生成平台

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Go](https://img.shields.io/badge/Go-1.21+-00ADD8?logo=go)](https://golang.org)
[![React](https://img.shields.io/badge/React-18+-61DAFB?logo=react)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?logo=typescript)](https://www.typescriptlang.org)

---

## 🚀 一句话介绍

**上传 MIB 文件 → 可视化选择 OID → 一键生成采集配置** 

支持 SNMP Exporter / Telegraf / Categraf，彻底告别手动翻阅 MIB 文档的噩梦！

---

## ✨ 核心特性

| 特性 | 描述 |
|------|------|
| 🎯 **可视化 OID 选择** | 树形结构展示 MIB 文件，点击即可选择指标 |
| ⚡ **多引擎支持** | SNMP Exporter / Telegraf / Categraf 一网打尽 |
| 📱 **响应式设计** | PC / 平板 / 手机全端适配 |
| 🔧 **智能配置生成** | 自动生成 snmp.yml / prometheus.yml / vmagent.yml |
| 📦 **品牌包管理** | 上传厂商 MIB 包，按品牌分类管理 |
| 🖥️ **设备资产管理** | 统一管理监控目标设备 |

---

## 🎬 工作流程

### SNMP Exporter (8 步流程)
```
选引擎 → 设版本 → 选品牌包 → 细选指标 → snmp.yml → 选采集器 → 选设备 → 采集配置
```

### Telegraf / Categraf (6 步流程)  
```
选引擎 → 设版本 → 选品牌包 → 细选指标 → 选设备 → 生成配置
```

---

## 🛠️ 快速开始

### 环境要求
- Go 1.21+
- Node.js 18+
- net-snmp (用于 MIB 解析)

### 1. 克隆项目
```bash
git clone https://github.com/Oumu33/snmp-mib-ui.git
cd snmp-mib-ui
```

### 2. 启动后端
```bash
cd backend
go mod tidy
go run cmd/main.go
# 后端运行在 http://localhost:8080
```

### 3. 启动前端
```bash
cd frontend
npm install
npm run dev
# 前端运行在 http://localhost:3000
```

### 4. 开始使用
1. 打开浏览器访问 `http://localhost:3000`
2. 上传厂商 MIB 文件包（ZIP 格式）
3. 添加目标设备信息
4. 选择采集引擎，开始配置生成之旅！

---

## 📸 界面预览

### 引擎选择
选择你熟悉的采集引擎开始配置

### OID 树形选择
可视化浏览 MIB 文件，勾选需要的指标

### 配置预览
实时预览生成的配置文件，一键复制

---

## 📂 项目结构

```
snmp-mib-explorer-pro/
├── backend/                 # Go 后端
│   ├── cmd/                 # 入口
│   ├── internal/
│   │   ├── handler/         # HTTP 处理器
│   │   ├── service/         # 业务逻辑
│   │   └── model/           # 数据模型
│   └── mib_root/            # MIB 文件存储
├── frontend/                # React 前端
│   ├── components/          # UI 组件
│   ├── services/            # API 服务
│   └── types/               # TypeScript 类型
└── README.md
```

---

## 🤝 贡献

欢迎提交 Issue 和 PR！

---

## 📄 License

MIT License © 2025

---

<p align="center">
  <b>⭐ 如果这个项目对你有帮助，请给个 Star！⭐</b>
</p>
