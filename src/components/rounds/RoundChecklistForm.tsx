import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/Icon";
import { DailyRound, RoundChecklistTemplate, RoundChecklistResponse, User, EquipmentStatus } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { locations } from "@/lib/locations";

interface RoundChecklistFormProps {
  round: DailyRound;
  user: User;
  onComplete: () => void;
}

export const RoundChecklistForm = ({ round, user, onComplete }: RoundChecklistFormProps) => {
  const [templates, setTemplates] = useState<RoundChecklistTemplate[]>([]);
  const [responses, setResponses] = useState<Record<string, RoundChecklistResponse>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState(round.notes || '');
  const [technicianName, setTechnicianName] = useState(
    round.technician_name || (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : '') || ''
  );

  useEffect(() => {
    fetchTemplates();
    fetchResponses();
  }, [round.id]);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('round_checklist_templates')
        .select('*')
        .eq('round_type', round.round_type);
      if (error) throw error;
      setTemplates((data || []).sort((a: RoundChecklistTemplate, b: RoundChecklistTemplate) => (a.item_order || 0) - (b.item_order || 0)));
    } catch (error: any) {
      showError("Erreur lors du chargement des templates: " + (error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('round_checklist_responses')
        .select('*')
        .eq('round_id', round.id);
      if (error) throw error;
      const responsesMap: Record<string, RoundChecklistResponse> = {};
      (data || []).forEach((response: RoundChecklistResponse) => {
        responsesMap[response.template_id] = response;
      });
      setResponses(responsesMap);
    } catch (error: any) {
      console.error("Erreur lors du chargement des réponses:", error);
    }
  };

  const handleResponseChange = async (templateId: string, value: any) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    const existingResponse = responses[templateId];
    const responseData: Partial<RoundChecklistResponse> = {
      round_id: round.id,
      template_id: templateId,
    };

    if (template.item_type === 'checkbox') {
      responseData.is_checked = value;
    } else {
      responseData.response_value = value?.toString() || '';
    }

    try {
      let response: RoundChecklistResponse;
      if (existingResponse) {
        const { data: updated, error } = await supabase
          .from('round_checklist_responses')
          .update(responseData)
          .eq('id', existingResponse.id)
          .select()
          .single();
        if (error) throw error;
        response = updated;
      } else {
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const { data: inserted, error } = await supabase
          .from('round_checklist_responses')
          .insert([{ ...responseData, id }])
          .select()
          .single();
        if (error) throw error;
        response = inserted;
      }
      setResponses(prev => ({
        ...prev,
        [templateId]: response,
      }));
    } catch (error: any) {
      showError("Erreur lors de la sauvegarde: " + (error?.message || error));
    }
  };

  const handleObservationChange = async (templateId: string, observation: string) => {
    const existingResponse = responses[templateId];
    if (!existingResponse) return;

    try {
      const { data: updated, error } = await supabase
        .from('round_checklist_responses')
        .update({ observation })
        .eq('id', existingResponse.id)
        .select()
        .single();
      if (error) throw error;
      setResponses(prev => ({
        ...prev,
        [templateId]: updated,
      }));
    } catch (error: any) {
      showError("Erreur lors de la sauvegarde: " + (error?.message || error));
    }
  };

  const handleEquipmentStatusChange = async (templateId: string, status: EquipmentStatus) => {
    const existingResponse = responses[templateId];
    const responseData: Partial<RoundChecklistResponse> = {
      round_id: round.id,
      template_id: templateId,
      equipment_status: status,
    };

    try {
      let response: RoundChecklistResponse;
      if (existingResponse) {
        const { data: updated, error } = await supabase
          .from('round_checklist_responses')
          .update({ equipment_status: status })
          .eq('id', existingResponse.id)
          .select()
          .single();
        if (error) throw error;
        response = updated;
      } else {
        const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const payload = { ...responseData, id, is_checked: true };
        const { data: inserted, error } = await supabase
          .from('round_checklist_responses')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        response = inserted;
      }
      setResponses(prev => ({
        ...prev,
        [templateId]: response,
      }));
    } catch (error: any) {
      showError("Erreur lors de la sauvegarde: " + (error?.message || error));
    }
  };

  const handleEquipmentInfoChange = async (templateId: string, field: 'equipment_name' | 'service_name', value: string) => {
    const existingResponse = responses[templateId];
    if (!existingResponse) return;

    try {
      const updateData: Partial<RoundChecklistResponse> = {};
      if (field === 'equipment_name') {
        updateData.equipment_name = value;
      } else if (field === 'service_name') {
        updateData.service_name = value;
      }

      const { data: updated, error } = await supabase
        .from('round_checklist_responses')
        .update(updateData)
        .eq('id', existingResponse.id)
        .select()
        .single();
      if (error) throw error;
      setResponses(prev => ({
        ...prev,
        [templateId]: updated,
      }));
    } catch (error: any) {
      showError("Erreur lors de la sauvegarde: " + error.message);
    }
  };

  const handleCompleteRound = async () => {
    if (!technicianName || technicianName.trim() === '') {
      showError("Veuillez saisir votre nom avant de terminer la ronde");
      return;
    }

    try {
      setSaving(true);
      
      await supabase
        .from('daily_rounds')
        .update({
          status: 'terminée',
          end_time: format(new Date(), "yyyy-MM-dd HH:mm:ss"),
          notes: notes,
          technician_name: technicianName.trim(),
        })
        .eq('id', round.id);

      const { data: latestResponsesData } = await supabase
        .from('round_checklist_responses')
        .select('*')
        .eq('round_id', round.id);
      const latestResponsesMap: Record<string, RoundChecklistResponse> = {};
      (latestResponsesData || []).forEach((response: RoundChecklistResponse) => {
        latestResponsesMap[response.template_id] = response;
      });
      setResponses(latestResponsesMap);
      
      // Attendre un peu pour que l'état soit mis à jour
      await new Promise(resolve => setTimeout(resolve, 300));

      // Pour les rondes biomédicales : créer des tâches uniquement pour les équipements défectueux
      if (round.round_type === 'biomedical') {
        const itemsToCreateTasks: Array<{ template: RoundChecklistTemplate; response: RoundChecklistResponse }> = [];
        
        console.log('🔍 Vérification des équipements défectueux pour création de tâches...');
        templates.forEach((template) => {
          // Utiliser les réponses rechargées
          const response = latestResponsesMap[template.id] || responses[template.id];
          console.log(`  - Item: ${template.title}`, {
            is_checked: response?.is_checked,
            equipment_status: response?.equipment_status,
            equipment_name: response?.equipment_name,
            service_name: response?.service_name
          });
          
          // Créer une tâche uniquement si l'équipement est marqué comme défectueux
          if (response?.is_checked && response?.equipment_status === 'défectueux') {
            console.log(`  ✅ Équipement défectueux trouvé: ${template.title}`);
            itemsToCreateTasks.push({ template, response });
          }
        });
        
        console.log(`📋 Total d'équipements défectueux à traiter: ${itemsToCreateTasks.length}`);

        // Créer des tâches automatiquement pour les équipements défectueux
        if (itemsToCreateTasks.length > 0) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 7); // Échéance dans 7 jours
          
          let tasksCreated = 0;
          let tasksSkipped = 0;
          for (const { template, response } of itemsToCreateTasks) {
            try {
              // Vérifier que les informations requises sont présentes
              if (!response.equipment_name || !response.service_name) {
                console.warn(`⚠️ Informations manquantes pour ${template.title}:`, {
                  equipment_name: response.equipment_name,
                  service_name: response.service_name
                });
                tasksSkipped++;
                continue;
              }
              
              console.log(`🛠️ Création de la tâche pour: ${response.equipment_name} (${response.service_name})`);

              const taskTitle = `[Réparation] ${response.equipment_name}`;
              let taskDescription = `Équipement défectueux détecté lors de la ronde biomédicale.\n\n`;
              
              taskDescription += `📋 Item de la ronde: ${template.title}\n`;
              if (template.description) {
                taskDescription += `Description: ${template.description}\n`;
              }
              taskDescription += `\n🔧 Équipement: ${response.equipment_name}\n`;
              taskDescription += `📍 Service/Localisation: ${response.service_name}\n`;
              
              if (response.observation) {
                taskDescription += `\n📝 Observation: ${response.observation}\n`;
              }
              
              taskDescription += `\n📅 Ronde effectuée le: ${format(new Date(round.round_date), "dd/MM/yyyy", { locale: fr })}`;
              if (round.start_time) {
                taskDescription += ` à ${format(new Date(round.start_time), "HH:mm", { locale: fr })}`;
              }
              taskDescription += `\n👤 Technicien: ${technicianName.trim()}`;
              
              const taskData = {
                title: taskTitle,
                description: taskDescription,
                assigned_to: user.id,
                assignee_name: technicianName.trim(),
                due_date: format(dueDate, "yyyy-MM-dd"),
              };
              
              const taskId = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
              const { error: taskErr } = await supabase.from('planned_tasks').insert([{ ...taskData, id: taskId }]);
              if (taskErr) throw taskErr;
              
              tasksCreated++;
            } catch (error: any) {
              console.error(`❌ Erreur lors de la création de la tâche pour ${template.title}:`, error);
              console.error('Détails de l\'erreur:', {
                message: error.message,
                status: error.status,
                response: error.response
              });
              // Continuer avec les autres tâches même si une échoue
            }
          }
          
          console.log(`📊 Résumé: ${tasksCreated} tâche(s) créée(s), ${tasksSkipped} ignorée(s) (infos manquantes)`);
          
          if (tasksCreated > 0) {
            showSuccess(`Ronde terminée avec succès. ${tasksCreated} tâche(s) de réparation créée(s) automatiquement dans "Mes Tâches".`);
          } else if (tasksSkipped > 0) {
            showError(`Ronde terminée, mais ${tasksSkipped} tâche(s) n'a(ont) pas pu être créée(s) car les informations équipement/service sont manquantes.`);
          } else {
            showSuccess("Ronde terminée avec succès");
          }
        } else {
          showSuccess("Ronde terminée avec succès");
        }
      } else {
        // Pour les autres types de rondes, pas de création automatique de tâches
        showSuccess("Ronde terminée avec succès");
      }
      
      onComplete();
    } catch (error: any) {
      showError("Erreur lors de la finalisation: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const requiredItems = templates.filter(t => t.is_required);
  const completedRequiredItems = requiredItems.filter(t => {
    const response = responses[t.id];
    if (!response) return false;
    if (t.item_type === 'checkbox') {
      // Pour les rondes biomédicales, vérifier aussi que l'état de l'équipement est défini
      if (round.round_type === 'biomedical' && response.is_checked) {
        return response.equipment_status !== undefined && response.equipment_status !== null && response.equipment_status !== '';
      }
      return response.is_checked;
    }
    return response.response_value && response.response_value.trim() !== '';
  });

  // Vérifier que tous les items cochés ont un état défini pour les rondes biomédicales
  const allCheckedItemsHaveStatus = round.round_type === 'biomedical' 
    ? templates.filter(t => {
        const response = responses[t.id];
        return t.item_type === 'checkbox' && response?.is_checked;
      }).every(t => {
        const response = responses[t.id];
        if (!response?.equipment_status || response.equipment_status === '') {
          return false;
        }
        // Si défectueux, vérifier que equipment_name et service_name sont remplis
        if (response.equipment_status === 'défectueux') {
          return response.equipment_name && response.equipment_name.trim() !== '' &&
                 response.service_name && response.service_name.trim() !== '';
        }
        return true;
      })
    : true;

  const allRequiredCompleted = requiredItems.length > 0 && completedRequiredItems.length === requiredItems.length && allCheckedItemsHaveStatus;
  const completionPercentage = requiredItems.length > 0 
    ? Math.round((completedRequiredItems.length / requiredItems.length) * 100)
    : 100;

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Champ pour le nom du technicien */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Icon name="User" className="text-cyan-600" />
            Informations du technicien
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="technician-name" className="text-sm font-semibold">
              Nom du technicien <span className="text-red-500">*</span>
            </Label>
            <Input
              id="technician-name"
              value={technicianName}
              onChange={(e) => {
                setTechnicianName(e.target.value);
                // Sauvegarder automatiquement le nom
                supabase.from('daily_rounds').update({ technician_name: e.target.value }).eq('id', round.id).then(({ error }) => {
                  if (error) console.error("Erreur lors de la sauvegarde du nom:", error);
                });
              }}
              placeholder="Entrez votre nom complet"
              className="max-w-md"
              required
            />
            <p className="text-xs text-gray-500">
              Veuillez saisir votre nom complet pour cette ronde
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Indicateur de progression */}
      <Card className="bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon name="ClipboardCheck" className="text-cyan-600" />
              <span className="font-semibold text-gray-700">Progression de la checklist</span>
            </div>
            <span className="text-sm font-bold text-cyan-600">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-300 ${
                completionPercentage === 100 
                  ? 'bg-green-500' 
                  : completionPercentage >= 50 
                    ? 'bg-yellow-500' 
                    : 'bg-red-500'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            {completedRequiredItems.length} / {requiredItems.length} items requis complétés
          </p>
        </CardContent>
      </Card>
      <div className="grid gap-4">
        {templates.map((template) => {
          const response = responses[template.id];
          return (
            <Card key={template.id} className={template.is_required ? "border-l-4 border-l-cyan-600" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base flex items-center gap-2">
                      {template.title}
                      {template.is_required && (
                        <Badge variant="destructive" className="text-xs">Requis</Badge>
                      )}
                    </CardTitle>
                    {template.description && (
                      <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {template.item_type === 'checkbox' && (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`checkbox-${template.id}`}
                        checked={response?.is_checked || false}
                        onCheckedChange={(checked) => handleResponseChange(template.id, checked)}
                      />
                      <Label htmlFor={`checkbox-${template.id}`} className="cursor-pointer">
                        {response?.is_checked ? "Effectué" : "À faire"}
                      </Label>
                    </div>
                    
                    {/* Sélection de l'état de l'équipement pour les rondes biomédicales */}
                    {round.round_type === 'biomedical' && response?.is_checked && (
                      <div className="space-y-3 pl-6 border-l-2 border-cyan-200">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">État de l'équipement *</Label>
                          <select
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={response?.equipment_status || ''}
                            onChange={(e) => handleEquipmentStatusChange(template.id, e.target.value as EquipmentStatus)}
                            required
                          >
                            <option value="">Sélectionner l'état...</option>
                            <option value="bon_état">✅ En bon état</option>
                            <option value="défectueux">⚠️ Défectueux (nécessite réparation)</option>
                          </select>
                        </div>
                        
                        {/* Champs équipement et service si défectueux */}
                        {response?.equipment_status === 'défectueux' && (
                          <div className="space-y-3 pt-2 border-t border-gray-200">
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Nom de l'équipement *</Label>
                              <Input
                                placeholder="Ex: Moniteur cardiaque, Défibrillateur, Ventilateur..."
                                value={response?.equipment_name || ''}
                                onChange={(e) => handleEquipmentInfoChange(template.id, 'equipment_name', e.target.value)}
                                required
                                className="w-full"
                              />
                              <p className="text-xs text-gray-500">
                                Précisez le nom ou l'identification de l'équipement défectueux
                              </p>
                            </div>
                            
                            <div className="space-y-2">
                              <Label className="text-sm font-medium">Service / Localisation *</Label>
                              <select
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={response?.service_name || ''}
                                onChange={(e) => handleEquipmentInfoChange(template.id, 'service_name', e.target.value)}
                                required
                              >
                                <option value="">Sélectionner le service...</option>
                                {locations.map((group) => (
                                  <optgroup key={group.label} label={group.label}>
                                    {group.options.map((location) => (
                                      <option key={location} value={location}>
                                        {location}
                                      </option>
                                    ))}
                                  </optgroup>
                                ))}
                              </select>
                              <p className="text-xs text-gray-500">
                                Indiquez où se trouve l'équipement défectueux
                              </p>
                            </div>
                            
                            <p className="text-xs text-amber-600 font-medium">
                              ⚠️ Une tâche de réparation sera créée automatiquement dans "Mes Tâches"
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {template.item_type === 'text' && (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Saisissez vos observations..."
                      value={response?.response_value || ''}
                      onChange={(e) => handleResponseChange(template.id, e.target.value)}
                      rows={3}
                    />
                  </div>
                )}

                {template.item_type === 'number' && (
                  <div className="space-y-2">
                    <Input
                      type="number"
                      placeholder="Saisissez une valeur..."
                      value={response?.response_value || ''}
                      onChange={(e) => handleResponseChange(template.id, e.target.value)}
                    />
                  </div>
                )}

                {template.item_type === 'select' && template.options && (
                  <div className="space-y-2">
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={response?.response_value || ''}
                      onChange={(e) => handleResponseChange(template.id, e.target.value)}
                    >
                      <option value="">Sélectionner...</option>
                      {template.options.map((option, idx) => (
                        <option key={idx} value={option}>{option}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Observation (optionnel)</Label>
                  <Textarea
                    placeholder="Ajoutez une observation..."
                    value={response?.observation || ''}
                    onChange={(e) => handleObservationChange(template.id, e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notes générales</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Ajoutez des notes générales sur cette ronde..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-between items-center pt-4 border-t">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            {completedRequiredItems.length} / {requiredItems.length} items requis complétés
          </div>
          {round.start_time && (
            <div className="text-xs text-gray-500 flex items-center gap-1">
              <Icon name="Clock" className="h-3 w-3" />
              Débutée à {format(new Date(round.start_time), "HH:mm", { locale: fr })}
            </div>
          )}
        </div>
        <Button
          onClick={handleCompleteRound}
          disabled={saving || !allRequiredCompleted || round.status === 'terminée'}
          className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600"
        >
          <Icon name={saving ? "Clock" : "Check"} className="mr-2 h-4 w-4" />
          {saving ? "Enregistrement..." : round.status === 'terminée' ? "Ronde terminée" : "Terminer la ronde"}
        </Button>
        {round.round_type === 'biomedical' && !allCheckedItemsHaveStatus && (
          <p className="text-xs text-red-500 mt-1">
            ⚠️ Veuillez indiquer l'état de tous les équipements effectués. Si un équipement est défectueux, précisez son nom et son service/localisation.
          </p>
        )}
      </div>
    </div>
  );
};
