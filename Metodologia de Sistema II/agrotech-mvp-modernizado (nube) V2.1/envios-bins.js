/* ============================================
   AGROTECH - BINS EN COMODATO (sección de envios.html)
   Los bins que presta cada fábrica: la fábrica los trae vacíos, vuelven llenos con cada envío (sin
   cargarlos de nuevo) y retira los vacíos que sobran. Muestra el saldo de cada fábrica en la finca y,
   al cargar un envío, propone de quién son los bins y avisa si no alcanzan.
   ============================================ */
/* global AgroTech, AgroAPI, AgroIcons */
document.addEventListener('DOMContentLoaded', async function () {
  'use strict';
  const AT = AgroTech;
  const $ = id => document.getElementById(id);
  if (!$('bins-saldos')) return;
  const valor = id => $(id).value.trim();
  const escapeHtml = str => {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  };
  const hoy = new Date().toLocaleDateString('sv');
  const soloDigitos = t => String(t || '').replace(/\D/g, '');
  const TIPOS = {
    entrega: 'Trajo vacíos',
    retiro: 'Retiró vacíos',
    rotura: 'Rotos o perdidos',
    ajuste: 'Conteo',
    envio: 'Volvieron llenos'
  };
  const nombreBins = t => `${t.descripcion}${t.marca ? ` ${t.marca}` : ''}${t.color ? ` (${t.color})` : ''}`;
  let bins = [];

  await AT.ready;
  $('mb-fecha').value = hoy;
  $('mb-fecha').max = hoy;

  // ----- En el formulario del envío -----
  function binsDelDestino() {
    const cuit = soloDigitos(valor('envio-destino-cuit'));
    const nombre = valor('envio-destino').toLowerCase();
    const activos = bins.filter(t => t.activo);
    const porCuit = cuit.length === 11 ? activos.filter(t => t.fabrica_cuit === cuit) : [];
    const candidatos = porCuit.length
      ? porCuit
      : activos.filter(t => nombre && t.fabrica_nombre.toLowerCase() === nombre);
    return candidatos.length === 1 ? candidatos[0] : null;
  }
  function avisoDelEnvio() {
    const t = bins.find(x => String(x.id) === valor('envio-tipo-bin'));
    const cantidad = Number(valor('envio-bins') || 0);
    $('envio-bins-hint').innerHTML = !t
      ? bins.length
        ? 'Si los bins son de una fábrica, elegila: así se descuentan de su cuenta.'
        : ''
      : cantidad > t.saldo
        ? `<span style="color:var(--warning-600, #b45309);font-weight:700;">Ojo: en la finca quedan ${t.saldo} bins de ${escapeHtml(t.fabrica_nombre)} y estás mandando ${cantidad}.</span>`
        : `En la finca hay ${t.saldo} bins de ${escapeHtml(t.fabrica_nombre)}.`;
  }
  let elegidoAMano = false;
  function proponerBins() {
    if (elegidoAMano) return avisoDelEnvio();
    const t = binsDelDestino();
    $('envio-tipo-bin').value = t ? String(t.id) : '';
    avisoDelEnvio();
  }
  ['envio-destino', 'envio-destino-cuit'].forEach(id => $(id).addEventListener('input', proponerBins));
  $('envio-bins').addEventListener('input', avisoDelEnvio);
  $('envio-tipo-bin').addEventListener('change', () => {
    elegidoAMano = true;
    avisoDelEnvio();
  });
  $('form-envio').addEventListener('submit', () => (elegidoAMano = false));

  // ----- Saldos por fábrica -----
  function render() {
    const elegido = valor('envio-tipo-bin');
    const activos = bins.filter(t => t.activo);
    $('envio-tipo-bin').innerHTML =
      '<option value="">Sin elegir (bins propios u otros)</option>' +
      activos
        .map(t => `<option value="${t.id}">${escapeHtml(t.fabrica_nombre)}: ${escapeHtml(nombreBins(t))}</option>`)
        .join('');
    if (activos.some(t => String(t.id) === elegido)) $('envio-tipo-bin').value = elegido;
    $('envio-bins-de-grupo').style.display = activos.length ? '' : 'none';
    $('mb-tipo-bin').innerHTML = activos
      .map(t => `<option value="${t.id}">${escapeHtml(t.fabrica_nombre)}: ${escapeHtml(nombreBins(t))}</option>`)
      .join('');
    $('form-mov-bins').style.display = activos.length ? '' : 'none';
    avisoDelEnvio();

    const cont = $('bins-saldos');
    if (!bins.length) {
      cont.innerHTML =
        '<p style="font-size:0.78rem;color:var(--text-muted);margin-bottom:12px;">Agregá los bins que te presta cada fábrica para llevar la cuenta: cuántos trajo, cuántos volvieron llenos con los envíos y cuántos tenés en la finca.</p>';
      return;
    }
    cont.innerHTML = '';
    for (const t of bins) {
      const div = document.createElement('div');
      div.className = 'card';
      div.style.marginBottom = '10px';
      div.innerHTML = `
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
          <div style="min-width:0;">
            <p style="font-size:0.85rem;font-weight:800;">${escapeHtml(t.fabrica_nombre)}${t.activo ? '' : ' <span class="status-badge status-danger">De baja</span>'}</p>
            <p style="font-size:0.72rem;color:var(--text-muted);">${escapeHtml(nombreBins(t))}</p>
            <p style="font-size:0.7rem;color:var(--text-muted);margin-top:4px;">Trajo ${t.entregados} · volvieron llenos ${t.enviados} · retiró ${t.retirados}${t.rotos ? ` · rotos ${t.rotos}` : ''}${t.ajustes ? ` · ajuste ${t.ajustes > 0 ? '+' : ''}${t.ajustes}` : ''}</p>
          </div>
          <div style="text-align:right;flex-shrink:0;">
            <p style="font-size:1.3rem;font-weight:800;${t.saldo < 0 ? 'color:var(--danger-500);' : ''}">${t.saldo}</p>
            <p style="font-size:0.62rem;color:var(--text-muted);">en la finca</p>
          </div>
        </div>
        ${t.saldo < 0 ? '<p style="font-size:0.7rem;color:var(--danger-500);margin-top:6px;">Salieron más de los que trajo: falta cargar una entrega, o contalos y cargá el conteo.</p>' : ''}
        <div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap;">
          <button type="button" class="btn btn-sm btn-ghost" data-historial><span class="ico" data-icon="clock"></span> Historial</button>
          <button type="button" class="btn btn-sm btn-ghost" data-baja>${t.activo ? 'Dar de baja' : 'Reactivar'}</button>
        </div>
        <div data-lista style="display:none;margin-top:8px;"></div>`;
      const intentar = f => async () => {
        try {
          await f();
        } catch (err) {
          AT.toast(err.message, 'error');
        }
      };
      div.querySelector('[data-historial]').addEventListener(
        'click',
        intentar(async () => {
          const lista = div.querySelector('[data-lista]');
          if (lista.style.display !== 'none') {
            lista.style.display = 'none';
            return;
          }
          const movs = await AgroAPI.getMovimientosBins(t.id);
          lista.innerHTML = movs.length
            ? movs
                .map(
                  m => `<div style="display:flex;justify-content:space-between;gap:8px;padding:8px 0;border-bottom:1px solid var(--border-glass);font-size:0.75rem;">
                    <div>
                      <p style="font-weight:700;">${TIPOS[m.tipo]} · ${AT.formatDate(m.fecha)}</p>
                      <p style="color:var(--text-muted);font-size:0.7rem;">${[
                        m.envio_id && `Envío a ${m.nota}${m.estado_envio === 'anulado' ? ' (anulado: no cuenta)' : ''}`,
                        m.remito_fabrica && `Remito ${m.remito_fabrica}`,
                        !m.envio_id && m.nota
                      ]
                        .filter(Boolean)
                        .map(escapeHtml)
                        .join(' · ')}</p>
                    </div>
                    <div style="display:flex;align-items:center;gap:6px;">
                      <b>${m.cantidad > 0 ? '+' : ''}${m.cantidad}</b>
                      ${m.id ? `<button type="button" class="btn-icono" data-borrar="${m.id}" aria-label="Borrar" style="background:none;border:none;color:var(--text-muted);cursor:pointer;">${AgroIcons.svg('trash')}</button>` : ''}
                    </div>
                  </div>`
                )
                .join('')
            : '<p style="font-size:0.75rem;color:var(--text-muted);">Sin movimientos.</p>';
          lista.style.display = 'block';
          lista.querySelectorAll('[data-borrar]').forEach(b =>
            b.addEventListener('click', () =>
              AT.confirmDialog(
                '¿Borrar este movimiento de bins?',
                intentar(async () => {
                  await AgroAPI.borrarMovimientoBins(b.dataset.borrar);
                  await cargar();
                })
              )
            )
          );
        })
      );
      div.querySelector('[data-baja]').addEventListener(
        'click',
        intentar(async () => {
          await AgroAPI.editarTipoBin(t.id, { activo: !t.activo });
          await cargar();
        })
      );
      cont.appendChild(div);
    }
  }

  async function cargar() {
    try {
      bins = await AgroAPI.getBins();
    } catch {
      bins = [];
    }
    render();
  }

  $('mb-tipo').addEventListener('change', () => {
    $('mb-cantidad-label').textContent = valor('mb-tipo') === 'ajuste' ? 'Cuántos hay en la finca' : 'Cantidad de bins';
    $('mb-cantidad').min = valor('mb-tipo') === 'ajuste' ? '0' : '1';
  });
  $('form-mov-bins').addEventListener('submit', async e => {
    e.preventDefault();
    const tipo = valor('mb-tipo');
    const n = valor('mb-cantidad');
    if (n === '') return AT.toast('Poné la cantidad de bins', 'error');
    const btn = $('btn-mov-bins');
    btn.disabled = true;
    try {
      const r = await AgroAPI.moverBins({
        tipoBinId: Number(valor('mb-tipo-bin')),
        tipo,
        ...(tipo === 'ajuste' ? { binsContados: Number(n) } : { cantidad: Number(n) }),
        fecha: valor('mb-fecha'),
        remitoFabrica: valor('mb-remito'),
        nota: valor('mb-nota')
      });
      AT.toast(`Guardado · quedan ${r.bins.saldo} bins de ${r.bins.fabrica_nombre} en la finca`);
      ['mb-cantidad', 'mb-remito', 'mb-nota'].forEach(id => ($(id).value = ''));
      await cargar();
    } catch (err) {
      AT.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  });

  $('form-tipo-bin').addEventListener('submit', async e => {
    e.preventDefault();
    if (!valor('tb-fabrica') || !valor('tb-descripcion')) return AT.toast('Poné la fábrica y qué bins son', 'error');
    try {
      await AgroAPI.crearTipoBin({
        fabricaNombre: valor('tb-fabrica'),
        fabricaCuit: valor('tb-cuit'),
        descripcion: valor('tb-descripcion'),
        marca: valor('tb-marca'),
        color: valor('tb-color')
      });
      ['tb-fabrica', 'tb-cuit', 'tb-descripcion', 'tb-marca', 'tb-color'].forEach(id => ($(id).value = ''));
      $('form-tipo-bin-details').open = false;
      AT.toast('Agregado: cargá cuántos trajo la fábrica');
      await cargar();
    } catch (err) {
      AT.toast(err.message, 'error');
    }
  });

  // Fábricas de los envíos anteriores, para no escribirlas de nuevo (y su CUIT).
  document.addEventListener('agrotech:envios-cambio', async () => {
    try {
      const envios = await AgroAPI.getEnvios();
      const fabricas = new Map();
      envios.forEach(en => fabricas.has(en.destino_nombre) || fabricas.set(en.destino_nombre, en.destino_cuit));
      $('tb-fabricas').innerHTML = [...fabricas.keys()].map(n => `<option value="${escapeHtml(n)}">`).join('');
      $('tb-fabrica').onchange = () => {
        const c = fabricas.get(valor('tb-fabrica'));
        if (c && !valor('tb-cuit')) $('tb-cuit').value = c;
      };
    } catch {
      /* sin sugerencias */
    }
    await cargar();
  });
  await cargar();
});
