/* ============================================
   AGROTECH MVP - CLIENTE DE LA API
   Metodología de Sistemas II - UTN 2025/2026
   ============================================ */

/* exported AgroAPI */
const AgroAPI = (function () {
  'use strict';

  // localhost/127.0.0.1 usa el server local en :3001; cualquier otro origen (el sitio
  // desplegado) usa el backend real. Se puede forzar otra URL con:
  // localStorage.setItem('agrotech_api_base', 'https://otra-url/api')
  const PROD_BASE = 'https://agrotech-api-719u.onrender.com/api';
  const DEV_BASE = 'http://localhost:3001/api';

  function getBase() {
    const override = localStorage.getItem('agrotech_api_base');
    if (override) return override;
    const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
    return isLocal ? DEV_BASE : PROD_BASE;
  }

  function getToken() {
    return localStorage.getItem('agrotech_token');
  }

  function setSesion(token, productor) {
    localStorage.setItem('agrotech_token', token);
    localStorage.setItem('agrotech_productor', JSON.stringify(productor));
  }

  function getProductor() {
    try {
      return JSON.parse(localStorage.getItem('agrotech_productor'));
    } catch {
      return null;
    }
  }

  function logout() {
    localStorage.removeItem('agrotech_token');
    localStorage.removeItem('agrotech_productor');
  }

  function actualizarProductorLocal(productor) {
    localStorage.setItem('agrotech_productor', JSON.stringify(productor));
  }

  async function request(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let response;
    try {
      response = await fetch(getBase() + path, { ...options, headers });
    } catch {
      const error = new Error('Sin conexión con el servidor. Revisá tu internet y probá de nuevo.');
      error.sinConexion = true;
      throw error;
    }

    if (response.status === 401) {
      logout();
      if (!location.pathname.endsWith('login.html')) location.href = 'login.html';
      throw new Error('Sesión expirada');
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Error de red');
    return data;
  }

  const get = path => request(path);
  const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });
  const put = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) });
  const patch = (path, body) => request(path, { method: 'PATCH', body: JSON.stringify(body || {}) });
  const del = path => request(path, { method: 'DELETE' });

  return {
    getToken,
    getProductor,
    setSesion,
    logout,
    actualizarProductorLocal,

    register: datos => post('/auth/register', datos),
    login: datos => post('/auth/login', datos),
    forgotPassword: email => post('/auth/forgot-password', { email }),
    resetPassword: (token, password) => post('/auth/reset-password', { token, password }),
    actualizarPerfil: datos => put('/auth/perfil', datos),
    getPerfil: () => get('/auth/perfil'),
    verificarEmail: token => post('/auth/verificar-email', { token }),
    reenviarVerificacion: () => post('/auth/reenviar-verificacion', {}),
    cambiarPassword: (passwordActual, passwordNueva) => put('/auth/password', { passwordActual, passwordNueva }),
    exportarMisDatos: () => get('/cuenta/exportar'),
    eliminarCuenta: password => request('/cuenta', { method: 'DELETE', body: JSON.stringify({ password }) }),

    getFincas: () => get('/fincas'),
    crearFinca: datos => post('/fincas', datos),

    getLotes: fincaId => get('/lotes' + (fincaId ? `?fincaId=${fincaId}` : '')),
    crearLote: datos => post('/lotes', datos),
    archivarLote: id => patch(`/lotes/${id}/archivar`),
    restaurarLote: id => patch(`/lotes/${id}/restaurar`),

    getGastos: fincaId => get('/gastos' + (fincaId ? `?fincaId=${fincaId}` : '')),
    crearGasto: datos => post('/gastos', datos),
    editarGasto: (id, datos) => patch(`/gastos/${id}`, datos),
    eliminarGasto: id => del(`/gastos/${id}`),
    extraerFactura: datos => post('/gastos/extraer-factura', datos),

    getIngresos: fincaId => get('/ingresos' + (fincaId ? `?fincaId=${fincaId}` : '')),
    crearIngreso: datos => post('/ingresos', datos),
    editarIngreso: (id, datos) => patch(`/ingresos/${id}`, datos),
    eliminarIngreso: id => del(`/ingresos/${id}`),

    getCartera: () => get('/cartera'),
    sincronizarCartera: () => post('/cartera/sincronizar'),
    cobrarCheque: id => patch(`/cartera/${id}/cobrar`),

    getInversiones: () => get('/inversiones'),
    crearInversion: datos => post('/inversiones', datos),
    venderInversion: (id, montoVenta) => patch(`/inversiones/${id}/vender`, { montoVenta }),

    getResumen: fincaId => get('/resumen' + (fincaId ? `?fincaId=${fincaId}` : '')),
    getProyeccion: fincaId => get('/resumen/proyeccion' + (fincaId ? `?fincaId=${fincaId}` : '')),

    getHistorial: () => get('/historial'),

    getConfigN8N: () => get('/config/n8n'),
    guardarConfigN8N: datos => put('/config/n8n', datos),
    probarN8N: () => post('/config/n8n/test'),

    getResumenRed: () => get('/red/resumen'),

    getEnvios: () => get('/envios'),
    crearEnvio: datos => post('/envios', datos),
    registrarDtv: (id, datos) => patch(`/envios/${id}/dtv`, datos),
    entregarEnvio: (id, datos) => patch(`/envios/${id}/entregar`, datos),
    anularEnvio: (id, datos) => patch(`/envios/${id}/anular`, datos),

    getTalonario: () => get('/remitos/talonario'),
    cargarTalonario: datos => post('/remitos/talonario', datos),
    editarEmisor: datos => patch('/remitos/talonario', datos),

    getPreciosInsumos: () => get('/insumos/precios'),
    guardarPreciosInsumos: precios => post('/insumos/precios', { precios }),
    borrarPrecioInsumo: id => del(`/insumos/precios/${id}`),
    leerCotizacion: datos => post('/insumos/extraer-cotizacion', datos),

    getCompradores: () => get('/compradores'),
    crearComprador: datos => post('/compradores', datos),
    editarComprador: (id, datos) => patch(`/compradores/${id}`, datos),
    borrarComprador: id => del(`/compradores/${id}`),

    getVitrina: () => get('/vitrina'),
    guardarVitrina: datos => put('/vitrina', datos),
    getProductosVitrina: () => get('/vitrina/productos'),
    crearProductoVitrina: datos => post('/vitrina/productos', datos),
    editarProductoVitrina: (id, datos) => patch(`/vitrina/productos/${id}`, datos),
    borrarProductoVitrina: id => del(`/vitrina/productos/${id}`),

    // Vitrina pública: no necesita sesión (la usa vitrina.html, que abre cualquiera)
    vitrinaPublica: slug => get(`/vitrina-publica/${encodeURIComponent(slug)}`),
    productoPublico: (slug, codigo) =>
      get(`/vitrina-publica/${encodeURIComponent(slug)}/productos/${encodeURIComponent(codigo)}`),
    enviarConsulta: (slug, datos) => post(`/vitrina-publica/${encodeURIComponent(slug)}/consultas`, datos),
    getRemitos: () => get('/remitos'),
    emitirRemito: datos => post('/remitos', datos),
    anularRemito: (id, datos) => patch(`/remitos/${id}/anular`, datos),
    getAlertas: zona => get('/red/alertas' + (zona ? `?zona=${encodeURIComponent(zona)}` : '')),
    crearAlerta: datos => post('/red/alertas', datos),
    escanearPlanta: datos => post('/red/escanear-planta', datos),
    resolverAlerta: id => patch(`/red/alertas/${id}/resolver`),

    getTrueques: zona => get('/red/trueques' + (zona ? `?zona=${encodeURIComponent(zona)}` : '')),
    crearTrueque: datos => post('/red/trueques', datos),
    contactarTrueque: id => post(`/red/trueques/${id}/contactar`)
  };
})();
