# Sécurité applicative avancée : session 2

Trois exercices sur l'API de tâches de la session 1, écrite avec
Express et gardée en mémoire, avec alice, bob et admin, et
l'authentification par jeton JWT déjà en place. Cette fois, on durcit
ce qui entoure les routes : qui a le droit d'appeler l'API depuis un
navigateur (CORS), quels en-têtes de sécurité partent avec chaque
réponse (Helmet), combien de tentatives de connexion on accepte
(limitation de débit). Chaque exercice repart d'une application où les
failles de l'exercice précédent sont déjà corrigées.

## Installer

Il vous faut Node 18 ou plus récent. Dans ce dossier :

```bash
npm install
```

`npm audit` signale une alerte sur `deepmerge`, une dépendance de Jest :
elle ne concerne que l'outil de test, pas l'application. Ne lancez pas
`npm audit fix --force`, qui rétrograderait Jest.

## Lancer un exercice

```bash
npx jest 01-cors
npx jest 02-entetes
npx jest 03-rate-limit
```

`npm test` lance les trois d'un coup.

## Le principe

Chaque dossier contient deux fichiers de code :

- `app.js` : l'application, volontairement vulnérable ou incomplète ;
- `app.test.js` : ses tests, déjà écrits.

Au départ, les tests fonctionnels passent et les tests de sécurité
échouent : ils sont rouges. Votre travail est de modifier `app.js`, et
seulement `app.js`, jusqu'à ce que tous les tests passent au vert. Ne
touchez pas aux tests : ils sont le cahier des charges.

Le `README.md` de chaque exercice dit ce qui est attendu et quels tests
échouent au départ. Lisez le message d'erreur de chaque test rouge : il
dit ce que l'application renvoie et ce qui était attendu.

| Exercice | Tests | Rouges au départ |
|---|---|---|
| `01-cors` | 7 | 5 |
| `02-entetes` | 9 | 7 |
| `03-rate-limit` | 8 | 4 |
