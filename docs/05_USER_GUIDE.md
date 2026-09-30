# Guide utilisateur — ChatBridge

## Installation (5 minutes)

### 1. Installer Tampermonkey

Chrome/Edge : chrome web store.
Firefox : addons.mozilla.org.

Sur Edge : edge://extensions/ -> Tampermonkey -> Détails ->
activer "Autoriser les scripts utilisateur".

### 2. Installer ChatBridge

1. Ouvre dist/chatbridge.user.js dans VS Code -> Ctrl+A -> Ctrl+C
2. Tampermonkey -> Tableau de bord -> + (nouveau script)
3. Ctrl+A -> Ctrl+V -> Ctrl+S

## Exporter un chat

1. Ouvre le chat à exporter
2. Attends 1 seconde que le panneau apparaisse
3. Clique "Exporter ce chat"
4. Attends (2-5 min pour 200+ messages)
5. Le fichier .zip se télécharge

Contenu du ZIP :
- chat.json   (source de vérité)
- chat.md     (version lisible)
- manifest.json (métadonnées)

## Importer un chat

### Cas simple (< 120 chunks)
1. Ouvre un chat vide
2. Clique "Importer un chat"
3. Sélectionne le .zip
4. Laisse tourner (5-15 min)

### Cas long (> 120 chunks) — Mode compact
1. Ouvre un chat vide
2. Coche "Mode compact"
3. Clique "Importer un chat"
4. Laisse tourner

## Statuts du panneau

| Statut | Signification |
|---|---|
| Prêt. | Aucune opération en cours |
| N msgs (X%) | Export en cours |
| Envoi X/Y | Import : chunk X sur Y |
| Réponse X/Y | Attente de la réponse |
| Pause anti rate-limit | Pause volontaire |
| N messages — fichier.zip | Export terminé |
| Import terminé | Import terminé |
| Erreur : ... | Voir console F12 |

## Résolution de problèmes

### Le panneau n'apparaît pas
- Vérifie Tampermonkey activé sur chat.deepseek.com
- Vérifie "Autoriser les scripts utilisateur" dans edge://extensions/
- Recharge (Ctrl+Maj+R)

### L'export retourne 0 messages
UI DeepSeek modifiée. Ouvre F12 -> Console -> filtre ChatBridge
-> copie l'erreur -> signale sur GitHub.

### L'import s'arrête au chunk X
Vérifie la console : timeout chunk X tentative 1/2/3.
Si les 3 échouent : réduis avec le mode compact.

## Vie privée

- Aucune donnée envoyée à un serveur
- Aucune télémétrie
- Aucun cookie tiers
- Tous les fichiers restent sur ton disque
