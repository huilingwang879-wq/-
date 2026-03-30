// JSONBin 配置
const JSONBIN_API_KEY = '$2a$10$/hG.y3ytVQkHOqxQFDVp9.bwV8YnzrIsnZzvNwcpMuduOkUAnYmQK';
const JSONBIN_BIN_ID = '69c9f239856a682189deb25b';
const JSONBIN_URL = `https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`;

// 数据存储
const Storage = {
  get(key) {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(key);
  }
};

// 全局数据
let AppData = {
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

// 从 JSONBin 加载数据
async function loadDataFromServer() {
  try {
    const response = await fetch(`${JSONBIN_URL}/latest`, {
      headers: {
        'X-Master-Key': JSONBIN_API_KEY
      }
    });
    if (response.ok) {
      const result = await response.json();
      if (result.record) {
        AppData = { ...AppData, ...result.record };
        console.log('从云端加载数据成功');
        return true;
      }
    }
  } catch (error) {
    console.error('加载数据失败:', error);
  }
  // 回退到本地存储
  const saved = Storage.get('basketballData');
  if (saved) {
    Object.assign(AppData, saved);
  }
  return false;
}

// 保存数据到 JSONBin
async function saveDataToServer() {
  try {
    const response = await fetch(JSONBIN_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY
      },
      body: JSON.stringify(AppData)
    });
    if (response.ok) {
      console.log('数据已同步到云端');
      return true;
    }
  } catch (error) {
    console.error('保存数据失败:', error);
  }
  return false;
}

// 初始化数据
async function initData() {
  await loadDataFromServer();
}

function saveData() {
  // 保存到本地
  Storage.set('basketballData', AppData);
  // 保存到云端
  saveDataToServer();
}

// 生成随机token
function generateToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 检查是否已登录
function checkLogin() {
  const userInfo = Storage.get('userInfo');
  const sessionToken = Storage.get('sessionToken');
  
  if (userInfo && sessionToken) {
    const session = AppData.userSessions.find(
      s => s.token === sessionToken && s.name === userInfo.name
    );
    
    if (session && new Date(session.expireTime) > new Date()) {
      showMainPage();
      return true;
    } else {
      Storage.remove('sessionToken');
    }
  }
  return false;
}

// 切换面板
function switchPanel(panel) {
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  document.getElementById(panel + '-panel').classList.remove('hidden');
  hideError();
}

// 显示/隐藏错误
function showError(msg) {
  const errorEl = document.getElementById('error-msg');
  errorEl.textContent = msg;
  errorEl.classList.remove('hidden');
}

function hideError() {
  document.getElementById('error-msg').classList.add('hidden');
}

// 显示主页面
function showMainPage() {
  document.getElementById('auth-page').classList.add('hidden');
  document.getElementById('main-page').classList.remove('hidden');
  loadSignupPage();
}

// 显示登录页面
function showAuthPage() {
  document.getElementById('main-page').classList.add('hidden');
  document.getElementById('auth-page').classList.remove('hidden');
  switchPanel('login');
}

// 登录
function login() {
  const name = document.getElementById('login-name').value.trim();
  const password = document.getElementById('login-password').value;
  const remember = document.getElementById('remember-password').checked;
  
  if (!name) {
    showError('请输入姓名');
    return;
  }
  if (!password) {
    showError('请输入密码');
    return;
  }
  
  const user = AppData.registeredUsers.find(u => u.name === name);
  
  if (!user) {
    showError('用户不存在，请先注册');
    return;
  }
  
  if (user.status !== 'approved') {
    if (user.status === 'pending') {
      showError('账号正在审核中，请等待管理员批准');
    } else {
      showError('注册申请已被拒绝，请联系管理员');
    }
    return;
  }
  
  if (user.password !== password) {
    showError('密码错误');
    return;
  }
  
  // 登录成功
  const userInfo = { name: user.name, defaultTeam: user.defaultTeam };
  const sessionToken = generateToken();
  
  AppData.userSessions.push({
    token: sessionToken,
    name: user.name,
    loginTime: new Date().toISOString(),
    expireTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });
  saveData();
  
  Storage.set('userInfo', userInfo);
  Storage.set('sessionToken', sessionToken);
  
  if (remember) {
    Storage.set('rememberedLogin', { name, password });
  } else {
    Storage.remove('rememberedLogin');
  }
  
  showMainPage();
}

// 注册
function register() {
  const name = document.getElementById('register-name').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;
  const team = document.querySelector('input[name="register-team"]:checked').value;
  
  if (!name) {
    showError('请输入姓名');
    return;
  }
  if (!password) {
    showError('请输入密码');
    return;
  }
  if (!confirm) {
    showError('请确认密码');
    return;
  }
  
  const passwordRegex = /^\d{6}$/;
  if (!passwordRegex.test(password)) {
    showError('密码必须为6位数字');
    return;
  }
  
  if (password !== confirm) {
    showError('两次输入的密码不一致');
    return;
  }
  
  if (AppData.registeredUsers.some(u => u.name === name)) {
    showError('该姓名已被注册');
    return;
  }
  
  const newUser = {
    name,
    defaultTeam: team,
    password,
    status: 'pending',
    registerTime: new Date().toISOString()
  };
  
  AppData.registeredUsers.push(newUser);
  AppData.pendingApprovals.push({
    name,
    defaultTeam: team,
    registerTime: newUser.registerTime
  });
  saveData();
  
  // 第一个用户自动成为管理员
  if (AppData.registeredUsers.length === 1) {
    newUser.status = 'approved';
    AppData.admins.push({ name, addTime: new Date().toISOString() });
    AppData.pendingApprovals = AppData.pendingApprovals.filter(p => p.name !== name);
    saveData();
    
    alert('您是第一个注册用户，已自动成为管理员并批准登录。');
    document.getElementById('login-name').value = name;
    document.getElementById('login-password').value = password;
    switchPanel('login');
  } else {
    alert('注册申请已提交，请等待管理员审核，审核通过后即可登录。');
    switchPanel('login');
  }
}

