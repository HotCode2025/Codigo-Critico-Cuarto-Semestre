/* ============================================
   AGROTECH - MAQUINARIA (pestaña Máquinas de campo.html)
   Tractores, implementos, vehículos y herramientas: lo que dura años y no se consume. Service por
   fecha, vencimientos de seguro y patente/VTV (avisos por N8N), historial de services y lo gastado
   en repuestos. Avisa con 'agrotech:bienes-cambio' para que el stock y el cuaderno los ofrezcan.
   ============================================ */
/* global AgroTech, AgroAPI, AgroIcons */
document.addEventListener('DOMContentLoaded', async function () {
  'use strict';
  const AT = AgroTech;
  const $ = id => document.getElementById(id);
  if (!$('panel-maquinas')) return;
  const valor = id => $(id).value.trim();
  const escapeHtml = str => {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  };
  const hoy = new Date().toLocaleDateString('sv');
  const dias = f => Math.round((Date.parse(String(f).slice(0, 10)) - Date.parse(hoy)) / 86400000);
  const plata = n => AT.formatMoney(Number(n || 0));
  const TIPOS = {
    tractor: 'Tractores',
    implemento: 'Implementos',
    vehiculo: 'Vehículos',
    herramienta: 'Herramientas',
    instalacion: 'Instalaciones',
    otro: 'Otros'
  };
  const ESTADOS = {
    bueno: ['En uso', 'status-ok'],
    reparacion: ['En reparación', 'status-warn'],
    baja: ['De baja', 'status-danger']
  };
  let bienes = [];
  let editando = null;

  await AT.ready;
  const lotes = AT.getLotes();
  const fincaActual = AT.getFincaActualId();
  $('b-finca').innerHTML =
    '<option value="">Sin finca</option>' +
    AT.getFincas()
      .map(f => `<option value="${f.id}">${escapeHtml(f.nombre)}</option>`)
      .join('');
  ['b-ultimo-service'].forEach(id => ($(id).max = hoy));

  // Una fecha con aviso: en rojo si ya pasó, en naranja si falta poco.
  function fechaConAviso(f, que, antes) {
    if (!f) return '';
    const d = dias(f);
    const color = d < 0 ? 'var(--danger-500)' : d <= antes ? 'var(--warning-600, #b45309)' : 'inherit';
    return `<p class="form-hint" style="color:${color};">${que} ${AT.formatDate(f)}${d < 0 ? ' (vencido)' : d === 0 ? ' (hoy)' : ` (en ${d} días)`}</p>`;
  }

  function renderAvisos() {
    const avisos = [];
    for (const b of bienes.filter(x => x.estado !== 'baja')) {
      for (const [f, que, antes] of [
        [b.proximo_service, 'service', 15],
        [b.seguro_vence, 'seguro', 30],
        [b.patente_vence, 'patente / VTV', 30]
      ]) {
        if (f && dias(f) <= antes)
          avisos.push(`${escapeHtml(b.nombre)}: ${que} ${dias(f) < 0 ? 'vencido' : 'vence'} el ${AT.formatDate(f)}`);
      }
    }
    $('maquinas-avisos').innerHTML = avisos.length
      ? `<div class="alert alert-warning" style="margin-bottom:16px;"><span class="alert-icon"><span class="ico" data-icon="alert-triangle"></span></span>
          <div class="alert-content"><h4>Para atender</h4><p>${avisos.join('<br>')}</p></div></div>`
      : '';
  }

  function ficha(b) {
    const div = document.createElement('div');
    div.className = 'ficha';
    const [estadoTxt, estadoClase] = ESTADOS[b.estado];
    const datos = [[b.marca, b.modelo].filter(Boolean).join(' '), b.anio, b.serie && `N.º ${b.serie}`, b.finca].filter(
      Boolean
    );
    const gastado = Number(b.gasto_repuestos) + Number(b.gasto_services);
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start;">
        <div style="min-width:0;">
          <p style="font-size:0.85rem;font-weight:800;">${escapeHtml(b.nombre)}${b.cantidad > 1 ? ` <span class="form-hint">× ${b.cantidad}</span>` : ''}</p>
          ${datos.length ? `<p class="form-hint">${datos.map(escapeHtml).join(' · ')}</p>` : ''}
          ${b.ultimo_service ? `<p class="form-hint">Último service: ${AT.formatDate(b.ultimo_service)}${b.service_cada_meses ? ` · cada ${b.service_cada_meses} meses` : ''}</p>` : b.service_cada_meses ? '<p class="form-hint">Cargá el último service para calcular el próximo.</p>' : ''}
          ${fechaConAviso(b.proximo_service, 'Próximo service:', 15)}
          ${fechaConAviso(b.seguro_vence, 'Seguro vence el', 30)}
          ${fechaConAviso(b.patente_vence, 'Patente / VTV vence el', 30)}
          ${gastado ? `<p class="form-hint">Últimos 12 meses: ${plata(gastado)} (repuestos ${plata(b.gasto_repuestos)}, services ${plata(b.gasto_services)})</p>` : ''}
        </div>
        <span class="status-badge ${estadoClase}" style="flex-shrink:0;">${estadoTxt}</span>
      </div>
      <div class="acciones">
        <button type="button" class="btn btn-sm btn-primary" data-accion="service"><span class="ico" data-icon="save"></span> Registrar ${['herramienta', 'instalacion'].includes(b.tipo) ? 'arreglo' : 'service'}</button>
        <button type="button" class="btn btn-sm btn-ghost" data-accion="historial"><span class="ico" data-icon="clock"></span> Historial</button>
        <button type="button" class="btn btn-sm btn-ghost" data-accion="editar"><span class="ico" data-icon="pencil"></span> Editar</button>
        <button type="button" class="btn btn-sm btn-ghost" data-accion="borrar" aria-label="Borrar"><span class="ico" data-icon="trash"></span></button>
      </div>
      <form data-form-service novalidate style="display:none;margin-top:10px;">
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Fecha</label><input type="date" class="form-input" data-s="fecha" value="${hoy}" max="${hoy}"></div>
          <div class="form-group"><label class="form-label">Costo ($, opcional)</label><input type="number" class="form-input" data-s="costo" min="0" step="any" inputmode="decimal"></div>
        </div>
        <div class="form-group"><label class="form-label">Qué se hizo</label><input class="form-input" data-s="descripcion" maxlength="300" placeholder="Ej: cambio de aceite y filtros"></div>
        <div class="grid-2">
          <div class="form-group"><label class="form-label">Taller o quién lo hizo</label><input class="form-input" data-s="taller" maxlength="120"></div>
          <div class="form-group">
            <label class="form-label">El costo va a Gastos</label>
            <select class="form-select" data-s="modo"><option value="repartir">Repartido por hectárea</option><option value="cuartel">A un cuartel</option><option value="ninguno">No cargar gasto</option></select>
          </div>
        </div>
        <div class="form-group" data-s-cuartel style="display:none;"><label class="form-label">Cuartel</label>
          <select class="form-select" data-s="loteId">${lotes.map(l => `<option value="${l.id}">${escapeHtml(l.nombre)}</option>`).join('')}</select>
        </div>
        <button type="submit" class="btn btn-sm btn-primary btn-full"><span class="ico" data-icon="save"></span> Guardar service</button>
        <p class="form-hint" style="margin-top:6px;">Si es el más nuevo, pasa a ser el último service y se calcula el próximo.</p>
      </form>
      <div data-historial style="display:none;margin-top:10px;"></div>`;

    const intentar =
      f =>
      async (...a) => {
        try {
          await f(...a);
        } catch (err) {
          AT.toast(err.message, 'error');
        }
      };
    const form = div.querySelector('[data-form-service]');
    const campo = n => form.querySelector(`[data-s="${n}"]`);
    div.querySelector('[data-accion="service"]').addEventListener('click', () => {
      form.style.display = form.style.display === 'none' ? 'block' : 'none';
      if (form.style.display === 'block') campo('descripcion').focus();
    });
    campo('modo').addEventListener('change', () => {
      form.querySelector('[data-s-cuartel]').style.display = campo('modo').value === 'cuartel' ? '' : 'none';
    });
    form.addEventListener(
      'submit',
      intentar(async e => {
        e.preventDefault();
        const descripcion = campo('descripcion').value.trim();
        if (!descripcion) return AT.toast('Contá qué se hizo', 'error');
        const costo = campo('costo').value;
        const modo = campo('modo').value;
        const datos = {
          fecha: campo('fecha').value,
          descripcion,
          taller: campo('taller').value.trim(),
          costo: costo || null
        };
        if (costo && modo !== 'ninguno') {
          datos.gasto = {
            modo,
            ...(modo === 'cuartel' && { loteId: Number(campo('loteId').value) }),
            ...(modo === 'repartir' && fincaActual !== 'todas' && { fincaId: fincaActual })
          };
        }
        const r = await AgroAPI.registrarServiceBien(b.id, datos);
        AT.toast(
          `Service guardado${r.gastos.length ? ` · ${plata(r.gastos.reduce((s, g) => s + g.monto, 0))} en Gastos` : ''}`
        );
        await cargar();
      })
    );
    div.querySelector('[data-accion="historial"]').addEventListener(
      'click',
      intentar(async () => {
        const h = div.querySelector('[data-historial]');
        if (h.style.display !== 'none') {
          h.style.display = 'none';
          return;
        }
        const services = await AgroAPI.getServicesBien(b.id);
        h.innerHTML = services.length
          ? services
              .map(
                s => `<div class="registro">
                  <div>
                    <p class="tipo">${AT.formatDate(s.fecha)}${s.taller ? ` · ${escapeHtml(s.taller)}` : ''}</p>
                    <p>${escapeHtml(s.descripcion)}${s.costo ? ` · <b>${plata(s.costo)}</b>${s.gastos ? ' (en Gastos)' : ''}` : ''}</p>
                  </div>
                  <button type="button" class="btn-icono" data-borrar-service="${s.id}" aria-label="Borrar service">${AgroIcons.svg('trash')}</button>
                </div>`
              )
              .join('')
          : '<p class="form-hint">Sin services cargados.</p>';
        h.style.display = 'block';
        h.querySelectorAll('[data-borrar-service]').forEach(btn =>
          btn.addEventListener('click', () =>
            AT.confirmDialog(
              '¿Borrar este service? Si cargó un gasto, se borra también.',
              intentar(async () => {
                await AgroAPI.borrarServiceBien(b.id, btn.dataset.borrarService);
                await cargar();
              })
            )
          )
        );
      })
    );
    div.querySelector('[data-accion="editar"]').addEventListener('click', () => abrirForm(b));
    div.querySelector('[data-accion="borrar"]').addEventListener('click', () =>
      AT.confirmDialog(
        `¿Borrar ${escapeHtml(b.nombre)} con su historial? Si se vendió o se rompió, mejor ponelo "De baja" desde Editar: así queda la historia.`,
        intentar(async () => {
          await AgroAPI.borrarBien(b.id);
          await cargar();
        })
      )
    );
    return div;
  }

  function render() {
    renderAvisos();
    const cont = $('lista-bienes');
    cont.innerHTML = '';
    if (!bienes.length) {
      cont.innerHTML =
        '<div class="empty-state"><div class="empty-state-icon"><span class="ico" data-icon="tractor"></span></div><p class="empty-state-title">Sin maquinaria cargada</p><p class="empty-state-desc">Cargá tus tractores, implementos y herramientas (escaleras, bins…).</p></div>';
      return;
    }
    for (const tipo of Object.keys(TIPOS)) {
      const delTipo = bienes.filter(b => b.tipo === tipo);
      if (!delTipo.length) continue;
      const unidades = delTipo.filter(b => b.estado !== 'baja').reduce((s, b) => s + b.cantidad, 0);
      const titulo = document.createElement('p');
      titulo.className = 'form-label';
      titulo.style.margin = '14px 0 6px';
      titulo.textContent = `${TIPOS[tipo]} (${unidades})`;
      cont.appendChild(titulo);
      delTipo.forEach(b => cont.appendChild(ficha(b)));
    }
  }

  async function cargar() {
    try {
      bienes = await AgroAPI.getBienes();
    } catch (err) {
      $('lista-bienes').innerHTML =
        `<div class="empty-state">No se pudo cargar la maquinaria: ${escapeHtml(err.message)}</div>`;
      return;
    }
    render();
    document.dispatchEvent(new CustomEvent('agrotech:bienes-cambio', { detail: { bienes } }));
  }

  // ----- Alta y edición -----
  const CAMPOS = {
    'b-nombre': 'nombre',
    'b-tipo': 'tipo',
    'b-marca': 'marca',
    'b-modelo': 'modelo',
    'b-anio': 'anio',
    'b-serie': 'serie',
    'b-cantidad': 'cantidad',
    'b-finca': 'finca_id',
    'b-estado': 'estado',
    'b-fecha-compra': 'fecha_compra',
    'b-valor': 'valor_compra',
    'b-service-cada': 'service_cada_meses',
    'b-ultimo-service': 'ultimo_service',
    'b-seguro': 'seguro_vence',
    'b-patente': 'patente_vence',
    'b-notas': 'notas'
  };
  function abrirForm(b) {
    editando = b ? b.id : null;
    $('form-bien-details').open = true;
    $('form-bien-titulo').textContent = b ? `Editar ${b.nombre}` : 'Agregar máquina o herramienta';
    for (const [id, col] of Object.entries(CAMPOS)) {
      const v = b ? b[col] : null;
      $(id).value =
        v == null
          ? id === 'b-cantidad'
            ? 1
            : id === 'b-tipo'
              ? 'tractor'
              : id === 'b-estado'
                ? 'bueno'
                : ''
          : /fecha|service$|vence/.test(col) && col !== 'service_cada_meses'
            ? String(v).slice(0, 10)
            : v;
    }
    if (!b && fincaActual !== 'todas') $('b-finca').value = fincaActual;
    $('btn-guardar-bien').textContent = b ? 'Guardar cambios' : 'Agregar';
    $('btn-cancelar-bien').style.display = b ? '' : 'none';
    $('b-tipo').dispatchEvent(new Event('change'));
    $('form-bien-details').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  $('btn-cancelar-bien').addEventListener('click', () => {
    editando = null;
    $('form-bien').reset();
    $('form-bien-titulo').textContent = 'Agregar máquina o herramienta';
    $('btn-guardar-bien').textContent = 'Agregar';
    $('btn-cancelar-bien').style.display = 'none';
  });
  $('form-bien').addEventListener('submit', async e => {
    e.preventDefault();
    if (!valor('b-nombre')) return AT.toast('Poné el nombre', 'error');
    const datos = {
      nombre: valor('b-nombre'),
      tipo: valor('b-tipo'),
      marca: valor('b-marca'),
      modelo: valor('b-modelo'),
      anio: valor('b-anio') || null,
      serie: valor('b-serie'),
      cantidad: valor('b-cantidad') || 1,
      fincaId: valor('b-finca') || null,
      estado: valor('b-estado'),
      fechaCompra: valor('b-fecha-compra') || null,
      valorCompra: valor('b-valor') || null,
      serviceCadaMeses: valor('b-service-cada') || null,
      ultimoService: valor('b-ultimo-service') || null,
      seguroVence: valor('b-seguro') || null,
      patenteVence: valor('b-patente') || null,
      notas: valor('b-notas')
    };
    try {
      if (editando) await AgroAPI.editarBien(editando, datos);
      else await AgroAPI.crearBien(datos);
      AT.toast(editando ? 'Cambios guardados' : 'Agregado');
      $('btn-cancelar-bien').click();
      $('form-bien-details').open = false;
      await cargar();
    } catch (err) {
      AT.toast(err.message, 'error');
    }
  });
  $('b-tipo').addEventListener('change', () => {
    // A las herramientas no se les hace service ni tienen patente.
    const conService = !['herramienta', 'instalacion'].includes(valor('b-tipo'));
    $('b-mantenimiento').style.display = conService ? '' : 'none';
  });

  await cargar();
});
