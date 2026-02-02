import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ReportType } from '@/components/qhse/QHSEReportsModule';

interface QHSEReportData {
  user: any;
  data: {
    incidents: any[];
    audits: any[];
    trainings: any[];
    medicalWaste: any[];
    risks: any[];
    sterilizationCycles: any[];
    sterilizationRegister: any[];
    laundryTracking: any[];
  };
  stats: any;
  dateRange: {
    start: string;
    end: string;
  };
}

const createReportHTML = (
  reportType: ReportType,
  data: QHSEReportData
): HTMLDivElement => {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '800px';
  container.style.padding = '20px';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.color = '#333';
  container.style.backgroundColor = '#ffffff';

  const today = new Date();
  let html = `
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 2px solid #06b6d4; padding-bottom: 15px;">
      <h1 style="font-size: 28px; margin: 0; color: #06b6d4;">Rapport QHSE - ${getReportTypeTitle(reportType)}</h1>
      <p style="font-size: 14px; margin: 5px 0; color: #666;">
        Généré le ${format(today, 'dd MMMM yyyy à HH:mm', { locale: fr })}
      </p>
      <p style="font-size: 14px; margin: 5px 0; color: #666;">
        Par: ${data.user.civility} ${data.user.first_name} ${data.user.last_name} (${data.user.role})
      </p>
      <p style="font-size: 14px; margin: 5px 0; color: #666;">
        Période: Du ${format(new Date(data.dateRange.start), 'dd MMMM yyyy', { locale: fr })} au ${format(new Date(data.dateRange.end), 'dd MMMM yyyy', { locale: fr })}
      </p>
    </div>
  `;

  // Génération du contenu selon le type de rapport
  switch (reportType) {
    case 'overview':
      html += generateOverviewReport(data);
      break;
    case 'incidents':
      html += generateIncidentsReport(data);
      break;
    case 'audits':
      html += generateAuditsReport(data);
      break;
    case 'trainings':
      html += generateTrainingsReport(data);
      break;
    case 'medical_waste':
      html += generateMedicalWasteReport(data);
      break;
    case 'risks':
      html += generateRisksReport(data);
      break;
    case 'sterilization':
      html += generateSterilizationReport(data);
      break;
    case 'laundry':
      html += generateLaundryReport(data);
      break;
    case 'comprehensive':
      html += generateComprehensiveReport(data);
      break;
  }

  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
};

const getReportTypeTitle = (reportType: ReportType): string => {
  const titles: Record<ReportType, string> = {
    'overview': 'Vue d\'ensemble',
    'incidents': 'Incidents & Tickets',
    'audits': 'Audits & Inspections',
    'trainings': 'Formations',
    'medical_waste': 'Déchets Médicaux',
    'risks': 'Gestion des Risques',
    'sterilization': 'Stérilisation',
    'laundry': 'Suivi de Linge',
    'comprehensive': 'Rapport Complet',
  };
  return titles[reportType] || 'Rapport QHSE';
};

const generateOverviewReport = (data: QHSEReportData): string => {
  const { stats } = data;
  
  return `
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 20px; color: #06b6d4; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">
        Vue d'Ensemble QHSE
      </h2>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
        <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; border-left: 4px solid #06b6d4;">
          <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Incidents</div>
          <div style="font-size: 24px; font-weight: bold; color: #06b6d4;">${stats.incidents.total}</div>
        </div>
        <div style="background: #dcfce7; padding: 15px; border-radius: 8px; border-left: 4px solid #10b981;">
          <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Audits</div>
          <div style="font-size: 24px; font-weight: bold; color: #10b981;">${stats.audits.total}</div>
        </div>
        <div style="background: #f3e8ff; padding: 15px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
          <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Formations</div>
          <div style="font-size: 24px; font-weight: bold; color: #8b5cf6;">${stats.trainings.total}</div>
        </div>
        <div style="background: #fee2e2; padding: 15px; border-radius: 8px; border-left: 4px solid #ef4444;">
          <div style="font-size: 12px; color: #666; margin-bottom: 5px;">Risques</div>
          <div style="font-size: 24px; font-weight: bold; color: #ef4444;">${stats.risks.total}</div>
        </div>
      </div>
    </div>
  `;
};

