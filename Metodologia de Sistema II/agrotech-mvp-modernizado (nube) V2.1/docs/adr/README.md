# Registro de decisiones de arquitectura (ADR)

Cada ADR anota una decisión importante del proyecto: qué se decidió, por qué y qué consecuencias
trae. Sirve para que alguien que llega después (o el equipo dentro de seis meses) entienda por qué
el sistema es como es, sin tener que adivinarlo.

| N.º | Decisión | Estado |
|-----|----------|--------|
| [0001](0001-postgresql.md) | PostgreSQL como base de datos | Aceptada |
| [0002](0002-vite-y-no-react.md) | Modernizar el frontend con Vite y no reescribirlo en React | Aceptada |
| [0003](0003-remito-preimpreso-y-autoimpresor.md) | Remito R: talonario preimpreso primero, autoimpresor después | Aceptada |
| [0004](0004-envios-sin-borrar-y-bloqueados-tras-el-dtv.md) | Los envíos no se borran y se bloquean al registrar el DTV-e | Propuesta |

## Cómo agregar uno

1. Copiá el formato de cualquiera de los existentes con el número siguiente (`0004-titulo-corto.md`).
2. Completá **Contexto**, **Decisión** y **Consecuencias**. Que sea corto: una página alcanza.
3. Sumalo a la tabla de arriba y subilo en el mismo PR que el cambio que explica.

Un ADR no se borra ni se reescribe. Si una decisión cambia, se escribe uno nuevo y el viejo pasa a
estado **Reemplazada por 000N**.
