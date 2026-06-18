# React Native + Expo 全栈 APP 从开发到上线完整手册

本文档以当前「钓点分享」项目为例：

- 前端：React Native、Expo、Expo Router、TypeScript、Zustand
- 原生能力：高德地图、定位、相机、相册
- 后端：Node.js、NestJS、TypeORM
- 数据：MySQL、Redis
- 文件：腾讯云 COS
- AI：阿里云通义千问视觉模型
- 构建发布：EAS Build、EAS Submit

项目目录：

```text
/Users/sxunt/Downloads/app/fishing
├── app/     # React Native + Expo 前端
├── api/     # NestJS 后端
└── docs/    # 项目文档
```

---

## 1. 2026 年正式上线前的重要说明

当前前端使用：

```json
{
  "expo": "~51.0.39",
  "react-native": "0.74.5"
}
```

Expo SDK 51 可以继续用于当前本地开发和已有测试包，但不建议直接用于 2026 年的新应用商店版本。

截至 2026 年 6 月：

- Google Play 新应用和更新必须至少面向 Android 15，即 API 35。
- 自 2026 年 4 月 28 日起，App Store 上传包必须使用 Xcode 26 和 iOS 26 SDK 或更高版本构建。
- Expo 官方已明确说明 SDK 51 非常陈旧，建议升级到较新的 SDK。

因此应将发布工作分成两阶段：

```text
第一阶段：继续使用 SDK 51 完成功能开发和业务测试
第二阶段：正式上架前，逐级升级 Expo SDK 并重新验证高德地图插件
```

不要在没有回归测试的情况下直接从 SDK 51 跳到最新 SDK。Expo 官方建议一次升级一个 SDK 版本。

升级基本流程：

```bash
cd /Users/sxunt/Downloads/app/fishing/app

# 每升级一个 SDK 都执行一次，版本号按实际目标填写
npx expo install expo@^52.0.0
npx expo install --fix
npx expo-doctor@latest

# 测试通过后再继续升级下一版本
npx expo install expo@^53.0.0
npx expo install --fix
npx expo-doctor@latest
```

每次升级后必须测试：

- 高德地图 Android/iOS 地图渲染
- 高德隐私合规初始化
- Android/iOS 定位权限和真实定位
- 地图 Marker、缩放、拖动和长按
- 相机、相册和腾讯云 COS 上传
- Expo Router 页面跳转
- BottomSheet、手势和动画
- 登录、发布、点赞和评论

如果升级后重新生成原生目录：

```bash
npx expo prebuild --clean
```

`--clean` 会删除并重新生成 `android/`、`ios/`，所以所有原生修改必须放在 Expo Config Plugin 中，不能只手动改原生文件。

---

## 2. 开发前需要准备的账号

### 2.1 必需账号

1. Expo 账号
2. 高德开放平台账号
3. 腾讯云账号和 COS Bucket
4. 阿里云账号和 DashScope API Key
5. 云服务器账号
6. 域名和 SSL 证书

### 2.2 应用商店账号

Android 上线：

- Google Play Console 开发者账号
- Google Service Account

iOS 上线：

- Apple Developer Program
- App Store Connect 权限
- Apple Team ID
- App Store Connect API Key，推荐使用

### 2.3 国内 Android 商店

如果主要面向中国大陆用户，还需要根据实际渠道申请：

- 华为应用市场
- 小米开放平台
- OPPO 开放平台
- vivo 开放平台
- 应用宝

这些商店通常使用 APK，而 Google Play 使用 AAB。

---

## 3. 本地开发环境

### 3.1 推荐基础版本

```text
Node.js：20 LTS
npm：10 或 11
Java：JDK 17
Android SDK：至少安装项目需要的 compileSdk/targetSdk
Watchman：macOS 推荐安装
```

检查版本：

```bash
node -v
npm -v
java -version
git --version
```

### 3.2 macOS 安装基础工具

```bash
xcode-select --install

brew install node@20
brew install watchman
brew install openjdk@17
brew install mysql
brew install redis
```

设置 Java 17：

