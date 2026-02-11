import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { AES } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface AESDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  aes: AES;
  onEdit: () => void;
}

export const AESDetailsDialog = ({ isOpen, onClose, aes, onEdit }: AESDetailsDialogProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Droplet" className="text-red-600" />
            Détails de l'Accident d'Exposition au Sang
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* A. Identification de l'agent exposé */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">A. Identification de l'agent exposé</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Nom :</span>
                <p className="font-medium">{aes.agent_nom}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Prénom :</span>
                <p className="font-medium">{aes.agent_prenom}</p>
              </div>
              {aes.agent_matricule && (
                <div>
                  <span className="text-sm text-gray-500">Matricule :</span>
                  <p className="font-medium">{aes.agent_matricule}</p>
                </div>
              )}
              {aes.agent_fonction && (
                <div>
                  <span className="text-sm text-gray-500">Fonction :</span>
                  <p className="font-medium">{aes.agent_fonction}</p>
                </div>
              )}
              {aes.agent_service && (
                <div>
                  <span className="text-sm text-gray-500">Service / Unité :</span>
                  <p className="font-medium">{aes.agent_service}</p>
                </div>
              )}
              {aes.agent_telephone && (
                <div>
                  <span className="text-sm text-gray-500">Téléphone :</span>
                  <p className="font-medium">{aes.agent_telephone}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-gray-500">Statut :</span>
                <Badge variant="outline">{aes.agent_statut}</Badge>
              </div>
            </div>
          </div>

          {/* B. Informations sur l'accident */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">B. Informations sur l'accident</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm text-gray-500">Date :</span>
                <p className="font-medium">{format(aes.date_aes, 'dd/MM/yyyy', { locale: fr })}</p>
              </div>
              <div>
                <span className="text-sm text-gray-500">Heure :</span>
                <p className="font-medium">{aes.heure_aes}</p>
              </div>
              {aes.lieu_precis && (
                <div className="col-span-2">
                  <span className="text-sm text-gray-500">Lieu précis :</span>
                  <p className="font-medium">{aes.lieu_precis}</p>
                </div>
              )}
              <div>
                <span className="text-sm text-gray-500">Type d'exposition :</span>
                <Badge variant="outline">{aes.type_exposition}</Badge>
              </div>
              {aes.description_circonstances && (
                <div className="col-span-2">
                  <span className="text-sm text-gray-500">Description :</span>
                  <p className="font-medium mt-1">{aes.description_circonstances}</p>
                </div>
              )}
            </div>
          </div>

          {/* Statut */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3">Statut du dossier</h3>
            <div className="flex items-center gap-4">
              <Badge className={aes.dossier_cloture ? "bg-green-500" : "bg-yellow-500"}>
                {aes.dossier_cloture ? "Clôturé" : "En cours"}
              </Badge>
              {aes.date_cloture && (
                <span className="text-sm text-gray-500">
                  Date de clôture : {format(aes.date_cloture, 'dd/MM/yyyy', { locale: fr })}
                </span>
              )}
              {aes.nom_signature_qhse && (
                <span className="text-sm text-gray-500">
                  Signé par : {aes.nom_signature_qhse}
                </span>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
          <Button onClick={onEdit}>
            <Icon name="Edit" className="mr-2 h-4 w-4" />
            Modifier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
