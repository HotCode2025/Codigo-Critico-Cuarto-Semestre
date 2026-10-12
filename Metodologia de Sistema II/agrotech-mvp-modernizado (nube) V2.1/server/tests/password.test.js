const { app, request, registrar, cerrarDb } = require('./helpers');
const db = require('../src/db');

afterAll(cerrarDb);

const cambiar = (u, cuerpo) => request(app).put('/api/auth/password').set(u.auth).send(cuerpo);
const login = (email, password) => request(app).post('/api/auth/login').send({ email, password });

describe('cambiar contraseña', () => {
  test('con la actual correcta: entra con la nueva y deja de funcionar la vieja', async () => {
    const u = await registrar();
    expect((await cambiar(u, { passwordActual: 'secreta123', passwordNueva: 'nueva-clave-456' })).status).toBe(200);
    expect((await login(u.email, 'nueva-clave-456')).status).toBe(200);
    expect((await login(u.email, 'secreta123')).status).toBe(401);
  });

  test('con una actual incorrecta responde 403 y no cambia nada', async () => {
    const u = await registrar();
    expect((await cambiar(u, { passwordActual: 'incorrecta', passwordNueva: 'nueva-clave-456' })).status).toBe(403);
    expect((await login(u.email, 'secreta123')).status).toBe(200);
  });

  test('rechaza campos faltantes, nueva corta, muy larga, igual a la actual o que no es texto', async () => {
    const u = await registrar();
    expect((await cambiar(u, { passwordActual: 'secreta123' })).status).toBe(400);
    expect((await cambiar(u, { passwordActual: 'secreta123', passwordNueva: '123' })).status).toBe(400);
    expect((await cambiar(u, { passwordActual: 'secreta123', passwordNueva: 'x'.repeat(73) })).status).toBe(400);
    expect((await cambiar(u, { passwordActual: 'secreta123', passwordNueva: 'secreta123' })).status).toBe(400);
    expect((await cambiar(u, { passwordActual: 'secreta123', passwordNueva: 12345678 })).status).toBe(400);
    expect((await login(u.email, 'secreta123')).status).toBe(200);
  });

  test('exige estar autenticado', async () => {
    const res = await request(app).put('/api/auth/password').send({ passwordActual: 'a', passwordNueva: 'bbbbbbb' });
    expect(res.status).toBe(401);
  });

  test('descarta los links de recuperación pendientes y queda en el historial', async () => {
    const u = await registrar();
    await request(app).post('/api/auth/forgot-password').send({ email: u.email });
    const antes = await db.query('SELECT reset_token_hash FROM productores WHERE id = $1', [u.productor.id]);
    expect(antes.rows[0].reset_token_hash).not.toBeNull();

    await cambiar(u, { passwordActual: 'secreta123', passwordNueva: 'nueva-clave-456' });
    const despues = await db.query('SELECT reset_token_hash FROM productores WHERE id = $1', [u.productor.id]);
    expect(despues.rows[0].reset_token_hash).toBeNull();

    const tipos = (await request(app).get('/api/historial').set(u.auth)).body.map(h => h.tipo);
    expect(tipos).toContain('password_cambiada');
  });

  test('no afecta la contraseña de otro productor', async () => {
    const a = await registrar();
    const b = await registrar();
    await cambiar(a, { passwordActual: 'secreta123', passwordNueva: 'nueva-clave-456' });
    expect((await login(b.email, 'secreta123')).status).toBe(200);
  });
});
