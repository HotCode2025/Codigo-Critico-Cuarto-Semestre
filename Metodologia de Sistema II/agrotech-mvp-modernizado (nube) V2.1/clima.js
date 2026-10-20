/* ============================================
   AGROTECH - CLIMA POR FINCA (tarjeta del Inicio)
   Pronóstico de 7 días de la finca activa (Open-Meteo), con los días de helada y granizo marcados.
   Si la finca no está ubicada, deja buscar el lugar o usar el GPS del celular. El umbral de helada
   es el que usa el aviso por N8N.
   ============================================ */
/* global AgroTech, AgroAPI */
document.addEventListener('DOMContentLoaded', async function () {
  'use strict';
  const AT = AgroTech;
  const cont = document.getElementById('clima-card');
  if (!cont) return;
  const escapeHtml = str => {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  };
  const grados = n => (n == null ? '–' : `${Math.round(n)}°`);
  const DIA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const hoy = new Date().toLocaleDateString('sv');
  const nombreDia = f => (f === hoy ? 'Hoy' : DIA[new Date(`${f}T12:00:00`).getDay()]);

  await AT.ready;
  let fincas = [];
  let config = { umbralHelada: 0, avisar: true };
  let finca = null;

  function elegirFinca() {
    const actual = AT.getFincaActualId();
    if (actual !== 'todas') return fincas.find(f => f.id === actual) || null;
    return fincas.find(f => f.latitud !== null) || fincas[0] || null;
  }

  function marco(contenido) {
    cont.innerHTML = `
      <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:baseline;gap:4px 8px;margin-bottom:10px;">
        <h3 class="section-title" style="margin:0;">Clima${finca ? ` · ${escapeHtml(finca.nombre)}` : ''}</h3>
        ${finca && finca.lugar ? `<span class="clima-nota">${escapeHtml(finca.lugar)}</span>` : ''}
      </div>
      <div class="card">${contenido}</div>`;
  }

  // ----- Sin ubicación: buscar el lugar o usar el GPS -----
  function pedirUbicacion(mensaje) {
    marco(`
      <p style="font-size:0.82rem;margin-bottom:10px;">${mensaje || 'Ubicá la finca para ver el pronóstico y recibir el aviso de helada.'}</p>
      <form id="clima-buscar" style="display:flex;gap:8px;margin-bottom:8px;" novalidate>
        <input class="form-input" id="clima-q" placeholder="Ej: Tunuyán, Vista Flores, La Consulta" maxlength="80" aria-label="Lugar" style="flex:1;min-width:0;">
        <button type="submit" class="btn btn-sm btn-primary">Buscar</button>
      </form>
      <div id="clima-resultados"></div>
      <button type="button" class="btn btn-sm btn-ghost btn-full" id="clima-gps"><span class="ico" data-icon="map-pin"></span> Usar mi ubicación (estando en la finca)</button>`);
    document.getElementById('clima-buscar').addEventListener('submit', async e => {
      e.preventDefault();
      const q = document.getElementById('clima-q').value.trim();
      const res = document.getElementById('clima-resultados');
      if (q.length < 2) return AT.toast('Escribí el nombre del lugar', 'error');
      res.innerHTML = '<p class="clima-nota">Buscando…</p>';
      try {
        const lugares = await AgroAPI.buscarLugarClima(q);
        res.innerHTML = lugares.length
          ? lugares
              .map(
                (l, i) =>
                  `<button type="button" class="list-item" data-lugar="${i}" style="width:100%;text-align:left;margin-bottom:6px;cursor:pointer;font-size:0.8rem;">${escapeHtml(l.nombre)}</button>`
              )
              .join('')
          : '<p class="clima-nota">No encontré ese lugar. Probá con el nombre del pueblo o del distrito.</p>';
        res.querySelectorAll('[data-lugar]').forEach(b =>
          b.addEventListener('click', () => {
            const l = lugares[Number(b.dataset.lugar)];
            guardarUbicacion(l.latitud, l.longitud, l.nombre);
          })
        );
      } catch (err) {
        res.innerHTML = `<p class="clima-nota">${escapeHtml(err.message)}</p>`;
      }
    });
    document.getElementById('clima-gps').addEventListener('click', () => {
      if (!navigator.geolocation) return AT.toast('Este dispositivo no da la ubicación', 'error');
      navigator.geolocation.getCurrentPosition(
        p => guardarUbicacion(p.coords.latitude, p.coords.longitude, 'Ubicación del GPS'),
        () => AT.toast('No se pudo obtener la ubicación: revisá el permiso del navegador', 'error'),
        { enableHighAccuracy: true, timeout: 15000 }
      );
    });
  }

  async function guardarUbicacion(latitud, longitud, lugar) {
    try {
      const f = await AgroAPI.ubicarFinca(finca.id, { latitud, longitud, lugar });
      Object.assign(finca, f);
      AT.toast('Finca ubicada');
      await mostrarPronostico();
    } catch (err) {
      AT.toast(err.message, 'error');
    }
  }

  // ----- Pronóstico -----
  async function mostrarPronostico() {
    marco('<p class="clima-nota">Cargando el pronóstico…</p>');
    let datos;
    try {
      datos = await AgroAPI.getPronostico(finca.id);
    } catch (err) {
      marco(`<p class="clima-nota">${escapeHtml(err.message)}</p>`);
      return;
    }
    const proximos = datos.dias.slice(0, 3);
    const heladas = proximos.filter(d => d.helada);
    const granizo = proximos.filter(d => d.granizo);
    const aviso = [
      heladas.length &&
        `Helada: ${heladas.map(d => `${nombreDia(d.fecha).toLowerCase()} ${AT.formatDate(d.fecha).slice(0, 5)} (${grados(d.minima)})`).join(', ')}`,
      granizo.length &&
        `Tormenta con granizo: ${granizo.map(d => `${nombreDia(d.fecha).toLowerCase()} ${AT.formatDate(d.fecha).slice(0, 5)}`).join(', ')}`
    ]
      .filter(Boolean)
      .join('<br>');
    marco(`
      ${aviso ? `<div class="alert alert-warning" style="margin-bottom:12px;"><span class="alert-icon"><span class="ico" data-icon="alert-triangle"></span></span><div class="alert-content"><h4>En los próximos 3 días</h4><p>${aviso}</p></div></div>` : ''}
      <div class="clima-dias">
        ${datos.dias
          .map(
            d => `<div class="clima-dia${d.helada ? ' helada' : ''}${d.granizo ? ' granizo' : ''}">
              <p class="clima-nombre">${nombreDia(d.fecha)}</p>
              <p class="clima-desc">${escapeHtml(d.descripcion)}</p>
              <p class="clima-temp"><b>${grados(d.maxima)}</b> <span>${grados(d.minima)}</span></p>
              <p class="clima-extra">${d.lluvia ? `${d.lluvia.toLocaleString('es-AR')} mm` : '&nbsp;'}</p>
              <p class="clima-extra">${d.rafagas != null ? `${Math.round(d.rafagas)} km/h` : ''}</p>
              ${d.helada ? '<p class="clima-marca">Helada</p>' : d.granizo ? '<p class="clima-marca">Granizo</p>' : ''}
            </div>`
          )
          .join('')}
      </div>
      <div class="clima-pie">
        <label>Helada con mínima de
          <input type="number" id="clima-umbral" min="-15" max="10" step="0.5" value="${datos.umbralHelada}" aria-label="Umbral de helada en grados"> °C o menos
        </label>
        <label><input type="checkbox" id="clima-avisar" ${config.avisar ? 'checked' : ''}> Avisarme por N8N</label>
        <button type="button" class="btn btn-sm btn-ghost" id="clima-cambiar">Cambiar ubicación</button>
      </div>
      <p class="clima-nota" style="margin-top:6px;">Pronóstico de ${
        datos.fuente === 'MET Norway'
          ? '<a href="https://www.met.no/en" target="_blank" rel="noopener">MET Norway</a> (CC BY 4.0)'
          : '<a href="https://open-meteo.com" target="_blank" rel="noopener">Open-Meteo</a>'
      } (temperatura a 2 m; en el suelo puede ser más baja). Confirmalo con el SMN y Contingencias Climáticas antes de decidir la defensa.</p>`);
    const guardarConfig = async cambios => {
      try {
        config = await AgroAPI.guardarConfigClima(cambios);
        AT.toast('Guardado');
        if ('umbralHelada' in cambios) await mostrarPronostico();
      } catch (err) {
        AT.toast(err.message, 'error');
      }
    };
    document
      .getElementById('clima-umbral')
      .addEventListener('change', e => guardarConfig({ umbralHelada: e.target.value }));
    document
      .getElementById('clima-avisar')
      .addEventListener('change', e => guardarConfig({ avisar: e.target.checked }));
    document
      .getElementById('clima-cambiar')
      .addEventListener('click', () => pedirUbicacion('Buscá el lugar de la finca o usá el GPS estando en ella.'));
  }

  try {
    ({ fincas, config } = await AgroAPI.getFincasClima());
  } catch {
    cont.innerHTML = '';
    return;
  }
  finca = elegirFinca();
  if (!finca) {
    cont.innerHTML = '';
    return;
  }
  if (finca.latitud === null) pedirUbicacion();
  else await mostrarPronostico();
});
