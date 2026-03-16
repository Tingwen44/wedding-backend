const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const initSqlJs = require('sql.js');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
  origin: ['https://tingwen44.github.io', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 数据库初始化
const dbPath = path.join(__dirname, 'wedding_data.db');
let db = null;
let SQL = null;

// 初始化 SQL.js 和数据库
async function initializeDatabase() {
  try {
    SQL = await initSqlJs();
    
    // 尝试从文件加载现有数据库
    let data = null;
    if (fs.existsSync(dbPath)) {
      data = fs.readFileSync(dbPath);
    }
    
    // 创建或加载数据库
    if (data) {
      db = new SQL.Database(data);
    } else {
      db = new SQL.Database();
    }
    
    console.log('数据库连接成功');
    
    // 创建表
    try {
      db.run(`
        CREATE TABLE IF NOT EXISTS rsvp_responses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          wedding_location TEXT NOT NULL,
          guest_name TEXT NOT NULL,
          guest_count INTEGER NOT NULL,
          accompanying_guests TEXT,
          accommodation_dates TEXT,
          room_type TEXT,
          after_party BOOLEAN,
          dietary_restrictions TEXT,
          special_requests TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          ip_address TEXT,
          user_agent TEXT
        )
      `);
      console.log('RSVP 表创建成功或已存在');
      saveDatabase();
    } catch (err) {
      console.error('创建表失败:', err);
    }
  } catch (err) {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  }
}

// 保存数据库到文件
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// 邮件配置（使用环境变量）
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// 验证邮件配置
if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  transporter.verify((error, success) => {
    if (error) {
      console.log('邮件配置错误:', error);
    } else {
      console.log('邮件服务配置成功');
    }
  });
}

// API 路由

