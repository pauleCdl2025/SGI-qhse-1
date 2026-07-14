import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Audit, User, Users } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { BRAND } from '@/lib/brand';

const LOGO_URL =
  typeof window !== 'undefined'
    ? `${window.location.origin}${BRAND.logoUrl}`
    : BRAND.logoUrl;

interface Finding {
  id: string;
  type: 'conformité' | 'non_conformité' | 'opportunité';
  description: string;
  severity?: 'mineure' | 'majeure' | 'critique';
  action_plan?: string;
}

const auditTypeLabels: Record<string, string> = {
  interne: "Audit Interne",
  externe: "Audit Externe",
  certification: "Audit Certification",
  inspection: "Inspection",
};

const statusLabels: Record<string, string> = {
  planifié: "Planifié",
  en_cours: "En cours",
  terminé: "Terminé",
  annulé: "Annulé",
};

const severityLabels: Record<string, string> = {
  mineure: "Mineure",
  majeure: "Majeure",
  critique: "Critique",
};

const createReportHTML = (audit: Audit, users?: Users, checklists?: any[], actionPlans?: any[]): HTMLDivElement => {
  const container = document.createElement('div');
  container.style.position = 'absolute';
  container.style.left = '-9999px';
  container.style.width = '210mm';
  container.style.minHeight = '297mm';
  container.style.padding = '20mm 15mm';
  container.style.fontFamily = '"Times New Roman", "DejaVu Serif", serif';
  container.style.color = '#1a1a1a';
  container.style.backgroundColor = '#ffffff';
  container.style.lineHeight = '1.6';

  // Parser les findings
  let findings: Finding[] = [];
  if (audit.findings) {
    try {
      const parsed = typeof audit.findings === 'string' 
        ? JSON.parse(audit.findings) 
        : audit.findings;
      if (Array.isArray(parsed)) {
        findings = parsed;
      }
    } catch (e) {
      console.error('Erreur lors du parsing des findings:', e);
    }
  }

  const createdByUser = users ? Object.values(users).find(u => u.id === audit.created_by) : null;
  const auditorUser = audit.auditor_id && users ? Object.values(users).find(u => u.id === audit.auditor_id) : null;

  const today = new Date();
  const reportNumber = `AUD-${format(audit.planned_date, 'yyyyMMdd')}-${audit.id.substring(0, 8).toUpperCase()}`;
  
  let html = `
    <!-- En-tête professionnel -->
    <div style="text-align: center; margin-bottom: 40px; padding-bottom: 25px; border-bottom: 4px solid #1e3a8a;">
      <div style="margin-bottom: 15px;">
        <img src="${LOGO_URL}" alt="Logo CDL" style="max-width: 100px; height: auto;" onerror="this.style.display='none';" />
      </div>
      <h1 style="font-size: 32px; margin: 15px 0 10px 0; color: #1e3a8a; font-weight: bold; letter-spacing: 1px; text-transform: uppercase;">
        RAPPORT D'AUDIT
      </h1>
      <div style="margin-top: 15px; padding: 12px; background-color: #f8f9fa; border-radius: 6px; display: inline-block;">
        <p style="font-size: 14px; margin: 3px 0; color: #1e3a8a; font-weight: 600;">
          Centre Diagnostic Libreville
        </p>
        <p style="font-size: 11px; margin: 3px 0; color: #64748b;">
          Libreville, Gabon
        </p>
      </div>
      <div style="margin-top: 20px; font-size: 10px; color: #64748b;">
        <p style="margin: 2px 0;">Référence: <strong>${reportNumber}</strong></p>
        <p style="margin: 2px 0;">Date de génération: ${format(today, 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
      </div>
    </div>

    <!-- Informations générales de l'audit -->
    <div style="margin-bottom: 35px;">
      <h2 style="font-size: 18px; color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
        1. INFORMATIONS GÉNÉRALES
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        <tr>
          <td style="padding: 12px; border: 1px solid #cbd5e1; background-color: #f1f5f9; font-weight: 600; width: 35%; color: #1e3a8a; font-size: 13px;">Référence de l'audit</td>
          <td style="padding: 12px; border: 1px solid #cbd5e1; width: 65%; font-size: 13px; font-weight: 600; color: #0f172a;">${reportNumber}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #cbd5e1; background-color: #f1f5f9; font-weight: 600; color: #1e3a8a; font-size: 13px;">Titre de l'audit</td>
          <td style="padding: 12px; border: 1px solid #cbd5e1; font-size: 13px;">${audit.title}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #cbd5e1; background-color: #f1f5f9; font-weight: 600; color: #1e3a8a; font-size: 13px;">Type d'audit</td>
          <td style="padding: 12px; border: 1px solid #cbd5e1; font-size: 13px;">${auditTypeLabels[audit.audit_type] || audit.audit_type}</td>
        </tr>
        <tr>
          <td style="padding: 12px; border: 1px solid #cbd5e1; background-color: #f1f5f9; font-weight: 600; color: #1e3a8a; font-size: 13px;">Date planifiée</td>
          <td style="padding: 12px; border: 1px solid #cbd5e1; font-size: 13px;">${format(audit.planned_date, 'dd MMMM yyyy', { locale: fr })}</td>
        </tr>
        ${audit.actual_date ? `
        <tr>
          <td style="padding: 12px; border: 1px solid #cbd5e1; background-color: #f1f5f9; font-weight: 600; color: #1e3a8a; font-size: 13px;">Date de réalisation</td>
          <td style="padding: 12px; border: 1px solid #cbd5e1; font-size: 13px;">${format(new Date(audit.actual_date), 'dd MMMM yyyy', { locale: fr })}</td>
        </tr>
        ` : ''}
        <tr>
          <td style="padding: 12px; border: 1px solid #cbd5e1; background-color: #f1f5f9; font-weight: 600; color: #1e3a8a; font-size: 13px;">Statut</td>
          <td style="padding: 12px; border: 1px solid #cbd5e1; font-size: 13px;">
            <span style="padding: 6px 12px; border-radius: 6px; background-color: ${
              audit.status === 'terminé' ? '#059669' : 
              audit.status === 'en_cours' ? '#d97706' : 
              audit.status === 'annulé' ? '#dc2626' : '#2563eb'
            }; color: white; font-size: 12px; font-weight: 600; display: inline-block;">
              ${statusLabels[audit.status] || audit.status}
            </span>
          </td>
        </tr>
        ${audit.audited_department ? `
        <tr>
          <td style="padding: 12px; border: 1px solid #cbd5e1; background-color: #f1f5f9; font-weight: 600; color: #1e3a8a; font-size: 13px;">Département/Service audité</td>
          <td style="padding: 12px; border: 1px solid #cbd5e1; font-size: 13px;">${audit.audited_department}</td>
        </tr>
        ` : ''}
        ${createdByUser ? `
        <tr>
          <td style="padding: 12px; border: 1px solid #cbd5e1; background-color: #f1f5f9; font-weight: 600; color: #1e3a8a; font-size: 13px;">Responsable de l'audit</td>
          <td style="padding: 12px; border: 1px solid #cbd5e1; font-size: 13px;">${createdByUser.civility} ${createdByUser.first_name} ${createdByUser.last_name}</td>
        </tr>
        ` : ''}
        ${auditorUser ? `
        <tr>
          <td style="padding: 12px; border: 1px solid #cbd5e1; background-color: #f1f5f9; font-weight: 600; color: #1e3a8a; font-size: 13px;">Auditeur principal</td>
          <td style="padding: 12px; border: 1px solid #cbd5e1; font-size: 13px;">${auditorUser.civility} ${auditorUser.first_name} ${auditorUser.last_name}</td>
        </tr>
        ` : ''}
      </table>
    </div>

    <!-- Périmètre -->
    <div style="margin-bottom: 35px;">
      <h2 style="font-size: 18px; color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
        2. PÉRIMÈTRE ET OBJECTIFS DE L'AUDIT
      </h2>
      <div style="padding: 20px; background: linear-gradient(to right, #f8fafc 0%, #ffffff 100%); border-left: 5px solid #1e3a8a; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <p style="margin: 0; line-height: 1.8; white-space: pre-wrap; font-size: 13px; text-align: justify; color: #334155;">${audit.scope || 'Non spécifié'}</p>
      </div>
    </div>

    <!-- Statistiques -->
    <div style="margin-bottom: 35px;">
      <h2 style="font-size: 18px; color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
        3. SYNTHÈSE DES CONSTATS
      </h2>
      <div style="display: flex; gap: 20px; margin-bottom: 25px;">
        <div style="flex: 1; padding: 20px; background: linear-gradient(135deg, #fee2e2 0%, #fef2f2 100%); border: 3px solid #dc2626; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(220, 38, 38, 0.2);">
          <div style="font-size: 42px; font-weight: bold; color: #dc2626; margin-bottom: 8px; line-height: 1;">
            ${findings.filter(f => f.type === 'non_conformité').length}
          </div>
          <div style="font-size: 13px; color: #991b1b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Non-conformités</div>
          <div style="font-size: 11px; color: #7f1d1d; margin-top: 5px;">Identifiées</div>
        </div>
        <div style="flex: 1; padding: 20px; background: linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%); border: 3px solid #16a34a; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(22, 163, 74, 0.2);">
          <div style="font-size: 42px; font-weight: bold; color: #16a34a; margin-bottom: 8px; line-height: 1;">
            ${findings.filter(f => f.type === 'conformité').length}
          </div>
          <div style="font-size: 13px; color: #166534; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Conformités</div>
          <div style="font-size: 11px; color: #14532d; margin-top: 5px;">Constatées</div>
        </div>
        <div style="flex: 1; padding: 20px; background: linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%); border: 3px solid #2563eb; border-radius: 10px; text-align: center; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.2);">
          <div style="font-size: 42px; font-weight: bold; color: #2563eb; margin-bottom: 8px; line-height: 1;">
            ${findings.filter(f => f.type === 'opportunité').length}
          </div>
          <div style="font-size: 13px; color: #1e40af; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Opportunités</div>
          <div style="font-size: 11px; color: #1e3a8a; margin-top: 5px;">D'amélioration</div>
        </div>
      </div>
      ${checklists && checklists.length > 0 ? `
      <div style="margin-top: 20px; padding: 15px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #cbd5e1;">
        <p style="margin: 0; font-size: 13px; color: #475569; font-weight: 600;">
          📋 <strong>Checklist d'audit:</strong> ${checklists.length} point(s) vérifié(s) | 
          Conformes: ${checklists.filter(c => c.compliance_status === 'conforme').length} | 
          Non-conformes: ${checklists.filter(c => c.compliance_status === 'non_conforme').length}
        </p>
      </div>
      ` : ''}
    </div>
  `;

  // Constats détaillés
  if (findings.length > 0) {
    html += `
      <div style="margin-bottom: 35px;">
        <h2 style="font-size: 18px; color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
          4. ANALYSE DÉTAILLÉE DES CONSTATS
        </h2>
    `;

    // Non-conformités
    const nonConformities = findings.filter(f => f.type === 'non_conformité');
    if (nonConformities.length > 0) {
      html += `
        <div style="margin-bottom: 25px;">
          <h3 style="font-size: 16px; color: #dc2626; margin-bottom: 15px; font-weight: bold; padding: 10px; background-color: #fee2e2; border-left: 5px solid #dc2626; border-radius: 4px;">
            ⚠️ NON-CONFORMITÉS IDENTIFIÉES (${nonConformities.length})
          </h3>
      `;
      nonConformities.forEach((finding, index) => {
        const severityColor = finding.severity === 'critique' ? '#dc2626' : finding.severity === 'majeure' ? '#ea580c' : '#f59e0b';
        html += `
          <div style="margin-bottom: 20px; padding: 18px; background: linear-gradient(to right, #fef2f2 0%, #ffffff 100%); border-left: 5px solid ${severityColor}; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div style="font-weight: bold; color: #991b1b; font-size: 14px;">
                NC-${String(index + 1).padStart(2, '0')}
              </div>
              ${finding.severity ? `
              <span style="padding: 4px 10px; border-radius: 4px; background-color: ${severityColor}; color: white; font-size: 11px; font-weight: 600; text-transform: uppercase;">
                ${severityLabels[finding.severity] || finding.severity}
              </span>
              ` : ''}
            </div>
            <div style="margin-bottom: 10px; line-height: 1.8; font-size: 13px; color: #334155; text-align: justify;">
              <strong style="color: #1e3a8a;">Description:</strong><br/>
              <span style="white-space: pre-wrap; margin-top: 5px; display: block;">${finding.description}</span>
            </div>
            ${finding.action_plan ? `
            <div style="margin-top: 12px; padding: 12px; background-color: #f8fafc; border-top: 2px solid #e2e8f0; border-radius: 4px;">
              <strong style="color: #1e3a8a; font-size: 12px;">Plan d'action proposé:</strong><br/>
              <span style="white-space: pre-wrap; font-size: 12px; color: #475569; margin-top: 5px; display: block;">${finding.action_plan}</span>
            </div>
            ` : ''}
          </div>
        `;
      });
      html += `</div>`;
    }

    // Conformités
    const conformities = findings.filter(f => f.type === 'conformité');
    if (conformities.length > 0) {
      html += `
        <div style="margin-bottom: 25px;">
          <h3 style="font-size: 16px; color: #16a34a; margin-bottom: 15px; font-weight: bold; padding: 10px; background-color: #dcfce7; border-left: 5px solid #16a34a; border-radius: 4px;">
            ✅ POINTS DE CONFORMITÉ (${conformities.length})
          </h3>
      `;
      conformities.forEach((finding, index) => {
        html += `
          <div style="margin-bottom: 18px; padding: 18px; background: linear-gradient(to right, #f0fdf4 0%, #ffffff 100%); border-left: 5px solid #16a34a; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="font-weight: bold; color: #166534; margin-bottom: 10px; font-size: 14px;">
              C-${String(index + 1).padStart(2, '0')}
            </div>
            <div style="margin-bottom: 8px; line-height: 1.8; font-size: 13px; color: #334155; text-align: justify;">
              <strong style="color: #1e3a8a;">Description:</strong><br/>
              <span style="white-space: pre-wrap; margin-top: 5px; display: block;">${finding.description}</span>
            </div>
            ${finding.action_plan ? `
            <div style="margin-top: 12px; padding: 12px; background-color: #f8fafc; border-top: 2px solid #cbd5e1; border-radius: 4px;">
              <strong style="color: #1e3a8a; font-size: 12px;">Recommandation:</strong><br/>
              <span style="white-space: pre-wrap; font-size: 12px; color: #475569; margin-top: 5px; display: block;">${finding.action_plan}</span>
            </div>
            ` : ''}
          </div>
        `;
      });
      html += `</div>`;
    }

    // Opportunités
    const opportunities = findings.filter(f => f.type === 'opportunité');
    if (opportunities.length > 0) {
      html += `
        <div style="margin-bottom: 25px;">
          <h3 style="font-size: 16px; color: #2563eb; margin-bottom: 15px; font-weight: bold; padding: 10px; background-color: #dbeafe; border-left: 5px solid #2563eb; border-radius: 4px;">
            💡 OPPORTUNITÉS D'AMÉLIORATION (${opportunities.length})
          </h3>
      `;
      opportunities.forEach((finding, index) => {
        html += `
          <div style="margin-bottom: 18px; padding: 18px; background: linear-gradient(to right, #eff6ff 0%, #ffffff 100%); border-left: 5px solid #2563eb; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="font-weight: bold; color: #1e40af; margin-bottom: 10px; font-size: 14px;">
              OI-${String(index + 1).padStart(2, '0')}
            </div>
            <div style="margin-bottom: 8px; line-height: 1.8; font-size: 13px; color: #334155; text-align: justify;">
              <strong style="color: #1e3a8a;">Description:</strong><br/>
              <span style="white-space: pre-wrap; margin-top: 5px; display: block;">${finding.description}</span>
            </div>
            ${finding.action_plan ? `
            <div style="margin-top: 12px; padding: 12px; background-color: #f8fafc; border-top: 2px solid #cbd5e1; border-radius: 4px;">
              <strong style="color: #1e3a8a; font-size: 12px;">Plan d'amélioration:</strong><br/>
              <span style="white-space: pre-wrap; font-size: 12px; color: #475569; margin-top: 5px; display: block;">${finding.action_plan}</span>
            </div>
            ` : ''}
          </div>
        `;
      });
      html += `</div>`;
    }

    html += `</div>`;
  } else {
    html += `
      <div style="margin-bottom: 35px;">
        <h2 style="font-size: 18px; color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
          4. ANALYSE DÉTAILLÉE DES CONSTATS
        </h2>
        <div style="padding: 30px; text-align: center; color: #64748b; background: linear-gradient(to right, #f8fafc 0%, #ffffff 100%); border: 2px dashed #cbd5e1; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; font-style: italic;">Aucun constat enregistré pour cet audit.</p>
        </div>
      </div>
    `;
  }

  // Section Checklists
  if (checklists && checklists.length > 0) {
    html += `
      <div style="margin-bottom: 35px;">
        <h2 style="font-size: 18px; color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
          5. CHECKLIST D'AUDIT
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <thead>
            <tr style="background-color: #1e3a8a; color: white;">
              <th style="padding: 12px; border: 1px solid #1e3a8a; text-align: left; font-size: 12px; font-weight: 600;">#</th>
              <th style="padding: 12px; border: 1px solid #1e3a8a; text-align: left; font-size: 12px; font-weight: 600;">Question / Exigence</th>
              <th style="padding: 12px; border: 1px solid #1e3a8a; text-align: center; font-size: 12px; font-weight: 600; width: 120px;">Statut</th>
            </tr>
          </thead>
          <tbody>
    `;
    checklists.forEach((item, index) => {
      const statusColor = item.compliance_status === 'conforme' ? '#16a34a' : 
                         item.compliance_status === 'non_conforme' ? '#dc2626' : 
                         item.compliance_status === 'non_applicable' ? '#64748b' : '#f59e0b';
      const statusBg = item.compliance_status === 'conforme' ? '#dcfce7' : 
                       item.compliance_status === 'non_conforme' ? '#fee2e2' : 
                       item.compliance_status === 'non_applicable' ? '#f1f5f9' : '#fef3c7';
      const statusLabel = item.compliance_status === 'conforme' ? 'Conforme' : 
                         item.compliance_status === 'non_conforme' ? 'Non conforme' : 
                         item.compliance_status === 'non_applicable' ? 'N/A' : 'Non évalué';
      
      html += `
        <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f8fafc'};">
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 12px; font-weight: 600; color: #475569;">${index + 1}</td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 12px; color: #334155;">
            <div style="font-weight: 600; margin-bottom: 4px;">${item.question}</div>
            ${item.requirement ? `<div style="font-size: 11px; color: #64748b; font-style: italic;">${item.requirement}</div>` : ''}
            ${item.observation ? `<div style="font-size: 11px; color: #475569; margin-top: 4px; padding: 6px; background-color: #f1f5f9; border-radius: 4px;">${item.observation}</div>` : ''}
          </td>
          <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center;">
            <span style="padding: 6px 12px; border-radius: 6px; background-color: ${statusBg}; color: ${statusColor}; font-size: 11px; font-weight: 600; display: inline-block;">
              ${statusLabel}
            </span>
          </td>
        </tr>
      `;
    });
    html += `
          </tbody>
        </table>
      </div>
    `;
  }

  // Section Plans d'action
  if (actionPlans && actionPlans.length > 0) {
    html += `
      <div style="margin-bottom: 35px;">
        <h2 style="font-size: 18px; color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
          6. PLANS D'ACTION
        </h2>
    `;
    actionPlans.forEach((plan, index) => {
      const priorityColor = plan.priority === 'critique' ? '#dc2626' : 
                           plan.priority === 'haute' ? '#ea580c' : 
                           plan.priority === 'moyenne' ? '#f59e0b' : '#16a34a';
      const typeColor = plan.action_type === 'corrective' ? '#dc2626' : 
                       plan.action_type === 'preventive' ? '#2563eb' : '#16a34a';
      const statusColor = plan.status === 'terminé' ? '#16a34a' : 
                         plan.status === 'en_cours' ? '#f59e0b' : 
                         plan.status === 'verifié' ? '#059669' : '#64748b';
      
      const assignedUser = plan.assigned_to_name || (plan.assigned_to && users ? 
        Object.values(users).find(u => u.id === plan.assigned_to) : null);
      const assignedName = assignedUser ? 
        (typeof assignedUser === 'string' ? assignedUser : `${assignedUser.civility} ${assignedUser.first_name} ${assignedUser.last_name}`) : 
        'Non assigné';
      
      html += `
        <div style="margin-bottom: 20px; padding: 20px; background: linear-gradient(to right, #f8fafc 0%, #ffffff 100%); border-left: 5px solid ${typeColor}; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <div>
              <div style="font-weight: bold; color: #1e3a8a; font-size: 15px; margin-bottom: 5px;">
                PA-${String(index + 1).padStart(2, '0')}: ${plan.title}
              </div>
              <div style="display: flex; gap: 10px; margin-top: 8px; flex-wrap: wrap;">
                <span style="padding: 4px 10px; border-radius: 4px; background-color: ${typeColor === '#dc2626' ? '#fee2e2' : typeColor === '#2563eb' ? '#dbeafe' : '#dcfce7'}; color: ${typeColor}; font-size: 11px; font-weight: 600;">
                  ${plan.action_type === 'corrective' ? '🔧 Corrective' : plan.action_type === 'preventive' ? '🛡️ Préventive' : '📈 Amélioration'}
                </span>
                <span style="padding: 4px 10px; border-radius: 4px; background-color: ${priorityColor === '#dc2626' ? '#fee2e2' : priorityColor === '#ea580c' ? '#fed7aa' : priorityColor === '#f59e0b' ? '#fef3c7' : '#dcfce7'}; color: ${priorityColor}; font-size: 11px; font-weight: 600;">
                  ${plan.priority === 'critique' ? '🔴 Critique' : plan.priority === 'haute' ? '🟠 Haute' : plan.priority === 'moyenne' ? '🟡 Moyenne' : '🟢 Faible'}
                </span>
                <span style="padding: 4px 10px; border-radius: 4px; background-color: ${statusColor === '#16a34a' ? '#dcfce7' : statusColor === '#f59e0b' ? '#fef3c7' : statusColor === '#059669' ? '#d1fae5' : '#f1f5f9'}; color: ${statusColor}; font-size: 11px; font-weight: 600;">
                  ${plan.status === 'planifié' ? '📅 Planifié' : plan.status === 'en_cours' ? '⏳ En cours' : plan.status === 'terminé' ? '✅ Terminé' : plan.status === 'verifié' ? '✓ Vérifié' : '❌ Annulé'}
                </span>
              </div>
            </div>
          </div>
          <div style="margin-bottom: 12px; line-height: 1.8; font-size: 13px; color: #334155; text-align: justify;">
            <strong style="color: #1e3a8a;">Description:</strong><br/>
            <span style="white-space: pre-wrap; margin-top: 5px; display: block;">${plan.description}</span>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; padding-top: 15px; border-top: 2px solid #e2e8f0;">
            <div>
              <strong style="color: #1e3a8a; font-size: 12px;">Assigné à:</strong><br/>
              <span style="font-size: 12px; color: #475569;">${assignedName}</span>
            </div>
            ${plan.due_date ? `
            <div>
              <strong style="color: #1e3a8a; font-size: 12px;">Échéance:</strong><br/>
              <span style="font-size: 12px; color: #475569;">${format(new Date(plan.due_date), 'dd MMMM yyyy', { locale: fr })}</span>
            </div>
            ` : ''}
          </div>
          ${plan.notes ? `
          <div style="margin-top: 12px; padding: 12px; background-color: #f8fafc; border-radius: 4px; border-left: 3px solid #cbd5e1;">
            <strong style="color: #1e3a8a; font-size: 12px;">Notes:</strong><br/>
            <span style="white-space: pre-wrap; font-size: 12px; color: #475569; margin-top: 5px; display: block;">${plan.notes}</span>
          </div>
          ` : ''}
        </div>
      `;
    });
    html += `</div>`;
  }

  // Conclusion
  html += `
    <div style="margin-bottom: 35px;">
      <h2 style="font-size: 18px; color: #1e3a8a; border-bottom: 3px solid #1e3a8a; padding-bottom: 8px; margin-bottom: 20px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
        ${actionPlans && actionPlans.length > 0 ? '7. ' : checklists && checklists.length > 0 ? '6. ' : '5. '}CONCLUSION ET RECOMMANDATIONS
      </h2>
      <div style="padding: 20px; background: linear-gradient(to right, #f8fafc 0%, #ffffff 100%); border-left: 5px solid #1e3a8a; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
        <p style="margin: 0 0 15px 0; line-height: 1.8; font-size: 13px; color: #334155; text-align: justify;">
          L'audit réalisé le <strong>${audit.actual_date ? format(new Date(audit.actual_date), 'dd MMMM yyyy', { locale: fr }) : format(audit.planned_date, 'dd MMMM yyyy', { locale: fr })}</strong> 
          a permis d'identifier <strong style="color: #dc2626;">${findings.filter(f => f.type === 'non_conformité').length} non-conformité(s)</strong>, 
          de constater <strong style="color: #16a34a;">${findings.filter(f => f.type === 'conformité').length} point(s) de conformité</strong>, et 
          de proposer <strong style="color: #2563eb;">${findings.filter(f => f.type === 'opportunité').length} opportunité(s) d'amélioration</strong>.
        </p>
        ${findings.filter(f => f.type === 'non_conformité').length > 0 ? `
        <div style="margin-top: 15px; padding: 15px; background-color: #fef2f2; border-left: 4px solid #dc2626; border-radius: 6px;">
          <p style="margin: 0; line-height: 1.8; font-size: 13px; color: #991b1b; font-weight: 600;">
            ⚠️ <strong>Actions requises:</strong> Les non-conformités identifiées nécessitent la mise en place immédiate de plans d'action correctifs 
            et préventifs pour assurer la conformité continue et prévenir toute récurrence.
          </p>
        </div>
        ` : ''}
        ${actionPlans && actionPlans.length > 0 ? `
        <div style="margin-top: 15px; padding: 15px; background-color: #eff6ff; border-left: 4px solid #2563eb; border-radius: 6px;">
          <p style="margin: 0; line-height: 1.8; font-size: 13px; color: #1e40af;">
            📋 <strong>Suivi des actions:</strong> ${actionPlans.length} plan(s) d'action ${actionPlans.filter(p => p.status === 'terminé').length > 0 ? `dont ${actionPlans.filter(p => p.status === 'terminé').length} terminé(s)` : 'en cours de mise en œuvre'}. 
            Un suivi régulier est recommandé pour assurer leur complétion dans les délais impartis.
          </p>
        </div>
        ` : ''}
        <p style="margin: 15px 0 0 0; line-height: 1.8; font-size: 13px; color: #334155; text-align: justify; font-style: italic;">
          Le présent rapport constitue un document de référence pour le suivi de la conformité et l'amélioration continue 
          des processus au sein du Centre Diagnostic Libreville.
        </p>
      </div>
    </div>

    <!-- Signatures -->
    <div style="margin-top: 50px; margin-bottom: 30px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
        <div style="text-align: center;">
          <div style="margin-bottom: 60px; border-top: 2px solid #1e3a8a; width: 200px; margin: 0 auto; padding-top: 10px;">
            <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">Auditeur</p>
            ${auditorUser ? `<p style="margin: 5px 0 0 0; font-size: 11px; color: #334155;">${auditorUser.civility} ${auditorUser.first_name} ${auditorUser.last_name}</p>` : ''}
          </div>
        </div>
        <div style="text-align: center;">
          <div style="margin-bottom: 60px; border-top: 2px solid #1e3a8a; width: 200px; margin: 0 auto; padding-top: 10px;">
            <p style="margin: 0; font-size: 12px; color: #64748b; font-weight: 600;">Responsable QHSE</p>
            ${createdByUser ? `<p style="margin: 5px 0 0 0; font-size: 11px; color: #334155;">${createdByUser.civility} ${createdByUser.first_name} ${createdByUser.last_name}</p>` : ''}
          </div>
        </div>
      </div>
    </div>

    <!-- Pied de page -->
    <div style="margin-top: 50px; padding-top: 25px; border-top: 3px solid #1e3a8a; text-align: center; color: #64748b; font-size: 10px; background-color: #f8fafc; padding: 20px; border-radius: 6px;">
      <p style="margin: 3px 0; font-weight: 600; color: #1e3a8a;">Centre Diagnostic Libreville</p>
      <p style="margin: 3px 0;">Libreville, Gabon</p>
      <p style="margin: 8px 0 3px 0; padding-top: 8px; border-top: 1px solid #cbd5e1;">Rapport généré le ${format(today, 'dd MMMM yyyy à HH:mm', { locale: fr })}</p>
      <p style="margin: 3px 0; font-weight: 600; color: #dc2626;">⚠️ Document confidentiel - Usage interne uniquement</p>
      <p style="margin: 8px 0 0 0; font-size: 9px; color: #94a3b8;">Référence: ${reportNumber} | Version: 1.0</p>
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
};

export const generateAuditReportPDF = async (audit: Audit, users?: Users, checklists?: any[], actionPlans?: any[]) => {
  const reportElement = createReportHTML(audit, users, checklists, actionPlans);

  // Attendre que l'image du logo soit chargée
  await new Promise((resolve) => {
    const img = reportElement.querySelector('img');
    if (img) {
      if (img.complete) {
        resolve(undefined);
      } else {
        img.onload = () => resolve(undefined);
        img.onerror = () => resolve(undefined); // Continuer même si le logo ne charge pas
      }
    } else {
      resolve(undefined);
    }
  });

  const canvas = await html2canvas(reportElement, { 
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
  
  // Si le contenu dépasse une page, ajouter des pages supplémentaires
  let heightLeft = pdfHeight;
  let position = 0;
  
  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
  heightLeft -= pdf.internal.pageSize.getHeight();
  
  while (heightLeft > 0) {
    position = heightLeft - pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pdf.internal.pageSize.getHeight();
  }

  const fileName = `rapport-audit-${audit.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  pdf.save(fileName);

  document.body.removeChild(reportElement);
};



