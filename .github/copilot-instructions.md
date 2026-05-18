# 养花人 monorepo 开发规范

适用于当前仓库的 UniApp 小程序 + H5 + NestJS + TypeScript 全栈开发。目标不是生成“看起来完整”的代码，而是生成能直接运行、能持续维护、能沿着现有工程边界演进的代码。

## 适用范围

- 前端：UniApp + Unibest + Vue 3 + Pinia + UnoCSS
- 平台：微信小程序、H5
- 后端：NestJS
- 包管理：pnpm workspace
- 共享层：packages/contracts

## 当前仓库真实结构

- apps/client：前端业务应用，包名为 `@florist/client`
- apps/server：后端服务，包名为 `@florist/server`
- packages/contracts：前后端共享类型、枚举、同步协议
- packages/config：共享配置占位目录
- docs：架构说明与工程文档

生成代码时，必须优先遵循当前仓库真实结构，不要按其他模板仓库的目录命名或脚本约定推断实现。

## 总体原则

1. 优先选择简单、稳定、可维护的实现，不写炫技代码。
2. 先复用现有模式，再新增抽象；新增抽象必须解决已经出现的重复问题。
3. 任何输出都必须可运行，不允许伪代码、半成品、占位 TODO。
4. 页面、组件、hook、store、service 都必须职责清晰，禁止“万能文件”。
5. 改动必须贴合现有工程边界，不要在仓库里平行复制第二套架构。
6. 优先修根因，不做表面补丁；但不要顺手修与当前任务无关的问题。

## 当前仓库落地规则

### 运行与验证命令

默认从仓库根目录执行命令。

- 前端类型检查：`pnpm --filter @florist/client typecheck`
- 前端 H5 开发：`pnpm --filter @florist/client dev:h5`
- 前端微信小程序开发：`pnpm --filter @florist/client dev:mp-weixin`
- 前端 H5 构建：`pnpm --filter @florist/client build:h5`
- 前端微信小程序构建：`pnpm --filter @florist/client build:mp-weixin`
- 后端开发：`pnpm --filter @florist/server start:dev`
- 后端构建：`pnpm --filter @florist/server build`
- 全仓类型检查：`pnpm typecheck`

### 前端真实目录职责

apps/client/src 当前以以下目录为主边界：

- api：业务接口入口，页面不能直接写请求地址
- components：可复用 UI 组件或局部交互单元
- hooks：副作用逻辑、状态机、平台或能力复用
- interfaces：通用类型、枚举、HTTP 类型、平台类型
- pages：页面入口与业务编排层
- store：Pinia 共享状态
- utils：纯函数、平台适配、request、storage、env 等基础工具

禁止新增与这些边界平行、职责重复的目录，除非已有明确的新模块边界。

### 当前前端基础能力

当前仓库前端已经有明确基础设施，新增代码必须优先复用而不是复制。

- 全局请求封装：`apps/client/src/utils/request.ts`
- AES 加密持久化：`apps/client/src/utils/storage.ts`
- 平台适配：`apps/client/src/utils/platform.ts`
- 环境变量工具：`apps/client/src/utils/env.ts`
- 全局类型出口：`apps/client/src/interfaces/index.ts`
- Pinia 入口：`apps/client/src/store/index.ts`

如果需求涉及请求、缓存、平台差异、全局类型或状态持久化，优先扩展这些文件或它们的消费层，不要重新造一个 `http`、`cache`、`platform`、`types` 平行实现。

### 前端配置文件边界

以下文件是前端工程的真实配置入口，修改它们时必须保持来源单一，不要引入重复配置。

- `apps/client/pages.config.ts`：页面路由与全局页面配置
- `apps/client/manifest.config.ts`：小程序与 H5 manifest 配置
- `apps/client/vite.config.ts`：构建、代理、压缩与混淆配置
- `apps/client/uno.config.ts`：UnoCSS 主题、快捷类、全局变量
- `apps/client/env/.env*`：环境变量

### 生成或半生成文件边界

以下内容若出现，默认视为生成产物或工具输出，不要手改，优先修改其上游配置。

- `apps/client/src/interfaces/auto-import.d.ts`
- `apps/client/src/interfaces/uni-pages.d.ts`
- `apps/client/dist/**`

## TypeScript 规则

