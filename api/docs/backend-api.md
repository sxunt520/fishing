# 钓点分享后端 API 文档

本文档根据当前 NestJS 后端代码整理，描述实际已经实现的接口、参数、鉴权和返回结构。

## 1. 基本信息

| 项目 | 值 |
| --- | --- |
| 本地服务地址 | `http://localhost:3000` |
| 局域网示例 | `http://192.168.18.105:3000` |
| API 前缀 | `/api/v1` |
| Swagger | `http://localhost:3000/api-docs` |
| 请求格式 | JSON；图片上传接口使用 `multipart/form-data` |
| JSON 请求体上限 | 10 MB |
| 身份认证 | Bearer JWT |
| Access Token 有效期 | 7 天 |
| Refresh Token 有效期 | 30 天 |

需要登录的接口必须携带请求头：

```http
Authorization: Bearer <accessToken>
```

## 2. 通用响应与错误

接口成功时直接返回业务数据，没有统一的 `code/data/message` 外层包装。

NestJS 默认错误格式：

```json
{
  "statusCode": 400,
  "message": "错误说明",
  "error": "Bad Request"
}
```

常见状态码：

| 状态码 | 含义 |
| --- | --- |
| `200` | 查询、更新或删除成功 |
| `201` | 创建成功 |
| `400` | 参数错误或业务校验失败 |
| `401` | 缺少 Token、Token 无效或已过期 |
| `403` | 无权操作、COS 拒绝访问 |
| `404` | 数据不存在 |
| `409` | 手机号已注册、重复点赞 |
| `500` | 服务端异常 |

## 3. 核心数据结构

### 3.1 User

```json
{
  "id": "uuid",
  "phone": "13800138000",
  "nickname": "钓友9527",
  "avatar": "https://example.com/avatar.jpg",
  "createdAt": "2026-06-18T08:00:00.000Z"
}
```

### 3.2 FishingSpot

```json
{
  "id": "uuid 或 amap_POI_ID",
  "name": "府河",
  "address": "四川省成都市双流区",
  "latitude": 30.5006,
  "longitude": 104.0725,
  "fishTypes": ["鲫鱼", "鲤鱼"],
  "fishCategories": ["鲫鱼"],
  "evaluations": ["河流", "野钓"],
  "postCount": 3,
  "source": "admin | user | amap",
  "sourcePoiId": "高德 POI ID",
  "status": "candidate | pending_review | verified",
  "confidence": 0.75,
  "isCandidate": false,
  "distance": 1.25
}
```

距离单位需要注意：

- `GET /spots/nearby` 和真实钓点搜索的 `distance` 单位为公里。
- 高德候选水域和用户候选点的 `distance` 单位为米。

### 3.3 Post

```json
{
  "id": "uuid",
  "userId": "uuid",
  "spotId": "uuid",
  "title": "今天府河鱼口不错",
  "content": "下午三点开始作钓，鲫鱼口比较稳定。",
  "images": ["https://bucket.cos.ap-guangzhou.myqcloud.com/path/image.jpg"],
  "fishCategories": ["鲫鱼"],
  "spotEvaluation": "野钓",
  "likeCount": 5,
  "commentCount": 2,
  "createdAt": "2026-06-18T08:00:00.000Z",
  "updatedAt": "2026-06-18T08:00:00.000Z"
}
```

### 3.4 Comment

```json
{
  "id": "uuid",
  "postId": "uuid",
  "userId": "uuid",
  "parentId": null,
  "replyToUserId": null,
  "content": "这里停车方便吗？",
  "user": {},
  "replyToUser": null,
  "createdAt": "2026-06-18T08:00:00.000Z"
}
```

## 4. 认证接口

### 4.1 用户注册

`POST /api/v1/auth/register`

鉴权：否

请求体：

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `phone` | string | 是 | 11 位手机号 |
| `password` | string | 是 | 6-20 位 |
| `nickname` | string | 否 | 不传时自动生成 |

```json
{
  "phone": "13800138000",
  "password": "123456",
  "nickname": "成都钓友"
}
```

响应：

```json
{
  "accessToken": "jwt",
  "refreshToken": "jwt",
  "expiresIn": 604800
}
```

可能错误：`409 该手机号已注册`。

### 4.2 用户登录

`POST /api/v1/auth/login`

鉴权：否

```json
{
  "phone": "13800138000",
  "password": "123456"
}
```

