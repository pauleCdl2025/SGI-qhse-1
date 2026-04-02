import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/Icon";
import { Risk, RiskCategory, RiskLevel, RiskStatus, User, UserRole, RiskAction, ActionType, ActionStatus } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFilterAndSearch } from "@/components/shared/SearchAndFilter";
import { LoadingSpinner } from "@/components/shared/Loading";
import { canViewRisk, roleToPoste, getSupervisorPostes, availablePostes } from "@/utils/riskPosteMapping";
import { supabase } from "@/integrations/supabase/client";

const categoryLabels: Record<RiskCategory, string> = {
  biologique: "Biologique",
  chimique: "Chimique",
  physique: "Physique",
  ergonomique: "Ergonomique",
  psychosocial: "Psychosocial",
  sécurité: "Sécurité",
  environnemental: "Environnemental",
  autre: "Autre",
};

const levelLabels: Record<RiskLevel, string> = {
  très_faible: "Très faible",
  faible: "Faible",
  moyen: "Moyen",
  élevé: "Élevé",
  très_élevé: "Très élevé",
};

const levelColors: Record<RiskLevel, string> = {
  très_faible: "bg-green-100 text-green-700",
  faible: "bg-blue-100 text-blue-700",
  moyen: "bg-yellow-100 text-yellow-700",
  élevé: "bg-orange-100 text-orange-700",
  très_élevé: "bg-red-100 text-red-700",
};

const statusLabels: Record<RiskStatus, string> = {
  identifié: "Identifié",
  évalué: "Évalué",
  en_traitement: "En traitement",
  traité: "Traité",
  surveillé: "Surveillé",
};

const statusColors: Record<RiskStatus, string> = {
  identifié: "bg-blue-100 text-blue-700",
  évalué: "bg-yellow-100 text-yellow-700",
  en_traitement: "bg-orange-100 text-orange-700",
  traité: "bg-green-100 text-green-700",
  surveillé: "bg-cyan-100 text-cyan-700",
};

interface RisksListProps {
  currentUser?: User | null;
}