// 退出登录
function logout() {
  if (!confirm('确定要退出登录吗？')) return;
  
  const sessionToken = Storage.get('sessionToken');
  AppData.userSessions = AppData.userSessions.filter(s => s.token !== sessionToken);
  saveData();
  
  Storage.remove('userInfo');
  Storage.remove('sessionToken');
  showAuthPage();
}

// 加载记住的密码
function loadRememberedPassword() {
  const remembered = Storage.get('rememberedLogin');
  if (remembered) {
    document.getElementById('login-name').value = remembered.name || '';
    document.getElementById('login-password').value = remembered.password || '';
    document.getElementById('remember-password').checked = true;
  }
}

// ==================== 报名页面 ====================

function loadSignupPage() {
  const userInfo = Storage.get('userInfo');
  if (!userInfo) {
    showAuthPage();
    return;
  }
  
  // 更新比赛信息
  document.getElementById('match-name').textContent = AppData.matchInfo.name;
  document.getElementById('match-date').textContent = '📅 ' + AppData.matchInfo.date;
  document.getElementById('match-venue').textContent = '📍 ' + AppData.matchInfo.venue;
  
  // 检查报名截止时间
  const isClosed = isSignupClosed();
  const deadline = getDeadlineString();
  document.getElementById('deadline-info').textContent = 
    isClosed ? '报名已截止' : `报名截止：${deadline}`;
  
  // 检查是否已报名
  const redBlackIndex = AppData.players.redBlack.findIndex(p => p.name === userInfo.name);
  const whiteBlueIndex = AppData.players.whiteBlue.findIndex(p => p.name === userInfo.name);
  
  const hasSignedUp = redBlackIndex !== -1 || whiteBlueIndex !== -1;
  const myTeam = redBlackIndex !== -1 ? 'redBlack' : (whiteBlueIndex !== -1 ? 'whiteBlue' : '');
  
  // 检查是否被限制
  const isRestricted = isUserRestricted(userInfo.name);
  const restrictionWarning = document.getElementById('restriction-warning');
  
  if (isRestricted) {
    restrictionWarning.classList.remove('hidden');
    const behavior = AppData.playerBehavior[userInfo.name];
    const currentYear = new Date().getFullYear();
    const endTime = behavior[currentYear].restrictionEndTime;
    const days = Math.ceil((new Date(endTime) - new Date()) / (1000 * 60 * 60 * 24));
    document.getElementById('restriction-detail').textContent = 
      `限制结束时间：${new Date(endTime).toLocaleDateString()}（还剩${days}天）`;
  } else {
    restrictionWarning.classList.add('hidden');
  }
  
  // 显示/隐藏报名表单
  const signupForm = document.getElementById('signup-form');
  const mySignup = document.getElementById('my-signup');
  const signupClosed = document.getElementById('signup-closed');
  
  // 重置所有状态
  signupForm.classList.add('hidden');
  mySignup.classList.add('hidden');
  signupClosed.classList.add('hidden');
  
  if (hasSignedUp) {
    // 已报名 - 显示报名状态卡片
    mySignup.classList.remove('hidden');
    
    const teamBadge = document.getElementById('my-team');
    teamBadge.textContent = myTeam === 'redBlack' ? '🔴⚫ 红黑队' : '⚪🔵 白蓝队';
    teamBadge.className = 'team-badge ' + (myTeam === 'redBlack' ? 'red-black' : 'white-blue');
    
    // 显示报名时间
    const mySignupData = myTeam === 'redBlack' 
      ? AppData.players.redBlack.find(p => p.name === userInfo.name)
      : AppData.players.whiteBlue.find(p => p.name === userInfo.name);
    if (mySignupData) {
      document.getElementById('signup-time').textContent = new Date(mySignupData.signupTime).toLocaleString('zh-CN');
    }
    
    // 检查是否已过取消报名截止时间
    const cancelBtn = document.getElementById('btn-cancel-signup');
    if (isClosed) {
      // 已过截止时间，隐藏取消报名按钮
      cancelBtn.classList.add('hidden');
      // 添加提示信息
      const cancelHint = document.createElement('div');
      cancelHint.className = 'cancel-hint';
      cancelHint.textContent = '⏰ 已过取消截止时间（比赛前一天22:00）';
      cancelHint.id = 'cancel-hint';
      if (!document.getElementById('cancel-hint')) {
        mySignup.querySelector('.signup-status-card').appendChild(cancelHint);
      }
    } else {
      // 未过截止时间，显示取消报名按钮
      cancelBtn.classList.remove('hidden');
      // 移除提示信息
      const existingHint = document.getElementById('cancel-hint');
      if (existingHint) {
        existingHint.remove();
      }
    }
  } else if (isClosed) {
    // 报名已截止
    signupClosed.classList.remove('hidden');
  } else if (isRestricted) {
    // 被限制报名 - 显示限制信息，不显示表单
    // 限制警告已经在上面显示了
  } else {
    // 未报名 - 显示报名表单
    signupForm.classList.remove('hidden');
    // 设置默认队伍
    const teamRadio = document.querySelector(`input[name="signup-team"][value="${userInfo.defaultTeam}"]`);
    if (teamRadio) teamRadio.checked = true;
  }
  
  // 更新队伍列表
  updateTeamLists();
}

