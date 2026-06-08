/* ============================================================
   VIVABANK — Configuration globale et utilitaires partagés
   Ce fichier est inclus sur toutes les pages
   ============================================================ */

/* ── URL de l'API backend ───────────────────────────────────── */
const API_URL = 'https://vivabank-backend.onrender.com/api/v1';

/* ── Gestion des tokens JWT ─────────────────────────────────── */
const Auth = {
  /* Récupère le token d'accès depuis le localStorage */
  getToken()    { return localStorage.getItem('vb_token'); },

  /* Récupère le token de rafraîchissement */
  getRefresh()  { return localStorage.getItem('vb_refresh'); },

  /* Récupère les données utilisateur (objet JSON) */
  getUser()     {
    try { return JSON.parse(localStorage.getItem('vb_user')); }
    catch { return null; }
  },

  /* Sauvegarde les tokens et l'utilisateur après connexion */
  save({ token, refreshToken, user }) {
    localStorage.setItem('vb_token',   token);
    localStorage.setItem('vb_refresh', refreshToken);
    localStorage.setItem('vb_user',    JSON.stringify(user));
  },

  /* Supprime toutes les données de session */
  clear() {
    localStorage.removeItem('vb_token');
    localStorage.removeItem('vb_refresh');
    localStorage.removeItem('vb_user');
  },

  /* Vérifie si l'utilisateur est connecté */
  isLoggedIn() { return !!this.getToken(); },

  /* Vérifie si l'utilisateur est admin */
  isAdmin() {
    const u = this.getUser();
    return u && (u.role === 'admin' || u.role === 'superadmin');
  },

  /* Redirige vers le dashboard si déjà connecté */
  redirectIfLogged(dest = 'dashboard.html') {
    if (this.isLoggedIn()) window.location.href = dest;
  },

  /* Redirige vers login si non connecté */
  requireAuth(dest = 'login.html') {
    if (!this.isLoggedIn()) window.location.href = dest;
  }
};

/* ── Requête API centralisée ────────────────────────────────── */
async function apiFetch(path, options = {}) {
  const token = Auth.getToken();

  /* Construction des en-têtes */
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    /* Token expiré → déconnexion automatique */
    if (res.status === 401) {
      Auth.clear();
      window.location.href = 'login.html';
      return null;
    }

    const data = await res.json();
    return { ok: res.ok, status: res.status, data };

  } catch (err) {
    console.error('[API ERROR]', err);
    return { ok: false, status: 0, data: { message: 'Error de conexión. Verifica tu red.' } };
  }
}

/* ── Système de Toast / Notifications ──────────────────────── */
const Toast = {
  /* Conteneur unique créé dynamiquement */
  _container: null,

  _getContainer() {
    if (!this._container) {
      this._container = document.createElement('div');
      this._container.className = 'toast-container';
      document.body.appendChild(this._container);
    }
    return this._container;
  },

  /* Affiche un toast (type: success | error | info | warning) */
  show(message, type = 'info', duration = 4000) {
    const container = this._getContainer();
    const toast = document.createElement('div');

    /* Icônes par type */
    const icons = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span style="font-size:1.1rem;flex-shrink:0">${icons[type]}</span>
      <span>${message}</span>
    `;

    container.appendChild(toast);

    /* Suppression automatique avec animation */
    setTimeout(() => {
      toast.classList.add('removing');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success(msg, d) { this.show(msg, 'success', d); },
  error(msg, d)   { this.show(msg, 'error', d); },
  info(msg, d)    { this.show(msg, 'info', d); },
  warning(msg, d) { this.show(msg, 'warning', d); },
};

/* ── Formatage monétaire ────────────────────────────────────── */
function formatMoney(amount, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

/* ── Formatage de date ──────────────────────────────────────── */
function formatDate(dateStr, opts = {}) {
  if (!dateStr) return '—';
  const defaults = { day: '2-digit', month: 'short', year: 'numeric' };
  return new Intl.DateTimeFormat('es-ES', { ...defaults, ...opts })
    .format(new Date(dateStr));
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(dateStr));
}

/* ── Initiales utilisateur ──────────────────────────────────── */
function getInitials(firstName = '', lastName = '') {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/* ── Validation de formulaire ───────────────────────────────── */
const Validate = {
  email(val) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val); },
  password(val) { return val.length >= 8 && /[A-Z]/.test(val) && /[0-9]/.test(val); },
  phone(val) { return /^(\+34|0034)?[6789]\d{8}$/.test(val.replace(/\s/g,'')); },
  amount(val) { return !isNaN(val) && parseFloat(val) > 0; },
  required(val) { return val && val.toString().trim().length > 0; },
};

/* ── Affichage des erreurs de formulaire ────────────────────── */
function showFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.classList.add('error');
  let err = input.parentElement.querySelector('.form-error');
  if (!err) {
    err = document.createElement('p');
    err.className = 'form-error';
    input.parentElement.appendChild(err);
  }
  err.textContent = message;
}

function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.classList.remove('error');
  const err = input.parentElement.querySelector('.form-error');
  if (err) err.remove();
}

/* ── Bouton avec état de chargement ─────────────────────────── */
function setBtnLoading(btnId, loading, label = '') {
  const btn = document.getElementById(btnId);
  if (!btn) return;
  if (loading) {
    btn._originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner spinner-sm"></span>`;
    btn.disabled = true;
  } else {
    btn.innerHTML = label || btn._originalText || '';
    btn.disabled = false;
  }
}

/* ── Fermeture modale ───────────────────────────────────────── */
function openModal(id)  {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}

/* Fermer les modales en cliquant sur l'overlay */
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    document.body.style.overflow = '';
  }
});

/* ── Écoute scroll navbar ───────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 20);
    }, { passive: true });
  }
});
