# Accord de travail — ChatBridge

## Principes non négociables

1. **Un besoin non écrit n'existe pas.** Aucune ligne de code sans User Story validée.
2. **Observation ≠ conclusion.** L'outil transporte fidèlement ; il ne juge, ne résume, ne réécrit jamais.
3. **Simplicité utilisateur prioritaire.** Toute fonctionnalité qui augmente le nombre de clics est suspecte.
4. **Qualité technique = 0 compromis.** tsc --noEmit 0 erreur, eslint --max-warnings 0, coverage >= 82%.
5. **Reproductibilité totale.** Chaque export produit un artefact horodaté + hash SHA-256.

## Cycle en 7 phases

Besoin -> Spec -> Design -> Implementation -> Test -> Mesure -> Retrospective

## Definition of Ready (DoR)

- Le besoin est formulé du point de vue utilisateur
- Les critères d'acceptation sont écrits et testables
- L'effort est estimé
- Les dépendances sont identifiées
- Le périmètre est borné (in/out)

## Definition of Done (DoD)

- Code implémenté et revu
- Tests unitaires + intégration passent
- Coverage global >= 82%
- npm run typecheck -> 0 erreur
- npm run lint -> 0 warning
- Documentation mise à jour
- CHANGELOG mis à jour
- Tag git créé si release

## Convention de commits

feat:, fix:, docs:, test:, chore:, refactor:

## Refus éthiques

Voir docs/01_VISION.md.
