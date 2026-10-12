const { app, request, emailUnico, registrar, cerrarDb } = require('./helpers');

afterAll(cerrarDb);

describe('registro', () => {
  test('crea la cuenta con su finca y lote iniciales', async () => {
    const { auth, productor } = await registrar('Ana');
    expect(productor.nombre).toBe('Ana');
    const fincas = await request(app).get('/api/fincas').set(auth);
    expect(fincas.body).toHaveLength(1);
    const lotes = await request(app).get('/api/lotes').set(auth);
    expect(lotes.body).toHaveLength(1);
  });

  test('rechaza campos faltantes, email inválido y contraseña corta', async () => {
    const base = { nombre: 'X', email: emailUnico(), password: 'secreta123' };
    expect((await request(app).post('/api/auth/register').send({ ...base, nombre: '' })).status).toBe(400);
    expect((await request(app).post('/api/auth/register').send({ ...base, email: 'no-es-email' })).status).toBe(400);
    expect((await request(app).post('/api/auth/register').send({ ...base, password: '123' })).status).toBe(400);
  });

  test('el email es único sin distinguir mayúsculas', async () => {
    const email = emailUnico();
    const datos = { nombre: 'X', password: 'secreta123' };
    expect((await request(app).post('/api/auth/register').send({ ...datos, email })).status).toBe(201);
    const repetido = await request(app).post('/api/auth/register').send({ ...datos, email: email.toUpperCase() });
    expect(repetido.status).toBe(409);
  });
});

describe('login', () => {
  test('devuelve token con las credenciales correctas (aunque el email venga en mayúsculas)', async () => {
    const { email } = await registrar();
    const res = await request(app).post('/api/auth/login').send({ email: email.toUpperCase(), password: 'secreta123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.productor.password_hash).toBeUndefined();
  });

  test('rechaza contraseña incorrecta y cuenta inexistente con el mismo mensaje', async () => {
    const { email } = await registrar();
    const mala = await request(app).post('/api/auth/login').send({ email, password: 'incorrecta' });
    const inexistente = await request(app).post('/api/auth/login').send({ email: emailUnico(), password: 'secreta123' });
    expect(mala.status).toBe(401);
    expect(inexistente.status).toBe(401);
    expect(mala.body.error).toBe(inexistente.body.error);
  });
});

describe('autenticación de las rutas', () => {
  test('sin token o con token inválido responde 401', async () => {
    expect((await request(app).get('/api/resumen')).status).toBe(401);
    expect((await request(app).get('/api/resumen').set('Authorization', 'Bearer cualquier-cosa')).status).toBe(401);
  });
});

describe('recuperación de contraseña', () => {
  test('forgot-password responde igual exista o no la cuenta', async () => {
    const { email } = await registrar();
    const existe = await request(app).post('/api/auth/forgot-password').send({ email });
    const noExiste = await request(app).post('/api/auth/forgot-password').send({ email: emailUnico() });
    expect(existe.status).toBe(200);
    expect(noExiste.body).toEqual(existe.body);
  });

  test('reset-password rechaza un token inventado', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({ token: 'inventado', password: 'nueva123' });
    expect(res.status).toBe(400);
  });
});

describe('límite de intentos de login', () => {
  beforeAll(() => { process.env.RATE_LIMIT_EN_TEST = '1'; });
  afterAll(() => { delete process.env.RATE_LIMIT_EN_TEST; });

  test('después de 10 intentos desde la misma IP responde 429', async () => {
    const email = emailUnico();
    let ultimo;
    for (let i = 0; i < 11; i++) {
      ultimo = await request(app).post('/api/auth/login').send({ email, password: 'incorrecta' });
    }
    expect(ultimo.status).toBe(429);
  });
});
