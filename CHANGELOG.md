# Changelog

Toutes les modifications notables sont documentées ici.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/).

## [0.1.0] — 2026-09-30

### Added

**Export (T1 → T5)**
- Scaffold Clean Architecture 4 couches (TS 5.7, Vite 6, Vitest 2, ESLint 9 flat config).
- Domain pur : `Message`, `Chat`, `ChatSource`, `Role`, `Attachment`, `ExportEnvelope`, `ChatBridgeManifest`, `HashService`.
- `ExportChatUseCase` — transforme un `Chat` en enveloppe sérialisable avec SHA-256.
- `JsonSerializer` — JSON canonique avec validation structurelle stricte.
- `MarkdownSerializer` — Markdown lisible avec thinking en `<details>`.
- `ZipBundle` — assemble JSON + MD + manifest dans un `.zip` (via fflate).
- `ChatSourcePort` — port d'adaptateur plateforme.
- `DeepSeekAdapter` — extraction DOM + scroll virtualisé adaptatif.
- `VirtualListExtractor` — capture incrémentale des listes virtualisées (pas adaptatif : 250 px → 3000 px selon progression).
- `DeepSeekMessageExtractor` — extraction des messages DeepSeek (rôles, thinking, pièces jointes).
- `apiInterceptor` — interception réseau primaire (fallback silencieux si non disponible).
- `ExportFlow` — orchestrateur extract → serialize → bundle.

**Import (T6)**
- `ImportPort` — port d'adaptateur d'import.
- `ChunkStrategy` — segmentation par taille, avec mode compact (assistant tronqué à 800 chars).
- `readBundle` — lecture `.zip` ou `.json` en `ExportEnvelope`.
- `ImportChatUseCase` — orchestration lecture → chunking → envoi.
- `DeepSeekImporter` — envoi séquentiel avec détection de fin par échantillonnage de longueur de texte (indépendant du DOM virtualisé, du scroll, des mutations).
- Pacing anti rate-limit (pauses 15 s / 45 s aux seuils 10 / 30 chunks).

**Interface userscript (T5, T7)**
- `Panel` — panneau flottant en Shadow DOM avec 2 boutons (Exporter / Importer) et case « Mode compact ».
- `downloadBlob` — téléchargement via `<a download>`.
- `detectPlatform` — détection DeepSeek / ChatGPT.
- `main.ts` — bootstrap avec `@run-at document-start`, installation de l'intercepteur API avant DeepSeek.

**Qualité**
- 142 tests unitaires et d'intégration (domain, application, infrastructure, interface).
- Coverage globale : **85.82 %** (seuil : 82 %).
- 0 erreur `tsc --noEmit`, 0 warning `eslint --max-warnings 0`.

### Known limitations

- Import limité par la fenêtre de contexte DeepSeek (~128k tokens). Un chat de 266 chunks dépasse cette limite : utiliser le **mode compact** ou importer par lots.
- `ChatGPTAdapter` non implémenté (le port `ChatSourcePort` est prêt).
- Sélecteurs DeepSeek calibrés sur l'UI 2026-09 ; peuvent nécessiter mise à jour si l'UI change.

### Technical

- `apiInterceptor` : interception fetch + XHR pour capturer les messages via API (fallback DOM si non capturé).
- `DeepSeekImporter` : détection de fin indépendante du DOM (échantillonnage de longueur des 3 derniers messages, stabilité 4 s).
- Stack : TypeScript 5.7, Vite 6, Vitest 2, ESLint 9, Prettier 3, fflate, jsdom.