/* ============================================================
   VIVABANK — JavaScript du panneau d'administration
   Gère : KPIs, utilisateurs, prêts, transactions, dépôts,
          crédit/débit manuel, graphiques
   ============================================================ */

/* ── Vérification d'accès admin ────────────────────────────── */
Auth.requireAuth('login.html');
if (!Auth.isAdmin()) {
  window.location.href = 'dashboard.html';
}

/* ── État global de l'administration ────────────────────────── */
const A = {
  /* Données chargées */
  users:        [],
  loans:        [],
  transactions: [],
  deposits:     [],

  /* Filtres actifs */
  userFilter:    { search: '', status: 'all', sort: 'createdAt', dir: 'desc' },
  loanFilter:    'all',
  txFilter:      { search: '', type: 'all' },
  depositFilter: 'all',

  /* Pagination */
  userPage:    1, userPerPage:    15,
  loanPage:    1, loanPerPage:    10,
  txPage:      1, txPerPage:      15,
  depositPage: 1, depositPerPage: 15,

  /* Section active */
  section: 'dashboard',

  /* Opération crédit/débit en cours */
  cdUserId:   null,
  cdUserName: '',
  cdType:     'credit',

  /* Prêt en cours de rejet */
  rejectingLoanId: null,
};

/* ── Point d'entrée ─────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initTopbarDate();
  loadAdminInfo();
  await loadDashboard();
});

/* ── Date dans la topbar ─────────────────────────────────────── */
function initTopbarDate() {
  document.getElementById('topbarDate').textContent =
    new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long',
    }).format(new Date());
}

/* ── Charger les infos admin depuis le localStorage ──────────── */
function loadAdminInfo() {
  const user = Auth.getUser();
  if (!user) return;
  const ini = getInitials(user.firstName, user.lastName);
  document.getElementById('sidebarAvatar').textContent = ini;
  document.getElementById('topbarAvatar').textContent  = ini;
  document.getElementById('sidebarName').textContent   = `${user.firstName} ${user.lastName}`;
  document.getElementById('sidebarEmail').textContent  = user.email;
}

/* ══════════════════════════════════════════════════════════════
   NAVIGATION ENTRE SECTIONS
   ══════════════════════════════════════════════════════════════ */
function switchSection(section) {
  A.section = section;

  /* Masquer toutes les sections */
  document.querySelectorAll('[id^="sec-"]').forEach(el => el.style.display = 'none');
  document.getElementById(`sec-${section}`).style.display = 'block';

  /* Mettre à jour les nav items */
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  event?.currentTarget?.classList.add('active');

  /* Titre de la topbar */
  const titles = {
    dashboard:    'Dashboard',
    users:        'Usuarios',
    loans:        'Préstamos',
    transactions: 'Transacciones',
    deposits:     'Depósitos',
  };
  document.getElementById('sectionTitle').textContent = titles[section] || section;

  /* Charger les données de la section */
  const loaders = {
    users:        loadUsers,
    loans:        loadLoans,
    transactions: loadAdminTransactions,
    deposits:     loadDeposits,
  };
  if (loaders[section]) loaders[section]();
}

/* ══════════════════════════════════════════════════════════════
   DASHBOARD — KPIs ET GRAPHIQUES
   ══════════════════════════════════════════════════════════════ */
async function loadDashboard() {
  const r = await apiFetch('/admin/dashboard');
  if (!r?.ok) return;

  const { stats, recentUsers, chartData, txBreakdown } = r.data;

  /* KPIs */
  if (stats) {
    document.getElementById('kpiUsers').textContent        = stats.totalUsers   || '0';
    document.getElementById('kpiVolume').textContent       = formatMoney(stats.totalVolume || 0);
    document.getElementById('kpiTx').textContent           = stats.totalTx      || '0';
    document.getElementById('kpiPendingLoans').textContent = stats.pendingLoans || '0';

    if (stats.pendingLoans > 0) {
      const badge = document.getElementById('pendingLoansCount');
      badge.textContent = stats.pendingLoans;
      badge.style.display = 'inline-flex';
    }
    if (stats.newUsersThisMonth) {
      document.getElementById('kpiUsersDelta').textContent = `+${stats.newUsersThisMonth} este mes`;
    }
    if (stats.pendingLoans > 0) {
      document.getElementById('kpiLoansDelta').textContent = `${stats.pendingLoans} por revisar`;
    }
  }

  /* Graphique d'activité */
  buildAdminChart(chartData || []);

  /* Répartition par type */
  buildDonut(txBreakdown || {});

  /* Derniers utilisateurs */
  renderRecentUsers(recentUsers || []);
}

