# Guide développeur — ChatBridge

## Prérequis

- Node.js 20+
- npm 10+
- Git

## Installation

git clone <repo-url>
cd chatbridge
nvm use
npm install

## Commandes

| Commande | Description |
|---|---|
| npm run dev | Userscript en watch mode |
| npm run build | Build production |
| npm run typecheck | TypeScript strict |
| npm run lint | ESLint |
| npm run lint:fix | Auto-fix |
| npm run test | Tests unitaires |
| npm run test:watch | Tests en watch |
| npm run test:coverage | Tests + coverage |
| npm run quality | typecheck + lint + coverage |
| npm run format | Prettier |

## Structure

src/domain/          Coeur métier pur (aucune dépendance)
src/application/     Cas d'usage et ports
src/infrastructure/  Adaptateurs (DeepSeek, serializers)
src/interface/       Userscript (Panel, main)

## Ajouter une plateforme

1. Créer src/infrastructure/<platform>/<Platform>Adapter.ts
   implémentant ChatSourcePort
2. Créer <Platform>Importer.ts implémentant ImportPort
3. Ajouter la détection dans platform.ts
4. Brancher dans main.ts
5. Ajouter les tests

## Tests

Framework : Vitest.
jsdom : directive // @vitest-environment jsdom.
Coverage : v8, seuil 82%.

## Aliases TypeScript

| Alias | Chemin |
|---|---|
| @domain/* | src/domain/* |
| @application/* | src/application/* |
| @infrastructure/* | src/infrastructure/* |
| @interface/* | src/interface/* |

## Debug

### Logs ChatBridge
F12 -> Console -> filtre ChatBridge.

### Bug d'extraction
document.querySelectorAll('div.ds-message').length
Si 0, sélecteurs faux dans selectors.ts.

### Bug d'import
Filtre ChatBridge -> cherche "chunk X tentative Y".
Vérifie "fin détectée après Xs (signature: ...)".

## Publication d'une release

git tag -a v0.X.Y -m "Description"
git push origin main
git push origin v0.X.Y
# GitHub Actions build automatiquement
# Créer une release GitHub à partir du tag
# Zenodo génère un DOI automatiquement

## Licence

AGPL-3.0-or-later.