const generateIncidentsReport = (data: QHSEReportData): string => {
  const { data: reportData, stats } = data;
  const incidents = reportData.incidents;
  
  let html = `
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 20px; color: #06b6d4; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">
        Statistiques des Incidents
      </h2>
      <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="background: #e0f2fe; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Total</div>
          <div style="font-size: 20px; font-weight: bold; color: #06b6d4;">${stats.incidents.total}</div>
        </div>
        <div style="background: #dbeafe; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Nouveaux</div>
          <div style="font-size: 20px; font-weight: bold; color: #3b82f6;">${stats.incidents.nouveau}</div>
        </div>
        <div style="background: #fef3c7; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">En Cours</div>
          <div style="font-size: 20px; font-weight: bold; color: #eab308;">${stats.incidents.cours}</div>
        </div>
        <div style="background: #d1fae5; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Traités</div>
          <div style="font-size: 20px; font-weight: bold; color: #10b981;">${stats.incidents.traite}</div>
        </div>
        <div style="background: #dcfce7; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Résolus</div>
          <div style="font-size: 20px; font-weight: bold; color: #22c55e;">${stats.incidents.resolu}</div>
        </div>
      </div>
    </div>
  `;

  if (incidents.length > 0) {
    html += generateIncidentsTable(incidents.slice(0, 50), 'Liste des Incidents');
  }

  return html;
};

const generateAuditsReport = (data: QHSEReportData): string => {
  const { data: reportData, stats } = data;
  const audits = reportData.audits;
  
  let html = `
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 20px; color: #06b6d4; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">
        Statistiques des Audits
      </h2>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="background: #dcfce7; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Total</div>
          <div style="font-size: 20px; font-weight: bold; color: #10b981;">${stats.audits.total}</div>
        </div>
        <div style="background: #dbeafe; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Planifiés</div>
          <div style="font-size: 20px; font-weight: bold; color: #3b82f6;">${stats.audits.planifie}</div>
        </div>
        <div style="background: #fef3c7; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">En Cours</div>
          <div style="font-size: 20px; font-weight: bold; color: #eab308;">${stats.audits.en_cours}</div>
        </div>
        <div style="background: #d1fae5; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Terminés</div>
          <div style="font-size: 20px; font-weight: bold; color: #22c55e;">${stats.audits.termine}</div>
        </div>
      </div>
    </div>
  `;

  if (audits.length > 0) {
    html += generateAuditsTable(audits.slice(0, 30), 'Liste des Audits');
  }

  return html;
};

const generateTrainingsReport = (data: QHSEReportData): string => {
  const { data: reportData, stats } = data;
  const trainings = reportData.trainings;
  
  let html = `
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 20px; color: #06b6d4; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">
        Statistiques des Formations
      </h2>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="background: #f3e8ff; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Total</div>
          <div style="font-size: 20px; font-weight: bold; color: #8b5cf6;">${stats.trainings.total}</div>
        </div>
        <div style="background: #ddd6fe; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Planifiées</div>
          <div style="font-size: 20px; font-weight: bold; color: #7c3aed;">${stats.trainings.planifiee}</div>
        </div>
        <div style="background: #fef3c7; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">En Cours</div>
          <div style="font-size: 20px; font-weight: bold; color: #eab308;">${stats.trainings.en_cours}</div>
        </div>
        <div style="background: #d1fae5; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Terminées</div>
          <div style="font-size: 20px; font-weight: bold; color: #22c55e;">${stats.trainings.terminee}</div>
        </div>
      </div>
    </div>
  `;

  if (trainings.length > 0) {
    html += generateTrainingsTable(trainings.slice(0, 30), 'Liste des Formations');
  }

  return html;
};

const generateMedicalWasteReport = (data: QHSEReportData): string => {
  const { data: reportData, stats } = data;
  const waste = reportData.medicalWaste;
  
  let html = `
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 20px; color: #06b6d4; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">
        Statistiques des Déchets Médicaux
      </h2>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="background: #fff7ed; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Total</div>
          <div style="font-size: 20px; font-weight: bold; color: #f97316;">${stats.medicalWaste.total}</div>
        </div>
        <div style="background: #fef3c7; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Collectés</div>
          <div style="font-size: 20px; font-weight: bold; color: #eab308;">${stats.medicalWaste.collecte}</div>
        </div>
        <div style="background: #fef9c3; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Stockés</div>
          <div style="font-size: 20px; font-weight: bold; color: #facc15;">${stats.medicalWaste.stocke}</div>
        </div>
        <div style="background: #d1fae5; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Traités</div>
          <div style="font-size: 20px; font-weight: bold; color: #22c55e;">${stats.medicalWaste.traite}</div>
        </div>
      </div>
    </div>
  `;

  if (waste.length > 0) {
    html += generateMedicalWasteTable(waste.slice(0, 30), 'Liste des Déchets Médicaux');
  }

  return html;
};