export const RisksList = ({ currentUser }: RisksListProps = {}) => {
  const [risks, setRisks] = useState<Risk[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRisk, setSelectedRisk] = useState<Risk | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  // Filtrer les risques selon le poste de l'utilisateur
  const filteredByPoste = risks.filter(risk => {
    if (!currentUser) return false;
    
    // L'admin voit tous les risques
    if (currentUser.role === 'superadmin') {
      return true;
    }

    // Les superviseurs voient les risques de leurs postes
    if (['superviseur_qhse', 'superviseur_agent_securite', 'superviseur_agent_entretien', 'superviseur_technicien'].includes(currentUser.role)) {
      const supervisorPostes = getSupervisorPostes(currentUser.role);
      return !risk.poste || supervisorPostes.includes(risk.poste);
    }

    // Les autres utilisateurs voient uniquement les risques de leur poste
    return canViewRisk(currentUser.role, risk.poste);
  });

  const { filteredData: filteredRisks, searchQuery, setSearchQuery } = useFilterAndSearch(
    filteredByPoste,
    ['title', 'description', 'risk_category', 'risk_source', 'poste']
  );

  useEffect(() => {
    fetchRisks();
  }, []);

  const fetchRisks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('risks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setRisks(data.map((risk: any) => ({
        ...risk,
        created_at: new Date(risk.created_at),
        updated_at: new Date(risk.updated_at),
        due_date: risk.due_date ? new Date(risk.due_date) : undefined,
        review_date: risk.review_date ? new Date(risk.review_date) : undefined,
        last_review_date: risk.last_review_date ? new Date(risk.last_review_date) : undefined,
      })));
    } catch (error: any) {
      showError("Erreur lors du chargement des risques: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRisk = async (riskData: any) => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Utilisateur non authentifié");

      const newId =
        typeof globalThis.crypto !== "undefined" &&
        "randomUUID" in globalThis.crypto
          ? globalThis.crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const { id: _ignoredId, created_by: _ignoredCreatedBy, ...rest } =
        riskData ?? {};

      const payload = {
        ...rest,
        id: newId,
        created_by: user.id,
      };

      const { error } = await supabase.from('risks').insert([payload]);

      if (error) {
        throw error;
      }

      showSuccess("Risque créé avec succès");
      setIsDialogOpen(false);
      fetchRisks();
    } catch (error: any) {
      showError("Erreur lors de la création: " + error.message);
    }
  };

  const handleViewRisk = (risk: Risk) => {
    setSelectedRisk(risk);
    setIsDetailsDialogOpen(true);
  };

  const handleUpdateRisk = async (riskId: string, data: any) => {
    try {
      const { error } = await supabase
        .from('risks')
        .update(data)
        .eq('id', riskId);

      if (error) {
        throw error;
      }

      showSuccess("Risque mis à jour avec succès");
      setIsDetailsDialogOpen(false);
      fetchRisks();
    } catch (error: any) {
      showError("Erreur lors de la mise à jour: " + error.message);
    }
  };

  const handleDeleteRisk = async (riskId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce risque ?")) {
      return;
    }
    try {
      const { error } = await supabase.from('risks').delete().eq('id', riskId);

      if (error) {
        throw error;
      }

      showSuccess("Risque supprimé avec succès");
      setIsDetailsDialogOpen(false);
      fetchRisks();
    } catch (error: any) {
      showError("Erreur lors de la suppression: " + error.message);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Icon name="AlertTriangle" className="text-cyan-600 mr-2" />
          Gestion des Risques
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
              <Icon name="Plus" className="mr-2 h-4 w-4" /> Nouveau Risque
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Identifier un nouveau risque</DialogTitle>
            </DialogHeader>
            <RiskForm onSubmit={handleCreateRisk} onCancel={() => setIsDialogOpen(false)} currentUser={currentUser} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par titre, catégorie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Titre</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Niveau</TableHead>
              <TableHead>Probabilité</TableHead>
              <TableHead>Sévérité</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRisks.length > 0 ? filteredRisks.map((risk) => (
              <TableRow key={risk.id}>
                <TableCell className="font-medium">{risk.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="bg-cyan-50 text-cyan-700 border-cyan-200">
                    {risk.poste || 'Non assigné'}
                  </Badge>
                </TableCell>
                <TableCell>{categoryLabels[risk.risk_category]}</TableCell>
                <TableCell>
                  <Badge className={levelColors[risk.risk_level]}>
                    {levelLabels[risk.risk_level]}
                  </Badge>
                </TableCell>
                <TableCell>{risk.probability}</TableCell>
                <TableCell>{risk.severity}</TableCell>
                <TableCell>
                  <Badge className={statusColors[risk.status]}>
                    {statusLabels[risk.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleViewRisk(risk)}
                  >
                    <Icon name="Eye" className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Icon name="AlertTriangle" className="mx-auto text-4xl text-gray-300 mb-2" />
                  {searchQuery ? 'Aucun risque ne correspond à votre recherche.' : 'Aucun risque identifié pour votre poste.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Dialog de détails du risque */}
      {selectedRisk && (
        <RiskDetailsDialog
          risk={selectedRisk}
          isOpen={isDetailsDialogOpen}
          onClose={() => {
            setIsDetailsDialogOpen(false);
            setSelectedRisk(null);
          }}
          onUpdate={handleUpdateRisk}
          onDelete={handleDeleteRisk}
          currentUser={currentUser}
        />
      )}
    </Card>
  );
};

interface RiskFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  currentUser?: User | null;
}

const RiskForm = ({ onSubmit, onCancel, currentUser }: RiskFormProps) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [riskCategory, setRiskCategory] = useState<RiskCategory>('biologique');
  const [poste, setPoste] = useState<string>('');
  const [customPoste, setCustomPoste] = useState<string>('');
  const [riskSource, setRiskSource] = useState('');
  const [probability, setProbability] = useState<'très_faible' | 'faible' | 'moyenne' | 'élevée' | 'très_élevée'>('moyenne');
  const [severity, setSeverity] = useState<'négligeable' | 'faible' | 'modérée' | 'importante' | 'critique'>('modérée');
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('moyen');
  const [currentControls, setCurrentControls] = useState('');

  // Initialiser le poste avec le poste de l'utilisateur
  useEffect(() => {
    if (currentUser) {
      const userPoste = roleToPoste[currentUser.role];
      if (userPoste && userPoste !== 'Tous') {
        setPoste(userPoste);
      }
    }
  }, [currentUser]);

  // Déterminer les postes disponibles selon le rôle
  const getAvailablePostes = (): string[] => {
    if (!currentUser) return availablePostes.filter(p => p !== 'Tous');
    
    if (currentUser.role === 'superadmin') {
      return availablePostes;
    }
    
    if (['superviseur_qhse', 'superviseur_agent_securite', 'superviseur_agent_entretien', 'superviseur_technicien'].includes(currentUser.role)) {
      return getSupervisorPostes(currentUser.role);
    }
    
    const userPoste = roleToPoste[currentUser.role];
    return userPoste ? [userPoste] : availablePostes.filter(p => p !== 'Tous');
  };

  const calculateRiskLevel = () => {
    // Matrice de risque simplifiée
    const probMap: Record<string, number> = {
      très_faible: 1, faible: 2, moyenne: 3, élevée: 4, très_élevée: 5
    };
    const sevMap: Record<string, number> = {
      négligeable: 1, faible: 2, modérée: 3, importante: 4, critique: 5
    };
    
    const score = probMap[probability] * sevMap[severity];
    
    if (score <= 4) return 'très_faible';
    if (score <= 8) return 'faible';
    if (score <= 12) return 'moyen';
    if (score <= 16) return 'élevé';
    return 'très_élevé';
  };

  useEffect(() => {
    setRiskLevel(calculateRiskLevel());
  }, [probability, severity]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation : si "Autre" est sélectionné, le champ personnalisé doit être rempli
    if (poste === 'Autre' && !customPoste.trim()) {
      showError("Veuillez préciser le poste/service lorsque vous sélectionnez 'Autre'.");
      return;
    }
    
    // Utiliser la valeur personnalisée si "Autre" est sélectionné, sinon utiliser la valeur du select
    const finalPoste = poste === 'Autre' ? customPoste.trim() : (poste || null);
    
    onSubmit({
      title,
      description,
      risk_category: riskCategory,
      poste: finalPoste,
      risk_source: riskSource || null,
      probability,
      severity,
      risk_level: riskLevel,
      current_controls: currentControls || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Titre *</Label>
        <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
      </div>
      <div>
        <Label>Description *</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} required rows={4} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Catégorie *</Label>
          <Select value={riskCategory} onValueChange={(v) => setRiskCategory(v as RiskCategory)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Poste/Service *</Label>
          <Select value={poste} onValueChange={(value) => {
            setPoste(value);
            // Réinitialiser le champ personnalisé si on change de sélection
            if (value !== 'Autre') {
              setCustomPoste('');
            }
          }} required>
            <SelectTrigger><SelectValue placeholder="Sélectionner un poste" /></SelectTrigger>
            <SelectContent>
              {getAvailablePostes().map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
              <SelectItem value="Autre">Autre</SelectItem>
            </SelectContent>
          </Select>
          {poste === 'Autre' && (
            <div className="mt-2">
              <Input
                value={customPoste}
                onChange={(e) => setCustomPoste(e.target.value)}
                placeholder="Précisez le poste/service"
                required
              />
            </div>
          )}
        </div>
      </div>
      <div>
        <Label>Source du risque</Label>
        <Input value={riskSource} onChange={(e) => setRiskSource(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Probabilité *</Label>
          <Select value={probability} onValueChange={(v) => setProbability(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="très_faible">Très faible</SelectItem>
              <SelectItem value="faible">Faible</SelectItem>
              <SelectItem value="moyenne">Moyenne</SelectItem>
              <SelectItem value="élevée">Élevée</SelectItem>
              <SelectItem value="très_élevée">Très élevée</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Sévérité *</Label>
          <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="négligeable">Négligeable</SelectItem>
              <SelectItem value="faible">Faible</SelectItem>
              <SelectItem value="modérée">Modérée</SelectItem>
              <SelectItem value="importante">Importante</SelectItem>
              <SelectItem value="critique">Critique</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Niveau de risque calculé</Label>
        <Badge className={levelColors[riskLevel]}>{levelLabels[riskLevel]}</Badge>
      </div>
      <div>
        <Label>Contrôles actuels</Label>
        <Textarea value={currentControls} onChange={(e) => setCurrentControls(e.target.value)} rows={3} />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">Créer</Button>
      </div>
    </form>
  );
};

// Dialog de détails du risque
interface RiskDetailsDialogProps {
  risk: Risk;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (riskId: string, data: any) => void;
  onDelete: (riskId: string) => void;
  currentUser?: User | null;
}

const RiskDetailsDialog = ({ risk, isOpen, onClose, onUpdate, onDelete, currentUser }: RiskDetailsDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(risk.title);
  const [description, setDescription] = useState(risk.description);
  const [riskCategory, setRiskCategory] = useState<RiskCategory>(risk.risk_category);
  const [poste, setPoste] = useState<string>(risk.poste || '');
  const [riskSource, setRiskSource] = useState(risk.risk_source || '');
  const [probability, setProbability] = useState(risk.probability);
  const [severity, setSeverity] = useState(risk.severity);
  const [residualProbability, setResidualProbability] = useState(risk.residual_probability || 'moyenne');
  const [residualSeverity, setResidualSeverity] = useState(risk.residual_severity || 'modérée');
  const [status, setStatus] = useState<RiskStatus>(risk.status);
  const [currentControls, setCurrentControls] = useState(risk.current_controls || '');
  const [treatmentPlan, setTreatmentPlan] = useState(risk.treatment_plan || '');
  const [actionPlan, setActionPlan] = useState(risk.action_plan || '');
  const [actions, setActions] = useState<RiskAction[]>([]);
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [loadingActions, setLoadingActions] = useState(false);

  useEffect(() => {
    if (!isEditing) {
      setTitle(risk.title);
      setDescription(risk.description);
      setRiskCategory(risk.risk_category);
      setPoste(risk.poste || '');
      setRiskSource(risk.risk_source || '');
      setProbability(risk.probability);
      setSeverity(risk.severity);
      setResidualProbability(risk.residual_probability || 'moyenne');
      setResidualSeverity(risk.residual_severity || 'modérée');
      setStatus(risk.status);
      setCurrentControls(risk.current_controls || '');
      setTreatmentPlan(risk.treatment_plan || '');
      setActionPlan(risk.action_plan || '');
    }
  }, [risk, isEditing]);

  useEffect(() => {
    if (isOpen) {
      fetchActions();
    }
  }, [isOpen, risk.id]);

  const fetchActions = async () => {
    try {
      setLoadingActions(true);
      const { data, error } = await supabase
        .from('risk_actions')
        .select('*')
        .eq('risk_id', risk.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setActions((data || []).map((action: any) => ({
        ...action,
        due_date: action.due_date ? new Date(action.due_date) : undefined,
        completion_date: action.completion_date ? new Date(action.completion_date) : undefined,
        created_at: new Date(action.created_at),
        updated_at: new Date(action.updated_at),
      })));
    } catch (error: any) {
      console.error('Erreur lors du chargement des actions:', error);
      if (!error?.message?.includes('risk_actions')) {
        showError("Erreur lors du chargement des actions: " + (error?.message || error));
      }
    } finally {
      setLoadingActions(false);
    }
  };

  const calculateRiskLevel = () => {
    const probMap: Record<string, number> = {
      très_faible: 1, faible: 2, moyenne: 3, élevée: 4, très_élevée: 5
    };
    const sevMap: Record<string, number> = {
      négligeable: 1, faible: 2, modérée: 3, importante: 4, critique: 5
    };
    
    const score = probMap[probability] * sevMap[severity];
    
    if (score <= 4) return 'très_faible';
    if (score <= 8) return 'faible';
    if (score <= 12) return 'moyen';
    if (score <= 16) return 'élevé';
    return 'très_élevé';
  };

  const calculateResidualRiskLevel = () => {
    const probMap: Record<string, number> = {
      très_faible: 1, faible: 2, moyenne: 3, élevée: 4, très_élevée: 5
    };
    const sevMap: Record<string, number> = {
      négligeable: 1, faible: 2, modérée: 3, importante: 4, critique: 5
    };
    
    const score = probMap[residualProbability] * sevMap[residualSeverity];
    
    if (score <= 4) return 'très_faible';
    if (score <= 8) return 'faible';
    if (score <= 12) return 'moyen';
    if (score <= 16) return 'élevé';
    return 'très_élevé';
  };

  const handleSave = () => {
    const riskLevel = calculateRiskLevel();
    const residualRiskLevel = calculateResidualRiskLevel();
    onUpdate(risk.id, {
      title,
      description,
      risk_category: riskCategory,
      poste: poste || null,
      risk_source: riskSource || null,
      probability,
      severity,
      risk_level: riskLevel,
      residual_probability: residualProbability,
      residual_severity: residualSeverity,
      residual_risk_level: residualRiskLevel,
      status,
      current_controls: currentControls || null,
      treatment_plan: treatmentPlan || null,
      action_plan: actionPlan || null,
    });
    setIsEditing(false);
  };

  const handleAddAction = async (actionData: any) => {
    try {
      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const { error } = await supabase.from('risk_actions').insert([{ ...actionData, id, risk_id: risk.id }]);
      if (error) throw error;
      showSuccess("Action ajoutée avec succès");
      setIsAddingAction(false);
      fetchActions();
    } catch (error: any) {
      console.error('Erreur détaillée lors de l\'ajout de l\'action:', error);
      const errorMessage = error?.message || 'Erreur inconnue';
      showError("Erreur lors de l'ajout de l'action: " + errorMessage);
    }
  };

  const handleUpdateAction = async (actionId: string, data: any) => {
    try {
      const { error } = await supabase.from('risk_actions').update(data).eq('id', actionId);
      if (error) throw error;
      showSuccess("Action mise à jour avec succès");
      fetchActions();
    } catch (error: any) {
      showError("Erreur lors de la mise à jour: " + (error?.message || error));
    }
  };

  const handleDeleteAction = async (actionId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette action ?")) {
      return;
    }
    try {
      const { error } = await supabase.from('risk_actions').delete().eq('id', actionId);
      if (error) throw error;
      showSuccess("Action supprimée avec succès");
      fetchActions();
    } catch (error: any) {
      showError("Erreur lors de la suppression: " + (error?.message || error));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Détails du Risque</span>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                    <Icon name="Edit" className="mr-2 h-4 w-4" />
                    Modifier
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => onDelete(risk.id)}
                  >
                    <Icon name="Trash2" className="mr-2 h-4 w-4" />
                    Supprimer
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>
                    Annuler
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600"
                    onClick={handleSave}
                  >
                    Enregistrer
                  </Button>
                </>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Titre</Label>
              {isEditing ? (
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              ) : (
                <p className="text-lg font-medium">{risk.title}</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Statut</Label>
              {isEditing ? (
                <Select value={status} onValueChange={(v) => setStatus(v as RiskStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Badge className={statusColors[risk.status]}>
                  {statusLabels[risk.status]}
                </Badge>
              )}
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold text-gray-700">Description</Label>
            {isEditing ? (
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} />
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">{risk.description}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label className="text-sm font-semibold text-gray-700">Catégorie</Label>
              {isEditing ? (
                <Select value={riskCategory} onValueChange={(v) => setRiskCategory(v as RiskCategory)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p>{categoryLabels[risk.risk_category]}</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Poste/Service</Label>
              {isEditing ? (
                <Input value={poste} onChange={(e) => setPoste(e.target.value)} placeholder="Poste/Service" />
              ) : (
                <p>{risk.poste || 'Non assigné'}</p>
              )}
            </div>
            <div>
              <Label className="text-sm font-semibold text-gray-700">Source du risque</Label>
              {isEditing ? (
                <Input value={riskSource} onChange={(e) => setRiskSource(e.target.value)} />
              ) : (
                <p>{risk.risk_source || '-'}</p>
              )}
            </div>
          </div>

          {/* Évaluation du risque */}
          <div className="border-t pt-4">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Évaluation du Risque</Label>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Probabilité</Label>
                {isEditing ? (
                  <Select value={probability} onValueChange={(v) => setProbability(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="très_faible">Très faible</SelectItem>
                      <SelectItem value="faible">Faible</SelectItem>
                      <SelectItem value="moyenne">Moyenne</SelectItem>
                      <SelectItem value="élevée">Élevée</SelectItem>
                      <SelectItem value="très_élevée">Très élevée</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p>{probability}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Sévérité</Label>
                {isEditing ? (
                  <Select value={severity} onValueChange={(v) => setSeverity(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="négligeable">Négligeable</SelectItem>
                      <SelectItem value="faible">Faible</SelectItem>
                      <SelectItem value="modérée">Modérée</SelectItem>
                      <SelectItem value="importante">Importante</SelectItem>
                      <SelectItem value="critique">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p>{severity}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Niveau de risque</Label>
                <Badge className={levelColors[risk.risk_level]}>
                  {levelLabels[risk.risk_level]}
                </Badge>
              </div>
            </div>
          </div>

          {/* Évaluation du risque résiduel */}
          <div className="border-t pt-4">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Évaluation du Risque Résiduel</Label>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Probabilité résiduelle</Label>
                {isEditing ? (
                  <Select value={residualProbability} onValueChange={(v) => setResidualProbability(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="très_faible">Très faible</SelectItem>
                      <SelectItem value="faible">Faible</SelectItem>
                      <SelectItem value="moyenne">Moyenne</SelectItem>
                      <SelectItem value="élevée">Élevée</SelectItem>
                      <SelectItem value="très_élevée">Très élevée</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p>{risk.residual_probability || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Sévérité résiduelle</Label>
                {isEditing ? (
                  <Select value={residualSeverity} onValueChange={(v) => setResidualSeverity(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="négligeable">Négligeable</SelectItem>
                      <SelectItem value="faible">Faible</SelectItem>
                      <SelectItem value="modérée">Modérée</SelectItem>
                      <SelectItem value="importante">Importante</SelectItem>
                      <SelectItem value="critique">Critique</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p>{risk.residual_severity || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Niveau de risque résiduel</Label>
                {risk.residual_risk_level ? (
                  <Badge className={levelColors[risk.residual_risk_level]}>
                    {levelLabels[risk.residual_risk_level]}
                  </Badge>
                ) : (
                  <p className="text-gray-400">Non évalué</p>
                )}
              </div>
            </div>
          </div>

          {/* Contrôles et plans */}
          <div className="border-t pt-4">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Contrôles et Plans</Label>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Contrôles actuels</Label>
                {isEditing ? (
                  <Textarea value={currentControls} onChange={(e) => setCurrentControls(e.target.value)} rows={3} />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">{risk.current_controls || 'Aucun contrôle défini'}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Plan de traitement</Label>
                {isEditing ? (
                  <Textarea value={treatmentPlan} onChange={(e) => setTreatmentPlan(e.target.value)} rows={3} />
                ) : (
                  <p className="text-gray-700 whitespace-pre-wrap">{risk.treatment_plan || 'Aucun plan défini'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Plan d'action structuré */}
          <div className="border-t pt-4">
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-gray-700">Plan d'Action Structuré ({actions.length})</Label>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsAddingAction(true)}
              >
                <Icon name="Plus" className="mr-2 h-4 w-4" />
                Ajouter une action
              </Button>
            </div>
            {loadingActions ? (
              <LoadingSpinner />
            ) : actions.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead>Échéance</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((action) => (
                      <TableRow key={action.id}>
                        <TableCell className="font-medium">{action.action_title}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{action.action_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={
                            action.action_status === 'terminée' ? 'bg-green-100 text-green-700' :
                            action.action_status === 'en_cours' ? 'bg-blue-100 text-blue-700' :
                            action.action_status === 'annulée' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }>
                            {action.action_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {action.assigned_to_name || action.responsible_person || '-'}
                        </TableCell>
                        <TableCell>
                          {action.due_date ? format(action.due_date, 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => handleDeleteAction(action.id)}
                          >
                            <Icon name="Trash2" className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Card className="border border-dashed">
                <CardContent className="p-8 text-center">
                  <Icon name="ListChecks" className="mx-auto text-4xl text-gray-300 mb-2" />
                  <p className="text-gray-500">Aucune action définie</p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="mt-4"
                    onClick={() => setIsAddingAction(true)}
                  >
                    <Icon name="Plus" className="mr-2 h-4 w-4" />
                    Ajouter une action
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Informations de suivi */}
          {risk.due_date && (
            <div className="border-t pt-4">
              <Label className="text-sm font-semibold text-gray-700">Date d'échéance</Label>
              <p>{format(new Date(risk.due_date), 'dd/MM/yyyy')}</p>
            </div>
          )}
        </div>
      </DialogContent>

      {/* Dialog pour ajouter une action */}
      {isAddingAction && (
        <RiskActionDialog
          riskId={risk.id}
          isOpen={isAddingAction}
          onClose={() => setIsAddingAction(false)}
          onSubmit={handleAddAction}
        />
      )}
    </Dialog>
  );
};

// Dialog pour créer/éditer une action de risque
interface RiskActionDialogProps {
  riskId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const RiskActionDialog = ({ riskId, isOpen, onClose, onSubmit }: RiskActionDialogProps) => {
  const [actionTitle, setActionTitle] = useState('');
  const [actionDescription, setActionDescription] = useState('');
  const [actionType, setActionType] = useState<ActionType>('mitigation');
  const [actionStatus, setActionStatus] = useState<ActionStatus>('planifiée');
  const [responsiblePerson, setResponsiblePerson] = useState('');
  const [dueDate, setDueDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionTitle.trim()) {
      showError("Le titre de l'action est requis");
      return;
    }
    onSubmit({
      action_title: actionTitle.trim(),
      action_description: actionDescription || null,
      action_type: actionType,
      action_status: actionStatus,
      responsible_person: responsiblePerson || null,
      due_date: dueDate || null,
    });
    // Réinitialiser le formulaire
    setActionTitle('');
    setActionDescription('');
    setActionType('mitigation');
    setActionStatus('planifiée');
    setResponsiblePerson('');
    setDueDate('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter une action</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Titre de l'action *</Label>
            <Input value={actionTitle} onChange={(e) => setActionTitle(e.target.value)} required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={actionDescription} onChange={(e) => setActionDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type d'action</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as ActionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="prévention">Prévention</SelectItem>
                  <SelectItem value="mitigation">Mitigation</SelectItem>
                  <SelectItem value="transfert">Transfert</SelectItem>
                  <SelectItem value="acceptation">Acceptation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Statut</Label>
              <Select value={actionStatus} onValueChange={(v) => setActionStatus(v as ActionStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planifiée">Planifiée</SelectItem>
                  <SelectItem value="en_cours">En cours</SelectItem>
                  <SelectItem value="terminée">Terminée</SelectItem>
                  <SelectItem value="annulée">Annulée</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Responsable</Label>
              <Input value={responsiblePerson} onChange={(e) => setResponsiblePerson(e.target.value)} />
            </div>
            <div>
              <Label>Date d'échéance</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
              Enregistrer
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