function updateTeamLists() {
  // 红黑队
  const redBlackList = document.getElementById('redblack-list');
  const redBlackEmpty = document.getElementById('redblack-empty');
  
  if (AppData.players.redBlack.length === 0) {
    redBlackList.innerHTML = '';
    redBlackEmpty.classList.remove('hidden');
  } else {
    redBlackList.innerHTML = AppData.players.redBlack.map((p, index) => `
      <li>
        <span class="player-number">${index + 1}</span>
        <span class="player-name">${p.name}</span>
      </li>
    `).join('');
    redBlackEmpty.classList.add('hidden');
  }
  document.getElementById('redblack-count').textContent = AppData.players.redBlack.length;
  
  // 白蓝队
  const whiteBlueList = document.getElementById('whiteblue-list');
  const whiteBlueEmpty = document.getElementById('whiteblue-empty');
  
  if (AppData.players.whiteBlue.length === 0) {
    whiteBlueList.innerHTML = '';
    whiteBlueEmpty.classList.remove('hidden');
  } else {
    whiteBlueList.innerHTML = AppData.players.whiteBlue.map((p, index) => `
      <li>
        <span class="player-number">${index + 1}</span>
        <span class="player-name">${p.name}</span>
      </li>
    `).join('');
    whiteBlueEmpty.classList.add('hidden');
  }
  document.getElementById('whiteblue-count').textContent = AppData.players.whiteBlue.length;
  
  // 总人数
  const total = AppData.players.redBlack.length + AppData.players.whiteBlue.length;
  document.getElementById('total-players').textContent = total;
  document.getElementById('max-players').textContent = AppData.maxPlayers;
}

function submitSignup() {
  if (isSignupClosed()) {
    alert('报名已截止');
    return;
  }
  
  const userInfo = Storage.get('userInfo');
  if (!userInfo) {
    alert('请先登录');
    return;
  }
  
  if (isUserRestricted(userInfo.name)) {
    alert('您已被限制报名');
    return;
  }
  
  const name = userInfo.name;
  const team = document.querySelector('input[name="signup-team"]:checked')?.value;
  const warningEl = document.getElementById('signup-warning');
  
  if (!team) {
    warningEl.textContent = '请选择队伍';
    warningEl.classList.remove('hidden');
    return;
  }
  
  const total = AppData.players.redBlack.length + AppData.players.whiteBlue.length;
  if (total >= AppData.maxPlayers) {
    warningEl.textContent = `总报名人数已满（${AppData.maxPlayers}人）`;
    warningEl.classList.remove('hidden');
    return;
  }
  
  const allPlayers = [...AppData.players.redBlack, ...AppData.players.whiteBlue];
  if (allPlayers.some(p => p.name === name)) {
    warningEl.textContent = '你已经报名过了';
    warningEl.classList.remove('hidden');
    return;
  }
  
  AppData.players[team].push({
    name,
    signupTime: new Date().toISOString()
  });
  saveData();
  
  alert('报名成功！');
  loadSignupPage();
}

function cancelSignup() {
  if (!confirm('确定要取消报名吗？')) return;
  
  const userInfo = Storage.get('userInfo');
  AppData.players.redBlack = AppData.players.redBlack.filter(p => p.name !== userInfo.name);
  AppData.players.whiteBlue = AppData.players.whiteBlue.filter(p => p.name !== userInfo.name);
  saveData();
  
  alert('已取消报名');
  loadSignupPage();
}

function isSignupClosed() {
  const matchDate = new Date(AppData.matchInfo.date);
  const deadline = new Date(matchDate.getTime() - 24 * 60 * 60 * 1000);
  deadline.setHours(22, 0, 0, 0);
  return new Date() >= deadline;
}

function getDeadlineString() {
  const matchDate = new Date(AppData.matchInfo.date);
  const deadline = new Date(matchDate.getTime() - 24 * 60 * 60 * 1000);
  return `${deadline.getMonth() + 1}月${deadline.getDate()}日 22:00`;
}

function isUserRestricted(name) {
  const behavior = AppData.playerBehavior[name];
  if (!behavior) return false;
  
  const currentYear = new Date().getFullYear();
  const yearRecord = behavior[currentYear];
  if (!yearRecord) return false;
  
  const total = (yearRecord.noShow || 0) + (yearRecord.unregistered || 0);
  if (total < 3) return false;
  
  if (!yearRecord.restrictionEndTime) {
    const endTime = new Date();
    endTime.setMonth(endTime.getMonth() + 3);
    yearRecord.restrictionEndTime = endTime.toISOString();
    saveData();
  }
  
  return new Date() < new Date(yearRecord.restrictionEndTime);
}

// 获取用户当年行为次数
function getUserBehaviorCount(name) {
  const behavior = AppData.playerBehavior[name];
  if (!behavior) return { noShow: 0, unregistered: 0 };
  
  const currentYear = new Date().getFullYear();
  const yearRecord = behavior[currentYear];
  if (!yearRecord) return { noShow: 0, unregistered: 0 };
  
  return {
    noShow: yearRecord.noShow || 0,
    unregistered: yearRecord.unregistered || 0
  };
}

// ==================== 统计页面 ====================