/* ── Graphique admin (canvas natif) ─────────────────────────── */
function buildAdminChart(data) {
  const canvas = document.getElementById('adminChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  const months  = getLast6Months();
  const volumes = data.length
    ? data.map(d => d.volume || 0)
    : Array.from({ length: 6 }, () => Math.random() * 50000 + 10000);

  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = (rect.width || 500) * dpr;
  canvas.height = 200 * dpr;
  canvas.style.width  = (rect.width || 500) + 'px';
  canvas.style.height = '200px';
  ctx.scale(dpr, dpr);

  const W = rect.width || 500;
  const H = 200;
  const PL = 60, PR = 16, PT = 16, PB = 36;
  const cW = W - PL - PR;
  const cH = H - PT - PB;
  const maxV = Math.max(...volumes, 1);

  ctx.clearRect(0, 0, W, H);

  /* Points de la courbe */
  const points = volumes.map((v, i) => ({
    x: PL + (cW / (volumes.length - 1)) * i,
    y: PT + cH - (v / maxV) * cH,
  }));

  /* Zone de remplissage sous la courbe */
  const grad = ctx.createLinearGradient(0, PT, 0, PT + cH);
  grad.addColorStop(0, 'rgba(255,81,47,0.2)');
  grad.addColorStop(1, 'rgba(255,81,47,0)');

  ctx.beginPath();
  ctx.moveTo(points[0].x, PT + cH);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, PT + cH);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  /* Ligne de la courbe */
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = '#FF512F';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  /* Points sur la courbe */
  points.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#FF512F';
    ctx.fill();
    ctx.strokeStyle = 'var(--bg-card)';
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  /* Labels des mois */
  ctx.fillStyle = 'rgba(136,150,171,0.8)';
  ctx.font = '10px Inter, sans-serif';
  ctx.textAlign = 'center';
  months.forEach((m, i) => {
    ctx.fillText(m, points[i].x, H - 8);
  });

  /* Labels de l'axe Y */
  ctx.textAlign = 'right';
  for (let i = 0; i <= 3; i++) {
    const v = maxV - (maxV / 3) * i;
    const y = PT + (cH / 3) * i;
    ctx.fillStyle = 'rgba(136,150,171,0.6)';
    ctx.fillText(v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0), PL - 8, y + 4);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PL, y); ctx.lineTo(W - PR, y);
    ctx.stroke();
  }
}

