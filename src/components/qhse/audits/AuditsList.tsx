import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { Audit, AuditType, AuditStatus, AuditChecklist, AuditActionPlan, ComplianceStatus, Users } from "@/types";
import { apiClient } from "@/integrations/api/client";
import { showSuccess, showError } from "@/utils/toast";
import { format, isBefore, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFilterAndSearch } from "@/components/shared/SearchAndFilter";
import { LoadingSpinner } from "@/components/shared/Loading";
import { exportToExcel } from "@/utils/excelExport";
import { ExcelImportButton } from "@/components/shared/ExcelImportButton";
import { generateAuditReportPDF } from "@/utils/auditReportGenerator";
import { DashboardCard } from "@/components/shared/DashboardCard";

const auditTypeLabels: Record<AuditType, string> = {
  interne: "Audit Interne",
  externe: "Audit Externe",
  certification: "Audit Certification",
  inspection: "Inspection",
};

const statusLabels: Record<AuditStatus, string> = {
  planifié: "Planifié",
  en_cours: "En cours",
  terminé: "Terminé",
  annulé: "Annulé",
};

const statusColors: Record<AuditStatus, string> = {
  planifié: "bg-blue-100 text-blue-700",
  en_cours: "bg-yellow-100 text-yellow-700",
  terminé: "bg-green-100 text-green-700",
  annulé: "bg-red-100 text-red-700",
};

interface AuditsListProps {
  users?: Users;
}

