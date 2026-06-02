import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Stimulsoft } from 'stimulsoft-reports-js/Scripts/stimulsoft.reports.js';
import 'stimulsoft-reports-js/Scripts/stimulsoft.viewer.js';
import { GrandLivreDataService } from '../services/grand-livre-data.service';
import { ReportBuilderService } from '../services/report-builder.service';

@Component({
  selector: 'app-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './viewer.component.html',
  styleUrl: './viewer.component.scss',
})
export class ReportViewerComponent implements OnInit, AfterViewInit {
  @ViewChild('host') host!: ElementRef<HTMLDivElement>;
  pieceColumnChoice = 'NumeroPiece';
  ecrituresCount = 0;
  isLoading = false;
  errorMessage = '';
  hasReport = false;
  customTemplateName: string | null = null;
  planCount = 0;
  private viewer: any;
  private viewReady = false;
  private viewerMounted = false;
  private customTemplate: string | null = null;

  constructor(
    public dataService: GrandLivreDataService,
    private reportBuilder: ReportBuilderService
  ) {}

  ngOnInit(): void {}

  ngAfterViewInit(): void {
    const options = new Stimulsoft.Viewer.StiViewerOptions();
    options.appearance.scrollbarsMode = true;
    options.toolbar.showDesignButton = false;
    this.viewer = new Stimulsoft.Viewer.StiViewer(options, 'StiViewer', false);
    this.viewReady = true;
    if (this.canRender()) this.renderReport();
  }

  private canRender(): boolean {
    return this.dataService.hasPlan() && this.dataService.hasEcritures();
  }

  async onPlanSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.errorMessage = '';
    this.isLoading = true;
    try {
      this.planCount = await this.dataService.loadPlanFromFile(file);
      if (this.canRender()) await this.renderReport();
    } catch (e: unknown) {
      this.errorMessage =
        e instanceof Error ? e.message : 'Plan comptable invalide';
    } finally {
      this.isLoading = false;
      input.value = '';
    }
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.errorMessage = '';
    this.isLoading = true;
    try {
      this.ecrituresCount = await this.dataService.loadEcrituresFromFile(file);
      if (this.canRender()) await this.renderReport();
    } catch (e: unknown) {
      this.errorMessage =
        e instanceof Error ? e.message : 'Erreur de chargement du fichier';
    } finally {
      this.isLoading = false;
      input.value = '';
    }
  }

  onPieceColumnChange(): void {
    if (this.canRender()) this.renderReport();
  }

  async onTemplateSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.errorMessage = '';
    this.isLoading = true;
    try {
      this.customTemplate = await file.text();
      this.customTemplateName = file.name;
      if (this.canRender()) {
        await this.renderReport();
      }
    } catch (e: unknown) {
      this.errorMessage =
        e instanceof Error ? e.message : 'Modèle .mrt invalide';
    } finally {
      this.isLoading = false;
      input.value = '';
    }
  }

  resetTemplate(): void {
    this.customTemplate = null;
    this.customTemplateName = null;
    if (this.canRender()) this.renderReport();
  }

  private async renderReport(): Promise<void> {
    if (!this.viewReady) return;
    const data = this.dataService.getDataObject();
    const report = this.customTemplate
      ? this.reportBuilder.loadTemplate(this.customTemplate, data)
      : this.reportBuilder.build(data, this.pieceColumnChoice);
    // Pré-rendu (pagination complète) avant affichage → nécessaire pour
    // {PageNumber} / {TotalPageCount}
    await report.renderAsync2();
    this.viewer.report = report;
    // Monter le viewer une seule fois ; les rendus suivants se font via
    // l'affectation de viewer.report (sinon le rendu ne se rafraîchit pas)
    if (!this.viewerMounted) {
      this.viewer.renderHtml(this.host.nativeElement);
      this.viewerMounted = true;
    }
    this.hasReport = true;
  }
}