function loadStatsPage() {
  // 计算队伍胜场
  let redBlackWins = 0;
  let whiteBlueWins = 0;
  
  AppData.matchHistory.forEach(match => {
    if (match.score.redBlack > match.score.whiteBlue) {
      redBlackWins++;
    } else if (match.score.whiteBlue > match.score.redBlack) {
      whiteBlueWins++;
    }
    // 平局不计入胜场
  });
  
  // 更新队伍战绩显示
  document.getElementById('redblack-wins').textContent = redBlackWins;
  document.getElementById('whiteblue-wins').textContent = whiteBlueWins;
  document.getElementById('total-matches').textContent = AppData.matchHistory.length;
  
  // 参赛统计 - 合并所有注册用户的统计
  const statsList = document.getElementById('stats-list');
  
  // 获取所有已批准的用户
  const approvedUsers = AppData.registeredUsers.filter(u => u.status === 'approved');
  
  if (approvedUsers.length === 0) {
    statsList.innerHTML = '<p style="text-align:center;color:#999;">暂无注册队员</p>';
  } else {
    // 构建统计列表
    const userStats = approvedUsers.map(user => {
      const stats = AppData.playerStats[user.name] || { count: 0, mvpCount: 0 };
      const behavior = getUserBehaviorCount(user.name);
      const totalViolations = behavior.noShow + behavior.unregistered;
      
      return {
        name: user.name,
        count: stats.count || 0,
        mvpCount: stats.mvpCount || 0,
        violations: totalViolations
      };
    });
    
    // 按参赛次数排序
    userStats.sort((a, b) => b.count - a.count);
    
    statsList.innerHTML = userStats.map(user => `
      <div class="stat-item detailed">
        <div class="stat-main">
          <div class="stat-left">
            <span class="stat-name">${user.name}</span>
            <div class="stat-badges">
              ${user.mvpCount > 0 ? `<span class="badge mvp-badge">👑 MVP ${user.mvpCount}</span>` : ''}
              ${user.violations > 0 ? `<span class="badge violation-badge">⚠️ 违规 ${user.violations}</span>` : ''}
            </div>
          </div>
          <span class="stat-count">参赛 ${user.count} 次</span>
        </div>
      </div>
    `).join('');
  }
  
  // 历史比赛
  const historyEl = document.getElementById('match-history');
  if (AppData.matchHistory.length === 0) {
    historyEl.innerHTML = '<p style="text-align:center;color:#999;">暂无历史记录</p>';
  } else {
    historyEl.innerHTML = AppData.matchHistory.slice().reverse().map(match => `
      <div class="history-item">
        <div class="history-date">${match.date}</div>
        <div class="history-name">${match.name}</div>
        <div class="history-score">🔴⚫ ${match.score.redBlack} : ${match.score.whiteBlue} ⚪🔵</div>
        ${match.mvp ? `<div class="history-mvp">👑 MVP: ${match.mvp}</div>` : ''}
      </div>
    `).join('');
  }
}

// ==================== 管理页面 ====================

function isAdmin() {
  const userInfo = Storage.get('userInfo');
  if (!userInfo) return false;
  
  if (AppData.admins.length === 0) {
    AppData.admins.push({ name: userInfo.name, addTime: new Date().toISOString() });
    saveData();
    return true;
  }
  
  return AppData.admins.some(a => a.name === userInfo.name);
}

function loadAdminPage() {
  if (!isAdmin()) {
    document.getElementById('admin-notice').classList.remove('hidden');
    document.getElementById('admin-content').classList.add('hidden');
    return;
  }
  
  document.getElementById('admin-notice').classList.add('hidden');
  document.getElementById('admin-content').classList.remove('hidden');
  
  // 待审核列表
  const pendingList = document.getElementById('pending-list');
  if (AppData.pendingApprovals.length === 0) {
    pendingList.innerHTML = '<p style="color:#999;">暂无待审核用户</p>';
  } else {
    pendingList.innerHTML = AppData.pendingApprovals.map(p => `
      <div class="admin-item">
        <span>${p.name} (${p.defaultTeam === 'redBlack' ? '红黑队' : '白蓝队'})</span>
        <div>
          <button class="btn-small btn-approve" onclick="approveUser('${p.name}')">通过</button>
          <button class="btn-small btn-reject" onclick="rejectUser('${p.name}')">拒绝</button>
        </div>
      </div>
    `).join('');
  }
  
  // 加载MVP选择列表（从已报名队员中）
  loadMVPOptions();
  
  // 加载行为记录队员列表
  onBehaviorTypeChange();
  
  // 加载清除违规记录队员列表
  loadClearBehaviorOptions();
  
  // 加载历史比赛管理列表
  loadMatchManagementList();
  
  // 加载管理员管理功能
  loadAdminManagement();
  
  // 加载用户管理列表
  loadUserManagementList();
  
  // 比赛设置
  document.getElementById('admin-match-name').value = AppData.matchInfo.name;
  document.getElementById('admin-match-date').value = AppData.matchInfo.date;
  document.getElementById('admin-match-venue').value = AppData.matchInfo.venue;
  document.getElementById('admin-max-players').value = AppData.maxPlayers;
}

function approveUser(name) {
  const user = AppData.registeredUsers.find(u => u.name === name);
  if (user) {
    user.status = 'approved';
    AppData.pendingApprovals = AppData.pendingApprovals.filter(p => p.name !== name);
    saveData();
    loadAdminPage();
  }
}