1. 严格遵守 TypeScript strict，禁止 any。
2. 所有接口入参、出参、视图模型、状态结构都必须使用明确的 interface 或 type。
3. 基础枚举统一放在 `interfaces` 或 `packages/contracts`，禁止散落在页面文件中。
4. 纯类型使用 `import type`。
5. 在 `exactOptionalPropertyTypes` 打开时，优先省略字段，而不是显式传 `undefined`。
6. 不要为了“省事”把后端 DTO、前端 ViewModel、缓存结构混成一个类型。

## UnoCSS 与样式规则

1. 默认只使用 UnoCSS 原子类和 shortcuts。
2. 能用 UnoCSS 表达的布局、间距、颜色、圆角、阴影、字体，不再新增 style 块。
3. 禁止新增 CSS、SCSS、LESS 独立样式文件，除非是下面三类例外：
   - 伪元素或复杂 keyframes 无法用原子类清晰表达
   - 第三方组件深度覆盖确实需要样式选择器
   - 原子类会显著损害可读性的复杂结构样式
4. 若新增 style，必须在回答中说明原因。
5. 新页面必须优先复用 `uno.config.ts` 中已有主题色、快捷类和全局变量。

## uni-app 跨端开发规则

1. 优先使用 `uni` 标准 API，禁止默认使用 `wx` 等平台专属 API。
2. 平台差异优先通过 `#ifdef` / `#ifndef` 条件编译收敛到平台适配层、hook 或组件内部，不要散落在业务页面。
3. 小程序和逻辑层代码禁止直接依赖 `window`、`document`、DOM 查询等 H5 专属能力。
4. 若必须使用 H5 浏览器能力，必须先封装到平台工具里，再由页面消费。
5. 新增上传、定位、分享、授权、支付、地图等能力时，必须同时考虑 H5 与小程序两端行为。
6. 条件编译代码前后都必须保证语法独立成立，避免导入、对象字面量、模板结构在单端编译时出错。

## Vue 页面与组件规则

### 页面

1. 页面负责路由入口、数据调度、业务编排，不承载大量可复用细节。
2. 页面里不要直接写请求地址、复杂数据适配、平台兼容细节，应下沉到 api、utils、hooks。
3. 当前页独有、没有形成复用状态机的状态和事件，优先留在页面，不要机械抽成 hook。
4. 超长页面要主动拆分：重复卡片、筛选栏、弹层、上传区、状态块都应优先组件化。

### 组件

1. 组件必须单一职责，父组件负责编排，子组件负责展示和局部交互。
2. 组件之间通过 props 和 emits 通信，禁止子组件直接改父级状态。
3. props 必须有清晰类型；事件命名要表达业务意图。
4. 对于只出现一次、结构很短、强依赖单页面状态的局部块，不要过早组件化。

### 文件内部组织

前端单文件组件优先保持以下顺序：

1. `script setup`
2. `template`
3. `style`，且仅在确有必要时出现

模板表达式必须保持简洁，复杂判断放入 computed 或具名函数，不要堆叠长三元和匿名函数。

## hooks 规则

1. 新代码优先 composables/hooks，不使用 mixin。
2. hook 用于复用副作用逻辑与状态机，例如分页、上传、权限、滚动、平台能力。
3. 纯算法、格式化、轻量数据转换放 utils，不放 hook。
4. hook 对外暴露最少且稳定的状态，优先返回 `loading`、`error`、`data`、`run` 或具名动作。
5. 若页面需要从一个 hook 中一次性解构十几个状态和动作，优先重新评估这个 hook 是否成立。
6. hook 内部必须处理异常，不要把失败路径完全留给页面兜底。

## Pinia 规则

1. 只有跨页面共享、需要持久化或需要集中管理的状态才进入 store。
2. 页面局部弹窗开关、临时输入值、单页筛选条件默认不进 store。
3. 一个 store 只聚焦一个业务域，不要做“全局大杂烩 store”。
4. 组件中解构 store 状态时必须使用 `storeToRefs`。
5. action 命名必须表达业务动作，例如 `fetchXxx`、`setXxx`、`removeXxx`、`markXxx`。
6. 持久化状态必须谨慎，避免把超大列表、临时态、不可序列化对象写入持久层。

## 前后端契约规则

