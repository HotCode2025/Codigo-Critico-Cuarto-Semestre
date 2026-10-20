/* ============================================
   AGROTECH - STOCK DE INSUMOS (pestaña Stock de campo.html)
   Insumos con su stock, compras, usos y ajustes por inventario. Las aplicaciones y fertilizaciones
   del cuaderno descuentan solas: cuando se guardan, campo.html avisa con el evento
   'agrotech:stock-cambio' y esta pestaña se vuelve a cargar.
   ============================================ */
/* global AgroTech, AgroAPI, AgroIcons */
document.addEventListener('DOMContentLoaded', async function () {
  'use strict';
  const AT = AgroTech;
  const $ = id => document.getElementById(id);
  if (!$('panel-stock')) return;
  const valor = id => $(id).value.trim();
  const escapeHtml = str => {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  };
  const hoy = new Date().toLocaleDateString('sv');
  const num = n => Number(n || 0).toLocaleString('es-AR', { maximumFractionDigits: 3 });
  const CATEGORIAS = {
    fitosanitario: 'Fitosanitario',
    fertilizante: 'Fertilizante',
    combustible: 'Combustible',
    envase: 'Envase',
    otro: 'Otro'
  };
  const TIPOS = { compra: 'Compra', uso: 'Uso', ajuste: 'Ajuste' };
  let insumos = [];

  await AT.ready;
  $('m-fecha').value = hoy;
  $('m-fecha').max = hoy;

  function mostrarCamposMovimiento() {
    const tipo = valor('m-tipo');
    $('m-cantidad-grupo').style.display = tipo === 'ajuste' ? 'none' : '';
    $('m-contado-grupo').style.display = tipo === 'ajuste' ? '' : 'none';
    $('m-compra').style.display = tipo === 'compra' ? '' : 'none';
    const i = insumos.find(x => String(x.id) === valor('m-insumo'));
    const u = i ? i.unidad : '';
    $('m-cantidad-label').textContent = `Cantidad${u ? ` (${u})` : ''}`;
    $('m-contado-label').textContent = `Lo que hay en el depósito${u ? ` (${u})` : ''}`;
    $('m-hint').textContent = i ? `Stock actual: ${num(i.stock)} ${i.unidad}` : '';
  }
  ['m-tipo', 'm-insumo'].forEach(id => $(id).addEventListener('change', mostrarCamposMovimiento));

  function render() {
    const activos = insumos.filter(i => i.activo);
    $('m-insumo').innerHTML = activos.length
      ? activos.map(i => `<option value="${i.id}">${escapeHtml(i.nombre)} (${i.unidad})</option>`).join('')
      : '<option value="">Primero agregá un insumo</option>';
    mostrarCamposMovimiento();

    const bajos = activos.filter(i => i.bajo && i.stock_minimo !== null);
    $('stock-bajo').innerHTML = bajos.length
      ? `<div class="alert alert-warning" style="margin-bottom:16px;"><span class="alert-icon"><span class="ico" data-icon="alert-triangle"></span></span>
          <div class="alert-content"><h4>Para reponer</h4><p>${bajos
            .map(i => `${escapeHtml(i.nombre)}: quedan ${num(i.stock)} ${i.unidad} (mínimo ${num(i.stock_minimo)})`)
            .join('<br>')}</p></div></div>`
      : '';

    const cont = $('lista-insumos');
    if (!insumos.length) {
      cont.innerHTML =
        '<div class="empty-state"><div class="empty-state-icon"><span class="ico" data-icon="box"></span></div><p class="empty-state-title">Sin insumos</p><p class="empty-state-desc">Agregá los productos que tenés en el depósito.</p></div>';
      return;
    }
    cont.innerHTML = insumos
      .map(
        i => `<div class="ficha" data-insumo="${i.id}">
          <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
            <div style="min-width:0;">
              <p style="font-size:0.85rem;font-weight:800;">${escapeHtml(i.nombre)}</p>
              <p class="form-hint">${[
                CATEGORIAS[i.categoria],
                i.principio_activo,
                i.carencia_dias != null && `carencia ${i.carencia_dias} días`,
                i.ultimo_precio && `última compra ${AT.formatMoney(Number(i.ultimo_precio))}/${i.unidad}`
              ]
                .filter(Boolean)
                .map(escapeHtml)
                .join(' · ')}</p>
            </div>
            <div style="text-align:right;flex-shrink:0;">
              <p style="font-size:1rem;font-weight:800;${Number(i.stock) < 0 ? 'color:var(--danger-500);' : ''}">${num(i.stock)} ${i.unidad}</p>
              ${!i.activo ? '<span class="status-badge status-danger">De baja</span>' : i.bajo && i.stock_minimo !== null ? '<span class="status-badge status-warn">Reponer</span>' : ''}
            </div>
          </div>
          <div class="acciones">
            <button type="button" class="btn btn-sm btn-ghost" data-accion="historial"><span class="ico" data-icon="clock"></span> Movimientos</button>
            <label class="form-hint" style="display:flex;align-items:center;gap:6px;flex:1 1 140px;">Mínimo
              <input type="number" class="form-input" data-minimo min="0" step="any" value="${i.stock_minimo != null ? Number(i.stock_minimo) : ''}" style="padding:6px 8px;font-size:0.75rem;width:90px;">
            </label>
            <button type="button" class="btn btn-sm btn-ghost" data-accion="baja">${i.activo ? 'Dar de baja' : 'Reactivar'}</button>
          </div>
          <div data-historial style="display:none;margin-top:8px;"></div>
        </div>`
      )
      .join('');
    cont.querySelectorAll('[data-insumo]').forEach(div => {
      const i = insumos.find(x => String(x.id) === div.dataset.insumo);
      const intentar = f => async () => {
        try {
          await f();
        } catch (err) {
          AT.toast(err.message, 'error');
        }
      };
      div.querySelector('[data-accion="historial"]').addEventListener(
        'click',
        intentar(async () => {
          const h = div.querySelector('[data-historial]');
          if (h.style.display !== 'none') {
            h.style.display = 'none';
            return;
          }
          const movs = await AgroAPI.getMovimientosStock(i.id);
          h.innerHTML = movs.length
            ? movs
                .map(
                  m => `<div class="registro">
                    <div>
                      <p class="tipo">${TIPOS[m.tipo]} · ${AT.formatDate(m.fecha)}${m.cuartel ? ` · ${escapeHtml(m.cuartel)} (cuaderno)` : ''}</p>
                      <p class="form-hint">${[m.proveedor, m.precio_unitario && `${AT.formatMoney(Number(m.precio_unitario))}/${i.unidad}`, m.nota].filter(Boolean).map(escapeHtml).join(' · ')}</p>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <b style="font-size:0.8rem;">${Number(m.cantidad) > 0 ? '+' : ''}${num(m.cantidad)} ${i.unidad}</b>
                      ${m.cuaderno_id ? '' : `<button type="button" class="btn-icono" data-borrar-mov="${m.id}" aria-label="Borrar movimiento">${AgroIcons.svg('trash')}</button>`}
                    </div>
                  </div>`
                )
                .join('')
            : '<p class="form-hint">Sin movimientos.</p>';
          h.style.display = 'block';
          h.querySelectorAll('[data-borrar-mov]').forEach(b =>
            b.addEventListener('click', () =>
              AT.confirmDialog(
                '¿Borrar este movimiento?',
                intentar(async () => {
                  await AgroAPI.borrarMovimientoStock(b.dataset.borrarMov);
                  await cargar();
                })
              )
            )
          );
        })
      );
      div.querySelector('[data-minimo]').addEventListener(
        'change',
        intentar(async () => {
          const v = div.querySelector('[data-minimo]').value;
          await AgroAPI.editarInsumo(i.id, { stockMinimo: v === '' ? null : v });
          AT.toast('Mínimo guardado');
          await cargar();
        })
      );
      div.querySelector('[data-accion="baja"]').addEventListener(
        'click',
        intentar(async () => {
          await AgroAPI.editarInsumo(i.id, { activo: !i.activo });
          await cargar();
        })
      );
    });
  }

  async function cargar() {
    try {
      insumos = await AgroAPI.getStock();
    } catch (err) {
      $('lista-insumos').innerHTML =
        `<div class="empty-state">No se pudo cargar el stock: ${escapeHtml(err.message)}</div>`;
      return;
    }
    render();
  }

  $('form-movimiento').addEventListener('submit', async e => {
    e.preventDefault();
    if (!valor('m-insumo')) return AT.toast('Primero agregá un insumo', 'error');
    const tipo = valor('m-tipo');
    const datos = { insumoId: Number(valor('m-insumo')), tipo, fecha: valor('m-fecha'), nota: valor('m-nota') };
    if (tipo === 'ajuste') datos.stockContado = valor('m-contado');
    else datos.cantidad = valor('m-cantidad');
    if (tipo === 'compra') {
      datos.precioTotal = valor('m-precio') || null;
      datos.proveedor = valor('m-proveedor');
      datos.guardarPrecio = $('m-guardar-precio').checked;
    }
    const btn = $('btn-movimiento');
    btn.disabled = true;
    try {
      const r = await AgroAPI.moverStock(datos);
      AT.toast(`${TIPOS[tipo]} guardada · stock ${num(r.insumo.stock)} ${r.insumo.unidad}`);
      ['m-cantidad', 'm-contado', 'm-precio', 'm-nota'].forEach(id => ($(id).value = ''));
      await cargar();
      document.dispatchEvent(new CustomEvent('agrotech:stock-cambio', { detail: { desde: 'stock' } }));
    } catch (err) {
      AT.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  $('form-insumo').addEventListener('submit', async e => {
    e.preventDefault();
    if (!valor('i-nombre')) return AT.toast('Poné el nombre', 'error');
    try {
      await AgroAPI.crearInsumo({
        nombre: valor('i-nombre'),
        categoria: valor('i-categoria'),
        unidad: valor('i-unidad'),
        principioActivo: valor('i-activo'),
        carenciaDias: valor('i-carencia') || null,
        stockMinimo: valor('i-minimo') || null
      });
      ['i-nombre', 'i-activo', 'i-carencia', 'i-minimo'].forEach(id => ($(id).value = ''));
      AT.toast('Insumo agregado: cargá la compra para tener stock');
      await cargar();
      document.dispatchEvent(new CustomEvent('agrotech:stock-cambio', { detail: { desde: 'stock' } }));
    } catch (err) {
      AT.toast(err.message, 'error');
    }
  });

  document.addEventListener('agrotech:stock-cambio', e => {
    if (!e.detail || e.detail.desde !== 'stock') cargar();
  });
  await cargar();
});
