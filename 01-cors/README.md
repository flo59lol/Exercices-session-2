# 01 : n'ouvrir l'API qu'au front de l'école (CORS)

Le front de l'application est servi par Vite sur
`http://localhost:5173`. Ses scripts appellent l'API depuis le
navigateur. Le navigateur, lui, ne laisse un script lire la réponse
d'un autre site que si ce site l'autorise par l'en-tête
`Access-Control-Allow-Origin` : c'est CORS (Cross-Origin Resource
Sharing).

Aujourd'hui, `app.js` fait `app.use(cors())`. Sans option, le paquet
`cors` répond `Access-Control-Allow-Origin: *` à tout le monde :
n'importe quel site ouvert dans le navigateur d'alice peut appeler
l'API et lire ce qu'elle répond.

## Ce que vous devez obtenir

- une seule origine autorisée, `http://localhost:5173`, renvoyée telle
  quelle dans `Access-Control-Allow-Origin` ;
- une autre origine, par exemple `https://evil.example`, ne reçoit
  aucun en-tête `Access-Control-Allow-Origin` ;
- la requête préliminaire (`OPTIONS`) que le navigateur envoie avant un
  `PUT` annonce les méthodes `GET`, `POST`, `PUT` et `DELETE`, pas
  `PATCH` (l'API n'a aucune route `PATCH`), et accepte l'en-tête
  `Authorization` ;
- `Access-Control-Allow-Origin: *` n'apparaît jamais.

## Au départ : 5 tests rouges sur 7

- `origine du front : autorisée nommément`
- `origine inconnue : aucun Allow-Origin`
- `préliminaire du front : méthodes et en-têtes`
- `préliminaire inconnue : aucun Allow-Origin`
- `jamais Access-Control-Allow-Origin: *`

Les 2 tests fonctionnels passent déjà et doivent rester verts, dont
`sans Origin (curl) : 200` : une requête sans en-tête `Origin` doit
toujours recevoir sa réponse.

```bash
npx jest 01-cors
```

Indice : regardez les options de `cors()` (`origin`, `methods`,
`allowedHeaders`). Pour `origin`, une chaîne et un tableau ne se
comportent pas de la même façon : essayez les deux.
