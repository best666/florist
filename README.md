# 养花人 monorepo

养花人是一个面向养花新手与绿植爱好者的治愈系小程序项目，采用前后端一体化 monorepo 组织方式，先保证工程边界清晰，再逐步补齐业务实现。

## 技术决策

- 包管理：pnpm workspace
- 前端：UniApp + Unibest + TypeScript + UnoCSS，目标平台为微信小程序与 H5
- 后端：Node.js + NestJS，采用轻量单体模块化设计
- 数据：前端本地 SQLite，云端 MySQL，统一通过同步协议衔接
- 共享层：抽离前后端通用类型、枚举与同步契约，避免重复定义

## 目录总览

```text
.
├── apps
│   ├── client            # UniApp / Unibest 前端应用
│   └── server            # NestJS 后端应用
├── docs                  # 架构与开发文档
├── packages
│   ├── config            # 共享配置说明
│   └── contracts         # 前后端共享类型与同步协议
└── .github/skills        # 项目级技能说明
```

## 当前阶段

当前只完成工程骨架与规范落盘，目的是让后续初始化脚手架、接数据库、写模块时不再反复调整目录。

## 下一步建议

1. 在 apps/client 中正式接入 Unibest 脚手架。
2. 在 apps/server 中正式接入 NestJS CLI 生成的运行时配置。
3. 明确本地 SQLite 与云端 MySQL 的同步策略、冲突解决与回滚模型。
