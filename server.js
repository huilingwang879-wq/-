const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 内存数据存储（实际生产环境应该用数据库）
let appData = {
  matchInfo: {
    name: '篮球友谊赛',
    date: '2026-03-25',
    venue: '学校体育馆'
  },
  maxPlayers: 20,
  players: {
    redBlack: [],
    whiteBlue: []
  },
  playerStats: {},
  matchHistory: [],
  admins: [],
  playerBehavior: {},
  registeredUsers: [],
  userSessions: [],
  pendingApprovals: []
};

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// 获取数据
app.get('/api/data', (req, res) => {
  res.json(appData);
});

// 保存数据
app.post('/api/data', (req, res) => {
  appData = { ...appData, ...req.body };
  res.json({ success: true, message: '数据已保存' });
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 首页
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
