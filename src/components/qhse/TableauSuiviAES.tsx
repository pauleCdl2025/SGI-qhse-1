import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { AES } from "@/types";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { AESDetailsDialog } from "./AESDetailsDialog";

interface TableauSuiviAESProps {
  currentUserId?: string;
}

export const TableauSuiviAES = ({ currentUserId }: TableauSuiviAESProps) => {
  const [aesList, setAesList] = useState<AES[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedAES, setSelectedAES] = useState<AES | null>(null);

  useEffect(() => {
    fetchAES();
  }, []);

  const fetchAES = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('aes')
        .select('*')
        .order('date_aes', { ascending: false });

      if (error) {
        throw error;
      }

      const formattedAES: AES[] = data.map((item: any) => ({
        ...item,
        date_aes: new Date(item.date_aes),
        date_debut_traitement: item.date_debut_traitement ? new Date(item.date_debut_traitement) : undefined,
        date_cloture: item.date_cloture ? new Date(item.date_cloture) : undefined,
        date_declaration: item.date_declaration ? new Date(item.date_declaration) : undefined,
        date_prise_resultat: item.date_prise_resultat ? new Date(item.date_prise_resultat) : undefined,
        suivi_m1_date: item.suivi_m1_date ? new Date(item.suivi_m1_date) : undefined,
        suivi_m3_date: item.suivi_m3_date ? new Date(item.suivi_m3_date) : undefined,
        suivi_m6_date: item.suivi_m6_date ? new Date(item.suivi_m6_date) : undefined,
        suivi_m9_date: item.suivi_m9_date ? new Date(item.suivi_m9_date) : undefined,
        created_at: new Date(item.created_at),
        updated_at: new Date(item.updated_at),
      }));
      // Trier par date AES décroissante
      formattedAES.sort((a, b) => b.date_aes.getTime() - a.date_aes.getTime());
      setAesList(formattedAES);
    } catch (error: any) {
      console.error("Error fetching AES:", error);
      showError("Erreur lors du chargement des AES.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleView = (aes: AES) => {
    setSelectedAES(aes);
    setShowDetailsDialog(true);
  };

  const handleDetailsClose = () => {
    setShowDetailsDialog(false);
    setSelectedAES(null);
  };

  const formatBoolean = (value: boolean | null | undefined): string => {
    if (value === null || value === undefined) return 'NA';
    return value ? 'Oui' : 'Non';
  };

  const formatResultat = (value: boolean | null | undefined): string => {
    if (value === null || value === undefined) return 'NA';
    return value ? 'Positif' : 'Négatif';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="FileSpreadsheet" className="text-blue-600" />
            Tableau de Suivi des Accidents d'Exposition au Sang (AES)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Icon name="Loader2" className="mx-auto h-8 w-8 animate-spin text-gray-400" />
              <p className="mt-2 text-gray-500">Chargement...</p>
            </div>
          ) : aesList.length === 0 ? (
            <div className="text-center py-8">
              <Icon name="FileText" className="mx-auto h-12 w-12 text-gray-300 mb-2" />
              <p className="text-gray-500">Aucun AES enregistré.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="sticky left-0 bg-gray-50 z-10 min-w-[60px]">N° AES</TableHead>
                    <TableHead className="min-w-[100px]">Date de l'AES</TableHead>
                    <TableHead className="min-w-[80px]">Heure</TableHead>
                    <TableHead className="min-w-[120px]">Service</TableHead>
                    <TableHead className="min-w-[150px]">Nom de l'agent</TableHead>
                    <TableHead className="min-w-[120px]">Fonction de l'agent</TableHead>
                    <TableHead className="min-w-[120px]">Type d'exposition</TableHead>
                    <TableHead className="min-w-[200px]">Circonstances de l'AES</TableHead>
                    <TableHead className="min-w-[120px]">Matériel en cause</TableHead>
                    <TableHead className="min-w-[100px]">Port des EPI</TableHead>
                    <TableHead className="min-w-[120px]">Déclaration immédiate</TableHead>
                    <TableHead className="min-w-[120px]">Date de déclaration</TableHead>
                    <TableHead className="min-w-[180px]">Prise en charge immédiate réalisée</TableHead>
                    <TableHead className="min-w-[120px]">Inscription sur SENTIMED</TableHead>
                    <TableHead className="min-w-[120px]">Bon d'examen prescrit ?</TableHead>
                    <TableHead className="min-w-[100px]">Patient source connu?</TableHead>
                    <TableHead className="min-w-[120px]">Matricule SENTIMED</TableHead>
                    <TableHead className="min-w-[120px]">Prélèvement effectué</TableHead>
                    <TableHead className="min-w-[120px]">Date de prise de résultat</TableHead>
                    <TableHead className="min-w-[120px]">Date du début du traitement</TableHead>
                    <TableHead className="min-w-[150px]">Accompagnement psychologique</TableHead>
                    <TableHead className="min-w-[120px]">Résultat VIH patient</TableHead>
                    <TableHead className="min-w-[120px]">Résultat VHB patient</TableHead>
                    <TableHead className="min-w-[120px]">Résultat VHC Patient</TableHead>
                    <TableHead className="min-w-[100px]">Résultat VIH agent</TableHead>
                    <TableHead className="min-w-[100px]">Résultat VHB agent</TableHead>
                    <TableHead className="min-w-[100px]">Résultat VHC agent</TableHead>
                    <TableHead className="min-w-[120px]">Résultat M+1 VIH</TableHead>
                    <TableHead className="min-w-[120px]">Résultat M+1 VHB</TableHead>
                    <TableHead className="min-w-[120px]">Résultat M+1 VHC</TableHead>
                    <TableHead className="min-w-[120px]">Résultat M+3 VHB</TableHead>
                    <TableHead className="min-w-[120px]">Résultat M+3 VHC</TableHead>
                    <TableHead className="min-w-[120px]">Résultat M+6 VHB</TableHead>
                    <TableHead className="min-w-[120px]">Résultat M+6 VHC</TableHead>
                    <TableHead className="min-w-[120px]">Date de clôture AES</TableHead>
                    <TableHead className="min-w-[200px]">Observations / Commentaires</TableHead>
                    <TableHead className="min-w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {aesList.map((aes, index) => (
                    <TableRow key={aes.id}>
                      <TableCell className="sticky left-0 bg-white z-10 font-semibold">
                        {aes.numero_aes || index + 1}
                      </TableCell>
                      <TableCell>
                        {format(aes.date_aes, 'dd/MM/yyyy', { locale: fr })}
                      </TableCell>
                      <TableCell>{aes.heure_aes}</TableCell>
                      <TableCell>{aes.agent_service || 'NA'}</TableCell>
                      <TableCell className="font-medium">
                        {aes.agent_prenom} {aes.agent_nom}
                      </TableCell>
                      <TableCell>{aes.agent_fonction || 'NA'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{aes.type_exposition}</Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={aes.description_circonstances}>
                        {aes.description_circonstances || 'NA'}
                      </TableCell>
                      <TableCell>{aes.type_dispositif || 'NA'}</TableCell>
                      <TableCell>{formatBoolean(aes.port_epi)}</TableCell>
                      <TableCell>{formatBoolean(aes.declaration_immediate)}</TableCell>
                      <TableCell>
                        {aes.date_declaration ? format(aes.date_declaration, 'dd/MM/yyyy', { locale: fr }) : 'NA'}
                      </TableCell>
                      <TableCell>{formatBoolean(aes.prise_charge_immediate)}</TableCell>
                      <TableCell>{formatBoolean(aes.inscription_sentimed)}</TableCell>
                      <TableCell>{formatBoolean(aes.bon_examen_prescrit)}</TableCell>
                      <TableCell>{formatBoolean(aes.patient_source_identifiee)}</TableCell>
                      <TableCell>{aes.matricule_sentimed || 'NA'}</TableCell>
                      <TableCell>{formatBoolean(aes.consentement_prelevement)}</TableCell>
                      <TableCell>
                        {aes.date_prise_resultat ? format(aes.date_prise_resultat, 'dd/MM/yyyy', { locale: fr }) : 'NA'}
                      </TableCell>
                      <TableCell>
                        {aes.date_debut_traitement ? format(aes.date_debut_traitement, 'dd/MM/yyyy', { locale: fr }) : 'NA'}
                      </TableCell>
                      <TableCell>{formatBoolean(aes.orientation_psychologue)}</TableCell>
                      <TableCell>{formatResultat(aes.resultat_patient_vih)}</TableCell>
                      <TableCell>{formatResultat(aes.resultat_patient_vhb)}</TableCell>
                      <TableCell>{formatResultat(aes.resultat_patient_vhc)}</TableCell>
                      <TableCell>{formatResultat(aes.resultat_agent_vih)}</TableCell>
                      <TableCell>{formatResultat(aes.resultat_agent_vhb)}</TableCell>
                      <TableCell>{formatResultat(aes.resultat_agent_vhc)}</TableCell>
                      <TableCell>{formatResultat(aes.suivi_m1_vih)}</TableCell>
                      <TableCell>{formatResultat(aes.suivi_m1_vhb)}</TableCell>
                      <TableCell>{formatResultat(aes.suivi_m1_vhc)}</TableCell>
                      <TableCell>{formatResultat(aes.suivi_m3_vhb)}</TableCell>
                      <TableCell>{formatResultat(aes.suivi_m3_vhc)}</TableCell>
                      <TableCell>{formatResultat(aes.suivi_m6_vhb)}</TableCell>
                      <TableCell>{formatResultat(aes.suivi_m6_vhc)}</TableCell>
                      <TableCell>
                        {aes.date_cloture ? format(aes.date_cloture, 'dd/MM/yyyy', { locale: fr }) : 'NA'}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={aes.observations || aes.conduite_tenir}>
                        {aes.observations || aes.conduite_tenir || 'NA'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleView(aes)}
                        >
                          <Icon name="Eye" className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {showDetailsDialog && selectedAES && (
        <AESDetailsDialog
          isOpen={showDetailsDialog}
          onClose={handleDetailsClose}
          aes={selectedAES}
          onEdit={() => {
            setShowDetailsDialog(false);
          }}
        />
      )}
    </div>
  );
};
