import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { IncidentComment, Incident, User } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Separator } from "@/components/ui/separator";

interface TicketCommentsProps {
  incident: Incident;
  currentUser: User;
  onCommentAdded?: () => void;
}

export const TicketComments = ({ incident, currentUser, onCommentAdded }: TicketCommentsProps) => {
  const [comments, setComments] = useState<IncidentComment[]>(incident.comments || []);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchComments();
  }, [incident.id]);

  const fetchComments = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('incident_comments')
        .select('*')
        .eq('incident_id', incident.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error("Erreur lors du chargement des commentaires:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) {
      showError("Veuillez saisir un commentaire");
      return;
    }

    try {
      setIsSubmitting(true);
      const userName = currentUser.first_name && currentUser.last_name 
        ? `${currentUser.first_name} ${currentUser.last_name}`
        : currentUser.name || currentUser.username;

      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const row = { id, incident_id: incident.id, comment: newComment.trim(), user_name: userName };
      const { data: comment, error } = await supabase.from('incident_comments').insert([row]).select().single();
      if (error) throw error;

      setComments(prev => [...prev, comment]);
      setNewComment('');
      showSuccess("Commentaire ajouté avec succès");
      onCommentAdded?.();
    } catch (error: any) {
      showError("Erreur lors de l'ajout du commentaire: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="MessageSquare" className="text-blue-600" />
          Commentaires et Avancées
          {comments.length > 0 && (
            <Badge variant="outline" className="ml-2">
              {comments.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Zone d'ajout de commentaire */}
        <div className="space-y-2">
          <Textarea
            placeholder="Ajoutez un commentaire pour suivre l'avancement de la tâche..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <Button
            onClick={handleAddComment}
            disabled={isSubmitting || !newComment.trim()}
            className="w-full sm:w-auto"
          >
            <Icon name={isSubmitting ? "Clock" : "Send"} className="mr-2 h-4 w-4" />
            {isSubmitting ? "Envoi..." : "Ajouter un commentaire"}
          </Button>
        </div>

        <Separator />

        {/* Liste des commentaires */}
        {isLoading ? (
          <div className="text-center py-8 text-gray-500">
            <Icon name="Loader2" className="h-6 w-6 animate-spin mx-auto mb-2" />
            Chargement des commentaires...
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-4">
            {comments
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((comment) => (
                <div
                  key={comment.id}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Icon name="User" className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{comment.user_name}</p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(comment.created_at), "dd/MM/yyyy 'à' HH:mm", { locale: fr })}
                        </p>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed mt-2">
                    {comment.comment}
                  </p>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Icon name="MessageSquare" className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Aucun commentaire pour le moment.</p>
            <p className="text-sm mt-1">Soyez le premier à commenter ce ticket.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
