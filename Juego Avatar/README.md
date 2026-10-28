# 🌪️💧🌿🔥 La leyenda de AANG: Avatar

Mini juego web del equipo **Código Crítico** (Programación IV, Tecnicatura en Programación). Cada carpeta guarda una etapa del juego, en el orden en que lo fuimos construyendo clase a clase.

| Carpeta | Fecha | Qué se trabajó |
|---|---|---|
| [01 Agosto - version inicial](./01%20Agosto%20-%20version%20inicial/) | Agosto 2026 | Primera versión: selección de maestro, combate tipo piedra, papel o tijera (Puño, Patada, Barrida), manipulación del DOM y principio DRY con variables globales. |
| [02 Septiembre - POO](./02%20Septiembre%20-%20POO/) | Septiembre 2026 | Clases 04 y 05: POO con `class Avatar`, instancias con `new`, array `avatares` y rediseño visual (intro, cartas e íconos de ataque). |
| [03 Clases 06 a 12 - Mapa y combate](./03%20Clases%2006%20a%2012%20-%20Mapa%20y%20combate/) | Septiembre a octubre 2026 | **Versión final.** Arrays dentro de objetos, tarjetas con `forEach`, mapa con canvas, movimiento con botones y teclado, enemigos en el mapa, colisiones y combate contra el enemigo que chocás. |

## 💻 Cómo ejecutar

Cada carpeta es un juego independiente. Para la versión final:

```bash
cd "03 Clases 06 a 12 - Mapa y combate"
python3 -m http.server 8000
```

Después abrí `http://localhost:8000` en el navegador. El detalle de cada clase está en el README de cada carpeta.
