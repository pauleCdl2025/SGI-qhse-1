import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Icon } from "@/components/Icon";
import { CameraAccessRequest, User } from "@/types";
import { showError, showSuccess } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";

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
  const [requesterName, setRequesterName] = useState('');
  const [requesterService, setRequesterService] = useState('');
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [otherReason, setOtherReason] = useState('');
  const [accessStartDate, setAccessStartDate] = useState('');
  const [accessEndDate, setAccessEndDate] = useState('');
  const [accessStartTime, setAccessStartTime] = useState('');
  const [accessEndTime, setAccessEndTime] = useState('');
  const [cameraZones, setCameraZones] = useState('');
  const [hierarchicalAuthorization, setHierarchicalAuthorization] = useState('');
  const [notes, setNotes] = useState('');
  const [qhseValidation, setQhseValidation] = useState('');
  const [qhseValidationDate, setQhseValidationDate] = useState('');
  const [requesterSignature, setRequesterSignature] = useState('');
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
    
    // Validation des champs du demandeur
    if (!requesterName.trim()) {
      showError("Veuillez remplir le nom du demandeur.");
      return;
    }

    if (!requesterService.trim()) {
      showError("Veuillez remplir le service/département.");
      return;
    }

    if (!requestDate) {
      showError("Veuillez remplir la date de la demande.");
      return;
    }

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

    if (!accessStartTime || !accessEndTime) {
      showError("Veuillez remplir les heures de début et de fin.");
      return;
    }

    if (!cameraZones.trim()) {
      showError("Veuillez préciser les zones/caméras concernées.");
      return;
    }

    if (!hierarchicalAuthorization.trim()) {
      showError("Veuillez indiquer l'autorisation hiérarchique.");
      return;
    }

    if (!notes.trim()) {
      showError("Veuillez remplir les notes complémentaires.");
      return;
    }

    if (!qhseValidation.trim()) {
      showError("Veuillez remplir la validation QHSE.");
      return;
    }

    if (!qhseValidationDate) {
      showError("Veuillez remplir la date de validation QHSE.");
      return;
    }

    if (!requesterSignature.trim()) {
      showError("Veuillez remplir la signature du demandeur.");
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

      const requestData: any = {
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        requester_id: user.id,
        requester_name: requesterName,
        requester_service: requesterService,
        request_date: new Date().toISOString(),
        access_reason: accessReason,
        access_start_date: startDate.toISOString().split('T')[0],
        access_end_date: endDate.toISOString().split('T')[0],
        access_start_time: accessStartTime || null,
        access_end_time: accessEndTime || null,
        camera_zones: cameraZones || null,
        hierarchical_authorization: hierarchicalAuthorization || null,
        notes: notes || null,
        qhse_validation: qhseValidation || null,
        qhse_validation_date: qhseValidationDate ? new Date(qhseValidationDate).toISOString().split('T')[0] : null,
        requester_signature: requesterSignature || null,
        status: 'en_attente',
      };

      const { error } = await supabase.from('camera_access_requests').insert([requestData]);

      if (error) {
        throw error;
      }
      showSuccess("Demande d'accès aux caméras soumise avec succès.");
      
      // Reset form
      setRequesterName('');
      setRequesterService('');
      setRequestDate(new Date().toISOString().split('T')[0]);
      setSelectedReasons([]);
      setOtherReason('');
      setAccessStartDate('');
      setAccessEndDate('');
      setAccessStartTime('');
      setAccessEndTime('');
      setCameraZones('');
      setHierarchicalAuthorization('');
      setNotes('');
      setQhseValidation('');
      setQhseValidationDate('');
      setRequesterSignature('');

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
          Formulaire de Demande d'Accès aux Caméras de Surveillance
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          (À compléter et valider avant toute consultation des images)
        </p>
      </CardHeader>
      <CardContent>
        {/* Sections informatives */}
        <div className="mb-6 space-y-4">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="utilisation">
              <AccordionTrigger className="text-left font-semibold">
                Utilisation
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-semibold">Conditions d'utilisation :</span>
                    <ul className="list-disc list-inside mt-1 space-y-1 text-gray-700">
                      <li>Investigation d'un incident interne</li>
                      <li>Enquête sur un accident ou situation dangereuse</li>
                      <li>Audit interne ou contrôle qualité</li>
                      <li>Sécurité du personnel ou des installations</li>
                    </ul>
                  </div>
                  <div>
                    <span className="font-semibold">Responsable de la saisie :</span>
                    <span className="text-gray-700 ml-2">Tout le personnel hors membre du CODIR</span>
                  </div>
                  <div>
                    <span className="font-semibold">Fréquence :</span>
                    <span className="text-gray-700 ml-2">Dès l'apparition d'un incident dont on n'a pas les causes et l'historique</span>
                  </div>
                  <div>
                    <span className="font-semibold">Circuit :</span>
                    <span className="text-gray-700 ml-2">Disponible auprès du service QHSE et archivé dans notre base de données</span>
                  </div>
                  <div>
                    <span className="font-semibold">Traçabilité et archivage :</span>
                    <span className="text-gray-700 ml-2">Archivé dans la base de données QHSE pour 3 ans</span>
                  </div>
                  <div>
                    <span className="font-semibold">Procédure associée :</span>
                    <span className="text-gray-700 ml-2">Gestion des accès et utilisation des caméras – QGR-PROC-004</span>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="mode-emploi">
              <AccordionTrigger className="text-left font-semibold">
                Mode d'emploi
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="font-semibold">Règles essentielles :</span>
                    <p className="text-gray-700 mt-1">Respecter la procédure rattachée à ce formulaire</p>
                  </div>
                  <div>
                    <span className="font-semibold">Champs obligatoires :</span>
                    <p className="text-gray-700 mt-1">Tous les champs sont obligatoires</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations du demandeur */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-3">Demandeur</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Demandeur *</Label>
                <Input
                  value={requesterName}
                  onChange={(e) => setRequesterName(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
              <div>
                <Label>Service / Département *</Label>
                <Input
                  value={requesterService}
                  onChange={(e) => setRequesterService(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label>Date de la demande *</Label>
              <Input
                type="date"
                value={requestDate}
                onChange={(e) => setRequestDate(e.target.value)}
                required
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
                  max={requestDate}
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
                  min={accessStartDate || undefined}
                  max={requestDate}
                  required
                />
              </div>
            </div>
          </div>

          {/* Heures d'accès */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="accessStartTime">Heure de début *</Label>
              <Input
                id="accessStartTime"
                type="time"
                value={accessStartTime}
                onChange={(e) => setAccessStartTime(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="accessEndTime">Heure de fin *</Label>
              <Input
                id="accessEndTime"
                type="time"
                value={accessEndTime}
                onChange={(e) => setAccessEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Zones/Caméras concernées */}
          <div>
            <Label htmlFor="cameraZones">Zones/Caméras concernées *</Label>
            <Textarea
              id="cameraZones"
              placeholder="Précisez les zones ou numéros de caméras concernés..."
              value={cameraZones}
              onChange={(e) => setCameraZones(e.target.value)}
              rows={3}
              required
            />
          </div>

          {/* Autorisation hiérarchique */}
          <div>
            <Label htmlFor="hierarchicalAuthorization">Autorisation hiérarchique *</Label>
            <Input
              id="hierarchicalAuthorization"
              placeholder="Nom du responsable qui autorise cette demande"
              value={hierarchicalAuthorization}
              onChange={(e) => setHierarchicalAuthorization(e.target.value)}
              required
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

          {/* Validation */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-900 mb-4">Validation :</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="qhseValidation">QHSE : *</Label>
                <Input
                  id="qhseValidation"
                  placeholder="Nom du responsable QHSE"
                  value={qhseValidation}
                  onChange={(e) => setQhseValidation(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="qhseValidationDate">Date : *</Label>
                <Input
                  id="qhseValidationDate"
                  type="date"
                  value={qhseValidationDate}
                  onChange={(e) => setQhseValidationDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Signature du demandeur */}
          <div>
            <Label htmlFor="requesterSignature">Signature du demandeur : *</Label>
            <Input
              id="requesterSignature"
              placeholder="Nom et signature du demandeur"
              value={requesterSignature}
              onChange={(e) => setRequesterSignature(e.target.value)}
              required
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes complémentaires *</Label>
            <Textarea
              id="notes"
              placeholder="Toute information complémentaire utile..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              required
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
