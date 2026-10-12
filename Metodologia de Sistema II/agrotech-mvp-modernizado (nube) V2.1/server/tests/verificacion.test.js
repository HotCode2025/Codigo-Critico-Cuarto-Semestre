const { app, request, emailUnico, registrar, cerrarDb } = require('./helpers');
const db = require('../src/db');

const HOOK_SISTEMA = 'http://n8n.test/sistema';

let llamadas;
const fetchOriginal = global.fetch;

beforeAll(() => {
  process.env.N8N_SYSTEM_WEBHOOK_URL = HOOK_SISTEMA;
  process.env.FRONTEND_URL = 'https://app.test';
});
beforeEach(() => {
  llamadas = [];
  // Se interceptan solo los webhooks de N8N de los tests; el resto del tráfico no se usa.
  global.fetch = jest.fn(async (url, opciones) => {
    llamadas.push({ url, cuerpo: opciones?.body ? JSON.parse(opciones.body) : null });
    return { ok: true, status: 200 };
  });
});
afterAll(async () => {
  global.fetch = fetchOriginal;
  delete process.env.N8N_SYSTEM_WEBHOOK_URL;
  delete process.env.FRONTEND_URL;
  await cerrarDb();
});

const esperarLlamadas = () => new Promise(r => setTimeout(r, 150));
const tokenDe = (llamada) => new URL(llamada.cuerpo.datos.verificarUrl).searchParams.get('token');
const verificar = (token) => request(app).post('/api/auth/verificar-email').send({ token });
const login = (email) => request(app).post('/api/auth/login').send({ email, password: 'secreta123' });

async function registrarYObtenerToken() {
  const u = await registrar();
  await esperarLlamadas();
  const envio = llamadas.find(l => l.url === HOOK_SISTEMA && l.cuerpo.evento === 'verificar_email');
  return { u, envio, token: envio && tokenDe(envio) };
}

