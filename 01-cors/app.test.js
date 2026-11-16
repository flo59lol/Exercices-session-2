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

const FRONT = 'http://localhost:5173';
const PIRATE = 'https://evil.example';

// La requête préliminaire (preflight) qu'envoie le navigateur avant
// un PUT avec un en-tête Authorization
function preliminaire(origine) {
  return request(app)
    .options('/tasks/1')
    .set('Origin', origine)
    .set('Access-Control-Request-Method', 'PUT')
    .set(
      'Access-Control-Request-Headers',
      'authorization,content-type'
    );
}

describe('Fonctionnel', () => {
  test('connexion avec les bons identifiants : 200', async () => {
    const res = await request(app)
      .post('/login')
      .send({ email: 'alice@ilaria.test', password: 'alice123' });
    expect(res.status).toBe(200);
  });

  // Sans en-tête Origin, comme curl ou Postman : CORS ne s'applique
  // pas, le serveur répond normalement
  test('sans Origin (curl) : 200', async () => {
    const res = await request(app)
      .get('/tasks')
      .set('Authorization', alice);
    expect(res.status).toBe(200);
  });
});

describe('Sécurité : CORS', () => {
  test('origine du front : autorisée nommément', async () => {
    const res = await request(app)
      .get('/tasks')
      .set('Origin', FRONT)
      .set('Authorization', alice);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBe(FRONT);
  });

  // Le serveur répond quand même : c'est le navigateur qui, sans
  // l'en-tête, refuse de donner la réponse au script du site pirate
  test('origine inconnue : aucun Allow-Origin', async () => {
    const res = await request(app)
      .get('/tasks')
      .set('Origin', PIRATE)
      .set('Authorization', alice);
    expect(res.status).toBe(200);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('préliminaire du front : méthodes et en-têtes', async () => {
    const res = await preliminaire(FRONT);
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe(FRONT);
    const methodes = res.headers['access-control-allow-methods']
      .split(',')
      .map((m) => m.trim());
    expect(methodes).toEqual(
      expect.arrayContaining(['GET', 'POST', 'PUT', 'DELETE'])
    );
    // L'API n'a aucune route PATCH : on ne l'annonce pas
    expect(methodes).not.toContain('PATCH');
    const entetes = res.headers['access-control-allow-headers'];
    expect(entetes.toLowerCase()).toContain('authorization');
  });

  test('préliminaire inconnue : aucun Allow-Origin', async () => {
    const res = await preliminaire(PIRATE);
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  test('jamais Access-Control-Allow-Origin: *', async () => {
    const reponses = [
      await request(app).get('/tasks').set('Authorization', alice),
      await request(app).get('/tasks').set('Origin', FRONT),
      await request(app).get('/tasks').set('Origin', PIRATE),
      await request(app)
        .post('/login')
        .set('Origin', PIRATE)
        .send({ email: 'alice@ilaria.test', password: 'alice123' }),
      await preliminaire(FRONT),
      await preliminaire(PIRATE),
    ];
    for (const res of reponses) {
      expect(res.headers['access-control-allow-origin']).not.toBe('*');
    }
  });
});
