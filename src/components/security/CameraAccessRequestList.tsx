import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { CameraAccessRequest, CameraAccessRequestStatus } from "@/types";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface CameraAccessRequestListProps {
  requests: CameraAccessRequest[];
  isLoading?: boolean;
  currentUserId?: string;
}

const statusLabels: Record<CameraAccessRequestStatus, string> = {
  en_attente: 'En attente',
  approuve: 'Approuvé',
  refuse: 'Refusé',
  annule: 'Annulé',
};

const statusClasses: Record<CameraAccessRequestStatus, string> = {
  en_attente: 'bg-yellow-500',
  approuve: 'bg-green-500',
  refuse: 'bg-red-500',
  annule: 'bg-gray-500',
};

export const CameraAccessRequestList = ({ requests, isLoading = false, currentUserId }: CameraAccessRequestListProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icon name="Video" className="text-blue-600 mr-2" />
            Mes Demandes d'Accès aux Caméras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center py-8">
            <Icon name="Loader2" className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filtrer les demandes de l'utilisateur actuel si currentUserId est fourni
  const filteredRequests = currentUserId
    ? requests.filter(req => req.requester_id === currentUserId)
    : requests;

  if (filteredRequests.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icon name="Video" className="text-blue-600 mr-2" />
            Mes Demandes d'Accès aux Caméras
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Icon name="FileX" className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>Aucune demande d'accès aux caméras pour le moment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Icon name="Video" className="text-blue-600 mr-2" />
          Mes Demandes d'Accès aux Caméras
          <Badge variant="secondary" className="ml-2">{filteredRequests.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date de demande</TableHead>
                <TableHead>Motif</TableHead>
                <TableHead>Période</TableHead>
                <TableHead>Zones/Caméras</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => (
                <TableRow key={request.id}>
                  <TableCell>
                    {format(new Date(request.request_date), "dd/MM/yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={request.access_reason}>
                    {request.access_reason}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{format(new Date(request.access_start_date), "dd/MM/yyyy", { locale: fr })}</div>
                      {request.access_start_time && (
                        <div className="text-gray-500 text-xs">{request.access_start_time}</div>
                      )}
                      <div className="text-gray-400">→</div>
                      <div>{format(new Date(request.access_end_date), "dd/MM/yyyy", { locale: fr })}</div>
                      {request.access_end_time && (
                        <div className="text-gray-500 text-xs">{request.access_end_time}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs truncate" title={request.camera_zones}>
                    {request.camera_zones || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusClasses[request.status]}>
                      {statusLabels[request.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Icon name="Eye" className="h-4 w-4 mr-1" />
                          Détails
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Détails de la demande d'accès</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 mt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-semibold text-gray-600">Demandeur</Label>
                              <p className="mt-1">{request.requester_name || 'Non spécifié'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-semibold text-gray-600">Service</Label>
                              <p className="mt-1">{request.requester_service || 'Non spécifié'}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-semibold text-gray-600">Date de demande</Label>
                              <p className="mt-1">{format(new Date(request.request_date), "dd/MM/yyyy à HH:mm", { locale: fr })}</p>
                            </div>
                            <div>
                              <Label className="text-sm font-semibold text-gray-600">Statut</Label>
                              <p className="mt-1">
                                <Badge className={statusClasses[request.status]}>
                                  {statusLabels[request.status]}
                                </Badge>
                              </p>
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm font-semibold text-gray-600">Motif de la demande</Label>
                            <p className="mt-1 p-3 bg-gray-50 rounded">{request.access_reason}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label className="text-sm font-semibold text-gray-600">Date de début</Label>
                              <p className="mt-1">
                                {format(new Date(request.access_start_date), "dd/MM/yyyy", { locale: fr })}
                                {request.access_start_time && ` à ${request.access_start_time}`}
                              </p>
                            </div>
                            <div>
                              <Label className="text-sm font-semibold text-gray-600">Date de fin</Label>
                              <p className="mt-1">
                                {format(new Date(request.access_end_date), "dd/MM/yyyy", { locale: fr })}
                                {request.access_end_time && ` à ${request.access_end_time}`}
                              </p>
                            </div>
                          </div>
                          {request.camera_zones && (
                            <div>
                              <Label className="text-sm font-semibold text-gray-600">Zones/Caméras concernées</Label>
                              <p className="mt-1 p-3 bg-gray-50 rounded">{request.camera_zones}</p>
                            </div>
                          )}
                          {request.hierarchical_authorization && (
                            <div>
                              <Label className="text-sm font-semibold text-gray-600">Autorisation hiérarchique</Label>
                              <p className="mt-1">{request.hierarchical_authorization}</p>
                              {request.hierarchical_authorization_date && (
                                <p className="text-sm text-gray-500 mt-1">
                                  Date: {format(new Date(request.hierarchical_authorization_date), "dd/MM/yyyy", { locale: fr })}
                                </p>
                              )}
                            </div>
                          )}
                          {request.notes && (
                            <div>
                              <Label className="text-sm font-semibold text-gray-600">Notes complémentaires</Label>
                              <p className="mt-1 p-3 bg-gray-50 rounded">{request.notes}</p>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