/* ── Donut de répartition (CSS simplifié) ───────────────────── */
function buildDonut(data) {
  const container = document.getElementById('txDonut');

  const items = [
    { label: 'Transferencias', key: 'transfer', color: '#3B82F6' },
    { label: 'Ingresos',       key: 'credit',   color: '#10D9A0' },
    { label: 'Gastos',         key: 'debit',     color: '#FF3B5C' },
    { label: 'Préstamos',      key: 'loan',      color: '#8B5CF6' },
  ];

  const total = items.reduce((s, i) => s + (data[i.key] || 0), 0) || 1;

  const legendHtml = items.map(item => {
    const count = data[item.key] || 0;
    const pct   = ((count / total) * 100).toFixed(1);
    return `
      <div class="donut-legend-item">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="donut-legend-dot" style="background:${item.color};"></div>
          <span style="color:var(--text-2);">${item.label}</span>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <span style="font-weight:700;color:var(--text-1);">${count}</span>
          <span style="font-size:0.72rem;color:var(--text-3);">${pct}%</span>
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div style="text-align:center;margin-bottom:8px;">
      <div style="font-family:var(--font-display);font-size:2.2rem;font-weight:900;background:var(--grad-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${total}</div>
      <div style="font-size:0.75rem;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;">Total operaciones</div>
    </div>
    <div class="donut-legend">${legendHtml}</div>`;
}

/* ── Derniers utilisateurs (tableau mini) ───────────────────── */
function renderRecentUsers(users) {
  const container = document.getElementById('recentUsersTable');
  if (!users.length) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><div class="empty-state-text">Sin usuarios registrados</div></div>';
    return;
  }

  container.innerHTML = `
    <table class="admin-table">
      <thead><tr>
        <th>Usuario</th>
        <th>Saldo</th>
        <th>Registro</th>
        <th>Estado</th>
      </tr></thead>
      <tbody>
        ${users.slice(0, 5).map(u => `
          <tr>
            <td><div class="user-mini">
              <div class="mini-avatar">${getInitials(u.firstName, u.lastName)}</div>
              <div>
                <div class="mini-name">${esc(u.firstName)} ${esc(u.lastName)}</div>
                <div class="mini-email">${esc(u.email)}</div>
              </div>
            </div></td>
            <td style="font-family:var(--font-display);font-weight:700;">${formatMoney(u.balance || 0)}</td>
            <td style="color:var(--text-2);font-size:0.82rem;">${formatDate(u.createdAt)}</td>
            <td><span class="badge ${u.isVerified ? 'badge-success' : 'badge-warning'}">${u.isVerified ? '✓ Verificado' : 'Pendiente'}</span></td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

/* ── Utilitaire mois ─────────────────────────────────────────── */
function getLast6Months() {
  const M = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const now = new Date();
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return M[d.getMonth()];
  });
}

/* ══════════════════════════════════════════════════════════════
   SECTION UTILISATEURS
   ══════════════════════════════════════════════════════════════ */
async function loadUsers() {
  const r = await apiFetch('/admin/users?limit=500');
  if (!r?.ok) return;
  A.users = r.data.users || [];
  applyUserFilters();
}

function filterUsers(search) {
  A.userFilter.search = search.toLowerCase();
  A.userFilter.status = document.getElementById('userStatusFilter').value;
  A.userPage = 1;
  applyUserFilters();
}

function sortUsers(field) {
  if (A.userFilter.sort === field) {
    A.userFilter.dir = A.userFilter.dir === 'asc' ? 'desc' : 'asc';
  } else {
    A.userFilter.sort = field;
    A.userFilter.dir = 'desc';
  }
  applyUserFilters();
}

function applyUserFilters() {
  let list = [...A.users];

  /* Filtre de recherche */
  if (A.userFilter.search) {
    list = list.filter(u =>
      (`${u.firstName} ${u.lastName}`.toLowerCase().includes(A.userFilter.search)) ||
      (u.email || '').toLowerCase().includes(A.userFilter.search)
    );
  }

  /* Filtre de statut */
  if (A.userFilter.status === 'verified')   list = list.filter(u => u.isVerified);
  if (A.userFilter.status === 'unverified') list = list.filter(u => !u.isVerified);

  /* Tri */
  list.sort((a, b) => {
    const aV = a[A.userFilter.sort] || 0;
    const bV = b[A.userFilter.sort] || 0;
    return A.userFilter.dir === 'asc' ? (aV > bV ? 1 : -1) : (aV < bV ? 1 : -1);
  });

  renderUsersTable(list);
}

