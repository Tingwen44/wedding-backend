# 婚礼邀请函表单后端

这是一个 Node.js + Express + SQLite 的婚礼邀请函表单数据收集后端，用于收集宾客的 RSVP 回复。

## 功能特性

✅ **表单数据收集** - 安全接收和存储表单数据
✅ **数据库存储** - 使用 SQLite 本地存储数据
✅ **邮件通知** - 自动发送确认邮件给宾客和新人
✅ **数据管理 API** - 查看、统计和导出 RSVP 回复
✅ **CORS 支持** - 支持跨域请求
✅ **数据验证** - 表单数据验证和错误处理

## 快速开始

### 1. 安装依赖

```bash
cd /home/ubuntu/wedding-backend
npm install
```

### 2. 配置环境变量

编辑 `.env` 文件，设置以下变量：

```env
# 服务器配置
PORT=3001

# 邮件配置（可选）
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
OWNER_EMAIL=tingwen@example.com
GUEST_EMAIL=guest@example.com

# 管理员认证令牌
ADMIN_TOKEN=your-secret-admin-token-change-this
```

#### 配置 Gmail 邮件服务

1. 访问 [Google Account Security](https://myaccount.google.com/security)
2. 启用 **"两步验证"**
3. 生成 **"应用密码"**
4. 将应用密码填入 `.env` 文件中的 `EMAIL_PASSWORD`

### 3. 启动服务器

```bash
npm start
```

服务器将运行在 `http://localhost:3001`

## API 文档

### 1. 提交 RSVP 表单

**请求：**
```
POST /api/rsvp/submit
Content-Type: application/json

{
  "wedding_location": "山西晋城 - 凤城国际康养中心 (05.01)",
  "guest_name": "张三",
  "guest_count": 2,
  "accompanying_guests": "李四",
  "accommodation_dates": "4月30日 (晋城), 5月1日 (晋城)",
  "room_type": "大床房",
  "after_party": true
}
```

**响应：**
```json
{
  "success": true,
  "message": "感谢您的回复！我们已经收到您的信息。",
  "response_id": 1
}
```

### 2. 获取所有 RSVP 回复

**请求：**
```
GET /api/rsvp/list?token=YOUR_ADMIN_TOKEN
```

**响应：**
```json
{
  "success": true,
  "total": 10,
  "data": [
    {
      "id": 1,
      "wedding_location": "山西晋城 - 凤城国际康养中心 (05.01)",
      "guest_name": "张三",
      "guest_count": 2,
      "accompanying_guests": "李四",
      "accommodation_dates": "4月30日 (晋城), 5月1日 (晋城)",
      "room_type": "大床房",
      "after_party": 1,
      "created_at": "2026-03-16 12:00:00"
    }
  ]
}
```

### 3. 获取统计信息

**请求：**
```
GET /api/rsvp/stats?token=YOUR_ADMIN_TOKEN
```

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "wedding_location": "山西晋城 - 凤城国际康养中心 (05.01)",
      "count": 5,
      "total_guests": 12
    },
    {
      "wedding_location": "山东诸城 - 蓝海大酒店 (05.04)",
      "count": 3,
      "total_guests": 8
    }
  ]
}
```

### 4. 导出 CSV 数据

**请求：**
```
GET /api/rsvp/export?token=YOUR_ADMIN_TOKEN
```

**响应：** CSV 文件下载

### 5. 健康检查

**请求：**
```
GET /api/health
```

**响应：**
```json
{
  "success": true,
  "message": "服务器运行正常",
  "timestamp": "2026-03-16T12:00:00.000Z"
}
```

## 前端集成

### 方法 1：使用提供的 HTML 示例

打开 `frontend-integration.html` 文件，修改 `BACKEND_URL` 变量指向您的后端服务器：

```javascript
const BACKEND_URL = 'http://localhost:3001'; // 本地开发
// const BACKEND_URL = 'https://your-backend-domain.com'; // 生产环境
```

### 方法 2：在现有网站中集成

在您的网站表单中添加以下 JavaScript 代码：

```javascript
// 配置后端 URL
const BACKEND_URL = 'http://localhost:3001';

