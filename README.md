# ₩ VivaBank — Frontend

> Neobank digital para el mercado español · HTML + CSS + JavaScript puro

---

## 📋 Descripción

VivaBank es una plataforma bancaria digital completa diseñada para el mercado español.
Frontend desarrollado únicamente con **HTML5, CSS3 y JavaScript vanilla** (sin frameworks).

### Páginas incluidas

| Archivo | Descripción |
|---|---|
| `index.html` | Landing page pública con hero, funcionalidades, testimonios |
| `login.html` | Inicio de sesión + soporte 2FA con inputs OTP |
| `register.html` | Registro en 2 pasos con indicador de fuerza de contraseña |
| `forgot-password.html` | Solicitud de recuperación de contraseña |
| `reset-password.html` | Formulario de nueva contraseña (via token de email) |
| `dashboard.html` | Panel principal: saldo, gráfico, transacciones, depósito Stripe |
| `transfer.html` | Transferencias inmediatas, programadas e historial completo |
| `loans.html` | Solicitud de préstamos con calculadora interactiva |
| `profile.html` | Perfil, cambio de contraseña, configuración 2FA |
| `admin.html` | Panel de administración completo |

---

## 🎨 Diseño

- **Paleta**: Tema oscuro lujo (`#05060E`) + degradado coral→ámbar soleil (`#FF512F → #F09819`)
- **Tipografía**: `Outfit` (títulos 800) + `Inter` (cuerpo) vía Google Fonts
- **Efectos**: Glassmorphism, orbes luminosos, animaciones CSS, canvas nativo
- **100% responsive**: mobile, tablet, desktop

---

## ⚙️ Configuración

### 1. Cambiar la URL del backend

Edita el archivo `js/config.js`, línea 7:

```javascript
const API_URL = 'https://TU-BACKEND.onrender.com/api/v1';
```

### 2. URL de retorno Stripe

Asegúrate de que en el backend la variable `FRONTEND_URL` apunte a la URL
donde despliegues este frontend.

---

## 🚀 Despliegue en Render (Static Site)

### Paso 1 — Crear el repositorio
```bash
git init
git add .
git commit -m "VivaBank frontend inicial"
git remote add origin https://github.com/TU_USUARIO/vivabank-frontend.git
git push -u origin main
```

### Paso 2 — Crear un Static Site en Render

1. Ve a [render.com](https://render.com) → **New** → **Static Site**
2. Conecta tu repositorio de GitHub
3. Configura:

| Campo | Valor |
|---|---|
| **Name** | `vivabank-frontend` |
| **Branch** | `main` |
| **Root Directory** | *(vacío)* |
| **Build Command** | *(vacío)* |
| **Publish Directory** | `.` |

4. Haz clic en **Create Static Site**
5. Render generará una URL tipo: `https://vivabank-frontend.onrender.com`

### Paso 3 — Actualizar la URL del backend

Una vez desplegado el backend, actualiza `js/config.js` con la URL real:
```javascript
const API_URL = 'https://vivabank-backend.onrender.com/api/v1';
```
Haz commit y push — Render redesplegará automáticamente.

---

## 🌐 Despliegue alternativo: GitHub Pages

```bash
# En los ajustes del repositorio de GitHub:
# Settings → Pages → Source: Deploy from branch → main → / (root)
```

URL resultante: `https://TU_USUARIO.github.io/vivabank-frontend`

---

## 📁 Estructura de archivos

```
vivabank-frontend/
├── index.html              # Landing page
├── login.html              # Inicio de sesión
├── register.html           # Registro (2 pasos)
├── forgot-password.html    # Recuperar contraseña
├── reset-password.html     # Nueva contraseña
├── dashboard.html          # Panel de usuario
├── transfer.html           # Transferencias
├── loans.html              # Préstamos
├── profile.html            # Perfil + 2FA
├── admin.html              # Administración
├── css/
│   ├── main.css            # Sistema de diseño global
│   ├── auth.css            # Estilos páginas auth
│   ├── dashboard.css       # Estilos panel de usuario
│   └── admin.css           # Estilos panel admin
└── js/
    ├── config.js           # Config API + utilidades compartidas
    ├── dashboard.js        # Lógica del dashboard
    └── admin.js            # Lógica del panel admin
```

---

## 🔗 Conexión con el backend

El frontend se comunica con el backend mediante la función `apiFetch()` de `js/config.js`.
Todos los tokens JWT se almacenan en `localStorage` bajo las claves:

| Clave | Contenido |
|---|---|
| `vb_token` | Token de acceso JWT (15 min) |
| `vb_refresh` | Token de refresco (7 días) |
| `vb_user` | Objeto JSON del usuario autenticado |

---

## 📞 Soporte

Para cualquier duda sobre el despliegue, consulta la documentación de Render:
[render.com/docs](https://render.com/docs)