function rejectUser(name) {
  const user = AppData.registeredUsers.find(u => u.name === name);
  if (user) {
    user.status = 'rejected';
    AppData.pendingApprovals = AppData.pendingApprovals.filter(p => p.name !== name);
    saveData();
    loadAdminPage();
  }
}

function saveMatchSettings() {
  AppData.matchInfo.name = document.getElementById('admin-match-name').value;
  AppData.matchInfo.date = document.getElementById('admin-match-date').value;
  AppData.matchInfo.venue = document.getElementById('admin-match-venue').value;
  AppData.maxPlayers = parseInt(document.getElementById('admin-max-players').value) || 20;
  saveData();
  alert('设置已保存');
}

function recordMatch() {
  const redBlackScore = parseInt(document.getElementById('score-redblack').value) || 0;
  const whiteBlueScore = parseInt(document.getElementById('score-whiteblue').value) || 0;
  const mvp = document.getElementById('mvp-name').value.trim();
  
  // 记录参赛
  const allPlayers = [...AppData.players.redBlack, ...AppData.players.whiteBlue];
  allPlayers.forEach(player => {
    if (!AppData.playerStats[player.name]) {
      AppData.playerStats[player.name] = { count: 0, history: [], mvpCount: 0 };
    }
    AppData.playerStats[player.name].count++;
    AppData.playerStats[player.name].history.push({
      date: AppData.matchInfo.date,
      matchName: AppData.matchInfo.name
    });
  });
  
  // 记录MVP
  if (mvp && AppData.playerStats[mvp]) {
    AppData.playerStats[mvp].mvpCount++;
  }
  
  // 保存历史（包含参赛队员名单，用于删除时扣除统计）
  AppData.matchHistory.push({
    name: AppData.matchInfo.name,
    date: AppData.matchInfo.date,
    score: { redBlack: redBlackScore, whiteBlue: whiteBlueScore },
    mvp: mvp || null,
    players: allPlayers.map(p => p.name) // 保存参赛队员名单
  });
  
  // 清空当前报名
  AppData.players.redBlack = [];
  AppData.players.whiteBlue = [];
  
  saveData();
  alert('比赛已记录');
  
  // 清空表单
  document.getElementById('score-redblack').value = '';
  document.getElementById('score-whiteblue').value = '';
  document.getElementById('mvp-name').value = '';
}

// 加载MVP选项（已报名队员）
function loadMVPOptions() {
  const mvpSelect = document.getElementById('mvp-name');
  const allPlayers = [...AppData.players.redBlack, ...AppData.players.whiteBlue];
  
  let options = '<option value="">-- 请选择MVP（从已报名队员中选择）--</option>';
  
  if (allPlayers.length === 0) {
    options += '<option value="" disabled>暂无已报名队员</option>';
  } else {
    // 按队伍分组
    if (AppData.players.redBlack.length > 0) {
      options += '<optgroup label="🔴⚫ 红黑队">';
      AppData.players.redBlack.forEach(p => {
        options += `<option value="${p.name}">${p.name}</option>`;
      });
      options += '</optgroup>';
    }
    if (AppData.players.whiteBlue.length > 0) {
      options += '<optgroup label="⚪🔵 白蓝队">';
      AppData.players.whiteBlue.forEach(p => {
        options += `<option value="${p.name}">${p.name}</option>`;
      });
      options += '</optgroup>';
    }
  }
  
  mvpSelect.innerHTML = options;
}

// 行为类型改变时更新队员列表
function onBehaviorTypeChange() {
  const type = document.getElementById('behavior-type').value;
  const nameSelect = document.getElementById('behavior-name');
  const hint = document.getElementById('behavior-hint');
  
  let options = '<option value="">-- 请选择队员 --</option>';
  
  if (type === 'noShow') {
    // 放鸽子：从已报名队员中选择
    hint.textContent = '从已报名队员中选择';
    const allPlayers = [...AppData.players.redBlack, ...AppData.players.whiteBlue];
    
    if (allPlayers.length === 0) {
      options += '<option value="" disabled>暂无已报名队员</option>';
    } else {
      if (AppData.players.redBlack.length > 0) {
        options += '<optgroup label="🔴⚫ 红黑队">';
        AppData.players.redBlack.forEach(p => {
          options += `<option value="${p.name}">${p.name}</option>`;
        });
        options += '</optgroup>';
      }
      if (AppData.players.whiteBlue.length > 0) {
        options += '<optgroup label="⚪🔵 白蓝队">';
        AppData.players.whiteBlue.forEach(p => {
          options += `<option value="${p.name}">${p.name}</option>`;
        });
        options += '</optgroup>';
      }
    }
  } else {
    // 未报名参赛：从所有注册用户中选择
    hint.textContent = '从所有注册队员中选择';
    const approvedUsers = AppData.registeredUsers.filter(u => u.status === 'approved');
    
    if (approvedUsers.length === 0) {
      options += '<option value="" disabled>暂无注册队员</option>';
    } else {
      // 按默认队伍分组
      const redBlackUsers = approvedUsers.filter(u => u.defaultTeam === 'redBlack');
      const whiteBlueUsers = approvedUsers.filter(u => u.defaultTeam === 'whiteBlue');
      
      if (redBlackUsers.length > 0) {
        options += '<optgroup label="🔴⚫ 红黑队（默认）">';
        redBlackUsers.forEach(u => {
          options += `<option value="${u.name}">${u.name}</option>`;
        });
        options += '</optgroup>';
      }
      if (whiteBlueUsers.length > 0) {
        options += '<optgroup label="⚪🔵 白蓝队（默认）">';
        whiteBlueUsers.forEach(u => {
          options += `<option value="${u.name}">${u.name}</option>`;
        });
        options += '</optgroup>';
      }
    }
  }
  
  nameSelect.innerHTML = options;
}

