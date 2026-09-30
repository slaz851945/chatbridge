# Architecture technique — ChatBridge v0.1

## Clean Architecture à 4 couches

- Interface (userscript) : Panel Shadow DOM, downloadBlob, main.ts
- Application : ExportFlow, ImportChatUseCase, ChunkStrategy, Ports
- Domain : Message, Chat, ExportEnvelope, HashService (pur)
- Infrastructure : DeepSeekAdapter, DeepSeekImporter, Serializers

## Décisions techniques structurantes

### D1 — Liste virtualisée
DeepSeek utilise ds-virtual-list : ~10 messages dans le DOM.
Extraction par scroll incrémental avec pas adaptatif (250px -> 3000px).
Déduplication par hash de contenu.

### D2 — Détection de fin d'import
Échantillonner la longueur de texte des 3 derniers ds-message.
Stable pendant 4 s -> terminé. Indépendant du DOM et du scroll.

### D3 — Interception API (fallback)
Patch fetch + XHR pour capturer les /api/. Si capture, préférée au scroll.

### D4 — Mode compact
Tronque les messages assistant à 800 chars et supprime les thinking.
Réduit ~250k tokens à ~40k pour rester dans la fenêtre DeepSeek.

### D5 — Pacing anti rate-limit
Pauses progressives : 2 s entre chunks, 15 s tous les 10, 45 s tous les 30.

## Stack technique

| Composant | Choix |
|---|---|
| Langage | TypeScript 5.7 |
| Build | Vite 6 + vite-plugin-monkey |
| Tests | Vitest 2 + jsdom |
| Lint | ESLint 9 flat config |
| Format | Prettier 3 |
| ZIP | fflate |
| Runtime | Navigateur + Tampermonkey |

## Sécurité

- Aucune donnée quitte le navigateur
- Aucun appel réseau tiers
- Interception API : lecture seule, jamais de modification
