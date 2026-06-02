import { Injectable } from '@angular/core';
import { Stimulsoft } from 'stimulsoft-reports-js/Scripts/stimulsoft.reports.js';

const navy = () => Stimulsoft.System.Drawing.Color.fromArgb(26, 43, 74);
const headerBar = () => Stimulsoft.System.Drawing.Color.fromArgb(236, 239, 244);
const white = () => Stimulsoft.System.Drawing.Color.fromArgb(255, 255, 255);
const black = () => Stimulsoft.System.Drawing.Color.fromArgb(0, 0, 0);
const grey = () => Stimulsoft.System.Drawing.Color.fromArgb(120, 120, 120);
const rule = () => Stimulsoft.System.Drawing.Color.fromArgb(154, 165, 177);

type Align = 'left' | 'center' | 'right';

interface TextOpts {
  bold?: boolean;
  size?: number;
  align?: Align;
  color?: any;
  bg?: any;
  wrap?: boolean;
  grow?: boolean;
  currency?: boolean;
  borderTop?: boolean;
  borderBottom?: boolean;
}

@Injectable({ providedIn: 'root' })
export class ReportBuilderService {
  /** Construit le rapport PAR CODE : crée chaque baande (titre, en-tête de
   *  compte, détail, totaux, total général, pied de page), y place les zones
   *  de texte, et injecte les données. Renvoie le StiReport prêt à afficher.
   *  `pieceColumn` choisit le champ de la 1re colonne (N° pièce / ID / N° écriture). */
  build(dataObject: object, pieceColumn: string): any {
    const C = Stimulsoft.Report.Components;
    const D = Stimulsoft.System.Drawing;

    const report = Stimulsoft.Report.StiReport.createNewReport();
    report.reportUnit = Stimulsoft.Report.StiReportUnitType.Centimeters;
    report.reportName = 'GrandLivre';

    this.applyData(report, dataObject);

    const page = report.pages.getByIndex(0);
    page.pageWidth = 21;
    page.pageHeight = 29.7;
    page.margins = new C.StiMargins(1.5, 1.5, 1.5, 1.5);

    // Colonnes (x, largeur) en cm, total = 18
    const col = {
      piece: { x: 0, w: 2.2 },
      date: { x: 2.2, w: 1.8 },
      lib: { x: 4.0, w: 6.5 },
      deb: { x: 10.5, w: 2.5 },
      cred: { x: 13.0, w: 2.5 },
      solde: { x: 15.5, w: 2.5 },
    };

    const fieldMap: Record<string, string> = {
      NumeroPiece: 'NumeroPiece',
      ID: 'EcritureID',
      Numero: 'NumeroEcriture',
    };
    const labelMap: Record<string, string> = {
      NumeroPiece: 'N° pièce',
      ID: 'ID',
      Numero: 'N° écriture',
    };
    const pieceField = fieldMap[pieceColumn] ?? 'NumeroPiece';
    const pieceLabel = labelMap[pieceColumn] ?? 'N° pièce';

    // Fabrique une zone de texte positionnée (en cm) avec ses styles
    // (police, couleur, fond, alignement, format monétaire, bordures).
    // Chaque texte reçoit un nom unique (requis par Stimulsoft).
    let textCounter = 0;
    const makeText = (
      x: number,
      y: number,
      w: number,
      h: number,
      text: string,
      opts: TextOpts = {}
    ): any => {
      const t = new C.StiText(new D.Rectangle(x, y, w, h));
      t.name = 'Txt' + textCounter++;
      t.text = text;
      t.font = new D.Font(
        'Arial',
        opts.size ?? 8,
        opts.bold ? D.FontStyle.Bold : D.FontStyle.Regular
      );
      t.horAlignment =
        opts.align === 'right'
          ? Stimulsoft.Base.Drawing.StiTextHorAlignment.Right
          : opts.align === 'center'
          ? Stimulsoft.Base.Drawing.StiTextHorAlignment.Center
          : Stimulsoft.Base.Drawing.StiTextHorAlignment.Left;
      t.vertAlignment = Stimulsoft.Base.Drawing.StiVertAlignment.Center;
      if (opts.color) t.textBrush = new Stimulsoft.Base.Drawing.StiSolidBrush(opts.color);
      if (opts.bg) t.brush = new Stimulsoft.Base.Drawing.StiSolidBrush(opts.bg);
      if (opts.wrap) t.wordWrap = true;
      if (opts.grow) t.canGrow = true;
      if (opts.currency) t.textFormat = this.currencyFormat();
      if (opts.borderTop || opts.borderBottom) {
        const sides =
          (opts.borderTop ? Stimulsoft.Base.Drawing.StiBorderSides.Top : 0) |
          (opts.borderBottom ? Stimulsoft.Base.Drawing.StiBorderSides.Bottom : 0);
        t.border = new Stimulsoft.Base.Drawing.StiBorder(
          sides,
          rule(),
          0.5,
          Stimulsoft.Base.Drawing.StiPenStyle.Solid
        );
      }
      return t;
    };

    const chOpts: TextOpts = { bold: true, size: 8, color: navy(), bg: headerBar(), borderBottom: true, borderTop: true };

    // ---- Report Title ---- (bande ajoutée à la page AVANT les textes)
    const title = new C.StiReportTitleBand(new D.Rectangle(0, 0, 18, 2));
    title.name = 'ReportTitle';
    page.components.add(title);
    title.components.add(makeText(0, 0, 18, 0.8, 'Grand livre provisoire', { bold: true, size: 15, align: 'center', color: navy() }));
    title.components.add(makeText(0, 0.85, 18, 0.5, 'Édition du grand livre comptable', { size: 9, align: 'center', color: grey() }));
    title.components.add(makeText(0, 1.3, 18, 0.45, 'Édité le ' + this.todayFr(), { size: 8, align: 'center', color: grey() }));

    // ---- Group Header (par compte) ----
    const gh = new C.StiGroupHeaderBand(new D.Rectangle(0, 2, 18, 1.15));
    gh.name = 'GroupCompte';
    gh.condition = '{GrandLivre.CompteNumero}';
    gh.printOnAllPages = true; // reprise des en-têtes à chaque page
    page.components.add(gh);
    gh.components.add(makeText(0, 0, 18, 0.6, '{GrandLivre.CompteNumero + "    " + GrandLivre.CompteIntitule}', { bold: true, size: 10, color: navy(), bg: headerBar(), borderTop: true }));
    gh.components.add(makeText(col.piece.x, 0.62, col.piece.w, 0.5, pieceLabel, { ...chOpts, align: 'left' }));
    gh.components.add(makeText(col.date.x, 0.62, col.date.w, 0.5, 'Date', { ...chOpts, align: 'left' }));
    gh.components.add(makeText(col.lib.x, 0.62, col.lib.w, 0.5, 'Libellé', { ...chOpts, align: 'left' }));
    gh.components.add(makeText(col.deb.x, 0.62, col.deb.w, 0.5, 'Débit', { ...chOpts, align: 'right' }));
    gh.components.add(makeText(col.cred.x, 0.62, col.cred.w, 0.5, 'Crédit', { ...chOpts, align: 'right' }));
    gh.components.add(makeText(col.solde.x, 0.62, col.solde.w, 0.5, 'Solde perma.', { ...chOpts, align: 'right' }));

    // ---- Data Band (détail) ----
    const db = new C.StiDataBand(new D.Rectangle(0, 3.2, 18, 0.45));
    db.name = 'DataGrandLivre';
    db.dataSourceName = 'GrandLivre';
    db.canGrow = true;
    page.components.add(db);
    db.components.add(makeText(col.piece.x, 0, col.piece.w, 0.4, `{GrandLivre.${pieceField}}`, { size: 8, grow: true }));
    db.components.add(makeText(col.date.x, 0, col.date.w, 0.4, '{GrandLivre.DateAffichee}', { size: 8 }));
    db.components.add(makeText(col.lib.x, 0, col.lib.w, 0.4, '{GrandLivre.Libelle}', { size: 8, wrap: true, grow: true }));
    db.components.add(makeText(col.deb.x, 0, col.deb.w, 0.4, '{GrandLivre.DebitStr}', { size: 8, align: 'right' }));
    db.components.add(makeText(col.cred.x, 0, col.cred.w, 0.4, '{GrandLivre.CreditStr}', { size: 8, align: 'right' }));
    db.components.add(makeText(col.solde.x, 0, col.solde.w, 0.4, '{GrandLivre.SoldePermanentStr}', { size: 8, align: 'right' }));

    // ---- Group Footer (totaux compte) ----
    const gf = new C.StiGroupFooterBand(new D.Rectangle(0, 3.7, 18, 1.7));
    gf.name = 'GroupFooterCompte';
    page.components.add(gf);
    gf.components.add(makeText(col.lib.x, 0.05, col.lib.w, 0.45, 'Total débit/crédit', { bold: true, size: 8, align: 'right', borderTop: true }));
    gf.components.add(makeText(col.deb.x, 0.05, col.deb.w, 0.45, '{Sum(DataGrandLivre, GrandLivre.Debit)}', { bold: true, size: 8, align: 'right', currency: true, borderTop: true }));
    gf.components.add(makeText(col.cred.x, 0.05, col.cred.w, 0.45, '{Sum(DataGrandLivre, GrandLivre.Credit)}', { bold: true, size: 8, align: 'right', currency: true, borderTop: true }));
    gf.components.add(makeText(col.solde.x, 0.05, col.solde.w, 0.45, '', { borderTop: true }));
    gf.components.add(makeText(col.lib.x, 0.55, col.lib.w, 0.45, '{"Solde du compte " + GrandLivre.CompteNumero}', { size: 8, align: 'right' }));
    gf.components.add(makeText(col.deb.x, 0.55, col.deb.w + col.cred.w, 0.45, '{Sum(DataGrandLivre, GrandLivre.Debit) - Sum(DataGrandLivre, GrandLivre.Credit)}', { size: 8, align: 'right', currency: true }));
    gf.components.add(makeText(col.lib.x, 1.05, col.lib.w, 0.45, "Solde du compte en fin d'exercice précédent", { size: 8, align: 'right' }));
    gf.components.add(makeText(col.deb.x, 1.05, col.deb.w + col.cred.w, 0.45, '{GrandLivre.SoldeAnterieurDebit > 0 ? GrandLivre.SoldeAnterieurDebit : GrandLivre.SoldeAnterieurCredit}', { size: 8, align: 'right', currency: true }));

    // ---- Report Summary (total général) ----
    const rs = new C.StiReportSummaryBand(new D.Rectangle(0, 5.5, 18, 0.8));
    rs.name = 'ReportSummary';
    page.components.add(rs);
    rs.components.add(makeText(0, 0.1, col.lib.x + col.lib.w, 0.6, 'Total général débit/crédit', { bold: true, size: 9, align: 'right', color: white(), bg: navy() }));
    rs.components.add(makeText(col.deb.x, 0.1, col.deb.w, 0.6, '{Sum(DataGrandLivre, GrandLivre.Debit)}', { bold: true, size: 9, align: 'right', color: white(), bg: navy(), currency: true }));
    rs.components.add(makeText(col.cred.x, 0.1, col.cred.w, 0.6, '{Sum(DataGrandLivre, GrandLivre.Credit)}', { bold: true, size: 9, align: 'right', color: white(), bg: navy(), currency: true }));
    rs.components.add(makeText(col.solde.x, 0.1, col.solde.w, 0.6, '', { bg: navy() }));

    // ---- Page Footer ----
    const pf = new C.StiPageFooterBand(new D.Rectangle(0, 28, 18, 1));
    pf.name = 'PageFooter';
    page.components.add(pf);
    pf.components.add(makeText(0, 0.1, 6, 0.5, this.todayFrLong(), { size: 8, color: grey() }));
    pf.components.add(makeText(6, 0.1, 6, 0.5, 'Logeas Informatique - Provisoire', { size: 8, align: 'center', color: grey() }));
    pf.components.add(makeText(12, 0.1, 6, 0.5, 'Page {PageNumber} sur {TotalPageCount}', { size: 8, align: 'right', color: grey() }));

    return report;
  }

