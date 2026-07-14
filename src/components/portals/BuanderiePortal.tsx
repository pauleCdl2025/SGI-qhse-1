import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { User, Notification } from "@/types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generatePortalReportPDF } from "@/utils/portalReportsGenerator";
import { showSuccess, showError } from "@/utils/toast";
import { PortalExcelActions } from "@/components/shared/PortalExcelActions";
import { PortalPageHeader } from "@/components/shared/PortalPageHeader";

interface PortalProps {
  user: User;
  notifications: Notification[];
  onNavigate: (tabId: string) => void;
}

// Portail Buanderie
export const BuanderiePortal = ({ user, notifications, onNavigate }: PortalProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const today = new Date();
  
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await generatePortalReportPDF('buanderie', {
        user,
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
        iconName="Shirt"
        title="Portail Buanderie"
        subtitle={`${user.civility} ${user.first_name} ${user.last_name} — Superviseur : Service QHSE`}
        meta={format(today, "EEEE d MMMM yyyy", { locale: fr }) + " - " + format(today, "HH:mm")}
        actions={
          <>
            <PortalExcelActions
              portalType="buanderie"
              data={{
                user,
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
          title="Suivis Actifs" 
          value="-" 
          iconName="Shirt" 
          colorClass="bg-cyan-100 text-cyan-600"
          onClick={() => onNavigate('qhseLaundry')}
        />
        <DashboardCard 
          title="En Réception" 
          value="-" 
          iconName="Package" 
          colorClass="bg-blue-100 text-blue-600"
          onClick={() => onNavigate('qhseLaundry')}
        />
        <DashboardCard 
          title="En Lavage" 
          value="-" 
          iconName="Droplet" 
          colorClass="bg-teal-100 text-teal-600"
          onClick={() => onNavigate('qhseLaundry')}
        />
        <DashboardCard 
          title="En Distribution" 
          value="-" 
          iconName="Truck" 
          colorClass="bg-green-100 text-green-600"
          onClick={() => onNavigate('qhseLaundry')}
        />
      </div>

      {/* Accès rapides */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('qhseLaundry')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="Shirt" className="text-cyan-600 mr-2" />
              Suivi et Traçabilité du Linge
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Gérer le suivi complet du linge à la buanderie</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-cyan-600 mr-2" />
                Enregistrer la réception du linge sale
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-cyan-600 mr-2" />
                Suivre le lavage et la désinfection
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-cyan-600 mr-2" />
                Gérer le séchage et le repassage
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-cyan-600 mr-2" />
                Enregistrer la distribution du linge propre
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-cyan-600 mr-2" />
                Traçabilité complète du processus
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('personalInfo')}>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Icon name="User" className="text-blue-600 mr-2" />
              Mes Informations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Consulter et modifier vos informations personnelles</p>
            <div className="space-y-2">
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-blue-600 mr-2" />
                Consulter votre profil
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-blue-600 mr-2" />
                Modifier votre mot de passe
              </div>
              <div className="flex items-center text-sm">
                <Icon name="Check" className="text-blue-600 mr-2" />
                Voir vos notifications
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
      </div>

      {/* Informations importantes */}
      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center text-blue-800">
            <Icon name="Info" className="text-blue-600 mr-2" />
            Informations Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              <strong>Superviseur :</strong> Votre superviseur est le Service QHSE qui peut consulter et valider vos enregistrements.
            </p>
            <p>
              <strong>Traçabilité :</strong> Tous les enregistrements de suivi du linge sont tracés et peuvent être consultés par le superviseur QHSE.
            </p>
            <p>
              <strong>Non-conformités :</strong> En cas de non-conformité détectée, vous pouvez l'enregistrer dans le module de suivi pour un suivi correctif.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};


