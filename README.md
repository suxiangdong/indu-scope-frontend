# indu-scope-frontend

本仓库统一承载面向用户的前端项目；管理后台继续作为同级的独立仓库 `indu-scope-manager` 维护。

```text
indu-scope-frontend/
├── miniapp/    # Taro 4 微信小程序（当前项目）
└── web/        # 未来 Web 端，按需要创建
```

## 当前项目

进入小程序目录后执行命令：

```bash
cd miniapp
npm install
npm run dev:h5       # H5 页面开发
npm run build:h5     # 构建 H5
npm run dev:weapp    # 微信小程序开发构建
npm run build:weapp  # 构建微信小程序
npm run typecheck    # TypeScript 检查
```

每个前端子项目应拥有独立的 `package.json`、依赖锁文件、构建配置和 `dist/` 目录，避免未来 Web 端与小程序的依赖和产物相互覆盖。

小程序的完整说明（环境变量、AppID、微信开发者工具、本地接口域名和登录流程）见 [`miniapp/README.md`](miniapp/README.md)。后端、数据库、Redis 和跨电脑启动顺序见后端仓库的
[`docs/development-onboarding.md`](https://github.com/suxiangdong/indu-scope-backend/blob/main/docs/development-onboarding.md)。
