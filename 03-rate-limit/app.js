// Exercice 03 : limiter les tentatives de connexion
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');

// Clé de signature des jetons. En dur pour l'instant :
// la session 4 la sortira du code (variable d'environnement).
const JWT_SECRET = 'cle-de-dev-ilaria-a-ne-pas-garder';

// Les seules origines dont le navigateur peut lire nos réponses.
// Un tableau, et non une chaîne : cors compare alors l'origine reçue
// et n'envoie Access-Control-Allow-Origin que si elle est dans la
// liste.
const ORIGINES_AUTORISEES = ['http://localhost:5173'];

// Comptes pré-enregistrés (password contient le hash bcrypt)
const users = [
  {
    id: 1,
    email: 'alice@ilaria.test',
    role: 'user',
    // mot de passe : alice123
    password:
      '$2b$10$geEr9Zc64xkKj1wxt/.FMu5rpcLHsElh48JvjYn.O8e4mxBo3r2hm',
  },
  {
    id: 2,
    email: 'bob@ilaria.test',
    role: 'user',
    // mot de passe : bob123
    password:
      '$2b$10$qCP71I9K9mxSa/g.7XhZ1uc5gZFDesJfnQhIPj22Asv7RxnDpCESa',
  },
  {
    id: 3,
    email: 'admin@ilaria.test',
    role: 'admin',
    // mot de passe : admin123
    password:
      '$2b$10$XXXs/Zn9D/o6MXf8LJQmGuJ1MNYngoPfNzP.vkD3.kktznBcKpr3.',
  },
];

const tasks = [
  { id: 1, ownerId: 1, title: 'Réviser le hachage' },
  { id: 2, ownerId: 1, title: 'Lire la RFC 7519' },
  { id: 3, ownerId: 2, title: 'Écrire les tests' },
  { id: 4, ownerId: 3, title: 'Préparer la démo' },
];

// Vérifie le jeton et range l'utilisateur dans req.user
function authentifier(req, res, next) {
  const entete = req.headers.authorization || '';
  const [type, token] = entete.split(' ');
  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Jeton manquant' });
  }
  try {
    // verify contrôle signature et expiration ;
    // algorithms refuse tout autre algorithme que HS256
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    req.user = { id: Number(payload.sub), role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'Jeton invalide' });
  }
}

// Fabrique un middleware qui exige un rôle précis.
// À placer après authentifier, qui remplit req.user.
function exigerRole(role) {
  return (req, res, next) => {
    if (req.user.role !== role) {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    next();
  };
}

// Cherche la tâche parmi celles que req.user a le droit de voir :
// les siennes, ou toutes s'il est admin
function trouverTache(req) {
  const id = Number(req.params.id);
  return tasks.find(
    (t) =>
      t.id === id &&
      (t.ownerId === req.user.id || req.user.role === 'admin')
  );
}

// Fabrique une application neuve à chaque appel, plutôt qu'une
// instance unique. Les tests appellent creerApp() avant chacun d'eux :
// tout ce qui garde un état en mémoire (un compteur de tentatives,
// par exemple) repart ainsi de zéro, et un test ne déborde pas sur
// le suivant.
function creerApp() {
  const app = express();
  const limiteurConnexion = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // 5 tentatives
    standardHeaders: true, // Renvoie les en-têtes RateLimit-* (définit des codes HTTP supplémentaires)
    legacyHeaders: false, // Désactive les en-têtes X-RateLimit-* (obsolètes)
    handler: (req, res) => {
      res.status(429).json({ // Too Many Requests
        error: 'Trop de tentatives, réessayez plus tard',
      });
    },
  });

  // En premier : les en-têtes de sécurité partent ainsi sur toutes
  // les réponses, erreurs 401 et 404 comprises. Les réglages par
  // défaut de Helmet suffisent ici.
  app.use(helmet());

  // Le front (Vite) tourne sur http://localhost:5173 et appelle
  // cette API depuis le navigateur.
  app.use(
    cors({
      origin: ORIGINES_AUTORISEES,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json());

  app.post(
    '/login',
    limiteurConnexion, // Limite les tentatives de connexion
    async (req, res) => {
      const { email, password } = req.body || {};
      const user = users.find((u) => u.email === email);
      const ok =
        user && (await bcrypt.compare(password, user.password));
      if (!ok) {
        return res
          .status(401)
          .json({ error: 'Identifiants invalides' });
      }
      // sub est une chaîne dans la norme JWT
      const token = jwt.sign(
        { sub: String(user.id), role: user.role },
        JWT_SECRET,
        { algorithm: 'HS256', expiresIn: '15m' }
      );
      res.json({ token });
    }
  );

  app.get('/tasks', authentifier, (req, res) => {
    res.json(tasks.filter((t) => t.ownerId === req.user.id));
  });

  // Réservé à l'admin : la liste des comptes, sans les hash
  app.get(
    '/admin/users',
    authentifier,
    exigerRole('admin'),
    (req, res) => {
      // On choisit les champs à renvoyer, plutôt que d'en retirer
      const liste = users.map((u) => ({
        id: u.id,
        email: u.email,
        role: u.role,
      }));
      res.json(liste);
    }
  );

  // Réservé à l'admin : supprimer une tâche
  app.delete(
    '/tasks/:id',
    authentifier,
    exigerRole('admin'),
    (req, res) => {
      const id = Number(req.params.id);
      const index = tasks.findIndex((t) => t.id === id);
      if (index === -1) {
        return res.status(404).json({ error: 'Tâche introuvable' });
      }
      tasks.splice(index, 1);
      res.status(204).end();
    }
  );

  app.get('/tasks/:id', authentifier, (req, res) => {
    const task = trouverTache(req);
    // 404 aussi pour la tâche d'un autre : on ne dit pas
    // qu'elle existe
    if (!task) {
      return res.status(404).json({ error: 'Tâche introuvable' });
    }
    res.json(task);
  });

  app.put('/tasks/:id', authentifier, (req, res) => {
    const task = trouverTache(req);
    if (!task) {
      return res.status(404).json({ error: 'Tâche introuvable' });
    }
    const { title } = req.body || {};
    if (typeof title !== 'string' || title === '') {
      return res.status(400).json({ error: 'Titre requis' });
    }
    task.title = title;
    res.json(task);
  });

  return app;
}

module.exports = { creerApp, users, tasks, JWT_SECRET };
