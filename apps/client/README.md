# client 应用说明

这里是养花人前端应用，基于 UniApp 最新版与 Unibest 工程能力搭建。

## 当前约束

- 仅使用 TypeScript，禁止 any。
- 仅使用 UnoCSS 原子类，不新增 CSS、SCSS、LESS 文件。
- 顶层目录遵循 src/api、src/components、src/hooks、src/interfaces、src/pages、src/store、src/utils。
- 微信小程序与 H5 双端差异统一通过条件编译和平台适配函数处理。
- 本地缓存默认走 AES 加密持久化封装。

## 开发命令

- pnpm dev:h5
- pnpm dev:mp-weixin
- pnpm build:h5
- pnpm build:mp-weixin