```bash
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
echo 'export PATH="$JAVA_HOME/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### 3.3 Android 环境变量

```bash
echo 'export ANDROID_HOME="$HOME/Library/Android/sdk"' >> ~/.zshrc
echo 'export PATH="$PATH:$ANDROID_HOME/emulator"' >> ~/.zshrc
echo 'export PATH="$PATH:$ANDROID_HOME/platform-tools"' >> ~/.zshrc
echo 'export PATH="$PATH:$ANDROID_HOME/cmdline-tools/latest/bin"' >> ~/.zshrc
source ~/.zshrc
```

检查：

```bash
echo $ANDROID_HOME
adb version
emulator -list-avds
```

### 3.4 Android Studio

安装：

- Android SDK Platform
- Android SDK Build-Tools
- Android SDK Platform-Tools
- Android Emulator
- Android SDK Command-line Tools

创建模拟器后：

```bash
emulator -list-avds
emulator -avd Pixel_7_API_35 -gpu host
```

真机检查：

```bash
adb kill-server
adb start-server
adb devices
```

正常状态：

```text
设备序列号    device
```

### 3.5 iOS 环境

本地 iOS 编译需要：

- macOS
- 满足当前 App Store 要求的 Xcode
- CocoaPods

```bash
sudo gem install cocoapods --no-document
pod --version
xcodebuild -version
```

如果本机 Xcode 太旧，可以继续进行 Android 和 Web 开发，并使用 EAS 云构建 iOS。但 Expo SDK 和原生依赖本身仍必须兼容 EAS 当前可用的 Xcode 构建镜像。

---

## 4. 从零创建项目

当前项目已经创建完成，本节用于以后重建或新项目参考。

### 4.1 创建 Expo 前端

```bash
npx create-expo-app@latest fishing-spot-app
cd fishing-spot-app
```

安装 Expo Router：

```bash
npx expo install expo-router expo-linking expo-constants expo-status-bar
```

确保 `package.json`：

```json
{
  "main": "expo-router/entry"
}
```

安装常用依赖：

```bash
npx expo install \
  expo-location \
  expo-image-picker \
  expo-secure-store \
  expo-dev-client \
  expo-device \
  expo-font \
  expo-system-ui \
  react-native-gesture-handler \
  react-native-reanimated \
  react-native-safe-area-context \
  react-native-screens

npm install \
  axios \
  zustand \
  @gorhom/bottom-sheet \
  @amap/amap-jsapi-loader
```

高德地图按插件实际要求安装：

```bash
npm install expo-gaode-map
```

由于高德地图包含原生代码，不能只用 Expo Go 测试，必须使用 Development Build 或 `expo run:*`。

### 4.2 创建 NestJS 后端

```bash
npm install -g @nestjs/cli
nest new fishing-spot-api
cd fishing-spot-api
```

安装当前项目依赖：

```bash
npm install \
  @nestjs/config \
  @nestjs/jwt \
  @nestjs/passport \
  @nestjs/swagger \
  @nestjs/typeorm \
  @nestjs/serve-static \
  typeorm \
  mysql2 \
  ioredis \
  axios \
  bcryptjs \
  class-transformer \
  class-validator \
  passport \
  passport-jwt \
  multer \
  cos-nodejs-sdk-v5

npm install -D \
  @types/bcryptjs \
  @types/multer \
  @types/node \
  tsc-alias
```

---

## 5. 环境变量

## 5.1 前端 `.env`

文件：

```text
/Users/sxunt/Downloads/app/fishing/app/.env
```

模板：

```dotenv
# 本地真机不能用 localhost，要填写电脑局域网 IP
EXPO_PUBLIC_DEV_API_URL=http://192.168.1.100:3000/api/v1

# 正式环境 API
EXPO_PUBLIC_API_URL=https://api.example.com/api/v1

# 高德 Web JS API
EXPO_PUBLIC_AMAP_WEB_KEY=
EXPO_PUBLIC_AMAP_SECURITY_JS_CODE=

# 高德 Android/iOS Key
EXPO_PUBLIC_AMAP_ANDROID_KEY=
EXPO_PUBLIC_AMAP_IOS_KEY=
```

当前项目的 `constants/config.ts` 暂时把生产地址写死成了：

```ts
'https://your-domain.com/api/v1'
```

正式构建前必须改成读取环境变量：

```ts
const env = process.env as Record<string, string | undefined>;

export const API_BASE_URL = __DEV__
  ? (env.EXPO_PUBLIC_DEV_API_URL || 'http://localhost:3000/api/v1')
  : (env.EXPO_PUBLIC_API_URL || 'https://api.example.com/api/v1');