function renderUsersTable(list) {
  const tbody = document.getElementById('usersTableBody');
  const total = list.length;
  const start = (A.userPage - 1) * A.userPerPage;
  const slice = list.slice(start, start + A.userPerPage);

  document.getElementById('userCount').textContent     = `${total} usuario${total !== 1 ? 's' : ''}`;
  document.getElementById('userPageInfo').textContent  =
    `Mostrando ${start + 1}–${Math.min(start + A.userPerPage, total)} de ${total}`;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-3);">
      No hay usuarios con estos filtros</td></tr>`;
    document.getElementById('userPagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = slice.map(u => `
    <tr>
      <td><div class="user-mini">
        <div class="mini-avatar">${getInitials(u.firstName, u.lastName)}</div>
        <div>
          <div class="mini-name">${esc(u.firstName)} ${esc(u.lastName)}</div>
          <div class="mini-email">${esc(u.email)}</div>
        </div>
      </div></td>
      <td style="font-family:var(--font-display);font-weight:700;">${formatMoney(u.balance || 0)}</td>
      <td style="color:var(--text-2);font-size:0.82rem;white-space:nowrap;">${formatDate(u.createdAt)}</td>
      <td><span class="badge ${u.isVerified ? 'badge-success' : 'badge-warning'}">
        ${u.isVerified ? '✓ Verificado' : '⏳ Pendiente'}
      </span></td>
      <td><span class="badge ${u.twoFactorEnabled ? 'badge-blue' : 'badge-gray'}">
        ${u.twoFactorEnabled ? '🔐 ON' : 'OFF'}
      </span></td>
      <td style="text-align:right;">
        <div class="row-actions" style="justify-content:flex-end;">
          <button class="action-btn view"   onclick="openUserDetail('${u._id}')" title="Ver detalle">👁</button>
          <button class="action-btn credit" onclick="openCreditDebit('${u._id}','${esc(u.firstName)} ${esc(u.lastName)}')" title="Ajustar saldo">💰</button>
        </div>
      </td>
    </tr>`).join('');

  renderPagination('userPagination', A.userPage, Math.ceil(total / A.userPerPage), p => {
    A.userPage = p; applyUserFilters();
  });
}

/* ── Détail utilisateur ─────────────────────────────────────── */
async function openUserDetail(userId) {
  openModal('userDetailModal');
  document.getElementById('userDetailContent').innerHTML =
    '<div style="text-align:center;padding:32px;"><div class="spinner spinner-color" style="margin:0 auto;"></div></div>';

  const r = await apiFetch(`/admin/users/${userId}`);
  if (!r?.ok) {
    document.getElementById('userDetailContent').innerHTML =
      '<div class="alert alert-error visible">Error al cargar el usuario.</div>';
    return;
  }

  const u = r.data.user || r.data;
  document.getElementById('userDetailContent').innerHTML = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="width:70px;height:70px;border-radius:50%;background:var(--grad-primary);
                  display:flex;align-items:center;justify-content:center;
                  font-family:var(--font-display);font-weight:800;font-size:1.5rem;
                  color:#fff;margin:0 auto 12px;box-shadow:0 6px 24px rgba(255,81,47,0.3);">
        ${getInitials(u.firstName, u.lastName)}
      </div>
      <div style="font-family:var(--font-display);font-size:1.15rem;font-weight:800;">
        ${esc(u.firstName)} ${esc(u.lastName)}
      </div>
      <div style="font-size:0.82rem;color:var(--text-3);margin-top:4px;">${esc(u.email)}</div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;">
      <div style="background:var(--bg-surface);border:1px solid var(--border-card);border-radius:var(--r-md);padding:14px;text-align:center;">
        <div style="font-size:0.7rem;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Saldo</div>
        <div style="font-family:var(--font-display);font-size:1.2rem;font-weight:800;background:var(--grad-primary);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;">${formatMoney(u.balance || 0)}</div>
      </div>
      <div style="background:var(--bg-surface);border:1px solid var(--border-card);border-radius:var(--r-md);padding:14px;text-align:center;">
        <div style="font-size:0.7rem;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:4px;">Movimientos</div>
        <div style="font-family:var(--font-display);font-size:1.2rem;font-weight:800;">${u.transactionCount || '0'}</div>
      </div>
    </div>

    <div style="display:flex;flex-direction:column;gap:10px;">
      ${[
        ['Teléfono',   u.phone || '—'],
        ['Verificado', u.isVerified ? '✓ Sí' : '✗ No'],
        ['2FA',        u.twoFactorEnabled ? '✓ Activo' : 'Inactivo'],
        ['Miembro desde', formatDate(u.createdAt)],
        ['Rol',        u.role || 'user'],
      ].map(([k, v]) => `
        <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--border);font-size:0.85rem;">
          <span style="color:var(--text-2);">${k}</span>
          <span style="font-weight:600;">${v}</span>
        </div>`).join('')}
    </div>

    <div style="margin-top:20px;">
      <button class="btn btn-primary btn-sm"
              onclick="closeModal('userDetailModal');openCreditDebit('${u._id}','${esc(u.firstName)} ${esc(u.lastName)}')">
        💰 Ajustar saldo
      </button>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   SECTION PRÉSTAMOS
   ══════════════════════════════════════════════════════════════ */
async function loadLoans() {
  const r = await apiFetch('/admin/loans?limit=500');
  if (!r?.ok) return;
  A.loans = r.data.loans || [];
  renderLoansTable(A.loans);
}

function filterLoans(status, btn) {
  A.loanFilter = status;
  A.loanPage = 1;
  document.querySelectorAll('#sec-loans .filter-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const list = status === 'all'
    ? A.loans
    : A.loans.filter(l => l.status === status);
  renderLoansTable(list);
}

function renderLoansTable(list) {
  const tbody = document.getElementById('loansTableBody');
  const start = (A.loanPage - 1) * A.loanPerPage;
  const slice = list.slice(start, start + A.loanPerPage);

  document.getElementById('loansCount').textContent =
    `${list.length} préstamo${list.length !== 1 ? 's' : ''}`;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:40px;color:var(--text-3);">
      No hay préstamos con este filtro</td></tr>`;
    document.getElementById('loansPagination').innerHTML = '';
    return;
  }

  const statusMap = {
    pending:  'badge-warning',
    approved: 'badge-success',
    rejected: 'badge-danger',
    active:   'badge-blue',
  };

  tbody.innerHTML = slice.map(l => {
    const user = l.user || {};
    return `
      <tr>
        <td><div class="user-mini">
          <div class="mini-avatar">${getInitials(user.firstName || '?', user.lastName || '?')}</div>
          <div>
            <div class="mini-name">${esc(user.firstName || '—')} ${esc(user.lastName || '')}</div>
            <div class="mini-email">${esc(user.email || '—')}</div>
          </div>
        </div></td>
        <td style="font-family:var(--font-display);font-weight:700;color:var(--text-1);">
          ${formatMoney(l.amount)}
        </td>
        <td style="color:var(--text-2);">${l.term ? l.term + ' meses' : '—'}</td>
        <td style="color:var(--text-2);font-size:0.82rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
            title="${esc(l.reason || '')}">
          ${esc(l.reason ? l.reason.slice(0, 60) + (l.reason.length > 60 ? '…' : '') : '—')}
        </td>
        <td style="color:var(--text-2);font-size:0.82rem;white-space:nowrap;">${formatDate(l.createdAt)}</td>
        <td><span class="badge ${statusMap[l.status] || 'badge-gray'}">
          ${l.status === 'pending' ? 'Pendiente' : l.status === 'approved' ? 'Aprobado' :
            l.status === 'rejected' ? 'Rechazado' : l.status === 'active' ? 'Activo' : l.status}
        </span></td>
        <td style="text-align:right;">
          <div class="row-actions" style="justify-content:flex-end;">
            ${l.status === 'pending' ? `
              <button class="action-btn approve" onclick="approveLoan('${l._id}')" title="Aprobar">✓</button>
              <button class="action-btn reject"  onclick="openRejectModal('${l._id}')" title="Rechazar">✕</button>
            ` : '—'}
          </div>
        </td>
      </tr>`;
  }).join('');

  renderPagination('loansPagination', A.loanPage, Math.ceil(list.length / A.loanPerPage), p => {
    A.loanPage = p;
    const filtered = A.loanFilter === 'all' ? A.loans : A.loans.filter(l => l.status === A.loanFilter);
    renderLoansTable(filtered);
  });
}

