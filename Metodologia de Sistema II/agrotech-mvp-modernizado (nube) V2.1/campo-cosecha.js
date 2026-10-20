/* ============================================
   AGROTECH - COSECHA A DESTAJO (pestaña Cosecha de campo.html)
   Tarja del día por cuartel, cosecheros, liquidación con planilla PDF y kilos por cuartel.
   Es el control de la cosecha y de los pagos: no reemplaza RENATRE ni el recibo de sueldo.
   ============================================ */
/* global AgroTech, AgroAPI, AgroIcons */
document.addEventListener('DOMContentLoaded', async function () {
  'use strict';
  const AT = AgroTech;
  const $ = id => document.getElementById(id);
  if (!$('panel-cosecha')) return;
  const valor = id => $(id).value.trim();
  const escapeHtml = str => {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  };
  const hoy = new Date().toLocaleDateString('sv');
  const num = n => Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 2 });
  const plata = n => AT.formatMoney(Number(n || 0));
  // Desde el lunes de esta semana
  const lunes = (() => {
    const d = new Date(`${hoy}T12:00:00`);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toLocaleDateString('sv');
  })();
  const UNIDAD = { tacho: ['tacho', 'tachos'], bin: ['bin', 'bins'], kg: ['kg', 'kg'], jornal: ['jornal', 'jornales'] };
  const unidad = (m, n) => UNIDAD[m][Number(n) === 1 ? 0 : 1];

  await AT.ready;
  const lotes = AT.getLotes();
  let cosecheros = [];
  let tarifas = [];
  let tarjasDelDia = [];
  let carencias = [];

  $('t-fecha').value = hoy;
  $('t-fecha').max = hoy;
  $('t-cuartel').innerHTML = lotes.length
    ? lotes.map(l => `<option value="${l.id}">${escapeHtml(l.nombre)}</option>`).join('')
    : '<option value="">Primero creá un cuartel desde Inicio</option>';
  $('l-desde').value = lunes;
  $('l-hasta').value = hoy;
  $('l-desde').max = hoy;
  $('l-hasta').max = hoy;

  // ----- Tarja del día -----
  function tarifaActual() {
    return tarifas.find(t => t.modalidad === valor('t-modalidad')) || {};
  }
  function ponerTarifa() {
    const m = valor('t-modalidad');
    const t = tarifaActual();
    $('t-precio').value = t.precio != null ? Number(t.precio) : '';
    $('t-precio-label').textContent = `Precio por ${m === 'kg' ? 'kilo' : m}`;
    $('t-kg-grupo').style.display = ['tacho', 'bin'].includes(m) ? '' : 'none';
    $('t-kg').value = t.kg_por_unidad != null ? Number(t.kg_por_unidad) : '';
    $('t-kg-label').textContent = `Kilos por ${m}`;
  }

  function avisoCarencia() {
    const c = carencias.find(x => String(x.lote_id) === valor('t-cuartel'));
    $('t-carencia').innerHTML = c
      ? `<div class="alert alert-warning" style="margin-bottom:12px;"><span class="alert-icon"><span class="ico" data-icon="alert-triangle"></span></span>
          <div class="alert-content"><h4>Este cuartel está en carencia</h4><p>Por ${escapeHtml(c.producto)} no se puede cosechar hasta el ${AT.formatDate(c.cosecha_desde)}.</p></div></div>`
      : '';
  }

  function renderFilas() {
    const m = valor('t-modalidad');
    const paso = m === 'jornal' ? 0.5 : 1;
    const activos = cosecheros.filter(c => c.activo || tarjasDelDia.some(t => t.cosechero_id === c.id));
    const cont = $('t-filas');
    if (!activos.length) {
      cont.innerHTML =
        '<p class="form-hint" style="padding:8px 0;">Todavía no cargaste cosecheros. Agregalos abajo, en <b>Cosecheros</b>.</p>';
      totalDelDia();
      return;
    }
    cont.innerHTML = activos
      .map(c => {
        const t = tarjasDelDia.find(x => x.cosechero_id === c.id && x.modalidad === m);
        const pagada = t && t.pagado_en;
        return `<div class="fila-tarja">
          <span class="nombre">${escapeHtml(c.nombre)}${pagada ? ' <span class="status-badge status-ok">Pagado</span>' : ''}</span>
          <div class="contador">
            <button type="button" data-menos="${c.id}" aria-label="Uno menos" ${pagada ? 'disabled' : ''}>−</button>
            <input type="number" inputmode="decimal" min="0" step="${paso}" data-cosechero="${c.id}" value="${t ? Number(t.cantidad) : ''}" placeholder="0" aria-label="Cantidad de ${escapeHtml(c.nombre)}" ${pagada ? 'disabled' : ''}>
            <button type="button" data-mas="${c.id}" aria-label="Uno más" ${pagada ? 'disabled' : ''}>+</button>
          </div>
        </div>`;
      })
      .join('');
    const input = id => cont.querySelector(`[data-cosechero="${id}"]`);
    cont.querySelectorAll('[data-menos]').forEach(b =>
      b.addEventListener('click', () => {
        const i = input(b.dataset.menos);
        i.value = Math.max(0, Number(i.value || 0) - paso) || '';
        totalDelDia();
      })
    );
    cont.querySelectorAll('[data-mas]').forEach(b =>
      b.addEventListener('click', () => {
        const i = input(b.dataset.mas);
        i.value = Number(i.value || 0) + paso;
        totalDelDia();
      })
    );
    cont.querySelectorAll('[data-cosechero]').forEach(i => i.addEventListener('input', totalDelDia));
    totalDelDia();
  }

  function totalDelDia() {
    const m = valor('t-modalidad');
    const cantidades = [...document.querySelectorAll('#t-filas [data-cosechero]')].map(i => Number(i.value || 0));
    const total = cantidades.reduce((s, n) => s + n, 0);
    const precio = Number(valor('t-precio') || 0);
    const kg = m === 'kg' ? total : ['tacho', 'bin'].includes(m) ? total * Number(valor('t-kg') || 0) : 0;
    $('t-total').textContent = total
      ? `${num(total)} ${unidad(m, total)}${kg && m !== 'kg' ? ` · ${num(kg)} kg` : ''} · ${plata(total * precio)} · ${cantidades.filter(Boolean).length} cosechero(s)`
      : 'Sin cargar';
  }

  async function cargarDia() {
    if (!valor('t-cuartel')) return;
    try {
      tarjasDelDia = await AgroAPI.getTarjas({ fecha: valor('t-fecha'), loteId: valor('t-cuartel') });
    } catch (err) {
      tarjasDelDia = [];
      AT.toast(err.message, 'error');
    }
    avisoCarencia();
    renderFilas();
  }
  ['t-fecha', 't-cuartel'].forEach(id => $(id).addEventListener('change', cargarDia));
  $('t-modalidad').addEventListener('change', () => {
    ponerTarifa();
    renderFilas();
  });
  ['t-precio', 't-kg'].forEach(id => $(id).addEventListener('input', totalDelDia));

  $('form-tarja').addEventListener('submit', async e => {
    e.preventDefault();
    if (!valor('t-cuartel')) return AT.toast('Primero creá un cuartel', 'error');
    const m = valor('t-modalidad');
    const filas = [...document.querySelectorAll('#t-filas [data-cosechero]:not([disabled])')]
      .map(i => ({ cosecheroId: Number(i.dataset.cosechero), cantidad: Number(i.value || 0) }))
      // Solo se mandan las que tienen cantidad o las que ya existían (para borrarlas con 0).
      .filter(f => f.cantidad > 0 || tarjasDelDia.some(t => t.cosechero_id === f.cosecheroId && t.modalidad === m));
    if (!filas.length) return AT.toast('Cargá lo que hizo al menos un cosechero', 'error');
    if (valor('t-precio') === '') return AT.toast(`Poné el precio por ${m === 'kg' ? 'kilo' : m}`, 'error');
    const btn = $('btn-tarja');
    btn.disabled = true;
    try {
      const datos = {
        fecha: valor('t-fecha'),
        loteId: Number(valor('t-cuartel')),
        modalidad: m,
        precioUnidad: valor('t-precio'),
        filas
      };
      if (['tacho', 'bin'].includes(m) && valor('t-kg')) datos.kgPorUnidad = valor('t-kg');
      const r = await AgroAPI.guardarTarja(datos);
      // El precio y los kilos usados quedan como tarifa para la próxima.
      const t = tarifaActual();
      if (
        Number(t.precio) !== Number(valor('t-precio')) ||
        (datos.kgPorUnidad && Number(t.kg_por_unidad) !== Number(datos.kgPorUnidad))
      ) {
        tarifas = await AgroAPI.guardarTarifasCosecha([
          { modalidad: m, precio: valor('t-precio'), kgPorUnidad: datos.kgPorUnidad }
        ]);
      }
      AT.toast(`Tarja guardada${r.borradas ? ` (${r.borradas} quitada/s)` : ''}`);
      await Promise.all([cargarDia(), cargarLiquidacion()]);
    } catch (err) {
      AT.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  // ----- Cosecheros -----
  function renderCosecheros() {
    const cont = $('lista-cosecheros');
    if (!cosecheros.length) {
      cont.innerHTML = '<p class="form-hint">Sin cosecheros cargados.</p>';
      return;
    }
    cont.innerHTML = cosecheros
      .map(
        c => `<div class="registro">
          <div>
            <p><b>${escapeHtml(c.nombre)}</b>${c.activo ? '' : ' <span class="status-badge status-danger">De baja</span>'}</p>
            <p class="form-hint">${[c.dni && 'DNI ' + c.dni, c.telefono].filter(Boolean).map(escapeHtml).join(' · ') || 'Sin DNI ni teléfono'}</p>
          </div>
          <div style="display:flex;gap:4px;align-items:center;">
            <button type="button" class="btn btn-sm btn-ghost" data-baja="${c.id}">${c.activo ? 'Dar de baja' : 'Reactivar'}</button>
            <button type="button" class="btn-icono" data-borrar-cosechero="${c.id}" aria-label="Borrar cosechero">${AgroIcons.svg('trash')}</button>
          </div>
        </div>`
      )
      .join('');
    cont.querySelectorAll('[data-baja]').forEach(b =>
      b.addEventListener('click', async () => {
        const c = cosecheros.find(x => String(x.id) === b.dataset.baja);
        try {
          await AgroAPI.editarCosechero(c.id, { activo: !c.activo });
          await cargarCosecheros();
        } catch (err) {
          AT.toast(err.message, 'error');
        }
      })
    );
    cont.querySelectorAll('[data-borrar-cosechero]').forEach(b =>
      b.addEventListener('click', () =>
        AT.confirmDialog('¿Borrar este cosechero?', async () => {
          try {
            await AgroAPI.borrarCosechero(b.dataset.borrarCosechero);
            await cargarCosecheros();
          } catch (err) {
            AT.toast(err.message, 'error');
          }
        })
      )
    );
  }
  async function cargarCosecheros() {
    try {
      cosecheros = await AgroAPI.getCosecheros();
    } catch (err) {
      AT.toast(err.message, 'error');
    }
    renderCosecheros();
    renderFilas();
  }
  $('form-cosechero').addEventListener('submit', async e => {
    e.preventDefault();
    if (!valor('co-nombre')) return AT.toast('Poné el nombre', 'error');
    try {
      await AgroAPI.crearCosechero({
        nombre: valor('co-nombre'),
        dni: valor('co-dni'),
        telefono: valor('co-telefono')
      });
      ['co-nombre', 'co-dni', 'co-telefono'].forEach(id => ($(id).value = ''));
      AT.toast('Cosechero agregado');
      await cargarCosecheros();
      $('co-nombre').focus();
    } catch (err) {
      AT.toast(err.message, 'error');
    }
  });

  // ----- Liquidación -----
  let liquidacion = null;
  let rendimiento = [];
  async function cargarLiquidacion() {
    const desde = valor('l-desde');
    const hasta = valor('l-hasta');
    if (!desde || !hasta) return;
    try {
      [liquidacion, rendimiento] = await Promise.all([
        AgroAPI.getLiquidacionCosecha(desde, hasta),
        AgroAPI.getRendimientoCosecha(desde, hasta)
      ]);
    } catch (err) {
      $('liquidacion').innerHTML = `<p class="form-hint">${escapeHtml(err.message)}</p>`;
      return;
    }
    renderLiquidacion();
  }
  ['l-desde', 'l-hasta'].forEach(id => $(id).addEventListener('change', cargarLiquidacion));

  function unidades(c) {
    return [
      Number(c.tachos) && `${num(c.tachos)} ${unidad('tacho', c.tachos)}`,
      Number(c.bins) && `${num(c.bins)} ${unidad('bin', c.bins)}`,
      Number(c.jornales) && `${num(c.jornales)} ${unidad('jornal', c.jornales)}`,
      Number(c.kg) && `${num(c.kg)} kg`
    ]
      .filter(Boolean)
      .join(' · ');
  }

  function renderLiquidacion() {
    const cont = $('liquidacion');
    const lista = liquidacion.cosecheros;
    if (!lista.length) {
      cont.innerHTML = '<div class="empty-state"><p class="empty-state-title">Sin tarjas en estas fechas</p></div>';
      $('rendimiento').innerHTML = '';
      return;
    }
    const tot = liquidacion.totales;
    cont.innerHTML = `
      ${lista
        .map(
          c => `<div class="registro">
            <div>
              <p><b>${escapeHtml(c.nombre)}</b> · ${c.dias} día(s)</p>
              <p class="form-hint">${unidades(c)}</p>
            </div>
            <div style="text-align:right;">
              <p><b>${plata(c.importe)}</b></p>
              ${Number(c.pendiente) ? `<button type="button" class="btn btn-sm btn-ghost" data-pagar="${c.cosechero_id}">Pagar ${plata(c.pendiente)}</button>` : '<span class="status-badge status-ok">Pagado</span>'}
            </div>
          </div>`
        )
        .join('')}
      <div class="registro" style="font-weight:800;">
        <span>Total${tot.kg ? ` · ${num(tot.kg)} kg` : ''}</span>
        <span>${plata(tot.importe)}${tot.pendiente ? ` · <span style="color:var(--warning-600, #b45309);">pendiente ${plata(tot.pendiente)}</span>` : ''}</span>
      </div>`;
    cont
      .querySelectorAll('[data-pagar]')
      .forEach(b => b.addEventListener('click', () => pagar([Number(b.dataset.pagar)])));
    $('btn-pagar-todo').disabled = !tot.pendiente;

    $('rendimiento').innerHTML = rendimiento.length
      ? `<p class="form-label" style="margin:14px 0 4px;">Kilos cosechados por cuartel</p>` +
        rendimiento
          .map(
            r => `<div class="registro"><span>${escapeHtml(r.cuartel)}${r.cultivo ? ` <span class="form-hint">(${escapeHtml(r.cultivo)})</span>` : ''}</span>
              <span><b>${num(r.kg)} kg</b>${r.kg_ha ? ` · ${num(r.kg_ha)} kg/ha` : ''}</span></div>`
          )
          .join('')
      : '';
  }

  function pagar(ids) {
    const tot = ids
      ? liquidacion.cosecheros.filter(c => ids.includes(c.cosechero_id)).reduce((s, c) => s + Number(c.pendiente), 0)
      : liquidacion.totales.pendiente;
    AT.confirmDialog(
      `¿Marcar como pagado ${plata(tot)} del ${AT.formatDate(liquidacion.desde)} al ${AT.formatDate(liquidacion.hasta)}? ${$('l-gasto').checked ? 'Se carga como gasto en cada cuartel.' : ''}`,
      async () => {
        try {
          const r = await AgroAPI.pagarCosecha({
            desde: liquidacion.desde,
            hasta: liquidacion.hasta,
            ...(ids && { cosecheroIds: ids }),
            registrarGasto: $('l-gasto').checked
          });
          AT.toast(`Pagado ${plata(r.importe)}${r.gastos ? ` · ${r.gastos} gasto(s) cargado(s)` : ''}`);
          await Promise.all([cargarLiquidacion(), cargarDia()]);
        } catch (err) {
          AT.toast(err.message, 'error');
        }
      }
    );
  }
  $('btn-pagar-todo').addEventListener('click', () => pagar(null));

  // Planilla para que firme cada cosechero.
  $('btn-planilla').addEventListener('click', () => {
    if (!liquidacion || !liquidacion.cosecheros.length) return AT.toast('No hay tarjas en estas fechas', 'error');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const productor = AgroAPI.getProductor() || {};
    doc.setFontSize(14).text('Planilla de cosecha a destajo', 14, 15);
    doc
      .setFontSize(9)
      .text(
        `${productor.nombre || ''} · ${AT.getFincaActualNombre()} · del ${AT.formatDate(liquidacion.desde)} al ${AT.formatDate(liquidacion.hasta)}`,
        14,
        21
      );
    doc.autoTable({
      startY: 26,
      head: [['Cosechero', 'DNI', 'Días', 'Trabajo', 'Importe', 'Estado', 'Firma']],
      body: liquidacion.cosecheros.map(c => [
        c.nombre,
        c.dni || '',
        c.dias,
        unidades(c),
        plata(c.importe),
        Number(c.pendiente) ? `Pendiente ${plata(c.pendiente)}` : 'Pagado',
        ''
      ]),
      foot: [
        [
          'Total',
          '',
          '',
          liquidacion.totales.kg ? `${num(liquidacion.totales.kg)} kg` : '',
          plata(liquidacion.totales.importe),
          '',
          ''
        ]
      ],
      styles: { fontSize: 8, minCellHeight: 10, valign: 'middle' },
      columnStyles: { 6: { cellWidth: 40 } },
      headStyles: { fillColor: [63, 98, 18] },
      footStyles: { fillColor: [240, 240, 240], textColor: 20 }
    });
    doc
      .setFontSize(7)
      .text(
        'Control interno de la cosecha. No reemplaza el registro de los trabajadores (RENATRE) ni el recibo de sueldo.',
        14,
        doc.lastAutoTable.finalY + 8
      );
    doc.save(`planilla-cosecha-${liquidacion.desde}-al-${liquidacion.hasta}.pdf`);
  });

  // ----- Arranque -----
  try {
    [tarifas, carencias] = await Promise.all([AgroAPI.getTarifasCosecha(), AgroAPI.getCarencias().catch(() => [])]);
  } catch (err) {
    AT.toast(err.message, 'error');
  }
  ponerTarifa();
  await cargarCosecheros();
  await Promise.all([cargarDia(), cargarLiquidacion()]);
});