  /** (Ré)injecte les données dans un rapport (table "GrandLivre"). */
  applyData(report: any, dataObject: object): void {
    const dataSet = new Stimulsoft.System.Data.DataSet('GrandLivreData');
    dataSet.readJson(dataObject);
    report.dictionary.databases.clear();
    report.regData('GrandLivreData', 'GrandLivreData', dataSet);
    report.dictionary.synchronize();
  }

  /** Charge un modèle .mrt (JSON) sauvegardé depuis le designer, puis
   *  réinjecte les données courantes. */
  loadTemplate(mrt: string | object, dataObject: object): any {
    const report = Stimulsoft.Report.StiReport.createNewReport();
    report.load(mrt);
    this.applyData(report, dataObject);
    return report;
  }

  /** Date du jour au format court français : « 01/06/2026 ».
   *  Calculée en TS car les fonctions d'expression Stimulsoft posaient problème. */
  private todayFr(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
  }

  /** Date du jour au format long français : « 1 juin 2026 » (pied de page). */
  private todayFrLong(): string {
    return new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  /** Format monétaire français (« 1 234,56 € ») utilisé par les totaux du moteur. */
  private currencyFormat(): any {
    const f = new Stimulsoft.Report.Components.TextFormats.StiCurrencyFormatService();
    f.symbol = '€';
    f.decimalDigits = 2;
    f.decimalSeparator = ',';
    f.groupSeparator = ' ';
    f.useGroupSeparator = true;
    f.positivePattern = 3; // "n $"
    f.negativePattern = 8; // "-n $"
    return f;
  }
}