const generateRisksReport = (data: QHSEReportData): string => {
  const { data: reportData, stats } = data;
  const risks = reportData.risks;
  
  let html = `
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 20px; color: #06b6d4; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">
        Statistiques des Risques
      </h2>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="background: #fee2e2; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Total</div>
          <div style="font-size: 20px; font-weight: bold; color: #ef4444;">${stats.risks.total}</div>
        </div>
        <div style="background: #dbeafe; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Identifiés</div>
          <div style="font-size: 20px; font-weight: bold; color: #3b82f6;">${stats.risks.identifie}</div>
        </div>
        <div style="background: #fef3c7; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Évalués</div>
          <div style="font-size: 20px; font-weight: bold; color: #eab308;">${stats.risks.evalue}</div>
        </div>
        <div style="background: #fed7aa; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">En Traitement</div>
          <div style="font-size: 20px; font-weight: bold; color: #f97316;">${stats.risks.en_traitement}</div>
        </div>
      </div>
    </div>
  `;

  if (risks.length > 0) {
    html += generateRisksTable(risks.slice(0, 30), 'Liste des Risques');
  }

  return html;
};

const generateSterilizationReport = (data: QHSEReportData): string => {
  const { data: reportData, stats } = data;
  const cycles = reportData.sterilizationCycles;
  const register = reportData.sterilizationRegister;
  
  let html = `
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 20px; color: #06b6d4; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">
        Statistiques de Stérilisation
      </h2>
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px;">
        <div style="background: #cffafe; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Cycles de Stérilisation</div>
          <div style="font-size: 20px; font-weight: bold; color: #06b6d4;">${stats.sterilization.cycles}</div>
        </div>
        <div style="background: #a5f3fc; padding: 12px; border-radius: 8px; text-align: center;">
          <div style="font-size: 10px; color: #666; margin-bottom: 3px;">Registres</div>
          <div style="font-size: 20px; font-weight: bold; color: #0891b2;">${stats.sterilization.register}</div>
        </div>
      </div>
    </div>
  `;

  if (cycles.length > 0) {
    html += generateSterilizationCyclesTable(cycles.slice(0, 30), 'Cycles de Stérilisation');
  }

  if (register.length > 0) {
    html += generateSterilizationRegisterTable(register.slice(0, 30), 'Registre de Stérilisation');
  }

  return html;
};

const generateLaundryReport = (data: QHSEReportData): string => {
  const { data: reportData, stats } = data;
  const laundry = reportData.laundryTracking;
  
  let html = `
    <div style="margin-bottom: 30px;">
      <h2 style="font-size: 20px; color: #06b6d4; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-bottom: 15px;">
        Statistiques du Suivi de Linge
      </h2>
      <div style="background: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
        <div style="font-size: 12px; color: #666; margin-bottom: 3px;">Total des Suivis</div>
        <div style="font-size: 24px; font-weight: bold; color: #475569;">${stats.laundry.total}</div>
      </div>
    </div>
  `;

  if (laundry.length > 0) {
    html += generateLaundryTable(laundry.slice(0, 30), 'Liste des Suivis de Linge');
  }

  return html;
};

const generateComprehensiveReport = (data: QHSEReportData): string => {
  let html = generateOverviewReport(data);
  html += generateIncidentsReport(data);
  html += generateAuditsReport(data);
  html += generateTrainingsReport(data);
  html += generateMedicalWasteReport(data);
  html += generateRisksReport(data);
  html += generateSterilizationReport(data);
  html += generateLaundryReport(data);
  return html;
};

