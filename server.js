const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const nodemailer = require('nodemailer');

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件配置
app.use(cors({
  origin: ['https://tingwen44.github.io', 'https://wedding-invitation-vercel-nine.vercel.app', 'https://prismatic-dango-aba083.netlify.app', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));

// 处理 OPTIONS 预检请求
app.options('*', cors({
  origin: ['https://tingwen44.github.io', 'https://wedding-invitation-vercel-nine.vercel.app', 'https://prismatic-dango-aba083.netlify.app', 'http://localhost:3000', 'http://localhost:5173'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 内存中的数据存储（简单的数组）
let rsvpResponses = [];

console.log('开始初始化应用...');
console.log('PORT:', PORT);

// 邮件配置（使用环境变量）
let transporter = null;
if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });

  // 验证邮件配置
  transporter.verify((error, success) => {
    if (error) {
      console.log('邮件配置错误:', error);
    } else {
      console.log('邮件服务配置成功');
    }
  });
} else {
  console.log('未配置邮件服务（EMAIL_USER 或 EMAIL_PASSWORD 缺失）');
}

// API 路由

// 1. 提交 RSVP 表单
app.post('/api/rsvp/submit', (req, res) => {
  try {
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

    // 创建新的回复对象
    const newResponse = {
      id: rsvpResponses.length + 1,
      wedding_location,
      guest_name,
      guest_count,
      accompanying_guests: accompanying_guests || '',
      accommodation_dates: accommodation_dates || '',
      room_type: room_type || '',
      after_party: after_party ? 1 : 0,
      dietary_restrictions: dietary_restrictions || '',
      special_requests: special_requests || '',
      created_at: new Date().toISOString(),
      ip_address,
      user_agent
    };

    // 添加到内存存储
    rsvpResponses.push(newResponse);
    console.log('新的 RSVP 回复已保存:', newResponse.id);

    // 发送确认邮件给宾客
    if (transporter && process.env.GUEST_EMAIL) {
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
          console.log('宾客确认邮件已发送');
        }
      });
    }

    // 发送通知邮件给新人
    if (transporter && process.env.OWNER_EMAIL) {
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
          <p><strong>回复 ID：</strong> ${newResponse.id}</p>
        `
      };

      transporter.sendMail(ownerMailOptions, (error, info) => {
        if (error) {
          console.log('发送新人邮件失败:', error);
        } else {
          console.log('新人通知邮件已发送');
        }
      });
    }

    res.json({
      success: true,
      message: '感谢您的回复！我们已经收到您的信息。',
      response_id: newResponse.id
    });
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
    // 获取分页参数
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 10;
    const days = parseInt(req.query.days) || 90; // 默认最近 90 天（3 个月）
    
    // 计算时间范围
    const now = new Date();
    const threeMonthsAgo = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    
    // 过滤最近 N 天的数据
    const filteredData = rsvpResponses.filter(response => {
      const responseDate = new Date(response.created_at);
      return responseDate >= threeMonthsAgo;
    });
    
    // 按时间倒序排列
    const sortedData = filteredData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    // 计算分页
    const total = sortedData.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const pageData = sortedData.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      total: total,
      totalPages: totalPages,
      currentPage: page,
      pageSize: pageSize,
      data: pageData
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
    const stats = {};
    rsvpResponses.forEach(response => {
      if (!stats[response.wedding_location]) {
        stats[response.wedding_location] = {
          wedding_location: response.wedding_location,
          count: 0,
          total_guests: 0
        };
      }
      stats[response.wedding_location].count++;
      stats[response.wedding_location].total_guests += response.guest_count;
    });

    res.json({
      success: true,
      data: Object.values(stats)
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
    // 生成 CSV
    const csv = [
      ['ID', '婚礼地点', '宾客姓名', '参与人数', '随行人员', '住宿日期', '房型', '晚间聚会', '饮食限制', '特殊需求', '提交时间'].join(',')
    ];

    rsvpResponses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).forEach(row => {
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
    totalResponses: rsvpResponses.length
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`婚礼邀请函后端服务器运行在 http://localhost:${PORT}`);
  console.log(`提交 RSVP: POST ${PORT}/api/rsvp/submit`);
  console.log(`查看回复: GET ${PORT}/api/rsvp/list?token=YOUR_ADMIN_TOKEN`);
  console.log(`查看统计: GET ${PORT}/api/rsvp/stats?token=YOUR_ADMIN_TOKEN`);
  console.log(`导出数据: GET ${PORT}/api/rsvp/export?token=YOUR_ADMIN_TOKEN`);
  console.log(`健康检查: GET ${PORT}/api/health`);
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭...');
  process.exit(0);
});

// 未捕获的异常处理
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
  process.exit(1);
});
