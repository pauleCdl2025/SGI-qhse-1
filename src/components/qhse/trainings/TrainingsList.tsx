import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { Competency, Training, TrainingParticipation, TrainingStatus, TrainingType, Users } from "@/types";
import { apiClient } from "@/integrations/api/client";
import { showError, showSuccess } from "@/utils/toast";
import { differenceInDays, format, formatDistanceToNow, isBefore } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useFilterAndSearch } from "@/components/shared/SearchAndFilter";
import { LoadingSpinner } from "@/components/shared/Loading";
import { PRESTATAIRES } from "@/utils/prestataires";

const trainingTypeLabels: Record<TrainingType, string> = {
  interne: "Interne",
  externe: "Externe",
  en_ligne: "En ligne",
  présentiel: "Présentiel",
};

const statusLabels: Record<TrainingStatus, string> = {
  planifiée: "Planifiée",
  en_cours: "En cours",
  terminée: "Terminée",
  annulée: "Annulée",
};

const statusColors: Record<TrainingStatus, string> = {
  planifiée: "bg-blue-100 text-blue-700",
  en_cours: "bg-yellow-100 text-yellow-700",
  terminée: "bg-green-100 text-green-700",
  annulée: "bg-red-100 text-red-700",
};

interface TrainingsListProps {
  users?: Users;
}