function recordBehavior() {
  const name = document.getElementById('behavior-name').value;
  const type = document.getElementById('behavior-type').value;
  
  if (!name) {
    alert('请选择队员');
    return;
  }
  
  if (!AppData.playerBehavior[name]) {
    AppData.playerBehavior[name] = {};
  }
  
  const currentYear = new Date().getFullYear();
  if (!AppData.playerBehavior[name][currentYear]) {
    AppData.playerBehavior[name][currentYear] = { noShow: 0, unregistered: 0 };
  }
  
  AppData.playerBehavior[name][currentYear][type]++;
  saveData();
  
  const total = AppData.playerBehavior[name][currentYear].noShow + 
                AppData.playerBehavior[name][currentYear].unregistered;
  
  if (total >= 3) {
    alert(`已记录！该队员今年违规${total}次，已被限制报名3个月。`);
  } else {
    alert(`已记录！该队员今年违规${total}次，再违规${3-total}次将被限制报名。`);
  }
  
  // 重置选择
  onBehaviorTypeChange();
}

// ==================== 历史比赛管理 ====================

function loadMatchManagementList() {
  const listEl = document.getElementById('match-management-list');
  
  if (AppData.matchHistory.length === 0) {
    listEl.innerHTML = '<p style="color:#999;">暂无历史比赛</p>';
    return;
  }
  
  listEl.innerHTML = AppData.matchHistory.map((match, index) => `
    <div class="admin-item match-item">
      <div class="match-info-compact">
        <div class="match-date">${match.date}</div>
        <div class="match-name">${match.name}</div>
        <div class="match-score">🔴⚫ ${match.score.redBlack} : ${match.score.whiteBlue} ⚪🔵</div>
        ${match.mvp ? `<div class="match-mvp">👑 MVP: ${match.mvp}</div>` : ''}
      </div>
      <div class="match-actions">
        <button class="btn-small btn-edit" onclick="editMatch(${index})">修改</button>
        <button class="btn-small btn-reject" onclick="deleteMatch(${index})">删除</button>
      </div>
    </div>
  `).join('');
}

function editMatch(index) {
  const match = AppData.matchHistory[index];
  if (!match) return;
  
  const newRedBlackScore = prompt('请输入红黑队比分:', match.score.redBlack);
  if (newRedBlackScore === null) return;
  
  const newWhiteBlueScore = prompt('请输入白蓝队比分:', match.score.whiteBlue);
  if (newWhiteBlueScore === null) return;
  
  const newMvp = prompt('请输入MVP姓名（留空表示无）:', match.mvp || '');
  if (newMvp === null) return;
  
  const trimmedNewMvp = newMvp.trim();
  
  // 更新MVP统计
  if (match.mvp && match.mvp !== trimmedNewMvp) {
    // 移除旧MVP
    if (AppData.playerStats[match.mvp]) {
      AppData.playerStats[match.mvp].mvpCount = Math.max(0, (AppData.playerStats[match.mvp].mvpCount || 0) - 1);
    }
  }
  if (trimmedNewMvp && trimmedNewMvp !== match.mvp) {
    // 添加新MVP
    if (!AppData.playerStats[trimmedNewMvp]) {
      AppData.playerStats[trimmedNewMvp] = { count: 0, history: [], mvpCount: 0 };
    }
    AppData.playerStats[trimmedNewMvp].mvpCount = (AppData.playerStats[trimmedNewMvp].mvpCount || 0) + 1;
    
    // 确保新MVP在参赛队员中，如果没有则添加参赛记录
    if (match.players && !match.players.includes(trimmedNewMvp)) {
      match.players.push(trimmedNewMvp);
      if (AppData.playerStats[trimmedNewMvp]) {
        AppData.playerStats[trimmedNewMvp].count++;
        AppData.playerStats[trimmedNewMvp].history.push({
          date: match.date,
          matchName: match.name
        });
      }
    }
  }
  
  match.score.redBlack = parseInt(newRedBlackScore) || 0;
  match.score.whiteBlue = parseInt(newWhiteBlueScore) || 0;
  match.mvp = trimmedNewMvp || null;
  
  saveData();
  alert('比赛结果已更新');
  loadAdminPage();
}

function deleteMatch(index) {
  if (!confirm('确定要删除这场比赛记录吗？这将扣除所有参赛队员的统计次数。')) return;
  
  const match = AppData.matchHistory[index];
  if (!match) return;
  
  // 扣除参赛次数（使用保存的参赛队员名单）
  if (match.players && match.players.length > 0) {
    match.players.forEach(playerName => {
      if (AppData.playerStats[playerName]) {
        // 扣除参赛次数
        AppData.playerStats[playerName].count = Math.max(0, (AppData.playerStats[playerName].count || 0) - 1);
        // 从历史记录中移除这场比赛
        AppData.playerStats[playerName].history = AppData.playerStats[playerName].history.filter(
          h => !(h.date === match.date && h.matchName === match.name)
        );
      }
    });
  }
  
  // 扣除MVP统计
  if (match.mvp && AppData.playerStats[match.mvp]) {
    AppData.playerStats[match.mvp].mvpCount = Math.max(0, (AppData.playerStats[match.mvp].mvpCount || 0) - 1);
  }
  
  AppData.matchHistory.splice(index, 1);
  saveData();
  alert('比赛记录已删除，相关统计已更新');
  loadAdminPage();
}