响应与注册接口相同。

可能错误：`401 用户不存在`、`401 密码错误`。

### 4.3 获取当前用户

`GET /api/v1/auth/me`

鉴权：是

响应：`User`。

### 4.4 刷新 Token

`POST /api/v1/auth/refresh`

鉴权：是，当前实现要求请求头携带仍然有效的 Bearer Token。

响应：

```json
{
  "accessToken": "new jwt",
  "refreshToken": "new jwt",
  "expiresIn": 604800
}
```

## 5. 用户接口

### 5.1 获取个人资料

`GET /api/v1/users/me`

鉴权：是

响应：`User`。

### 5.2 修改个人资料

`PUT /api/v1/users/me`

鉴权：是

```json
{
  "nickname": "新的昵称",
  "avatar": "https://example.com/avatar.jpg"
}
```

两个字段均为可选。响应为更新后的 `User`。

## 6. 钓点接口

### 6.1 获取地图范围内真实钓点

`GET /api/v1/spots`

鉴权：否

Query 参数：

| 参数 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `north` | number | 是 | 北边界纬度 |
| `south` | number | 是 | 南边界纬度 |
| `east` | number | 是 | 东边界经度 |
| `west` | number | 是 | 西边界经度 |

示例：

```http
GET /api/v1/spots?north=30.55&south=30.45&east=104.12&west=104.02
```

仅返回 `status=verified` 的真实钓点，按分享数量倒序排列。

### 6.2 获取附近真实钓点

`GET /api/v1/spots/nearby`

鉴权：否

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `lat` | number | 是 | - | 用户纬度 |
| `lng` | number | 是 | - | 用户经度 |
| `radius` | number | 否 | `10` | 搜索半径，单位公里 |
| `limit` | integer | 否 | `20` | 返回数量 |

响应为数组，`distance` 单位为公里。

### 6.3 获取附近候选水域

`GET /api/v1/spots/water-candidates`

鉴权：否

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `lat` | number | 是 | - | 中心纬度 |
| `lng` | number | 是 | - | 中心经度 |
| `radius` | number | 否 | `5000` | 半径，单位米，服务端限制为 500-50000 |
| `limit` | integer | 否 | `30` | 数量，最大 50 |

数据来源：

1. 数据库中 `status=candidate` 的候选点。
2. 高德周边 POI 水域搜索。
3. 按 `sourcePoiId` 去重后合并返回。

候选结果示例：

```json
{
  "id": "amap_B0FFGFBM48",
  "source": "amap",
  "sourcePoiId": "B0FFGFBM48",
  "name": "府河",
  "address": "锦江区",
  "latitude": 30.648034,
  "longitude": 104.085385,
  "distance": 1526,
  "type": "地名地址信息;自然地名;河流",
  "status": "candidate",
  "confidence": 0.45,
  "isCandidate": true
}
```

### 6.4 搜索真实钓点

`GET /api/v1/spots/search`

鉴权：否

| 参数 | 类型 | 必填 | 默认值 | 说明 |
| --- | --- | --- | --- | --- |
| `keyword` | string | 是 | - | 名称或地址关键词 |
| `lat` | number | 否 | - | 当前位置纬度 |
| `lng` | number | 否 | - | 当前位置经度 |
| `limit` | integer | 否 | `20` | 最大 50 |

传入经纬度时按距离和热度排序；不传时按分享数排序。

### 6.5 搜索更多候选水域

`GET /api/v1/spots/water-search`

鉴权：否

| 参数 | 类型 | 必填 | 默认值 |
| --- | --- | --- | --- |
| `keyword` | string | 是 | - |
| `lat` | number | 是 | - |
| `lng` | number | 是 | - |
| `radius` | number | 否 | `10000` 米 |
| `limit` | integer | 否 | `20` |

搜索数据库候选点和高德 POI，结果不会因为搜索操作直接入库。

### 6.6 校验用户长按位置

`GET /api/v1/spots/user-candidates/validate`

鉴权：否

| 参数 | 类型 | 必填 |
| --- | --- | --- |
| `lat` | number | 是 |
| `lng` | number | 是 |

如果 120 米内已经存在钓点：

```json
{
  "allowed": false,
  "status": "verified",
  "confidence": 0.8,
  "reason": "附近已经有真实钓点了",
  "existingSpot": {}
}
```

如果没有重复点：