export const TrainingsList = ({ users }: TrainingsListProps = {}) => {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [participations, setParticipations] = useState<TrainingParticipation[]>([]);
  const [competencies, setCompetencies] = useState<Competency[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTrainingDialogOpen, setIsTrainingDialogOpen] = useState(false);
  const [isParticipationDialogOpen, setIsParticipationDialogOpen] = useState(false);
  const [isCompetencyDialogOpen, setIsCompetencyDialogOpen] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>('');
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [isTrainingDetailsDialogOpen, setIsTrainingDetailsDialogOpen] = useState(false);

  // Filtrer pour ne montrer que les formations avec prestataires (évaluations)
  const evaluationsWithPrestataires = useMemo(() => 
    trainings.filter(t => t.prestataire && t.prestataire.trim() !== ''),
    [trainings]
  );

  const { filteredData: filteredTrainings, searchQuery, setSearchQuery } = useFilterAndSearch(
    evaluationsWithPrestataires,
    ['title', 'category', 'description', 'prestataire']
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const [trainingsData, participationsData, competenciesData] = await Promise.all([
        apiClient.getTrainings(),
        apiClient.getTrainingParticipations(),
        apiClient.getCompetencies(),
      ]);

      setTrainings(trainingsData.map((training: any) => ({
        ...training,
        planned_date: training.planned_date ? new Date(training.planned_date) : undefined,
        actual_date: training.actual_date ? new Date(training.actual_date) : undefined,
        prestataire_note: training.prestataire_note ? parseFloat(training.prestataire_note) : undefined,
        created_at: new Date(training.created_at),
        updated_at: new Date(training.updated_at),
      })));

      setParticipations(participationsData.map((item: any) => ({
        ...item,
        attendance_date: item.attendance_date ? new Date(item.attendance_date) : undefined,
        certificate_issued_date: item.certificate_issued_date ? new Date(item.certificate_issued_date) : undefined,
        certificate_expiry_date: item.certificate_expiry_date ? new Date(item.certificate_expiry_date) : undefined,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at),
      })));

      setCompetencies(competenciesData.map((item: any) => ({
        ...item,
        issued_date: item.issued_date ? new Date(item.issued_date) : undefined,
        expiry_date: item.expiry_date ? new Date(item.expiry_date) : undefined,
        verification_date: item.verification_date ? new Date(item.verification_date) : undefined,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at),
      })));
    } catch (error: any) {
      showError("Erreur lors du chargement des données: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateTraining = async (trainingData: any) => {
    try {
      await apiClient.createTraining(trainingData);
      showSuccess("Formation créée avec succès");
      setIsTrainingDialogOpen(false);
      loadData();
    } catch (error: any) {
      showError("Erreur lors de la création: " + error.message);
    }
  };

  const handleAddParticipation = async (data: any) => {
    try {
      await apiClient.createTrainingParticipation(data);
      showSuccess("Participation enregistrée");
      setIsParticipationDialogOpen(false);
      setSelectedTrainingId('');
      loadData();
    } catch (error: any) {
      showError("Erreur lors de l'enregistrement: " + error.message);
    }
  };

  const handleAddCompetency = async (data: any) => {
    try {
      await apiClient.createCompetency(data);
      showSuccess("Habilitation enregistrée");
      setIsCompetencyDialogOpen(false);
      loadData();
    } catch (error: any) {
      showError("Erreur lors de l'enregistrement: " + error.message);
    }
  };

  const handleViewTraining = (training: Training) => {
    setSelectedTraining(training);
    setIsTrainingDetailsDialogOpen(true);
  };

  const handleUpdateTraining = async (trainingId: string, data: any) => {
    try {
      await apiClient.updateTraining(trainingId, data);
      showSuccess("Formation mise à jour avec succès");
      setIsTrainingDetailsDialogOpen(false);
      loadData();
    } catch (error: any) {
      showError("Erreur lors de la mise à jour: " + error.message);
    }
  };

  const handleDeleteTraining = async (trainingId: string) => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer cette formation ?")) {
      return;
    }
    try {
      await apiClient.deleteTraining(trainingId);
      showSuccess("Formation supprimée avec succès");
      setIsTrainingDetailsDialogOpen(false);
      loadData();
    } catch (error: any) {
      showError("Erreur lors de la suppression: " + error.message);
    }
  };

  const participantsByTraining = useMemo(() => participations.reduce<Record<string, TrainingParticipation[]>>((acc, participation) => {
    if (!acc[participation.training_id]) {
      acc[participation.training_id] = [];
    }
    acc[participation.training_id].push(participation);
    return acc;
  }, {}), [participations]);

  const today = new Date();
  const soonThreshold = 30;

  const overdueTrainings = useMemo(
    () => trainings.filter((training) =>
      training.status !== 'terminée' &&
      training.planned_date &&
      isBefore(new Date(training.planned_date), today)
    ),
    [trainings, today]
  );

  const upcomingTrainings = useMemo(
    () => trainings
      .filter((training) =>
        training.status === 'planifiée' &&
        training.planned_date &&
        differenceInDays(new Date(training.planned_date), today) <= 60 &&
        differenceInDays(new Date(training.planned_date), today) >= 0
      )
      .sort((a, b) => (a.planned_date?.getTime() || 0) - (b.planned_date?.getTime() || 0)),
    [trainings, today]
  );

  const expiringCertificates = useMemo(
    () => participations
      .filter((participation) =>
        participation.certificate_expiry_date &&
        differenceInDays(new Date(participation.certificate_expiry_date), today) <= soonThreshold
      )
      .sort((a, b) => (a.certificate_expiry_date?.getTime() || 0) - (b.certificate_expiry_date?.getTime() || 0)),
    [participations, today]
  );

  const expiringCompetencies = useMemo(
    () => competencies
      .filter((competency) =>
        competency.expiry_date &&
        differenceInDays(new Date(competency.expiry_date), today) <= soonThreshold
      )
      .sort((a, b) => (a.expiry_date?.getTime() || 0) - (b.expiry_date?.getTime() || 0)),
    [competencies, today]
  );

  const trainingNeeds = useMemo(() => {
    const needs = [
      ...overdueTrainings.map((training) => ({
        type: 'Formation en retard',
        label: training.title,
        detail: training.planned_date
          ? `Prévue ${format(training.planned_date, 'dd/MM/yyyy')}`
          : 'Date inconnue',
        severity: 'urgent' as const,
      })),
      ...expiringCompetencies.map((competency) => ({
        type: 'Habilitation à renouveler',
        label: `${competency.skill_name} - ${competency.employee_first_name || ''} ${competency.employee_last_name || ''}`,
        detail: competency.expiry_date
          ? `Expire ${formatDistanceToNow(competency.expiry_date, { addSuffix: true })}`
          : 'Échéance inconnue',
        severity: 'warning' as const,
      })),
    ];
    return needs.slice(0, 6);
  }, [overdueTrainings, expiringCompetencies]);

  // Calculer les statistiques pour les prestataires
  const prestatairesStats = useMemo(() => {
    const statsMap = new Map<string, { count: number; totalNote: number; countWithNote: number }>();
    
    evaluationsWithPrestataires.forEach(training => {
      if (training.prestataire) {
        const existing = statsMap.get(training.prestataire) || { count: 0, totalNote: 0, countWithNote: 0 };
        existing.count++;
        if (training.prestataire_note) {
          existing.totalNote += training.prestataire_note;
          existing.countWithNote++;
        }
        statsMap.set(training.prestataire, existing);
      }
    });

    return Array.from(statsMap.entries()).map(([name, stats]) => ({
      name,
      count: stats.count,
      averageNote: stats.countWithNote > 0 ? (stats.totalNote / stats.countWithNote).toFixed(1) : null,
    }));
  }, [evaluationsWithPrestataires]);

  const totalEvaluations = useMemo(() => evaluationsWithPrestataires.length, [evaluationsWithPrestataires]);
  const prestatairesCount = useMemo(() => prestatairesStats.length, [prestatairesStats]);
  const evaluationsWithNote = useMemo(() => evaluationsWithPrestataires.filter(t => t.prestataire_note).length, [evaluationsWithPrestataires]);
  const averageNote = useMemo(() => {
    if (evaluationsWithNote > 0) {
      return (evaluationsWithPrestataires.reduce((sum, t) => sum + (t.prestataire_note || 0), 0) / evaluationsWithNote).toFixed(1);
    }
    return null;
  }, [evaluationsWithPrestataires, evaluationsWithNote]);

  if (loading) {
    return <LoadingSpinner />;
  }

  const stats = [
    {
      label: "Total évaluations",
      value: totalEvaluations,
      helper: "Évaluations enregistrées",
      color: "text-cyan-600",
    },
    {
      label: "Prestataires évalués",
      value: prestatairesCount,
      helper: "Nombre de prestataires",
      color: "text-blue-600",
    },
    {
      label: "Note moyenne",
      value: averageNote ? `${averageNote}/10` : '-',
      helper: "Toutes évaluations",
      color: averageNote ? "text-green-600" : "text-gray-500",
    },
    {
      label: "Évaluations notées",
      value: evaluationsWithNote,
      helper: "Avec note sur 10",
      color: "text-teal-600",
    },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <CardTitle className="flex items-center flex-wrap gap-2">
          <Icon name="GraduationCap" className="text-cyan-600" />
          Évaluation QHSE
        </CardTitle>
        <div className="flex flex-wrap gap-2">
          <Dialog open={isTrainingDialogOpen} onOpenChange={setIsTrainingDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
                <Icon name="Plus" className="mr-2 h-4 w-4" /> Nouvelle évaluation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nouvelle évaluation de prestataire</DialogTitle>
              </DialogHeader>
              <TrainingForm onSubmit={handleCreateTraining} onCancel={() => setIsTrainingDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {stats.map((stat) => (
            <Card key={stat.label} className="border border-slate-200">
              <CardContent className="p-4">
                <p className="text-sm text-slate-500">{stat.label}</p>
                <p className={`text-3xl font-semibold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-slate-500">{stat.helper}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} />

        <PrestatairesEvaluationTable
          trainings={filteredTrainings}
          onViewTraining={handleViewTraining}
        />
      </CardContent>


      {selectedTraining && (
        <TrainingDetailsDialog
          training={selectedTraining}
          isOpen={isTrainingDetailsDialogOpen}
          onClose={() => {
            setIsTrainingDetailsDialogOpen(false);
            setSelectedTraining(null);
          }}
          onUpdate={handleUpdateTraining}
          onDelete={handleDeleteTraining}
          participants={participations.filter(p => p.training_id === selectedTraining.id)}
          users={users}
        />
      )}
    </Card>
  );
};


const AlertsGrid = ({
  upcomingTrainings,
  expiringCertificates,
  expiringCompetencies,
}: {
  upcomingTrainings: Training[];
  expiringCertificates: TrainingParticipation[];
  expiringCompetencies: Competency[];
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
    <Card className="border border-cyan-100 bg-cyan-50/60">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-cyan-700">
          <Icon name="Calendar" className="h-4 w-4" />
          Prochaines formations
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingTrainings.length === 0 && (
          <p className="text-sm text-slate-500">Aucune formation dans les 60 prochains jours.</p>
        )}
        {upcomingTrainings.slice(0, 4).map((training) => (
          <div key={training.id} className="rounded-lg border border-cyan-200 bg-white p-3">
            <p className="font-medium text-slate-700">{training.title}</p>
            <p className="text-xs text-slate-500">
              {training.planned_date ? format(training.planned_date, 'dd/MM/yyyy') : 'Date à confirmer'}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
    <Card className="border border-amber-100 bg-amber-50/60">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-amber-700">
          <Icon name="AlertTriangle" className="h-4 w-4" />
          Certificats à surveiller
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {expiringCertificates.length === 0 && (
          <p className="text-sm text-slate-500">Aucun certificat à expiration proche.</p>
        )}
        {expiringCertificates.slice(0, 4).map((certificate) => (
          <div key={certificate.id} className="rounded-lg border border-amber-200 bg-white p-3">
            <p className="font-medium text-slate-700">{certificate.training_title || 'Formation'}</p>
            <p className="text-xs text-slate-500">
              Expire {certificate.certificate_expiry_date ? formatDistanceToNow(certificate.certificate_expiry_date, { addSuffix: true }) : 'Bientôt'}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
    <Card className="border border-rose-100 bg-rose-50/60">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-rose-700">
          <Icon name="ShieldCheck" className="h-4 w-4" />
          Habilitations sensibles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {expiringCompetencies.length === 0 && (
          <p className="text-sm text-slate-500">Aucune habilitation critique détectée.</p>
        )}
        {expiringCompetencies.slice(0, 4).map((competency) => (
          <div key={competency.id} className="rounded-lg border border-rose-200 bg-white p-3">
            <p className="font-medium text-slate-700">{competency.skill_name}</p>
            <p className="text-xs text-slate-500">
              {competency.expiry_date ? `Échéance ${format(competency.expiry_date, 'dd/MM/yyyy')}` : 'Échéance inconnue'}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  </div>
);

const SearchBar = ({ searchQuery, setSearchQuery }: { searchQuery: string; setSearchQuery: (value: string) => void }) => (
  <div className="mb-6">
    <div className="relative">
      <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Rechercher par prestataire, titre, catégorie..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-10"
      />
    </div>
  </div>
);

const PrestatairesEvaluationTable = ({
  trainings,
  onViewTraining,
}: {
  trainings: Training[];
  onViewTraining: (training: Training) => void;
}) => {
  return (
    <div className="border rounded-lg overflow-hidden mb-6">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Prestataire</TableHead>
            <TableHead>Titre de l'évaluation</TableHead>
            <TableHead>Catégorie</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {trainings.length > 0 ? trainings.map((training) => {
            return (
              <TableRow key={training.id}>
                <TableCell className="font-medium">
                  <Badge variant="outline" className="text-blue-700 border-blue-200">
                    {training.prestataire}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">{training.title}</TableCell>
                <TableCell>{training.category}</TableCell>
                <TableCell>
                  {training.planned_date ? format(training.planned_date, 'dd/MM/yyyy') : 
                   training.actual_date ? format(training.actual_date, 'dd/MM/yyyy') : '-'}
                </TableCell>
                <TableCell>
                  {training.prestataire_note ? (
                    <Badge className={training.prestataire_note >= 8 ? "bg-green-100 text-green-700" : 
                                     training.prestataire_note >= 6 ? "bg-yellow-100 text-yellow-700" : 
                                     "bg-red-100 text-red-700"}>
                      {training.prestataire_note}/10
                    </Badge>
                  ) : (
                    <span className="text-gray-400">Non noté</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[training.status]}>
                    {statusLabels[training.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onViewTraining(training)}
                  >
                    <Icon name="Eye" className="h-4 w-4 mr-1" />
                    Voir détails
                  </Button>
                </TableCell>
              </TableRow>
            );
          }) : (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                Aucune évaluation de prestataire enregistrée.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};

const TrainingsTable = ({
  trainings,
  participantsByTraining,
  onAddParticipant,
  onViewTraining,
}: {
  trainings: Training[];
  participantsByTraining: Record<string, TrainingParticipation[]>;
  onAddParticipant: (trainingId: string) => void;
  onViewTraining: (training: Training) => void;
}) => (
  <div className="mb-8">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Titre</TableHead>
          <TableHead>Catégorie</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Date planifiée</TableHead>
          <TableHead>Durée (h)</TableHead>
          <TableHead>Participants</TableHead>
          <TableHead>Certificat</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {trainings.length > 0 ? trainings.map((training) => {
          const participants = participantsByTraining[training.id] || [];
          return (
            <TableRow key={training.id}>
              <TableCell className="font-medium">{training.title}</TableCell>
              <TableCell>{training.category}</TableCell>
              <TableCell>{trainingTypeLabels[training.training_type]}</TableCell>
              <TableCell>{training.planned_date ? format(training.planned_date, 'dd/MM/yyyy') : '-'}</TableCell>
              <TableCell>{training.duration_hours || '-'}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-cyan-700 border-cyan-200">
                  {participants.length} inscrit(s)
                </Badge>
              </TableCell>
              <TableCell>
                {training.certificate_required ? (
                  <Badge className="bg-emerald-100 text-emerald-700">
                    Certificat requis
                  </Badge>
                ) : (
                  <Badge variant="secondary">Optionnel</Badge>
                )}
              </TableCell>
              <TableCell>
                <Badge className={statusColors[training.status]}>
                  {statusLabels[training.status]}
                </Badge>
              </TableCell>
              <TableCell className="space-x-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => onViewTraining(training)}
                  className="mr-2"
                >
                  <Icon name="Eye" className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" onClick={() => onAddParticipant(training.id)}>
                  <Icon name="UserPlus" className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        }) : (
          <TableRow>
            <TableCell colSpan={9} className="text-center py-8">
              <Icon name="GraduationCap" className="mx-auto text-4xl text-gray-300 mb-2" />
              Aucune formation enregistrée.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  </div>
);

const CompetenciesTable = ({ competencies }: { competencies: Competency[] }) => (
  <Card className="mb-6 border border-slate-200">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <Icon name="ShieldCheck" className="text-cyan-600" />
        Habilitations & certificats
      </CardTitle>
    </CardHeader>
    <CardContent>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Collaborateur</TableHead>
            <TableHead>Compétence</TableHead>
            <TableHead>Niveau</TableHead>
            <TableHead>Certificat</TableHead>
            <TableHead>Expiration</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {competencies.length > 0 ? competencies.slice(0, 8).map((competency) => (
            <TableRow key={competency.id}>
              <TableCell>
                {competency.employee_first_name} {competency.employee_last_name}
              </TableCell>
              <TableCell>{competency.skill_name}</TableCell>
              <TableCell>
                <Badge variant="secondary">{competency.level}</Badge>
              </TableCell>
              <TableCell>{competency.certification_number || '-'}</TableCell>
              <TableCell>
                {competency.expiry_date ? format(competency.expiry_date, 'dd/MM/yyyy') : 'N/A'}
              </TableCell>
              <TableCell>
                {competency.expiry_date && isBefore(competency.expiry_date, new Date())
                  ? <Badge className="bg-red-100 text-red-700">Expiré</Badge>
                  : <Badge className="bg-green-100 text-green-700">Valide</Badge>}
              </TableCell>
            </TableRow>
          )) : (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                Aucune habilitation enregistrée.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </CardContent>
  </Card>
);

const TrainingNeedsCard = ({ trainingNeeds }: { trainingNeeds: { type: string; label: string; detail: string; severity: 'urgent' | 'warning'; }[] }) => (
  <Card className="border border-slate-200">
    <CardHeader>
      <CardTitle className="text-base flex items-center gap-2">
        <Icon name="ListChecks" className="text-cyan-600" />
        Vision claire des besoins
      </CardTitle>
    </CardHeader>
    <CardContent className="space-y-3">
      {trainingNeeds.length === 0 && (
        <p className="text-sm text-slate-500">Aucun besoin critique identifié pour le moment.</p>
      )}
      {trainingNeeds.map((need, index) => (
        <div key={`${need.label}-${index}`} className="flex items-start gap-3 rounded-lg border border-slate-100 p-3">
          <Icon
            name={need.severity === 'urgent' ? "Flame" : "Info"}
            className={need.severity === 'urgent' ? "text-red-600 mt-0.5" : "text-amber-500 mt-0.5"}
          />
          <div>
            <p className="font-semibold text-slate-700">{need.type}</p>
            <p className="text-sm text-slate-600">{need.label}</p>
            <p className="text-xs text-slate-500">{need.detail}</p>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

const TrainingForm = ({ onSubmit, onCancel, training }: { onSubmit: (data: any) => void; onCancel: () => void; training?: Training | null }) => {
  const [title, setTitle] = useState(training?.title || '');
  const [category, setCategory] = useState(training?.category || '');
  const [trainingType, setTrainingType] = useState<TrainingType>(training?.training_type || 'interne');
  const [description, setDescription] = useState(training?.description || '');
  const [durationHours, setDurationHours] = useState(training?.duration_hours?.toString() || '');
  const [plannedDate, setPlannedDate] = useState(training?.planned_date ? format(training.planned_date, 'yyyy-MM-dd') : '');
  const [location, setLocation] = useState(training?.location || '');
  const [maxParticipants, setMaxParticipants] = useState(training?.max_participants?.toString() || '');
  const [certificateRequired, setCertificateRequired] = useState(training?.certificate_required || false);
  const [validityMonths, setValidityMonths] = useState(training?.validity_months?.toString() || '');
  const [prestataire, setPrestataire] = useState(training?.prestataire || '');
  const [prestataireNote, setPrestataireNote] = useState(training?.prestataire_note?.toString() || '');
  const [prestataireEvaluation, setPrestataireEvaluation] = useState(training?.prestataire_evaluation || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prestataire || prestataire.trim() === '') {
      showError('Veuillez sélectionner un prestataire');
      return;
    }
    onSubmit({
      title,
      category,
      training_type: trainingType,
      description,
      duration_hours: durationHours ? parseFloat(durationHours) : null,
      planned_date: plannedDate || null,
      location: location || null,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      certificate_required: certificateRequired,
      validity_months: validityMonths ? parseInt(validityMonths) : null,
      prestataire: prestataire,
      prestataire_note: prestataireNote ? parseFloat(prestataireNote) : null,
      prestataire_evaluation: prestataireEvaluation || null,
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
          <Label>Prestataire *</Label>
          <Select value={prestataire || undefined} onValueChange={setPrestataire} required>
            <SelectTrigger><SelectValue placeholder="Sélectionner un prestataire" /></SelectTrigger>
            <SelectContent>
              {PRESTATAIRES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Catégorie *</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} required placeholder="Ex: Formation, Audit, etc." />
        </div>
      </div>
      <div>
        <Label>Type de prestation</Label>
        <Select value={trainingType} onValueChange={(v) => setTrainingType(v as TrainingType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(trainingTypeLabels).map(([value, label]) => (
              <SelectItem key={value} value={value}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Durée (heures)</Label>
          <Input type="number" step="0.5" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
        </div>
        <div>
          <Label>Date planifiée</Label>
          <Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Lieu</Label>
          <Input value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div>
          <Label>Participants max</Label>
          <Input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2 border rounded-lg p-3">
          <Checkbox id="certificateRequired" checked={certificateRequired} onCheckedChange={(checked) => setCertificateRequired(!!checked)} />
          <div>
            <Label htmlFor="certificateRequired">Certificat requis</Label>
            <p className="text-xs text-slate-500">Active le suivi des habilitations</p>
          </div>
        </div>
        {certificateRequired && (
          <div>
            <Label>Validité (mois)</Label>
            <Input type="number" value={validityMonths} onChange={(e) => setValidityMonths(e.target.value)} placeholder="Ex: 12" />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Prestataire</Label>
          <Select value={prestataire} onValueChange={setPrestataire}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un prestataire" /></SelectTrigger>
            <SelectContent>
              {PRESTATAIRES.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {prestataire && (
          <div>
            <Label>Note du prestataire (sur 10)</Label>
            <Input 
              type="number" 
              min="0" 
              max="10" 
              step="0.1" 
              value={prestataireNote} 
              onChange={(e) => setPrestataireNote(e.target.value)} 
              placeholder="Ex: 8.5" 
            />
          </div>
        )}
      </div>
      {prestataire && (
        <div>
          <Label>Évaluation du prestataire</Label>
          <Textarea 
            value={prestataireEvaluation} 
            onChange={(e) => setPrestataireEvaluation(e.target.value)} 
            rows={3} 
            placeholder="Commentaires sur la prestation..."
          />
        </div>
      )}
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
          {training ? 'Modifier' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};

const AddParticipationDialog = ({
  isOpen,
  onClose,
  onSubmit,
  trainings,
  users,
  defaultTrainingId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  trainings: Training[];
  users?: Users;
  defaultTrainingId?: string;
}) => {
  const [trainingId, setTrainingId] = useState(defaultTrainingId || '');
  const [participantId, setParticipantId] = useState('');
  const [showOtherParticipant, setShowOtherParticipant] = useState(false);
  const [otherParticipantName, setOtherParticipantName] = useState('');
  const [status, setStatus] = useState('inscrit');
  const [attendanceDate, setAttendanceDate] = useState('');
  const [score, setScore] = useState('');
  const [passed, setPassed] = useState(false);
  const [certificateNumber, setCertificateNumber] = useState('');
  const [certificateIssuedDate, setCertificateIssuedDate] = useState('');
  const [certificateExpiryDate, setCertificateExpiryDate] = useState('');
  const [comments, setComments] = useState('');

  useEffect(() => {
    if (defaultTrainingId) {
      setTrainingId(defaultTrainingId);
    }
  }, [defaultTrainingId]);

  useEffect(() => {
    if (!isOpen) {
      // Réinitialiser le formulaire quand le dialog se ferme
      setTrainingId(defaultTrainingId || '');
      setParticipantId('');
      setShowOtherParticipant(false);
      setOtherParticipantName('');
      setStatus('inscrit');
      setAttendanceDate('');
      setScore('');
      setPassed(false);
      setCertificateNumber('');
      setCertificateIssuedDate('');
      setCertificateExpiryDate('');
      setComments('');
    }
  }, [isOpen, defaultTrainingId]);

  const handleParticipantChange = (value: string) => {
    if (value === 'autre') {
      setShowOtherParticipant(true);
      setParticipantId('');
    } else {
      setShowOtherParticipant(false);
      setParticipantId(value);
      setOtherParticipantName('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainingId) {
      showError("Sélectionnez une formation.");
      return;
    }
    if (!participantId && !otherParticipantName) {
      showError("Sélectionnez un participant ou saisissez un nom.");
      return;
    }
    if (showOtherParticipant && !otherParticipantName.trim()) {
      showError("Veuillez saisir le nom du participant.");
      return;
    }
    onSubmit({
      training_id: trainingId,
      participant_id: showOtherParticipant ? null : participantId,
      participant_name: showOtherParticipant ? otherParticipantName.trim() : null,
      registration_status: status,
      attendance_date: attendanceDate || null,
      score: score ? parseFloat(score) : null,
      passed,
      certificate_number: certificateNumber || null,
      certificate_issued_date: certificateIssuedDate || null,
      certificate_expiry_date: certificateExpiryDate || null,
      comments: comments || null,
    });
  };

  const availableUsers = users ? Object.values(users) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Enregistrer une participation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Formation *</Label>
              <Select value={trainingId} onValueChange={setTrainingId}>
                <SelectTrigger><SelectValue placeholder="Choisir une formation" /></SelectTrigger>
                <SelectContent>
                  {trainings.map((training) => (
                    <SelectItem key={training.id} value={training.id}>{training.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Participant *</Label>
              <Select value={showOtherParticipant ? 'autre' : participantId} onValueChange={handleParticipantChange}>
                <SelectTrigger><SelectValue placeholder="Choisir un collaborateur" /></SelectTrigger>
                <SelectContent>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.civility} {user.first_name} {user.last_name} ({user.role})
                    </SelectItem>
                  ))}
                  <SelectItem value="autre">Autre...</SelectItem>
                </SelectContent>
              </Select>
              {showOtherParticipant && (
                <div className="mt-2">
                  <Label>Nom du participant *</Label>
                  <Input
                    value={otherParticipantName}
                    onChange={(e) => setOtherParticipantName(e.target.value)}
                    placeholder="Saisir le nom complet du participant"
                    required
                  />
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Statut d'inscription</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="inscrit">Inscrit</SelectItem>
                  <SelectItem value="présent">Présent</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="excused">Excusé</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date de présence</Label>
              <Input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Score / Note</Label>
              <Input type="number" step="0.5" value={score} onChange={(e) => setScore(e.target.value)} />
            </div>
            <div className="flex items-center space-x-2 border rounded-lg p-3">
              <Checkbox id="passed" checked={passed} onCheckedChange={(checked) => setPassed(!!checked)} />
              <Label htmlFor="passed">Formation réussie</Label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>N° certificat</Label>
              <Input value={certificateNumber} onChange={(e) => setCertificateNumber(e.target.value)} />
            </div>
            <div>
              <Label>Date d'émission</Label>
              <Input type="date" value={certificateIssuedDate} onChange={(e) => setCertificateIssuedDate(e.target.value)} />
            </div>
            <div>
              <Label>Expiration</Label>
              <Input type="date" value={certificateExpiryDate} onChange={(e) => setCertificateExpiryDate(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Commentaires</Label>
            <Textarea value={comments} onChange={(e) => setComments(e.target.value)} rows={3} />
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

const AddCompetencyDialog = ({
  isOpen,
  onClose,
  onSubmit,
  users,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
  users?: Users;
}) => {
  const [employeeId, setEmployeeId] = useState('');
  const [skillName, setSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [level, setLevel] = useState('débutant');
  const [certNumber, setCertNumber] = useState('');
  const [issuedDate, setIssuedDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !skillName) {
      showError("Sélectionnez un collaborateur et renseignez la compétence.");
      return;
    }
    onSubmit({
      employee_id: employeeId,
      skill_name: skillName,
      skill_category: skillCategory || null,
      level,
      certification_number: certNumber || null,
      issued_date: issuedDate || null,
      expiry_date: expiryDate || null,
      issuing_authority: issuingAuthority || null,
      notes: notes || null,
    });
  };

  const availableUsers = users ? Object.values(users) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ajouter une habilitation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Collaborateur *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Choisir un collaborateur" /></SelectTrigger>
              <SelectContent>
                {availableUsers.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.civility} {user.first_name} {user.last_name} ({user.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Compétence / Habilitation *</Label>
              <Input value={skillName} onChange={(e) => setSkillName(e.target.value)} required />
            </div>
            <div>
              <Label>Famille / Domaine</Label>
              <Input value={skillCategory} onChange={(e) => setSkillCategory(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Niveau</Label>
              <Select value={level} onValueChange={setLevel}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="débutant">Débutant</SelectItem>
                  <SelectItem value="intermédiaire">Intermédiaire</SelectItem>
                  <SelectItem value="avancé">Avancé</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>N° certificat</Label>
              <Input value={certNumber} onChange={(e) => setCertNumber(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Date de délivrance</Label>
              <Input type="date" value={issuedDate} onChange={(e) => setIssuedDate(e.target.value)} />
            </div>
            <div>
              <Label>Expiration</Label>
              <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
            </div>
            <div>
              <Label>Émetteur</Label>
              <Input value={issuingAuthority} onChange={(e) => setIssuingAuthority(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
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

// Dialog de détails de la formation
interface TrainingDetailsDialogProps {
  training: Training;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (trainingId: string, data: any) => void;
  onDelete: (trainingId: string) => void;
  participants: TrainingParticipation[];
  users?: Users;
}

const TrainingDetailsDialog = ({
  training,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
  participants,
  users,
}: TrainingDetailsDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(training.title);
  const [category, setCategory] = useState(training.category);
  const [trainingType, setTrainingType] = useState<TrainingType>(training.training_type);
  const [description, setDescription] = useState(training.description || '');
  const [durationHours, setDurationHours] = useState(training.duration_hours?.toString() || '');
  const [plannedDate, setPlannedDate] = useState(training.planned_date ? format(training.planned_date, 'yyyy-MM-dd') : '');
  const [location, setLocation] = useState(training.location || '');
  const [maxParticipants, setMaxParticipants] = useState(training.max_participants?.toString() || '');
  const [certificateRequired, setCertificateRequired] = useState(training.certificate_required);
  const [validityMonths, setValidityMonths] = useState(training.validity_months?.toString() || '');
  const [status, setStatus] = useState<TrainingStatus>(training.status);
  const [prestataire, setPrestataire] = useState(training.prestataire || '');
  const [prestataireNote, setPrestataireNote] = useState(training.prestataire_note?.toString() || '');
  const [prestataireEvaluation, setPrestataireEvaluation] = useState(training.prestataire_evaluation || '');

  useEffect(() => {
    if (!isEditing) {
      setTitle(training.title);
      setCategory(training.category);
      setTrainingType(training.training_type);
      setDescription(training.description || '');
      setDurationHours(training.duration_hours?.toString() || '');
      setPlannedDate(training.planned_date ? format(training.planned_date, 'yyyy-MM-dd') : '');
      setLocation(training.location || '');
      setMaxParticipants(training.max_participants?.toString() || '');
      setCertificateRequired(training.certificate_required);
      setValidityMonths(training.validity_months?.toString() || '');
      setStatus(training.status);
      setPrestataire(training.prestataire || '');
      setPrestataireNote(training.prestataire_note?.toString() || '');
      setPrestataireEvaluation(training.prestataire_evaluation || '');
    }
  }, [training, isEditing]);

  const handleSave = () => {
    onUpdate(training.id, {
      title,
      category,
      training_type: trainingType,
      description: description || null,
      duration_hours: durationHours ? parseFloat(durationHours) : null,
      planned_date: plannedDate || null,
      location: location || null,
      max_participants: maxParticipants ? parseInt(maxParticipants) : null,
      certificate_required: certificateRequired,
      validity_months: validityMonths ? parseInt(validityMonths) : null,
      status,
      prestataire: prestataire || null,
      prestataire_note: prestataireNote ? parseFloat(prestataireNote) : null,
      prestataire_evaluation: prestataireEvaluation || null,
    });
    setIsEditing(false);
  };

  const stats = {
    total: participants.length,
    presents: participants.filter(p => p.registration_status === 'présent').length,
    passed: participants.filter(p => p.passed).length,
    certificates: participants.filter(p => p.certificate_number).length,
  };

  const getParticipantName = (participation: TrainingParticipation) => {
    if (participation.participant_display_name) {
      return participation.participant_display_name;
    }
    if (participation.participant_name) {
      return participation.participant_name;
    }
    if (participation.participant_first_name && participation.participant_last_name) {
      return `${participation.participant_first_name} ${participation.participant_last_name}`;
    }
    return 'Participant inconnu';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Détails de la Formation</span>
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
                    onClick={() => onDelete(training.id)}
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
          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border border-blue-200 bg-blue-50/60">
              <CardContent className="p-4">
                <p className="text-sm text-blue-700">Total participants</p>
                <p className="text-2xl font-bold text-blue-700">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="border border-green-200 bg-green-50/60">
              <CardContent className="p-4">
                <p className="text-sm text-green-700">Présents</p>
                <p className="text-2xl font-bold text-green-700">{stats.presents}</p>
              </CardContent>
            </Card>
            <Card className="border border-emerald-200 bg-emerald-50/60">
              <CardContent className="p-4">
                <p className="text-sm text-emerald-700">Réussis</p>
                <p className="text-2xl font-bold text-emerald-700">{stats.passed}</p>
              </CardContent>
            </Card>
            <Card className="border border-amber-200 bg-amber-50/60">
              <CardContent className="p-4">
                <p className="text-sm text-amber-700">Certificats</p>
                <p className="text-2xl font-bold text-amber-700">{stats.certificates}</p>
              </CardContent>
            </Card>
          </div>

          {/* Informations générales */}
          <div className="border-b pb-4">
            <Label className="text-sm font-semibold text-gray-700 mb-3 block">Informations Générales</Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-semibold text-gray-700">Titre</Label>
                {isEditing ? (
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                ) : (
                  <p className="font-medium">{training.title}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Catégorie</Label>
                {isEditing ? (
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} />
                ) : (
                  <p>{training.category}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Type</Label>
                {isEditing ? (
                  <Select value={trainingType} onValueChange={(v) => setTrainingType(v as TrainingType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(trainingTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p>{trainingTypeLabels[training.training_type]}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Statut</Label>
                {isEditing ? (
                  <Select value={status} onValueChange={(v) => setStatus(v as TrainingStatus)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={statusColors[training.status]}>
                    {statusLabels[training.status]}
                  </Badge>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Prestataire</Label>
                {isEditing ? (
                  <Select value={prestataire} onValueChange={setPrestataire}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un prestataire" /></SelectTrigger>
                    <SelectContent>
                      {PRESTATAIRES.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p>{training.prestataire || 'Non spécifié'}</p>
                )}
              </div>
              {prestataire && (
                <>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Note du prestataire (sur 10)</Label>
                    {isEditing ? (
                      <Input 
                        type="number" 
                        min="0" 
                        max="10" 
                        step="0.1" 
                        value={prestataireNote} 
                        onChange={(e) => setPrestataireNote(e.target.value)} 
                        placeholder="Ex: 8.5" 
                      />
                    ) : (
                      <p>{training.prestataire_note ? `${training.prestataire_note}/10` : 'Non noté'}</p>
                    )}
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-semibold text-gray-700">Évaluation du prestataire</Label>
                    {isEditing ? (
                      <Textarea 
                        value={prestataireEvaluation} 
                        onChange={(e) => setPrestataireEvaluation(e.target.value)} 
                        rows={3} 
                        placeholder="Commentaires sur la prestation..."
                      />
                    ) : (
                      <p className="whitespace-pre-wrap">{training.prestataire_evaluation || 'Aucune évaluation'}</p>
                    )}
                  </div>
                </>
              )}
              <div>
                <Label className="text-sm font-semibold text-gray-700">Date planifiée</Label>
                {isEditing ? (
                  <Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
                ) : (
                  <p>{training.planned_date ? format(training.planned_date, 'dd/MM/yyyy') : '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Durée (heures)</Label>
                {isEditing ? (
                  <Input type="number" step="0.5" value={durationHours} onChange={(e) => setDurationHours(e.target.value)} />
                ) : (
                  <p>{training.duration_hours || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Lieu</Label>
                {isEditing ? (
                  <Input value={location} onChange={(e) => setLocation(e.target.value)} />
                ) : (
                  <p>{training.location || '-'}</p>
                )}
              </div>
              <div>
                <Label className="text-sm font-semibold text-gray-700">Participants max</Label>
                {isEditing ? (
                  <Input type="number" value={maxParticipants} onChange={(e) => setMaxParticipants(e.target.value)} />
                ) : (
                  <p>{training.max_participants || '-'}</p>
                )}
              </div>
            </div>
            <div className="mt-4">
              <Label className="text-sm font-semibold text-gray-700">Description</Label>
              {isEditing ? (
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">{training.description || 'Aucune description'}</p>
              )}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2 border rounded-lg p-3">
                <Checkbox 
                  id="certificateRequired" 
                  checked={certificateRequired} 
                  onCheckedChange={(checked) => setCertificateRequired(!!checked)}
                  disabled={!isEditing}
                />
                <div>
                  <Label htmlFor="certificateRequired">Certificat requis</Label>
                  <p className="text-xs text-slate-500">Active le suivi des habilitations</p>
                </div>
              </div>
              {certificateRequired && (
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Validité (mois)</Label>
                  {isEditing ? (
                    <Input type="number" value={validityMonths} onChange={(e) => setValidityMonths(e.target.value)} placeholder="Ex: 12" />
                  ) : (
                    <p>{training.validity_months || '-'}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Participants */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-sm font-semibold text-gray-700">Participants ({participants.length})</Label>
            </div>
            {participants.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Participant</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Date présence</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Réussi</TableHead>
                      <TableHead>Certificat</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {participants.map((participation) => (
                      <TableRow key={participation.id}>
                        <TableCell className="font-medium">
                          {getParticipantName(participation)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {participation.registration_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {participation.attendance_date ? format(participation.attendance_date, 'dd/MM/yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          {participation.score !== null && participation.score !== undefined ? participation.score : '-'}
                        </TableCell>
                        <TableCell>
                          {participation.passed ? (
                            <Badge className="bg-green-100 text-green-700">Oui</Badge>
                          ) : (
                            <Badge variant="secondary">Non</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {participation.certificate_number ? (
                            <div className="space-y-1">
                              <p className="text-xs font-mono">{participation.certificate_number}</p>
                              {participation.certificate_expiry_date && (
                                <p className="text-xs text-gray-500">
                                  Expire: {format(participation.certificate_expiry_date, 'dd/MM/yyyy')}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <Card className="border border-dashed">
                <CardContent className="p-8 text-center">
                  <Icon name="UserPlus" className="mx-auto text-4xl text-gray-300 mb-2" />
                  <p className="text-gray-500">Aucun participant enregistré</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