// 表单提交处理
document.getElementById('rsvpForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData(e.target);
  const data = {
    wedding_location: formData.get('wedding_location'),
    guest_name: formData.get('guest_name'),
    guest_count: parseInt(formData.get('guest_count')),
    accompanying_guests: formData.get('accompanying_guests'),
    accommodation_dates: Array.from(formData.getAll('accommodation_dates')).join(', '),
    room_type: formData.get('room_type'),
    after_party: formData.get('after_party') === 'yes'
  };

  try {
    const response = await fetch(`${BACKEND_URL}/api/rsvp/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.success) {
      alert(result.message);
      e.target.reset();
    } else {
      alert(result.message || '提交失败');
    }
  } catch (error) {
    alert('网络错误，请检查后端服务器');
    console.error('错误:', error);
  }
});
```

## 部署指南

### 部署到 Heroku

1. 创建 Heroku 账户并安装 Heroku CLI
2. 在项目根目录运行：

```bash
heroku login
heroku create your-app-name
git push heroku main
```

3. 设置环境变量：

```bash
heroku config:set EMAIL_USER=your-email@gmail.com
heroku config:set EMAIL_PASSWORD=your-app-password
heroku config:set ADMIN_TOKEN=your-secret-token
```

### 部署到 Railway

1. 访问 [Railway.app](https://railway.app)
2. 连接 GitHub 仓库
3. 设置环境变量
4. 自动部署

### 部署到 Render

1. 访问 [Render.com](https://render.com)
2. 创建新的 Web Service
3. 连接 GitHub 仓库
4. 设置环境变量和启动命令：`npm start`

### 部署到自己的服务器

1. 安装 Node.js 和 npm
2. 克隆项目到服务器
3. 安装依赖：`npm install`
4. 配置环境变量
5. 使用 PM2 管理进程：

```bash
npm install -g pm2
pm2 start server.js --name "wedding-backend"
pm2 startup
pm2 save
```

6. 配置 Nginx 反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 数据库

数据存储在 SQLite 数据库中，文件位置：`wedding_data.db`

### 数据库表结构

```sql
CREATE TABLE rsvp_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wedding_location TEXT NOT NULL,
  guest_name TEXT NOT NULL,
  guest_count INTEGER NOT NULL,
  accompanying_guests TEXT,
  accommodation_dates TEXT,
  room_type TEXT,
  after_party BOOLEAN,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT
)
```

## 安全建议

1. **更改 ADMIN_TOKEN** - 生成一个强密码的令牌
2. **使用 HTTPS** - 在生产环境中使用 HTTPS
3. **限制 CORS** - 只允许您的网站域名访问
4. **备份数据** - 定期备份 SQLite 数据库
5. **隐藏 .env 文件** - 不要将 `.env` 文件提交到 Git

## 常见问题

### Q: 如何修改表单字段？
A: 编辑 `server.js` 中的数据库表结构和 API 路由，然后更新前端表单。

### Q: 如何查看已收集的数据？
A: 访问 `/api/rsvp/list?token=YOUR_ADMIN_TOKEN` 查看所有回复。

### Q: 如何导出数据到 Excel？
A: 访问 `/api/rsvp/export?token=YOUR_ADMIN_TOKEN` 下载 CSV 文件，然后在 Excel 中打开。

### Q: 邮件发送失败怎么办？
A: 检查 `.env` 文件中的邮件配置，确保已生成 Gmail 应用密码。

## 技术栈

- **Node.js** - JavaScript 运行时
- **Express** - Web 框架
- **SQLite** - 数据库
- **Nodemailer** - 邮件服务
- **CORS** - 跨域资源共享
- **dotenv** - 环境变量管理

## 许可证

ISC

## 支持

如有问题，请查看日志或联系开发者。
