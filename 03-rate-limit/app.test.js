const request = require('supertest');
const jwt = require('jsonwebtoken');
const { creerApp, JWT_SECRET } = require('./app');

// Fabrique un jeton valide, sans passer par /login
function jeton(id, role) {
  return jwt.sign({ sub: String(id), role }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '15m',
  });
}
const alice = `Bearer ${jeton(1, 'user')}`;

// Une application neuve par test : son compteur part de zéro
let app;
beforeEach(() => {
  app = creerApp();
});

function connexion(password) {
  return request(app)
    .post('/login')
    .send({ email: 'alice@ilaria.test', password });
}

// n tentatives à la suite, avec un mauvais mot de passe
async function echecs(n) {
  for (let i = 0; i < n; i++) {
    await connexion('faux');
  }
}

describe('Fonctionnel', () => {
  test('connexion avec les bons identifiants : 200', async () => {
    const res = await connexion('alice123');
    expect(res.status).toBe(200);
  });

  test('mauvais mot de passe : 401', async () => {
    const res = await connexion('faux');
    expect(res.status).toBe(401);
  });

  test('5 échecs de suite : toujours 401', async () => {
    await echecs(4);
    const res = await connexion('faux');
    expect(res.status).toBe(401);
  });

  // Le compteur du login ne doit pas bloquer le reste de l'API
  test('GET /tasks après 6 échecs de connexion : 200', async () => {
    await echecs(6);
    const res = await request(app)
      .get('/tasks')
      .set('Authorization', alice);
    expect(res.status).toBe(200);
  });
});

describe('Sécurité : limite des tentatives', () => {
  test(
    '6e tentative : 429, même avec le bon mot de passe',
    async () => {
      await echecs(5);
      const res = await connexion('alice123');
      expect(res.status).toBe(429);
    }
  );

  test('la réponse 429 est un message JSON', async () => {
    await echecs(5);
    const res = await connexion('faux');
    expect(res.status).toBe(429);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toEqual({
      error: 'Trop de tentatives, réessayez plus tard',
    });
  });

  test('en-têtes RateLimit-* : 5 par fenêtre de 15 min', async () => {
    const res = await connexion('faux');
    expect(res.headers['ratelimit-limit']).toBe('5');
    expect(res.headers['ratelimit-remaining']).toBe('4');
    expect(Number(res.headers['ratelimit-reset'])).toBeLessThanOrEqual(
      900
    );
    // w=900 : la fenêtre dure 900 secondes
    expect(res.headers['ratelimit-policy']).toBe('5;w=900');
  });

  // Une connexion réussie consomme aussi une tentative
  test('les connexions réussies comptent aussi', async () => {
    for (let i = 0; i < 5; i++) {
      await connexion('alice123');
    }
    const res = await connexion('alice123');
    expect(res.status).toBe(429);
  });
});
