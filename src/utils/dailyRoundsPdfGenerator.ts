import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { DailyRound, RoundType, RoundStatus, User } from '@/types';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusLabels: Record<RoundStatus, string> = {
  en_cours: "En cours",
  terminée: "Terminée",
  annulée: "Annulée",
};

const roundTypeLabels: Record<RoundType, string> = {
  biomedical: "Biomédical",
  technicien_polyvalent: "Technicien Polyvalent",
};

const createReportHTML = (
  rounds: DailyRound[],
  roundType: RoundType,
  user: User
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
  today.setHours(0, 0, 0, 0);

  // Calcul des statistiques
  const stats = {
    total: rounds.length,
    completed: rounds.filter(r => r.status === 'terminée').length,
    inProgress: rounds.filter(r => r.status === 'en_cours').length,
    cancelled: rounds.filter(r => r.status === 'annulée').length,
    thisWeek: rounds.filter(r => {
      const roundDate = new Date(r.round_date);
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
      return roundDate >= weekStart && roundDate <= weekEnd;
    }).length,
    thisMonth: rounds.filter(r => {
      const roundDate = new Date(r.round_date);
      const monthStart = startOfMonth(today);
      const monthEnd = endOfMonth(today);
      return roundDate >= monthStart && roundDate <= monthEnd;
    }).length,
    averageDuration: (() => {
      const completedRounds = rounds.filter(r => r.status === 'terminée' && r.start_time && r.end_time);
      if (completedRounds.length === 0) return 0;
      const totalMinutes = completedRounds.reduce((acc, r) => {
        const start = new Date(r.start_time!);
        const end = new Date(r.end_time!);
        return acc + (end.getTime() - start.getTime()) / (1000 * 60);
      }, 0);
      return Math.round(totalMinutes / completedRounds.length);
    })(),
  };

  // Vérifier les rondes manquées (7 derniers jours)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(today, i);
    date.setHours(0, 0, 0, 0);
    return date;
  }).reverse();

  const missingRounds = last7Days.filter(date => {
    return !rounds.some(r => {
      const roundDate = new Date(r.round_date);
      roundDate.setHours(0, 0, 0, 0);
      return roundDate.getTime() === date.getTime();
    });
  });

  let html = `
    <div style="text-align: center; margin-bottom: 30px; border-bottom: 3px solid #0ea5e9; padding-bottom: 20px;">
      <h1 style="font-size: 32px; margin: 0; color: #0ea5e9; font-weight: bold;">
        Rapport des Rondes Quotidiennes
      </h1>
      <h2 style="font-size: 24px; margin: 10px 0; color: #0369a1;">
        ${roundTypeLabels[roundType]}
      </h2>
      <p style="font-size: 14px; margin: 5px 0; color: #666;">
        Généré le ${format(today, 'dd MMMM yyyy à HH:mm', { locale: fr })}
      </p>
      <p style="font-size: 14px; margin: 5px 0; color: #666;">
        Par: ${user.civility} ${user.first_name} ${user.last_name}
      </p>
    </div>

    <!-- Statistiques -->
    <div style="margin-bottom: 30px;">
      <h3 style="font-size: 20px; color: #0ea5e9; margin-bottom: 15px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">
        📊 Statistiques
      </h3>
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px;">
        <div style="background: #e0f2fe; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #bae6fd;">
          <div style="font-size: 28px; font-weight: bold; color: #0369a1; margin-bottom: 5px;">
            ${stats.total}
          </div>
          <div style="font-size: 12px; color: #0c4a6e;">Total</div>
        </div>
        <div style="background: #dcfce7; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #bbf7d0;">
          <div style="font-size: 28px; font-weight: bold; color: #166534; margin-bottom: 5px;">
            ${stats.completed}
          </div>
          <div style="font-size: 12px; color: #14532d;">Terminées</div>
        </div>
        <div style="background: #fef3c7; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #fde68a;">
          <div style="font-size: 28px; font-weight: bold; color: #92400e; margin-bottom: 5px;">
            ${stats.inProgress}
          </div>
          <div style="font-size: 12px; color: #78350f;">En cours</div>
        </div>
        <div style="background: #fee2e2; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #fecaca;">
          <div style="font-size: 28px; font-weight: bold; color: #991b1b; margin-bottom: 5px;">
            ${stats.cancelled}
          </div>
          <div style="font-size: 12px; color: #7f1d1d;">Annulées</div>
        </div>
      </div>
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
        <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e0f2fe;">
          <div style="font-size: 24px; font-weight: bold; color: #0369a1; margin-bottom: 5px;">
            ${stats.thisWeek}
          </div>
          <div style="font-size: 12px; color: #0c4a6e;">Cette semaine</div>
        </div>
        <div style="background: #faf5ff; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #e9d5ff;">
          <div style="font-size: 24px; font-weight: bold; color: #6b21a8; margin-bottom: 5px;">
            ${stats.thisMonth}
          </div>
          <div style="font-size: 12px; color: #581c87;">Ce mois</div>
        </div>
        <div style="background: #f5f3ff; padding: 15px; border-radius: 8px; text-align: center; border: 1px solid #ddd6fe;">
          <div style="font-size: 24px; font-weight: bold; color: #4c1d95; margin-bottom: 5px;">
            ${stats.averageDuration || '-'} min
          </div>
          <div style="font-size: 12px; color: #3b1f5f;">Durée moyenne</div>
        </div>
      </div>
    </div>

    <!-- Alertes rondes manquées -->
    ${missingRounds.length > 0 ? `
      <div style="background: #fff7ed; border: 2px solid #fdba74; border-radius: 8px; padding: 15px; margin-bottom: 30px;">
        <h4 style="font-size: 16px; color: #9a3412; margin: 0 0 10px 0; font-weight: bold;">
          ⚠️ ${missingRounds.length} ronde(s) manquée(s) sur les 7 derniers jours
        </h4>
        <p style="font-size: 14px; color: #7c2d12; margin: 0;">
          Dates: ${missingRounds.map(d => format(d, 'dd/MM/yyyy', { locale: fr })).join(', ')}
        </p>
      </div>
    ` : ''}

    <!-- Liste des rondes -->
    <div style="margin-bottom: 30px;">
      <h3 style="font-size: 20px; color: #0ea5e9; margin-bottom: 15px; border-bottom: 2px solid #e0e0e0; padding-bottom: 10px;">
        📋 Liste des Rondes
      </h3>
      ${rounds.length === 0 ? `
        <p style="text-align: center; color: #666; padding: 20px;">
          Aucune ronde enregistrée.
        </p>
      ` : `
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <thead>
            <tr style="background: #0ea5e9; color: white;">
              <th style="padding: 12px; text-align: left; border: 1px solid #0369a1; font-size: 12px;">Date</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #0369a1; font-size: 12px;">Heure début</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #0369a1; font-size: 12px;">Heure fin</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #0369a1; font-size: 12px;">Durée</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #0369a1; font-size: 12px;">Statut</th>
              <th style="padding: 12px; text-align: left; border: 1px solid #0369a1; font-size: 12px;">Notes</th>
            </tr>
          </thead>
          <tbody>
            ${rounds
              .sort((a, b) => new Date(b.round_date).getTime() - new Date(a.round_date).getTime())
              .map((round, index) => {
                const duration = round.start_time && round.end_time
                  ? Math.round((new Date(round.end_time).getTime() - new Date(round.start_time).getTime()) / (1000 * 60))
                  : null;
                
                const durationText = duration !== null 
                  ? `${Math.floor(duration / 60)}h ${duration % 60}min`
                  : '-';
                
                const statusColor = round.status === 'terminée' ? '#166534' 
                  : round.status === 'en_cours' ? '#92400e' 
                  : '#991b1b';
                
                const bgColor = index % 2 === 0 ? '#f9fafb' : '#ffffff';
                
                return `
                  <tr style="background: ${bgColor};">
                    <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 11px;">
                      ${format(new Date(round.round_date), "dd/MM/yyyy", { locale: fr })}
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 11px;">
                      ${round.start_time ? format(new Date(round.start_time), "HH:mm", { locale: fr }) : '-'}
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 11px;">
                      ${round.end_time ? format(new Date(round.end_time), "HH:mm", { locale: fr }) : '-'}
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 11px;">
                      ${durationText}
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 11px;">
                      <span style="color: ${statusColor}; font-weight: bold;">
                        ${statusLabels[round.status]}
                      </span>
                    </td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; font-size: 11px; max-width: 200px; word-wrap: break-word;">
                      ${round.notes || '-'}
                    </td>
                  </tr>
                `;
              }).join('')}
          </tbody>
        </table>
      `}
    </div>

    <!-- Pied de page -->
    <div style="margin-top: 40px; padding-top: 20px; border-top: 2px solid #e0e0e0; text-align: center; color: #666; font-size: 12px;">
      <p style="margin: 5px 0;">
        Centre Diagnostic Libreville - Système de Gestion Intégré
      </p>
      <p style="margin: 5px 0;">
        Ce document a été généré automatiquement le ${format(today, 'dd/MM/yyyy à HH:mm', { locale: fr })}
      </p>
    </div>
  `;

  container.innerHTML = html;
  document.body.appendChild(container);
  return container;
};

export const generateDailyRoundsPDF = async (
  rounds: DailyRound[],
  roundType: RoundType,
  user: User
): Promise<void> => {
  const reportElement = createReportHTML(rounds, roundType, user);

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

    const fileName = `rapport-rondes-${roundType}-${format(new Date(), 'yyyy-MM-dd-HHmm', { locale: fr })}.pdf`;
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
