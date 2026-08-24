/* ============================================
   AGROTECH MVP - MOTOR COMPARTIDO v2.1
   Metodología de Sistemas II - UTN 2025
   ============================================ */

const AgroTech = (function() {
  'use strict';

  const CONFIG = {
    version: '2.0.0',
    appName: 'AgroTech',
    defaultLotes: [
      { id: 'duraznos', nombre: '🍑 Lote 1: Duraznos (Hesse)', color: 'orange', area: 12 },
      { id: 'vid', nombre: '🍇 Lote 2/3: Vid (Malbec/Bonarda)', color: 'purple', area: 25 },
      { id: 'olivos', nombre: '🫒 Lote 4: Olivos (Arauco)', color: 'teal', area: 8 }
    ]
  };

  const COLORS = {
    orange: { css: 'bg-orange-50 border-orange-200 text-orange-800 text-orange-600', hex: '#fb923c', gradient: 'linear-gradient(135deg, #fb923c 0%, #ea580c 100%)' },
    purple: { css: 'bg-purple-50 border-purple-200 text-purple-800 text-purple-600', hex: '#a855f7', gradient: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)' },
    teal:   { css: 'bg-teal-50 border-teal-200 text-teal-800 text-teal-600', hex: '#14b8a6', gradient: 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)' },
    blue:   { css: 'bg-blue-50 border-blue-200 text-blue-800 text-blue-600', hex: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
    green:  { css: 'bg-green-50 border-green-200 text-green-800 text-green-600', hex: '#22c55e', gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' },
    red:    { css: 'bg-red-50 border-red-200 text-red-800 text-red-600', hex: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' },
    yellow: { css: 'bg-yellow-50 border-yellow-200 text-yellow-800 text-yellow-600', hex: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }
  };

  const DB = {
    get: (key, fallback = null) => {
      try {
        const val = localStorage.getItem(key);
        return val ? JSON.parse(val) : fallback;
      } catch { return fallback; }
    },
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    remove: (key) => localStorage.removeItem(key),
    clear: () => localStorage.clear(),
    keys: () => Object.keys(localStorage).filter(k => k.startsWith('agrotech_') || ['ingresos_', 'gastos_', 'costo_financiero_total', 'cheques_rechazados'].some(p => k.startsWith(p)))
  };

  function getLotes() {
    let lotes = DB.get('agrotech_lotes');
    if (!lotes || lotes.length === 0) {
      lotes = CONFIG.defaultLotes;
      DB.set('agrotech_lotes', lotes);
    }
    return lotes;
  }

  function getIngresos(loteId) {
    return parseFloat(localStorage.getItem('ingresos_' + loteId)) || 0;
  }

  function getGastos(loteId) {
    return parseFloat(localStorage.getItem('gastos_' + loteId)) || 0;
  }

  function getInversiones() {
    return DB.get('agrotech_inversiones', []);
  }

  function getCartera() {
    return DB.get('agrotech_cartera', []);
  }

  function getGastosProgramados() {
    return DB.get('agrotech_gastos_programados', []);
  }

  function getCostoFinanciero() {
    return parseFloat(localStorage.getItem('costo_financiero_total')) || 0;
  }

  function getChequesRechazados() {
    return parseFloat(localStorage.getItem('cheques_rechazados')) || 0;
  }

  function getHistorial() {
    return DB.get('agrotech_historial', []);
  }

  function getTotalIngresos() {
    const lotes = getLotes();
    return lotes.reduce((sum, l) => sum + getIngresos(l.id), 0);
  }

  function getTotalGastos() {
    const lotes = getLotes();
    return lotes.reduce((sum, l) => sum + getGastos(l.id), 0);
  }

  function getTotalInvertido() {
    return getInversiones().reduce((sum, inv) => sum + inv.monto, 0);
  }

  function getSaldoNeto() {
    return getTotalIngresos() - getTotalGastos() - getTotalInvertido();
  }

  function getMargenBruto() {
    return getTotalIngresos() - getTotalGastos();
  }

  function getResultadoNeto() {
    return getMargenBruto() - getCostoFinanciero() - getChequesRechazados();
  }

  function addLote(nombre, area = 10) {
    const lotes = getLotes();
    const newId = 'lote_' + Date.now();
    const coloresDisponibles = ['blue', 'green', 'red', 'yellow'];
    const color = coloresDisponibles[lotes.length % coloresDisponibles.length];
    lotes.push({ id: newId, nombre: nombre.trim(), color, area });
    DB.set('agrotech_lotes', lotes);
    logEvent('lote_creado', { loteId: newId, nombre });
    return newId;
  }

  function addGasto(loteId, concepto, monto, estado, fecha) {
    if (estado === 'pagado') {
      const key = 'gastos_' + loteId;
      const previo = parseFloat(localStorage.getItem(key)) || 0;
      localStorage.setItem(key, previo + monto);
    } else {
      const gastosProg = getGastosProgramados();
      gastosProg.push({
        id: 'gasto_futuro_' + Date.now(),
        loteId, concepto, monto, fecha,
        creado: new Date().toISOString()
      });
      DB.set('agrotech_gastos_programados', gastosProg);
    }
    logEvent('gasto_registrado', { loteId, concepto, monto, estado, fecha });
  }

  // ============================================
  // CORREGIDO: addIngreso ahora guarda cheques
  // incluso si fechaCobro viene vacía/undefined
  // ============================================
  function addIngreso(origen, monto, tipo, estado, descuento, montoNeto, fechaCobro) {
    // Normalizar parámetros para evitar undefined
    descuento = !!descuento;
    montoNeto = parseFloat(montoNeto) || 0;
    
    let montoFinal = monto;
    let costoFinanciero = 0;

    if (descuento && montoNeto > 0 && montoNeto < monto) {
      montoFinal = montoNeto;
      costoFinanciero = monto - montoNeto;
      const previo = getCostoFinanciero();
      localStorage.setItem('costo_financiero_total', previo + costoFinanciero);
    }

    // GUARDAR CHEQUE EN CARTERA (con fallback de fecha)
    if ((tipo === 'fisico' || tipo === 'echeq') && estado === 'normal' && !descuento) {
      // Si no hay fecha de cobro, usar hoy como fallback
      if (!fechaCobro || fechaCobro.trim() === '') {
        fechaCobro = new Date().toISOString().split('T')[0];
        console.log('[AgroTech] ⚠️ fechaCobro no proporcionada, usando hoy:', fechaCobro);
      }
      const cartera = getCartera();
      cartera.push({
        id: 'chk_' + Date.now(),
        tipo, monto, descontado: false, estado: 'normal', fecha: fechaCobro,
        creado: new Date().toISOString()
      });
      DB.set('agrotech_cartera', cartera);
      console.log('[AgroTech] ✅ Cheque guardado en cartera:', tipo, monto, fechaCobro);
    }

    // Cheque rechazado → NO suma a ingresos
    if ((tipo === 'fisico' || tipo === 'echeq') && estado === 'rechazado' && !descuento) {
      const previo = getChequesRechazados();
      localStorage.setItem('cheques_rechazados', previo + monto);
    } else {
      // Sumar a ingresos del lote
      const key = 'ingresos_' + origen;
      const previo = parseFloat(localStorage.getItem(key)) || 0;
      localStorage.setItem(key, previo + montoFinal);
    }

    logEvent('ingreso_registrado', { origen, monto, tipo, estado });
  }

  function addInversion(ticker, monto) {
    const invs = getInversiones();
    invs.push({ ticker, monto, fecha: new Date().toISOString() });
    DB.set('agrotech_inversiones', invs);
    logEvent('inversion_registrada', { ticker, monto });
  }

  function logEvent(tipo, datos) {
    const historial = getHistorial();
    historial.unshift({
      id: 'evt_' + Date.now(),
      tipo,
      datos,
      fecha: new Date().toISOString()
    });
    if (historial.length > 100) historial.pop();
    DB.set('agrotech_historial', historial);
  }

  function getProyeccionLiquidez() {
    const saldoNeto = getSaldoNeto();
    const eventos = [];

    const cartera = getCartera();
    const chequesPendientes = cartera.filter(c => c.estado === 'normal' && !c.descontado && c.fecha);
    chequesPendientes.forEach(c => {
      eventos.push({ fecha: c.fecha, monto: c.monto, tipo: 'ingreso', desc: 'Cheque a cobrar', icono: '🏦' });
    });

    const gastosProg = getGastosProgramados();
    gastosProg.forEach(g => {
      if (g.fecha) {
        eventos.push({ fecha: g.fecha, monto: -g.monto, tipo: 'gasto', desc: g.concepto, icono: '💸' });
      }
    });

    eventos.sort((a, b) => new Date(a.fecha + 'T00:00:00') - new Date(b.fecha + 'T00:00:00'));

    let simulacion = saldoNeto;
    let ruptura = null;

    for (const evt of eventos) {
      simulacion += evt.monto;
      if (simulacion < 0 && evt.tipo === 'gasto' && !ruptura) {
        ruptura = { fecha: evt.fecha, saldo: simulacion };
        break;
      }
    }

    return { saldoNeto, eventos, ruptura };
  }

  async function enviarAN8N(evento, datos) {
    const webhook = localStorage.getItem('agrotech_n8n_webhook');
    const enabled = localStorage.getItem('agrotech_n8n_enabled') === 'true';

    if (!enabled || !webhook) return { success: false, error: 'N8N no configurado' };

    const payload = {
      app: CONFIG.appName,
      version: CONFIG.version,
      timestamp: new Date().toISOString(),
      evento,
      datos,
      resumen: {
        saldoNeto: getSaldoNeto(),
        totalIngresos: getTotalIngresos(),
        totalGastos: getTotalGastos(),
        totalInvertido: getTotalInvertido(),
        resultadoNeto: getResultadoNeto()
      }
    };

    try {
      const response = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return { success: response.ok, status: response.status };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function exportarDatos() {
    const datos = {};
    DB.keys().forEach(key => {
      datos[key] = localStorage.getItem(key);
    });
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrotech_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  function exportarCSV() {
    const lotes = getLotes();
    let csv = 'Cuartel,Ingresos,Gastos,Balance,Area\n';
    lotes.forEach(l => {
      const ing = getIngresos(l.id);
      const gas = getGastos(l.id);
      csv += `"${l.nombre}",${ing},${gas},${ing-gas},${l.area}\n`;
    });
    csv += `\nTOTAL,${getTotalIngresos()},${getTotalGastos()},${getMargenBruto()},\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrotech_reporte_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  }

  function importarDatos(jsonStr) {
    try {
      const datos = JSON.parse(jsonStr);
      Object.entries(datos).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  function formatMoney(value) {
    const abs = Math.abs(value);
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(abs);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const [año, mes, dia] = dateStr.split('-');
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

      if (progress < 1) {
        requestAnimationFrame(update);
      }
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

    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-20px)';
      setTimeout(() => toast.remove(), 300);
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
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.remove();
    });
  }

  function initTheme() {
    const saved = localStorage.getItem('agrotech_theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
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

  function init() {
    initTheme();
    getLotes();
n  }

  return {
    CONFIG,
    COLORS,
    DB,
    getLotes, getIngresos, getGastos, getInversiones, getCartera,
    getGastosProgramados, getCostoFinanciero, getChequesRechazados,
    getHistorial, getTotalIngresos, getTotalGastos, getTotalInvertido,
    getSaldoNeto, getMargenBruto, getResultadoNeto, getProyeccionLiquidez,
    addLote, addGasto, addIngreso, addInversion, logEvent,
    enviarAN8N, exportarDatos, exportarCSV, importarDatos,
    formatMoney, formatDate, formatDateTime,
    animateValue, toast, confirmDialog,
    initTheme, toggleTheme, init
  };
})();

// ============================================
// SINCRONIZAR CHEQUES CON N8N
// ============================================

async function sincronizarChequesConN8N() {
  console.log('%c[AgroTech] ⏳ Ejecutando sincronizarChequesConN8N...', 'color:#7c3aed;font-weight:bold;');

  const AT = AgroTech;
  const enabled = localStorage.getItem('agrotech_n8n_enabled') === 'true';
  const webhook = localStorage.getItem('agrotech_n8n_webhook');

  console.log('[AgroTech] N8N enabled:', enabled);
  console.log('[AgroTech] Webhook guardado:', webhook ? webhook.substring(0, 40) + '...' : 'NO HAY');

  if (!enabled || !webhook) {
    console.log('%c[AgroTech] ❌ Abortado: N8N no configurado', 'color:#ef4444');
    return;
  }

  const cartera = AT.getCartera();
  console.log('[AgroTech] Cartera total:', cartera.length, 'cheques');

  const chequesPendientes = cartera.filter(c => c.estado === 'normal' && !c.descontado);
  console.log('[AgroTech] Cheques pendientes:', chequesPendientes.length);

  if (chequesPendientes.length === 0) {
    console.log('%c[AgroTech] ℹ️ No hay cheques pendientes para sincronizar', 'color:#f59e0b');
    return;
  }

  console.log('%c[AgroTech] 📤 Enviando evento cheques_pendientes a N8N...', 'color:#3b82f6');

  const res = await AT.enviarAN8N('cheques_pendientes', {
    cheques: chequesPendientes,
    totalCheques: chequesPendientes.length,
    montoTotalCheques: chequesPendientes.reduce((s, c) => s + c.monto, 0)
  });

  console.log('[AgroTech] Respuesta N8N:', res);

  if (res.success) {
    console.log('%c[AgroTech] ✅ Cheques sincronizados correctamente', 'color:#22c55e');
    AT.toast('📧 Cheques sincronizados con N8N');
  } else {
    console.log('%c[AgroTech] ❌ Error N8N:', 'color:#ef4444', res.error);
  }
}

window.sincronizarChequesConN8N = sincronizarChequesConN8N;

// ============================================
// INICIALIZACIÓN
// ============================================

function initApp() {
  console.log('%c[AgroTech] 🚀 Iniciando app...', 'color:#059669;font-weight:bold;');
  AgroTech.init();

  const cartera = AgroTech.getCartera();
  console.log('[AgroTech] Cheques en cartera:', cartera.length);

  const enabled = localStorage.getItem('agrotech_n8n_enabled') === 'true';
  const webhook = localStorage.getItem('agrotech_n8n_webhook');

  console.log('[AgroTech] Config N8N - enabled:', enabled, '| webhook:', webhook ? 'Sí' : 'No');

  if (enabled && webhook) {
    console.log('[AgroTech] ⏱️ Sincronización automática en 2 segundos...');
    setTimeout(() => {
      sincronizarChequesConN8N();
    }, 2000);
  } else {
    console.log('%c[AgroTech] ⚠️ N8N no activo. Activá el toggle en pantalla6.html', 'color:#f59e0b');
  }
}

// Esto funciona aunque el DOM ya haya cargado
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  console.log('[AgroTech] DOM ya cargado, ejecutando initApp ahora...');
  initApp();
}