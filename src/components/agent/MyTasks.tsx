import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/Icon";
import { PlannedTask, PlannedTaskStatus, Users } from "@/types";
import { format, differenceInDays, isPast, isToday } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MoreHorizontal, ChevronDown, ChevronUp, Wrench, Calendar, User } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MyTasksProps {
  tasks: PlannedTask[];
  users: Users;
  onUpdateStatus: (taskId: string, status: PlannedTaskStatus) => void;
}

const statusConfigs: Record<PlannedTaskStatus, { label: string; className: string; icon: string }> = {
  'à faire': { label: 'À faire', className: 'bg-slate-500 text-white', icon: 'Clock' },
  'en_cours': { label: 'En cours', className: 'bg-amber-500 text-white', icon: 'Play' },
  'terminée': { label: 'Terminée', className: 'bg-green-600 text-white', icon: 'Check' },
  'annulée': { label: 'Annulée', className: 'bg-red-600 text-white', icon: 'X' },
};

export const MyTasks = ({ tasks, users, onUpdateStatus }: MyTasksProps) => {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const findUserName = (userId: string) => {
    const userEntry = Object.values(users).find(user => user.id === userId);
    if (!userEntry) {
      return 'Agent inconnu';
    }
    const parts = [userEntry.first_name, userEntry.last_name].filter(Boolean);
    if (parts.length > 0) {
      return parts.join(' ');
    }
    if (userEntry.name) {
      return userEntry.name;
    }
    return userEntry.username;
  };

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const getDueDateInfo = (dueDate: Date) => {
    const daysUntilDue = differenceInDays(dueDate, new Date());
    const isOverdue = isPast(dueDate) && !isToday(dueDate);
    const isDueToday = isToday(dueDate);

    if (isOverdue) {
      return { text: `En retard de ${Math.abs(daysUntilDue)} jour(s)`, className: 'text-red-600 font-semibold', badge: 'bg-red-100 text-red-700' };
    }
    if (isDueToday) {
      return { text: "Aujourd'hui", className: 'text-amber-600 font-semibold', badge: 'bg-amber-100 text-amber-700' };
    }
    if (daysUntilDue <= 3) {
      return { text: `Dans ${daysUntilDue} jour(s)`, className: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' };
    }
    return { text: format(dueDate, 'PPP', { locale: fr }), className: 'text-gray-600', badge: 'bg-gray-100 text-gray-700' };
  };

  const isRepairTask = (title: string) => title.includes('[Réparation]');

  // Trier les tâches : en retard en premier, puis par échéance
  const sortedTasks = [...tasks].sort((a, b) => {
    const aOverdue = isPast(a.due_date) && !isToday(a.due_date);
    const bOverdue = isPast(b.due_date) && !isToday(b.due_date);
    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;
    return a.due_date.getTime() - b.due_date.getTime();
  });

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Icon name="ClipboardList" className="text-blue-600 h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Mes Tâches Planifiées</h2>
              <p className="text-sm text-gray-600 font-normal">{tasks.length} tâche(s) assignée(s)</p>
            </div>
          </div>
          {tasks.length > 0 && (
            <Badge variant="outline" className="bg-white">
              {tasks.filter(t => t.status === 'à faire').length} à faire
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {sortedTasks.length > 0 ? (
          <div className="space-y-4">
            {sortedTasks.map(task => {
              const statusInfo = statusConfigs[task.status] ?? { label: task.status, className: 'bg-gray-400 text-white', icon: 'Circle' };
              const dueDateInfo = getDueDateInfo(task.due_date);
              const isExpanded = expandedTasks.has(task.id);
              const isRepair = isRepairTask(task.title);

              return (
                <Card key={task.id} className={`border-l-4 ${
                  task.status === 'terminée' ? 'border-l-green-500' :
                  task.status === 'en_cours' ? 'border-l-amber-500' :
                  isPast(task.due_date) && !isToday(task.due_date) ? 'border-l-red-500' :
                  'border-l-blue-500'
                } shadow-md hover:shadow-lg transition-shadow`}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          {isRepair && (
                            <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                              <Wrench className="h-5 w-5 text-red-600" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg text-gray-900 mb-1 flex items-center gap-2">
                              {task.title}
                              {isRepair && (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs">
                                  Réparation
                                </Badge>
                              )}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600 mb-3">
                              <div className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                <span>{task.assignee_name || findUserName(task.assigned_to)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span className={dueDateInfo.className}>{dueDateInfo.text}</span>
                              </div>
                            </div>
                            <Collapsible open={isExpanded} onOpenChange={() => toggleTaskExpansion(task.id)}>
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 p-0 h-auto">
                                  {isExpanded ? (
                                    <>
                                      <ChevronUp className="h-4 w-4 mr-1" />
                                      Masquer les détails
                                    </>
                                  ) : (
                                    <>
                                      <ChevronDown className="h-4 w-4 mr-1" />
                                      Voir les détails
                                    </>
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <CollapsibleContent className="mt-3">
                                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                    {task.description}
                                  </p>
                                </div>
                              </CollapsibleContent>
                            </Collapsible>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-3 flex-shrink-0">
                        <div className="flex items-center gap-2">
                          <Badge className={`${statusInfo.className} flex items-center gap-1`}>
                            <Icon name={statusInfo.icon as any} className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                          <Badge className={dueDateInfo.badge}>
                            {dueDateInfo.text}
                          </Badge>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" disabled={task.status === 'terminée'}>
                              <MoreHorizontal className="h-4 w-4 mr-2" />
                              Actions
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => onUpdateStatus(task.id, 'en_cours')} 
                              disabled={task.status === 'en_cours'}
                              className="cursor-pointer"
                            >
                              <Icon name="Play" className="mr-2 h-4 w-4" /> Démarrer
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onUpdateStatus(task.id, 'terminée')}
                              disabled={task.status === 'terminée'}
                              className="cursor-pointer"
                            >
                              <Icon name="Check" className="mr-2 h-4 w-4" /> Terminer
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => onUpdateStatus(task.id, 'annulée')} 
                              className="text-red-600 cursor-pointer"
                              disabled={task.status === 'annulée'}
                            >
                              <Icon name="X" className="mr-2 h-4 w-4" /> Annuler
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <Icon name="ClipboardCheck" className="text-4xl text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">Aucune tâche planifiée</h3>
            <p className="text-sm text-gray-500">Vous n'avez aucune tâche assignée pour le moment.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};