# 02 : les en-têtes de sécurité (Helmet)

CORS est réglé : seul le front de `http://localhost:5173` lit les
réponses de l'API. Mais chaque réponse part sans aucun en-tête de
sécurité, et annonce `X-Powered-By: Express` : un attaquant sait tout
de suite quel framework il a en face de lui.

Le navigateur sait se protéger tout seul contre plusieurs attaques, à
condition que le serveur le lui demande, par des en-têtes. Le paquet
`helmet` les pose en une ligne.

## Ce que vous devez obtenir

Sur chaque réponse de l'API, erreurs comprises :

- pas d'en-tête `X-Powered-By` ;
- `X-Content-Type-Options: nosniff` : le navigateur ne devine pas le
  type d'un fichier, il croit le `Content-Type` ;
- `Strict-Transport-Security` avec un `max-age` : le navigateur ne
  parle plus à l'API qu'en HTTPS, pendant cette durée ;
- `Content-Security-Policy` qui contient `default-src 'self'` : par
  défaut, une page ne charge que des ressources de son propre site ;
- `X-Frame-Options` (`DENY` ou `SAMEORIGIN`), ou `frame-ancestors` dans
  la CSP : un autre site ne peut pas afficher l'API dans une iframe ;
- un en-tête `Referrer-Policy`.

## Au départ : 7 tests rouges sur 9

- `X-Powered-By absent`
- `X-Content-Type-Options: nosniff`
- `Strict-Transport-Security avec un max-age`
- `Content-Security-Policy avec default-src 'self'`
- `intégration en iframe refusée aux autres sites`
- `Referrer-Policy présent`
- `les en-têtes sont aussi sur une réponse 401`

Les 2 tests fonctionnels passent déjà et doivent rester verts.

```bash
npx jest 02-entetes
```

Indice : `helmet` est déjà installé. Demandez-vous où placer
`app.use(...)` pour que les en-têtes partent aussi sur une erreur 401.
