/* ============================================================
VIVABANK — Composant Navbar partagé (pages publiques)
   Injecte la barre de navigation avant la balise <script>
   qui l'appelle dans chaque page publique
   ============================================================ */
(function () {
  /* ── Déterminer la page active ──────────────────────────── */
  const page = location.pathname.split('/').pop() || 'index.html';

  const links = [
    { href: 'index.html',          label: 'Inicio' },
    { href: 'funcionalidades.html', label: 'Funcionalidades' },
    { href: 'seguridad.html',       label: 'Seguridad' },
    { href: 'como-funciona.html',   label: 'Cómo funciona' },
    { href: 'testimonios.html',     label: 'Clientes' },
    { href: 'tarifas.html',         label: 'Tarifas' },
    { href: 'nosotros.html',        label: 'Nosotros' },
  ];

  /* ── Générer les liens avec état actif ──────────────────── */
  const navLinks = links.map(l => {
    const isActive = page === l.href;
    return `<a href="${l.href}" class="pub-nav-link${isActive ? ' active' : ''}">${l.label}</a>`;
  }).join('');

  /* Bouton spécial "Simular crédito" dans la navbar */
  const simBtn = `<button
    class="btn-sim-nav"
    onclick="if(window.LoanSim){window.LoanSim.open()}else{window.location='tarifas.html#simulador'}"
    aria-label="Simular crédito">
    🏦 Simular crédito
  </button>`;

  /* ── HTML de la navbar ──────────────────────────────────── */
  /* Le drawer ET l'overlay sont injectés HORS de la navbar
   pour éviter le clipping dû au stacking context position:fixed */
  const html = `
<nav class="pub-navbar" id="pubNavbar" role="navigation" aria-label="Navegación principal">
  <div class="pub-navbar-inner">
    <a href="index.html" class="pub-nav-brand" aria-label="VivaBank — Inicio">
      <img src="assets/logo.svg" alt="VivaBank" height="36" style="display:block;"/>
    </a>
    <div class="pub-nav-links" id="pubNavLinks">
      ${navLinks}
    </div>
    <div class="pub-nav-actions">
      <div class="pub-nav-sim">
        ${simBtn}
      </div>
      <a href="login.html"    class="btn btn-ghost   btn-sm">Iniciar sesión</a>
      <a href="register.html" class="btn btn-primary btn-sm">Abrir cuenta</a>
    </div>
    <button class="pub-nav-burger" id="pubNavBurger"
            aria-expanded="false" aria-controls="pubNavMobile"
            aria-label="Abrir menú">
      <span></span><span></span><span></span>
    </button>
  </div>
</nav>`;

  /* Drawer + overlay : injectés directement dans <body> */
  const drawerHtml = `
<div class="pub-nav-overlay" id="pubNavOverlay" aria-hidden="true"></div>
<div class="pub-nav-mobile" id="pubNavMobile" aria-hidden="true"
     role="dialog" aria-label="Menú de navegación">
  <button class="pub-nav-close" id="pubNavClose" aria-label="Cerrar menú">✕</button>
  <div style="padding:0 0 12px;margin-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.07);">
    <img src="assets/logo.svg" alt="VivaBank" height="30" style="display:block;"/>
  </div>
  ${navLinks}
  <div style="margin-top:15px; margin-bottom: 5px;">
    ${simBtn}
  </div>
  <div class="pub-nav-mobile-actions">
    <a href="login.html"    class="btn btn-ghost   btn-block">Iniciar sesión</a>
    <a href="register.html" class="btn btn-primary btn-block">Abrir cuenta</a>
  </div>
</div>`;

  /* ── Styles inline de la navbar ─────────────────────────── */
  const css = `
<style>
.pub-navbar {
  position: fixed; top: 0; left: 0; right: 0; z-index: 1000;
  background: rgba(5,6,14,0.85);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
  transition: background 0.25s ease;
}
.pub-navbar.scrolled {
  background: rgba(5,6,14,0.98);
  box-shadow: 0 1px 0 rgba(255,255,255,0.06);
}
.pub-navbar-inner {
  max-width: 1280px; margin: 0 auto;
  padding: 0 32px; height: 72px;
  display: flex; align-items: center; gap: 32px;
}
.pub-nav-brand { flex-shrink: 0; text-decoration: none; }
.pub-nav-links {
  display: flex; align-items: center; gap: 4px;
}
.pub-nav-link {
  padding: 7px 13px; border-radius: 8px;
  font-size: 0.86rem; font-weight: 500;
  color: rgba(240,244,255,0.65);
  text-decoration: none;
  transition: color 0.18s, background 0.18s;
  white-space: nowrap;
}
.pub-nav-link:hover  { color: #F0F4FF; background: rgba(255,255,255,0.05); }
.pub-nav-link.active { color: #FF7A5C; font-weight: 700; background: rgba(255,81,47,0.08); }
.pub-nav-actions {
  display: flex; align-items: center; gap: 10px; flex-shrink: 0; margin-left: auto;
}
/* Hamburger */
.pub-nav-burger {
  display: none; flex-direction: column; justify-content: center; gap: 5px;
  background: none; border: none; cursor: pointer; padding: 8px;
  margin-left: auto; flex-shrink: 0;
}
.pub-nav-burger span {
  display: block; width: 22px; height: 2px;
  background: rgba(240,244,255,0.8); border-radius: 2px;
  transition: all 0.25s ease;
}
.pub-nav-burger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
.pub-nav-burger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
.pub-nav-burger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
/* Mobile menu */
.pub-nav-mobile {
  position: fixed; top: 0; right: 0; bottom: 0; z-index: 1002;
  width: min(320px, 85vw);
  background: #0C0F1D; border-left: 1px solid rgba(255,255,255,0.08);
  display: flex; flex-direction: column; gap: 4px;
  padding: 80px 20px 32px;
  transform: translateX(100%);
  transition: transform 0.32s cubic-bezier(0.4,0,0.2,1);
  overflow-y: auto; box-shadow: -8px 0 40px rgba(0,0,0,0.5);
}
.pub-nav-mobile.open { transform: translateX(0); }
.pub-nav-overlay {
  display: none; position: fixed; inset: 0; z-index: 1001;
  background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
}
.pub-nav-overlay.open { display: block; }
.pub-nav-close {
  position: absolute; top: 18px; right: 18px;
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(240,244,255,0.7); font-size: 1rem;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
}
.pub-nav-mobile .pub-nav-link { padding: 11px 14px; font-size: 0.92rem; }
.pub-nav-mobile-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.btn-sim-nav {
  padding: 8px 16px; border-radius: 999px;
  background: rgba(255,81,47,0.1);
  border: 1.5px solid rgba(255,81,47,0.3);
  color: #FF7A5C; cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-size: 0.82rem; font-weight: 700;
  transition: all 0.2s; white-space: nowrap;
  width: 100%; text-align: center;
}
.btn-sim-nav:hover {
  background: rgba(255,81,47,0.2);
  border-color: rgba(255,81,47,0.6);
  transform: translateY(-1px);
}
.pub-nav-sim { display: flex; align-items: center; }
/* Responsive */
@media (max-width: 960px) {
  .pub-nav-sim { display: none; }
  .pub-nav-links  { display: none; }
  .pub-nav-actions { display: none; }
  .pub-nav-burger  { display: flex; }
  .pub-navbar-inner { padding: 0 20px; }
}
@media (max-width: 480px) {
  .pub-navbar-inner { height: 62px; }
}
/* Offset du contenu sous la navbar fixe */
.pub-page-offset { padding-top: 72px; }
</style>`;

  /* ── Injection dans la page ──────────────────────────────── */
  const target = document.currentScript || document.scripts[document.scripts.length - 1];
  target.insertAdjacentHTML('beforebegin', css + html);

  /* ── Injection drawer + overlay dans <body> (hors navbar) ──────── */
  const injectDrawer = () => {
    const tmp = document.createElement('div');
    tmp.innerHTML = drawerHtml;
    while (tmp.firstChild) {
      document.body.appendChild(tmp.firstChild);
    }
  };
  if (document.body) {
    injectDrawer();
  } else {
    document.addEventListener('DOMContentLoaded', injectDrawer);
  }

  /* ── Scroll → classe .scrolled ──────────────────────────── */
  window.addEventListener('scroll', () => {
    document.getElementById('pubNavbar')?.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });

  /* ── Toggle menu mobile ──────────────────────────────────── */
  const initNavbarLogic = () => {
    const burger  = document.getElementById('pubNavBurger');
    const mobile  = document.getElementById('pubNavMobile');
    const overlay = document.getElementById('pubNavOverlay');
    const closeBtn= document.getElementById('pubNavClose');

    if (!burger || !mobile) return; // Sécurité si les éléments manquent

    function openDrawer() {
      mobile.classList.add('open');
      overlay?.classList.add('open');
      burger.classList.add('open');
      burger.setAttribute('aria-expanded', 'true');
      mobile.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      mobile.classList.remove('open');
      overlay?.classList.remove('open');
      burger.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
      mobile.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    }

    burger.addEventListener('click', () => {
      mobile.classList.contains('open') ? closeDrawer() : openDrawer();
    });

    closeBtn?.addEventListener('click', closeDrawer);
    overlay?.addEventListener('click', closeDrawer);

    mobile.querySelectorAll('.pub-nav-link').forEach(l => {
      l.addEventListener('click', closeDrawer);
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeDrawer();
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavbarLogic);
  } else {
    initNavbarLogic();
  }
})();