describe('registro y verificación del email', () => {
  test('la cuenta nueva queda sin verificar y se manda un email con el link', async () => {
    const { u, envio } = await registrarYObtenerToken();
    expect(u.productor.emailVerificado).toBe(false);
    expect(envio.cuerpo.datos.email).toBe(u.email);
    expect(envio.cuerpo.datos.verificarUrl).toMatch(/^https:\/\/app\.test\/verificar-email\.html\?token=[0-9a-f]{64}$/);
    expect((await login(u.email)).body.productor.emailVerificado).toBe(false);
  });

  test('si N8N no responde, el registro igual funciona', async () => {
    global.fetch = jest.fn(async () => { throw new Error('N8N caído'); });
    const u = await registrar();
    expect(u.token).toEqual(expect.any(String));
  });

  test('con el token del link la cuenta queda verificada, y usarlo dos veces no da error', async () => {
    const { u, token } = await registrarYObtenerToken();
    expect((await verificar(token)).status).toBe(200);
    expect((await login(u.email)).body.productor.emailVerificado).toBe(true);
    expect((await verificar(token)).status).toBe(200);
  });

  test('un token inventado, vencido o que no es texto responde 400', async () => {
    const { u, token } = await registrarYObtenerToken();
    expect((await verificar('inventado')).status).toBe(400);
    expect((await verificar(12345)).status).toBe(400);
    expect((await request(app).post('/api/auth/verificar-email').send({})).status).toBe(400);
    await db.query("UPDATE productores SET verificacion_token_expira = now() - interval '1 minute' WHERE id = $1", [u.productor.id]);
    expect((await verificar(token)).status).toBe(400);
    expect((await login(u.email)).body.productor.emailVerificado).toBe(false);
  });

  test('el token no se guarda en claro en la base', async () => {
    const { u, token } = await registrarYObtenerToken();
    const { rows } = await db.query('SELECT verificacion_token_hash FROM productores WHERE id = $1', [u.productor.id]);
    expect(rows[0].verificacion_token_hash).not.toBe(token);
    expect(rows[0].verificacion_token_hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('reenviar la verificación', () => {
  test('manda un email nuevo y el token anterior deja de servir', async () => {
    const { u, token: viejo } = await registrarYObtenerToken();
    llamadas.length = 0;
    const res = await request(app).post('/api/auth/reenviar-verificacion').set(u.auth);
    expect(res.status).toBe(200);
    const nuevo = tokenDe(llamadas.find(l => l.cuerpo?.evento === 'verificar_email'));
    expect(nuevo).not.toBe(viejo);
    expect((await verificar(viejo)).status).toBe(400);
    expect((await verificar(nuevo)).status).toBe(200);
  });

  test('si ya está verificada no manda nada, y exige estar autenticado', async () => {
    const { u, token } = await registrarYObtenerToken();
    await verificar(token);
    llamadas.length = 0;
    const res = await request(app).post('/api/auth/reenviar-verificacion').set(u.auth);
    expect(res.body.yaVerificado).toBe(true);
    expect(llamadas).toHaveLength(0);
    expect((await request(app).post('/api/auth/reenviar-verificacion')).status).toBe(401);
  });

  test('GET /perfil informa si el email está confirmado', async () => {
    const { u, token } = await registrarYObtenerToken();
    expect((await request(app).get('/api/auth/perfil').set(u.auth)).body.emailVerificado).toBe(false);
    await verificar(token);
    expect((await request(app).get('/api/auth/perfil').set(u.auth)).body.emailVerificado).toBe(true);
    expect((await request(app).get('/api/auth/perfil')).status).toBe(401);
  });

  test('actualizar el teléfono no pierde el dato de verificación', async () => {
    const u = await registrar();
    const res = await request(app).put('/api/auth/perfil').set(u.auth).send({ telefono: '2614000000' });
    expect(res.body.emailVerificado).toBe(false);
  });

  test('recuperar la contraseña por email también deja la cuenta verificada', async () => {
    const u = await registrar();
    await esperarLlamadas();
    llamadas.length = 0;
    await request(app).post('/api/auth/forgot-password').send({ email: u.email });
    await esperarLlamadas();
    const envio = llamadas.find(l => l.cuerpo?.evento === 'recuperar_password');
    const token = new URL(envio.cuerpo.datos.resetUrl).searchParams.get('token');
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'otra-clave-789' })).status).toBe(200);
    const res = await request(app).post('/api/auth/login').send({ email: u.email, password: 'otra-clave-789' });
    expect(res.body.productor.emailVerificado).toBe(true);
  });
});

describe('sin email verificado no se mandan avisos', () => {
  const HOOK = (n) => `http://n8n.test/usuario-${n}`;

  async function conWebhook(hook, zona) {
    const u = await registrar();
    await request(app).put('/api/auth/perfil').set(u.auth).send({ telefono: '2614000000' });
    await db.query('UPDATE productores SET zona = $1 WHERE id = $2', [zona, u.productor.id]);
    await request(app).put('/api/config/n8n').set(u.auth).send({ webhookUrl: hook, habilitado: true });
    return u;
  }
  const verificarYa = (u) => db.query('UPDATE productores SET email_verificado = true WHERE id = $1', [u.productor.id]);
  const llamadasA = (hook) => llamadas.filter(l => l.url === hook);

  test('una cuenta sin verificar no dispara el webhook, y al verificarla sí', async () => {
    const hook = HOOK(`gasto-${Date.now()}`);
    const u = await conWebhook(hook, 'Zona Gasto');
    const nuevoGasto = () => request(app).post('/api/gastos').set(u.auth).send({ loteId: u.loteId, concepto: 'x', monto: 10, estado: 'pagado' });

    await nuevoGasto(); await esperarLlamadas();
    expect(llamadasA(hook)).toHaveLength(0);

    await verificarYa(u);
    await nuevoGasto(); await esperarLlamadas();
    expect(llamadasA(hook).length).toBeGreaterThan(0);
  });

  test('las alertas de la red solo avisan a vecinos con el email verificado', async () => {
    const zona = `Zona ${Date.now()}`;
    const sinVerificar = HOOK(`sin-${Date.now()}`);
    const verificado = HOOK(`ok-${Date.now()}`);
    const autor = await conWebhook(HOOK(`autor-${Date.now()}`), zona);
    const vecinoSin = await conWebhook(sinVerificar, zona);
    const vecinoOk = await conWebhook(verificado, zona);
    await verificarYa(autor); await verificarYa(vecinoOk);

    await request(app).post('/api/red/alertas').set(autor.auth).send({ tipo: 'plaga', zona, descripcion: 'Oídio' });
    await esperarLlamadas();
    expect(llamadasA(verificado).length).toBeGreaterThan(0);
    expect(llamadasA(sinVerificar)).toHaveLength(0);
    expect(vecinoSin.productor.id).toBeDefined();
  });
});
