# Spécification fonctionnelle — ChatBridge v0.1

## Périmètre

- Plateformes : DeepSeek (v0.1), ChatGPT (v0.2)
- Interface : userscript Tampermonkey
- Traitement : 100% local
- Post-export : tous les fichiers lisibles hors ligne

## Format canonique JSON

- chatbridge_version (string)
- exported_at (ISO 8601)
- source.platform, source.url, source.title
- sha256 (64 hex)
- messages[] avec index, role, timestamp, content, thinking, attachments

## Format archive .zip

chatbridge-<slug>-<YYYY-MM-DD>.zip
  - chat.json        (source de vérité)
  - chat.md          (lisible humain)
  - manifest.json    (métadonnées)

## Critères d'acceptation v0.1

| # | Critère | Vérification |
|---|---|---|
| CA-1 | Export DeepSeek 200+ messages | Compte = source |
| CA-2 | Thinking conservés | Présents dans JSON et MD |
| CA-3 | Hash SHA-256 correct | Recalculé et comparé |
| CA-4 | Import nouvelle session | Tous les messages dans l'ordre |
| CA-5 | Mode compact | Assistant tronqué à 800 chars |
| CA-6 | Mode hors ligne | JSON lisible sans navigateur |
| CA-7 | <= 3 actions utilisateur | Compté |
| CA-8 | Coverage >= 82% | 85.82% atteint |

## Interface utilisateur

Panneau flottant Shadow DOM avec :
- Bouton "Exporter ce chat"
- Case "Mode compact (assistant tronqué)"
- Bouton "Importer un chat"
- Zone de statut

## Codes d'erreur

| Code | Message | Cause |
|---|---|---|
| E01 | champ de saisie DeepSeek introuvable | UI modifiée |
| E02 | chat.json introuvable dans le ZIP | ZIP corrompu |
| E03 | Import interrompu au chunk X/N | Timeout x3 |
| E04 | Échec de désérialisation JSON | JSON invalide |

## Dépendances

- Runtime : navigateur moderne (Edge, Chrome, Firefox)
- Extension : Tampermonkey
- Lib : fflate (ZIP côté client)
