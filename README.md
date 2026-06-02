# Grand Livre — PoC Stimulsoft Reports.JS

Proof of Concept d'un outil de **reporting 100 % client-side** pour Angular 20, en remplacement de
FastReport. Génère un **grand livre comptable** à partir de fichiers JSON, avec **designer embarqué** et
**export PDF** depuis le navigateur.

> 🌐 **Démo en ligne :** https://grand-livre-stimulsoft.vercel.app
> *(Un bandeau « trial version » Stimulsoft s'affiche en l'absence de licence : c'est normal en évaluation, non bloquant.)*
>
> 🔁 Un second PoC équivalent utilise **ActiveReportsJS (MESCIUS)** :
> https://github.com/mathyspqr/grand-livre-activereports

---

## Stack

- **Angular 20** (standalone components, routing lazy-loaded)
- **stimulsoft-reports-js** (scripts reports / viewer / designer) en mode client-side
- 100 % navigateur : aucun backend pour le rendu ou l'export

---

## Démarrer en local

```bash
npm install
npx ng serve --port 4300
# puis ouvrir http://localhost:4300
```

> Sans clé de licence, Stimulsoft affiche un **bandeau d'évaluation** (le rapport fonctionne quand même).

---

## Utilisation

1. Aller sur **Viewer**.
2. Cliquer **« Charger des écritures »** et sélectionner un fichier `Ecriture.json`
   (voir structure attendue ci-dessous). Le grand livre se génère à la volée.
3. Choisir la **colonne de référence** : N° Pièce / ID écriture / N° Écriture.
4. **Exporter en PDF** depuis la barre d'outils du viewer.
5. **Designer** : modifier la mise en page, puis sauvegarder → télécharge un modèle `.mrt`.
6. De retour sur le Viewer : **« Charger un modèle »** pour réappliquer un `.mrt` à vos données.

---

## Données

| Fichier | Rôle | Emplacement |
|---|---|---|
| `PlanComptableOfficiel.json` | Plan comptable = **référentiel** (numéro + intitulé) | fourni dans `src/assets/data/` |
| `Ecriture.json` | Les **écritures** comptables | **importé par l'utilisateur** (non embarqué) |

**Jointure** : `Ecriture.Compte` → `PlanComptable.Numero` (récupère l'intitulé du compte).

### Structure minimale d'une écriture (`Ecriture.json` = tableau d'objets)

```jsonc
[
  {
    "ID": 478174,
    "Compte": "4100000008",      // clé de jointure vers PlanComptable.Numero
    "Journal": "VT",             // "AN" = À Nouveau (sert au solde N-1)
    "Numero": "41353-MuD",       // n° d'écriture
    "NumeroPiece": "F2158",      // n° de pièce
    "Libelle": "EPUdF : ...",
    "MontantDebit": 85681.20,
    "MontantCredit": 0,
    "DateOperation": "2025-07-10"
  }
]
```

---

## Fonctionnalités

- Groupement par compte (n° + intitulé), avec **reprise des en-têtes** à chaque page (`printOnAllPages`)
- Colonnes : N° pièce / Date / Libellé / Débit / Crédit / **Solde permanent** (running balance)
- **Totaux par compte** + **total général**
- **Numérotation des pages**
- **Paramétrage** de la colonne de référence (N° Pièce / ID / N° Écriture)
- **Designer embarqué** (édition + sauvegarde `.mrt`)
- **Export PDF** client-side

---

## Architecture (résumé)

```
src/app/
├── services/grand-livre-data.service.ts   → données + jointure + formatage FR (montants, dates)
├── services/report-builder.service.ts      → construction du rapport PAR CODE (bandes Stimulsoft)
├── viewer/        → page Viewer (StiViewer, export PDF, imports écritures/modèle)
├── designer/      → page Designer (StiDesigner, sauvegarde .mrt)
└── home/          → page d'accueil
```

Deux services : l'un prépare **les données** (jointure, soldes, format FR), l'autre **construit le rapport**
bande par bande (titre, en-tête de compte, détail, totaux, total général, pied de page). Le rapport est
**pré-rendu** (`renderAsync2`) avant affichage pour que la numérotation des pages fonctionne.

---

## Licence Stimulsoft

Le PoC tourne en **mode évaluation** (bandeau « trial »). Pour retirer le bandeau, fournir une clé de
licence Stimulsoft via `Stimulsoft.Base.StiLicense.key = '...'` au démarrage. Essai : https://www.stimulsoft.com
