# ChatBridge

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.23067074.svg)](https://doi.org/10.5281/zenodo.23067074)
[![CI](https://github.com/slaz851945/chatbridge/actions/workflows/ci.yml/badge.svg)](https://github.com/slaz851945/chatbridge/actions/workflows/ci.yml)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

> Pont portable entre sessions LLM. Export/import intégral de longs chats (DeepSeek, ChatGPT), **100 % local**.

## Statut

**v0.1.0** — premier release fonctionnel. Export et import opérationnels sur DeepSeek.

## Fonctionnalités

### Export
- Extraction intégrale d'un chat DeepSeek (scroll virtualisé, thinking inclus).
- Format canonique : `chat.json` (source de vérité) + `chat.md` (lisible) + `manifest.json`.
- Archive `.zip` téléchargeable en un clic.
- Hash SHA-256 pour vérification d'intégrité.
- Traitement 100 % local, fonctionne hors ligne une fois exporté.

### Import
- Lecture d'un `.zip` ou `.json` ChatBridge.
- Segmentation automatique en chunks (~12 000 chars, ou mode compact à 800 chars pour les longs chats).
- Envoi séquentiel avec attente de la réponse de l'assistant entre chaque chunk.
- Pacing anti rate-limit (pauses progressives).
- Détection de fin robuste (indépendante du DOM virtualisé).

## Installation


### Développeur

```bash
nvm use
npm install
npm run quality
npm run dev     # userscript en watch mode

```
---

Utilisateur
Installer Tampermonkey.

Builder le userscript : npm run build.

Ouvrir dist/chatbridge.user.js dans Tampermonkey (Dashboard → + → coller → Ctrl+S).

Ouvrir chat.deepseek.com — le panneau ChatBridge apparaît en bas à droite.

Utilisation
Export
Ouvre le chat à exporter.

Clique « Exporter ce chat ».

Le .zip se télécharge automatiquement.

Import
Ouvre un chat vide dans DeepSeek.

Coche « Mode compact » si le chat dépasse ~120 chunks.

Clique « Importer un chat » → sélectionne le .zip ChatBridge.

Laisse tourner (5-15 min selon la taille).

Architecture
Clean Architecture à 4 couches :

domain/ — modèles purs, hashing, formats (aucune dépendance).

application/ — cas d'usage, ports, chunking, orchestrateurs.

infrastructure/ — adaptateurs DeepSeek, sérialiseurs, intercepteur API.

interface/ — userscript (Panel Shadow DOM, download, bootstrap).

Cadre de travail
Voir docs/00_WORKING_AGREEMENT.md. Cycle en 7 phases, DoR/DoD stricts, 0 mypy/ruff, coverage ≥ 82 %.

Licence
AGPL-3.0-or-later.

## 🎯 Récapitulatif du parcours

C'est le moment de mesurer le chemin parcouru :

| Étape | Message clé |
|---|---|
| Point de départ | « Comment importer le chat VeritasDrift en entier ? » |
| Premier export | 0 messages (sélecteurs faux) |
| Après ajustements | 61 messages |
| Après virtualisation | 285 messages (export complet) |
| Premier import | Bloqué au chunk 10 |
| Après fix détection | **32/32 chunks, aucune intervention** |

---

## 📋 Ta prochaine réponse

Une seule chose : confirme-moi que :

1. Le `git commit` + `git tag` se sont bien passés (donne-moi la sortie).
2. Le fichier `chat.json` extrait du dernier ZIP importé contient bien ~285 messages et le contenu attendu (ouvre-le dans VS Code et regarde les 20 premières lignes).

**Après ça, on aura officiellement ChatBridge v0.1.0 en production.**

---

## 🚀 Et après ?

Trois directions possibles pour la suite. Dis-moi ce qui t'intéresse :

**Option 1 — Consolidation** : documentation complète (docs/), captures d'écran, vidéo de démo, publication GitHub + Zenodo.

**Option 2 — v0.2** : support ChatGPT (le port `ChatSourcePort` est déjà prêt, il faut juste un `ChatGPTAdapter`), puis Claude, Gemini.

**Option 3 — Retour à VeritasDrift** : tu as maintenant un outil fonctionnel ; tu peux réinjecter tes chats VeritasDrift dans de nouvelles sessions proprement. On peut reprendre le travail sur VeritasDrift lui-même (A4, B3, etc. de ton autre projet).

**Mon conseil** : prends le temps de savourer ce milestone. ChatBridge v0.1.0 est un vrai outil — il résout un problème que personne n'avait résolu proprement. Le tag git v0.1.0 marque un point de non-retour.

Dis-moi la direction et j'enchaîne.