```json
{
  "allowed": true,
  "reviewable": true,
  "confidence": 0.76,
  "reason": "附近 80m 内识别到水域：府河",
  "latitude": 30.5,
  "longitude": 104.07,
  "suggestedName": "府河",
  "address": "四川省成都市双流区",
  "nearestWater": {}
}
```

置信度规则：

- `>= 0.65`：允许自动成为候选钓点。
- `0.40-0.64`：允许提交，但进入审核。
- `< 0.40`：创建时拒绝。

### 6.7 创建用户候选钓点

`POST /api/v1/spots/user-candidates`

鉴权：是

```json
{
  "latitude": 30.5,
  "longitude": 104.07,
  "name": "府河新钓位",
  "note": "桥下附近"
}
```

限制：

- 同一用户每天最多提交 10 次。
- 5 分钟内最多提交 3 次。
- 120 米内有现存钓点时直接返回现存点。
- `note` 当前接收但尚未持久化。

### 6.8 IP 城市定位

`GET /api/v1/spots/ip-location`

鉴权：否

```json
{
  "latitude": 30.660239605,
  "longitude": 104.07811045,
  "province": "四川省",
  "city": "成都市",
  "adcode": "510100",
  "source": "amap-ip"
}
```

高德服务 Key 未配置或定位失败时返回 `null`。

### 6.9 获取钓点详情

`GET /api/v1/spots/:id`

鉴权：否

可选 Query：

| 参数 | 类型 | 说明 |
| --- | --- | --- |
| `lat` | number | 用户纬度 |
| `lng` | number | 用户经度 |

传入经纬度时返回 `distance`，单位公里。

### 6.10 直接创建真实钓点

`POST /api/v1/spots`

鉴权：是

```json
{
  "name": "明湖",
  "address": "北京市海淀区",
  "latitude": 39.9,
  "longitude": 116.4,
  "fishTypes": ["鲫鱼", "草鱼"]
}
```

当前没有管理员角色限制，任意登录用户均可调用并创建 `verified` 钓点。

## 7. 分享接口

### 7.1 获取钓点分享列表

`GET /api/v1/spots/:spotId/posts`

鉴权：否

| 参数 | 类型 | 必填 | 默认值 |
| --- | --- | --- | --- |
| `spotId` | string | 是 | - |
| `page` | integer | 否 | `1` |
| `limit` | integer | 否 | `10` |

支持数据库 UUID 和 `amap_POI_ID`。响应：

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 10
}
```

### 7.2 获取单条分享详情

`GET /api/v1/posts/:id`

鉴权：否

响应包含分享、用户、钓点及评论关系。

### 7.3 发布钓点分享

`POST /api/v1/posts`

鉴权：是

发布真实钓点：

```json
{
  "spotId": "spot-uuid",
  "title": "今天鱼口不错",
  "content": "下午作钓两个小时。",
  "images": [
    "https://bucket.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260618/image.jpg"
  ],
  "fishCategories": ["鲫鱼", "鲤鱼"],
  "spotEvaluation": "野钓"
}
```

发布候选水域：

```json
{
  "candidateSpot": {
    "sourcePoiId": "B0FFGFBM48",
    "name": "府河",
    "address": "锦江区",
    "latitude": 30.648034,
    "longitude": 104.085385,
    "source": "amap"
  },
  "title": "第一次来府河",
  "content": "水面环境不错。",
  "images": [],
  "fishCategories": ["鲫鱼"],
  "spotEvaluation": "河流"
}
```

规则：

- `spotId` 和 `candidateSpot` 至少传一个。
- 图片不是必填。
- 图片必须是 `http/https` URL，不能传 Base64。
- 发布候选水域时，候选水域会创建或转为真实钓点。
- 发布后更新钓点分享数、鱼种和评价聚合数据。
- 发布后清理当前用户草稿缓存。

### 7.4 删除分享

`DELETE /api/v1/posts/:id`

鉴权：是，仅分享作者可删除。

```json
{
  "success": true
}
```

## 8. 点赞接口

### 8.1 点赞

`POST /api/v1/posts/:postId/like`

鉴权：是

```json
{
  "liked": true,
  "likeCount": 6
}
```

重复点赞返回 `409 已点赞`。

### 8.2 取消点赞

`DELETE /api/v1/posts/:postId/like`

鉴权：是

```json
{
  "liked": false,
  "likeCount": 5
}
```

没有点赞记录时返回 `404 未点赞`。

## 9. 评论接口

### 9.1 获取评论列表

`GET /api/v1/posts/:postId/comments`

鉴权：否

| 参数 | 类型 | 必填 | 默认值 |
| --- | --- | --- | --- |
| `page` | integer | 否 | `1` |
| `limit` | integer | 否 | `20` |

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 20
}
```

