# Aune Audio CMS

高端音频设备企业官网内容管理系统

## 技术栈

- **前端框架**: Vue 3 (Composition API + Script Setup)
- **构建工具**: Vite 5
- **状态管理**: Pinia
- **路由**: Vue Router 4
- **样式**: Tailwind CSS 3
- **UI 组件**: Headless UI
- **富文本编辑器**: Tiptap
- **图表**: ECharts
- **后端服务**: Supabase (PostgreSQL, Auth, Storage)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env` 文件：

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. 初始化数据库

在 Supabase 控制台执行以下迁移文件：

1. `supabase/migrations/001_initial_schema.sql` - 数据库表和基础 RLS 策略
2. `supabase/migrations/002_storage_policies.sql` - Storage 存储桶和 RLS 策略

**重要**: 必须执行 `002_storage_policies.sql` 才能在后台上传图片和文件，否则会报 RLS 错误。

详细配置说明请参考 [STORAGE_SETUP.md](./STORAGE_SETUP.md)

### 4. 启动开发服务器

```bash
npm run dev
```

### 5. 构建生产版本

```bash
npm run build
```

## 项目结构

```
src/
├── assets/              # 静态资源
│   └── styles/          # 全局样式
├── components/          # 通用组件
│   ├── admin/           # 后台组件
│   └── layout/          # 布局组件
├── composables/         # 组合式函数
├── layouts/             # 页面布局
├── lib/                 # 工具库
├── router/              # 路由配置
├── stores/              # Pinia 状态
└── views/               # 页面视图
    └── admin/           # 后台页面
```

## 功能模块

### 前台

- **首页**: 轮播图、视频模块、热门商品
- **产品详情页**: 视频预览、滚动动画、Tab切换
- **下载中心**: 固件/驱动/说明书下载
- **新闻资讯**: 新闻列表和详情
- **静态页面**: 服务支持、荣誉墙、经销商等

### 后台

- **数据看板**: PV/UV 统计、访问记录
- **产品管理**: CRUD、图片上传、视频设置、图文模块
- **下载资源管理**: 文件上传、富文本描述、关联产品
- **新闻管理**: 新闻发布与编辑
- **页面管理**: 静态页面编辑
- **站点配置**: 导航栏、页脚、轮播图配置
- **个人设置**: MFA 双因素认证

## 安全特性

- **MFA 双因素认证**: 管理员登录需验证 Google Authenticator
- **Row Level Security**: 数据库行级安全策略
- **路由守卫**: 前端路由权限验证

## 部署

### Vercel

```bash
npm run build
# 上传 dist 目录到 Vercel
```

### Nginx

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass https://your-supabase-url.supabase.co;
    }
}
```

## 开发说明

### 商品详情页视频逻辑

1. 后台上传视频后，前端默认静音循环播放前 5 秒
2. 用户点击"观看视频"后，重置时间、取消静音、播放完整视频
3. 视频播放完毕后自动返回预览模式

### 滚动动画逻辑

- 图片: 从 `scale(0.8)` 放大至 `scale(1.0)`
- 文字: 根据位置（左/中/右）从对应方向淡入

### IP 访问记录

- 使用路由守卫 `afterEach` 自动记录访问
- 通过外部 API 获取客户端 IP
- 记录页面 URL、User-Agent、设备类型等

## License

MIT
