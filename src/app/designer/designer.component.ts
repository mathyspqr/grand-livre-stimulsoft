import {
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Stimulsoft } from 'stimulsoft-reports-js/Scripts/stimulsoft.reports.js';
import 'stimulsoft-reports-js/Scripts/stimulsoft.designer.js';
import { GrandLivreDataService } from '../services/grand-livre-data.service';
import { ReportBuilderService } from '../services/report-builder.service';

@Component({
  selector: 'app-designer',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './designer.component.html',
  styleUrl: './designer.component.scss',
})
export class ReportDesignerComponent implements OnInit, AfterViewInit {
  @ViewChild('host') host!: ElementRef<HTMLDivElement>;
  ecrituresCount = 0;
  isLoading = false;
  errorMessage = '';
  private designer: any;
  private viewReady = false;

  constructor(
    private dataService: GrandLivreDataService,
    private reportBuilder: ReportBuilderService
  ) {}

  ngOnInit(): void {
    // Le designer édite la mise en page : pas besoin des données réelles.
  }

  ngAfterViewInit(): void {
    const options = new Stimulsoft.Designer.StiDesignerOptions();
    options.appearance.fullScreenMode = false;
    this.designer = new Stimulsoft.Designer.StiDesigner(
      options,
      'StiDesigner',
      false
    );
    this.viewReady = true;
    this.loadReport();
  }

  async onFileSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.errorMessage = '';
    this.isLoading = true;
    try {
      this.ecrituresCount = await this.dataService.loadEcrituresFromFile(file);
      this.loadReport();
    } catch (e: unknown) {
      this.errorMessage =
        e instanceof Error ? e.message : 'Erreur de chargement du fichier';
    } finally {
      this.isLoading = false;
      input.value = '';
    }
  }

  private loadReport(): void {
    if (!this.viewReady) return;
    const data = this.dataService.getDataObject();
    const report = this.reportBuilder.build(data, 'NumeroPiece');
    this.designer.report = report;
    this.designer.renderHtml(this.host.nativeElement);
  }
}