评论按创建时间正序排列。

### 9.2 发表评论或回复

`POST /api/v1/posts/:postId/comments`

鉴权：是

普通评论：

```json
{
  "content": "这里鱼口怎么样？"
}
```

回复评论：

```json
{
  "content": "下午口比较好",
  "parentId": "父评论 UUID",
  "replyToUserId": "被回复用户 UUID"
}
```

`content` 去除首尾空格后不能为空。

## 10. 图片上传接口

### 10.1 上传图片到腾讯云 COS

`POST /api/v1/upload/images`

鉴权：是

Content-Type：`multipart/form-data`

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `files` | File[] | 最多 3 张，每张最大 5 MB |

支持格式：`jpg`、`jpeg`、`png`、`webp`。

响应：

```json
{
  "urls": [
    "https://bucket.cos.ap-guangzhou.myqcloud.com/jh_chat/fishing/20260618/image.jpg"
  ],
  "keys": [
    "jh_chat/fishing/20260618/image.jpg"
  ]
}
```

对象路径规则：

```text
TENCENT_COS_PREFIX/YYYYMMDD/时间戳-随机数.扩展名
```

## 11. AI 接口

### 11.1 根据图片生成标题和正文

`POST /api/v1/ai/generate-caption`

鉴权：是

推荐请求体：

```json
{
  "imageUrl": "https://bucket.cos.ap-guangzhou.myqcloud.com/path/image.jpg"
}
```

为了兼容旧前端，当前还支持：

```json
{
  "url": "https://example.com/image.jpg",
  "urls": ["https://example.com/image.jpg"],
  "images": ["https://example.com/image.jpg"]
}
```

响应：

```json
{
  "title": "府河野钓收获满满",
  "content": "午后水面微风轻拂，鲫鱼接连咬钩，今天的垂钓体验十分惬意。"
}
```

未传图片返回 `400 imageUrl 是必需的`。阿里模型调用失败时，当前服务会返回默认文案而不是 500。

## 12. 草稿接口

三个接口均需要登录。

### 12.1 获取草稿

`GET /api/v1/drafts`

无草稿时返回 `null`。

### 12.2 保存草稿

`POST /api/v1/drafts`

```json
{
  "spotId": "spot-uuid",
  "spot": {},
  "title": "草稿标题",
  "content": "草稿正文",
  "images": ["https://example.com/image.jpg"],
  "fishCategories": ["鲫鱼"],
  "spotEvaluation": "野钓"
}
```

只保存合法的 `http/https` 图片地址。Redis 缓存有效期为 24 小时，同时写入 MySQL。

### 12.3 清空草稿

`DELETE /api/v1/drafts`

```json
{
  "success": true
}
```

## 13. 标签接口

### 13.1 获取鱼获类别

`GET /api/v1/tags/fish-categories`

鉴权：否

```json
[
  {
    "name": "鲫鱼",
    "display": "#鲫鱼"
  }
]
```

### 13.2 获取钓点评价

`GET /api/v1/tags/spot-evaluations`

鉴权：否

```json
[
  {
    "name": "野钓",
    "display": "#野钓"
  }
]
```

## 14. 收藏接口

收藏数据当前存储在 Redis。

### 14.1 收藏钓点

`POST /api/v1/favorites/:spotId`

鉴权：是

```json
{
  "favorited": true
}
```

### 14.2 取消收藏

`DELETE /api/v1/favorites/:spotId`

鉴权：是

```json
{
  "favorited": false
}
```

### 14.3 获取收藏钓点 ID

`GET /api/v1/favorites`

鉴权：是

```json
{
  "spotIds": ["spot-uuid-1", "spot-uuid-2"]
}
```

## 15. 通知接口

### 15.1 获取通知

`GET /api/v1/notifications`

鉴权：是

| 参数 | 类型 | 必填 | 默认值 |
| --- | --- | --- | --- |
| `page` | integer | 否 | `1` |

每页固定 20 条，数据来自 Redis：

```json
[
  {
    "type": "like",
    "data": {},
    "read": false,
    "createdAt": "2026-06-18T08:00:00.000Z"
  }
]
```

