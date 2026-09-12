/* ============================================
   AGROTECH MVP - MOTOR COMPARTIDO v3.0
   Metodología de Sistemas II - UTN 2025/2026
   Ahora respaldado por la API (server/) en vez de localStorage.
   ============================================ */

const AgroTech = (function () {
  'use strict';

  const CONFIG = { version: '2.0.0', appName: 'AgroTech' };

  const COLORS = {
    orange: { css: 'bg-orange-50 border-orange-200 text-orange-800 text-orange-600', hex: '#fb923c', gradient: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)' },
    purple: { css: 'bg-purple-50 border-purple-200 text-purple-800 text-purple-600', hex: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' },
    teal:   { css: 'bg-teal-50 border-teal-200 text-teal-800 text-teal-600', hex: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' },
    blue:   { css: 'bg-blue-50 border-blue-200 text-blue-800 text-blue-600', hex: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
    green:  { css: 'bg-green-50 border-green-200 text-green-800 text-green-600', hex: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' },
    red:    { css: 'bg-red-50 border-red-200 text-red-800 text-red-600', hex: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
    yellow: { css: 'bg-yellow-50 border-yellow-200 text-yellow-800 text-yellow-600', hex: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }
  };

  // Caché en memoria poblado desde la API. Los getters son síncronos y leen de acá;
  // se llenan la primera vez con cargarTodo() y se refrescan tras cada alta.
  // fincaActual guarda el id de la finca activa, o 'todas' para ver todo junto.
  const state = {
    fincas: [], fincaActual: 'todas',
    lotes: [], gastos: [], ingresos: [], cartera: [], inversiones: [],
    historial: [], resumen: { totalIngresos: 0, totalGastos: 0, totalInvertido: 0, margenBruto: 0, saldoNeto: 0, resultadoNeto: 0 },
    proyeccion: { saldoNeto: 0, eventos: [], ruptura: null }
  };

  let resolverReady;
  const ready = new Promise(r => { resolverReady = r; });

  const normalizarFinca = (f) => ({ id: f.id, nombre: f.nombre, ubicacion: f.ubicacion, lotes: Number(f.lotes || 0) });
  const normalizarLote = (l) => ({
    id: l.id, fincaId: l.finca_id, nombre: l.nombre, color: l.color, area: Number(l.area),
    cultivo: l.cultivo || null, riego: l.riego || null,
    mallaAntigranizo: !!l.malla_antigranizo, terreno: l.terreno || null
  });
  const normalizarGasto = (g) => ({ id: g.id, loteId: g.lote_id, concepto: g.concepto, monto: Number(g.monto), estado: g.estado, fecha: g.fecha });
  const normalizarIngreso = (i) => ({
    id: i.id, loteId: i.lote_id, monto: Number(i.monto),
    montoNeto: i.monto_neto != null ? Number(i.monto_neto) : null,
    tipo: i.tipo, estado: i.estado, conDescuento: !!i.con_descuento,
    costoFinanciero: Number(i.costo_financiero || 0), fechaCobro: i.fecha_cobro
  });
  const normalizarCheque = (c) => ({ id: c.id, tipo: c.tipo, monto: Number(c.monto), estado: c.estado, fecha: c.fecha });
  const normalizarInversion = (i) => ({ id: i.id, ticker: i.ticker, monto: Number(i.monto), fecha: i.fecha });

  function getFincas() { return state.fincas; }
  function getFincaActualId() { return state.fincaActual; }
  function getFincaActualNombre() {
    if (state.fincaActual === 'todas') return 'Todas las fincas';
    const f = state.fincas.find(x => x.id === state.fincaActual);
    return f ? f.nombre : 'Sin fincas';
  }

  function getLotes() {
    if (state.fincaActual === 'todas') return state.lotes;
    return state.lotes.filter(l => Number(l.fincaId) === Number(state.fincaActual));
  }

  function getIngresos(loteId) {
    return state.ingresos
      .filter(i => i.estado === 'normal' && Number(i.loteId) === Number(loteId))
      .reduce((sum, i) => sum + (i.conDescuento ? i.montoNeto : i.monto), 0);
  }

  function getGastos(loteId) {
    return state.gastos
      .filter(g => g.estado === 'pagado' && Number(g.loteId) === Number(loteId))
      .reduce((sum, g) => sum + g.monto, 0);
  }

  function getInversiones() { return state.inversiones; }
  function getCartera() { return state.cartera; }
  function getGastosProgramados() { return state.gastos.filter(g => g.estado === 'programado'); }
  function getCostoFinanciero() { return state.ingresos.filter(i => i.conDescuento).reduce((s, i) => s + i.costoFinanciero, 0); }
  function getChequesRechazados() { return state.ingresos.filter(i => i.estado === 'rechazado').reduce((s, i) => s + i.monto, 0); }
  function getHistorial() { return state.historial; }

  function getTotalIngresos() { return state.resumen.totalIngresos; }
  function getTotalGastos() { return state.resumen.totalGastos; }
  function getTotalInvertido() { return state.resumen.totalInvertido; }
  function getSaldoNeto() { return state.resumen.saldoNeto; }
  function getMargenBruto() { return state.resumen.margenBruto; }
  function getResultadoNeto() { return state.resumen.resultadoNeto; }
  function getProyeccionLiquidez() { return state.proyeccion; }

  async function recargarMovimientos() {
    const fincaId = state.fincaActual !== 'todas' ? state.fincaActual : undefined;
    const [gastos, ingresos, inversiones, cartera, resumen, proyeccion] = await Promise.all([
      AgroAPI.getGastos(fincaId), AgroAPI.getIngresos(fincaId), AgroAPI.getInversiones(),
      AgroAPI.getCartera(), AgroAPI.getResumen(fincaId), AgroAPI.getProyeccion(fincaId)
    ]);
    state.gastos = gastos.map(normalizarGasto);
    state.ingresos = ingresos.map(normalizarIngreso);
    state.inversiones = inversiones.map(normalizarInversion);
    state.cartera = cartera.map(normalizarCheque);
    state.resumen = resumen;
    state.proyeccion = proyeccion;
  }

  function resolverFincaActual(fincas) {
    const guardada = localStorage.getItem('agrotech_finca_activa');
    if (guardada === 'todas') return 'todas';
    if (guardada && fincas.some(f => String(f.id) === guardada)) return Number(guardada);
    return fincas.length ? fincas[0].id : 'todas';
  }

  async function cargarTodo() {
    const [fincas, lotes, historial, configN8N] = await Promise.all([
      AgroAPI.getFincas(), AgroAPI.getLotes(), AgroAPI.getHistorial(), AgroAPI.getConfigN8N()
    ]);
    state.fincas = fincas.map(normalizarFinca);
    state.lotes = lotes.map(normalizarLote);
    state.fincaActual = resolverFincaActual(state.fincas);
    state.historial = historial;
    state.configN8N = configN8N;
    await recargarMovimientos();
  }

  async function setFincaActiva(fincaId) {
    state.fincaActual = fincaId;
    localStorage.setItem('agrotech_finca_activa', String(fincaId));
    await recargarMovimientos();
  }

  async function addFinca(nombre, ubicacion) {
    const finca = await AgroAPI.crearFinca({ nombre: nombre.trim(), ubicacion: ubicacion ? ubicacion.trim() : undefined });
    const normalizada = normalizarFinca(finca);
    state.fincas.push(normalizada);
    await setFincaActiva(normalizada.id);
    return normalizada.id;
  }

  async function addLote(nombre, area = 10, detalles = {}) {
    if (state.fincaActual === 'todas') {
      throw new Error('Elegí una finca específica antes de agregar un cuartel.');
    }
    const lote = await AgroAPI.crearLote({
      nombre: nombre.trim(), area, fincaId: state.fincaActual,
      color: detalles.color, cultivo: detalles.cultivo, riego: detalles.riego,
      mallaAntigranizo: detalles.mallaAntigranizo, terreno: detalles.terreno
    });
    state.lotes.push(normalizarLote(lote));
    return lote.id;
  }

  async function addGasto(loteId, concepto, monto, estado, fecha) {
    const gasto = await AgroAPI.crearGasto({ loteId: Number(loteId), concepto, monto, estado, fecha: fecha || undefined });
    await recargarMovimientos();
    return gasto.id;
  }

  async function addIngreso(origen, monto, tipo, estado, descuento, montoNeto, fechaCobro) {
    const ingreso = await AgroAPI.crearIngreso({
      loteId: Number(origen), monto, tipo, estado,
      conDescuento: !!descuento, montoNeto, fechaCobro: fechaCobro || undefined
    });
    await recargarMovimientos();
    return ingreso.id;
  }

  async function addInversion(ticker, monto) {
    const inversion = await AgroAPI.crearInversion({ ticker, monto });
    await recargarMovimientos();
    return inversion.id;
  }

  function exportarDatos() {
    const datos = {
      finca: getFincaActualNombre(), lotes: getLotes(), gastos: state.gastos, ingresos: state.ingresos,
      cartera: state.cartera, inversiones: state.inversiones, resumen: state.resumen
    };
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrotech_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  function exportarCSV() {
    let csv = 'Cuartel,Ingresos,Gastos,Balance,Area\n';
    getLotes().forEach(l => {
      const ing = getIngresos(l.id);
      const gas = getGastos(l.id);
      csv += `"${l.nombre}",${ing},${gas},${ing - gas},${l.area}\n`;
    });
    csv += `\nTOTAL,${getTotalIngresos()},${getTotalGastos()},${getMargenBruto()},\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrotech_reporte_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  function importarDatos() {
    return { success: false, error: 'La importación de backups no está disponible en modo online. Cargá los movimientos desde Gastos/Ingresos/Inversiones.' };
  }

  function formatMoney(value) {
    const abs = Math.abs(value);
    return new Intl.NumberFormat('es-AR', {
      style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(abs);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const [año, mes, dia] = String(dateStr).slice(0, 10).split('-');
    return `${dia}/${mes}/${año}`;
  }

  function formatDateTime(isoStr) {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  function animateValue(element, start, end, duration = 800) {
    const range = end - start;
    const startTime = performance.now();

    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = start + range * easeProgress;
      element.textContent = (current >= 0 ? '+' : '-') + formatMoney(current);
      if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
  }

  function toast(message, type = 'success', duration = 3000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
    const toastEl = document.createElement('div');
    toastEl.className = `toast toast-${type}`;
    toastEl.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toastEl);

    setTimeout(() => {
      toastEl.style.opacity = '0';
      toastEl.style.transform = 'translateY(-20px)';
      setTimeout(() => toastEl.remove(), 300);
    }, duration);
  }

  function confirmDialog(message, onConfirm) {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay active';
    overlay.style.zIndex = '200';
    overlay.innerHTML = `
      <div class="modal-sheet" style="max-height: auto; padding: 28px; text-align: center;">
        <div style="font-size: 3rem; margin-bottom: 12px;">🤔</div>
        <h3 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 8px;">¿Confirmar?</h3>
        <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 24px;">${message}</p>
        <div style="display: flex; gap: 10px;">
          <button class="btn btn-secondary btn-full" id="btn-cancel">Cancelar</button>
          <button class="btn btn-danger btn-full" id="btn-confirm">Confirmar</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#btn-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelector('#btn-confirm').addEventListener('click', () => {
      overlay.remove();
      onConfirm();
    });
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  }

  function initTheme() {
    const saved = localStorage.getItem('agrotech_theme');
    if (saved === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('agrotech_theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('agrotech_theme', 'dark');
    }
    return !isDark;
  }

  function logout() {
    AgroAPI.logout();
    location.href = 'login.html';
  }

  async function init() {
    initTheme();

    if (location.pathname.endsWith('login.html')) return;

    if (!AgroAPI.getToken()) {
      location.href = 'login.html';
      return;
    }

    try {
      await cargarTodo();
    } catch (err) {
      console.error('[AgroTech] Error cargando datos de la API:', err);
      toast('No se pudo conectar con el servidor', 'error');
    }

    resolverReady();

    if (state.configN8N && state.configN8N.habilitado) {
      setTimeout(() => {
        AgroAPI.sincronizarCartera().then(res => {
          if (res.success) toast('📱 Cheques sincronizados con N8N');
        });
      }, 2000);
    }
  }

  return {
    CONFIG, COLORS, ready,
    getFincas, getFincaActualId, getFincaActualNombre, setFincaActiva, addFinca,
    getLotes, getIngresos, getGastos, getInversiones, getCartera,
    getGastosProgramados, getCostoFinanciero, getChequesRechazados, getHistorial,
    getTotalIngresos, getTotalGastos, getTotalInvertido,
    getSaldoNeto, getMargenBruto, getResultadoNeto, getProyeccionLiquidez,
    addLote, addGasto, addIngreso, addInversion,
    exportarDatos, exportarCSV, importarDatos,
    formatMoney, formatDate, formatDateTime,
    animateValue, toast, confirmDialog,
    initTheme, toggleTheme, logout, init
  };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => AgroTech.init());
} else {
  AgroTech.init();
}