/* ── Approuver un prêt ──────────────────────────────────────── */
async function approveLoan(loanId) {
  if (!confirm('¿Confirmas la aprobación de este préstamo?')) return;

  const r = await apiFetch(`/admin/loans/${loanId}/approve`, { method: 'PUT' });

  if (r?.ok && r.data.success) {
    Toast.success('Préstamo aprobado. El importe ha sido ingresado en la cuenta del usuario.');
    await loadLoans();
  } else {
    Toast.error(r?.data.message || 'Error al aprobar el préstamo.');
  }
}

/* ── Ouvrir le modal de rejet ────────────────────────────────── */
function openRejectModal(loanId) {
  A.rejectingLoanId = loanId;
  document.getElementById('rejectReason').value = '';
  document.getElementById('rejectError').classList.remove('visible');
  openModal('rejectLoanModal');
}

/* ── Confirmer le rejet ─────────────────────────────────────── */
async function confirmRejectLoan() {
  const reason = document.getElementById('rejectReason').value.trim();
  const errEl  = document.getElementById('rejectError');
  errEl.classList.remove('visible');

  if (!reason || reason.length < 10) {
    errEl.textContent = '⚠ El motivo debe tener al menos 10 caracteres.';
    errEl.classList.add('visible');
    return;
  }

  setBtnLoading('rejectLoanBtn', true);

  const r = await apiFetch(`/admin/loans/${A.rejectingLoanId}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ rejectionReason: reason }),
  });

  setBtnLoading('rejectLoanBtn', false, 'Confirmar rechazo');

  if (r?.ok && r.data.success) {
    closeModal('rejectLoanModal');
    Toast.success('Préstamo rechazado. El usuario ha sido notificado.');
    await loadLoans();
  } else {
    errEl.textContent = '⚠ ' + (r?.data.message || 'Error al rechazar el préstamo.');
    errEl.classList.add('visible');
  }
}

/* ══════════════════════════════════════════════════════════════
   SECTION TRANSACCIONES
   ══════════════════════════════════════════════════════════════ */
async function loadAdminTransactions() {
  const r = await apiFetch('/admin/transactions?limit=500');
  if (!r?.ok) return;
  A.transactions = r.data.transactions || [];
  renderAdminTx(A.transactions);
}

function filterAdminTx(search) {
  const type = document.getElementById('txAdminType').value;
  A.txFilter = { search: search.toLowerCase(), type };
  A.txPage = 1;

  const list = A.transactions.filter(tx => {
    const matchType   = type === 'all' || tx.type === type;
    const matchSearch = !search ||
      (tx.description || '').toLowerCase().includes(search) ||
      (tx.userEmail || '').toLowerCase().includes(search);
    return matchType && matchSearch;
  });

  renderAdminTx(list);
}

function renderAdminTx(list) {
  const tbody = document.getElementById('txAdminBody');
  const start = (A.txPage - 1) * A.txPerPage;
  const slice = list.slice(start, start + A.txPerPage);

  document.getElementById('txAdminCount').textContent    = `${list.length} transacciones`;
  document.getElementById('txAdminPageInfo').textContent =
    `Mostrando ${start + 1}–${Math.min(start + A.txPerPage, list.length)} de ${list.length}`;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-3);">Sin resultados</td></tr>`;
    document.getElementById('txAdminPagination').innerHTML = '';
    return;
  }

  const typeMap = {
    credit:   { icon:'⬆', color:'var(--mint)',   label:'Ingreso' },
    debit:    { icon:'⬇', color:'var(--danger)', label:'Gasto' },
    transfer: { icon:'↗', color:'var(--blue)',   label:'Transferencia' },
    loan:     { icon:'🏦', color:'var(--purple)', label:'Préstamo' },
  };

  tbody.innerHTML = slice.map(tx => {
    const t = typeMap[tx.type] || typeMap.debit;
    const isPos = tx.type === 'credit' || tx.type === 'loan';
    const user = tx.user || {};
    return `
      <tr>
        <td><div class="user-mini">
          <div class="mini-avatar">${getInitials(user.firstName || '?', user.lastName || '?')}</div>
          <div>
            <div class="mini-name">${esc(user.firstName || '—')} ${esc(user.lastName || '')}</div>
            <div class="mini-email">${esc(user.email || tx.userEmail || '—')}</div>
          </div>
        </div></td>
        <td><span class="badge badge-gray" style="font-size:0.68rem;">${t.icon} ${t.label}</span></td>
        <td style="color:var(--text-1);font-size:0.83rem;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${esc(tx.description || '—')}
        </td>
        <td style="color:var(--text-2);font-size:0.8rem;white-space:nowrap;">${formatDateTime(tx.createdAt)}</td>
        <td style="text-align:right;font-family:var(--font-display);font-weight:700;color:${t.color};white-space:nowrap;">
          ${isPos ? '+' : '-'}${formatMoney(Math.abs(tx.amount))}
        </td>
        <td style="text-align:right;">
          <span class="badge ${tx.status === 'completed' ? 'badge-success' : tx.status === 'pending' ? 'badge-warning' : 'badge-gray'}">
            ${tx.status === 'completed' ? 'Completado' : tx.status === 'pending' ? 'Pendiente' : tx.status || '—'}
          </span>
        </td>
      </tr>`;
  }).join('');

  renderPagination('txAdminPagination', A.txPage, Math.ceil(list.length / A.txPerPage), p => {
    A.txPage = p;
    const current = A.transactions.filter(tx => {
      const matchType = A.txFilter.type === 'all' || tx.type === A.txFilter.type;
      const matchS    = !A.txFilter.search || (tx.description||'').toLowerCase().includes(A.txFilter.search);
      return matchType && matchS;
    });
    renderAdminTx(current);
  });
}

