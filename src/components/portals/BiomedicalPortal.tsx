import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Icon } from "../Icon";
import { DashboardCard } from "../shared/DashboardCard";
import { IncidentHistoryCard } from "../shared/IncidentHistoryCard";
import { User, BiomedicalEquipment, MaintenanceTask, Incident } from "../../types";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { generatePortalReportPDF } from "../../utils/portalReportsGenerator";
import { showSuccess, showError } from "../../utils/toast";
import { PortalExcelActions } from "../shared/PortalExcelActions";
import { PortalPageHeader } from "../shared/PortalPageHeader";

interface BiomedicalPortalProps {
  user: User;
  biomedicalEquipment: BiomedicalEquipment[];
  maintenanceTasks: MaintenanceTask[];
  incidents: Incident[];
  onNavigate: (tabId: string) => void;
}

const getUpcomingTasks = (tasks: MaintenanceTask[]) => {
  const now = new Date();
  return tasks
    .filter(task => {
      const scheduled = new Date(task.scheduled_date);
      return scheduled >= new Date(now.toDateString()) && task.status !== 'terminée' && task.status !== 'annulée';
    })
    .sort((a, b) => new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime())
    .slice(0, 4);
};

const getOverdueTasks = (tasks: MaintenanceTask[]) => {
  const now = new Date();
  return tasks.filter(task => new Date(task.scheduled_date) < new Date(now.toDateString()) && task.status !== 'terminée' && task.status !== 'annulée');
};

