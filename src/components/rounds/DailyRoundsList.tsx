import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { DailyRound, RoundType, RoundStatus, User } from "@/types";
import { apiClient } from "@/integrations/api/client";
import { showSuccess, showError } from "@/utils/toast";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { LoadingSpinner } from "@/components/shared/Loading";
import { RoundChecklistForm } from "./RoundChecklistForm";
import { DashboardCard } from "@/components/shared/DashboardCard";
import { exportToExcel } from "@/utils/excelExport";
import { generateDailyRoundsPDF } from "@/utils/dailyRoundsPdfGenerator";

const statusLabels: Record<RoundStatus, string> = {
  en_cours: "En cours",
  terminée: "Terminée",
  annulée: "Annulée",
};

const statusColors: Record<RoundStatus, string> = {
  en_cours: "bg-yellow-100 text-yellow-700",
  terminée: "bg-green-100 text-green-700",
  annulée: "bg-red-100 text-red-700",
};

const roundTypeLabels: Record<RoundType, string> = {
  biomedical: "Biomédical",
  technicien_polyvalent: "Technicien Polyvalent",
};

interface DailyRoundsListProps {
  user: User;
  roundType: RoundType;
}

export const DailyRoundsList = ({ user, roundType }: DailyRoundsListProps) => {
  const [rounds, setRounds] = useState<DailyRound[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRound, setSelectedRound] = useState<DailyRound | null>(null);
  const [isChecklistDialogOpen, setIsChecklistDialogOpen] = useState(false);

  useEffect(() => {
    fetchRounds();
  }, [roundType]);

  const fetchRounds = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDailyRounds(user.id, roundType);
      setRounds(data.map((round: any) => ({
        ...round,
        round_date: new Date(round.round_date),
        start_time: round.start_time ? new Date(round.start_time) : undefined,
        end_time: round.end_time ? new Date(round.end_time) : undefined,
        created_at: round.created_at ? new Date(round.created_at) : undefined,
        updated_at: round.updated_at ? new Date(round.updated_at) : undefined,
      })));
    } catch (error: any) {
      showError("Erreur lors du chargement des rondes: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRound = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const now = new Date();
      
      // Vérifier si une ronde existe déjà pour aujourd'hui
      const existingRound = rounds.find(r => {
        const roundDate = new Date(r.round_date);
        roundDate.setHours(0, 0, 0, 0);
        return roundDate.getTime() === today.getTime();
      });
      
      if (existingRound) {
        if (existingRound.status === 'en_cours') {
          // Continuer la ronde existante
          handleViewRound(existingRound);
          return;
        } else {
          showError("Une ronde existe déjà pour aujourd'hui avec le statut: " + statusLabels[existingRound.status]);
          return;
        }
      }
      
      // Formater les dates au format MySQL
      const roundDate = format(today, 'yyyy-MM-dd');
      const startTime = format(now, "yyyy-MM-dd HH:mm:ss");
      
      const technicianName = user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : '';
      const round = await apiClient.createDailyRound({
        technician_id: user.id,
        technician_name: technicianName,
        round_type: roundType,
        round_date: roundDate,
        status: 'en_cours',
        start_time: startTime,
      });
      showSuccess("Ronde démarrée avec succès");
      setIsDialogOpen(false);
      setSelectedRound(round);
      setIsChecklistDialogOpen(true);
      fetchRounds();
    } catch (error: any) {
      console.error('Erreur complète:', error);
      const errorMessage = error.response?.data?.error || error.message || "Erreur inconnue";
      showError("Erreur lors du démarrage de la ronde: " + errorMessage);
    }
  };

  const handleViewRound = (round: DailyRound) => {
    setSelectedRound(round);
    setIsChecklistDialogOpen(true);
  };

  const handleRoundComplete = () => {
    setIsChecklistDialogOpen(false);
    fetchRounds();
  };

  const handleDeleteRound = async (round: DailyRound) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer la ronde du ${format(new Date(round.round_date), "dd/MM/yyyy", { locale: fr })} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await apiClient.deleteDailyRound(round.id);
      showSuccess("Ronde supprimée avec succès");
      fetchRounds();
    } catch (error: any) {
      showError("Erreur lors de la suppression: " + error.message);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayRound = rounds.find(r => {
    const roundDate = new Date(r.round_date);
    roundDate.setHours(0, 0, 0, 0);
    return roundDate.getTime() === today.getTime();
  });

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

  const handleExportExcel = () => {
    try {
      const data = rounds.map(round => ({
        date: format(new Date(round.round_date), "dd/MM/yyyy", { locale: fr }),
        startTime: round.start_time ? format(new Date(round.start_time), "HH:mm", { locale: fr }) : '-',
        endTime: round.end_time ? format(new Date(round.end_time), "HH:mm", { locale: fr }) : '-',
        duration: round.start_time && round.end_time 
          ? Math.round((new Date(round.end_time).getTime() - new Date(round.start_time).getTime()) / (1000 * 60))
          : '-',
        status: statusLabels[round.status],
        notes: round.notes || '-',
      }));

      const headers = [
        { key: 'date' as const, label: 'Date' },
        { key: 'startTime' as const, label: 'Heure début' },
        { key: 'endTime' as const, label: 'Heure fin' },
        { key: 'duration' as const, label: 'Durée (min)' },
        { key: 'status' as const, label: 'Statut' },
        { key: 'notes' as const, label: 'Notes' },
      ];

      exportToExcel(data, headers, `Rondes_${roundTypeLabels[roundType]}_${format(new Date(), 'yyyy-MM-dd')}`, 'Rondes');
      showSuccess('Export Excel réussi !');
    } catch (error: any) {
      showError('Erreur lors de l\'export: ' + error.message);
    }
  };

  const handleExportPDF = async () => {
    try {
      await generateDailyRoundsPDF(rounds, roundType, user);
      showSuccess('Export PDF réussi !');
    } catch (error: any) {
      showError('Erreur lors de l\'export PDF: ' + error.message);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Icon name="ClipboardCheck" className="text-cyan-600 mr-2" />
            Rondes Quotidiennes - {roundTypeLabels[roundType]}
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExportExcel}
              disabled={rounds.length === 0}
            >
              <Icon name="FileSpreadsheet" className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              onClick={handleExportPDF}
              disabled={rounds.length === 0}
            >
              <Icon name="FileText" className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            {!todayRound && (
              <Button
                onClick={handleStartRound}
                className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600"
              >
                <Icon name="Play" className="mr-2 h-4 w-4" />
                Démarrer la ronde d'aujourd'hui
              </Button>
            )}
            {todayRound && todayRound.status === 'en_cours' && (
              <Button
                onClick={() => handleViewRound(todayRound)}
                className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600"
              >
                <Icon name="Edit" className="mr-2 h-4 w-4" />
                Continuer la ronde
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
            <DashboardCard
              title="Total"
              value={stats.total}
              iconName="ClipboardCheck"
              colorClass="bg-blue-100 text-blue-600"
            />
            <DashboardCard
              title="Terminées"
              value={stats.completed}
              iconName="CheckCircle2"
              colorClass="bg-green-100 text-green-600"
            />
            <DashboardCard
              title="En cours"
              value={stats.inProgress}
              iconName="Clock"
              colorClass="bg-yellow-100 text-yellow-600"
            />
            <DashboardCard
              title="Annulées"
              value={stats.cancelled}
              iconName="XCircle"
              colorClass="bg-red-100 text-red-600"
            />
            <DashboardCard
              title="Cette semaine"
              value={stats.thisWeek}
              iconName="Calendar"
              colorClass="bg-cyan-100 text-cyan-600"
            />
            <DashboardCard
              title="Ce mois"
              value={stats.thisMonth}
              iconName="CalendarDays"
              colorClass="bg-purple-100 text-purple-600"
            />
            <DashboardCard
              title="Durée moy. (min)"
              value={stats.averageDuration || '-'}
              iconName="Timer"
              colorClass="bg-indigo-100 text-indigo-600"
            />
          </div>

          {/* Alertes pour rondes manquées */}
          {missingRounds.length > 0 && (
            <Card className="mb-6 border-orange-200 bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Icon name="AlertTriangle" className="text-orange-600 h-5 w-5" />
                  <div className="flex-1">
                    <p className="font-semibold text-orange-900">
                      {missingRounds.length} ronde(s) manquée(s) sur les 7 derniers jours
                    </p>
                    <p className="text-sm text-orange-700">
                      Dates: {missingRounds.map(d => format(d, 'dd/MM')).join(', ')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {rounds.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Icon name="ClipboardCheck" className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p>Aucune ronde enregistrée.</p>
              <p className="text-sm mt-2">Cliquez sur "Démarrer la ronde d'aujourd'hui" pour commencer.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Heure de début</TableHead>
                <TableHead>Heure de fin</TableHead>
                <TableHead>Durée</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rounds
                .sort((a, b) => new Date(b.round_date).getTime() - new Date(a.round_date).getTime())
                .map((round) => {
                  const duration = round.start_time && round.end_time
                    ? Math.round((new Date(round.end_time).getTime() - new Date(round.start_time).getTime()) / (1000 * 60))
                    : null;
                  
                  return (
                    <TableRow key={round.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{format(new Date(round.round_date), "EEEE d MMMM yyyy", { locale: fr })}</span>
                          {new Date(round.round_date).getTime() === today.getTime() && (
                            <Badge variant="outline" className="mt-1 w-fit text-xs">Aujourd'hui</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {round.start_time
                          ? format(new Date(round.start_time), "HH:mm", { locale: fr })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {round.end_time
                          ? format(new Date(round.end_time), "HH:mm", { locale: fr })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {duration !== null ? (
                          <span className="text-sm">
                            {Math.floor(duration / 60)}h {duration % 60}min
                          </span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[round.status]}>
                          {statusLabels[round.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewRound(round)}
                          >
                            <Icon name="Eye" className="mr-1 h-4 w-4" />
                            Voir
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteRound(round)}
                          >
                            <Icon name="Trash2" className="mr-1 h-4 w-4" />
                            Supprimer
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      {selectedRound && (
        <Dialog open={isChecklistDialogOpen} onOpenChange={setIsChecklistDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                Checklist - {format(new Date(selectedRound.round_date), "EEEE d MMMM yyyy", { locale: fr })}
              </DialogTitle>
              <DialogDescription>
                Remplissez la checklist de votre ronde quotidienne. Tous les items requis doivent être complétés avant de terminer.
              </DialogDescription>
            </DialogHeader>
            <RoundChecklistForm
              round={selectedRound}
              user={user}
              onComplete={handleRoundComplete}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