// ==================== 管理员管理 ====================

function loadAdminManagement() {
  const currentUser = Storage.get('userInfo');
  
  // 加载可选的管理员列表（非管理员的注册队员）
  const newAdminSelect = document.getElementById('new-admin-name');
  const nonAdmins = AppData.registeredUsers.filter(u => 
    u.status === 'approved' && 
    !AppData.admins.some(a => a.name === u.name)
  );
  
  if (nonAdmins.length === 0) {
    newAdminSelect.innerHTML = '<option value="">-- 所有队员都已是管理员 --</option>';
  } else {
    let options = '<option value="">-- 请选择队员 --</option>';
    nonAdmins.forEach(u => {
      options += `<option value="${u.name}">${u.name}</option>`;
    });
    newAdminSelect.innerHTML = options;
  }
  
  // 显示当前管理员列表（带移除按钮）
  const adminList = document.getElementById('admin-list');
  adminList.innerHTML = AppData.admins.map((a, index) => `
    <div class="admin-item">
      <div>
        <span style="font-weight:500;">${a.name}</span>
        <span style="color:#999;font-size:12px;margin-left:8px;">${new Date(a.addTime).toLocaleDateString()}</span>
        ${a.name === currentUser.name ? '<span style="color:#667eea;font-size:12px;margin-left:8px;">(我)</span>' : ''}
      </div>
      ${AppData.admins.length > 1 ? `<button class="btn-small btn-reject" onclick="removeAdmin('${a.name}')">移除</button>` : ''}
    </div>
  `).join('');
}

function addAdmin() {
  const name = document.getElementById('new-admin-name').value;
  
  if (!name) {
    alert('请选择要添加的队员');
    return;
  }
  
  if (AppData.admins.length >= 3) {
    alert('管理员数量已达上限（最多3人）');
    return;
  }
  
  if (AppData.admins.some(a => a.name === name)) {
    alert('该队员已是管理员');
    return;
  }
  
  AppData.admins.push({
    name: name,
    addTime: new Date().toISOString()
  });
  saveData();
  alert(`已将 ${name} 添加为管理员`);
  loadAdminPage();
}

function removeAdmin(name) {
  if (!confirm(`确定要移除 ${name} 的管理员权限吗？`)) return;
  
  const index = AppData.admins.findIndex(a => a.name === name);
  if (index === -1) return;
  
  AppData.admins.splice(index, 1);
  saveData();
  alert(`已移除 ${name} 的管理员权限`);
  loadAdminPage();
}

// ==================== 用户管理 ====================

function loadUserManagementList() {
  const listEl = document.getElementById('user-management-list');
  const currentUser = Storage.get('userInfo');
  
  if (AppData.registeredUsers.length === 0) {
    listEl.innerHTML = '<p style="color:#999;">暂无注册用户</p>';
    return;
  }
  
  listEl.innerHTML = AppData.registeredUsers.map(user => {
    const isAdmin = AppData.admins.some(a => a.name === user.name);
    const isSelf = user.name === currentUser.name;
    
    return `
    <div class="admin-item user-item">
      <div class="user-info">
        <div class="user-name">
          ${user.name}
          ${isAdmin ? '<span class="admin-badge">管理员</span>' : ''}
          ${isSelf ? '<span class="self-badge">我</span>' : ''}
        </div>
        <div class="user-meta">
          <span class="status-${user.status}">${getStatusText(user.status)}</span>
          <span class="team-badge-small ${user.defaultTeam}">${user.defaultTeam === 'redBlack' ? '🔴⚫' : '⚪🔵'}</span>
          <span class="register-time">注册于 ${new Date(user.registerTime).toLocaleDateString()}</span>
        </div>
      </div>
      ${!isSelf ? `<button class="btn-small btn-reject" onclick="deleteUser('${user.name}')">删除账号</button>` : ''}
    </div>
  `}).join('');
}

function getStatusText(status) {
  const statusMap = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  };
  return statusMap[status] || status;
}

function deleteUser(name) {
  if (!confirm(`确定要删除 ${name} 的账号吗？此操作不可恢复！`)) return;
  
  // 从注册用户列表中移除
  AppData.registeredUsers = AppData.registeredUsers.filter(u => u.name !== name);
  
  // 从管理员列表中移除（如果是管理员）
  AppData.admins = AppData.admins.filter(a => a.name !== name);
  
  // 从当前报名中移除（如果已报名）
  AppData.players.redBlack = AppData.players.redBlack.filter(p => p.name !== name);
  AppData.players.whiteBlue = AppData.players.whiteBlue.filter(p => p.name !== name);
  
  // 从统计数据中移除
  delete AppData.playerStats[name];
  delete AppData.playerBehavior[name];
  
  // 从待审核列表中移除
  AppData.pendingApprovals = AppData.pendingApprovals.filter(p => p.name !== name);
  
  // 从session中移除
  AppData.userSessions = AppData.userSessions.filter(s => s.name !== name);
  
  saveData();
  alert(`已删除 ${name} 的账号`);
  loadAdminPage();
}