1. 只要是前后端共享的实体、枚举、同步协议，优先放入 `packages/contracts`。
2. 前端本地页面专属类型放在 `apps/client/src/interfaces`；只有确定为跨端共享时才上提到 contracts。
3. 后端返回结构要稳定、明确，避免把复杂组装和字段兜底推给前端。
4. 涉及同步、分页、状态枚举、植物档案等核心模型时，先检查 `packages/contracts` 是否已有定义。

## NestJS 规则

1. Controller 保持薄，只负责参数读取、权限入口、调用 service、返回结果。
2. DTO 使用 class 承载写接口和查询接口的运行时校验，不用 interface 代替 DTO。
3. Service 承载业务编排、聚合和映射，不把复杂组装丢给 controller 或前端。
4. Module 负责边界和依赖注册，保持模块职责单一。
5. 新增写接口时，必须同步定义 DTO、service、controller 和返回结构。
6. 当前后端是轻量单体模块化，不要过早引入微服务式拆分。

## 安全与数据规则

1. 前端禁止暴露 AI 密钥、第三方服务密钥、数据库凭证。
2. 本地敏感数据默认走 AES 加密持久化，不要直接裸存。
3. 涉及隐私权限能力时，必须补齐授权前置说明和失败兜底。
4. 设计数据逻辑时，要考虑本地持久化、云端备份、回滚恢复和同步冲突处理。
5. 涉及 SQLite 本地数据与 MySQL 云端同步时，优先补齐契约和版本信息，再写页面逻辑。

## 代码生成与维护规则

### 生成前

1. 先判断需求属于页面、组件、hook、store、api、contracts 还是后端模块。
2. 先确认是否应扩展现有模块，而不是新建平行实现。
3. 先划清边界：哪些属于页面编排，哪些属于组件展示，哪些属于副作用 hook，哪些属于共享状态。

### 生成中

1. 直接输出可运行代码，不输出示意性代码。
2. 自动补齐 loading、empty、error、retry、异常路径和必要校验。
3. 自动补齐双端差异处理和条件编译。
4. 自动补齐类型、接口、调用链路，不能只改视图层。
5. 完善注释，解释“为什么”，重点覆盖边界、兼容性和容易误解的设计取舍。
6. 对代码进行“组件内自带该功能所需逻辑”的封装，而不是不做封装或过度封装。
7. 生成后主动检查是否引入了重复代码、无用代码、命名不统一、设计不清晰等问题。

### 生成后

1. 检查是否引入了重复工具、重复类型、重复请求封装。
2. 检查是否留下了无引用代码、无入口页面、废弃逻辑。
3. 检查前后端字段是否一致，命名是否统一。
4. 检查页面是否仍保持“页面编排 + 组件展示 + 必要 hook 状态机”的清晰边界。

## 可维护性红线

1. 不要把平台差异散落到每个页面里。
2. 不要把多个业务域塞进一个 store。
3. 不要在组件里写强耦合业务编排。
4. 不要在 controller 写业务流程。
5. 不要重新造第二套 request、storage、platform、types 基础设施。
6. 不要生成伪代码、占位 TODO、半成品接口。
7. 不要手改生成文件或构建产物。
8. 不要为了“抽象”而抽象，导致调用链更长、理解成本更高。

## 默认验证清单

### 前端改动至少检查

1. 类型是否通过。
2. 双端条件编译是否成立。
3. loading、empty、error、retry 是否完整。
4. 是否复用了现有 request、storage、platform、interfaces。
5. 是否仍只使用 UnoCSS 原子类。

推荐命令：

- `pnpm --filter @florist/client typecheck`
- 若涉及构建、路由、环境变量或平台差异，再执行 `pnpm --filter @florist/client build:h5`
- 若涉及小程序专属逻辑，再执行 `pnpm --filter @florist/client build:mp-weixin`

### 后端改动至少检查

1. DTO、controller、service、module 是否全链路一致。
2. 返回结构是否稳定。
3. 异常路径是否完整。

推荐命令：

- `pnpm --filter @florist/server build`

## 输出风格要求

1. 说明以“设计原因 + 实现边界 + 关键注意点”为主。
2. 如果需求本身会显著伤害可维护性，应主动收紧边界并说明原因。
3. 如果已有现成模式可复用，优先复用，不复制一份相似代码。
4. 最终输出应帮助团队继续开发，而不是只满足当前一次性改动。