当前仅实现读取，没有已读、未读数量或删除接口。

## 16. 旧版搜索接口

### 16.1 搜索钓点

`GET /api/v1/search/spots`

鉴权：否

| 参数 | 类型 | 必填 |
| --- | --- | --- |
| `q` | string | 是 |
| `lat` | number | 是 |
| `lng` | number | 是 |

返回最多 20 条结果。

当前首页使用的是 `/api/v1/spots/search`。本接口仍使用 MySQL `ST_Distance_Sphere`，在部分数据库版本上可能不兼容，建议后续废弃或改为与新搜索接口相同的 Haversine 实现。

## 17. 接口总表

| 模块 | 方法 | 路径 | 登录 |
| --- | --- | --- | --- |
| 认证 | POST | `/api/v1/auth/register` | 否 |
| 认证 | POST | `/api/v1/auth/login` | 否 |
| 认证 | GET | `/api/v1/auth/me` | 是 |
| 认证 | POST | `/api/v1/auth/refresh` | 是 |
| 用户 | GET | `/api/v1/users/me` | 是 |
| 用户 | PUT | `/api/v1/users/me` | 是 |
| 钓点 | GET | `/api/v1/spots` | 否 |
| 钓点 | GET | `/api/v1/spots/nearby` | 否 |
| 钓点 | GET | `/api/v1/spots/water-candidates` | 否 |
| 钓点 | GET | `/api/v1/spots/search` | 否 |
| 钓点 | GET | `/api/v1/spots/water-search` | 否 |
| 钓点 | GET | `/api/v1/spots/user-candidates/validate` | 否 |
| 钓点 | POST | `/api/v1/spots/user-candidates` | 是 |
| 钓点 | GET | `/api/v1/spots/ip-location` | 否 |
| 钓点 | GET | `/api/v1/spots/:id` | 否 |
| 钓点 | POST | `/api/v1/spots` | 是 |
| 分享 | GET | `/api/v1/spots/:spotId/posts` | 否 |
| 分享 | GET | `/api/v1/posts/:id` | 否 |
| 分享 | POST | `/api/v1/posts` | 是 |
| 分享 | DELETE | `/api/v1/posts/:id` | 是 |
| 点赞 | POST | `/api/v1/posts/:postId/like` | 是 |
| 点赞 | DELETE | `/api/v1/posts/:postId/like` | 是 |
| 评论 | GET | `/api/v1/posts/:postId/comments` | 否 |
| 评论 | POST | `/api/v1/posts/:postId/comments` | 是 |
| 上传 | POST | `/api/v1/upload/images` | 是 |
| AI | POST | `/api/v1/ai/generate-caption` | 是 |
| 草稿 | GET | `/api/v1/drafts` | 是 |
| 草稿 | POST | `/api/v1/drafts` | 是 |
| 草稿 | DELETE | `/api/v1/drafts` | 是 |
| 标签 | GET | `/api/v1/tags/fish-categories` | 否 |
| 标签 | GET | `/api/v1/tags/spot-evaluations` | 否 |
| 收藏 | POST | `/api/v1/favorites/:spotId` | 是 |
| 收藏 | DELETE | `/api/v1/favorites/:spotId` | 是 |
| 收藏 | GET | `/api/v1/favorites` | 是 |
| 通知 | GET | `/api/v1/notifications` | 是 |
| 搜索 | GET | `/api/v1/search/spots` | 否 |

## 18. 当前实现注意事项

1. `POST /auth/refresh` 并没有单独校验 Refresh Token，目前仍使用 Bearer Token 通过 `JwtGuard`。
2. `POST /spots` 没有管理员角色校验，普通登录用户也能直接创建真实钓点。
3. 候选水域距离单位为米，真实钓点附近接口距离单位为公里，前端展示时需要区分。
4. 分享列表目前没有返回当前登录用户是否点赞，需要前端自行维护点赞状态或后端补充 `likedByMe`。
5. 评论创建时没有校验 `postId`、`parentId`、`replyToUserId` 是否真实存在。
6. 收藏和通知仅存 Redis，Redis 数据丢失后无法从 MySQL 恢复。
7. `GET /search/spots` 是旧接口，仍依赖 `ST_Distance_Sphere`。
8. Swagger 已启用，但 DTO 没有完整添加 `@ApiProperty`，本 Markdown 文档比当前 Swagger 展示更完整。
