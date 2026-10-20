// La cuenta del simulador vive en el frontend (simulador.js) y se prueba acá con números calculados a mano.
const Simulador = require('../../simulador');

const base = {
  kgFruta: 100000,
  precioKgFruta: 300,
  pctApta: 100,
  kgPorUnidad: 0.82,
  unidadesPorCaja: 12,
  servicios: [
    { concepto: 'Elaboración', precioUnidad: 6 },
    { concepto: 'Etiquetado', precioUnidad: 0.3 }
  ],
  insumosPorProductor: true,
  insumos: [{ nombre: 'Lata', unidad: 'un', consumo: 1, precio: 100 }],
  fleteTotal: 500000,
  comisionPct: 10,
  precioVentaUnidad: 450
};

describe('simulador ¿vendo la fruta o la elaboro?', () => {
  test('caso calculado a mano: conviene elaborar', () => {
    const r = Simulador.calcular(base);
    expect(r.vender.ingreso).toBe(30000000);
    expect(r.elaborar.unidades).toBe(121951); // 100.000 kg / 0,82 kg por lata, sin fracciones
    expect(r.elaborar.costoServicio).toBeCloseTo(768291.3, 2);
    expect(r.elaborar.costoInsumos).toBeCloseTo(12195100, 2);
    expect(r.elaborar.ingresoVenta).toBe(54877950);
    expect(r.elaborar.costoComision).toBeCloseTo(5487795, 2);
    expect(r.elaborar.resultado).toBeCloseTo(35926763.7, 1);
    expect(r.diferencia).toBeCloseTo(5926763.7, 1);
    expect(r.conviene).toBe('elaborar');
    expect(r.elaborar.cajas).toBeCloseTo(10162.58, 2);
  });

  test('al precio mínimo por unidad da lo mismo vender que elaborar', () => {
    const { precioMinimoUnidad } = Simulador.calcular(base);
    expect(precioMinimoUnidad).toBeCloseTo(396.0, 1);
    const enElLimite = Simulador.calcular({ ...base, precioVentaUnidad: precioMinimoUnidad });
    expect(enElLimite.diferencia).toBeCloseTo(0, 2);
    expect(Simulador.calcular({ ...base, precioVentaUnidad: 300 }).conviene).toBe('vender');
  });

  test('la fruta que no es de 1ra se vende aparte al precio de descarte', () => {
    const r = Simulador.calcular({ ...base, pctApta: 80, precioKgDescarte: 100 });
    expect(r.elaborar.kgAptos).toBe(80000);
    expect(r.elaborar.unidades).toBe(97560);
    expect(r.elaborar.ingresoDescarte).toBe(2000000);
  });

  test('si la fábrica pone los insumos, no suman costo ni piden precio', () => {
    const r = Simulador.calcular({
      ...base,
      insumosPorProductor: false,
      insumos: [{ nombre: 'Lata', consumo: 1, precio: 0 }]
    });
    expect(r.elaborar.costoInsumos).toBe(0);
    expect(r.insumosSinPrecio).toEqual([]);
    const conPrecioFaltante = Simulador.calcular({ ...base, insumos: [{ nombre: 'Lata', consumo: 1, precio: 0 }] });
    expect(conPrecioFaltante.insumosSinPrecio).toEqual(['Lata']);
  });

  test('valores vacíos o negativos no rompen la cuenta', () => {
    const r = Simulador.calcular({ kgFruta: '', precioKgFruta: -5, kgPorUnidad: 0 });
    expect(r.vender.ingreso).toBe(0);
    expect(r.elaborar.unidades).toBe(0);
    expect(r.precioMinimoUnidad).toBeNull();
  });

  test('la plantilla de durazno trae el estándar de 0,82 kg por lata y no se modifica al usarla', () => {
    const p = Simulador.plantilla('durazno_820');
    expect(p.kgPorUnidad).toBe(0.82);
    expect(p.servicios.map(s => s.precioUnidad)).toEqual([6, 0.3]);
    expect(p.insumos.find(i => i.nombre === 'Azúcar').consumo).toBe(0.034);
    p.kgPorUnidad = 1;
    expect(Simulador.plantilla('durazno_820').kgPorUnidad).toBe(0.82);
  });
});