/* ══════════════════════════════════════════════════════════════
   SECTION DÉPÔTS
   ══════════════════════════════════════════════════════════════ */
async function loadDeposits() {
  const status = document.getElementById('depositStatusFilter')?.value || 'all';
  const url    = status === 'all' ? '/admin/deposits?limit=300' : `/admin/deposits?status=${status}&limit=300`;
  const r      = await apiFetch(url);
  if (!r?.ok) return;
  A.deposits = r.data.deposits || [];
  renderDeposits(A.deposits);
}

function renderDeposits(list) {
  const tbody = document.getElementById('depositsBody');
  const start = (A.depositPage - 1) * A.depositPerPage;
  const slice = list.slice(start, start + A.depositPerPage);

  document.getElementById('depositsCount').textContent = `${list.length} depósito${list.length !== 1 ? 's' : ''}`;

  if (!slice.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-3);">Sin depósitos</td></tr>`;
    document.getElementById('depositsPagination').innerHTML = '';
    return;
  }

  tbody.innerHTML = slice.map(d => {
    const user = d.user || {};
    return `
      <tr>
        <td><div class="user-mini">
          <div class="mini-avatar">${getInitials(user.firstName || '?', user.lastName || '?')}</div>
          <div>
            <div class="mini-name">${esc(user.firstName || '—')} ${esc(user.lastName || '')}</div>
            <div class="mini-email">${esc(user.email || '—')}</div>
          </div>
        </div></td>
        <td style="font-family:var(--font-display);font-weight:700;">${formatMoney(d.amount || 0)}</td>
        <td style="color:var(--text-2);">💳 Stripe</td>
        <td style="font-size:0.75rem;color:var(--text-3);font-family:var(--font-display);">
          ${esc(d.stripeSessionId ? d.stripeSessionId.slice(0, 20) + '…' : '—')}
        </td>
        <td style="color:var(--text-2);font-size:0.82rem;white-space:nowrap;">${formatDateTime(d.createdAt)}</td>
        <td style="text-align:right;">
          <span class="badge ${d.status === 'completed' ? 'badge-success' : d.status === 'failed' ? 'badge-danger' : 'badge-warning'}">
            ${d.status === 'completed' ? 'Completado' : d.status === 'failed' ? 'Fallido' : 'Pendiente'}
          </span>
        </td>
      </tr>`;
  }).join('');

  renderPagination('depositsPagination', A.depositPage, Math.ceil(list.length / A.depositPerPage), p => {
    A.depositPage = p; renderDeposits(A.deposits);
  });
}

