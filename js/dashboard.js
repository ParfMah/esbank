/* ============================================================
   VIVABANK — JavaScript du tableau de bord principal
   Gère : profil utilisateur, solde, transactions, graphique,
          dépôt Stripe, téléchargement de relevé PDF
   ============================================================ */

/* ── Vérification d'authentification ───────────────────────── */
Auth.requireAuth('login.html');

/* ── État local du dashboard ────────────────────────────────── */
const state = {
  user:          null,
  balance:       0,
  transactions:  [],
  txFilter:      'all',
  chartPeriod:   6,
  depositAmount: 0,
};

/* ── Point d'entrée au chargement de la page ─────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  initTopbarDate();
  loadUserFromStorage();
  handleStripeReturn();
  await Promise.all([
    loadDashboardData(),
    loadTransactions(),
  ]);
});

/* -- Gestion du retour depuis Stripe Checkout -------------------- */
function handleStripeReturn() {
  const params  = new URLSearchParams(window.location.search);
  const deposit = params.get('deposit');
  if (!deposit) return;

  const banner = document.getElementById('stripeReturnBanner');
  if (!banner) return;

  if (deposit === 'success') {
    banner.innerHTML = '<div class="alert alert-success visible" style="font-size:0.92rem;">✓ Deposito realizado con exito. Tu saldo se actualizara en breve.</div>';
  } else if (deposit === 'cancelled') {
    banner.innerHTML = '<div class="alert alert-warning visible" style="font-size:0.92rem;">Pago cancelado. Puedes intentarlo de nuevo cuando quieras.</div>';
  }
  banner.style.display = 'block';
  window.history.replaceState({}, document.title, window.location.pathname);
  setTimeout(() => { banner.style.opacity='0'; banner.style.transition='opacity 0.5s'; setTimeout(()=>{banner.style.display='none';},500); }, 6000);
}

/* ── Affichage de la date et heure dans la topbar ────────────── */
function initTopbarDate() {
  const el = document.getElementById('topbarDate');
  function tick() {
    el.textContent = new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', day: 'numeric', month: 'long',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date());
  }
  tick();
  setInterval(tick, 60000);
}

/* ── Pré-remplissage depuis le localStorage (affichage rapide) ── */
function loadUserFromStorage() {
  const user = Auth.getUser();
  if (!user) return;
  state.user = user;

  const initials = getInitials(user.firstName, user.lastName);
  const fullName = `${user.firstName} ${user.lastName}`;

  document.getElementById('sidebarAvatar').textContent = initials;
  document.getElementById('topbarAvatar').textContent  = initials;
  document.getElementById('sidebarName').textContent   = fullName;
  document.getElementById('sidebarEmail').textContent  = user.email || '—';

  /* Salutation selon l'heure */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  document.getElementById('greetingText').textContent =
    `${greeting}, ${user.firstName}! 👋`;
}

/* ── Chargement des données du dashboard depuis l'API ─────────── */
async function loadDashboardData() {
  const result = await apiFetch('/user/dashboard');
  if (!result || !result.ok) return;

  const { balance, monthlyStats, loans } = result.data;
  state.balance = balance || 0;

  /* Mise à jour du solde principal */
  document.getElementById('balanceAmount').textContent = formatMoney(state.balance);

  /* IBAN partiel (affiché masqué) */
  const user = Auth.getUser();
  if (user?.accountNumber) {
    const last4 = user.accountNumber.slice(-4);
    document.getElementById('accountIban').textContent = `Cuenta •••• ${last4}`;
  }

  /* Badge vérifié */
  if (user?.isVerified) {
    document.getElementById('verifiedBadge').style.display = 'inline-flex';
  }

  /* Statistiques du mois */
  if (monthlyStats) {
    document.getElementById('monthIncome').textContent   = formatMoney(monthlyStats.income || 0);
    document.getElementById('monthExpenses').textContent = formatMoney(monthlyStats.expenses || 0);

    /* Variation en % */
    if (monthlyStats.incomeChange != null) {
      const incEl = document.getElementById('monthIncomeDelta');
      incEl.textContent = (monthlyStats.incomeChange >= 0 ? '+' : '') +
        monthlyStats.incomeChange.toFixed(1) + '%';
      incEl.className = 'stat-card-delta ' +
        (monthlyStats.incomeChange >= 0 ? 'delta-pos' : 'delta-neg');
    }
  }

  /* Prêts actifs */
  if (loans !== undefined) {
    document.getElementById('activeLoans').textContent = loans || '0';
    document.getElementById('loanStatus').textContent =
      loans > 0 ? `${loans} activo${loans > 1 ? 's' : ''}` : 'Sin préstamos';
  }

  /* Construire le graphique d'activité */
  buildActivityChart(result.data.chartData || []);
}

