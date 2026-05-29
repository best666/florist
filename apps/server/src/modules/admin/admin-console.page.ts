export const ADMIN_CONSOLE_HTML = String.raw`<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>植愈日记 管理后台</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f4efe7;
        --panel: rgba(255, 250, 244, 0.88);
        --panel-strong: #fffaf4;
        --border: rgba(91, 72, 58, 0.12);
        --text: #2f241e;
        --muted: #7b685c;
        --accent: #2f7d4f;
        --accent-soft: rgba(47, 125, 79, 0.12);
        --danger: #b64635;
        --shadow: 0 18px 50px rgba(79, 57, 40, 0.10);
        --radius: 18px;
        --font: "IBM Plex Sans", "PingFang SC", "Hiragino Sans GB", sans-serif;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: var(--font);
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(228, 193, 121, 0.35), transparent 28%),
          radial-gradient(circle at right 10%, rgba(109, 164, 128, 0.22), transparent 24%),
          linear-gradient(180deg, #f8f3ed 0%, var(--bg) 58%, #efe7de 100%);
      }
      .shell {
        width: min(1400px, calc(100vw - 40px));
        margin: 24px auto;
        display: grid;
        gap: 18px;
      }
      .topbar, .panel {
        background: var(--panel);
        border: 1px solid var(--border);
        border-radius: var(--radius);
        box-shadow: var(--shadow);
        backdrop-filter: blur(10px);
      }
      .topbar {
        padding: 20px 24px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
      }
      .title { font-size: 24px; font-weight: 700; letter-spacing: 0.02em; }
      .subtitle { color: var(--muted); font-size: 14px; margin-top: 6px; }
      .actions { display: flex; gap: 10px; flex-wrap: wrap; }
      .panel { padding: 20px; }
      .panel h2 { margin: 0 0 14px; font-size: 18px; }
      .cards {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
      }
      .card {
        padding: 16px;
        border-radius: 16px;
        background: var(--panel-strong);
        border: 1px solid rgba(91, 72, 58, 0.08);
      }
      .card .label { color: var(--muted); font-size: 13px; }
      .card .value { font-size: 28px; font-weight: 700; margin-top: 8px; }
      .grid-2 { display: grid; grid-template-columns: 1.5fr 1fr; gap: 18px; }
      .stack { display: grid; gap: 18px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { text-align: left; padding: 12px 10px; border-bottom: 1px solid rgba(91, 72, 58, 0.08); vertical-align: top; }
      th { color: var(--muted); font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; }
      .tag {
        display: inline-flex;
        align-items: center;
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 12px;
        background: var(--accent-soft);
        color: var(--accent);
        margin-right: 6px;
      }
      .tag.muted { background: rgba(91, 72, 58, 0.10); color: var(--muted); }
      .tag.danger { background: rgba(182, 70, 53, 0.12); color: var(--danger); }
      button {
        appearance: none;
        border: none;
        cursor: pointer;
        border-radius: 999px;
        padding: 10px 14px;
        font: inherit;
        font-weight: 600;
        background: #fff;
        color: var(--text);
        border: 1px solid rgba(91, 72, 58, 0.12);
      }
      button.primary { background: var(--accent); color: white; border-color: var(--accent); }
      button.ghost { background: transparent; }
      button.warn { color: var(--danger); }
      button:disabled { opacity: 0.55; cursor: not-allowed; }
      .button-row { display: flex; gap: 8px; flex-wrap: wrap; }
      textarea, input {
        width: 100%;
        border-radius: 14px;
        border: 1px solid rgba(91, 72, 58, 0.14);
        padding: 12px 14px;
        font: inherit;
        color: var(--text);
        background: rgba(255,255,255,0.84);
      }
      textarea { min-height: 120px; resize: vertical; }
      .login-wrap {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
      }
      .login-card {
        width: min(420px, 100%);
        padding: 28px;
        border-radius: 24px;
        background: rgba(255, 250, 244, 0.92);
        border: 1px solid rgba(91, 72, 58, 0.12);
        box-shadow: var(--shadow);
      }
      .form-row { display: grid; gap: 10px; margin-top: 14px; }
      .helper { color: var(--muted); font-size: 13px; }
      .feedback-card {
        padding: 16px;
        border-radius: 16px;
        background: var(--panel-strong);
        border: 1px solid rgba(91, 72, 58, 0.08);
        display: grid;
        gap: 12px;
      }
      .feedback-list, .list { display: grid; gap: 12px; }
      .row-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: center;
      }
      .muted { color: var(--muted); }
      .metric-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 10px;
      }
      .metric-item {
        background: var(--panel-strong);
        border-radius: 14px;
        padding: 14px;
        border: 1px solid rgba(91, 72, 58, 0.08);
      }
      .kvs { display: grid; gap: 8px; }
      .kv { display: flex; justify-content: space-between; gap: 10px; }
      .status { min-height: 22px; color: var(--muted); }
      @media (max-width: 1080px) {
        .grid-2 { grid-template-columns: 1fr; }
        .topbar { flex-direction: column; align-items: flex-start; }
      }
      @media (max-width: 720px) {
        .shell { width: min(100vw - 20px, 1400px); margin: 10px auto 24px; }
        .panel, .topbar { padding: 16px; }
        th:nth-child(4), td:nth-child(4), th:nth-child(5), td:nth-child(5) { display: none; }
      }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script>
      const state = {
        session: null,
        dashboard: null,
        status: '',
        busy: false,
      };

      function escapeHtml(value) {
        return String(value ?? '')
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;')
          .replaceAll('"', '&quot;')
          .replaceAll("'", '&#39;');
      }

      function renderStatus(message) {
        state.status = message;
        const node = document.querySelector('[data-role="status"]');
        if (node) {
          node.textContent = message;
        }
      }

      async function request(url, options = {}) {
        const response = await fetch(url, {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
          ...options,
        });
        const payload = await response.json().catch(() => null);

        if (!response.ok || !payload || payload.success !== true) {
          throw new Error(payload?.message || '请求失败');
        }

        return payload.data;
      }

      async function fetchSession() {
        const response = await fetch('/api/admin/auth/session', { credentials: 'include' });
        const payload = await response.json().catch(() => null);
        state.session = payload?.data?.active ? payload.data : null;
      }

      async function fetchDashboard() {
        renderStatus('正在拉取管理数据...');
        state.dashboard = await request('/api/admin/dashboard');
        renderStatus('数据已更新');
      }

      function renderLogin() {
        document.getElementById('app').innerHTML = '\
          <div class="login-wrap">\
            <form class="login-card" id="login-form">\
              <div class="title">植愈日记管理后台</div>\
              <div class="subtitle">轻量管理面板，统一查看用户、反馈、配置与 AI 流量。</div>\
              <div class="form-row">\
                <label>管理员账号</label>\
                <input name="username" autocomplete="username" placeholder="请输入管理员账号" value="admin" />\
              </div>\
              <div class="form-row">\
                <label>管理员密码</label>\
                <input type="password" name="password" autocomplete="current-password" placeholder="请输入管理员密码" />\
              </div>\
              <div class="form-row">\
                <button class="primary" type="submit">登录后台</button>\
              </div>\
              <div class="helper" data-role="status">' + escapeHtml(state.status || '请使用环境变量中配置的管理员账号登录。') + '</div>\
            </form>\
          </div>';

        document.getElementById('login-form').addEventListener('submit', async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);

          try {
            renderStatus('登录中...');
            await request('/api/admin/auth/login', {
              method: 'POST',
              body: JSON.stringify({
                username: String(formData.get('username') || '').trim(),
                password: String(formData.get('password') || ''),
              }),
            });
            await fetchSession();
            await fetchDashboard();
            render();
          }
          catch (error) {
            renderStatus(error.message || '登录失败');
          }
        });
      }

      function formatTags(list) {
        return (list || []).map((item) => '<span class="tag muted">' + escapeHtml(item) + '</span>').join('');
      }

      function renderDashboard() {
        const { overview, users, analytics, feedbacks, operationConfigs, monitoring } = state.dashboard;
        document.getElementById('app').innerHTML = '\
          <div class="shell">\
            <section class="topbar">\
              <div>\
                <div class="title">植愈日记管理后台</div>\
                <div class="subtitle">当前管理员：' + escapeHtml(state.session?.username || 'admin') + '，会话截止：' + escapeHtml(state.session?.expiresAt || '-') + '</div>\
              </div>\
              <div class="actions">\
                <button class="ghost" id="refresh-dashboard">刷新数据</button>\
                <button class="warn" id="logout-dashboard">退出登录</button>\
              </div>\
            </section>\
            <div class="status" data-role="status">' + escapeHtml(state.status || '') + '</div>\
            <section class="panel">\
              <h2>核心概览</h2>\
              <div class="cards">\
                <div class="card"><div class="label">总用户数</div><div class="value">' + overview.totalUsers + '</div></div>\
                <div class="card"><div class="label">在线植株档案</div><div class="value">' + overview.totalFlowers + '</div></div>\
                <div class="card"><div class="label">养护记录总数</div><div class="value">' + overview.totalRecords + '</div></div>\
                <div class="card"><div class="label">有效会员</div><div class="value">' + overview.activeMembers + '</div></div>\
                <div class="card"><div class="label">待处理反馈</div><div class="value">' + overview.pendingFeedbacks + '</div></div>\
                <div class="card"><div class="label">今日 AI 调用</div><div class="value">' + overview.aiCallsToday + '</div></div>\
              </div>\
            </section>\
            <div class="grid-2">\
              <div class="stack">\
                <section class="panel">\
                  <div class="row-header"><h2>用户与会员</h2><span class="muted">支持一键切换会员套餐</span></div>\
                  <div style="overflow:auto;">\
                    <table>\
                      <thead><tr><th>用户</th><th>登录来源</th><th>植株</th><th>记录</th><th>会员</th><th>操作</th></tr></thead>\
                      <tbody>' + users.map((item) => '\
                        <tr>\
                          <td><strong>' + escapeHtml(item.user.nickname) + '</strong><div class="muted">' + escapeHtml(item.user.id) + '</div></td>\
                          <td>' + escapeHtml(item.user.loginType || '-') + '<div class="muted">最近登录 ' + escapeHtml(item.user.lastLoginAt || '-') + '</div></td>\
                          <td>' + item.flowerCount + '</td>\
                          <td>' + item.recordCount + '</td>\
                          <td>' + (item.member ? '<span class="tag">' + escapeHtml(item.member.packageType) + '</span><span class="tag muted">' + escapeHtml(item.member.status) + '</span>' : '<span class="tag muted">未开通</span>') + '</td>\
                          <td><div class="button-row">\
                            <button data-member-action="monthly" data-user-id="' + escapeHtml(item.user.id) + '">月卡</button>\
                            <button data-member-action="yearly" data-user-id="' + escapeHtml(item.user.id) + '">年卡</button>\
                            <button data-member-action="lifetime" data-user-id="' + escapeHtml(item.user.id) + '">终身</button>\
                            <button class="warn" data-member-action="inactive" data-user-id="' + escapeHtml(item.user.id) + '">停用</button>\
                          </div></td>\
                        </tr>').join('') + '\
                      </tbody>\
                    </table>\
                  </div>\
                </section>\
                <section class="panel">\
                  <div class="row-header"><h2>用户养护习惯分析</h2><span class="muted">按全量养护数据实时聚合</span></div>\
                  <div class="metric-list">\
                    <div class="metric-item"><div class="label">7 天活跃养护用户</div><div class="value">' + analytics.activeCareUsersLast7Days + '</div></div>\
                    <div class="metric-item"><div class="label">人均植株数</div><div class="value">' + analytics.averageFlowersPerUser + '</div></div>\
                    <div class="metric-item"><div class="label">人均记录数</div><div class="value">' + analytics.averageRecordsPerUser + '</div></div>\
                    <div class="metric-item"><div class="label">平均冷却分钟</div><div class="value">' + analytics.averageCooldownMinutes + '</div></div>\
                  </div>\
                  <div class="grid-2" style="margin-top:14px;">\
                    <div class="panel" style="padding:14px; box-shadow:none;">\
                      <h2 style="font-size:15px;">高频养护动作</h2>\
                      <div class="kvs">' + analytics.actionBreakdown.map((item) => '<div class="kv"><span>' + escapeHtml(item.name) + '</span><strong>' + item.count + '</strong></div>').join('') + '</div>\
                    </div>\
                    <div class="panel" style="padding:14px; box-shadow:none;">\
                      <h2 style="font-size:15px;">常见植株分类</h2>\
                      <div class="kvs">' + analytics.categoryBreakdown.map((item) => '<div class="kv"><span>' + escapeHtml(item.name) + '</span><strong>' + item.count + '</strong></div>').join('') + '</div>\
                    </div>\
                  </div>\
                  <div class="grid-2" style="margin-top:14px;">\
                    <div class="panel" style="padding:14px; box-shadow:none;">\
                      <h2 style="font-size:15px;">活跃养护时段</h2>\
                      <div class="kvs">' + analytics.hotHours.map((item) => '<div class="kv"><span>' + escapeHtml(item.hour) + '</span><strong>' + item.count + '</strong></div>').join('') + '</div>\
                    </div>\
                    <div class="panel" style="padding:14px; box-shadow:none;">\
                      <h2 style="font-size:15px;">最近 7 天记录量</h2>\
                      <div class="kvs">' + analytics.last7DayRecords.map((item) => '<div class="kv"><span>' + escapeHtml(item.date) + '</span><strong>' + item.count + '</strong></div>').join('') + '</div>\
                    </div>\
                  </div>\
                </section>\
                <section class="panel">\
                  <div class="row-header"><h2>反馈查看与回复</h2><span class="muted">保存后自动更新反馈状态</span></div>\
                  <div class="feedback-list">' + feedbacks.map((item) => '\
                    <article class="feedback-card">\
                      <div class="row-header">\
                        <div>\
                          <strong>' + escapeHtml(item.user.nickname) + '</strong>\
                          <div class="muted">' + escapeHtml(item.user.id) + ' · 提交于 ' + escapeHtml(item.createdAt) + '</div>\
                        </div>\
                        <div>' + (item.status === 'pending' ? '<span class="tag danger">待处理</span>' : '<span class="tag">' + escapeHtml(item.status) + '</span>') + '</div>\
                      </div>\
                      <div>' + escapeHtml(item.content) + '</div>\
                      <div>' + formatTags(item.images.map((image) => image.url)) + '</div>\
                      <textarea data-feedback-reply="' + escapeHtml(item.id) + '" placeholder="输入给用户的处理回复">' + escapeHtml(item.reply?.content || '') + '</textarea>\
                      <div class="button-row">\
                        <button class="primary" data-feedback-action="reviewed" data-feedback-id="' + escapeHtml(item.id) + '">回复并标记已处理</button>\
                        <button data-feedback-action="archived" data-feedback-id="' + escapeHtml(item.id) + '">回复并归档</button>\
                      </div>\
                    </article>').join('') + '\
                  </div>\
                </section>\
              </div>\
              <div class="stack">\
                <section class="panel">\
                  <div class="row-header"><h2>广告位配置</h2><span class="muted">JSON 数组，保存后立即生效</span></div>\
                  <textarea id="ad-slots-input">' + escapeHtml(JSON.stringify(operationConfigs.adSlots, null, 2)) + '</textarea>\
                </section>\
                <section class="panel">\
                  <div class="row-header"><h2>商品链接配置</h2><span class="muted">可用于商城、会员页或推荐位</span></div>\
                  <textarea id="product-links-input">' + escapeHtml(JSON.stringify(operationConfigs.productLinks, null, 2)) + '</textarea>\
                  <div class="button-row" style="margin-top:12px;">\
                    <button class="primary" id="save-configs">保存配置</button>\
                  </div>\
                </section>\
                <section class="panel">\
                  <div class="row-header"><h2>AI 额度监控</h2><span class="muted">今日聚合视图</span></div>\
                  <div class="metric-list">\
                    <div class="metric-item"><div class="label">日期</div><div class="value" style="font-size:20px;">' + escapeHtml(monitoring.aiQuota.dateKey) + '</div></div>\
                    <div class="metric-item"><div class="label">已用额度</div><div class="value">' + monitoring.aiQuota.totalUsedCount + '</div></div>\
                    <div class="metric-item"><div class="label">总额度</div><div class="value">' + monitoring.aiQuota.totalLimitCount + '</div></div>\
                  </div>\
                  <div class="list" style="margin-top:12px;">' + monitoring.aiQuota.topUsers.map((item) => '<div class="metric-item"><div><strong>' + escapeHtml(item.nickname) + '</strong><div class="muted">' + escapeHtml(item.scope) + '</div></div><div class="value" style="font-size:22px;">' + item.usedCount + '/' + item.limitCount + '</div></div>').join('') + '</div>\
                </section>\
                <section class="panel">\
                  <div class="row-header"><h2>接口流量监控</h2><span class="muted">最近 24 小时</span></div>\
                  <div class="metric-list">\
                    <div class="metric-item"><div class="label">请求总数</div><div class="value">' + monitoring.traffic.totalRequestsLast24Hours + '</div></div>\
                    <div class="metric-item"><div class="label">错误请求</div><div class="value">' + monitoring.traffic.errorRequestsLast24Hours + '</div></div>\
                    <div class="metric-item"><div class="label">缓存命中</div><div class="value">' + monitoring.traffic.cacheHitsLast24Hours + '</div></div>\
                    <div class="metric-item"><div class="label">平均耗时</div><div class="value">' + monitoring.traffic.averageDurationMs + 'ms</div></div>\
                  </div>\
                  <div class="grid-2" style="margin-top:14px;">\
                    <div class="panel" style="padding:14px; box-shadow:none;">\
                      <h2 style="font-size:15px;">高频 scope</h2>\
                      <div class="kvs">' + monitoring.traffic.topScopes.map((item) => '<div class="kv"><span>' + escapeHtml(item.name) + '</span><strong>' + item.count + '</strong></div>').join('') + '</div>\
                    </div>\
                    <div class="panel" style="padding:14px; box-shadow:none;">\
                      <h2 style="font-size:15px;">高频 endpoint</h2>\
                      <div class="kvs">' + monitoring.traffic.topEndpoints.map((item) => '<div class="kv"><span>' + escapeHtml(item.name) + '</span><strong>' + item.count + '</strong></div>').join('') + '</div>\
                    </div>\
                  </div>\
                  <div class="panel" style="padding:14px; box-shadow:none; margin-top:14px;">\
                    <h2 style="font-size:15px;">最近请求日志</h2>\
                    <div class="kvs">' + monitoring.traffic.recentLogs.map((item) => '<div class="kv"><span>' + escapeHtml(item.scope + ' / ' + item.endpoint) + '</span><strong>' + item.statusCode + ' · ' + item.durationMs + 'ms</strong></div>').join('') + '</div>\
                  </div>\
                </section>\
              </div>\
            </div>\
          </div>';

        document.getElementById('refresh-dashboard').addEventListener('click', async () => {
          try {
            await fetchDashboard();
            renderDashboard();
          }
          catch (error) {
            renderStatus(error.message || '刷新失败');
          }
        });

        document.getElementById('logout-dashboard').addEventListener('click', async () => {
          await request('/api/admin/auth/logout', { method: 'POST' });
          state.session = null;
          state.dashboard = null;
          renderStatus('已退出登录');
          render();
        });

        document.getElementById('save-configs').addEventListener('click', async () => {
          try {
            renderStatus('保存配置中...');
            const adSlots = JSON.parse(document.getElementById('ad-slots-input').value);
            const productLinks = JSON.parse(document.getElementById('product-links-input').value);
            await request('/api/admin/configs/operation', {
              method: 'PUT',
              body: JSON.stringify({ adSlots, productLinks }),
            });
            await fetchDashboard();
            renderDashboard();
          }
          catch (error) {
            renderStatus(error.message || '保存配置失败');
          }
        });

        document.querySelectorAll('[data-member-action]').forEach((button) => {
          button.addEventListener('click', async () => {
            const userId = button.getAttribute('data-user-id');
            const action = button.getAttribute('data-member-action');
            if (!userId || !action) {
              return;
            }

            const payload = action === 'inactive'
              ? { packageType: 'monthly', status: 'inactive', benefitTypes: [] }
              : { packageType: action, status: 'active' };

            try {
              renderStatus('更新会员状态中...');
              await request('/api/admin/users/' + userId + '/member', {
                method: 'PATCH',
                body: JSON.stringify(payload),
              });
              await fetchDashboard();
              renderDashboard();
            }
            catch (error) {
              renderStatus(error.message || '会员更新失败');
            }
          });
        });

        document.querySelectorAll('[data-feedback-action]').forEach((button) => {
          button.addEventListener('click', async () => {
            const feedbackId = button.getAttribute('data-feedback-id');
            const status = button.getAttribute('data-feedback-action');
            const textarea = document.querySelector('[data-feedback-reply="' + feedbackId + '"]');
            const reply = textarea ? textarea.value.trim() : '';

            if (!feedbackId || !status || reply.length < 2) {
              renderStatus('请输入至少 2 个字的回复内容');
              return;
            }

            try {
              renderStatus('正在回复反馈...');
              await request('/api/admin/feedback/' + feedbackId + '/reply', {
                method: 'PATCH',
                body: JSON.stringify({ status, reply }),
              });
              await fetchDashboard();
              renderDashboard();
            }
            catch (error) {
              renderStatus(error.message || '反馈回复失败');
            }
          });
        });
      }

      function render() {
        if (!state.session) {
          renderLogin();
          return;
        }

        renderDashboard();
      }

      async function bootstrap() {
        try {
          await fetchSession();
          if (state.session) {
            await fetchDashboard();
          }
        }
        catch (error) {
          renderStatus(error.message || '初始化失败');
        }
        render();
      }

      void bootstrap();
    </script>
  </body>
</html>`;
