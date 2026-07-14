import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { IncidentHistoryCard } from "@/components/shared/IncidentHistoryCard";
import { User, Visitor, Booking, Notification, Incident } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generatePortalReportPDF } from "@/utils/portalReportsGenerator";
import { showSuccess, showError } from "@/utils/toast";
import { PortalExcelActions } from "@/components/shared/PortalExcelActions";
import { PortalPageHeader } from "@/components/shared/PortalPageHeader";

interface PortalProps {
  user: User;
  visitors: Visitor[];
  bookings: Booking[];
  notifications: Notification[];
  incidents?: Incident[];
  onNavigate: (tabId: string) => void;
  onDeleteIncident?: (incidentId: string) => void;
}

// Portail Secrétaire
export const SecretairePortal = ({ user, visitors, bookings, notifications, incidents = [], onNavigate, onDeleteIncident }: PortalProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const today = new Date();
  const todayStr = today.toDateString();
  
  const stats = {
    todayVisitors: visitors.filter(v => new Date(v.entry_time).toDateString() === todayStr).length,
    activeVisitors: visitors.filter(v => !v.exit_time).length,
    todayBookings: bookings.filter(b => format(new Date(b.start_time), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')).length,
    activeBookings: bookings.filter(b => b.status === 'réservé' || b.status === 'en_cours').length,
  };
  const myReportedIncidents = incidents.filter(i => i.reported_by === user.id && i.service !== 'biomedical');
  const myEquipmentDeclarations = incidents.filter(i => i.reported_by === user.id && i.service === 'biomedical');

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await generatePortalReportPDF('secretaire', {
        user,
        visitors,
        bookings,
        incidents,
      });
      showSuccess('Rapport PDF généré avec succès !');
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      showError('Erreur lors de la génération du rapport PDF.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  return (
    <div className="space-y-8 fade-in">
      <PortalPageHeader
        iconName="FileText"
        title="Portail Secrétaire"
        subtitle={`${user.civility} ${user.first_name} ${user.last_name}`}
        meta={format(today, "EEEE d MMMM yyyy", { locale: fr }) + " - " + format(today, "HH:mm")}
        actions={
          <>
            <PortalExcelActions
              portalType="secretaire"
              data={{
                visitors,
                bookings,
                incidents,
              }}
            />
            <Button
              onClick={handleGenerateReport}
              disabled={isGeneratingReport}
              className="border border-slate-200 bg-white text-slate-700 hover:bg-cyan-50 hover:text-cyan-800"
              size="sm"
            >
              <Icon name={isGeneratingReport ? "Clock" : "Download"} className={`mr-2 h-4 w-4 ${isGeneratingReport ? 'animate-spin' : ''}`} />
              {isGeneratingReport ? 'Génération...' : 'Exporter PDF'}
            </Button>
          </>
        }
      />

      {/* Statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard 
          title="Visiteurs Aujourd'hui" 
          value={stats.todayVisitors} 
          iconName="Users" 
          colorClass="bg-green-100 text-green-600"
          onClick={() => onNavigate('visitorLog')}
        />
        <DashboardCard 
          title="Visiteurs Actifs" 
          value={stats.activeVisitors} 
          iconName="UserCheck" 
          colorClass="bg-blue-100 text-blue-600"
          onClick={() => onNavigate('visitorLog')}
        />
        <DashboardCard 
          title="Réservations Aujourd'hui" 
          value={stats.todayBookings} 
          iconName="Calendar" 
          colorClass="bg-cyan-100 text-cyan-600"
          onClick={() => onNavigate('planningSalles')}
        />
        <DashboardCard 
          title="Réservations Actives" 
          value={stats.activeBookings} 
          iconName="CalendarCheck" 
          colorClass="bg-orange-100 text-orange-600"
          onClick={() => onNavigate('planningSalles')}
        />
      </div>

      {/* Accès rapides */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('visitorLog')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="BookUser" className="text-green-600 mr-2" />
              Registre Visiteurs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Gérer l'entrée et la sortie des visiteurs</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-green-600 mr-2" />
                Enregistrer les entrées
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-green-600 mr-2" />
                Enregistrer les sorties
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-green-600 mr-2" />
                Consulter l'historique
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('planningSalles')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="Calendar" className="text-cyan-600 mr-2" />
              Planning des Salles
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Gérer les réservations de salles</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-cyan-600 mr-2" />
                Créer des réservations
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-cyan-600 mr-2" />
                Modifier les réservations
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-cyan-600 mr-2" />
                Annuler des réservations
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('reportBiomedicalIncident')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="Stethoscope" className="text-teal-600 mr-2" />
              Déclarer équipement HS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Informer le biomédical d'une panne ou d'un dysfonctionnement</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-teal-600 mr-2" />
                Renseigner l'équipement concerné
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-teal-600 mr-2" />
                Ajouter le lieu et la priorité
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-teal-600 mr-2" />
                Suivi assuré par le biomédical
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('reportSecurityIncident')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="Shield" className="text-indigo-600 mr-2" />
              Incident de Sécurité
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Signaler un incident de sécurité</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-indigo-600 mr-2" />
                Déclarer un incident de sécurité
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-indigo-600 mr-2" />
                Ajouter les détails et photos
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-indigo-600 mr-2" />
                Suivi par le service sécurité
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <IncidentHistoryCard
        title="Mes incidents déclarés"
        subtitle="Suivi des incidents soumis via le secrétariat"
        incidents={myReportedIncidents}
        allIncidents={incidents}
        onDelete={onDeleteIncident}
        emptyMessage="Aucun incident signalé depuis votre compte pour l'instant."
      />

      <IncidentHistoryCard
        title="Mes déclarations d'équipement"
        subtitle="Historique des matériels signalés en panne"
        incidents={myEquipmentDeclarations}
        allIncidents={incidents}
        onDelete={onDeleteIncident}
        emptyMessage="Aucune déclaration d'équipement effectuée pour le moment."
      />
    </div>
  );
};






