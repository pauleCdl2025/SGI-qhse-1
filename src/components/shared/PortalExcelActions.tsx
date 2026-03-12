import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { exportToExcel, exportMultipleSheetsToExcel } from "@/utils/excelExport";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ExcelImportButton } from "./ExcelImportButton";
import { supabase } from "@/integrations/supabase/client";

interface PortalExcelActionsProps {
  portalType: string;
  data: {
    incidents?: any[];
    visitors?: any[];
    bookings?: any[];
    biomedicalEquipment?: any[];
    maintenanceTasks?: any[];
    plannedTasks?: any[];
    users?: any;
  };
  onExport?: (type: 'excel' | 'pdf') => void;
  onImport?: () => void; // Callback pour rafraîchir les données après import
}

export const PortalExcelActions = ({ portalType, data, onExport, onImport }: PortalExcelActionsProps) => {
  const handleExportExcel = () => {
    try {
      const sheets: Array<{ name: string; data: any[]; headers: { key: string; label: string }[] }> = [];
      
      // Exporter les incidents
      if (data.incidents && data.incidents.length > 0) {
        sheets.push({
          name: 'Incidents',
          data: data.incidents,
          headers: [
            { key: 'date_creation', label: 'Date' },
            { key: 'type', label: 'Type' },
            { key: 'description', label: 'Description' },
            { key: 'lieu', label: 'Lieu' },
            { key: 'priorite', label: 'Priorité' },
            { key: 'statut', label: 'Statut' },
            { key: 'service', label: 'Service' },
          ],
        });
      }
      
      // Exporter les visiteurs
      if (data.visitors && data.visitors.length > 0) {
        sheets.push({
          name: 'Visiteurs',
          data: data.visitors,
          headers: [
            { key: 'entry_time', label: 'Date Entrée' },
            { key: 'first_name', label: 'Prénom' },
            { key: 'last_name', label: 'Nom' },
            { key: 'visitee_name', label: 'Visité' },
            { key: 'reason', label: 'Motif' },
            { key: 'exit_time', label: 'Date Sortie' },
          ],
        });
      }
      
      // Exporter les réservations
      if (data.bookings && data.bookings.length > 0) {
        sheets.push({
          name: 'Réservations',
          data: data.bookings,
          headers: [
            { key: 'start_time', label: 'Date Début' },
            { key: 'end_time', label: 'Date Fin' },
            { key: 'title', label: 'Titre' },
            { key: 'status', label: 'Statut' },
          ],
        });
      }
      
      // Exporter les équipements biomédicaux
      if (data.biomedicalEquipment && data.biomedicalEquipment.length > 0) {
        sheets.push({
          name: 'Équipements Biomédicaux',
          data: data.biomedicalEquipment,
          headers: [
            { key: 'name', label: 'Nom' },
            { key: 'model', label: 'Modèle' },
            { key: 'serial_number', label: 'N° Série' },
            { key: 'location', label: 'Localisation' },
            { key: 'status', label: 'Statut' },
            { key: 'next_maintenance', label: 'Prochaine Maintenance' },
          ],
        });
      }
      
      // Exporter les tâches de maintenance
      if (data.maintenanceTasks && data.maintenanceTasks.length > 0) {
        sheets.push({
          name: 'Tâches de Maintenance',
          data: data.maintenanceTasks,
          headers: [
            { key: 'type', label: 'Type' },
            { key: 'scheduled_date', label: 'Date Planifiée' },
            { key: 'status', label: 'Statut' },
            { key: 'description', label: 'Description' },
          ],
        });
      }
      
      // Exporter les tâches planifiées
      if (data.plannedTasks && data.plannedTasks.length > 0) {
        sheets.push({
          name: 'Tâches Planifiées',
          data: data.plannedTasks,
          headers: [
            { key: 'title', label: 'Titre' },
            { key: 'due_date', label: 'Date Échéance' },
            { key: 'priority', label: 'Priorité' },
            { key: 'status', label: 'Statut' },
          ],
        });
      }
      
      if (sheets.length === 0) {
        showError('Aucune donnée à exporter');
        return;
      }
      
      if (sheets.length === 1) {
        exportToExcel(sheets[0].data, sheets[0].headers, `rapport-${portalType}`, sheets[0].name);
      } else {
        exportMultipleSheetsToExcel(sheets, `rapport-${portalType}`);
      }
      
      showSuccess('Export Excel réussi !');
      
      if (onExport) {
        onExport('excel');
      }
    } catch (error: any) {
      console.error('Erreur lors de l\'export Excel:', error);
      showError('Erreur lors de l\'export Excel: ' + (error.message || 'Erreur inconnue'));
    }
  };

  const handleImportSuccess = async (importedData: any[]) => {
    try {
      // Traiter les données importées selon le type de portail
      if (portalType.includes('incident') || portalType === 'superadmin' || portalType === 'user' || portalType === 'agent_securite') {
        // Import d'incidents - pas d'API directe, utiliser le formulaire de déclaration
        showError('Pour importer des incidents, veuillez utiliser le formulaire de déclaration ou contacter l\'administrateur.');
        return;
      }

      if (portalType.includes('visitor') || portalType === 'secretaire') {
        // Import de visiteurs
        for (const item of importedData) {
          const { error } = await supabase.from('visitors').insert([{
            full_name: `${item['Prénom'] || item.first_name || ''} ${item['Nom'] || item.last_name || ''}`.trim(),
            reason: item['Motif'] || item.reason || '',
            person_to_see: item['Visité'] || item.visitee_name || '',
            entry_time: item['Date Entrée'] || item.entry_time || new Date().toISOString(),
          }]);
          if (error) throw error;
        }
      }

      if (portalType.includes('booking') || portalType === 'medecin' || portalType === 'secretaire') {
        // Import de réservations
        for (const item of importedData) {
          const { error } = await supabase.from('bookings').insert([{
            room_id: item['ID Salle'] || item.room_id || '',
            doctor_id: item['ID Médecin'] || item.doctor_id || null,
            start_time: item['Date Début'] || item.start_time || new Date().toISOString(),
            end_time: item['Date Fin'] || item.end_time || new Date().toISOString(),
            title: item['Titre'] || item.title || '',
            status: 'prévu',
          }]);
          if (error) throw error;
        }
      }

      if (portalType === 'biomedical') {
        // Import d'équipements biomédicaux
        for (const item of importedData) {
          const { error } = await supabase.from('biomedical_equipment').insert([{
            name: item['Nom'] || item.name || '',
            model: item['Modèle'] || item.model || null,
            serial_number: item['N° Série'] || item.serial_number || null,
            location: item['Localisation'] || item.location || '',
            department: item['Département'] || item.department || null,
            notes: item['Notes'] || item.notes || null,
            status: 'en_service',
            created_at: new Date().toISOString(),
          }]);
          if (error) throw error;
        }
      }

      if (onImport) {
        onImport();
      }
      
      showSuccess(`Données importées avec succès (${importedData.length} entrées)`);
    } catch (error: any) {
      console.error('Erreur lors de l\'import:', error);
      showError('Erreur lors de l\'import: ' + (error.message || 'Erreur inconnue'));
    }
  };

  // Déterminer les champs requis selon le type de portail
  const getRequiredFields = () => {
    if (portalType.includes('visitor') || portalType === 'secretaire') {
      return ['Prénom', 'Nom', 'first_name', 'last_name'];
    }
    if (portalType.includes('booking') || portalType === 'medecin') {
      return ['Date Début', 'Date Fin', 'start_time', 'end_time'];
    }
    if (portalType === 'biomedical') {
      return ['Nom', 'name'];
    }
    return [];
  };

  // Déterminer le mapping des champs selon le type de portail
  const getFieldMapping = () => {
    if (portalType.includes('visitor') || portalType === 'secretaire') {
      return {
        'Prénom': 'first_name',
        'Nom': 'last_name',
        'Visité': 'visitee_name',
        'Motif': 'reason',
        'Date Entrée': 'entry_time',
      };
    }
    if (portalType.includes('booking') || portalType === 'medecin') {
      return {
        'Date Début': 'start_time',
        'Date Fin': 'end_time',
        'Titre': 'title',
        'ID Salle': 'room_id',
        'ID Médecin': 'doctor_id',
      };
    }
    if (portalType === 'biomedical') {
      return {
        'Nom': 'name',
        'Modèle': 'model',
        'N° Série': 'serial_number',
        'Localisation': 'location',
        'Département': 'department',
        'Notes': 'notes',
      };
    }
    return {};
  };

  const getImportButtonText = () => {
    if (portalType.includes('visitor') || portalType === 'secretaire') {
      return 'Importer Visiteurs';
    }
    if (portalType.includes('booking') || portalType === 'medecin') {
      return 'Importer Réservations';
    }
    if (portalType === 'biomedical') {
      return 'Importer Équipements';
    }
    return 'Importer Excel';
  };

  const getImportDialogTitle = () => {
    if (portalType.includes('visitor') || portalType === 'secretaire') {
      return 'Importer des visiteurs depuis Excel';
    }
    if (portalType.includes('booking') || portalType === 'medecin') {
      return 'Importer des réservations depuis Excel';
    }
    if (portalType === 'biomedical') {
      return 'Importer des équipements biomédicaux depuis Excel';
    }
    return 'Importer des données depuis Excel';
  };

  const getImportDialogDescription = () => {
    if (portalType.includes('visitor') || portalType === 'secretaire') {
      return 'Importez des visiteurs depuis un fichier Excel. Les colonnes doivent inclure: Prénom, Nom, Visité, Motif, Date Entrée.';
    }
    if (portalType.includes('booking') || portalType === 'medecin') {
      return 'Importez des réservations depuis un fichier Excel. Les colonnes doivent inclure: Date Début, Date Fin, Titre, ID Salle.';
    }
    if (portalType === 'biomedical') {
      return 'Importez des équipements biomédicaux depuis un fichier Excel. Les colonnes doivent inclure: Nom, Modèle, N° Série, Localisation.';
    }
    return 'Importez des données depuis un fichier Excel (.xlsx ou .xls)';
  };

  return (
    <div className="flex gap-2">
      <ExcelImportButton
        onImport={handleImportSuccess}
        requiredFields={getRequiredFields()}
        fieldMapping={getFieldMapping()}
        buttonText={getImportButtonText()}
        dialogTitle={getImportDialogTitle()}
        dialogDescription={getImportDialogDescription()}
      />
      <Button
        onClick={handleExportExcel}
        variant="outline"
        className="bg-white/20 hover:bg-white/30 text-white border border-white/30 backdrop-blur-sm"
        size="sm"
      >
        <Icon name="FileText" className="mr-2 h-4 w-4" />
        Exporter Excel
      </Button>
    </div>
  );
};