```

否则即使 EAS 配置了 `EXPO_PUBLIC_API_URL`，生产 APP 仍会访问代码中的占位地址。

注意：

- 所有 `EXPO_PUBLIC_` 变量都会进入客户端包。
- `EXPO_PUBLIC_` 变量不能存腾讯云 SecretKey、JWT Secret、数据库密码和 DashScope Secret。
- Android 高德 Key 必须匹配安装包实际签名 SHA1 和包名。
- iOS 高德 Key 必须匹配 Bundle Identifier。
- Web 高德 Key 和安全密钥必须匹配域名白名单。

### 5.2 后端 `.env`

文件：

```text
/Users/sxunt/Downloads/app/fishing/api/.env
```

模板：

```dotenv
NODE_ENV=development
PORT=3000

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=fishing

REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_USERNAME=
REDIS_PASSWORD=

# 生产环境必须生成足够长的随机值
JWT_SECRET=

# 高德 Web 服务 Key，用于后端 POI、逆地理和 IP 定位
AMAP_WEB_SERVICE_KEY=

DASHSCOPE_API_KEY=
AI_MODEL=qwen-vl-max

TENCENT_COS_SECRET_ID=
TENCENT_COS_SECRET_KEY=
TENCENT_COS_REGION=ap-guangzhou
TENCENT_COS_BUCKET=your-bucket-1250000000
TENCENT_COS_PREFIX=jh_chat/fishing
```

生成 JWT Secret：

```bash
openssl rand -base64 48
```

### 5.3 创建 `.env.example`

代码仓库中只提交空值模板：

```bash
cp .env .env.example
```

然后手动删除 `.env.example` 中的真实密钥。

确认 `.gitignore`：

```gitignore
.env
.env.*
!.env.example
```

如果密钥曾经提交到 Git，光删除文件不够，必须立即在云平台轮换密钥。

---

## 6. 本地 MySQL 和 Redis

### 6.1 启动服务

macOS：

```bash
brew services start mysql
brew services start redis
```

检查：

```bash
brew services list
mysqladmin ping
redis-cli ping
```

Redis 正常返回：

```text
PONG
```

### 6.2 创建数据库

```bash
mysql -uroot
```

```sql
CREATE DATABASE fishing
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

SHOW DATABASES;
EXIT;
```

### 6.3 Docker 方式

```yaml
services:
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root_password
      MYSQL_DATABASE: fishing
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  mysql_data:
  redis_data:
```

启动：

```bash
docker compose up -d
docker compose ps
docker compose logs -f
```

停止：

```bash
docker compose down
```

---

## 7. 安装当前项目依赖

前端：

```bash
cd /Users/sxunt/Downloads/app/fishing/app
npm install
```

后端：

```bash
cd /Users/sxunt/Downloads/app/fishing/api
npm install
```

依赖异常时先检查，不要默认删除所有文件：

```bash
npm ls
npx expo-doctor
```

确实需要干净安装时：

```bash
rm -rf node_modules
npm install
```

---

## 8. 本地启动顺序

推荐顺序：

```text
MySQL
→ Redis
→ NestJS 后端
→ Expo Metro
→ Android/iOS/Web 客户端
```

### 8.1 启动 MySQL 和 Redis

```bash
brew services start mysql
brew services start redis
```

### 8.2 启动后端

```bash
cd /Users/sxunt/Downloads/app/fishing/api
npm run start:dev
```

检查：

```bash
curl http://localhost:3000/api/v1/tags/fish-categories
```

Swagger：

```text
http://localhost:3000/api-docs
```

### 8.3 启动 Expo

```bash
cd /Users/sxunt/Downloads/app/fishing/app
npx expo start
```

清 Metro 缓存：

```bash
npx expo start --clear
```

Web：

```bash
npm run web
```

### 8.4 真机访问后端

手机和电脑必须在同一个局域网。

查看 Mac IP：

```bash
ipconfig getifaddr en0
```

前端 `.env`：

```dotenv
EXPO_PUBLIC_DEV_API_URL=http://电脑局域网IP:3000/api/v1
```

检查端口：

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Android USB 端口映射也可用于本机后端：

```bash
adb reverse tcp:3000 tcp:3000
adb reverse tcp:8081 tcp:8081
```

然后 Android 客户端可访问：

```text
http://127.0.0.1:3000/api/v1
```

---

## 9. Web 开发和测试

```bash
cd /Users/sxunt/Downloads/app/fishing/app
npx expo start --web
```

生产静态导出：

```bash
npx expo export --platform web
```

当前项目配置 `web.output = single`，导出目录通常为 `dist/`；如果项目脚本调整过，应以命令输出为准。

本地预览：

```bash
npx serve dist
```

Web 高德地图上线前检查：

- `EXPO_PUBLIC_AMAP_WEB_KEY`
- `EXPO_PUBLIC_AMAP_SECURITY_JS_CODE`
- 高德控制台域名白名单
- HTTPS
- 浏览器定位权限
- API CORS

---

## 10. Android 开发

### 10.1 生成原生项目

```bash
cd /Users/sxunt/Downloads/app/fishing/app
npx expo prebuild --platform android
```

完全重新生成：

```bash
npx expo prebuild --clean --platform android
```

### 10.2 模拟器运行

```bash
emulator -list-avds
emulator -avd Pixel_7_API_35 -gpu host