/* ══════════════════════════════════════════════════════════════
   CRÉDIT / DÉBIT MANUEL
   ══════════════════════════════════════════════════════════════ */
function openCreditDebit(userId, userName) {
  A.cdUserId   = userId;
  A.cdUserName = userName;
  A.cdType     = 'credit';

  document.getElementById('cdUserName').textContent = userName;
  document.getElementById('cdAmount').value  = '';
  document.getElementById('cdReason').value  = '';
  document.getElementById('cdError').classList.remove('visible');
  document.getElementById('cdSuccess').classList.remove('visible');

  /* Activer l'onglet crédit par défaut */
  document.querySelectorAll('.cd-tab').forEach(t => t.classList.remove('active'));
  document.querySelector('.cd-tab.credit').classList.add('active');

  openModal('creditDebitModal');
}

function setCdType(type, btn) {
  A.cdType = type;
  document.querySelectorAll('.cd-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');
}

async function executeCreditDebit() {
  const errEl = document.getElementById('cdError');
  const sucEl = document.getElementById('cdSuccess');
  errEl.classList.remove('visible');
  sucEl.classList.remove('visible');

  const amount = parseFloat(document.getElementById('cdAmount').value);
  const reason = document.getElementById('cdReason').value.trim();

  if (!Validate.amount(amount)) {
    errEl.textContent = '⚠ Introduce un importe válido.';
    errEl.classList.add('visible'); return;
  }
  if (!reason) {
    errEl.textContent = '⚠ El motivo es obligatorio.';
    errEl.classList.add('visible'); return;
  }

  setBtnLoading('cdConfirmBtn', true);

  const endpoint = A.cdType === 'credit'
    ? `/admin/users/${A.cdUserId}/credit`
    : `/admin/users/${A.cdUserId}/debit`;

  const r = await apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({ amount, description: reason }),
  });

  setBtnLoading('cdConfirmBtn', false, 'Aplicar ajuste');

  if (r?.ok && r.data.success) {
    const emoji = A.cdType === 'credit' ? '✓ Crédito' : '✓ Débito';
    sucEl.textContent = `${emoji} de ${formatMoney(amount)} aplicado correctamente a ${A.cdUserName}.`;
    sucEl.classList.add('visible');
    document.getElementById('cdAmount').value = '';
    document.getElementById('cdReason').value = '';
    /* Recharger les utilisateurs si la section est active */
    if (A.section === 'users') await loadUsers();
  } else {
    errEl.textContent = '⚠ ' + (r?.data.message || 'Error al aplicar el ajuste.');
    errEl.classList.add('visible');
  }
}

