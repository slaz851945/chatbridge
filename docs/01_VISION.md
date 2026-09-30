# Vision ChatBridge

## Problème

Les conversations LLM longues et denses sont enfermées dans une session.
Aucun moyen simple de les exporter intégralement, de les réinjecter dans
une nouvelle session, ni de le faire sans compétence technique.

## Vision

ChatBridge est un pont portable entre sessions LLM. Il permet à tout
utilisateur d'exporter intégralement une conversation (DeepSeek, ChatGPT)
vers un format ouvert, puis de la réinjecter dans une nouvelle session
en respectant fidèlement la structure (rôles, ordre, blocs de raisonnement).

Traitement 100% local. Fonctionne hors ligne une fois l'export réalisé.

## Objectifs v0.1

| # | Objectif | Mesure | Statut |
|---|---|---|---|
| O1 | Export intégral DeepSeek | 100% des messages, thinking inclus | OK |
| O2 | Format canonique JSON + Markdown | Schéma documenté, versionné | OK |
| O3 | Import par segmentation automatique | <= 3 actions utilisateur | OK |
| O4 | Fonctionnement hors ligne post-export | Aucune dépendance réseau | OK |
| O5 | Qualité technique | 0 tsc/lint, coverage >= 82% | OK 85.82% |

## Principe fondateur

> L'outil transporte. L'utilisateur décide.

## Non-objectifs

- Ne remplace pas une API officielle
- Ne stocke rien sur un serveur
- Ne modifie jamais le contenu
- Ne contourne aucune limitation des plateformes

## Refus éthiques

| Demande | Décision | Raison |
|---|---|---|
| Modifier le contenu | Refusé | L'outil transporte |
| Résumer automatiquement | Refusé | Confusion observation/conclusion |
| Contourner les CGU | Refusé | Respect des plateformes |
| Stocker côté serveur | Refusé | Traitement 100% local |

## Roadmap

| Version | Contenu | Statut |
|---|---|---|
| 0.1.0 | DeepSeek export + import | OK |
| 0.2.0 | ChatGPT export + import | Prévu |
| 0.3.0 | Claude, Gemini | Prévu |
| 1.0.0 | App autonome (Tauri) | Prévu |
