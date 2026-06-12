# 钓点分享

「钓点分享」是一个钓鱼地点分享 MVP，包含 Expo SDK 51 + Expo Router 前端，以及 NestJS + MySQL + Redis 后端。

## 项目结构

- `fishing-spot-app`: React Native + Expo 前端，兼容 Web、Android、iOS。
- `fishing-spot-api`: NestJS 后端，提供登录、钓点、分享、点赞、评论、草稿、上传、AI 文案等接口。

## 本地服务

后端默认读取 `fishing-spot-api/.env`：

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=fishing
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
APP_PUBLIC_URL=http://localhost:3000
DASHSCOPE_API_KEY=sk-your-dashscope-api-key
AI_MODEL=qwen-vl-max
```

Web 高德地图 Key 可在前端启动前设置：

```bash
export EXPO_PUBLIC_AMAP_WEB_KEY=你的高德Web服务Key
```

未配置高德 Key 时，Web 端会显示开发预览地图，不会白屏；配置后自动加载高德 JS API。Android/iOS 端当前使用 `react-native-maps` 地图层，后续接入高德原生 SDK 时可以继续复用 `components/MapSurface.native.tsx` 的接口。

## 启动

```bash
cd fishing-spot-api
npm install
npm run start
```

```bash
cd fishing-spot-app
npm install
npm run web
```

如果 macOS 启动 Expo Web 遇到 `EMFILE: too many open files, watch`，可以先使用静态预览：

```bash
npx expo export --platform web --output-dir dist-web
npx serve dist-web -l 19006
```

## 测试账号

后端首启且钓点表为空时会自动写入示例数据：

- 手机号：`18800000000`
- 密码：`123456`

## 关键接口

- `POST /api/v1/auth/register`: 注册
- `POST /api/v1/auth/login`: 登录
- `GET /api/v1/auth/me`: 当前用户
- `GET /api/v1/spots`: 地图范围内钓点
- `GET /api/v1/spots/nearby`: 附近钓点
- `GET /api/v1/spots/:id`: 钓点详情
- `GET /api/v1/spots/:spotId/posts`: 钓点分享列表
- `POST /api/v1/posts`: 发布钓点分享
- `POST /api/v1/posts/:postId/like`: 点赞
- `DELETE /api/v1/posts/:postId/like`: 取消点赞
- `GET /api/v1/posts/:postId/comments`: 评论列表
- `POST /api/v1/posts/:postId/comments`: 发布评论
- `POST /api/v1/upload/images`: 上传图片
- `POST /api/v1/ai/generate-caption`: 阿里 DashScope 识图生成标题和正文
- `GET/POST/DELETE /api/v1/drafts`: 草稿箱
- `GET /api/v1/tags/fish-categories`: 鱼获标签
- `GET /api/v1/tags/spot-evaluations`: 钓点评价标签

## 已验证

- `fishing-spot-api`: `npm run build`
- `fishing-spot-app`: `npx tsc --noEmit`
- `fishing-spot-app`: `npx expo export --platform web --output-dir dist-web`
- 本地 HTTP 烟测：钓点列表、登录鉴权、发布分享、静态 Web 首页
