import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { apiClient } from "@/integrations/api/client";
import { showSuccess, showError } from "@/utils/toast";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { generateQHSEReportPDF } from "@/utils/qhseReportsGenerator";
import { LoadingSpinner } from "@/components/shared/Loading";
import { exportToExcel, exportMultipleSheetsToExcel } from "@/utils/excelExport";

export type ReportType = 
  | 'overview' 
  | 'incidents' 
  | 'audits' 
  | 'trainings' 
  | 'medical_waste' 
  | 'risks' 
  | 'sterilization' 
  | 'laundry'
  | 'comprehensive';

interface ReportData {
  incidents: any[];
  audits: any[];
  trainings: any[];
  medicalWaste: any[];
  risks: any[];
  sterilizationCycles: any[];
  sterilizationRegister: any[];
  laundryTracking: any[];
}

export const QHSEReportsModule = () => {
  const [reportType, setReportType] = useState<ReportType>('overview');
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData>({
    incidents: [],
    audits: [],
    trainings: [],
    medicalWaste: [],
    risks: [],
    sterilizationCycles: [],
    sterilizationRegister: [],
    laundryTracking: [],
  });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [incidents, audits, trainings, medicalWaste, risks, sterilizationCycles, sterilizationRegister, laundryTracking] = await Promise.all([
        apiClient.getIncidents().catch(() => []),
        apiClient.getAudits().catch(() => []),
        apiClient.getTrainings().catch(() => []),
        apiClient.getMedicalWaste().catch(() => []),
        apiClient.getRisks().catch(() => []),
        apiClient.getSterilizationCycles().catch(() => []),
        apiClient.getSterilizationRegister().catch(() => []),
        apiClient.getLaundryTracking().catch(() => []),
      ]);

      setReportData({
        incidents: incidents || [],
        audits: audits || [],
        trainings: trainings || [],
        medicalWaste: medicalWaste || [],
        risks: risks || [],
        sterilizationCycles: sterilizationCycles || [],
        sterilizationRegister: sterilizationRegister || [],
        laundryTracking: laundryTracking || [],
      });
    } catch (error: any) {
      console.error("Error fetching report data:", error);
      showError("Erreur lors du chargement des données de rapport.");
    } finally {
      setLoading(false);
    }
  };

  const filterByDateRange = (items: any[], dateField: string = 'created_at') => {
    if (!startDate || !endDate) return items;
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= start && itemDate <= end;
    });
  };

  const getFilteredData = () => {
    const filtered = { ...reportData };
    
    filtered.incidents = filterByDateRange(filtered.incidents, 'date_creation');
    filtered.audits = filterByDateRange(filtered.audits, 'created_at');
    filtered.trainings = filterByDateRange(filtered.trainings, 'created_at');
    filtered.medicalWaste = filterByDateRange(filtered.medicalWaste, 'created_at');
    filtered.risks = filterByDateRange(filtered.risks, 'created_at');
    filtered.sterilizationCycles = filterByDateRange(filtered.sterilizationCycles, 'created_at');
    filtered.sterilizationRegister = filterByDateRange(filtered.sterilizationRegister, 'created_at');
    filtered.laundryTracking = filterByDateRange(filtered.laundryTracking, 'created_at');
    
    return filtered;
  };

  const getStats = () => {
    const filtered = getFilteredData();
    
    return {
      incidents: {
        total: filtered.incidents.length,
        nouveau: filtered.incidents.filter((i: any) => i.statut === 'nouveau').length,
        cours: filtered.incidents.filter((i: any) => i.statut === 'cours').length,
        traite: filtered.incidents.filter((i: any) => i.statut === 'traite').length,
        resolu: filtered.incidents.filter((i: any) => i.statut === 'resolu').length,
      },
      audits: {
        total: filtered.audits.length,
        planifie: filtered.audits.filter((a: any) => a.status === 'planifié').length,
        en_cours: filtered.audits.filter((a: any) => a.status === 'en_cours').length,
        termine: filtered.audits.filter((a: any) => a.status === 'terminé').length,
      },
      trainings: {
        total: filtered.trainings.length,
        planifiee: filtered.trainings.filter((t: any) => t.status === 'planifiée').length,
        en_cours: filtered.trainings.filter((t: any) => t.status === 'en_cours').length,
        terminee: filtered.trainings.filter((t: any) => t.status === 'terminée').length,
      },
      medicalWaste: {
        total: filtered.medicalWaste.length,
        collecte: filtered.medicalWaste.filter((w: any) => w.status === 'collecté').length,
        stocke: filtered.medicalWaste.filter((w: any) => w.status === 'stocké').length,
        traite: filtered.medicalWaste.filter((w: any) => w.status === 'traité').length,
        elimine: filtered.medicalWaste.filter((w: any) => w.status === 'éliminé').length,
      },
      risks: {
        total: filtered.risks.length,
        identifie: filtered.risks.filter((r: any) => r.status === 'identifié').length,
        evalue: filtered.risks.filter((r: any) => r.status === 'évalué').length,
        en_traitement: filtered.risks.filter((r: any) => r.status === 'en_traitement').length,
        traite: filtered.risks.filter((r: any) => r.status === 'traité').length,
      },
      sterilization: {
        cycles: filtered.sterilizationCycles.length,
        register: filtered.sterilizationRegister.length,
      },
      laundry: {
        total: filtered.laundryTracking.length,
      },
    };
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      const filtered = getFilteredData();
      const stats = getStats();
      
      // Récupérer les informations de l'utilisateur actuel
      const token = localStorage.getItem('auth_token');
      const userId = localStorage.getItem('currentUserId');
      
      if (token && userId) {
        apiClient.setToken(token);
        const profile = await apiClient.getProfile(userId);

        const user = {
          id: profile.id,
          username: profile.username,
          first_name: profile.first_name,
          last_name: profile.last_name,
          civility: profile.civility,
          email: profile.email,
          role: profile.role,
          position: profile.service,
        };

        await generateQHSEReportPDF(reportType, {
          user,
          data: filtered,
          stats,
          dateRange: { start: startDate, end: endDate },
        });
        
        showSuccess('Rapport PDF généré avec succès !');
      } else {
        throw new Error('Non authentifié');
      }
    } catch (error: any) {
      console.error('Erreur lors de la génération du rapport:', error);
      showError('Erreur lors de la génération du rapport PDF: ' + (error.message || 'Erreur inconnue'));
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    try {
      const filtered = getFilteredData();
      const stats = getStats();
      
      if (reportType === 'comprehensive') {
        // Export multi-feuilles pour le rapport complet
        const sheets = [
          {
            name: 'Incidents',
            data: filtered.incidents,
            headers: [
              { key: 'date_creation', label: 'Date' },
              { key: 'type', label: 'Type' },
              { key: 'description', label: 'Description' },
              { key: 'lieu', label: 'Lieu' },
              { key: 'priorite', label: 'Priorité' },
              { key: 'statut', label: 'Statut' },
              { key: 'service', label: 'Service' },
            ],
          },
          {
            name: 'Audits',
            data: filtered.audits,
            headers: [
              { key: 'title', label: 'Titre' },
              { key: 'audit_type', label: 'Type' },
              { key: 'planned_date', label: 'Date Planifiée' },
              { key: 'actual_date', label: 'Date Réelle' },
              { key: 'status', label: 'Statut' },
              { key: 'scope', label: 'Scope' },
            ],
          },
          {
            name: 'Formations',
            data: filtered.trainings,
            headers: [
              { key: 'title', label: 'Titre' },
              { key: 'category', label: 'Catégorie' },
              { key: 'training_type', label: 'Type' },
              { key: 'planned_date', label: 'Date Planifiée' },
              { key: 'status', label: 'Statut' },
            ],
          },
          {
            name: 'Déchets Médicaux',
            data: filtered.medicalWaste,
            headers: [
              { key: 'waste_type', label: 'Type' },
              { key: 'quantity', label: 'Quantité' },
              { key: 'unit', label: 'Unité' },
              { key: 'collection_date', label: 'Date Collecte' },
              { key: 'collection_location', label: 'Lieu' },
              { key: 'status', label: 'Statut' },
            ],
          },
          {
            name: 'Risques',
            data: filtered.risks,
            headers: [
              { key: 'title', label: 'Titre' },
              { key: 'risk_category', label: 'Catégorie' },
              { key: 'risk_level', label: 'Niveau' },
              { key: 'probability', label: 'Probabilité' },
              { key: 'severity', label: 'Sévérité' },
              { key: 'status', label: 'Statut' },
            ],
          },
          {
            name: 'Stérilisation - Cycles',
            data: filtered.sterilizationCycles,
            headers: [
              { key: 'cycle_number', label: 'N° Cycle' },
              { key: 'sterilizer_id', label: 'Stérilisateur' },
              { key: 'sterilizer_type', label: 'Type' },
              { key: 'start_time', label: 'Début' },
              { key: 'status', label: 'Statut' },
              { key: 'result', label: 'Résultat' },
            ],
          },
          {
            name: 'Stérilisation - Registre',
            data: filtered.sterilizationRegister,
            headers: [
              { key: 'date_cycle', label: 'Date Cycle' },
              { key: 'service_concerne', label: 'Service' },
              { key: 'operateur_nom', label: 'Opérateur' },
              { key: 'type_materiel', label: 'Type Matériel' },
              { key: 'methode_sterilisation', label: 'Méthode' },
              { key: 'status_cycle', label: 'Statut' },
            ],
          },
          {
            name: 'Suivi de Linge',
            data: filtered.laundryTracking,
            headers: [
              { key: 'date_reception', label: 'Date Réception' },
              { key: 'service_origine', label: 'Service Origine' },
              { key: 'type_linge', label: 'Type Linge' },
              { key: 'poids_kg', label: 'Poids (kg)' },
              { key: 'quantite', label: 'Quantité' },
              { key: 'status', label: 'Statut' },
            ],
          },
        ];
        
        exportMultipleSheetsToExcel(sheets, `rapport-qhse-complet-${format(new Date(), 'yyyy-MM-dd')}`);
        showSuccess('Rapport Excel exporté avec succès !');
      } else {
        // Export selon le type de rapport sélectionné
        let sheets: Array<{ name: string; data: any[]; headers: { key: string; label: string }[] }> = [];
        
        switch (reportType) {
          case 'incidents':
            sheets = [{
              name: 'Incidents',
              data: filtered.incidents,
              headers: [
                { key: 'date_creation', label: 'Date' },
                { key: 'type', label: 'Type' },
                { key: 'description', label: 'Description' },
                { key: 'lieu', label: 'Lieu' },
                { key: 'priorite', label: 'Priorité' },
                { key: 'statut', label: 'Statut' },
                { key: 'service', label: 'Service' },
              ],
            }];
            break;
          case 'audits':
            sheets = [{
              name: 'Audits',
              data: filtered.audits,
              headers: [
                { key: 'title', label: 'Titre' },
                { key: 'audit_type', label: 'Type' },
                { key: 'planned_date', label: 'Date Planifiée' },
                { key: 'actual_date', label: 'Date Réelle' },
                { key: 'status', label: 'Statut' },
                { key: 'scope', label: 'Scope' },
              ],
            }];
            break;
          case 'trainings':
            sheets = [{
              name: 'Formations',
              data: filtered.trainings,
              headers: [
                { key: 'title', label: 'Titre' },
                { key: 'category', label: 'Catégorie' },
                { key: 'training_type', label: 'Type' },
                { key: 'planned_date', label: 'Date Planifiée' },
                { key: 'status', label: 'Statut' },
              ],
            }];
            break;
          case 'medical_waste':
            sheets = [{
              name: 'Déchets Médicaux',
              data: filtered.medicalWaste,
              headers: [
                { key: 'waste_type', label: 'Type' },
                { key: 'quantity', label: 'Quantité' },
                { key: 'unit', label: 'Unité' },
                { key: 'collection_date', label: 'Date Collecte' },
                { key: 'collection_location', label: 'Lieu' },
                { key: 'status', label: 'Statut' },
              ],
            }];
            break;
          case 'risks':
            sheets = [{
              name: 'Risques',
              data: filtered.risks,
              headers: [
                { key: 'title', label: 'Titre' },
                { key: 'risk_category', label: 'Catégorie' },
                { key: 'risk_level', label: 'Niveau' },
                { key: 'probability', label: 'Probabilité' },
                { key: 'severity', label: 'Sévérité' },
                { key: 'status', label: 'Statut' },
              ],
            }];
            break;
          case 'sterilization':
            sheets = [
              {
                name: 'Cycles',
                data: filtered.sterilizationCycles,
                headers: [
                  { key: 'cycle_number', label: 'N° Cycle' },
                  { key: 'sterilizer_id', label: 'Stérilisateur' },
                  { key: 'sterilizer_type', label: 'Type' },
                  { key: 'start_time', label: 'Début' },
                  { key: 'status', label: 'Statut' },
                  { key: 'result', label: 'Résultat' },
                ],
              },
              {
                name: 'Registre',
                data: filtered.sterilizationRegister,
                headers: [
                  { key: 'date_cycle', label: 'Date Cycle' },
                  { key: 'service_concerne', label: 'Service' },
                  { key: 'operateur_nom', label: 'Opérateur' },
                  { key: 'type_materiel', label: 'Type Matériel' },
                  { key: 'methode_sterilisation', label: 'Méthode' },
                  { key: 'status_cycle', label: 'Statut' },
                ],
              },
            ];
            break;
          case 'laundry':
            sheets = [{
              name: 'Suivi de Linge',
              data: filtered.laundryTracking,
              headers: [
                { key: 'date_reception', label: 'Date Réception' },
                { key: 'service_origine', label: 'Service Origine' },
                { key: 'type_linge', label: 'Type Linge' },
                { key: 'poids_kg', label: 'Poids (kg)' },
                { key: 'quantite', label: 'Quantité' },
                { key: 'status', label: 'Statut' },
              ],
            }];
            break;
          case 'overview':
            // Pour la vue d'ensemble, exporter un résumé avec statistiques
            const overviewData = [
              { Indicateur: 'Total Incidents', Valeur: stats.incidents.total },
              { Indicateur: 'Incidents Nouveaux', Valeur: stats.incidents.nouveau },
              { Indicateur: 'Incidents En Cours', Valeur: stats.incidents.cours },
              { Indicateur: 'Total Audits', Valeur: stats.audits.total },
              { Indicateur: 'Audits Planifiés', Valeur: stats.audits.planifie },
              { Indicateur: 'Total Formations', Valeur: stats.trainings.total },
              { Indicateur: 'Formations Planifiées', Valeur: stats.trainings.planifiee },
              { Indicateur: 'Total Déchets', Valeur: stats.medicalWaste.total },
              { Indicateur: 'Déchets Collectés', Valeur: stats.medicalWaste.collecte },
              { Indicateur: 'Total Risques', Valeur: stats.risks.total },
              { Indicateur: 'Risques Identifiés', Valeur: stats.risks.identifie },
            ];
            exportToExcel(overviewData, [
              { key: 'Indicateur', label: 'Indicateur' },
              { key: 'Valeur', label: 'Valeur' },
            ], `rapport-qhse-vue-ensemble-${format(new Date(), 'yyyy-MM-dd')}`);
            showSuccess('Rapport Excel exporté avec succès !');
            return;
        }
        
        if (sheets.length > 0) {
          exportMultipleSheetsToExcel(sheets, `rapport-qhse-${reportType}-${format(new Date(), 'yyyy-MM-dd')}`);
          showSuccess('Rapport Excel exporté avec succès !');
        } else {
          showError('Aucune donnée à exporter pour ce type de rapport');
        }
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'export Excel:', error);
      showError('Erreur lors de l\'export Excel: ' + (error.message || 'Erreur inconnue'));
    }
  };

  if (loading && reportData.incidents.length === 0) {
    return <LoadingSpinner />;
  }

  const stats = getStats();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icon name="BarChart" className="text-cyan-600 mr-2" />
            Module de Reporting QHSE
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Sélection du type de rapport */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Type de rapport</Label>
              <Select value={reportType} onValueChange={(value) => setReportType(value as ReportType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="overview">Vue d'ensemble</SelectItem>
                  <SelectItem value="incidents">Incidents/Tickets</SelectItem>
                  <SelectItem value="audits">Audits & Inspections</SelectItem>
                  <SelectItem value="trainings">Formations</SelectItem>
                  <SelectItem value="medical_waste">Déchets médicaux</SelectItem>
                  <SelectItem value="risks">Gestion des risques</SelectItem>
                  <SelectItem value="sterilization">Stérilisation</SelectItem>
                  <SelectItem value="laundry">Suivi de linge</SelectItem>
                  <SelectItem value="comprehensive">Rapport complet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Date de début</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>Date de fin</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-4">
                <div className="text-sm text-blue-600 mb-1">Incidents</div>
                <div className="text-2xl font-bold text-blue-700">{stats.incidents.total}</div>
                <div className="text-xs text-blue-500 mt-1">
                  {stats.incidents.nouveau} nouveau{stats.incidents.nouveau > 1 ? 'x' : ''}, {stats.incidents.cours} en cours
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-4">
                <div className="text-sm text-green-600 mb-1">Audits</div>
                <div className="text-2xl font-bold text-green-700">{stats.audits.total}</div>
                <div className="text-xs text-green-500 mt-1">
                  {stats.audits.planifie} planifié{stats.audits.planifie > 1 ? 's' : ''}, {stats.audits.en_cours} en cours
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200">
              <CardContent className="p-4">
                <div className="text-sm text-purple-600 mb-1">Formations</div>
                <div className="text-2xl font-bold text-purple-700">{stats.trainings.total}</div>
                <div className="text-xs text-purple-500 mt-1">
                  {stats.trainings.planifiee} planifiée{stats.trainings.planifiee > 1 ? 's' : ''}, {stats.trainings.en_cours} en cours
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
              <CardContent className="p-4">
                <div className="text-sm text-orange-600 mb-1">Déchets</div>
                <div className="text-2xl font-bold text-orange-700">{stats.medicalWaste.total}</div>
                <div className="text-xs text-orange-500 mt-1">
                  {stats.medicalWaste.collecte} collecté{stats.medicalWaste.collecte > 1 ? 's' : ''}, {stats.medicalWaste.traite} traité{stats.medicalWaste.traite > 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
              <CardContent className="p-4">
                <div className="text-sm text-red-600 mb-1">Risques</div>
                <div className="text-2xl font-bold text-red-700">{stats.risks.total}</div>
                <div className="text-xs text-red-500 mt-1">
                  {stats.risks.identifie} identifié{stats.risks.identifie > 1 ? 's' : ''}, {stats.risks.en_traitement} en traitement
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
              <CardContent className="p-4">
                <div className="text-sm text-teal-600 mb-1">Stérilisation</div>
                <div className="text-2xl font-bold text-teal-700">{stats.sterilization.cycles + stats.sterilization.register}</div>
                <div className="text-xs text-teal-500 mt-1">
                  {stats.sterilization.cycles} cycles, {stats.sterilization.register} registres
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200">
              <CardContent className="p-4">
                <div className="text-sm text-gray-600 mb-1">Suivi de linge</div>
                <div className="text-2xl font-bold text-gray-700">{stats.laundry.total}</div>
                <div className="text-xs text-gray-500 mt-1">
                  Suivis enregistrés
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Période sélectionnée */}
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-sm font-medium text-cyan-700">Période sélectionnée</div>
                <div className="text-sm text-cyan-600">
                  Du {format(new Date(startDate), 'dd MMMM yyyy', { locale: fr })} au {format(new Date(endDate), 'dd MMMM yyyy', { locale: fr })}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleGenerateReport}
                disabled={loading}
                className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 hover:from-cyan-700 hover:via-blue-700 hover:to-teal-700"
              >
                <Icon name={loading ? "Clock" : "Download"} className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Génération...' : 'Exporter PDF'}
              </Button>
              <Button
                onClick={handleExportExcel}
                disabled={loading}
                variant="outline"
                className="border-cyan-600 text-cyan-600 hover:bg-cyan-50"
              >
                <Icon name="FileText" className="mr-2 h-4 w-4" />
                Exporter Excel
              </Button>
            </div>
          </div>

          {/* Détails par type de rapport */}
          {reportType === 'overview' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Résumé de la période</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">{stats.incidents.total}</div>
                      <div className="text-sm text-blue-600 mt-1">Incidents</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">{stats.audits.total}</div>
                      <div className="text-sm text-green-600 mt-1">Audits</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-3xl font-bold text-purple-600">{stats.trainings.total}</div>
                      <div className="text-sm text-purple-600 mt-1">Formations</div>
                    </div>
                    <div className="text-center p-4 bg-red-50 rounded-lg">
                      <div className="text-3xl font-bold text-red-600">{stats.risks.total}</div>
                      <div className="text-sm text-red-600 mt-1">Risques</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

