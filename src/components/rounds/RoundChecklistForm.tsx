import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Icon } from "@/components/Icon";
import { DailyRound, RoundChecklistTemplate, RoundChecklistResponse, User } from "@/types";
import { apiClient } from "@/integrations/api/client";
import { showSuccess, showError } from "@/utils/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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

  useEffect(() => {
    fetchTemplates();
    fetchResponses();
  }, [round.id]);

  const fetchTemplates = async () => {
    try {
      const data = await apiClient.getRoundChecklistTemplates(round.round_type);
      setTemplates(data.sort((a: RoundChecklistTemplate, b: RoundChecklistTemplate) => a.item_order - b.item_order));
    } catch (error: any) {
      showError("Erreur lors du chargement des templates: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchResponses = async () => {
    try {
      const data = await apiClient.getRoundChecklistResponses(round.id);
      const responsesMap: Record<string, RoundChecklistResponse> = {};
      data.forEach((response: RoundChecklistResponse) => {
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
        response = await apiClient.updateRoundChecklistResponse(existingResponse.id, responseData);
      } else {
        response = await apiClient.createRoundChecklistResponse(responseData as RoundChecklistResponse);
      }
      setResponses(prev => ({
        ...prev,
        [templateId]: response,
      }));
    } catch (error: any) {
      showError("Erreur lors de la sauvegarde: " + error.message);
    }
  };

  const handleObservationChange = async (templateId: string, observation: string) => {
    const existingResponse = responses[templateId];
    if (!existingResponse) return;

    try {
      const updated = await apiClient.updateRoundChecklistResponse(existingResponse.id, { observation });
      setResponses(prev => ({
        ...prev,
        [templateId]: updated,
      }));
    } catch (error: any) {
      showError("Erreur lors de la sauvegarde: " + error.message);
    }
  };

  const handleCompleteRound = async () => {
    try {
      setSaving(true);
      await apiClient.updateDailyRound(round.id, {
        status: 'terminée',
        end_time: new Date().toISOString(),
        notes: notes,
      });
      showSuccess("Ronde terminée avec succès");
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
      return response.is_checked;
    }
    return response.response_value && response.response_value.trim() !== '';
  });

  const allRequiredCompleted = requiredItems.length > 0 && completedRequiredItems.length === requiredItems.length;

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
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
        <div className="text-sm text-gray-600">
          {completedRequiredItems.length} / {requiredItems.length} items requis complétés
        </div>
        <Button
          onClick={handleCompleteRound}
          disabled={saving || !allRequiredCompleted || round.status === 'terminée'}
          className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600"
        >
          <Icon name={saving ? "Clock" : "Check"} className="mr-2 h-4 w-4" />
          {saving ? "Enregistrement..." : round.status === 'terminée' ? "Ronde terminée" : "Terminer la ronde"}
        </Button>
      </div>
    </div>
  );
};