// 加载清除违规记录的队员选项
function loadClearBehaviorOptions() {
  const select = document.getElementById('clear-behavior-name');
  const info = document.getElementById('clear-behavior-info');
  
  // 获取有违规记录的队员
  const usersWithBehavior = [];
  const currentYear = new Date().getFullYear();
  
  AppData.registeredUsers.forEach(user => {
    if (user.status === 'approved') {
      const behavior = AppData.playerBehavior[user.name];
      if (behavior && behavior[currentYear]) {
        const total = (behavior[currentYear].noShow || 0) + (behavior[currentYear].unregistered || 0);
        if (total > 0) {
          usersWithBehavior.push({
            name: user.name,
            noShow: behavior[currentYear].noShow || 0,
            unregistered: behavior[currentYear].unregistered || 0,
            total: total
          });
        }
      }
    }
  });
  
  if (usersWithBehavior.length === 0) {
    select.innerHTML = '<option value="">-- 暂无违规记录 --</option>';
    info.textContent = '所有队员都没有违规记录';
  } else {
    let options = '<option value="">-- 请选择队员 --</option>';
    usersWithBehavior.forEach(u => {
      const details = [];
      if (u.noShow > 0) details.push(`放鸽子${u.noShow}次`);
      if (u.unregistered > 0) details.push(`未报名参赛${u.unregistered}次`);
      options += `<option value="${u.name}">${u.name} (${details.join('，')})</option>`;
    });
    select.innerHTML = options;
    info.textContent = `共有 ${usersWithBehavior.length} 位队员有违规记录`;
  }
}

// 清除违规记录
function clearBehavior() {
  const name = document.getElementById('clear-behavior-name').value;
  
  if (!name) {
    alert('请选择要清除违规记录的队员');
    return;
  }
  
  if (!confirm(`确定要清除 ${name} 的所有违规记录吗？`)) return;
  
  const currentYear = new Date().getFullYear();
  
  if (AppData.playerBehavior[name] && AppData.playerBehavior[name][currentYear]) {
    AppData.playerBehavior[name][currentYear] = { noShow: 0, unregistered: 0 };
    saveData();
    alert(`已清除 ${name} 的违规记录`);
    loadAdminPage();
  }
}

// 验证管理员密码
function verifyAdminPassword() {
  const inputPassword = document.getElementById('reset-password').value;
  const currentUser = Storage.get('userInfo');
  
  if (!currentUser) {
    alert('请先登录');
    return false;
  }
  
  // 查找当前用户
  const user = AppData.registeredUsers.find(u => u.name === currentUser.name);
  if (!user) {
    alert('用户不存在');
    return false;
  }
  
  if (user.password !== inputPassword) {
    alert('密码错误，请重新输入');
    return false;
  }
  
  return true;
}

// 重置所有队员统计（参赛次数、MVP次数）
function resetAllStats() {
  if (!verifyAdminPassword()) return;
  
  if (!confirm('⚠️ 警告：这将重置所有队员的参赛次数和MVP次数！\n\n确定要继续吗？')) return;
  
  if (!confirm('再次确认：所有参赛统计将被清零，此操作不可恢复！')) return;
  
  // 重置所有队员的统计
  Object.keys(AppData.playerStats).forEach(name => {
    AppData.playerStats[name] = { count: 0, history: [], mvpCount: 0 };
  });
  
  // 清空密码输入框
  document.getElementById('reset-password').value = '';
  
  saveData();
  alert('已重置所有队员的参赛统计');
  loadAdminPage();
}

// 清除所有违规记录
function clearAllBehavior() {
  if (!verifyAdminPassword()) return;
  
  if (!confirm('⚠️ 警告：这将清除所有队员的违规记录！\n\n确定要继续吗？')) return;
  
  const currentYear = new Date().getFullYear();
  
  Object.keys(AppData.playerBehavior).forEach(name => {
    if (AppData.playerBehavior[name]) {
      AppData.playerBehavior[name][currentYear] = { noShow: 0, unregistered: 0 };
    }
  });
  
  // 清空密码输入框
  document.getElementById('reset-password').value = '';
  
  saveData();
  alert('已清除所有队员的违规记录');
  loadAdminPage();
}

// ==================== 标签切换 ====================

function switchTab(tabName) {
  // 更新标签样式
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.tab[data-tab="${tabName}"]`).classList.add('active');
  
  // 隐藏所有内容
  document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
  
  // 显示对应内容
  document.getElementById(tabName + '-tab').classList.remove('hidden');
  
  // 加载对应页面数据
  if (tabName === 'signup') loadSignupPage();
  else if (tabName === 'stats') loadStatsPage();
  else if (tabName === 'admin') loadAdminPage();
}

// ==================== 初始化 ====================

document.addEventListener('DOMContentLoaded', async () => {
  await initData();
  loadRememberedPassword();
  
  // 登录/注册按钮
  document.getElementById('btn-login').addEventListener('click', login);
  document.getElementById('btn-register').addEventListener('click', register);
  
  // 报名按钮
  document.getElementById('btn-submit-signup').addEventListener('click', submitSignup);
  document.getElementById('btn-cancel-signup').addEventListener('click', cancelSignup);
  document.getElementById('btn-logout').addEventListener('click', logout);
  
  // 管理按钮
  document.getElementById('btn-save-match').addEventListener('click', saveMatchSettings);
  document.getElementById('btn-record-match').addEventListener('click', recordMatch);
  document.getElementById('btn-record-behavior').addEventListener('click', recordBehavior);
  document.getElementById('btn-add-admin').addEventListener('click', addAdmin);
  document.getElementById('btn-clear-behavior').addEventListener('click', clearBehavior);
  document.getElementById('btn-reset-all-stats').addEventListener('click', resetAllStats);
  document.getElementById('btn-clear-all-behavior').addEventListener('click', clearAllBehavior);
  
  // 标签切换
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
  
  // 检查登录状态
  if (!checkLogin()) {
    showAuthPage();
  }
});
