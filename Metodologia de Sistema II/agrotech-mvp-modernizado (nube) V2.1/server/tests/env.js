// Variables de entorno para los tests (se cargan antes de requerir la app).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'secreto-solo-para-tests';
delete process.env.N8N_DEFAULT_WEBHOOK_URL;
