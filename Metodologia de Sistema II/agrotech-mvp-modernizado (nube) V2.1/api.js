/* ============================================
   AGROTECH MVP - CLIENTE DE LA API
   Metodología de Sistemas II - UTN 2025/2026
   ============================================ */

const AgroAPI = (function () {
  'use strict';

  // Para desarrollo local apunta al server en :3001. En producción, guardá la URL
  // del backend desplegado con: localStorage.setItem('agrotech_api_base', 'https://tu-backend.onrender.com/api')
  const DEFAULT_BASE = 'http://localhost:3001/api';

  function getBase() {
    return localStorage.getItem('agrotech_api_base') || DEFAULT_BASE;
  }

  function getToken() {
    return localStorage.getItem('agrotech_token');
  }

  function setSesion(token, productor) {
    localStorage.setItem('agrotech_token', token);
    localStorage.setItem('agrotech_productor', JSON.stringify(productor));
  }

  function getProductor() {
    try { return JSON.parse(localStorage.getItem('agrotech_productor')); } catch { return null; }
  }

  function logout() {
    localStorage.removeItem('agrotech_token');
    localStorage.removeItem('agrotech_productor');
  }

  async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(getBase() + path, { ...options, headers });

    if (response.status === 401) {
      logout();
      if (!location.pathname.endsWith('login.html')) location.href = 'login.html';
      throw new Error('Sesión expirada');
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Error de red');
    return data;
  }

  const get = (path) => request(path);
  const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });
  const put = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) });
  const patch = (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body || {}) });

  return {
    getToken, getProductor, setSesion, logout,

    register: (datos) => post('/auth/register', datos),
    login: (datos) => post('/auth/login', datos),

    getLotes: () => get('/lotes'),
    crearLote: (datos) => post('/lotes', datos),

    getGastos: () => get('/gastos'),
    crearGasto: (datos) => post('/gastos', datos),

    getIngresos: () => get('/ingresos'),
    crearIngreso: (datos) => post('/ingresos', datos),

    getCartera: () => get('/cartera'),
    sincronizarCartera: () => post('/cartera/sincronizar'),

    getInversiones: () => get('/inversiones'),
    crearInversion: (datos) => post('/inversiones', datos),

    getResumen: () => get('/resumen'),
    getProyeccion: () => get('/resumen/proyeccion'),

    getHistorial: () => get('/historial'),

    getConfigN8N: () => get('/config/n8n'),
    guardarConfigN8N: (datos) => put('/config/n8n', datos),
    probarN8N: () => post('/config/n8n/test'),

    getAlertas: (zona) => get('/red/alertas' + (zona ? `?zona=${encodeURIComponent(zona)}` : '')),
    crearAlerta: (datos) => post('/red/alertas', datos),
    resolverAlerta: (id) => patch(`/red/alertas/${id}/resolver`),

    getTrueques: (zona) => get('/red/trueques' + (zona ? `?zona=${encodeURIComponent(zona)}` : '')),
    crearTrueque: (datos) => post('/red/trueques', datos)
  };
})();