export const BiomedicalPortal = ({ user, biomedicalEquipment, maintenanceTasks, incidents = [], onNavigate }: BiomedicalPortalProps) => {
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const stats = {
    total: biomedicalEquipment.length,
    operational: biomedicalEquipment.filter(eq => eq.status === 'opérationnel').length,
    maintenance: biomedicalEquipment.filter(eq => eq.status === 'en_maintenance').length,
    outOfService: biomedicalEquipment.filter(eq => eq.status === 'hors_service').length,
  };

  const ownerLabel =
    user.role === 'biomedical'
      ? 'Technicien Biomédical'
      : `${user.first_name} ${user.last_name}`.trim() || user.username;

  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    try {
      await generatePortalReportPDF('biomedical', {
        user,
        biomedicalEquipment,
        maintenanceTasks,
        incidents: incidents.filter(i => i.service === 'biomedical'),
      });
      showSuccess('Rapport PDF généré avec succès !');
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      showError('Erreur lors de la génération du rapport PDF.');
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const availabilityByService = biomedicalEquipment.reduce<Record<string, { total: number; operational: number; maintenance: number; outOfService: number }>>((acc, equipment) => {
    const locationLabel = equipment.location || 'Non renseigné';
    const service = locationLabel.includes(' - ')
      ? locationLabel.split(' - ')[0].trim()
      : locationLabel.trim();
    const serviceKey = service.length > 0 ? service : 'Service non renseigné';
    if (!acc[service]) {
      acc[service] = { total: 0, operational: 0, maintenance: 0, outOfService: 0 };
    }
    acc[serviceKey].total += 1;
    if (equipment.status === 'opérationnel') acc[serviceKey].operational += 1;
    if (equipment.status === 'en_maintenance') acc[serviceKey].maintenance += 1;
    if (equipment.status === 'hors_service') acc[serviceKey].outOfService += 1;
    return acc;
  }, {});

  const serviceAvailability = Object.entries(availabilityByService).sort((a, b) => a[0].localeCompare(b[0], 'fr'));

  const upcomingTasks = getUpcomingTasks(maintenanceTasks);
  const overdueTasks = getOverdueTasks(maintenanceTasks);

  const equipmentMap = biomedicalEquipment.reduce<Record<string, BiomedicalEquipment>>((acc, equipment) => {
    acc[equipment.id] = equipment;
    return acc;
  }, {});

  const biomedicalIncidents = incidents.filter(incident => incident.service === 'biomedical');
  const assignedIncidents = incidents.filter(incident => incident.assigned_to === user.id);

  const today = new Date();

  return (
    <div className="space-y-8 fade-in">
      <PortalPageHeader
        iconName="HeartPulse"
        title="Portail Biomédical"
        subtitle={`${user.civility} ${ownerLabel} - Gestion des équipements biomédicaux`}
        meta={format(today, "EEEE d MMMM yyyy", { locale: fr }) + " - " + format(today, "HH:mm", { locale: fr })}
        actions={
          <>
            <div className="hidden rounded-xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-center md:block">
              <p className="text-sm uppercase tracking-wide text-cyan-700">Suivi global</p>
              <p className="text-3xl font-bold text-slate-900">{stats.operational}/{stats.total}</p>
              <p className="text-sm text-slate-500">équipements opérationnels</p>
            </div>
            <PortalExcelActions
              portalType="biomedical"
              data={{
                biomedicalEquipment,
                maintenanceTasks,
                incidents: biomedicalIncidents,
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <DashboardCard
          title="Parc total"
          value={stats.total}
          iconName="Package"
          colorClass="bg-cyan-100 text-cyan-600"
          onClick={() => onNavigate('biomedical')}
        />
        <DashboardCard
          title="Opérationnels"
          value={stats.operational}
          iconName="Activity"
          colorClass="bg-green-100 text-green-600"
          onClick={() => onNavigate('biomedical')}
        />
        <DashboardCard
          title="En maintenance"
          value={stats.maintenance}
          iconName="Wrench"
          colorClass="bg-yellow-100 text-yellow-600"
          onClick={() => onNavigate('biomedical')}
        />
        <DashboardCard
          title="Hors service"
          value={stats.outOfService}
          iconName="AlertTriangle"
          colorClass="bg-red-100 text-red-600"
          onClick={() => onNavigate('biomedical')}
        />
      </div>

      <Card className="shadow-lg border-0">
        <CardHeader className="flex items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <Icon name="Buildings" className="text-cyan-500" />
            Disponibilité des équipements par service
          </CardTitle>
        </CardHeader>
        <CardContent>
          {serviceAvailability.length === 0 ? (
            <div className="text-sm text-gray-500">Aucun équipement déclaré pour le moment.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
              {serviceAvailability.map(([service, values]) => {
                const availability = values.total === 0 ? 0 : Math.round((values.operational / values.total) * 100);
                return (
                  <div
                    key={service}
                    className="relative rounded-xl border border-cyan-100 bg-white/70 p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 truncate pr-3">
                        {service}
                      </span>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-100 text-cyan-600">
                        <Icon name="Activity" className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900">{availability}%</h3>
                        <p className="text-xs text-gray-500">Disponibilité globale</p>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-gray-200">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-green-500 via-cyan-500 to-blue-500 transition-all"
                          style={{ width: `${availability}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center text-[11px] md:text-xs">
                        <div className="rounded-md bg-green-50 py-1 text-green-700">
                          <p className="font-semibold text-sm">{values.operational}</p>
                          <p>Opérationnels</p>
                        </div>
                        <div className="rounded-md bg-yellow-50 py-1 text-yellow-700">
                          <p className="font-semibold text-sm">{values.maintenance}</p>
                          <p>Maintenance</p>
                        </div>
                        <div className="rounded-md bg-red-50 py-1 text-red-600">
                          <p className="font-semibold text-sm">{values.outOfService}</p>
                          <p>HS</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-dashed border-cyan-100 pt-2 text-[11px] text-gray-500">
                      {values.total} équipement(s) suivis.
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-lg border-0">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Icon name="CalendarClock" className="text-cyan-500" />
                Interventions à venir
              </CardTitle>
              <p className="text-sm text-gray-500">Prochaines maintenances planifiées</p>
            </div>
            <button
              onClick={() => onNavigate('biomedical')}
              className="text-sm text-cyan-600 hover:text-cyan-700 font-semibold"
            >
              Voir tout
            </button>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length === 0 ? (
              <div className="text-sm text-gray-500">Aucune maintenance planifiée prochainement.</div>
            ) : (
              <ul className="space-y-3">
                {upcomingTasks.map(task => {
                  const equipment = equipmentMap[task.equipment_id];
                  return (
                    <li key={task.id} className="p-4 rounded-lg bg-cyan-50 border border-cyan-100">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-800">{equipment?.name || 'Équipement'}</p>
                          <p className="text-sm text-gray-600">{task.description || 'Maintenance programmée'}</p>
                        </div>
                        <span className="text-xs uppercase font-semibold text-cyan-600 bg-cyan-100 rounded-full px-3 py-1">
                          {task.type}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Icon name="Calendar" className="h-4 w-4" />
                          {format(new Date(task.scheduled_date), "dd MMMM yyyy HH:mm", { locale: fr })}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Icon name="User" className="h-4 w-4" />
                          {task.technician_id ? `Technicien #${task.technician_id.slice(0, 6)}` : 'Non assigné'}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg border-0">
          <CardHeader className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon name="AlertOctagon" className="text-orange-500" />
              Interventions en retard
            </CardTitle>
            <p className="text-sm text-gray-500">Maintenance à replanifier ou prioriser</p>
          </CardHeader>
          <CardContent>
            {overdueTasks.length === 0 ? (
              <div className="text-sm text-gray-500">Aucune intervention en retard. Tout est à jour !</div>
            ) : (
              <ul className="space-y-3">
                {overdueTasks.slice(0, 4).map(task => {
                  const equipment = equipmentMap[task.equipment_id];
                  return (
                    <li key={task.id} className="p-4 rounded-lg border border-orange-200 bg-orange-50">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-gray-800">{equipment?.name || 'Équipement'}</p>
                          <p className="text-sm text-gray-600">{task.description || 'Maintenance à effectuer'}</p>
                        </div>
                        <span className="text-xs uppercase font-semibold text-orange-600 bg-white rounded-full px-3 py-1 border border-orange-300">
                          {task.type}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-orange-700">
                        <div className="flex items-center gap-2">
                          <Icon name="Clock" className="h-4 w-4" />
                          {format(new Date(task.scheduled_date), "dd MMMM yyyy", { locale: fr })}
                        </div>
                        <div className="flex items-center gap-2">
                          <Icon name="AlertCircle" className="h-4 w-4" />
                          Statut: {task.status}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-lg border-0">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Icon name="Package" className="text-emerald-500" />
              Stock des équipements disponibles
            </CardTitle>
            <p className="text-sm text-gray-500">
              Liste des équipements biomédicaux opérationnels actuellement disponibles.
            </p>
          </div>
          <button
            onClick={() => onNavigate('biomedical')}
            className="text-sm text-emerald-600 hover:text-emerald-700 font-semibold"
          >
            Voir tout le parc
          </button>
        </CardHeader>
        <CardContent>
          {stats.operational === 0 ? (
            <div className="text-sm text-gray-500">
              Aucun équipement disponible pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                    <th className="py-2 pr-4">Équipement</th>
                    <th className="py-2 pr-4">Modèle</th>
                    <th className="py-2 pr-4">N° série</th>
                    <th className="py-2 pr-4">Localisation</th>
                  </tr>
                </thead>
                <tbody>
                  {biomedicalEquipment
                    .filter(eq => eq.status === 'opérationnel')
                    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
                    .map(eq => (
                      <tr key={eq.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 pr-4 font-medium text-gray-800">{eq.name}</td>
                        <td className="py-2 pr-4 text-gray-600">{eq.model || 'N/A'}</td>
                        <td className="py-2 pr-4 text-gray-600">{eq.serial_number || '-'}</td>
                        <td className="py-2 pr-4 text-gray-600">{eq.location || 'Non renseigné'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <IncidentHistoryCard
        title="Tickets qui me sont assignés"
        subtitle="Interventions QHSE à traiter"
        incidents={assignedIncidents}
        allIncidents={incidents}
        emptyMessage="Aucun ticket ne vous est assigné."
      />

      <IncidentHistoryCard
        title="Déclarations d'équipements en panne"
        subtitle="Suivi complet des signalements biomédicaux"
        incidents={biomedicalIncidents}
        allIncidents={incidents}
        emptyMessage="Aucune déclaration en attente."
        footerAction={
          biomedicalIncidents.length > 0 ? (
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                className="text-cyan-600 border-cyan-200 hover:bg-cyan-50"
                onClick={() => onNavigate('biomedical')}
              >
                <Icon name="ExternalLink" className="mr-1 h-4 w-4" />
                Voir toutes les déclarations
              </Button>
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('biomedical')}>
          <CardContent className="p-6">
            <Icon name="HeartPulse" className="text-cyan-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Gestion du parc</h3>
            <p className="text-sm text-gray-600">Suivre et mettre à jour vos équipements</p>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('inventory')}>
          <CardContent className="p-6">
            <Icon name="PackageSearch" className="text-teal-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Inventaire</h3>
            <p className="text-sm text-gray-600">Localiser les appareils et tracer les déplacements</p>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('reportBiomedicalIncident')}>
          <CardContent className="p-6">
            <Icon name="AlertCircle" className="text-red-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Déclarer un Incident</h3>
            <p className="text-sm text-gray-600">Signaler un dysfonctionnement biomédical</p>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('reportSecurityIncident')}>
          <CardContent className="p-6">
            <Icon name="Shield" className="text-indigo-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Incident de Sécurité</h3>
            <p className="text-sm text-gray-600">Signaler un incident de sécurité</p>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('planningBiomedicalMaintenance')}>
          <CardContent className="p-6">
            <Icon name="CalendarPlus" className="text-teal-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Planification</h3>
            <p className="text-sm text-gray-600">Planifier les interventions préventives</p>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('kpiDashboard')}>
          <CardContent className="p-6">
            <Icon name="BarChart3" className="text-green-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Indicateurs</h3>
            <p className="text-sm text-gray-600">Piloter la performance biomédicale</p>
          </CardContent>
        </Card>
        <Card className="card-hover cursor-pointer" onClick={() => onNavigate('dailyRoundsBiomedical')}>
          <CardContent className="p-6">
            <Icon name="ClipboardCheck" className="text-purple-600 mb-3 text-3xl" />
            <h3 className="font-semibold mb-2">Ronde Quotidienne</h3>
            <p className="text-sm text-gray-600">Effectuer votre ronde quotidienne</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};







