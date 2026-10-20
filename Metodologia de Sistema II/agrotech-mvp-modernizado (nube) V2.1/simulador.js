/* ============================================
   AGROTECH - SIMULADOR "¿VENDO LA FRUTA O LA ELABORO?"
   Compara vender la materia prima a la industria o la bodega contra elaborarla a façon y
   vender el producto terminado. No guarda nada: es una cuenta con valores editables.
   Se usa en ventas.html (window.AgroSimulador) y en los tests del server (require).
   ============================================ */

/* exported AgroSimulador */
/* global module */
const AgroSimulador = (function () {
  'use strict';

  // Plantillas con valores por defecto editables. La de durazno sale del estándar de producción de
  // una carta oferta de elaboración a façon real (consumos por lata de 820 g). Los precios de los
  // insumos no vienen en ese estándar: arrancan en 0 y los carga el productor.
  const PLANTILLAS = {
    durazno_820: {
      nombre: 'Durazno en mitades en jarabe diluido x 820 g',
      producto: 'Durazno en mitades JD x 820 g',
      unidad: 'lata',
      kgPorUnidad: 0.82,
      unidadesPorCaja: 12,
      servicios: [
        { concepto: 'Elaboración', precioUnidad: 6 },
        { concepto: 'Etiquetado', precioUnidad: 0.3 }
      ],
      insumos: [
        { nombre: 'Azúcar', unidad: 'kg', consumo: 0.034, precio: 0 },
        { nombre: 'Jarabe de maíz', unidad: 'kg', consumo: 0.052, precio: 0 },
        { nombre: 'Ácido cítrico', unidad: 'kg', consumo: 0.0011, precio: 0 },
        { nombre: 'Soda cáustica al 50 %', unidad: 'kg', consumo: 0.006, precio: 0 },
        { nombre: 'Lata (envase 3/1)', unidad: 'un', consumo: 1.005, precio: 0 },
        { nombre: 'Tapa 102 mm', unidad: 'un', consumo: 1.005, precio: 0 },
        { nombre: 'Etiqueta', unidad: 'un', consumo: 1.0275, precio: 0 },
        { nombre: 'Caja de cartón 12 x 820 g', unidad: 'un', consumo: 0.0837, precio: 0 },
        { nombre: 'Film stretch', unidad: 'kg', consumo: 0.0008, precio: 0 },
        { nombre: 'Hot melt para cajas', unidad: 'kg', consumo: 0.0002, precio: 0 },
        { nombre: 'Adhesivo vinílico para latas', unidad: 'kg', consumo: 0.0002, precio: 0 },
        { nombre: 'Cola de pique', unidad: 'kg', consumo: 0.0001, precio: 0 }
      ]
    },
    en_blanco: {
      nombre: 'Plantilla en blanco',
      producto: 'Producto elaborado',
      unidad: 'unidad',
      kgPorUnidad: 1,
      unidadesPorCaja: 1,
      servicios: [{ concepto: 'Elaboración', precioUnidad: 0 }],
      insumos: []
    }
  };

  const num = v => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : 0;
  };

  /**
   * datos: {
   *   kgFruta, precioKgFruta,              // la materia prima y lo que paga la industria por kg
   *   pctApta (0-100), precioKgDescarte,   // fruta de 1ra que sirve para elaborar; el resto se vende aparte
   *   kgPorUnidad, unidadesPorCaja,
   *   servicios: [{ concepto, precioUnidad }],
   *   insumosPorProductor (bool), insumos: [{ nombre, unidad, consumo, precio }],
   *   fleteTotal, comisionPct (0-100),     // flete y comisión de venta del producto terminado
   *   precioVentaUnidad
   * }
   */
  function calcular(datos) {
    const kgFruta = num(datos.kgFruta);
    const pctApta = Math.min(100, datos.pctApta === undefined || datos.pctApta === '' ? 100 : num(datos.pctApta));
    const kgPorUnidad = num(datos.kgPorUnidad);
    const comision = Math.min(100, num(datos.comisionPct)) / 100;

    const vender = { ingreso: kgFruta * num(datos.precioKgFruta) };

    const kgAptos = (kgFruta * pctApta) / 100;
    const unidades = kgPorUnidad ? Math.floor(kgAptos / kgPorUnidad + 1e-9) : 0;
    const servicioUnidad = (datos.servicios || []).reduce((s, x) => s + num(x.precioUnidad), 0);
    const insumos = (datos.insumos || []).map(i => ({
      nombre: i.nombre,
      cantidad: unidades * num(i.consumo),
      unidad: i.unidad,
      costo: datos.insumosPorProductor === false ? 0 : unidades * num(i.consumo) * num(i.precio)
    }));
    const costoServicio = unidades * servicioUnidad;
    const costoInsumos = insumos.reduce((s, i) => s + i.costo, 0);
    const flete = num(datos.fleteTotal);
    const ingresoVenta = unidades * num(datos.precioVentaUnidad);
    const costoComision = ingresoVenta * comision;
    const ingresoDescarte = (kgFruta - kgAptos) * num(datos.precioKgDescarte);
    const costos = costoServicio + costoInsumos + flete;
    const resultado = ingresoVenta - costoComision - costos + ingresoDescarte;

    const elaborar = {
      kgAptos,
      unidades,
      cajas: num(datos.unidadesPorCaja) ? unidades / num(datos.unidadesPorCaja) : 0,
      costoServicio,
      costoInsumos,
      insumos,
      flete,
      costoComision,
      ingresoVenta,
      ingresoDescarte,
      resultado,
      costoPorUnidad: unidades ? (costos + costoComision) / unidades : 0
    };

    // Precio por unidad desde el que elaborar deja más que vender la fruta.
    const precioMinimoUnidad =
      unidades && comision < 1 ? (vender.ingreso + costos - ingresoDescarte) / (unidades * (1 - comision)) : null;

    const diferencia = resultado - vender.ingreso;
    const conviene = Math.abs(diferencia) < 0.005 ? 'igual' : diferencia > 0 ? 'elaborar' : 'vender';

    // Insumos con consumo pero sin precio: el resultado de elaborar sale mejor de lo que es.
    const insumosSinPrecio =
      datos.insumosPorProductor === false
        ? []
        : (datos.insumos || []).filter(i => num(i.consumo) && !num(i.precio)).map(i => i.nombre);

    return { vender, elaborar, diferencia, conviene, precioMinimoUnidad, insumosSinPrecio };
  }

  const plantilla = clave => JSON.parse(JSON.stringify(PLANTILLAS[clave] || PLANTILLAS.en_blanco));

  return { PLANTILLAS, plantilla, calcular };
})();

if (typeof module !== 'undefined') module.exports = AgroSimulador;
