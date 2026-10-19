const fs = require('fs');
const path = require('path');
const { app, request, cerrarDb } = require('./helpers');
const openapi = require('../src/docs/openapi');

afterAll(cerrarDb);

// Lee de app.js qué router se monta en cada prefijo y de cada router sus rutas: así una ruta
// nueva sin documentar hace fallar este test en vez de quedar fuera de Swagger.
function rutasDeLaApp() {
  const src = path.join(__dirname, '..', 'src');
  const appJs = fs.readFileSync(path.join(src, 'app.js'), 'utf8');
  const montajes = [...appJs.matchAll(/app\.use\('\/api(\/[\w-]+)'.*require\('\.\/routes\/([\w.]+)'\)/g)];
  const rutas = [];
  for (const [, prefijo, archivo] of montajes) {
    const router = fs.readFileSync(path.join(src, 'routes', `${archivo}.js`), 'utf8');
    for (const [, metodo, ruta] of router.matchAll(/router\.(get|post|put|patch|delete)\(\s*'([^']*)'/g)) {
      const completa = (prefijo + ruta).replace(/\/$/, '').replace(/:(\w+)/g, '{$1}');
      rutas.push(`${metodo} ${completa}`);
    }
  }
  return rutas;
}

describe('Documentación de la API (Swagger)', () => {
  test('GET /api/docs/openapi.json devuelve la especificación', async () => {
    const res = await request(app).get('/api/docs/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toMatch(/^3\./);
    expect(res.body.info.title).toBe('AgroTech API');
  });

  test('GET /api/docs/ sirve Swagger UI sin pedir token', async () => {
    const res = await request(app).get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  test('todas las rutas de la API están documentadas, y nada más', () => {
    const rutas = rutasDeLaApp();
    const documentadas = Object.entries(openapi.paths).flatMap(([ruta, metodos]) =>
      Object.keys(metodos).map(metodo => `${metodo} ${ruta}`)
    );
    expect(rutas.length).toBeGreaterThan(40);
    expect(documentadas.sort()).toEqual(rutas.sort());
  });
});
