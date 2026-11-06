# 源仓微信小程序

当前目录是 `indu-scope-frontend/miniapp`，只负责源仓微信小程序，基于 Taro 4.3.2、React、TypeScript 开发，编译器使用 Vite。未来 Web 端放在同仓库的 `web` 目录，不与小程序共用依赖或构建产物。

## 环境要求

- Node.js 22+
- npm 10+
- 微信开发者工具（需要预览或真机调试时）

本项目可以直接使用 npm，不要求安装 pnpm。安装依赖：

```bash
cd indu-scope-frontend/miniapp
npm install
```

## 环境变量和 AppID

当前小程序 AppID 是 `wx550ed33a6840ccec`，已经配置在 `project.config.json` 和 `.env.*` 文件中。

开发环境文件 `.env.development`：

```dotenv
TARO_APP_ID=wx550ed33a6840ccec
TARO_APP_API_BASE_URL=http://127.0.0.1:8000
```

生产环境必须改成手机可访问的 HTTPS 后端地址，并在微信公众平台配置 request 合法域名：

```dotenv
TARO_APP_API_BASE_URL=https://生产环境后端域名
```

不要把微信 AppSecret、OSS AccessKey 或其他后端密钥写入小程序项目；这些信息只配置在后端。

## 页面开发

H5 热更新适合日常页面开发：

```bash
npm run dev:h5
```

然后访问 `http://localhost:10086/`。常用命令：

```bash
npm run dev:h5           # H5 开发和热更新
npm run build:h5         # H5 生产构建
npm run dev:weapp        # 微信小程序开发构建和监听
npm run build:weapp      # 微信小程序开发构建
npm run build:weapp:prod # 微信小程序生产构建
npm run typecheck        # TypeScript 检查
```

微信小程序构建产物位于 `dist/`。切换 H5 和微信构建前，先停止当前 watch 进程，避免两个平台同时写入同一个 `dist/` 目录。

## 微信开发者工具

1. 执行 `npm run build:weapp` 或 `npm run dev:weapp`。
2. 用微信开发者工具导入本目录；`project.config.json` 已将 `miniprogramRoot` 配置为 `dist/`。
3. 本机调试后端时，在“详情 → 本地设置”勾选“不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书”。
4. 手机预览不能访问电脑的 `127.0.0.1`，必须使用手机可访问的 HTTPS 域名，并重新执行生产构建。

如果出现：

- `request:fail url not in domain list`：微信域名校验未通过。本机开发者工具可以关闭校验，手机预览必须配置合法域名。
- `ERR_CONNECTION_REFUSED`：后端没有监听 8000、地址配置错误，或真机无法访问本机地址。
- `未配置 TARO_APP_API_BASE_URL`：检查 `.env.development`/`.env.production`，修改后必须重新构建。

## 登录和认证流程

小程序启动时不静默调用 `wx.login`。用户点击手机号快速登录按钮并完成授权后，前端才调用 `wx.login` 获取 `login_code`，同时取得手机号组件返回的一次性 `phone_code`，将两个 code 一起提交到后端 `POST /api/v1/auth/wechat/phone-login`。

新用户登录后 `role=0`，从“我的 → 去认证/完善资料”选择一次采购方或供货方；供货方只能提交企业认证，采购方可以提交个人或企业认证。认证审核中的资料不能再次修改，被驳回后才可重新提交。

当前主要页面：

- 首页：`pages/index/index`
- 登录：`pages/login/index`
- 我的：`pages/profile/index`
- 完善资料/实名认证：`pages/verification/index`
- 发布产品：`pages/products/create/index`

后端、数据库、Redis、管理后台和跨电脑启动顺序见后端仓库的 [`docs/development-onboarding.md`](https://github.com/suxiangdong/indu-scope-backend/blob/main/docs/development-onboarding.md)。

## 目录约定

```text
src/pages/       页面
src/services/    API 调用
src/config/      编译期配置和 API 地址
config/          Taro + Vite 配置
dist/            构建产物（不提交）
```
