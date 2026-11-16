# 03 : limiter les tentatives de connexion

`POST /login` accepte autant de tentatives qu'on veut, aussi vite
qu'on veut. Un script peut essayer des milliers de mots de passe sur le
compte d'alice (force brute), ou une liste de couples e-mail et mot de
passe volés ailleurs (credential stuffing). bcrypt ralentit chaque
essai, mais ne l'empêche pas.

## Ce que vous devez obtenir

Avec le paquet `express-rate-limit`, déjà installé :

- au plus 5 tentatives sur `POST /login` par IP et par fenêtre de
  15 minutes ;
- la 6e reçoit un 429 (Too Many Requests) et le corps JSON
  `{ "error": "Trop de tentatives, réessayez plus tard" }`, même avec
  le bon mot de passe ;
- les connexions réussies comptent aussi parmi les 5 ;
- chaque réponse de `/login` porte les en-têtes standard
  `RateLimit-Policy`, `RateLimit-Limit`, `RateLimit-Remaining` et
  `RateLimit-Reset`, qui disent au client où il en est ;
- les autres routes ne sont pas limitées par ce compteur : après 6
  échecs de connexion, `GET /tasks` avec un bon jeton répond toujours
  200.

L'application est maintenant construite par une fonction,
`creerApp()`, que les tests appellent avant chacun d'eux. Lisez le
commentaire au-dessus : c'est dans cette fonction que votre limiteur
doit être créé.

## Au départ : 4 tests rouges sur 8

- `6e tentative : 429, même avec le bon mot de passe`
- `la réponse 429 est un message JSON`
- `en-têtes RateLimit-* : 5 par fenêtre de 15 min`
- `les connexions réussies comptent aussi`

Les 4 tests fonctionnels passent déjà et doivent rester verts, dont
`GET /tasks après 6 échecs de connexion : 200` : attention à ne pas
limiter toute l'application en corrigeant.

```bash
npx jest 03-rate-limit
```

Indice : regardez les options de `rateLimit` (`windowMs`, `limit`,
`message`, `standardHeaders`). Le test des en-têtes attend le format
`'draft-6'`.