// 1. 提交 RSVP 表单
app.post('/api/rsvp/submit', (req, res) => {
  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: '数据库未初始化'
      });
    }

    const {
      wedding_location,
      guest_name,
      guest_count,
      accompanying_guests,
      accommodation_dates,
      room_type,
      after_party,
      dietary_restrictions,
      special_requests
    } = req.body;

    // 数据验证
    if (!wedding_location || !guest_name || !guest_count) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段'
      });
    }

    // 获取客户端 IP 和 User-Agent
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('user-agent');

    // 插入数据库
    try {
      db.run(`
        INSERT INTO rsvp_responses (
          wedding_location, guest_name, guest_count, accompanying_guests,
          accommodation_dates, room_type, after_party, dietary_restrictions,
          special_requests, ip_address, user_agent
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        wedding_location,
        guest_name,
        guest_count,
        accompanying_guests || '',
        accommodation_dates || '',
        room_type || '',
        after_party ? 1 : 0,
        dietary_restrictions || '',
        special_requests || '',
        ip_address,
        user_agent
      ]);

      // 获取插入的 ID
      const result = db.exec('SELECT last_insert_rowid() as id');
      const response_id = result[0] ? result[0].values[0][0] : null;

      // 保存数据库
      saveDatabase();

      // 发送确认邮件给宾客
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
        const guestMailOptions = {
          from: process.env.EMAIL_USER,
          to: process.env.GUEST_EMAIL || guest_name + '@example.com',
          subject: '婚礼邀请函 - 回复确认',
          html: `
            <h2>感谢您的回复！</h2>
            <p>亲爱的 ${guest_name}，</p>
            <p>我们已经收到您的婚礼邀请函回复。以下是您的回复信息：</p>
            <ul>
              <li><strong>参加婚礼：</strong> ${wedding_location}</li>
              <li><strong>参与人数：</strong> ${guest_count} 人</li>
              <li><strong>随行人员：</strong> ${accompanying_guests || '无'}</li>
              <li><strong>住宿日期：</strong> ${accommodation_dates || '不需要'}</li>
              <li><strong>房型：</strong> ${room_type || '无'}</li>
              <li><strong>晚间聚会：</strong> ${after_party ? '参加' : '不参加'}</li>
              <li><strong>饮食限制：</strong> ${dietary_restrictions || '无'}</li>
              <li><strong>特殊需求：</strong> ${special_requests || '无'}</li>
            </ul>
            <p>如有任何问题，请联系我们。</p>
            <p>管廷文 & 王昕</p>
          `
        };

        transporter.sendMail(guestMailOptions, (error, info) => {
          if (error) {
            console.log('发送宾客邮件失败:', error);
          } else {
            console.log('宾客确认邮件已发送:', info.response);
          }
        });
      }

      // 发送通知邮件给新人
      if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD && process.env.OWNER_EMAIL) {
        const ownerMailOptions = {
          from: process.env.EMAIL_USER,
          to: process.env.OWNER_EMAIL,
          subject: `新的婚礼回复 - ${guest_name}`,
          html: `
            <h2>新的婚礼邀请函回复</h2>
            <p><strong>宾客姓名：</strong> ${guest_name}</p>
            <p><strong>参加婚礼：</strong> ${wedding_location}</p>
            <p><strong>参与人数：</strong> ${guest_count} 人</p>
            <p><strong>随行人员：</strong> ${accompanying_guests || '无'}</p>
            <p><strong>住宿日期：</strong> ${accommodation_dates || '不需要'}</p>
            <p><strong>房型：</strong> ${room_type || '无'}</p>
            <p><strong>晚间聚会：</strong> ${after_party ? '参加' : '不参加'}</p>
            <p><strong>饮食限制：</strong> ${dietary_restrictions || '无'}</p>
            <p><strong>特殊需求：</strong> ${special_requests || '无'}</p>
            <p><strong>提交时间：</strong> ${new Date().toLocaleString('zh-CN')}</p>
            <p><strong>回复 ID：</strong> ${response_id}</p>
          `
        };

        transporter.sendMail(ownerMailOptions, (error, info) => {
          if (error) {
            console.log('发送新人邮件失败:', error);
          } else {
            console.log('新人通知邮件已发送:', info.response);
          }
        });
      }

      res.json({
        success: true,
        message: '感谢您的回复！我们已经收到您的信息。',
        response_id: response_id
      });
    } catch (dbErr) {
      console.error('插入数据失败:', dbErr);
      return res.status(500).json({
        success: false,
        message: '保存数据失败'
      });
    }
  } catch (error) {
    console.error('处理请求出错:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
});

// 2. 获取所有 RSVP 回复（需要认证）
app.get('/api/rsvp/list', (req, res) => {
  // 简单的认证检查（生产环境应使用更安全的方法）
  const auth_token = req.query.token || req.headers['authorization'];
  
  if (auth_token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({
      success: false,
      message: '未授权'
    });
  }

  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: '数据库未初始化'
      });
    }

    const result = db.exec('SELECT * FROM rsvp_responses ORDER BY created_at DESC');
    const rows = [];
    
    if (result.length > 0) {
      const columns = result[0].columns;
      result[0].values.forEach(row => {
        const obj = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        rows.push(obj);
      });
    }

    res.json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (err) {
    console.error('查询错误:', err);
    res.status(500).json({
      success: false,
      message: '查询失败'
    });
  }
});

// 3. 获取统计信息
app.get('/api/rsvp/stats', (req, res) => {
  const auth_token = req.query.token || req.headers['authorization'];
  
  if (auth_token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({
      success: false,
      message: '未授权'
    });
  }

  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: '数据库未初始化'
      });
    }

    const result = db.exec(`
      SELECT 
        wedding_location,
        COUNT(*) as count,
        SUM(guest_count) as total_guests
      FROM rsvp_responses
      GROUP BY wedding_location
    `);

    const rows = [];
    if (result.length > 0) {
      const columns = result[0].columns;
      result[0].values.forEach(row => {
        const obj = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        rows.push(obj);
      });
    }

    res.json({
      success: true,
      data: rows
    });
  } catch (err) {
    console.error('查询错误:', err);
    res.status(500).json({
      success: false,
      message: '查询失败'
    });
  }
});

// 4. 导出 CSV 数据
app.get('/api/rsvp/export', (req, res) => {
  const auth_token = req.query.token || req.headers['authorization'];
  
  if (auth_token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({
      success: false,
      message: '未授权'
    });
  }

  try {
    if (!db) {
      return res.status(503).json({
        success: false,
        message: '数据库未初始化'
      });
    }

    const result = db.exec('SELECT * FROM rsvp_responses ORDER BY created_at DESC');
    const rows = [];
    
    if (result.length > 0) {
      const columns = result[0].columns;
      result[0].values.forEach(row => {
        const obj = {};
        columns.forEach((col, idx) => {
          obj[col] = row[idx];
        });
        rows.push(obj);
      });
    }

    // 生成 CSV
    const csv = [
      ['ID', '婚礼地点', '宾客姓名', '参与人数', '随行人员', '住宿日期', '房型', '晚间聚会', '饮食限制', '特殊需求', '提交时间'].join(',')
    ];

    rows.forEach(row => {
      csv.push([
        row.id,
        row.wedding_location,
        row.guest_name,
        row.guest_count,
        row.accompanying_guests,
        row.accommodation_dates,
        row.room_type,
        row.after_party ? '是' : '否',
        row.dietary_restrictions,
        row.special_requests,
        row.created_at
      ].join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=wedding_rsvp.csv');
    res.send('\ufeff' + csv.join('\n'));
  } catch (err) {
    console.error('查询错误:', err);
    res.status(500).json({
      success: false,
      message: '查询失败'
    });
  }
});

// 5. 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString(),
    dbStatus: db ? '已连接' : '未连接'
  });
});

// 启动服务器
async function startServer() {
  await initializeDatabase();
  
  app.listen(PORT, () => {
    console.log(`婚礼邀请函后端服务器运行在 http://localhost:${PORT}`);
    console.log(`提交 RSVP: POST ${PORT}/api/rsvp/submit`);
    console.log(`查看回复: GET ${PORT}/api/rsvp/list?token=YOUR_ADMIN_TOKEN`);
    console.log(`查看统计: GET ${PORT}/api/rsvp/stats?token=YOUR_ADMIN_TOKEN`);
    console.log(`导出数据: GET ${PORT}/api/rsvp/export?token=YOUR_ADMIN_TOKEN`);
  });
}

// 优雅关闭
process.on('SIGINT', () => {
  try {
    saveDatabase();
    console.log('数据库已保存并关闭');
  } catch (err) {
    console.error('关闭数据库出错:', err);
  }
  process.exit(0);
});

// 启动应用
startServer().catch(err => {
  console.error('启动服务器失败:', err);
  process.exit(1);
});
