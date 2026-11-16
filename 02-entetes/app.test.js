const request = require('supertest');
const jwt = require('jsonwebtoken');
const { app, JWT_SECRET } = require('./app');

// Fabrique un jeton valide, sans passer par /login
function jeton(id, role) {
  return jwt.sign({ sub: String(id), role }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '15m',
  });
}
const alice = `Bearer ${jeton(1, 'user')}`;

// Les en-têtes d'une réponse ordinaire de l'API
async function entetes() {
  const res = await request(app)
    .get('/tasks')
    .set('Authorization', alice);
  return res.headers;
}

describe('Fonctionnel', () => {
  test('connexion avec les bons identifiants : 200', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'alice@ilaria.test', password: 'alice123' });
    expect(res.status).toBe(200);
  });

  test('GET /tasks avec un bon jeton : 200', async () => {
    const res = await request(app)
      .get('/tasks')
      .set('Authorization', alice);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });
});

describe('Sécurité : en-têtes de réponse', () => {
  // Inutile de dire à un attaquant quel framework on utilise
  test('X-Powered-By absent', async () => {
    const h = await entetes();
    expect(h['x-powered-by']).toBeUndefined();
  });

  test('X-Content-Type-Options: nosniff', async () => {
    const h = await entetes();
    expect(h['x-content-type-options']).toBe('nosniff');
  });

  test('Strict-Transport-Security avec un max-age', async () => {
    const h = await entetes();
    const hsts = h['strict-transport-security'] || '';
    const trouve = hsts.match(/max-age=(\d+)/);
    expect(trouve).not.toBeNull();
    expect(Number(trouve[1])).toBeGreaterThan(0);
  });

  test("Content-Security-Policy avec default-src 'self'", async () => {
    const h = await entetes();
    const csp = h['content-security-policy'] || '';
    expect(csp).toContain("default-src 'self'");
  });

  // L'un ou l'autre suffit : X-Frame-Options pour les anciens
  // navigateurs, frame-ancestors (dans la CSP) pour les récents
  test('intégration en iframe refusée aux autres sites', async () => {
    const h = await entetes();
    const xfo = (h['x-frame-options'] || '').toUpperCase();
    const csp = h['content-security-policy'] || '';
    const parXfo = ['DENY', 'SAMEORIGIN'].includes(xfo);
    const parCsp = /frame-ancestors '(none|self)'/.test(csp);
    expect(parXfo || parCsp).toBe(true);
  });

  test('Referrer-Policy présent', async () => {
    const h = await entetes();
    expect(h['referrer-policy']).toBeDefined();
  });

  // Les en-têtes partent aussi sur les erreurs
  test('les en-têtes sont aussi sur une réponse 401', async () => {
    const res = await request(app).get('/tasks');
    expect(res.status).toBe(401);
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toBeDefined();
  });
});