/* ══════════════════════════════════════════════════════════════
   PAGINATION GÉNÉRIQUE
   ══════════════════════════════════════════════════════════════ */
function renderPagination(containerId, current, total, callback) {
  const container = document.getElementById(containerId);
  if (total <= 1) { container.innerHTML = ''; return; }

  let html = '';
  if (current > 1) html += `<button class="page-btn" onclick="(${callback})(${current - 1})">‹</button>`;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= 1) {
      html += `<button class="page-btn ${i === current ? 'active' : ''}"
               onclick="(${callback})(${i})">${i}</button>`;
    } else if (Math.abs(i - current) === 2) {
      html += `<span style="color:var(--text-3);padding:0 4px;">…</span>`;
    }
  }

  if (current < total) html += `<button class="page-btn" onclick="(${callback})(${current + 1})">›</button>`;
  container.innerHTML = html;
}

/* ══════════════════════════════════════════════════════════════
   UTILITAIRES
   ══════════════════════════════════════════════════════════════ */

/* Échappement HTML (protection XSS) */
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, c =>
    ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' }[c]));
}

/* Sidebar mobile */
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebarOverlay').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
}

/* Déconnexion */
async function logout() {
  await apiFetch('/auth/logout', { method: 'POST' });
  Auth.clear();
  window.location.href = 'login.html';
}