/* ── Chargement des transactions récentes ─────────────────────── */
async function loadTransactions() {
  const result = await apiFetch('/transactions?limit=15');

  /* Supprimer le skeleton */
  const skeleton = document.getElementById('txSkeleton');
  if (skeleton) skeleton.remove();

  if (!result || !result.ok || !result.data.transactions?.length) {
    renderEmptyTransactions();
    return;
  }

  state.transactions = result.data.transactions;
  renderTransactions();
}

/* ── Rendu des transactions ────────────────────────────────────── */
function renderTransactions() {
  const container = document.getElementById('txList');

  /* Filtrer selon l'onglet actif */
  const filtered = state.txFilter === 'all'
    ? state.transactions
    : state.transactions.filter(tx => tx.type === state.txFilter);

  if (!filtered.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <div class="empty-state-text">No hay movimientos en esta categoría</div>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(tx => buildTxItem(tx)).join('');
}

/* ── Construction d'un élément de transaction ─────────────────── */
function buildTxItem(tx) {
  /* Couleur et icône selon le type */
  const typeMap = {
    credit:   { icon: '⬆', cls: 'tx-credit',   color: 'var(--mint)',   sign: '+', label: 'Ingreso' },
    debit:    { icon: '⬇', cls: 'tx-debit',    color: 'var(--danger)', sign: '-', label: 'Gasto' },
    transfer: { icon: '↗', cls: 'tx-transfer', color: 'var(--blue)',   sign: '-', label: 'Transferencia' },
    loan:     { icon: '🏦', cls: 'tx-loan',    color: 'var(--purple)', sign: '+', label: 'Préstamo' },
  };

  const t = typeMap[tx.type] || typeMap.debit;
  const isPositive = tx.type === 'credit' || tx.type === 'loan';

  return `
    <div class="tx-item">
      <div class="tx-icon ${t.cls}" style="display:flex;align-items:center;justify-content:center;font-size:1rem;">
        ${t.icon}
      </div>
      <div class="tx-item-info">
        <div class="tx-item-label">${escapeHtml(tx.description || tx.type)}</div>
        <div class="tx-item-date">${formatDateTime(tx.createdAt)}</div>
      </div>
      <div class="tx-item-right">
        <div class="tx-item-amount" style="color:${t.color}">
          ${isPositive ? '+' : '-'}${formatMoney(Math.abs(tx.amount))}
        </div>
        <div class="tx-item-type">${t.label}</div>
      </div>
    </div>`;
}

/* ── État vide transactions ────────────────────────────────────── */
function renderEmptyTransactions() {
  document.getElementById('txList').innerHTML = `
    <div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-text">
        No tienes movimientos aún.<br>
        Añade fondos para empezar.
      </div>
    </div>`;
}

/* ── Filtre des transactions par onglet ───────────────────────── */
function filterTx(type, btn) {
  state.txFilter = type;

  /* Mettre à jour les onglets actifs */
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  renderTransactions();
}

/* ── Graphique d'activité mensuelle (Canvas natif) ─────────────── */
function buildActivityChart(chartData) {
  const canvas  = document.getElementById('activityChart');
  if (!canvas) return;
  const ctx     = canvas.getContext('2d');
  const dpr     = window.devicePixelRatio || 1;

  /* Obtenir les données réelles ou simulées */
  const months  = getLast6Months();
  const incomes = chartData.length
    ? chartData.map(d => d.income  || 0)
    : generateFakeData(state.balance);
  const expenses = chartData.length
    ? chartData.map(d => d.expenses || 0)
    : generateFakeData(state.balance * 0.6);

  /* Stocker pour rechargement */
  state._chartIncomes  = incomes;
  state._chartExpenses = expenses;
  state._chartMonths   = months;

  drawChart(canvas, ctx, dpr, months, incomes, expenses);
}

/* ── Dessin du graphique en barres ────────────────────────────── */
function drawChart(canvas, ctx, dpr, labels, incomes, expenses) {
  /* Dimensions responsive */
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width  = rect.width  * dpr;
  canvas.height = 200 * dpr;
  canvas.style.width  = rect.width  + 'px';
  canvas.style.height = '200px';
  ctx.scale(dpr, dpr);

  const W = rect.width;
  const H = 200;
  const PAD_L = 50, PAD_R = 16, PAD_T = 16, PAD_B = 40;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  ctx.clearRect(0, 0, W, H);

  const maxVal = Math.max(...incomes, ...expenses, 1);
  const n      = labels.length;
  const groupW = chartW / n;
  const barW   = Math.max(8, groupW * 0.28);

  /* Lignes de grille horizontales */
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = PAD_T + (chartH / 4) * i;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.moveTo(PAD_L, y);
    ctx.lineTo(W - PAD_R, y);
    ctx.stroke();

    /* Labels de l'axe Y */
    ctx.fillStyle = 'rgba(136, 150, 171, 0.7)';
    ctx.font      = `10px Inter, sans-serif`;
    ctx.textAlign = 'right';
    const val = maxVal - (maxVal / 4) * i;
    ctx.fillText(val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val.toFixed(0), PAD_L - 6, y + 4);
  }

  /* Barres de chaque mois */
  labels.forEach((label, i) => {
    const x       = PAD_L + groupW * i + groupW / 2;
    const hIncome = (incomes[i] / maxVal) * chartH;
    const hExpense = (expenses[i] / maxVal) * chartH;

    /* Barre Ingresos (menthe) */
    const gInc = ctx.createLinearGradient(0, PAD_T + chartH - hIncome, 0, PAD_T + chartH);
    gInc.addColorStop(0, '#10D9A0');
    gInc.addColorStop(1, 'rgba(16,217,160,0.3)');
    ctx.fillStyle = gInc;
    ctx.beginPath();
    ctx.roundRect(x - barW - 2, PAD_T + chartH - hIncome, barW, hIncome, 4);
    ctx.fill();

    /* Barre Gastos (rouge) */
    const gExp = ctx.createLinearGradient(0, PAD_T + chartH - hExpense, 0, PAD_T + chartH);
    gExp.addColorStop(0, '#FF3B5C');
    gExp.addColorStop(1, 'rgba(255,59,92,0.3)');
    ctx.fillStyle = gExp;
    ctx.beginPath();
    ctx.roundRect(x + 2, PAD_T + chartH - hExpense, barW, hExpense, 4);
    ctx.fill();

    /* Label du mois */
    ctx.fillStyle = 'rgba(136,150,171,0.8)';
    ctx.font      = `10px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(label, x, H - 10);
  });
}

/* ── Changer la période du graphique ──────────────────────────── */
function setChartPeriod(months, btn) {
  state.chartPeriod = months;
  document.querySelectorAll('.panel-header .filter-tab').forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  /* Recharger le graphique avec la nouvelle période */
  const canvas = document.getElementById('activityChart');
  const ctx    = canvas.getContext('2d');
  const dpr    = window.devicePixelRatio || 1;
  const labels = months === 6 ? getLast6Months() : getLast12Months();

  drawChart(canvas, ctx, dpr, labels,
    generateFakeData(state.balance, months),
    generateFakeData(state.balance * 0.6, months));
}

/* ── Utilitaires de date pour le graphique ─────────────────────── */
function getLast6Months() {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(months[d.getMonth()]);
  }
  return result;
}

function getLast12Months() {
  const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
  const now = new Date();
  const result = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push(months[d.getMonth()]);
  }
  return result;
}

/* ── Génération de données simulées ─────────────────────────────── */
function generateFakeData(base = 1000, count = 6) {
  return Array.from({ length: count }, () =>
    Math.max(50, base * (0.4 + Math.random() * 0.6))
  );
}

/* ── Redessiner le graphique lors du redimensionnement ─────────── */
let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    const canvas = document.getElementById('activityChart');
    if (!canvas || !state._chartMonths) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    drawChart(canvas, ctx, dpr, state._chartMonths, state._chartIncomes, state._chartExpenses);
  }, 200);
});

/* ══════════════════════════════════════════════════════════════
   DÉPÔT (STRIPE)
   ══════════════════════════════════════════════════════════════ */

/* ── Ouvrir la modal de dépôt ─────────────────────────────────── */
function openDepositModal() {
  document.getElementById('depositError').classList.remove('visible');
  document.getElementById('depositSuccess').classList.remove('visible');
  document.getElementById('depositAmount').value = '';
  document.getElementById('depositSummaryBox').style.display = 'none';
  document.querySelectorAll('.amount-preset').forEach(el => el.classList.remove('selected'));
  openModal('depositModal');
}

/* ── Sélection d'un montant prédéfini ─────────────────────────── */
function selectAmount(amount) {
  state.depositAmount = amount;
  document.getElementById('depositAmount').value = amount;
  document.querySelectorAll('.amount-preset').forEach(el => el.classList.remove('selected'));
  event.target.classList.add('selected');
  updateDepositSummary(amount);
}

/* ── Mise à jour du résumé du montant ─────────────────────────── */
function updateDepositSummary(val) {
  const amount = parseFloat(val) || 0;
  state.depositAmount = amount;
  const box = document.getElementById('depositSummaryBox');

  if (amount > 0) {
    box.style.display = 'block';
    document.getElementById('depositSummaryAmt').textContent = formatMoney(amount);
    /* Désélectionner les presets si on tape manuellement */
    const amountStr = String(amount);
    document.querySelectorAll('.amount-preset').forEach(el => {
      el.classList.toggle('selected', el.textContent.replace(' €', '') === amountStr);
    });
  } else {
    box.style.display = 'none';
  }
}

/* ── Initiation du paiement Stripe ───────────────────────────── */
async function initiateStripePayment() {
  const errEl = document.getElementById('depositError');
  const sucEl = document.getElementById('depositSuccess');
  errEl.classList.remove('visible');
  sucEl.classList.remove('visible');

  const amount = state.depositAmount;

  /* Validation du montant */
  if (!amount || amount < 1) {
    errEl.textContent = '⚠ Introduce un importe mínimo de 1 €.';
    errEl.classList.add('visible');
    return;
  }
  if (amount > 10000) {
    errEl.textContent = '⚠ El importe máximo por operación es 10.000 €.';
    errEl.classList.add('visible');
    return;
  }

  setBtnLoading('stripePayBtn', true);

  /* Appel API pour créer une session de paiement Stripe */
  const result = await apiFetch('/deposits/create-checkout-session', {
    method: 'POST',
    body: JSON.stringify({
      amount: Math.round(amount * 100), /* Stripe utilise les centimes */
      currency: 'eur',
    }),
  });

  setBtnLoading('stripePayBtn', false, '🔒 Pagar con Stripe');

  if (!result) return;

  if (result.ok && result.data.url) {
    /* Redirection vers la page de paiement Stripe */
    window.location.href = result.data.url;
  } else {
    errEl.textContent = '⚠ ' + (result.data.message || 'Error al procesar el pago. Inténtalo de nuevo.');
    errEl.classList.add('visible');
  }
}

/* ══════════════════════════════════════════════════════════════
   TÉLÉCHARGEMENT DU RELEVÉ PDF
   ══════════════════════════════════════════════════════════════ */
async function downloadStatement() {
  Toast.info('Generando tu extracto PDF…');
  const token = Auth.getToken();

  try {
    /* Requête avec le token dans l'URL ou le header */
    const res = await fetch(`${API_URL}/statements/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      Toast.error('Error al generar el extracto. Inténtalo de nuevo.');
      return;
    }

    /* Téléchargement du fichier blob */
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `extracto-vivabank-${new Date().toISOString().slice(0,10)}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    Toast.success('Extracto descargado correctamente.');

  } catch (err) {
    console.error('[STATEMENT ERROR]', err);
    Toast.error('No se pudo descargar el extracto.');
  }
}

/* ══════════════════════════════════════════════════════════════
   SIDEBAR MOBILE
   ══════════════════════════════════════════════════════════════ */
function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const isOpen   = sidebar.classList.contains('open');
  sidebar.classList.toggle('open', !isOpen);
  overlay.classList.toggle('open', !isOpen);
  document.getElementById('menuToggle').textContent = isOpen ? '☰' : '✕';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').classList.remove('open');
  document.getElementById('menuToggle').textContent = '☰';
}

/* ══════════════════════════════════════════════════════════════
   DÉCONNEXION
   ══════════════════════════════════════════════════════════════ */
async function logout() {
  /* Appel API pour invalider le token côté serveur */
  await apiFetch('/auth/logout', { method: 'POST' });
  Auth.clear();
  window.location.href = 'login.html';
}

/* ══════════════════════════════════════════════════════════════
   UTILITAIRES
   ══════════════════════════════════════════════════════════════ */

/* Échappement HTML pour prévenir les injections XSS */
function escapeHtml(str) {
  const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' };
  return String(str || '').replace(/[&<>"']/g, m => map[m]);
}