// Fonctions de génération de tableaux
const generateIncidentsTable = (incidents: any[], title: string): string => {
  if (incidents.length === 0) return '';

  return `
    <div style="margin-bottom: 30px; page-break-inside: avoid;">
      <h3 style="font-size: 18px; color: #374151; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
        ${title} (${incidents.length})
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Date</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Type</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Lieu</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Priorité</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Statut</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Description</th>
          </tr>
        </thead>
        <tbody>
          ${incidents.map((incident: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${format(new Date(incident.date_creation), 'dd/MM/yyyy HH:mm', { locale: fr })}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${incident.type}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${incident.lieu || '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; background: ${getPriorityColor(incident.priorite)}; color: white;">
                  ${incident.priorite}
                </span>
              </td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; background: ${getStatusColor(incident.statut)}; color: white;">
                  ${incident.statut}
                </span>
              </td>
              <td style="padding: 8px; border: 1px solid #d1d5db; max-width: 200px; word-wrap: break-word;">${(incident.description || '').substring(0, 100)}${incident.description && incident.description.length > 100 ? '...' : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const generateAuditsTable = (audits: any[], title: string): string => {
  if (audits.length === 0) return '';

  return `
    <div style="margin-bottom: 30px; page-break-inside: avoid;">
      <h3 style="font-size: 18px; color: #374151; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
        ${title} (${audits.length})
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Titre</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Type</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Date Planifiée</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Statut</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Scope</th>
          </tr>
        </thead>
        <tbody>
          ${audits.map((audit: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${audit.title}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${audit.audit_type}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${audit.planned_date ? format(new Date(audit.planned_date), 'dd/MM/yyyy', { locale: fr }) : '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; background: ${getAuditStatusColor(audit.status)}; color: white;">
                  ${audit.status}
                </span>
              </td>
              <td style="padding: 8px; border: 1px solid #d1d5db; max-width: 200px; word-wrap: break-word;">${(audit.scope || '').substring(0, 100)}${audit.scope && audit.scope.length > 100 ? '...' : ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const generateTrainingsTable = (trainings: any[], title: string): string => {
  if (trainings.length === 0) return '';

  return `
    <div style="margin-bottom: 30px; page-break-inside: avoid;">
      <h3 style="font-size: 18px; color: #374151; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
        ${title} (${trainings.length})
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Titre</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Catégorie</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Date Planifiée</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Type</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${trainings.map((training: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${training.title}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${training.category}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${training.planned_date ? format(new Date(training.planned_date), 'dd/MM/yyyy', { locale: fr }) : '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${training.training_type}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; background: ${getTrainingStatusColor(training.status)}; color: white;">
                  ${training.status}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const generateMedicalWasteTable = (waste: any[], title: string): string => {
  if (waste.length === 0) return '';

  return `
    <div style="margin-bottom: 30px; page-break-inside: avoid;">
      <h3 style="font-size: 18px; color: #374151; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
        ${title} (${waste.length})
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Type</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Quantité</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Date Collecte</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Lieu</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${waste.map((item: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${item.waste_type}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${item.quantity} ${item.unit}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${item.collection_date ? format(new Date(item.collection_date), 'dd/MM/yyyy', { locale: fr }) : '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${item.collection_location || '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; background: ${getWasteStatusColor(item.status)}; color: white;">
                  ${item.status}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const generateRisksTable = (risks: any[], title: string): string => {
  if (risks.length === 0) return '';

  return `
    <div style="margin-bottom: 30px; page-break-inside: avoid;">
      <h3 style="font-size: 18px; color: #374151; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
        ${title} (${risks.length})
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Titre</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Catégorie</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Niveau</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Probabilité</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Sévérité</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${risks.map((risk: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${risk.title}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${risk.risk_category}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; background: ${getRiskLevelColor(risk.risk_level)}; color: white;">
                  ${risk.risk_level}
                </span>
              </td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${risk.probability}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${risk.severity}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; background: ${getRiskStatusColor(risk.status)}; color: white;">
                  ${risk.status}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const generateSterilizationCyclesTable = (cycles: any[], title: string): string => {
  if (cycles.length === 0) return '';

  return `
    <div style="margin-bottom: 30px; page-break-inside: avoid;">
      <h3 style="font-size: 18px; color: #374151; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
        ${title} (${cycles.length})
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">N° Cycle</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Stérilisateur</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Type</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Début</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Statut</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Résultat</th>
          </tr>
        </thead>
        <tbody>
          ${cycles.map((cycle: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${cycle.cycle_number}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${cycle.sterilizer_id}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${cycle.sterilizer_type}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${cycle.start_time ? format(new Date(cycle.start_time), 'dd/MM/yyyy HH:mm', { locale: fr }) : '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; background: ${getCycleStatusColor(cycle.status)}; color: white;">
                  ${cycle.status}
                </span>
              </td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; background: ${getCycleResultColor(cycle.result)}; color: white;">
                  ${cycle.result}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const generateSterilizationRegisterTable = (registers: any[], title: string): string => {
  if (registers.length === 0) return '';

  return `
    <div style="margin-bottom: 30px; page-break-inside: avoid;">
      <h3 style="font-size: 18px; color: #374151; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
        ${title} (${registers.length})
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Date Cycle</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Service</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Opérateur</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Type Matériel</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Méthode</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${registers.map((register: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${register.date_cycle ? format(new Date(register.date_cycle), 'dd/MM/yyyy', { locale: fr }) : '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${register.service_concerne || '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${register.operateur_nom || '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${register.type_materiel || '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${register.methode_sterilisation || '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; background: ${getCycleStatusColor(register.status_cycle)}; color: white;">
                  ${register.status_cycle}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

const generateLaundryTable = (laundry: any[], title: string): string => {
  if (laundry.length === 0) return '';

  return `
    <div style="margin-bottom: 30px; page-break-inside: avoid;">
      <h3 style="font-size: 18px; color: #374151; margin-bottom: 15px; border-bottom: 2px solid #e5e7eb; padding-bottom: 8px;">
        ${title} (${laundry.length})
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
        <thead>
          <tr style="background-color: #f3f4f6;">
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Date Réception</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Service Origine</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Type Linge</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Poids/Qté</th>
            <th style="padding: 10px; border: 1px solid #d1d5db; text-align: left;">Statut</th>
          </tr>
        </thead>
        <tbody>
          ${laundry.map((item: any) => `
            <tr>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${item.date_reception ? format(new Date(item.date_reception), 'dd/MM/yyyy', { locale: fr }) : '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${item.service_origine || '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${item.type_linge || '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${item.poids_kg ? `${item.poids_kg} kg` : item.quantite ? `${item.quantite} unités` : '-'}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 10px; background: ${getLaundryStatusColor(item.status)}; color: white;">
                  ${item.status}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
};

// Fonctions utilitaires de couleurs
const getPriorityColor = (priority: string): string => {
  const colors: Record<string, string> = {
    critique: '#dc2626',
    haute: '#f97316',
    moyenne: '#eab308',
    faible: '#22c55e',
  };
  return colors[priority] || '#6b7280';
};

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    nouveau: '#3b82f6',
    cours: '#eab308',
    traite: '#14b8a6',
    resolu: '#22c55e',
    attente: '#f97316',
  };
  return colors[status] || '#6b7280';
};

const getAuditStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    planifié: '#3b82f6',
    en_cours: '#eab308',
    terminé: '#22c55e',
    annulé: '#6b7280',
  };
  return colors[status] || '#6b7280';
};

const getTrainingStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    planifiée: '#3b82f6',
    en_cours: '#eab308',
    terminée: '#22c55e',
    annulée: '#6b7280',
  };
  return colors[status] || '#6b7280';
};

const getWasteStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    collecté: '#3b82f6',
    stocké: '#eab308',
    traité: '#14b8a6',
    éliminé: '#22c55e',
  };
  return colors[status] || '#6b7280';
};

const getRiskLevelColor = (level: string): string => {
  const colors: Record<string, string> = {
    très_faible: '#22c55e',
    faible: '#3b82f6',
    moyen: '#eab308',
    élevé: '#f97316',
    très_élevé: '#dc2626',
  };
  return colors[level] || '#6b7280';
};

const getRiskStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    identifié: '#3b82f6',
    évalué: '#eab308',
    en_traitement: '#f97316',
    traité: '#22c55e',
    surveillé: '#06b6d4',
  };
  return colors[status] || '#6b7280';
};

const getCycleStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    en_cours: '#eab308',
    terminé: '#22c55e',
    échoué: '#dc2626',
    annulé: '#6b7280',
    interrompu: '#f97316',
  };
  return colors[status] || '#6b7280';
};

const getCycleResultColor = (result: string): string => {
  const colors: Record<string, string> = {
    conforme: '#22c55e',
    non_conforme: '#dc2626',
    en_attente: '#eab308',
  };
  return colors[result] || '#6b7280';
};

const getLaundryStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    en_reception: '#3b82f6',
    en_lavage: '#06b6d4',
    en_sechage: '#eab308',
    en_pliage: '#14b8a6',
    en_stockage: '#6b7280',
    en_distribution: '#22c55e',
    termine: '#22c55e',
    non_conforme: '#dc2626',
  };
  return colors[status] || '#6b7280';
};

export const generateQHSEReportPDF = async (
  reportType: ReportType,
  data: QHSEReportData
): Promise<void> => {
  const reportElement = createReportHTML(reportType, data);

  try {
    const canvas = await html2canvas(reportElement, { 
      scale: 2,
      useCORS: true,
      logging: false,
    });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    let heightLeft = pdfHeight;
    let position = 0;

    // Ajouter la première page
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();

    // Ajouter des pages supplémentaires si nécessaire
    while (heightLeft >= 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
    }

    const fileName = `rapport-qhse-${reportType}-${format(new Date(), 'yyyy-MM-dd-HHmm', { locale: fr })}.pdf`;
    pdf.save(fileName);
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  } finally {
    if (reportElement.parentNode) {
      document.body.removeChild(reportElement);
    }
  }
};