npx expo run:android
```

### 10.3 真机运行

```bash
adb devices
npx expo run:android --device
```

### 10.4 安装 APK

```bash
adb install -r app-release.apk
```

卸载：

```bash
adb uninstall com.fishingspot.app
```

### 10.5 查看日志

项目已有脚本：

```bash
npm run logs:android
npm run logs:android:crash
npm run logs:android:clear
```

通用命令：

```bash
adb logcat
adb logcat -v time AndroidRuntime:E ReactNative:V ReactNativeJS:V '*:S'
```

### 10.6 检查 APK 实际签名 SHA1

不要只检查 `~/.android/debug.keystore`，高德需要匹配“安装包实际使用的签名”。

Debug 包：

```bash
cd android
./gradlew signingReport
```

APK：

```bash
apksigner verify --print-certs path/to/app.apk
```

高德 Android Key 绑定：

```text
实际 APK SHA1 + com.fishingspot.app
```

Debug 和生产签名一般不同，应分别创建高德 Key。

---

## 11. iOS 开发

### 11.1 生成原生项目

```bash
cd /Users/sxunt/Downloads/app/fishing/app
npx expo prebuild --platform ios
```

安装 Pods：

```bash
cd ios
pod install --repo-update
cd ..
```

### 11.2 模拟器运行

```bash
npx expo run:ios
```

指定模拟器：

```bash
npx expo run:ios --device "iPhone 16"
```

### 11.3 iPhone 真机

```bash
npx expo run:ios --device
```

还需要：

- Xcode 登录 Apple ID
- 设置 Development Team
- Bundle ID 唯一
- 手机信任开发者证书
- 开启 Developer Mode

### 11.4 iOS 日志

```bash
npx react-native log-ios
```

也可以使用：

```text
Xcode → Window → Devices and Simulators → Open Console
```

---

## 12. Development Build

当前项目使用 `expo-gaode-map`，属于自定义原生模块，应使用 Development Build。

安装：

```bash
npx expo install expo-dev-client
```

配置 EAS：

```bash
npm install -g eas-cli
eas login
eas whoami
eas build:configure
```

Android 开发包：

```bash
eas build --platform android --profile development
```

iOS 开发包：

```bash
eas build --platform ios --profile development
```

安装开发包后启动 Metro：

```bash
npx expo start --dev-client
```

什么时候必须重新构建 Development Build：

- 安装或升级原生依赖
- 修改 Expo Config Plugin
- 修改 Android/iOS 权限
- 修改高德原生 Key
- 修改 Bundle ID 或 Android package
- 升级 Expo SDK 或 React Native

只改 JS/TS、样式和普通业务逻辑时，通常只需 Metro 热更新。

---

## 13. 日常代码质量检查

前端：

```bash
cd /Users/sxunt/Downloads/app/fishing/app
npx tsc --noEmit
npx expo-doctor
```

后端：

```bash
cd /Users/sxunt/Downloads/app/fishing/api
npm run build
```

建议补充脚本：

```json
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "test": "jest",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\""
  }
}
```

正式发布前至少测试：

- 注册、登录、Token 失效
- 定位允许、拒绝和永久拒绝
- 地图初次定位和上次位置
- 候选水域缓存
- 真实钓点和候选水域详情
- 搜索和附近钓点
- 上传 1-3 张图片
- AI 文案
- 草稿恢复
- 发布候选水域并转为真实钓点
- 点赞、取消点赞、评论、回复
- Android 返回键
- iOS 手势和安全区域
- 弱网、超时和断网

---

## 14. Git 开发流程

初始化：

```bash
git init
git add .
git commit -m "chore: initialize project"
```

功能分支：

```bash
git switch -c feature/map-search
git add .
git commit -m "feat: add fishing spot search"
git push -u origin feature/map-search
```

发布标签：

```bash
git switch main
git pull
git tag -a v1.0.0 -m "release v1.0.0"
git push origin v1.0.0
```

不要提交：

- `.env`
- COS Secret
- DashScope Key
- JWT Secret
- 数据库密码
- Android keystore
- Apple `.p8` 私钥
- Google Service Account JSON

---

## 15. 后端生产化改造

当前代码上线前至少需要处理以下事项。

### 15.1 禁止生产环境自动同步表结构

当前 TypeORM 使用：

```ts
synchronize: true
```

生产环境应改成：

```ts
synchronize: process.env.NODE_ENV !== 'production'
```

并使用 Migration 管理表结构。

### 15.2 使用数据库 Migration

推荐新增 TypeORM DataSource 和脚本：

```json
{
  "scripts": {
    "migration:generate": "typeorm-ts-node-commonjs migration:generate",
    "migration:run": "typeorm-ts-node-commonjs migration:run",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert"
  }
}
```

生成和执行：

```bash
npm run migration:generate -- src/migrations/InitSchema -d src/data-source.ts
npm run migration:run -- -d src/data-source.ts
```

### 15.3 CORS 白名单

不要在生产环境继续使用任意来源：

```ts
app.enableCors({ origin: true, credentials: true });
```

应改为指定域名：

```ts
app.enableCors({
  origin: [
    'https://www.example.com',
    'https://admin.example.com',
  ],
  credentials: true,
});
```

原生 APP 不依赖浏览器 CORS，但 Web 端依赖。

### 15.4 JWT

生产环境必须配置 `JWT_SECRET`，不要使用代码里的默认值。

推荐后续改进：

- Access Token 15-60 分钟
- Refresh Token 单独校验
- Refresh Token 存 Redis
- 支持退出登录时撤销 Refresh Token

### 15.5 限流和安全

建议安装：

```bash
npm install @nestjs/throttler helmet
```

还应增加：

- 登录限流
- 上传限流
- AI 接口限流
- 用户候选点限流
- 文件 MIME 二次检查
- SQL 和 DTO 校验
- 服务端日志脱敏

---

## 16. 云服务器部署后端

以下示例使用 Ubuntu、Nginx、PM2。

### 16.1 服务器准备

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y nginx git curl mysql-client redis-tools
```

