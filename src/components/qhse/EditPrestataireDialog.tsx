import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/Icon";
import { Incident } from '@/types';
import { showError, showSuccess } from '@/utils/toast';

interface EditPrestataireDialogProps {
  incident: Incident;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (incidentId: string, prestataire: string) => Promise<void>;
}

export const EditPrestataireDialog = ({ incident, isOpen, onClose, onUpdate }: EditPrestataireDialogProps) => {
  const [prestataire, setPrestataire] = useState(incident.prestataire || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPrestataire(incident.prestataire || '');
    }
  }, [incident, isOpen]);

  const handleSubmit = async () => {
    if (!prestataire.trim()) {
      showError("Veuillez saisir le nom du prestataire.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onUpdate(incident.id, prestataire.trim());
      showSuccess("Prestataire mis à jour avec succès.");
      onClose();
    } catch (error: any) {
      showError("Erreur lors de la mise à jour du prestataire: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Building2" className="text-purple-600" />
            Modifier le Prestataire
          </DialogTitle>
          <DialogDescription>
            Spécifiez le nom du prestataire qui va intervenir pour ce ticket.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="prestataire" className="text-right">
              Prestataire <span className="text-red-500">*</span>
            </Label>
            <Input
              id="prestataire"
              value={prestataire}
              onChange={(e) => setPrestataire(e.target.value)}
              placeholder="Nom du prestataire"
              className="col-span-3"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Annuler
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={isSubmitting || !prestataire.trim()}>
            <Icon name={isSubmitting ? "Loader2" : "Save"} className="mr-2 h-4 w-4" />
            {isSubmitting ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