export const AuditsList = ({ users }: AuditsListProps = {}) => {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [statusFilter, setStatusFilter] = useState<AuditStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<AuditType | 'all'>('all');

  const { filteredData: baseFilteredAudits, searchQuery, setSearchQuery } = useFilterAndSearch(
    audits,
    ['title', 'scope', 'audited_department']
  );

  // Filtres supplémentaires par statut et type
  const filteredAudits = useMemo(() => {
    return baseFilteredAudits.filter(audit => {
      if (statusFilter !== 'all' && audit.status !== statusFilter) return false;
      if (typeFilter !== 'all' && audit.audit_type !== typeFilter) return false;
      return true;
    });
  }, [baseFilteredAudits, statusFilter, typeFilter]);

  // Statistiques
  const stats = useMemo(() => {
    const total = audits.length;
    const planifie = audits.filter(a => a.status === 'planifié').length;
    const enCours = audits.filter(a => a.status === 'en_cours').length;
    const termine = audits.filter(a => a.status === 'terminé').length;
    const annule = audits.filter(a => a.status === 'annulé').length;
    
    const today = new Date();
    const aVenir = audits.filter(a => 
      a.status === 'planifié' && 
      a.planned_date && 
      differenceInDays(a.planned_date, today) >= 0 &&
      differenceInDays(a.planned_date, today) <= 30
    ).length;
    
    const enRetard = audits.filter(a => 
      a.status === 'planifié' && 
      a.planned_date && 
      isBefore(a.planned_date, today)
    ).length;
    
    const totalNonConformites = audits.reduce((sum, a) => sum + (a.non_conformities_count || 0), 0);
    const totalConformites = audits.reduce((sum, a) => sum + (a.conformities_count || 0), 0);
    const totalOpportunites = audits.reduce((sum, a) => sum + (a.opportunities_count || 0), 0);
    
    return {
      total,
      planifie,
      enCours,
      termine,
      annule,
      aVenir,
      enRetard,
      totalNonConformites,
      totalConformites,
      totalOpportunites,
    };
  }, [audits]);

  useEffect(() => {
    fetchAudits();
  }, []);

  const fetchAudits = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getAudits();
      setAudits(data.map((audit: any) => ({
        ...audit,
        planned_date: new Date(audit.planned_date),
        actual_date: audit.actual_date ? new Date(audit.actual_date) : undefined,
        created_at: new Date(audit.created_at),
        updated_at: new Date(audit.updated_at),
      })));
    } catch (error: any) {
      showError("Erreur lors du chargement des audits: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAudit = async (auditData: any) => {
    try {
      await apiClient.createAudit(auditData);
      showSuccess("Audit créé avec succès");
      setIsDialogOpen(false);
      fetchAudits();
    } catch (error: any) {
      showError("Erreur lors de la création: " + error.message);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Icon name="ClipboardCheck" className="text-cyan-600 mr-2" />
          Audits & Inspections
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              exportToExcel(
                filteredAudits,
                [
                  { key: 'title', label: 'Titre' },
                  { key: 'audit_type', label: 'Type' },
                  { key: 'planned_date', label: 'Date Planifiée' },
                  { key: 'actual_date', label: 'Date Réelle' },
                  { key: 'audited_department', label: 'Département' },
                  { key: 'status', label: 'Statut' },
                  { key: 'non_conformities_count', label: 'Non-conformités' },
                  { key: 'scope', label: 'Scope' },
                ],
                'audits',
                'Audits'
              );
              showSuccess('Export Excel réussi !');
            }}
            className="border-green-600 text-green-600 hover:bg-green-50"
          >
            <Icon name="Download" className="mr-2 h-4 w-4" />
            Exporter Excel
          </Button>
          <ExcelImportButton
            onImport={async (data: any[]) => {
              for (const item of data) {
                await apiClient.createAudit({
                  title: item.title || item.Titre,
                  audit_type: item.audit_type || item.Type,
                  scope: item.scope || item.Scope || '',
                  planned_date: item.planned_date || item['Date Planifiée'],
                  auditor_id: item.auditor_id || null,
                  audited_department: item.audited_department || item.Département || null,
                });
              }
              await fetchAudits();
            }}
            requiredFields={['title', 'Titre']}
            fieldMapping={{
              'Titre': 'title',
              'Type': 'audit_type',
              'Date Planifiée': 'planned_date',
              'Scope': 'scope',
              'Département': 'audited_department',
            }}
            buttonText="Importer Excel"
            dialogTitle="Importer des audits depuis Excel"
            dialogDescription="Importez des audits depuis un fichier Excel. Les colonnes doivent inclure: Titre, Type, Date Planifiée, Scope, Département."
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
                <Icon name="Plus" className="mr-2 h-4 w-4" /> Nouvel Audit
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Programmer un nouvel audit</DialogTitle>
              </DialogHeader>
              <AuditForm onSubmit={handleCreateAudit} onCancel={() => setIsDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <DashboardCard
            title="Total Audits"
            value={stats.total}
            iconName="ClipboardCheck"
            colorClass="bg-blue-100 text-blue-600"
          />
          <DashboardCard
            title="Planifiés"
            value={stats.planifie}
            iconName="Calendar"
            colorClass="bg-cyan-100 text-cyan-600"
          />
          <DashboardCard
            title="En Cours"
            value={stats.enCours}
            iconName="Clock"
            colorClass="bg-yellow-100 text-yellow-600"
          />
          <DashboardCard
            title="Terminés"
            value={stats.termine}
            iconName="CheckCircle2"
            colorClass="bg-green-100 text-green-600"
          />
          <DashboardCard
            title="À Venir (30j)"
            value={stats.aVenir}
            iconName="CalendarDays"
            colorClass="bg-purple-100 text-purple-600"
          />
          <DashboardCard
            title="En Retard"
            value={stats.enRetard}
            iconName="AlertTriangle"
            colorClass="bg-red-100 text-red-600"
          />
        </div>

        {/* Statistiques des constats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-700 mb-1">Non-conformités</p>
                  <p className="text-2xl font-bold text-red-800">{stats.totalNonConformites}</p>
                </div>
                <Icon name="XCircle" className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 mb-1">Conformités</p>
                  <p className="text-2xl font-bold text-green-800">{stats.totalConformites}</p>
                </div>
                <Icon name="CheckCircle" className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 mb-1">Opportunités</p>
                  <p className="text-2xl font-bold text-blue-800">{stats.totalOpportunites}</p>
                </div>
                <Icon name="Lightbulb" className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres et recherche */}
        <div className="mb-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Rechercher par titre, périmètre, département..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as AuditStatus | 'all')}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les statuts</SelectItem>
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as AuditType | 'all')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les types</SelectItem>
                  {Object.entries(auditTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(statusFilter !== 'all' || typeFilter !== 'all' || searchQuery) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setStatusFilter('all');
                    setTypeFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-xs"
                >
                  <Icon name="X" className="h-4 w-4 mr-1" />
                  Réinitialiser
                </Button>
              )}
            </div>
          </div>
          {(statusFilter !== 'all' || typeFilter !== 'all' || searchQuery) && (
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Icon name="Filter" className="h-4 w-4" />
              <span>
                {filteredAudits.length} audit{filteredAudits.length > 1 ? 's' : ''} trouvé{filteredAudits.length > 1 ? 's' : ''} 
                {filteredAudits.length !== audits.length && ` sur ${audits.length} total`}
              </span>
            </div>
          )}
        </div>

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="font-semibold">Titre</TableHead>
                <TableHead className="font-semibold">Type</TableHead>
                <TableHead className="font-semibold">Date Planifiée</TableHead>
                <TableHead className="font-semibold">Date Réelle</TableHead>
                <TableHead className="font-semibold">Département</TableHead>
                <TableHead className="font-semibold text-center">Constats</TableHead>
                <TableHead className="font-semibold">Statut</TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAudits.length > 0 ? filteredAudits.map((audit) => {
                const isOverdue = audit.status === 'planifié' && audit.planned_date && isBefore(audit.planned_date, new Date());
                const daysUntil = audit.planned_date ? differenceInDays(audit.planned_date, new Date()) : null;
                
                return (
                  <TableRow 
                    key={audit.id} 
                    className={isOverdue ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {isOverdue && <Icon name="AlertTriangle" className="h-4 w-4 text-red-600" />}
                        {audit.title}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {auditTypeLabels[audit.audit_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{format(audit.planned_date, 'dd/MM/yyyy')}</span>
                        {daysUntil !== null && daysUntil >= 0 && daysUntil <= 7 && (
                          <span className="text-xs text-orange-600 font-medium">
                            Dans {daysUntil} jour{daysUntil > 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {audit.actual_date ? (
                        <span className="text-sm">{format(new Date(audit.actual_date), 'dd/MM/yyyy')}</span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{audit.audited_department || '-'}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        {audit.non_conformities_count > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            NC: {audit.non_conformities_count}
                          </Badge>
                        )}
                        {audit.conformities_count > 0 && (
                          <Badge className="bg-green-100 text-green-700 text-xs">
                            C: {audit.conformities_count}
                          </Badge>
                        )}
                        {audit.opportunities_count > 0 && (
                          <Badge className="bg-blue-100 text-blue-700 text-xs">
                            O: {audit.opportunities_count}
                          </Badge>
                        )}
                        {(!audit.non_conformities_count && !audit.conformities_count && !audit.opportunities_count) && (
                          <span className="text-gray-400 text-xs">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[audit.status]}>
                        {statusLabels[audit.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => {
                            setSelectedAudit(audit);
                            setIsDetailsDialogOpen(true);
                          }}
                          title="Voir les détails"
                        >
                          <Icon name="Eye" className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12">
                    <Icon name="ClipboardCheck" className="mx-auto text-5xl text-gray-300 mb-3" />
                    <p className="text-gray-500 font-medium">
                      {searchQuery || statusFilter !== 'all' || typeFilter !== 'all' 
                        ? 'Aucun audit ne correspond aux filtres sélectionnés.' 
                        : 'Aucun audit programmé.'}
                    </p>
                    {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('');
                          setStatusFilter('all');
                          setTypeFilter('all');
                        }}
                        className="mt-4"
                      >
                        <Icon name="X" className="h-4 w-4 mr-1" />
                        Réinitialiser les filtres
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Dialog de détails de l'audit */}
      {selectedAudit && (
        <AuditDetailsDialog
          audit={selectedAudit}
          isOpen={isDetailsDialogOpen}
          onClose={() => {
            setIsDetailsDialogOpen(false);
            setSelectedAudit(null);
          }}
          onUpdate={fetchAudits}
          users={users}
          onGenerateReport={async (checklists?: AuditChecklist[], actionPlans?: AuditActionPlan[]) => {
            if (selectedAudit) {
              setIsGeneratingReport(true);
              try {
                await generateAuditReportPDF(selectedAudit, users, checklists, actionPlans);
                showSuccess('Rapport PDF généré avec succès !');
              } catch (error: any) {
                console.error('Erreur lors de la génération du rapport:', error);
                showError('Erreur lors de la génération du rapport PDF.');
              } finally {
                setIsGeneratingReport(false);
              }
            }
          }}
          isGeneratingReport={isGeneratingReport}
        />
      )}
    </Card>
  );
};

// Interface pour un constat (finding)
interface Finding {
  id: string;
  type: 'conformité' | 'non_conformité' | 'opportunité';
  description: string;
  severity?: 'mineure' | 'majeure' | 'critique';
  action_plan?: string;
}

// Dialog de détails de l'audit avec génération de rapport
const AuditDetailsDialog = ({ 
  audit, 
  isOpen, 
  onClose, 
  onUpdate,
  users,
  onGenerateReport,
  isGeneratingReport
}: { 
  audit: Audit; 
  isOpen: boolean; 
  onClose: () => void; 
  onUpdate: () => void;
  users?: Users;
  onGenerateReport: (checklists?: AuditChecklist[], actionPlans?: AuditActionPlan[]) => void;
  isGeneratingReport: boolean;
}) => {
  const [currentStatus, setCurrentStatus] = useState<AuditStatus>(audit.status);
  const [actualDate, setActualDate] = useState(audit.actual_date ? format(audit.actual_date, 'yyyy-MM-dd') : '');
  const [findings, setFindings] = useState<Finding[]>([]);
  const [isAddingFinding, setIsAddingFinding] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [checklists, setChecklists] = useState<AuditChecklist[]>([]);
  const [isAddingChecklist, setIsAddingChecklist] = useState(false);
  const [actionPlans, setActionPlans] = useState<AuditActionPlan[]>([]);
  const [isAddingActionPlan, setIsAddingActionPlan] = useState(false);

  // Mettre à jour les états quand l'audit change
  useEffect(() => {
    setCurrentStatus(audit.status);
    setActualDate(audit.actual_date ? format(audit.actual_date, 'yyyy-MM-dd') : '');
    
    // Charger les constats depuis findings
    if (audit.findings) {
      try {
        const parsedFindings = typeof audit.findings === 'string' 
          ? JSON.parse(audit.findings) 
          : audit.findings;
        if (Array.isArray(parsedFindings)) {
          setFindings(parsedFindings);
        }
      } catch (e) {
        console.error('Erreur lors du parsing des findings:', e);
        setFindings([]);
      }
    } else {
      setFindings([]);
    }
  }, [audit]);


  const handleStatusChange = async (newStatus: AuditStatus) => {
    try {
      setIsUpdatingStatus(true);
      const updateData: any = { status: newStatus };
      
      // Si on démarre l'audit (en_cours), mettre à jour la date réelle
      if (newStatus === 'en_cours' && !audit.actual_date) {
        updateData.actual_date = new Date().toISOString().split('T')[0];
        setActualDate(updateData.actual_date);
      }
      
      // Si on termine l'audit, s'assurer que la date réelle est définie
      if (newStatus === 'terminé' && !actualDate) {
        updateData.actual_date = new Date().toISOString().split('T')[0];
        setActualDate(updateData.actual_date);
      }

      await apiClient.updateAudit(audit.id, updateData);
      setCurrentStatus(newStatus);
      showSuccess(`Statut de l'audit mis à jour: ${statusLabels[newStatus]}`);
      onUpdate();
    } catch (error: any) {
      showError("Erreur lors de la mise à jour du statut: " + error.message);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddFinding = async (finding: Omit<Finding, 'id'>) => {
    try {
      const newFinding: Finding = {
        ...finding,
        id: Date.now().toString(),
      };
      
      const updatedFindings = [...findings, newFinding];
      setFindings(updatedFindings);
      
      // Calculer les compteurs
      const nonConformitiesCount = updatedFindings.filter(f => f.type === 'non_conformité').length;
      const conformitiesCount = updatedFindings.filter(f => f.type === 'conformité').length;
      const opportunitiesCount = updatedFindings.filter(f => f.type === 'opportunité').length;
      
      // Mettre à jour l'audit avec les nouveaux constats et compteurs
      await apiClient.updateAudit(audit.id, {
        findings: JSON.stringify(updatedFindings),
        non_conformities_count: nonConformitiesCount,
        conformities_count: conformitiesCount,
        opportunities_count: opportunitiesCount,
      });
      
      showSuccess("Constat ajouté avec succès");
      setIsAddingFinding(false);
      onUpdate();
    } catch (error: any) {
      showError("Erreur lors de l'ajout du constat: " + error.message);
    }
  };

  const handleDeleteFinding = async (findingId: string) => {
    try {
      const updatedFindings = findings.filter(f => f.id !== findingId);
      setFindings(updatedFindings);
      
      // Recalculer les compteurs
      const nonConformitiesCount = updatedFindings.filter(f => f.type === 'non_conformité').length;
      const conformitiesCount = updatedFindings.filter(f => f.type === 'conformité').length;
      const opportunitiesCount = updatedFindings.filter(f => f.type === 'opportunité').length;
      
      await apiClient.updateAudit(audit.id, {
        findings: JSON.stringify(updatedFindings),
        non_conformities_count: nonConformitiesCount,
        conformities_count: conformitiesCount,
        opportunities_count: opportunitiesCount,
      });
      
      showSuccess("Constat supprimé");
      onUpdate();
    } catch (error: any) {
      showError("Erreur lors de la suppression: " + error.message);
    }
  };

  // Gestion des checklists
  const handleAddChecklist = async (checklistData: Omit<AuditChecklist, 'id' | 'audit_id' | 'created_at' | 'updated_at'>) => {
    try {
      const newChecklist = await apiClient.createAuditChecklist(audit.id, checklistData);
      setChecklists([...checklists, newChecklist]);
      showSuccess("Item de checklist ajouté");
      setIsAddingChecklist(false);
      onUpdate();
    } catch (error: any) {
      showError("Erreur lors de l'ajout: " + error.message);
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    try {
      await apiClient.deleteAuditChecklist(checklistId);
      setChecklists(checklists.filter(c => c.id !== checklistId));
      showSuccess("Item de checklist supprimé");
      onUpdate();
    } catch (error: any) {
      showError("Erreur lors de la suppression: " + error.message);
    }
  };

  // Gestion des plans d'action
  const handleAddActionPlan = async (actionPlanData: Omit<AuditActionPlan, 'id' | 'audit_id' | 'created_at' | 'updated_at' | 'created_by'>) => {
    try {
      const newActionPlan = await apiClient.createAuditActionPlan(audit.id, actionPlanData);
      setActionPlans([...actionPlans, newActionPlan]);
      showSuccess("Plan d'action ajouté");
      setIsAddingActionPlan(false);
      onUpdate();
    } catch (error: any) {
      showError("Erreur lors de l'ajout: " + error.message);
    }
  };

  const handleDeleteActionPlan = async (actionPlanId: string) => {
    try {
      await apiClient.deleteAuditActionPlan(actionPlanId);
      setActionPlans(actionPlans.filter(p => p.id !== actionPlanId));
      showSuccess("Plan d'action supprimé");
      onUpdate();
    } catch (error: any) {
      showError("Erreur lors de la suppression: " + error.message);
    }
  };

  // Charger les checklists et plans d'action
  useEffect(() => {
    const loadChecklistsAndActionPlans = async () => {
      try {
        const [checklistsData, actionPlansData] = await Promise.all([
          apiClient.getAuditChecklists(audit.id),
          apiClient.getAuditActionPlans(audit.id),
        ]);
        setChecklists(checklistsData);
        setActionPlans(actionPlansData);
      } catch (error: any) {
        console.error("Erreur lors du chargement:", error);
      }
    };
    
    if (isOpen) {
      loadChecklistsAndActionPlans();
    }
  }, [audit.id, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Icon name="ClipboardCheck" className="text-cyan-600 mr-2" />
            Détails de l'Audit
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Titre</Label>
              <p className="text-lg font-medium">{audit.title}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Type</Label>
              <Badge className={statusColors[audit.status]}>
                {auditTypeLabels[audit.audit_type]}
              </Badge>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Date Planifiée</Label>
              <p>{format(audit.planned_date, 'dd/MM/yyyy')}</p>
            </div>
            {audit.actual_date && (
              <div>
                <Label className="text-sm font-semibold text-gray-700">Date Réelle</Label>
                <p>{format(audit.actual_date, 'dd/MM/yyyy')}</p>
              </div>
            )}
            <div>
              <Label className="text-sm font-semibold text-gray-700">Département</Label>
              <p>{audit.audited_department || '-'}</p>
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Statut</Label>
              <div className="flex items-center gap-2 mt-1">
                <Select 
                  value={currentStatus} 
                  onValueChange={(v) => handleStatusChange(v as AuditStatus)}
                  disabled={isUpdatingStatus}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {isUpdatingStatus && (
                  <Icon name="Clock" className="h-4 w-4 animate-spin text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Périmètre */}
          <div>
            <Label className="text-sm font-semibold text-gray-700">Périmètre</Label>
            <p className="mt-1 text-gray-600 whitespace-pre-wrap">{audit.scope}</p>
          </div>

          {/* Statistiques */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <Label className="text-sm font-semibold text-red-700">Non-conformités</Label>
              <p className="text-2xl font-bold text-red-600">{findings.filter(f => f.type === 'non_conformité').length}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <Label className="text-sm font-semibold text-green-700">Conformités</Label>
              <p className="text-2xl font-bold text-green-600">{findings.filter(f => f.type === 'conformité').length}</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <Label className="text-sm font-semibold text-blue-700">Opportunités</Label>
              <p className="text-2xl font-bold text-blue-600">{findings.filter(f => f.type === 'opportunité').length}</p>
            </div>
          </div>

          {/* Gestion des constats (Conformités, Non-conformités, Opportunités) */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-semibold text-gray-700">Constats de l'Audit</Label>
              <Button
                size="sm"
                onClick={() => setIsAddingFinding(true)}
                className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600"
              >
                <Icon name="Plus" className="mr-2 h-4 w-4" />
                Ajouter un constat
              </Button>
            </div>

            {findings.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                <Icon name="ClipboardCheck" className="mx-auto text-3xl mb-2 text-gray-300" />
                <p>Aucun constat enregistré. Cliquez sur "Ajouter un constat" pour commencer.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {findings.map((finding) => (
                  <div
                    key={finding.id}
                    className={`p-4 rounded-lg border-2 ${
                      finding.type === 'non_conformité'
                        ? 'bg-red-50 border-red-200'
                        : finding.type === 'conformité'
                        ? 'bg-green-50 border-green-200'
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge
                            className={
                              finding.type === 'non_conformité'
                                ? 'bg-red-600 text-white'
                                : finding.type === 'conformité'
                                ? 'bg-green-600 text-white'
                                : 'bg-blue-600 text-white'
                            }
                          >
                            {finding.type === 'non_conformité'
                              ? 'Non-conformité'
                              : finding.type === 'conformité'
                              ? 'Conformité'
                              : 'Opportunité'}
                          </Badge>
                          {finding.severity && (
                            <Badge variant="outline">
                              {finding.severity === 'critique'
                                ? 'Critique'
                                : finding.severity === 'majeure'
                                ? 'Majeure'
                                : 'Mineure'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{finding.description}</p>
                        {finding.action_plan && (
                          <div className="mt-2 pt-2 border-t border-gray-300">
                            <Label className="text-xs font-semibold text-gray-600">Plan d'action:</Label>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{finding.action_plan}</p>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteFinding(finding.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Icon name="Trash2" className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dialog pour ajouter un constat */}
            {isAddingFinding && (
              <FindingFormDialog
                isOpen={isAddingFinding}
                onClose={() => setIsAddingFinding(false)}
                onSubmit={handleAddFinding}
              />
            )}
          </div>

          {/* Gestion des Checklists */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-semibold text-gray-700">Checklist d'Audit</Label>
              <Button
                size="sm"
                onClick={() => setIsAddingChecklist(true)}
                className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600"
              >
                <Icon name="Plus" className="mr-2 h-4 w-4" />
                Ajouter un item
              </Button>
            </div>

            {checklists.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                <Icon name="ClipboardCheck" className="mx-auto text-3xl mb-2 text-gray-300" />
                <p>Aucun item de checklist. Cliquez sur "Ajouter un item" pour créer votre checklist.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {checklists.map((item) => (
                  <div key={item.id} className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-800">{item.question}</p>
                          <Badge
                            className={
                              item.compliance_status === 'conforme'
                                ? 'bg-green-600 text-white'
                                : item.compliance_status === 'non_conforme'
                                ? 'bg-red-600 text-white'
                                : item.compliance_status === 'non_applicable'
                                ? 'bg-gray-600 text-white'
                                : 'bg-yellow-600 text-white'
                            }
                          >
                            {item.compliance_status === 'conforme'
                              ? 'Conforme'
                              : item.compliance_status === 'non_conforme'
                              ? 'Non conforme'
                              : item.compliance_status === 'non_applicable'
                              ? 'Non applicable'
                              : 'Non évalué'}
                          </Badge>
                        </div>
                        {item.requirement && (
                          <p className="text-sm text-gray-600 mb-2">
                            <strong>Exigence:</strong> {item.requirement}
                          </p>
                        )}
                        {item.observation && (
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            <strong>Observation:</strong> {item.observation}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteChecklist(item.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Icon name="Trash2" className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dialog pour ajouter/modifier un item de checklist */}
            {isAddingChecklist && (
              <ChecklistItemDialog
                isOpen={isAddingChecklist}
                onClose={() => setIsAddingChecklist(false)}
                onSubmit={handleAddChecklist}
              />
            )}
          </div>

          {/* Gestion des Plans d'Action Structurés */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-semibold text-gray-700">Plans d'Action</Label>
              <Button
                size="sm"
                onClick={() => setIsAddingActionPlan(true)}
                className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600"
              >
                <Icon name="Plus" className="mr-2 h-4 w-4" />
                Ajouter un plan d'action
              </Button>
            </div>

            {actionPlans.length === 0 ? (
              <div className="p-4 bg-gray-50 rounded-lg text-center text-gray-500">
                <Icon name="ListChecks" className="mx-auto text-3xl mb-2 text-gray-300" />
                <p>Aucun plan d'action. Cliquez sur "Ajouter un plan d'action" pour en créer un.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {actionPlans.map((plan) => (
                  <div key={plan.id} className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <p className="font-semibold text-gray-800">{plan.title}</p>
                          <Badge
                            className={
                              plan.action_type === 'corrective'
                                ? 'bg-red-100 text-red-700'
                                : plan.action_type === 'preventive'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }
                          >
                            {plan.action_type === 'corrective'
                              ? 'Corrective'
                              : plan.action_type === 'preventive'
                              ? 'Préventive'
                              : 'Amélioration'}
                          </Badge>
                          <Badge
                            className={
                              plan.priority === 'critique'
                                ? 'bg-red-600 text-white'
                                : plan.priority === 'haute'
                                ? 'bg-orange-600 text-white'
                                : plan.priority === 'moyenne'
                                ? 'bg-yellow-600 text-white'
                                : 'bg-green-600 text-white'
                            }
                          >
                            {plan.priority}
                          </Badge>
                          <Badge variant="outline">
                            {plan.status === 'planifié'
                              ? 'Planifié'
                              : plan.status === 'en_cours'
                              ? 'En cours'
                              : plan.status === 'terminé'
                              ? 'Terminé'
                              : plan.status === 'verifié'
                              ? 'Vérifié'
                              : 'Annulé'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap mb-2">{plan.description}</p>
                        {plan.assigned_to_name && (
                          <p className="text-xs text-gray-600">
                            <strong>Assigné à:</strong> {plan.assigned_to_name}
                          </p>
                        )}
                        {plan.due_date && (
                          <p className="text-xs text-gray-600">
                            <strong>Échéance:</strong> {format(new Date(plan.due_date), 'dd/MM/yyyy')}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteActionPlan(plan.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Icon name="Trash2" className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Dialog pour ajouter un plan d'action */}
            {isAddingActionPlan && (
              <ActionPlanDialog
                isOpen={isAddingActionPlan}
                onClose={() => setIsAddingActionPlan(false)}
                onSubmit={handleAddActionPlan}
                auditId={audit.id}
                findings={findings}
                users={users}
              />
            )}
          </div>

          {/* Génération du rapport détaillé */}
          <div className="border-t pt-4">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Rapport Détaillé de l'Audit</Label>
            
            <div className="p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border-2 border-cyan-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Icon name="FileBarChart" className="text-cyan-600 mr-3 text-2xl" />
                  <div>
                    <p className="font-semibold text-gray-800">Rapport PDF Complet</p>
                    <p className="text-sm text-gray-600">
                      Génère un rapport structuré avec toutes les informations de l'audit, 
                      les constats détaillés et le logo du Centre Diagnostic Libreville.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => onGenerateReport(checklists, actionPlans)}
                  disabled={isGeneratingReport}
                  className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 hover:from-cyan-700 hover:via-blue-700 hover:to-teal-700"
                >
                  {isGeneratingReport ? (
                    <>
                      <Icon name="Clock" className="mr-2 h-4 w-4 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <Icon name="Download" className="mr-2 h-4 w-4" />
                      Générer le Rapport PDF
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Dialog pour ajouter un constat
const FindingFormDialog = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (finding: Omit<Finding, 'id'>) => void;
}) => {
  const [type, setType] = useState<'conformité' | 'non_conformité' | 'opportunité'>('conformité');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'mineure' | 'majeure' | 'critique'>('mineure');
  const [actionPlan, setActionPlan] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      showError("La description est requise");
      return;
    }
    
    onSubmit({
      type,
      description: description.trim(),
      severity: type === 'non_conformité' ? severity : undefined,
      action_plan: actionPlan.trim() || undefined,
    });
    
    // Reset form
    setType('conformité');
    setDescription('');
    setSeverity('mineure');
    setActionPlan('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter un constat</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Type de constat *</Label>
            <Select value={type} onValueChange={(v) => setType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="conformité">✅ Conformité</SelectItem>
                <SelectItem value="non_conformité">❌ Non-conformité</SelectItem>
                <SelectItem value="opportunité">💡 Opportunité d'amélioration</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {type === 'non_conformité' && (
            <div>
              <Label>Sévérité *</Label>
              <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mineure">Mineure</SelectItem>
                  <SelectItem value="majeure">Majeure</SelectItem>
                  <SelectItem value="critique">Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Décrivez le constat en détail..."
            />
          </div>

          <div>
            <Label>Plan d'action (optionnel)</Label>
            <Textarea
              value={actionPlan}
              onChange={(e) => setActionPlan(e.target.value)}
              rows={3}
              placeholder="Décrivez les actions correctives ou préventives à mettre en place..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const AuditForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [title, setTitle] = useState('');
  const [auditType, setAuditType] = useState<AuditType>('interne');
  const [scope, setScope] = useState('');
  const [plannedDate, setPlannedDate] = useState('');
  const [auditedDepartment, setAuditedDepartment] = useState('');
  const [recurrenceType, setRecurrenceType] = useState<'aucune' | 'quotidienne' | 'hebdomadaire' | 'mensuelle' | 'trimestrielle' | 'semestrielle' | 'annuelle'>('aucune');
  const [reminderDaysBefore, setReminderDaysBefore] = useState(7);
  const [autoGenerateReport, setAutoGenerateReport] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      title,
      audit_type: auditType,
      scope,
      planned_date: plannedDate,
      audited_department: auditedDepartment,
      recurrence_type: recurrenceType,
      reminder_days_before: reminderDaysBefore,
      auto_generate_report: autoGenerateReport,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Titre *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type d'audit *</Label>
          <Select value={auditType} onValueChange={(v) => setAuditType(v as AuditType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(auditTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Date planifiée *</Label>
          <Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} required />
        </div>
      </div>
      <div>
        <Label>Périmètre *</Label>
        <Textarea value={scope} onChange={(e) => setScope(e.target.value)} required rows={3} />
      </div>
      <div>
        <Label>Département audité</Label>
        <Input value={auditedDepartment} onChange={(e) => setAuditedDepartment(e.target.value)} />
      </div>
      
      {/* Programmation */}
      <div className="border-t pt-4">
        <Label className="text-sm font-semibold text-gray-700 mb-3 block">Programmation</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Récurrence</Label>
            <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="aucune">Aucune</SelectItem>
                <SelectItem value="quotidienne">Quotidienne</SelectItem>
                <SelectItem value="hebdomadaire">Hebdomadaire</SelectItem>
                <SelectItem value="mensuelle">Mensuelle</SelectItem>
                <SelectItem value="trimestrielle">Trimestrielle</SelectItem>
                <SelectItem value="semestrielle">Semestrielle</SelectItem>
                <SelectItem value="annuelle">Annuelle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rappel (jours avant)</Label>
            <Input 
              type="number" 
              value={reminderDaysBefore} 
              onChange={(e) => setReminderDaysBefore(parseInt(e.target.value) || 7)} 
              min="1"
            />
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="auto-generate-report"
              checked={autoGenerateReport}
              onChange={(e) => setAutoGenerateReport(e.target.checked)}
              className="rounded"
            />
            <Label htmlFor="auto-generate-report" className="cursor-pointer">
              Générer automatiquement le rapport à la fin de l'audit
            </Label>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">Créer</Button>
      </div>
    </form>
  );
};

// Dialog pour ajouter/modifier un item de checklist
const ChecklistItemDialog = ({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<AuditChecklist, 'id' | 'audit_id' | 'created_at' | 'updated_at'>) => void;
}) => {
  const [question, setQuestion] = useState('');
  const [requirement, setRequirement] = useState('');
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus>('non_évalué');
  const [observation, setObservation] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      showError("La question est requise");
      return;
    }
    
    onSubmit({
      question: question.trim(),
      requirement: requirement.trim() || undefined,
      compliance_status: complianceStatus,
      observation: observation.trim() || undefined,
    });
    
    // Reset form
    setQuestion('');
    setRequirement('');
    setComplianceStatus('non_évalué');
    setObservation('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter un item de checklist</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Question / Point de contrôle *</Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              rows={3}
              placeholder="Ex: Les équipements de protection individuelle sont-ils disponibles et en bon état ?"
            />
          </div>

          <div>
            <Label>Exigence / Référence (optionnel)</Label>
            <Input
              value={requirement}
              onChange={(e) => setRequirement(e.target.value)}
              placeholder="Ex: ISO 14001, Article 5.2..."
            />
          </div>

          <div>
            <Label>Statut de conformité *</Label>
            <Select value={complianceStatus} onValueChange={(v) => setComplianceStatus(v as ComplianceStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="non_évalué">⏳ Non évalué</SelectItem>
                <SelectItem value="conforme">✅ Conforme</SelectItem>
                <SelectItem value="non_conforme">❌ Non conforme</SelectItem>
                <SelectItem value="non_applicable">➖ Non applicable</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observation (optionnel)</Label>
            <Textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={4}
              placeholder="Notes et observations sur ce point de contrôle..."
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Dialog pour ajouter un plan d'action
const ActionPlanDialog = ({
  isOpen,
  onClose,
  onSubmit,
  auditId,
  findings,
  users,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<AuditActionPlan, 'id' | 'audit_id' | 'created_at' | 'updated_at' | 'created_by'>) => void;
  auditId: string;
  findings: Finding[];
  users?: Users;
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [actionType, setActionType] = useState<'corrective' | 'preventive' | 'amelioration'>('corrective');
  const [priority, setPriority] = useState<'faible' | 'moyenne' | 'haute' | 'critique'>('moyenne');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [findingId, setFindingId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      showError("Le titre et la description sont requis");
      return;
    }
    
    onSubmit({
      title: title.trim(),
      description: description.trim(),
      action_type: actionType,
      priority,
      assigned_to: assignedTo && assignedTo !== 'none' ? assignedTo : undefined,
      due_date: dueDate ? new Date(dueDate) : undefined,
      finding_id: findingId && findingId !== 'none' ? findingId : undefined,
      status: 'planifié',
    });
    
    // Reset form
    setTitle('');
    setDescription('');
    setActionType('corrective');
    setPriority('moyenne');
    setAssignedTo('');
    setDueDate('');
    setFindingId('');
  };

  // Fonction pour obtenir le label d'un rôle
  const getRoleLabel = (role: string): string => {
    const roleLabels: Record<string, string> = {
      'superviseur_qhse': 'Superviseur QHSE',
      'assistante_qhse': 'Assistante QHSE',
      'agent_entretien': 'Agent Entretien',
      'agent_securite': 'Agent Sécurité',
      'technicien': 'Technicien Biomédical',
      'technicien_polyvalent': 'Technicien Polyvalent',
      'biomedical': 'Technicien Biomédical',
      'superviseur_technicien': 'Superviseur Technique',
    };
    return roleLabels[role] || role;
  };

  // Utilisateurs disponibles pour l'assignation : techniciens et assistante QHSE
  const availableUsers = users ? Object.values(users).filter(u => {
    const assignableRoles = [
      'assistante_qhse',           // Assistante QHSE
      'technicien',                // Technicien Biomédical
      'technicien_polyvalent',      // Technicien Polyvalent
      'biomedical',                 // Technicien Biomédical (alias)
      'superviseur_technicien',    // Superviseur Technique (si nécessaire)
    ];
    return assignableRoles.includes(u.role);
  }) : [];

  // Trier les utilisateurs par rôle pour un meilleur affichage
  const sortedUsers = [...availableUsers].sort((a, b) => {
    const roleOrder: Record<string, number> = {
      'assistante_qhse': 1,
      'technicien': 2,
      'technicien_polyvalent': 3,
      'biomedical': 4,
      'superviseur_technicien': 5,
    };
    return (roleOrder[a.role] || 99) - (roleOrder[b.role] || 99);
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter un plan d'action</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Ex: Mise en place d'une procédure de sécurité..."
            />
          </div>

          <div>
            <Label>Description *</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              placeholder="Décrivez en détail les actions à mettre en place..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type d'action *</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrective">🔧 Corrective</SelectItem>
                  <SelectItem value="preventive">🛡️ Préventive</SelectItem>
                  <SelectItem value="amelioration">📈 Amélioration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Priorité *</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="faible">🟢 Faible</SelectItem>
                  <SelectItem value="moyenne">🟡 Moyenne</SelectItem>
                  <SelectItem value="haute">🟠 Haute</SelectItem>
                  <SelectItem value="critique">🔴 Critique</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {findings.length > 0 && (
            <div>
              <Label>Lier à un constat (optionnel)</Label>
              <Select value={findingId} onValueChange={setFindingId}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un constat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {findings.map((finding) => (
                    <SelectItem key={finding.id} value={finding.id}>
                      {finding.type === 'non_conformité' ? '❌' : finding.type === 'conformité' ? '✅' : '💡'} {finding.description.substring(0, 50)}...
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Assigné à (optionnel)</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un utilisateur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {sortedUsers.length > 0 ? (
                    <>
                      {/* Grouper par catégorie pour meilleure lisibilité */}
                      {sortedUsers.some(u => u.role === 'assistante_qhse') && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase">
                            QHSE
                          </div>
                          {sortedUsers
                            .filter(u => u.role === 'assistante_qhse')
                            .map((user) => {
                              const roleLabel = getRoleLabel(user.role);
                              const userName = `${user.civility || ''} ${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || user.username;
                              return (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{userName}</span>
                                    <span className="text-xs text-gray-500">({roleLabel})</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                        </>
                      )}
                      {sortedUsers.some(u => ['technicien', 'technicien_polyvalent', 'biomedical', 'superviseur_technicien'].includes(u.role)) && (
                        <>
                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase mt-2">
                            Techniciens
                          </div>
                          {sortedUsers
                            .filter(u => ['technicien', 'technicien_polyvalent', 'biomedical', 'superviseur_technicien'].includes(u.role))
                            .map((user) => {
                              const roleLabel = getRoleLabel(user.role);
                              const userName = `${user.civility || ''} ${user.first_name || ''} ${user.last_name || ''}`.trim() || user.name || user.username;
                              return (
                                <SelectItem key={user.id} value={user.id}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{userName}</span>
                                    <span className="text-xs text-gray-500">({roleLabel})</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                        </>
                      )}
                    </>
                  ) : (
                    <SelectItem value="none" disabled>
                      Aucun utilisateur disponible (techniciens ou assistante QHSE)
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {sortedUsers.length === 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Aucun technicien ou assistante QHSE disponible pour l'assignation.
                </p>
              )}
            </div>

            <div>
              <Label>Date d'échéance (optionnel)</Label>
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};




