# Changelog

## Fonctionnalités

### Interface et design
- Système de design unifié : palette, typographie, rayons, ombres et espacements.
- Mise en page responsive, panneaux à défilement interne et barre d’action mobile.
- Composants harmonisés : stepper, formulaires, cartes, catalogue, propriétés et prix.

### Studio 3D
- Scène Three.js servie localement, sans dépendance CDN.
- Éclairage, matériaux, arêtes, poignées et ombre de contact retravaillés.
- Vues prédéfinies : face, côté, dessus.
- Déplacement des pièces au pas de 10 mm.
- Grain procédural sur les matériaux bois.
- Pause du rendu hors écran et libération des ressources.
- Fallback avec bouton « Réessayer » si WebGL échoue.

### Modèles et catalogue
- Sept points de départ : caisson sur mesure, commode, meuble TV, bibliothèque, table basse, bureau et dressing.
- Variantes : nombre de tiroirs, tablettes, portes/niche, plateau rectangulaire/rond, caisson à gauche/droite.
- Catalogue avec recherche et catégories repliables.
- Ajout, duplication, suppression et édition de composants.

### Finitions
- Matériaux structurels et matériaux techniques.
- Teintes propres à chaque matériau.
- Types de poignées et finitions de poignées.
- Socle en retrait, affleurant ou absent.
- Teinte et finition de poignée modifiables pièce par pièce.

### Persistance et devis
- Sauvegarde automatique locale et bouton de sauvegarde explicite.
- Nom de projet éditable.
- Import/export JSON avec validation.
- Partage par lien encodé.
- Téléchargement d’un récapitulatif HTML.
- Demande de devis avec enregistrement local, mailto et téléchargement.

### Prix
- Calcul détaillé : base, dimensions, rangements, matière, poignées, socle et composants ajoutés.
- Détail du prix dépliable et mention hors livraison/pose.

### Qualité et accessibilité
- Rôles ARIA, libellés, contrastes renforcés et liste de pièces accessible au clavier.
- Annuler/rétablir avec raccourcis clavier.
- Notifications toast et dialogues de confirmation.
- Tests unitaires Vitest.
- Validation TypeScript activée pendant le build.

## Corrections

### Ajustement automatique
- L’ajustement s’applique désormais aux pièces réellement affichées, overrides compris.
- Les pièces déplacées sont recalées sur leur position de référence.
- Les portes, tiroirs, étagères et pieds sont réalignés.
- Les corrections sont persistées en overrides (sur mesure) ou dans la géométrie du modèle.
- Le rapport indique les corrections réelles effectuées.
- Les chevauchements de composants ajoutés sont signalés dans l’étape d’ajustement et la validation.

### Modèles
- Commode avec tiroirs pleine hauteur.
- Bureau avec caisson de tiroirs correctement placé sous le plan.
- Descriptions des modèles alignées sur leur contenu.

### Divers
- Les matériaux acier et verre ne sont plus proposés comme structure principale.
- L’état « Tout ouvrir » est resynchronisé après une ouverture individuelle.
- Les erreurs TypeScript ne sont plus ignorées au build.

## Vérifications

- `npx tsc --noEmit` : OK
- `npx vitest run` : 15 tests passés
- `npm run build` : OK
- Parcours testé sur desktop et mobile.

## Limites

- La sauvegarde et les demandes de devis sont locales à l’appareil ; aucun backend n’est branché.
- L’envoi réel d’un devis nécessite une API ou l’ouverture de la messagerie de l’utilisateur.
