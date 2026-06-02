import { Injectable } from '@angular/core';

export interface EcritureRaw {
  ID: number;
  Numero: string;
  NumeroPiece: string;
  Compte: string;
  Journal: string;
  Libelle: string;
  MontantDebit: number;
  MontantCredit: number;
  DateOperation: string;
  DateCreation: string;
  [key: string]: unknown;
}

export interface PlanComptableRaw {
  Numero: string;
  Intitule: string;
  SoldeDebitnmoins1: number | null;
  SoldeCreditnmoins1: number | null;
  [key: string]: unknown;
}

export interface GrandLivreEntry {
  CompteNumero: string;
  CompteIntitule: string;
  EcritureID: number;
  NumeroPiece: string;
  NumeroEcriture: string;
  DateOperation: string;
  Libelle: string;
  DateAffichee: string;
  Debit: number;
  Credit: number;
  DebitStr: string;
  CreditStr: string;
  SoldePermanent: number;
  SoldePermanentStr: string;
  SoldeAnterieurDebit: number;
  SoldeAnterieurCredit: number;
}

@Injectable({ providedIn: 'root' })
export class GrandLivreDataService {
  private ecritures: EcritureRaw[] = [];
  private planComptable = new Map<string, PlanComptableRaw>();
  private planLoaded = false;

  /** Charge le plan comptable depuis un fichier importé par l'utilisateur.
   *  Le plan n'est PAS embarqué dans l'application (il contient des comptes
   *  nominatifs = données personnelles). Renvoie le nombre de comptes. */
  async loadPlanFromFile(file: File): Promise<number> {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('Le plan comptable doit être un tableau JSON');
    }
    const planArray = parsed as PlanComptableRaw[];
    this.planComptable = new Map(planArray.map((p) => [p.Numero, p]));
    this.planLoaded = true;
    return planArray.length;
  }

  /** Indique si le plan comptable a été chargé. */
  hasPlan(): boolean {
    return this.planLoaded;
  }

  /** Indique si des écritures ont été importées. */
  hasEcritures(): boolean {
    return this.ecritures.length > 0;
  }

  /** Renvoie le nombre d'écritures actuellement chargées (affiché dans l'UI). */
  getEcrituresCount(): number {
    return this.ecritures.length;
  }

  /** Lit le fichier d'écritures importé par l'utilisateur, le valide et le
   *  stocke en mémoire (this.ecritures). Renvoie le nombre d'écritures. */
  async loadEcrituresFromFile(file: File): Promise<number> {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) {
      throw new Error('Le fichier doit contenir un tableau JSON');
    }
    this.ecritures = parsed as EcritureRaw[];
    return this.ecritures.length;
  }

  /** Formate un montant au format français : « 1 234,56 € ». */
  private formatMontant(v: number): string {
    return v.toLocaleString('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' €';
  }

  /** Convertit une date ISO (2025-07-10) en format français (10/07/2025). */
  private formatDate(iso: string): string {
    if (!iso) return '';
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
  }

  /** Cœur métier : fusionne les écritures avec le plan comptable (jointure
   *  Compte → Numéro), calcule le solde N-1 et le solde permanent (cumul par
   *  compte), pré-formate les montants/dates en FR, trie par compte puis date.
   *  Renvoie le tableau de lignes prêt à afficher. */
  buildGrandLivreData(): GrandLivreEntry[] {
    const entries: GrandLivreEntry[] = [];

    // Solde N-1 via journal "AN" (À Nouveau)
    const soldeAn = new Map<string, { debit: number; credit: number }>();
    for (const ec of this.ecritures) {
      if (ec.Journal === 'AN') {
        const cur = soldeAn.get(ec.Compte) ?? { debit: 0, credit: 0 };
        cur.debit += ec.MontantDebit ?? 0;
        cur.credit += ec.MontantCredit ?? 0;
        soldeAn.set(ec.Compte, cur);
      }
    }

    // 2e passage : une ligne de grand livre par écriture, enrichie de
    // l'intitulé du compte (jointure) et nettoyée
    for (const ec of this.ecritures) {
      const plan = this.planComptable.get(ec.Compte); // jointure Compte → Numéro
      const san = soldeAn.get(ec.Compte);
      entries.push({
        CompteNumero: ec.Compte,
        CompteIntitule: plan?.Intitule ?? 'Compte inconnu',
        EcritureID: ec.ID,
        NumeroPiece: ec.NumeroPiece ?? '',
        NumeroEcriture: ec.Numero ?? '',
        DateOperation: ec.DateOperation ?? ec.DateCreation ?? '',
        Libelle: ec.Libelle ?? '',
        DateAffichee: '',
        Debit: ec.MontantDebit ?? 0,
        Credit: ec.MontantCredit ?? 0,
        DebitStr: '',
        CreditStr: '',
        SoldePermanent: 0,
        SoldePermanentStr: '',
        SoldeAnterieurDebit: san?.debit ?? plan?.SoldeDebitnmoins1 ?? 0,
        SoldeAnterieurCredit: san?.credit ?? plan?.SoldeCreditnmoins1 ?? 0,
      });
    }

    entries.sort((a, b) => {
      const cmp = a.CompteNumero.localeCompare(b.CompteNumero);
      if (cmp !== 0) return cmp;
      return a.DateOperation.localeCompare(b.DateOperation);
    });

    // Solde permanent (cumul par compte) + chaînes formatées FR
    let currentCompte = '';
    let running = 0;
    for (const e of entries) {
      if (e.CompteNumero !== currentCompte) {
        currentCompte = e.CompteNumero;
        running = 0;
      }
      running += e.Debit - e.Credit;
      e.SoldePermanent = running;
      e.DateAffichee = this.formatDate(e.DateOperation);
      e.DebitStr = e.Debit === 0 ? '' : this.formatMontant(e.Debit);
      e.CreditStr = e.Credit === 0 ? '' : this.formatMontant(e.Credit);
      e.SoldePermanentStr = this.formatMontant(e.SoldePermanent);
    }

    return entries;
  }

  /** Emballe les données dans l'objet { GrandLivre: [...] } attendu par
   *  Stimulsoft (DataSet.readJson). « GrandLivre » devient le nom de la table
   *  référencée dans le rapport. */
  getDataObject(): { GrandLivre: GrandLivreEntry[] } {
    return { GrandLivre: this.buildGrandLivreData() };
  }
}
