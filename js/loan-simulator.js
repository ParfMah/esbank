/* ============================================================
   VIVABANK — Simulateur de crédit (composant réutilisable)
   S'injecte automatiquement dans toutes les pages publiques.
   Activation : LoanSim.open() ou bouton data-loan-sim
   ============================================================ */
(function () {
  'use strict';

  /* ── Taux d'intérêt par type de prêt ────────────────────── */
  const RATES = { personal: 0.069, auto: 0.055, business: 0.075 };

  /* ── CSS du simulateur ──────────────────────────────────── */
  const CSS = `
<style id="vb-loan-sim-style">
/* Overlay */
.sim-overlay {
  position: fixed; inset: 0; z-index: 3000;
  background: rgba(0,0,0,0.72);
  backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center;
  padding: 16px;
  opacity: 0; pointer-events: none;
  transition: opacity 0.28s ease;
}
.sim-overlay.open {
  opacity: 1; pointer-events: auto;
}

/* Boîte principale */
.sim-box {
  background: #0C0F1D;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 28px;
  width: 100%; max-width: 620px;
  max-height: 92vh; overflow-y: auto;
  position: relative;
  box-shadow: 0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,81,47,0.12);
  transform: scale(0.94) translateY(16px);
  transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
}
.sim-overlay.open .sim-box {
  transform: scale(1) translateY(0);
}

/* En-tête */
.sim-header {
  background: linear-gradient(135deg, #FF512F, #F09819);
  border-radius: 28px 28px 0 0;
  padding: 28px 32px 24px;
  position: relative;
}
.sim-header-title {
  font-family: 'Outfit', sans-serif;
  font-size: 1.4rem; font-weight: 900; color: #fff;
  margin-bottom: 4px;
}
.sim-header-sub {
  font-size: 0.82rem; color: rgba(255,255,255,0.78);
}
.sim-close {
  position: absolute; top: 20px; right: 20px;
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,255,255,0.2); border: none;
  color: #fff; font-size: 1rem; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: background 0.18s;
}
.sim-close:hover { background: rgba(255,255,255,0.35); }

/* Corps */
.sim-body { padding: 28px 32px; }

/* Sélecteur de type */
.sim-type-grid {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 10px;
  margin-bottom: 28px;
}
.sim-type-btn {
  padding: 12px 8px; border-radius: 12px; text-align: center;
  background: rgba(255,255,255,0.04);
  border: 1.5px solid rgba(255,255,255,0.08);
  cursor: pointer; transition: all 0.2s;
}
.sim-type-btn:hover {
  border-color: rgba(255,81,47,0.4);
  background: rgba(255,81,47,0.06);
}
.sim-type-btn.active {
  background: rgba(255,81,47,0.12);
  border-color: rgba(255,81,47,0.5);
}
.sim-type-icon { font-size: 1.4rem; margin-bottom: 5px; }
.sim-type-label {
  font-family: 'Outfit', sans-serif;
  font-size: 0.8rem; font-weight: 700; color: #F0F4FF;
}
.sim-type-rate {
  font-size: 0.68rem; color: #8896AB; margin-top: 2px;
}
.sim-type-btn.active .sim-type-rate { color: #FF7A5C; }

/* Sliders */
.sim-slider-section { margin-bottom: 24px; }
.sim-slider-row {
  display: flex; justify-content: space-between;
  align-items: baseline; margin-bottom: 10px;
}
.sim-slider-label {
  font-size: 0.78rem; font-weight: 700; color: #8896AB;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.sim-slider-value {
  font-family: 'Outfit', sans-serif;
  font-size: 1.1rem; font-weight: 900;
  background: linear-gradient(135deg,#FF512F,#F09819);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.sim-range {
  -webkit-appearance: none; appearance: none;
  width: 100%; height: 6px; border-radius: 999px;
  outline: none; cursor: pointer;
  background: linear-gradient(to right, #FF512F var(--pct, 30%), #1A2038 var(--pct, 30%));
}
.sim-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px; height: 22px; border-radius: 50%;
  background: linear-gradient(135deg,#FF512F,#F09819);
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(255,81,47,0.45), 0 0 0 3px rgba(255,81,47,0.15);
}
.sim-range-limits {
  display: flex; justify-content: space-between;
  font-size: 0.7rem; color: #4B5B73; margin-top: 5px;
}

/* Resultado destacado */
.sim-result-hero {
  background: linear-gradient(135deg,rgba(255,81,47,0.1),rgba(240,152,25,0.05));
  border: 1px solid rgba(255,81,47,0.2);
  border-radius: 18px; padding: 22px 24px;
  text-align: center; margin-bottom: 20px;
}
.sim-result-lbl {
  font-size: 0.72rem; color: #8896AB;
  text-transform: uppercase; letter-spacing: 0.07em; margin-bottom: 6px;
}
.sim-result-monthly {
  font-family: 'Outfit', sans-serif;
  font-size: 2.8rem; font-weight: 900; line-height: 1;
  background: linear-gradient(135deg,#FF512F,#F09819);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text;
}
.sim-result-period { font-size: 0.85rem; color: #8896AB; margin-top: 4px; }

/* Grille de résultats */
.sim-result-grid {
  display: grid; grid-template-columns: repeat(3,1fr); gap: 10px;
  margin-bottom: 20px;
}
.sim-result-item {
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 12px; padding: 14px 10px; text-align: center;
}
.sim-result-item-val {
  font-family: 'Outfit', sans-serif;
  font-size: 1rem; font-weight: 800; color: #F0F4FF; margin-bottom: 4px;
}
.sim-result-item-lbl {
  font-size: 0.68rem; color: #8896AB;
  text-transform: uppercase; letter-spacing: 0.04em;
}

/* Tabla de amortización (primeras cuotas) */
.sim-table-wrap { margin-bottom: 20px; }
.sim-table-toggle {
  display: flex; align-items: center; gap: 8px;
  background: none; border: none; cursor: pointer;
  font-size: 0.8rem; font-weight: 600; color: #8896AB;
  padding: 8px 0; margin-bottom: 4px;
  transition: color 0.2s;
}
.sim-table-toggle:hover { color: #F0F4FF; }
.sim-table-toggle .arrow {
  display: inline-block; transition: transform 0.22s;
  font-size: 0.65rem;
}
.sim-table-toggle.open .arrow { transform: rotate(180deg); }
.sim-table {
  width: 100%; border-collapse: collapse;
  font-size: 0.79rem; display: none;
}
.sim-table.visible { display: table; }
.sim-table th {
  padding: 8px 10px;
  background: rgba(255,255,255,0.04);
  color: #4B5B73; font-weight: 700;
  text-align: right; border-bottom: 1px solid rgba(255,255,255,0.06);
}
.sim-table th:first-child { text-align: left; }
.sim-table td {
  padding: 8px 10px; border-bottom: 1px solid rgba(255,255,255,0.04);
  text-align: right; color: #8896AB;
}
.sim-table td:first-child { text-align: left; color: #F0F4FF; }
.sim-table .td-capital { color: #10D9A0; }
.sim-table .td-interest { color: #F59E0B; }
.sim-table tr:last-child td { border-bottom: none; }

/* Nota legal */
.sim-legal {
  font-size: 0.71rem; color: #4B5B73; line-height: 1.6;
  margin-bottom: 20px; padding: 10px 14px;
  background: rgba(255,255,255,0.02);
  border-radius: 8px;
}

/* CTA */
.sim-cta { display: flex; gap: 10px; }
.sim-btn-primary {
  flex: 1; padding: 15px;
  background: linear-gradient(135deg,#FF512F,#F09819);
  color: #fff; border: none; border-radius: 999px;
  font-family: 'Outfit', sans-serif;
  font-size: 0.95rem; font-weight: 700; cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 4px 20px rgba(255,81,47,0.35);
}
.sim-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(255,81,47,0.45);
}
.sim-btn-share {
  padding: 15px 18px; border-radius: 999px;
  background: rgba(255,255,255,0.06);
  border: 1.5px solid rgba(255,255,255,0.1);
  color: #8896AB; font-size: 1rem; cursor: pointer;
  transition: all 0.2s;
}
.sim-btn-share:hover { background: rgba(255,255,255,0.1); color: #F0F4FF; }

/* Botón flotante "Simular crédito" */
.sim-fab {
  position: fixed; bottom: 28px; left: 28px; z-index: 900;
  display: flex; align-items: center; gap: 10px;
  padding: 13px 22px; border-radius: 999px;
  background: linear-gradient(135deg,#FF512F,#F09819);
  color: #fff; border: none; cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.88rem; font-weight: 700;
  box-shadow: 0 6px 28px rgba(255,81,47,0.4);
  transition: all 0.22s;
  animation: simFabIn 0.5s 1.2s cubic-bezier(0.34,1.56,0.64,1) both;
}
.sim-fab:hover {
  transform: translateY(-3px) scale(1.03);
  box-shadow: 0 10px 36px rgba(255,81,47,0.5);
}
.sim-fab-icon { font-size: 1.1rem; }
@keyframes simFabIn {
  from { opacity: 0; transform: translateY(20px) scale(0.8); }
  to   { opacity: 1; transform: translateY(0)    scale(1);   }
}

/* Bouton inline dans les pages */
.btn-simulate {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 12px 22px; border-radius: 999px;
  background: rgba(255,81,47,0.1);
  border: 1.5px solid rgba(255,81,47,0.35);
  color: #FF7A5C; cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.88rem; font-weight: 700;
  transition: all 0.2s;
  text-decoration: none;
}
.btn-simulate:hover {
  background: rgba(255,81,47,0.18);
  border-color: rgba(255,81,47,0.6);
  color: #FF512F;
  transform: translateY(-1px);
}

/* Responsive */
@media (max-width: 600px) {
  .sim-body { padding: 20px; }
  .sim-header { padding: 22px 20px 18px; border-radius: 20px 20px 0 0; }
  .sim-box  { border-radius: 20px; }
  .sim-result-monthly { font-size: 2.2rem; }
  .sim-result-grid { grid-template-columns: 1fr 1fr; }
  .sim-type-grid { grid-template-columns: 1fr 1fr 1fr; }
  .sim-fab { bottom: 20px; left: 16px; padding: 11px 16px; font-size: 0.82rem; }
  .sim-cta { flex-direction: column; }
}
</style>`;

  /* ── HTML du simulateur ─────────────────────────────────── */
  const HTML = `
<div class="sim-overlay" id="simOverlay" role="dialog" aria-modal="true" aria-label="Simulador de crédito">
  <div class="sim-box" id="simBox">

    <div class="sim-header">
      <button class="sim-close" id="simClose" aria-label="Cerrar">✕</button>
      <div class="sim-header-title">🏦 Simulador de crédito</div>
      <div class="sim-header-sub">Calcula tu cuota mensual al instante · Sin compromiso · Sin datos personales</div>
    </div>

    <div class="sim-body">

      <!-- Tipo de préstamo -->
      <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#8896AB;margin-bottom:10px;">Tipo de préstamo</div>
      <div class="sim-type-grid" id="simTypeGrid">
        <div class="sim-type-btn active" data-type="personal" onclick="LoanSim._setType('personal',this)">
          <div class="sim-type-icon">👤</div>
          <div class="sim-type-label">Personal</div>
          <div class="sim-type-rate">6,90% TIN</div>
        </div>
        <div class="sim-type-btn" data-type="auto" onclick="LoanSim._setType('auto',this)">
          <div class="sim-type-icon">🚗</div>
          <div class="sim-type-label">Automóvil</div>
          <div class="sim-type-rate">5,50% TIN</div>
        </div>
        <div class="sim-type-btn" data-type="business" onclick="LoanSim._setType('business',this)">
          <div class="sim-type-icon">🏢</div>
          <div class="sim-type-label">Empresa</div>
          <div class="sim-type-rate">7,50% TIN</div>
        </div>
      </div>

      <!-- Importe -->
      <div class="sim-slider-section">
        <div class="sim-slider-row">
          <span class="sim-slider-label">Importe solicitado</span>
          <span class="sim-slider-value" id="simAmtDisplay">10.000 €</span>
        </div>
        <input type="range" class="sim-range" id="simAmtRange"
               min="500" max="50000" step="500" value="10000"
               oninput="LoanSim._update()" aria-label="Importe del préstamo"/>
        <div class="sim-range-limits"><span>500 €</span><span>50.000 €</span></div>
      </div>

      <!-- Plazo -->
      <div class="sim-slider-section">
        <div class="sim-slider-row">
          <span class="sim-slider-label">Plazo de devolución</span>
          <span class="sim-slider-value" id="simTermDisplay">36 meses</span>
        </div>
        <input type="range" class="sim-range" id="simTermRange"
               min="6" max="84" step="6" value="36"
               oninput="LoanSim._update()" aria-label="Plazo en meses"/>
        <div class="sim-range-limits"><span>6 meses</span><span>84 meses</span></div>
      </div>

      <!-- Resultado principal -->
      <div class="sim-result-hero">
        <div class="sim-result-lbl">Cuota mensual estimada</div>
        <div class="sim-result-monthly" id="simMonthly">—</div>
        <div class="sim-result-period" id="simPeriod">durante — meses</div>
      </div>

      <!-- Desglose -->
      <div class="sim-result-grid">
        <div class="sim-result-item">
          <div class="sim-result-item-val" id="simTotal">—</div>
          <div class="sim-result-item-lbl">Total a pagar</div>
        </div>
        <div class="sim-result-item">
          <div class="sim-result-item-val" id="simInterests" style="color:#F59E0B;">—</div>
          <div class="sim-result-item-lbl">Intereses totales</div>
        </div>
        <div class="sim-result-item">
          <div class="sim-result-item-val" id="simTin">—</div>
          <div class="sim-result-item-lbl">TIN anual</div>
        </div>
      </div>

      <!-- Tabla de amortización -->
      <div class="sim-table-wrap">
        <button class="sim-table-toggle" id="simTableToggle" onclick="LoanSim._toggleTable()">
          <span class="arrow">▼</span>
          Ver primeras cuotas (tabla de amortización)
        </button>
        <table class="sim-table" id="simTable">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Cuota</th>
              <th class="td-capital">Capital</th>
              <th class="td-interest">Interés</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody id="simTableBody"></tbody>
        </table>
      </div>

      <!-- Nota legal -->
      <div class="sim-legal">
        ⚠ Simulación orientativa. La cuota final y el TIN exacto dependen del perfil crediticio del solicitante
        y están sujetos a aprobación. Cálculo basado en el método francés de amortización constante.
        Sin comisión de apertura. TAE calculada sobre el importe y plazo seleccionados.
      </div>

      <!-- CTA -->
      <div class="sim-cta">
        <button class="sim-btn-primary" onclick="LoanSim._apply()">
          Solicitar este préstamo →
        </button>
        <button class="sim-btn-share" onclick="LoanSim._share()" title="Compartir simulación">
          🔗
        </button>
      </div>

    </div><!-- /.sim-body -->
  </div><!-- /.sim-box -->
</div><!-- /.sim-overlay -->

<!-- Botón flotante -->
<button class="sim-fab" id="simFab" onclick="LoanSim.open()" aria-label="Simular crédito">
  <span class="sim-fab-icon">🏦</span>
  Simular crédito
</button>`;

  /* ── État interne ───────────────────────────────────────── */
  const S = { type: 'personal', amount: 10000, term: 36, tableOpen: false };

  /* ── Formatage monétaire (español) ─────────────────────── */
  const fmt = (n) => new Intl.NumberFormat('es-ES', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2,
  }).format(n);

  /* ── Calcul des mensualités ─────────────────────────────── */
  const calcMonthly = (amount, term, rate) => {
    const r = rate / 12;
    if (r === 0) return amount / term;
    return amount * (r * Math.pow(1 + r, term)) / (Math.pow(1 + r, term) - 1);
  };

  /* ── Objet public LoanSim ───────────────────────────────── */
  window.LoanSim = {

    /* Ouvrir le simulateur */
    open(preAmount, preTerm, preType) {
      if (preAmount) { S.amount = preAmount; document.getElementById('simAmtRange').value = preAmount; }
      if (preTerm)   { S.term   = preTerm;   document.getElementById('simTermRange').value = preTerm; }
      if (preType)   { LoanSim._setType(preType, document.querySelector(`[data-type="${preType}"]`)); }
      LoanSim._update();
      document.getElementById('simOverlay').classList.add('open');
      document.body.style.overflow = 'hidden';
    },

    /* Fermer le simulateur */
    close() {
      document.getElementById('simOverlay').classList.remove('open');
      document.body.style.overflow = '';
    },

    /* Changer le type de prêt */
    _setType(type, el) {
      S.type = type;
      document.querySelectorAll('.sim-type-btn').forEach(b => b.classList.remove('active'));
      if (el) el.classList.add('active');
      LoanSim._update();
    },

    /* Mettre à jour les calculs */
    _update() {
      const amount  = parseInt(document.getElementById('simAmtRange').value);
      const term    = parseInt(document.getElementById('simTermRange').value);
      const rate    = { personal: 0.069, auto: 0.055, business: 0.075 }[S.type];
      S.amount = amount; S.term = term;

      /* Mettre à jour les sliders (couleur fill) */
      const amtPct  = ((amount - 500)  / (50000 - 500))  * 100;
      const termPct = ((term   - 6)    / (84    - 6))    * 100;
      document.getElementById('simAmtRange').style.setProperty('--pct',  amtPct  + '%');
      document.getElementById('simTermRange').style.setProperty('--pct', termPct + '%');

      /* Labels */
      document.getElementById('simAmtDisplay').textContent  =
        new Intl.NumberFormat('es-ES').format(amount) + ' €';
      document.getElementById('simTermDisplay').textContent = term + ' meses';

      /* Calculs */
      const monthly   = calcMonthly(amount, term, rate);
      const total     = monthly * term;
      const interests = total - amount;

      document.getElementById('simMonthly').textContent  = fmt(monthly);
      document.getElementById('simPeriod').textContent   = `durante ${term} meses`;
      document.getElementById('simTotal').textContent    = fmt(total);
      document.getElementById('simInterests').textContent= fmt(interests);
      document.getElementById('simTin').textContent      = (rate * 100).toFixed(2) + '%';

      /* Tableau d'amortissement */
      LoanSim._buildTable(amount, term, rate, monthly);
    },

    /* Construire le tableau d'amortissement (6 premières lignes) */
    _buildTable(amount, term, rate, monthly) {
      const tbody = document.getElementById('simTableBody');
      const rows  = [];
      let balance = amount;
      const r     = rate / 12;
      const max   = Math.min(6, term);

      for (let i = 1; i <= max; i++) {
        const interest = balance * r;
        const capital  = monthly - interest;
        balance       -= capital;
        rows.push(`
          <tr>
            <td>${i}</td>
            <td>${fmt(monthly)}</td>
            <td class="td-capital">${fmt(capital)}</td>
            <td class="td-interest">${fmt(interest)}</td>
            <td>${fmt(Math.max(0, balance))}</td>
          </tr>`);
      }
      if (term > 6) rows.push(`
        <tr><td colspan="5" style="text-align:center;color:#4B5B73;font-style:italic;padding:10px;">
          … ${term - 6} cuota${term - 6 !== 1 ? 's' : ''} más · Tabla completa disponible tras solicitar
        </td></tr>`);

      tbody.innerHTML = rows.join('');
    },

    /* Toggle del tableau */
    _toggleTable() {
      S.tableOpen = !S.tableOpen;
      const table  = document.getElementById('simTable');
      const toggle = document.getElementById('simTableToggle');
      table.classList.toggle('visible', S.tableOpen);
      toggle.classList.toggle('open', S.tableOpen);
    },

    /* Rediriger vers la demande de prêt */
    _apply() {
      /* Si l'utilisateur est connecté → loans.html, sinon → register */
      const token = localStorage.getItem('vb_token');
      const url   = token ? 'loans.html' : 'register.html';
      LoanSim.close();
      window.location.href = url;
    },

    /* Partager la simulation via URL */
    _share() {
      const url = `${location.origin}${location.pathname}?sim=1&amount=${S.amount}&term=${S.term}&type=${S.type}`;
      if (navigator.share) {
        navigator.share({ title: 'Simulación VivaBank', url });
      } else {
        navigator.clipboard.writeText(url).then(() => {
          const btn = document.querySelector('.sim-btn-share');
          const old = btn.textContent;
          btn.textContent = '✓ Copiado';
          setTimeout(() => { btn.textContent = old; }, 2000);
        });
      }
    },
  };

  /* ── Injection HTML + CSS dans la page ─────────────────── */
  document.addEventListener('DOMContentLoaded', () => {

    /* Injecter CSS + HTML */
    document.head.insertAdjacentHTML('beforeend', CSS);
    document.body.insertAdjacentHTML('beforeend', HTML);

    /* Fermer via overlay ou touche Escape */
    document.getElementById('simOverlay').addEventListener('click', (e) => {
      if (e.target.id === 'simOverlay') LoanSim.close();
    });
    document.getElementById('simClose').addEventListener('click', LoanSim.close);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') LoanSim.close();
    });

    /* Initialiser les calculs */
    LoanSim._update();

    /* Activer les boutons data-loan-sim dans la page */
    document.querySelectorAll('[data-loan-sim]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const amount = parseInt(btn.dataset.amount) || 10000;
        const term   = parseInt(btn.dataset.term)   || 36;
        const type   = btn.dataset.type             || 'personal';
        LoanSim.open(amount, term, type);
      });
    });

    /* Restaurer depuis URL params si partagé */
    const p = new URLSearchParams(location.search);
    if (p.get('sim') === '1') {
      const a = parseInt(p.get('amount')) || 10000;
      const t = parseInt(p.get('term'))   || 36;
      const tp = p.get('type') || 'personal';
      setTimeout(() => LoanSim.open(a, t, tp), 500);
    }
  });

})();
