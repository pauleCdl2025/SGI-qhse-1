import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { User } from "@/types";
import { useAnomalies, QHSEAnomaly } from "@/hooks/use-anomalies";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import jsPDF from "jspdf";

interface QHSEAnomaliesModuleProps {
  user: User;
}

export const QHSEAnomaliesModule = ({ user }: QHSEAnomaliesModuleProps) => {
  const { anomalies, createAnomaly, updateAnomaly, deleteAnomaly } = useAnomalies();
  const [isAnomalyDialogOpen, setIsAnomalyDialogOpen] = useState(false);
  const [editingAnomalyId, setEditingAnomalyId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"" | "faible" | "moyenne" | "haute" | "critique">("");
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const today = new Date();

  const [anomalyForm, setAnomalyForm] = useState({
    date_anomalie: format(today, "yyyy-MM-dd"),
    lieu: "",
    source: "",
    description: "",
    thematique: "",
    sous_thematique: "",
    responsable_action: "",
    message_prise_en_compte: "",
    actions_a_mettre_en_oeuvre: "",
    devis_a_faire: false as boolean,
    montant_devis: "",
    commentaires: "",
    impact_patient: "",
    impact_structure: "",
    niveau_priorite: "moyenne",
    date_limite: "",
    etat_avancement: "",
    date_resolution: "",
    date_verification: "",
    commentaire_verification: "",
  });

  const openNewAnomalyDialog = () => {
    setEditingAnomalyId(null);
    setAnomalyForm({
      date_anomalie: format(new Date(), "yyyy-MM-dd"),
      lieu: "",
      source: "",
      description: "",
      thematique: "",
      sous_thematique: "",
      responsable_action: "",
      message_prise_en_compte: "",
      actions_a_mettre_en_oeuvre: "",
      devis_a_faire: false,
      montant_devis: "",
      commentaires: "",
      impact_patient: "",
      impact_structure: "",
      niveau_priorite: "moyenne",
      date_limite: "",
      etat_avancement: "",
      date_resolution: "",
      date_verification: "",
      commentaire_verification: "",
    });
    setIsAnomalyDialogOpen(true);
  };

  const openEditAnomalyDialog = (id: string) => {
    const anomaly = anomalies.find(a => a.id === id);
    if (!anomaly) return;
    setEditingAnomalyId(id);
    setAnomalyForm({
      date_anomalie: anomaly.date_anomalie || format(new Date(), "yyyy-MM-dd"),
      lieu: anomaly.lieu || "",
      source: anomaly.source || "",
      description: anomaly.description || "",
      thematique: anomaly.thematique || "",
      sous_thematique: anomaly.sous_thematique || "",
      responsable_action: anomaly.responsable_action || "",
      message_prise_en_compte: anomaly.message_prise_en_compte || "",
      actions_a_mettre_en_oeuvre: anomaly.actions_a_mettre_en_oeuvre || "",
      devis_a_faire: anomaly.devis_a_faire || false,
      montant_devis: anomaly.montant_devis != null ? String(anomaly.montant_devis) : "",
      commentaires: anomaly.commentaires || "",
      impact_patient: anomaly.impact_patient || "",
      impact_structure: anomaly.impact_structure || "",
      niveau_priorite: anomaly.niveau_priorite || "moyenne",
      date_limite: anomaly.date_limite || "",
      etat_avancement: anomaly.etat_avancement || "",
      date_resolution: anomaly.date_resolution || "",
      date_verification: anomaly.date_verification || "",
      commentaire_verification: anomaly.commentaire_verification || "",
    });
    setIsAnomalyDialogOpen(true);
  };

  const handleSubmitAnomaly = async () => {
    const payload = {
      ...anomalyForm,
      montant_devis: anomalyForm.montant_devis ? Number(anomalyForm.montant_devis) : null,
    };
    if (!payload.date_anomalie || !payload.lieu || !payload.description) {
      // On garde le toast centralisé dans le hook si besoin
      return;
    }
    if (editingAnomalyId) {
      await updateAnomaly(editingAnomalyId, payload);
    } else {
      await createAnomaly(payload);
    }
    setIsAnomalyDialogOpen(false);
  };

  const stats = useMemo(() => {
    const total = anomalies.length;
    const high = anomalies.filter(a => a.niveau_priorite === "haute" || a.niveau_priorite === "critique").length;
    const unresolved = anomalies.filter(a => !a.date_resolution).length;
    return { total, high, unresolved };
  }, [anomalies]);

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter(a => {
      if (priorityFilter && a.niveau_priorite !== priorityFilter) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      return (
        (a.description || "").toLowerCase().includes(term) ||
        (a.lieu || "").toLowerCase().includes(term) ||
        (a.source || "").toLowerCase().includes(term) ||
        (a.thematique || "").toLowerCase().includes(term) ||
        (a.sous_thematique || "").toLowerCase().includes(term) ||
        (a.responsable_action || "").toLowerCase().includes(term)
      );
    });
  }, [anomalies, priorityFilter, searchTerm]);

  const handleExportReport = async () => {
    if (filteredAnomalies.length === 0) return;
    setIsGeneratingReport(true);
    try {
      const doc = new jsPDF("portrait", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();

      // En-tête
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("Rapport statistique - Anomalies QHSE", pageWidth / 2, 16, { align: "center" });

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const subtitle = `${user.civility} ${user.first_name} ${user.last_name} - Généré le ${format(
        new Date(),
        "dd/MM/yyyy HH:mm"
      )}`;
      doc.text(subtitle, pageWidth / 2, 22, { align: "center" });

      let y = 32;

      // Statistiques globales
      const total = filteredAnomalies.length;
      const byPriority: Record<string, number> = { faible: 0, moyenne: 0, haute: 0, critique: 0 };
      const resolved = filteredAnomalies.filter(a => !!a.date_resolution).length;
      const unresolved = total - resolved;

      filteredAnomalies.forEach(a => {
        if (a.niveau_priorite && byPriority[a.niveau_priorite] !== undefined) {
          byPriority[a.niveau_priorite]++;
        }
      });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("1. Synthèse des anomalies", 14, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(`Nombre total d'anomalies analysées : ${total}`, 14, y);
      y += 6;
      doc.text(`Anomalies résolues : ${resolved}`, 14, y);
      y += 6;
      doc.text(`Anomalies en cours / non résolues : ${unresolved}`, 14, y);
      y += 10;

      // Répartition par priorité sous forme de "barres"
      doc.setFont("helvetica", "bold");
      doc.text("2. Répartition par priorité", 14, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      const priorities: { key: keyof typeof byPriority; label: string; color: string }[] = [
        { key: "critique", label: "Critique", color: "#dc2626" },
        { key: "haute", label: "Haute", color: "#f97316" },
        { key: "moyenne", label: "Moyenne", color: "#eab308" },
        { key: "faible", label: "Faible", color: "#22c55e" },
      ];

      const barMaxWidth = pageWidth - 70;
      priorities.forEach(p => {
        const count = byPriority[p.key];
        const ratio = total > 0 ? count / total : 0;
        const barWidth = ratio * barMaxWidth;

        doc.setFontSize(10);
        doc.text(`${p.label} : ${count}`, 16, y);
        // barre
        (doc as any).setFillColor(p.color);
        doc.rect(50, y - 4, barWidth, 4, "F");
        y += 7;
      });

      y += 6;

      // Top 5 anomalies récentes (résumé)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("3. Top 5 anomalies récentes", 14, y);
      y += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");

      const recent = [...filteredAnomalies].slice(0, 5);
      recent.forEach(a => {
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 20;
        }
        const dateStr = a.date_anomalie ? a.date_anomalie : "-";
        const line = `• [${dateStr}] ${a.lieu || "Lieu non renseigné"} - ${
          a.description?.substring(0, 90) || "Description non renseignée"
        }${a.description && a.description.length > 90 ? "..." : ""} (Priorité: ${a.niveau_priorite || "-"})`;
        const splitted = doc.splitTextToSize(line, pageWidth - 28);
        doc.text(splitted, 16, y);
        y += 5 + (splitted.length - 1) * 4;
      });

      const fileName = `rapport-statistiques-anomalies-qhse-${format(new Date(), "yyyy-MM-dd-HHmm")}.pdf`;
      doc.save(fileName);
    } finally {
      setIsGeneratingReport(false);
    }
  };

  if (user.role !== 'assistante_qhse' && user.role !== 'superviseur_qhse' && user.role !== 'superadmin') {
    return null;
  }

  return (
    <>
      <Card className="card-hover border-0 shadow-xl bg-gradient-to-r from-orange-50 via-amber-50 to-white">
        <CardHeader className="pb-4 border-b border-orange-100/70 bg-gradient-to-r from-orange-500/10 via-amber-400/10 to-transparent rounded-t-xl">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-md">
                <Icon name="AlertTriangle" className="h-4 w-4" />
              </span>
              <div className="flex flex-col">
                <span className="text-lg md:text-xl font-bold text-slate-800">Anomalies QHSE</span>
                <span className="text-[11px] uppercase tracking-wide text-orange-500 font-semibold">
                  Qualité · Hygiène · Sécurité · Environnement
                </span>
              </div>
            </CardTitle>
            <Button
              size="sm"
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 shadow-md"
              onClick={openNewAnomalyDialog}
            >
              <Icon name="Plus" className="mr-2 h-4 w-4" />
              Nouvelle anomalie
            </Button>
          </div>
        </CardHeader>
        <CardContent className="bg-white rounded-b-xl">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-gray-500 max-w-2xl">
              Suivi détaillé des anomalies et des actions correctives. Utilisez la recherche et les filtres pour retrouver rapidement une situation.
            </p>
            <div className="flex flex-wrap gap-2 justify-end">
              <div className="flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-xs md:text-sm text-cyan-700">
                <Icon name="ListChecks" className="h-4 w-4" />
                <span>Total: </span>
                <span className="font-semibold">{stats.total}</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs md:text-sm text-red-700">
                <Icon name="AlertTriangle" className="h-4 w-4" />
                <span>Priorité haute / critique: </span>
                <span className="font-semibold">{stats.high}</span>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs md:text-sm text-amber-700">
                <Icon name="Clock" className="h-4 w-4" />
                <span>En cours / non résolues: </span>
                <span className="font-semibold">{stats.unresolved}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="border-orange-300 text-orange-700 hover:bg-orange-50"
                onClick={handleExportReport}
                disabled={isGeneratingReport || filteredAnomalies.length === 0}
              >
                <Icon name={isGeneratingReport ? "Clock" : "Download"} className={`mr-2 h-4 w-4 ${isGeneratingReport ? "animate-spin" : ""}`} />
                {isGeneratingReport ? "Génération..." : "Exporter le rapport"}
              </Button>
            </div>
          </div>

          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:max-w-sm">
              <Input
                placeholder="Rechercher (lieu, source, description, responsable...)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 text-sm"
              />
              <Icon name="Search" className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs md:text-sm text-gray-500">Filtrer par priorité :</span>
              <div className="flex flex-wrap gap-1">
                {[
                  { value: "", label: "Toutes" },
                  { value: "faible", label: "Faible" },
                  { value: "moyenne", label: "Moyenne" },
                  { value: "haute", label: "Haute" },
                  { value: "critique", label: "Critique" },
                ].map(opt => (
                  <Badge
                    key={opt.value || "all"}
                    variant={priorityFilter === opt.value ? "default" : "outline"}
                    className={
                      "cursor-pointer text-xs md:text-[11px] px-2 py-1 rounded-full transition-colors " +
                      (opt.value === "critique"
                        ? "border-red-500 text-red-700"
                        : opt.value === "haute"
                        ? "border-orange-500 text-orange-700"
                        : opt.value === "moyenne"
                        ? "border-amber-400 text-amber-700"
                        : opt.value === "faible"
                        ? "border-emerald-400 text-emerald-700"
                        : "border-gray-300 text-gray-700")
                    }
                    onClick={() =>
                      setPriorityFilter(prev => (prev === opt.value ? "" : (opt.value as typeof priorityFilter)))
                    }
                  >
                    {opt.label}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-xs md:text-sm border border-gray-300 rounded-lg bg-white">
              <thead className="bg-slate-100 border-b border-gray-300">
                <tr>
                  <th className="px-2 py-2 border border-gray-300 text-left">Date</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Lieux</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Source</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Description de l&apos;anomalie</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Thématique</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Sous thématique</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Responsable de l&apos;action</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Message de prise en compte</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Actions à mettre en œuvre</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Devis à faire ?</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Montant du devis ?</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Commentaires</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Impact sur le patient</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Impact sur le fonctionnement</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Niveau de priorité</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Date limite de traitement</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">État d&apos;avancement des actions</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Date de résolution effective</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Date de la vérification</th>
                  <th className="px-2 py-2 border border-gray-300 text-left">Commentaire de vérification</th>
                  <th className="px-2 py-2 border border-gray-300 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnomalies.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="px-3 py-4 text-center text-gray-500">
                      Aucune anomalie ne correspond aux critères de recherche.
                    </td>
                  </tr>
                ) : (
                  filteredAnomalies.map((anomaly, index) => (
                    <tr
                      key={anomaly.id}
                      className={`hover:bg-cyan-50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50"
                      }`}
                    >
                      <td className="px-2 py-2 border border-gray-200">{anomaly.date_anomalie || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.lieu || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.source || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200 max-w-[260px]">
                        <span className="line-clamp-2">{anomaly.description || '-'}</span>
                      </td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.thematique || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.sous_thematique || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.responsable_action || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.message_prise_en_compte || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.actions_a_mettre_en_oeuvre || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.devis_a_faire ? 'Oui' : 'Non'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.montant_devis ?? '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.commentaires || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.impact_patient || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.impact_structure || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">
                        <Badge
                          className={
                            anomaly.niveau_priorite === 'critique'
                              ? 'bg-red-500 text-white'
                              : anomaly.niveau_priorite === 'haute'
                              ? 'bg-orange-500 text-white'
                              : anomaly.niveau_priorite === 'moyenne'
                              ? 'bg-amber-400 text-white'
                              : 'bg-emerald-500 text-white'
                          }
                        >
                          {anomaly.niveau_priorite || '-'}
                        </Badge>
                      </td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.date_limite || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.etat_avancement || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.date_resolution || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.date_verification || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">{anomaly.commentaire_verification || '-'}</td>
                      <td className="px-2 py-2 border border-gray-200">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 border-cyan-300 text-cyan-700 hover:bg-cyan-50"
                            onClick={() => openEditAnomalyDialog(anomaly.id)}
                          >
                            <Icon name="Pen" className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-7 w-7 border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() => deleteAnomaly(anomaly.id)}
                          >
                            <Icon name="Trash2" className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isAnomalyDialogOpen} onOpenChange={setIsAnomalyDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Icon name="AlertTriangle" className="text-orange-500" />
              {editingAnomalyId ? "Modifier l'anomalie" : "Nouvelle anomalie QHSE"}
            </DialogTitle>
            <DialogDescription>
              Renseignez les informations de l&apos;anomalie et des actions à mettre en œuvre.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={anomalyForm.date_anomalie}
                onChange={e => setAnomalyForm(f => ({ ...f, date_anomalie: e.target.value }))}
              />
            </div>
            <div>
              <Label>Lieux</Label>
              <Input
                value={anomalyForm.lieu}
                onChange={e => setAnomalyForm(f => ({ ...f, lieu: e.target.value }))}
                placeholder="Service / unité / zone"
              />
            </div>
            <div>
              <Label>Source</Label>
              <Input
                value={anomalyForm.source}
                onChange={e => setAnomalyForm(f => ({ ...f, source: e.target.value }))}
                placeholder="Audit, plainte, rondes..."
              />
            </div>
            <div>
              <Label>Niveau de priorité</Label>
              <select
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={anomalyForm.niveau_priorite}
                onChange={e => setAnomalyForm(f => ({ ...f, niveau_priorite: e.target.value }))}
              >
                <option value="faible">Faible</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
                <option value="critique">Critique</option>
              </select>
            </div>
            <div>
              <Label>Thématique</Label>
              <Input
                value={anomalyForm.thematique}
                onChange={e => setAnomalyForm(f => ({ ...f, thematique: e.target.value }))}
              />
            </div>
            <div>
              <Label>Sous thématique</Label>
              <Input
                value={anomalyForm.sous_thematique}
                onChange={e => setAnomalyForm(f => ({ ...f, sous_thematique: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Description de l&apos;anomalie</Label>
              <Textarea
                value={anomalyForm.description}
                onChange={e => setAnomalyForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label>Responsable de l&apos;action</Label>
              <Input
                value={anomalyForm.responsable_action}
                onChange={e => setAnomalyForm(f => ({ ...f, responsable_action: e.target.value }))}
              />
            </div>
            <div>
              <Label>Date limite de traitement</Label>
              <Input
                type="date"
                value={anomalyForm.date_limite || ""}
                onChange={e => setAnomalyForm(f => ({ ...f, date_limite: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Message de prise en compte</Label>
              <Textarea
                value={anomalyForm.message_prise_en_compte}
                onChange={e => setAnomalyForm(f => ({ ...f, message_prise_en_compte: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Actions à mettre en œuvre</Label>
              <Textarea
                value={anomalyForm.actions_a_mettre_en_oeuvre}
                onChange={e => setAnomalyForm(f => ({ ...f, actions_a_mettre_en_oeuvre: e.target.value }))}
                rows={3}
              />
            </div>
            <div>
              <Label>Devis à faire ?</Label>
              <div className="mt-1 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={anomalyForm.devis_a_faire}
                  onChange={e => setAnomalyForm(f => ({ ...f, devis_a_faire: e.target.checked }))}
                />
                <span>Oui</span>
              </div>
            </div>
            <div>
              <Label>Montant du devis</Label>
              <Input
                type="number"
                step="0.01"
                value={anomalyForm.montant_devis}
                onChange={e => setAnomalyForm(f => ({ ...f, montant_devis: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="md:col-span-2">
              <Label>Commentaires</Label>
              <Textarea
                value={anomalyForm.commentaires}
                onChange={e => setAnomalyForm(f => ({ ...f, commentaires: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <Label>Impact sur le patient</Label>
              <Input
                value={anomalyForm.impact_patient}
                onChange={e => setAnomalyForm(f => ({ ...f, impact_patient: e.target.value }))}
              />
            </div>
            <div>
              <Label>Impact sur le fonctionnement</Label>
              <Input
                value={anomalyForm.impact_structure}
                onChange={e => setAnomalyForm(f => ({ ...f, impact_structure: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>État d&apos;avancement des actions</Label>
              <Textarea
                value={anomalyForm.etat_avancement}
                onChange={e => setAnomalyForm(f => ({ ...f, etat_avancement: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <Label>Date de résolution effective</Label>
              <Input
                type="date"
                value={anomalyForm.date_resolution || ""}
                onChange={e => setAnomalyForm(f => ({ ...f, date_resolution: e.target.value }))}
              />
            </div>
            <div>
              <Label>Date de la vérification</Label>
              <Input
                type="date"
                value={anomalyForm.date_verification || ""}
                onChange={e => setAnomalyForm(f => ({ ...f, date_verification: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label>Commentaire de vérification</Label>
              <Textarea
                value={anomalyForm.commentaire_verification}
                onChange={e => setAnomalyForm(f => ({ ...f, commentaire_verification: e.target.value }))}
                rows={2}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAnomalyDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleSubmitAnomaly}>
              {editingAnomalyId ? "Enregistrer les modifications" : "Créer l'anomalie"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