安装 Node 20：

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v
npm -v
```

安装 PM2：

```bash
sudo npm install -g pm2
pm2 -v
```

### 16.2 拉取代码

```bash
sudo mkdir -p /var/www/fishing
sudo chown -R $USER:$USER /var/www/fishing

cd /var/www/fishing
git clone <你的仓库地址> .
```

### 16.3 安装和构建

```bash
cd /var/www/fishing/api
npm ci
npm run build
```

创建生产 `.env`：

```bash
nano .env
```

### 16.4 PM2 启动

```bash
pm2 start dist/main.js --name fishing-api
pm2 status
pm2 logs fishing-api
```

设置开机启动：

```bash
pm2 save
pm2 startup
```

执行 `pm2 startup` 输出的那条 sudo 命令，然后再次：

```bash
pm2 save
```

更新后端：

```bash
cd /var/www/fishing
git pull

cd api
npm ci
npm run build
npm run migration:run -- -d dist/data-source.js
pm2 reload fishing-api
```

### 16.5 Nginx 反向代理

```bash
sudo nano /etc/nginx/sites-available/fishing-api
```

```nginx
server {
    listen 80;
    server_name api.example.com;

    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_connect_timeout 10s;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
```

启用：

```bash
sudo ln -s /etc/nginx/sites-available/fishing-api /etc/nginx/sites-enabled/fishing-api
sudo nginx -t
sudo systemctl reload nginx
```

### 16.6 HTTPS

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.example.com
```

检查自动续期：

```bash
sudo certbot renew --dry-run
```

线上测试：

```bash
curl https://api.example.com/api/v1/tags/fish-categories
curl https://api.example.com/api-docs-json
```

---

## 17. 生产 MySQL 和 Redis

推荐使用云数据库和云 Redis，不要和应用进程共用一台低配置服务器。

### 17.1 MySQL

要求：

- 开启自动备份
- 限制安全组，只允许后端服务器访问
- 使用专用数据库用户
- 不要使用 root 连接生产数据库
- 开启慢查询监控

```sql
CREATE USER 'fishing_app'@'%' IDENTIFIED BY '强密码';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX
ON fishing.* TO 'fishing_app'@'%';
FLUSH PRIVILEGES;
```

备份：

```bash
mysqldump \
  -h数据库地址 \
  -u数据库用户 \
  -p \
  --single-transaction \
  --routines \
  --triggers \
  fishing > fishing-$(date +%Y%m%d-%H%M%S).sql
```

恢复：

```bash
mysql -h数据库地址 -u数据库用户 -p fishing < backup.sql
```

### 17.2 Redis

要求：

- 不暴露公网 6379
- 设置密码
- 限制安全组
- 开启持久化或使用云 Redis
- 收藏等重要数据长期应考虑写入 MySQL

检查：

```bash
redis-cli -h Redis地址 -a Redis密码 ping
```

---

## 18. 腾讯云 COS 上线检查

1. 创建最小权限子账号或角色。
2. 只授予目标 Bucket 的 `PutObject` 等必要权限。
3. SecretId/SecretKey 只放后端。
4. Bucket 配置正确的防盗链和 CORS。
5. 如果图片公开访问，确认访问域名和对象 ACL。
6. 推荐绑定 CDN 自定义域名。
7. 设置生命周期，清理无用临时图片。

后端上传成功后数据库只保存 URL：

```text
https://bucket.cos.region.myqcloud.com/jh_chat/fishing/YYYYMMDD/image.jpg
```

---

## 19. Web 生产部署

导出：

```bash
cd /Users/sxunt/Downloads/app/fishing/app
npx expo export --platform web
```

上传到服务器：

```bash
rsync -avz --delete dist/ user@server:/var/www/fishing-web/
```

Nginx：

```nginx
server {
    listen 80;
    server_name www.example.com;
    root /var/www/fishing-web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.(js|css|png|jpg|jpeg|webp|svg|ico|woff2)$ {
        expires 7d;
        add_header Cache-Control "public";
    }
}
```

HTTPS：

```bash
sudo certbot --nginx -d www.example.com
```

高德控制台添加：

```text
www.example.com
```

不要填写 `https://`，按高德控制台提示填写域名。

---

## 20. EAS 环境配置

安装并登录：

```bash
npm install -g eas-cli
eas login
eas whoami
```

关联项目：

```bash
cd /Users/sxunt/Downloads/app/fishing/app
eas init
eas build:configure
```

查看项目：

```bash
eas project:info
```

创建 EAS 环境变量：

```bash
eas env:create --environment production \
  --name EXPO_PUBLIC_API_URL \
  --value https://api.example.com/api/v1 \
  --visibility plaintext
```

高德客户端 Key 也可以通过 EAS 环境变量管理，但最终仍会进入 APP 包，不能被视为服务器秘密。

查看：

```bash
eas env:list --environment production
```

拉取到本地：

```bash
eas env:pull --environment development
```

---

## 21. 推荐的 `eas.json`

当前项目生产 Android 配置是 APK。APK 适合测试和国内商店，但 Google Play 正式发布必须使用 AAB。

推荐：

```json
{
  "cli": {
    "version": ">= 20.1.0",
    "appVersionSource": "remote"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "environment": "development",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "environment": "preview",
      "android": {
        "buildType": "apk"
      }
    },
    "production": {
      "autoIncrement": true,
      "environment": "production",
      "android": {
        "buildType": "app-bundle"
      }
    },
    "production-apk": {
      "autoIncrement": true,
      "environment": "production",
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

用途：

```text
development     开发客户端
preview         内部测试 APK
production      Google Play AAB 和 App Store IPA
production-apk  国内 Android 商店或人工安装 APK
```

---

## 22. Android 正式构建

### 22.1 Google Play AAB

```bash
cd /Users/sxunt/Downloads/app/fishing/app
eas build --platform android --profile production
```

查看构建：

```bash
eas build:list --platform android
eas build:view <BUILD_ID>
```

### 22.2 测试 APK

```bash
eas build --platform android --profile preview
```

或者：

```bash
eas build --platform android --profile production-apk
```

### 22.3 本地 Release 构建

```bash
npx expo prebuild --platform android
cd android
./gradlew bundleRelease
```

AAB 通常位于：

```text
android/app/build/outputs/bundle/release/app-release.aab
```

APK：

```bash
./gradlew assembleRelease
```

通常位于：

```text
android/app/build/outputs/apk/release/app-release.apk
```

---

## 23. Google Play 上线

### 23.1 控制台准备

1. 创建应用。
2. 包名必须是 `com.fishingspot.app`。
3. 填写应用名称、简短描述和完整描述。
4. 上传图标、手机截图和宣传图。
5. 填写隐私政策 URL。
6. 完成数据安全表单。
7. 完成内容分级。
8. 填写广告声明。
9. 填写目标受众。
10. 配置应用访问权限说明。
11. 创建内部测试轨道。

### 23.2 首次上传

Google Play 首次上传通常需要在控制台手动上传 AAB：

```text
Play Console → 测试 → 内部测试 → 创建版本 → 上传 AAB
```

### 23.3 后续 EAS Submit

```bash
eas submit --platform android --profile production
```

或者构建后自动提交：

```bash
eas build --platform android --profile production --auto-submit
```

EAS 自动提交需要 Google Service Account JSON。

### 23.4 Android 上架检查

- production 构建必须为 AAB。
- targetSdk 满足 Google Play 当前要求。
- 高德生产 Key 匹配生产签名 SHA1。
- 定位、相机、相册权限说明和实际用途一致。
- 避免申请不必要的照片媒体权限。
- 隐私政策中列出高德 SDK、腾讯云 COS、阿里云 AI 等第三方服务。
- 测试不同厂商 Android 设备。

---

## 24. iOS 正式构建

### 24.1 App Store 构建

```bash
cd /Users/sxunt/Downloads/app/fishing/app
eas build --platform ios --profile production
```

EAS 可以管理：

- Distribution Certificate
- Provisioning Profile
- App Identifier

查看凭证：

```bash
eas credentials --platform ios
```

### 24.2 提交到 App Store Connect

```bash
eas submit --platform ios --profile production
```

或：

```bash
eas build --platform ios --profile production --auto-submit
```

EAS Submit 会上传到 App Store Connect/TestFlight，不会自动完成正式审核发布。

### 24.3 TestFlight

1. 等待 Apple 处理构建。
2. 在 App Store Connect 选择构建。
3. 添加内部测试人员。
4. 外部测试需要 Beta Review。
5. 真机完成完整回归。

### 24.4 App Store 上线材料

- APP 名称
- 副标题
- 关键词
- 描述
- 支持 URL
- 隐私政策 URL
- iPhone 截图
- iPad 截图，如果支持 iPad
- 年龄分级
- App Privacy 数据收集说明
- 审核账号和密码
- 定位功能说明
- 后台服务可访问

当前配置：

```js
ios: {
  supportsTablet: true
}
```

这意味着需要认真测试 iPad 并准备对应截图。如果暂时不支持 iPad，可在发布前评估改成 `false`。

---

## 25. APP 隐私合规

APP 首次启动流程：

```text
展示自己的隐私政策和用户协议
→ 用户点击同意
→ 调用高德 setPrivacyConfig
→ 初始化高德 SDK
→ 请求系统定位权限
→ 渲染地图
```

隐私政策至少说明：

- 定位信息
- 相机和相册
- 手机号和账号信息
- 用户发布内容
- 图片上传到腾讯云 COS
- 高德地图 SDK
- 阿里云 AI 图片分析
- 日志和设备信息
- 数据保存和删除方式
- 联系方式

权限遵循“使用时申请”：

- 用户进入地图时申请定位。
- 用户拍照时申请相机。
- 用户选择相册时申请照片访问。
- 不要在启动页一次申请所有权限。

---

## 26. OTA 更新

EAS Update 只能更新兼容当前原生 Runtime 的 JS、样式和静态资源。

安装：

```bash
npx expo install expo-updates
eas update:configure
```

发布更新：

```bash
eas update --channel production --message "修复钓点搜索问题"
```

不能只通过 OTA 发布的修改：

- 新增或升级原生依赖
- 修改高德原生 SDK
- 修改 Android/iOS 权限
- 修改原生 Key
- 修改 Bundle ID 或 package
- 升级 Expo SDK

这些修改必须重新构建 APP：

```bash
eas build --platform all --profile production
```

---

## 27. CI/CD 基本流程

建议流水线：

```text
提交代码
→ npm ci
→ 前端 TypeScript 检查
→ Expo Doctor
→ 后端构建和测试
→ 构建 Docker 或部署后端
→ EAS Build
→ 内部测试
→ EAS Submit
```

CI 中安装：

```bash
npm ci
npx expo-doctor
npx tsc --noEmit
```

后端：

```bash
npm ci
npm run build
```

EAS 非交互构建：

```bash
export EXPO_TOKEN=你的Expo访问令牌
eas build --platform android --profile production --non-interactive
```

不要把 `EXPO_TOKEN` 写进仓库，应配置在 CI Secret 中。

---

## 28. 监控和日志

### 28.1 后端

```bash
pm2 status
pm2 logs fishing-api
pm2 monit
```

Nginx：

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 28.2 Android

```bash
adb logcat -v time AndroidRuntime:E ReactNative:V ReactNativeJS:V '*:S'
```

### 28.3 推荐监控

- Sentry：前端崩溃、JS 错误、后端异常
- 云监控：CPU、内存、磁盘、数据库连接数
- API 健康检查
- COS 上传失败率
- 高德接口调用量
- AI 接口耗时和成本

建议增加：

```http
GET /health
```

用于检查：

- NestJS 进程
- MySQL
- Redis
- 磁盘和内存

---

## 29. 数据备份和回滚

发布前：

```bash
mysqldump ... > before-release.sql
git tag -a v1.0.0 -m "release v1.0.0"
```

后端回滚：

```bash
git checkout <稳定标签或提交>
npm ci
npm run build
pm2 reload fishing-api
```

数据库 Migration 回滚：

```bash
npm run migration:revert -- -d dist/data-source.js
```

APP 回滚：

- Google Play：从历史版本重新创建发布，版本号必须继续递增。
- App Store：选择已批准版本或提交修复版本。
- EAS Update：发布一个恢复到稳定代码的 OTA 更新，但只适用于原生 Runtime 兼容的修改。

---

## 30. 完整发布执行清单

### 30.1 后端

```bash
cd api
npm ci
npm run build

# 当前项目补齐 TypeORM Migration 后再执行
npm run migration:run

pm2 reload fishing-api
curl https://api.example.com/api/v1/tags/fish-categories
```

检查：

- 生产 `.env`
- JWT Secret
- MySQL 和 Redis
- HTTPS
- CORS
- COS 上传
- 高德 Web 服务 Key
- DashScope
- Swagger 是否需要生产环境限制访问

### 30.2 前端

```bash
cd app
npm ci
npx expo-doctor
npx tsc --noEmit
```

检查：

- 版本号
- 图标和启动图
- API 正式地址
- Android/iOS 高德生产 Key
- Web 高德 Key 和安全密钥
- 包名和 Bundle ID
- 权限说明
- 隐私政策
- 真机定位

### 30.3 内部测试

```bash
eas build --platform android --profile preview
eas build --platform ios --profile development
```

测试通过后：

```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```

提交：

```bash
eas submit --platform android --profile production
eas submit --platform ios --profile production
```

---

## 31. 当前项目最短开发命令

终端 1：

```bash
brew services start mysql
brew services start redis
```

终端 2：

```bash
cd /Users/sxunt/Downloads/app/fishing/api
npm run start:dev
```

终端 3：

```bash
cd /Users/sxunt/Downloads/app/fishing/app
npx expo start --dev-client
```

Android 真机：

```bash
adb devices
npx expo run:android --device
```

Web：

```bash
npm run web
```

构建检查：

```bash
cd /Users/sxunt/Downloads/app/fishing/api
npm run build

cd /Users/sxunt/Downloads/app/fishing/app
npx tsc --noEmit
npx expo-doctor
```

---

## 32. 官方参考

- Expo 工作流：https://docs.expo.dev/workflow/overview/
- Expo SDK 升级：https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- Development Build：https://docs.expo.dev/develop/development-builds/create-a-build/
- EAS Build：https://docs.expo.dev/build/introduction/
- EAS Build 配置：https://docs.expo.dev/build/eas-json/
- EAS Submit：https://docs.expo.dev/submit/introduction/
- Google Play 提交：https://docs.expo.dev/submit/android/
- App Store 提交：https://docs.expo.dev/submit/ios/
- EAS 环境变量：https://docs.expo.dev/eas/environment-variables/
- Apple 上传要求：https://developer.apple.com/news/upcoming-requirements/
- Google Play Target API：https://support.google.com/googleplay/android-developer/answer/11926878
