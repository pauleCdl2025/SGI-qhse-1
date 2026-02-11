import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/Icon";
import { CameraAccessRequest, User } from "@/types";
import { showError, showSuccess } from "@/utils/toast";
import { apiClient } from "@/integrations/api/client";

interface CameraAccessRequestFormProps {
  user: User;
  onRequestSubmitted?: () => void;
}

// Motifs de consultation selon le formulaire PDF
const ACCESS_REASONS = [
  "Investigation d'un incident interne",
  "Enquête sur un accident ou situation dangereuse",
  "Audit interne ou contrôle qualité",
  "Sécurité du personnel ou des installations",
] as const;

export const CameraAccessRequestForm = ({ user, onRequestSubmitted }: CameraAccessRequestFormProps) => {
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState('');
  const [accessStartDate, setAccessStartDate] = useState('');
  const [accessEndDate, setAccessEndDate] = useState('');
  const [accessStartTime, setAccessStartTime] = useState('');
  const [accessEndTime, setAccessEndTime] = useState('');
  const [cameraZones, setCameraZones] = useState('');
  const [hierarchicalAuthorization, setHierarchicalAuthorization] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleReasonToggle = (reason: string) => {
    setSelectedReasons(prev => 
      prev.includes(reason) 
        ? prev.filter(r => r !== reason)
        : [...prev, reason]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérifier qu'au moins un motif est sélectionné
    if (selectedReasons.length === 0 && !otherReason.trim()) {
      showError("Veuillez sélectionner au moins un motif de consultation.");
      return;
    }

    // Si "Autre" est sélectionné, vérifier qu'il y a une précision
    if (selectedReasons.includes("Autre (à préciser)") && !otherReason.trim()) {
      showError("Veuillez préciser le motif 'Autre'.");
      return;
    }

    if (!accessStartDate || !accessEndDate) {
      showError("Veuillez remplir toutes les dates obligatoires.");
      return;
    }

    const startDate = new Date(accessStartDate);
    const endDate = new Date(accessEndDate);

    if (startDate > endDate) {
      showError("La date de fin doit être postérieure à la date de début.");
      return;
    }

    setIsSubmitting(true);

    try {
      // Construire le motif de consultation
      let accessReason = selectedReasons.join('; ');
      if (otherReason.trim()) {
        if (accessReason) {
          accessReason += `; Autre: ${otherReason.trim()}`;
        } else {
          accessReason = `Autre: ${otherReason.trim()}`;
        }
      }

      const requestData: Omit<CameraAccessRequest, 'id' | 'request_date' | 'status' | 'created_at' | 'updated_at' | 'requester_name' | 'requester_service' | 'requester_position'> = {
        requester_id: user.id,
        access_reason: accessReason,
        access_start_date: startDate,
        access_end_date: endDate,
        access_start_time: accessStartTime || undefined,
        access_end_time: accessEndTime || undefined,
        camera_zones: cameraZones || undefined,
        hierarchical_authorization: hierarchicalAuthorization || undefined,
        notes: notes || undefined,
      };

      await apiClient.createCameraAccessRequest(requestData);
      showSuccess("Demande d'accès aux caméras soumise avec succès.");
      
      // Reset form
      setSelectedReasons([]);
      setOtherReason('');
      setAccessStartDate('');
      setAccessEndDate('');
      setAccessStartTime('');
      setAccessEndTime('');
      setCameraZones('');
      setHierarchicalAuthorization('');
      setNotes('');

      if (onRequestSubmitted) {
        onRequestSubmitted();
      }
    } catch (error: any) {
      console.error("Erreur lors de la soumission de la demande:", error);
      showError(error.message || "Erreur lors de la soumission de la demande.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Date minimale = aujourd'hui
  const today = new Date().toISOString().split('T')[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Icon name="Video" className="text-blue-600 mr-2" />
          Formulaire de Demande d'Accès aux Caméras
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations du demandeur */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">Demandeur</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Demandeur</Label>
                <Input
                  value={`${user.civility} ${user.first_name} ${user.last_name}`}
                  disabled
                  className="bg-white"
                />
              </div>
              <div>
                <Label>Service / Département</Label>
                <Input
                  value={user.position || 'Non spécifié'}
                  disabled
                  className="bg-white"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label>Date de la demande</Label>
              <Input
                value={new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                disabled
                className="bg-white"
              />
            </div>
          </div>

          {/* Motif de consultation */}
          <div>
            <Label className="mb-3 block">Motif de consultation * (cocher la ou les cases correspondantes)</Label>
            <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
              {ACCESS_REASONS.map((reason) => (
                <div key={reason} className="flex items-center space-x-2">
                  <Checkbox
                    id={`reason-${reason}`}
                    checked={selectedReasons.includes(reason)}
                    onCheckedChange={() => handleReasonToggle(reason)}
                  />
                  <Label
                    htmlFor={`reason-${reason}`}
                    className="font-normal cursor-pointer flex-1"
                  >
                    {reason}
                  </Label>
                </div>
              ))}
              <div className="flex items-start space-x-2">
                <Checkbox
                  id="reason-other"
                  checked={selectedReasons.includes("Autre (à préciser)")}
                  onCheckedChange={() => handleReasonToggle("Autre (à préciser)")}
                />
                <div className="flex-1">
                  <Label
                    htmlFor="reason-other"
                    className="font-normal cursor-pointer"
                  >
                    Autre (à préciser) :
                  </Label>
                  {selectedReasons.includes("Autre (à préciser)") && (
                    <Input
                      className="mt-2"
                      placeholder="Précisez le motif..."
                      value={otherReason}
                      onChange={(e) => setOtherReason(e.target.value)}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Période à consulter */}
          <div>
            <Label className="mb-3 block">Période à consulter *</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="accessStartDate" className="text-sm text-gray-600">Du</Label>
                <Input
                  id="accessStartDate"
                  type="date"
                  value={accessStartDate}
                  onChange={(e) => setAccessStartDate(e.target.value)}
                  min={today}
                  required
                />
              </div>
              <div>
                <Label htmlFor="accessEndDate" className="text-sm text-gray-600">Au</Label>
                <Input
                  id="accessEndDate"
                  type="date"
                  value={accessEndDate}
                  onChange={(e) => setAccessEndDate(e.target.value)}
                  min={accessStartDate || today}
                  required
                />
              </div>
            </div>
          </div>

          {/* Heures d'accès */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accessStartTime">Heure de début</Label>
              <Input
                id="accessStartTime"
                type="time"
                value={accessStartTime}
                onChange={(e) => setAccessStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="accessEndTime">Heure de fin</Label>
              <Input
                id="accessEndTime"
                type="time"
                value={accessEndTime}
                onChange={(e) => setAccessEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Zones/Caméras concernées */}
          <div>
            <Label htmlFor="cameraZones">Caméras / Zones concernées</Label>
            <Textarea
              id="cameraZones"
              placeholder="Précisez les zones ou numéros de caméras concernés..."
              value={cameraZones}
              onChange={(e) => setCameraZones(e.target.value)}
              rows={3}
            />
          </div>

          {/* Autorisation hiérarchique */}
          <div>
            <Label htmlFor="hierarchicalAuthorization">Autorisation hiérarchique</Label>
            <Input
              id="hierarchicalAuthorization"
              placeholder="Nom du responsable qui autorise cette demande"
              value={hierarchicalAuthorization}
              onChange={(e) => setHierarchicalAuthorization(e.target.value)}
            />
          </div>

          {/* Conditions d'accès */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Conditions d'accès :</h4>
            <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
              <li>La consultation doit se faire en présence d'un agent de sécurité dans la salle des serveurs.</li>
              <li>La consultation est limitée à la période et aux zones spécifiées.</li>
              <li>Le demandeur s'engage à respecter la confidentialité et à ne pas divulguer les images.</li>
              <li>Toute utilisation des images à des fins non autorisées constitue une violation des règles internes et de la réglementation sur la protection des données (RGPD).</li>
            </ul>
          </div>

          {/* Engagement de confidentialité */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Engagement de confidentialité</h4>
            <p className="text-sm text-gray-700">
              Je m'engage à utiliser les images uniquement dans le cadre du motif déclaré et à respecter strictement la confidentialité des données visionnées.
            </p>
            <div className="mt-3 flex items-center space-x-2">
              <Checkbox
                id="confidentiality-agreement"
                required
              />
              <Label htmlFor="confidentiality-agreement" className="font-normal cursor-pointer text-sm">
                J'accepte les conditions d'accès et m'engage à respecter la confidentialité *
              </Label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes complémentaires</Label>
            <Textarea
              id="notes"
              placeholder="Toute information complémentaire utile..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Bouton de soumission */}
          <div className="flex justify-end gap-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSubmitting ? (
                <>
                  <Icon name="Loader2" className="mr-2 h-4 w-4 animate-spin" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <Icon name="Send" className="mr-2 h-4 w-4" />
                  Soumettre la demande
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
