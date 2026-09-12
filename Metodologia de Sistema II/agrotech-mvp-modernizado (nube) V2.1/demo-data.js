// Datos de prueba para demo
(function() {
  const datos = {
  "agrotech_lotes": "[{\"id\": \"duraznos\", \"nombre\": \"\\ud83c\\udf51 Lote 1: Duraznos (Hesse)\", \"color\": \"orange\", \"area\": 12}, {\"id\": \"vid\", \"nombre\": \"\\ud83c\\udf47 Lote 2/3: Vid (Malbec/Bonarda)\", \"color\": \"purple\", \"area\": 25}, {\"id\": \"olivos\", \"nombre\": \"\\ud83e\\uded2 Lote 4: Olivos (Arauco)\", \"color\": \"teal\", \"area\": 8}]",
  "ingresos_duraznos": "2850000",
  "ingresos_vid": "4200000",
  "ingresos_olivos": "950000",
  "gastos_duraznos": "1620000",
  "gastos_vid": "2380000",
  "gastos_olivos": "580000",
  "costo_financiero_total": "145000",
  "cheques_rechazados": "320000",
  "agrotech_cartera": "[{\"id\": \"chk_1\", \"tipo\": \"fisico\", \"monto\": 450000, \"descontado\": false, \"estado\": \"normal\", \"fecha\": \"2026-08-28\", \"creado\": \"2026-08-20T10:00:00Z\"}, {\"id\": \"chk_2\", \"tipo\": \"echeq\", \"monto\": 320000, \"descontado\": false, \"estado\": \"normal\", \"fecha\": \"2026-09-05\", \"creado\": \"2026-08-18T14:30:00Z\"}, {\"id\": \"chk_3\", \"tipo\": \"fisico\", \"monto\": 180000, \"descontado\": false, \"estado\": \"normal\", \"fecha\": \"2026-09-12\", \"creado\": \"2026-08-15T09:00:00Z\"}]",
  "agrotech_gastos_programados": "[{\"id\": \"gasto_futuro_1\", \"loteId\": \"duraznos\", \"concepto\": \"Insumos/Fertil.\", \"monto\": 280000, \"fecha\": \"2026-08-25\", \"creado\": \"2026-08-20T10:00:00Z\"}, {\"id\": \"gasto_futuro_2\", \"loteId\": \"vid\", \"concepto\": \"Personal Efectivo\", \"monto\": 450000, \"fecha\": \"2026-09-01\", \"creado\": \"2026-08-20T10:00:00Z\"}, {\"id\": \"gasto_futuro_3\", \"loteId\": \"olivos\", \"concepto\": \"Electricidad/Riego\", \"monto\": 95000, \"fecha\": \"2026-09-10\", \"creado\": \"2026-08-20T10:00:00Z\"}, {\"id\": \"gasto_futuro_4\", \"loteId\": \"vid\", \"concepto\": \"Combustible\", \"monto\": 120000, \"fecha\": \"2026-09-15\", \"creado\": \"2026-08-20T10:00:00Z\"}]",
  "agrotech_inversiones": "[{\"ticker\": \"AL30\", \"monto\": 500000, \"fecha\": \"2026-08-10T10:00:00Z\"}, {\"ticker\": \"YPFD\", \"monto\": 350000, \"fecha\": \"2026-08-15T14:00:00Z\"}]",
  "agrotech_historial": "[{\"id\": \"evt_1\", \"tipo\": \"gasto_registrado\", \"datos\": {\"loteId\": \"duraznos\", \"concepto\": \"Insumos/Fertil.\", \"monto\": 280000, \"estado\": \"programado\", \"fecha\": \"2026-08-25\"}, \"fecha\": \"2026-08-22T18:00:00Z\"}, {\"id\": \"evt_2\", \"tipo\": \"ingreso_registrado\", \"datos\": {\"origen\": \"vid\", \"monto\": 1200000, \"tipo\": \"echeq\", \"estado\": \"normal\"}, \"fecha\": \"2026-08-20T14:30:00Z\"}, {\"id\": \"evt_3\", \"tipo\": \"inversion_registrada\", \"datos\": {\"ticker\": \"YPFD\", \"monto\": 350000}, \"fecha\": \"2026-08-15T14:00:00Z\"}, {\"id\": \"evt_4\", \"tipo\": \"ingreso_registrado\", \"datos\": {\"origen\": \"duraznos\", \"monto\": 950000, \"tipo\": \"fisico\", \"estado\": \"normal\"}, \"fecha\": \"2026-08-12T09:00:00Z\"}, {\"id\": \"evt_5\", \"tipo\": \"gasto_registrado\", \"datos\": {\"loteId\": \"vid\", \"concepto\": \"Cosecha\", \"monto\": 680000, \"estado\": \"pagado\"}, \"fecha\": \"2026-08-08T16:00:00Z\"}, {\"id\": \"evt_6\", \"tipo\": \"inversion_registrada\", \"datos\": {\"ticker\": \"AL30\", \"monto\": 500000}, \"fecha\": \"2026-08-10T10:00:00Z\"}, {\"id\": \"evt_7\", \"tipo\": \"lote_creado\", \"datos\": {\"loteId\": \"olivos\", \"nombre\": \"\\ud83e\\uded2 Lote 4: Olivos (Arauco)\"}, \"fecha\": \"2026-08-01T08:00:00Z\"}, {\"id\": \"evt_8\", \"tipo\": \"ingreso_registrado\", \"datos\": {\"origen\": \"vid\", \"monto\": 3000000, \"tipo\": \"transferencia\", \"estado\": \"normal\"}, \"fecha\": \"2026-07-25T11:00:00Z\"}, {\"id\": \"evt_9\", \"tipo\": \"gasto_registrado\", \"datos\": {\"loteId\": \"duraznos\", \"concepto\": \"Personal Efectivo\", \"monto\": 450000, \"estado\": \"pagado\"}, \"fecha\": \"2026-07-20T07:00:00Z\"}, {\"id\": \"evt_10\", \"tipo\": \"ingreso_registrado\", \"datos\": {\"origen\": \"duraznos\", \"monto\": 1900000, \"tipo\": \"contado\", \"estado\": \"normal\"}, \"fecha\": \"2026-07-15T15:00:00Z\"}]",
  "agrotech_theme": "light",
  "agrotech_n8n_enabled": "false",
  "agrotech_n8n_webhook": ""
};
  Object.entries(datos).forEach(([key, value]) => {
    if (!localStorage.getItem(key)) {
      localStorage.setItem(key, value);
    }
  });
  console.log('✅ Datos de prueba cargados');
})();
