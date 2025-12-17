# Storage RLS 策略配置指南

## 问题描述
后台上传图片时出现错误：`new row violates row-level security policy`

这是因为 Supabase Storage 的行级安全策略（RLS）还没有配置。

## 解决方案

### 方法 1：使用 Supabase CLI（推荐）

1. 确保已安装 Supabase CLI：
```bash
npm install -g supabase
```

2. 链接到你的 Supabase 项目：
```bash
supabase link --project-ref <你的项目ID>
```

3. 应用迁移：
```bash
supabase db push
```

### 方法 2：在 Supabase Dashboard 中手动执行

1. 登录到 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目
3. 进入 **SQL Editor**
4. 打开 `supabase/migrations/002_storage_policies.sql` 文件
5. 复制全部内容
6. 粘贴到 SQL Editor 中
7. 点击 **Run** 执行

### 方法 3：直接在本地 Supabase 开发环境执行

如果你使用的是本地 Supabase 开发环境：

```bash
supabase start
supabase db reset
```

## 迁移文件说明

`002_storage_policies.sql` 迁移文件包含以下配置：

### 创建的存储桶：
- **products**: 产品相关图片（封面、图库、媒体模块）
- **downloads**: 下载文件（固件、驱动、手册等）
- **news**: 新闻封面图片
- **general**: 通用文件（轮播图、图标等）

### RLS 策略：
- **读取权限**: 所有人都可以读取（公开访问）
- **写入权限**: 仅认证的活跃管理员可以上传、更新和删除文件

## 验证配置

执行迁移后，可以在 Supabase Dashboard 中验证：

1. 进入 **Storage** 页面
2. 检查是否存在 4 个存储桶：products, downloads, news, general
3. 点击每个存储桶的 **Policies** 标签
4. 确认每个桶都有 4 条策略：read_all, admin_insert, admin_update, admin_delete

## 测试上传

配置完成后，在后台管理系统中：

1. 登录管理员账号
2. 尝试上传产品封面图片
3. 应该可以成功上传，不再出现 RLS 错误

## 故障排查

如果仍然遇到问题：

1. **检查管理员账号**：确保你的账号在 `admin_users` 表中，且 `is_active = true`
2. **检查认证状态**：确保已成功登录，`auth.uid()` 能正确返回用户 ID
3. **查看错误日志**：在浏览器开发者工具的 Console 中查看详细错误信息
4. **检查存储桶配置**：确认存储桶的 `public` 属性为 `true`

## 相关文件

- `supabase/migrations/001_initial_schema.sql` - 初始数据库架构
- `supabase/migrations/002_storage_policies.sql` - Storage RLS 策略配置
- `src/lib/supabase.js` - Supabase 客户端配置

