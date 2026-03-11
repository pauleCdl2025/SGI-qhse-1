import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Icon } from "@/components/Icon";
import { Users, User, UserRole } from '@/types';
import { AddUserDialog } from './AddUserDialog';
import { EditUserPermissionsDialog } from './EditUserPermissionsDialog';
import { ResetPasswordDialog } from '@/components/auth/ResetPasswordDialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { showSuccess } from '@/utils/toast';
import { roleConfig, allPermissions } from "@/lib/data";
import { Badge } from '../ui/badge';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const roleDisplay: Record<User['role'], string> = {
    agent_securite: "Agent Sécurité",
    agent_entretien: "Agent Entretien",
    technicien: "Technicien",
    superviseur_qhse: "Superviseur QHSE",
    assistante_qhse: "Assistante QHSE",
    superadmin: "Super Admin",
    secretaire: "Secrétaire",
    superviseur_agent_securite: "Superviseur Sécurité",
    superviseur_agent_entretien: "Superviseur Entretien",
    superviseur_technicien: "Superviseur Technique",
    medecin: "Médecin",
    buandiere: "Buandière",
    technicien_polyvalent: "Technicien Polyvalent",
    administrateur_reseau: "Administrateur Réseau",
    employe: "Employé",
};

const roleColors: Record<User['role'], string> = {
    superadmin: "bg-amber-100 text-amber-700 border-amber-300",
    superviseur_qhse: "bg-cyan-100 text-cyan-700 border-cyan-300",
    assistante_qhse: "bg-cyan-50 text-cyan-700 border-cyan-200",
    superviseur_agent_securite: "bg-blue-100 text-blue-700 border-blue-300",
    superviseur_agent_entretien: "bg-green-100 text-green-700 border-green-300",
    superviseur_technicien: "bg-orange-100 text-orange-700 border-orange-300",
    agent_securite: "bg-blue-50 text-blue-600 border-blue-200",
    agent_entretien: "bg-green-50 text-green-600 border-green-200",
    technicien: "bg-orange-50 text-orange-600 border-orange-200",
    secretaire: "bg-pink-100 text-pink-700 border-pink-300",
    medecin: "bg-red-100 text-red-700 border-red-300",
    buandiere: "bg-teal-100 text-teal-700 border-teal-300",
    technicien_polyvalent: "bg-orange-100 text-orange-700 border-orange-300",
    administrateur_reseau: "bg-indigo-100 text-indigo-700 border-indigo-300",
    employe: "bg-slate-100 text-slate-700 border-slate-300",
};

const getEffectivePermissions = (user: User) => {
  const basePermissions = new Set(roleConfig[user.role]?.map(p => p.id) || []);
  user.removed_permissions?.forEach(id => basePermissions.delete(id));
  user.added_permissions?.forEach(id => basePermissions.add(id));
  return allPermissions.filter(p => basePermissions.has(p.id));
};

interface UserManagementProps {
    currentUserRole: UserRole;
    users: Users;
    addUser: (username: string, user: Omit<User, 'id' | 'username' | 'name'>) => void;
    deleteUser: (username: string) => void;
    updateUserPermissions: (username: string, permissions: { added: string[], removed: string[] }) => void;
}

export const UserManagement = ({ currentUserRole, users, addUser, deleteUser, updateUserPermissions }: UserManagementProps) => {
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<[string, User] | null>(null);
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState<UserRole | 'all'>('all');

  const handleDeleteUser = (usernameToDelete: string) => {
    deleteUser(usernameToDelete);
    showSuccess("L'utilisateur a été supprimé avec succès.");
  };

  const canManage = (userToManage: User) => {
    if (currentUserRole === 'superadmin') {
      return userToManage.role !== 'superadmin';
    }
    if (currentUserRole === 'superviseur_qhse') {
      // Le superviseur QHSE peut gérer tous les utilisateurs sauf superadmin et superviseur_qhse
      // Il est responsable des agents de sécurité, entretien et techniciens
      return (
        userToManage.role !== 'superadmin' &&
        userToManage.role !== 'superviseur_qhse'
      );
    }
    if (currentUserRole === 'superviseur_agent_securite') {
      return userToManage.role === 'agent_securite';
    }
    if (currentUserRole === 'superviseur_agent_entretien') {
      return userToManage.role === 'agent_entretien';
    }
    if (currentUserRole === 'superviseur_technicien') {
      return userToManage.role === 'technicien';
    }
    return false;
  }

  const filteredUsersForManagement = Object.entries(users).filter(([, user]) => {
    if (currentUserRole === 'superadmin') return true;
    if (currentUserRole === 'superviseur_qhse') {
      return user.role !== 'superadmin' && user.role !== 'superviseur_qhse';
    }
    if (currentUserRole === 'superviseur_agent_securite') {
      return user.role === 'agent_securite' || user.role === 'superviseur_agent_securite';
    }
    if (currentUserRole === 'superviseur_agent_entretien') {
      return user.role === 'agent_entretien' || user.role === 'superviseur_agent_entretien';
    }
    if (currentUserRole === 'superviseur_technicien') {
      return user.role === 'technicien' || user.role === 'superviseur_technicien';
    }
    return false;
  });

  // Recherche améliorée avec gestion des objets imbriqués
  const [searchQuery, setSearchQuery] = useState('');
  
  const searchableUsers = useMemo(() => {
    return filteredUsersForManagement.map(([username, user]) => ({
      username,
      user,
      searchText: `${username} ${user.first_name} ${user.last_name} ${user.email} ${roleDisplay[user.role]}`.toLowerCase()
    }));
  }, [filteredUsersForManagement]);

  const filteredBySearch = useMemo(() => {
    if (!searchQuery.trim()) return searchableUsers;
    const query = searchQuery.toLowerCase();
    return searchableUsers.filter(({ searchText }) => searchText.includes(query));
  }, [searchableUsers, searchQuery]);

  // Filtrage par rôle
  const finalFilteredUsers = useMemo(() => {
    let result = filteredBySearch;
    if (filterRole !== 'all') {
      result = result.filter(({ user }) => user.role === filterRole);
    }
    return result;
  }, [filteredBySearch, filterRole]);

  const canAddUser = ['superadmin', 'superviseur_qhse', 'superviseur_agent_securite', 'superviseur_agent_entretien', 'superviseur_technicien'].includes(currentUserRole);

  // Statistiques par rôle
  const roleStats = useMemo(() => {
    const stats: Record<string, number> = {};
    filteredUsersForManagement.forEach(([, user]) => {
      stats[user.role] = (stats[user.role] || 0) + 1;
    });
    return stats;
  }, [filteredUsersForManagement]);

  return (
    <Card className="card-hover">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center">
            <Icon name="Users" className="text-cyan-600 mr-2" />
            <CardTitle>Gestion des Utilisateurs</CardTitle>
            <Badge variant="secondary" className="ml-3">{filteredUsersForManagement.length} utilisateur(s)</Badge>
        </div>
        {canAddUser && (
          <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 hover:from-cyan-700 hover:via-blue-700 hover:to-teal-700 btn-animate">
                <Icon name="UserPlus" className="mr-2 h-4 w-4" /> Ajouter un utilisateur
              </Button>
            </DialogTrigger>
            <AddUserDialog
              isOpen={isAddUserDialogOpen}
              onOpenChange={setIsAddUserDialogOpen}
              onAddUser={addUser}
              currentUserRole={currentUserRole}
            />
          </Dialog>
        )}
      </CardHeader>
      <CardContent>
        {/* Barre de recherche et filtrage améliorée */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, identifiant..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md bg-background focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <Select value={filterRole} onValueChange={(v) => setFilterRole(v as UserRole | 'all')}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrer par rôle" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {Object.entries(roleDisplay).map(([role, label]) => (
                <SelectItem key={role} value={role}>
                  {label} {roleStats[role] && `(${roleStats[role]})`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Statistiques rapides */}
        {currentUserRole === 'superadmin' && Object.keys(roleStats).length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6 p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-lg border border-cyan-100">
            {Object.entries(roleStats).map(([role, count]) => (
              <div key={role} className="text-center">
                <div className="text-2xl font-bold text-gray-900">{count}</div>
                <div className="text-xs text-gray-600">{roleDisplay[role as UserRole]}</div>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-lg border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100">
                <TableHead className="font-semibold">Nom complet</TableHead>
                <TableHead className="font-semibold">Identifiant</TableHead>
                <TableHead className="font-semibold">Email</TableHead>
                <TableHead className="font-semibold">Rôle</TableHead>
                <TableHead className="font-semibold">Service</TableHead>
                <TableHead className="font-semibold">Permissions</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {finalFilteredUsers.length > 0 ? finalFilteredUsers.map(({ username, user }) => (
                <TableRow key={username} className="hover:bg-gray-50 transition-colors">
                  <TableCell className="font-medium">
                    {user.civility} {user.first_name} {user.last_name}
                  </TableCell>
                  <TableCell className="font-mono text-sm">{username}</TableCell>
                  <TableCell className="text-sm">{user.email}</TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role]}>
                      {roleDisplay[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{user.position || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-xs">
                      {getEffectivePermissions(user).slice(0, 3).map(perm => (
                        <Badge key={perm.id} variant="secondary" className="text-xs">{perm.name}</Badge>
                      ))}
                      {getEffectivePermissions(user).length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{getEffectivePermissions(user).length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {canManage(user) && (
                        <Button variant="outline" size="sm" onClick={() => setEditingUser([username, user])} className="btn-animate">
                          <Icon name="Settings" className="h-4 w-4 mr-1" /> Gérer
                        </Button>
                      )}
                      {currentUserRole === 'superadmin' && (
                        <Button variant="secondary" size="sm" onClick={() => setResettingUser(user)} className="btn-animate">
                          <Icon name="KeyRound" className="h-4 w-4 mr-1" /> MDP
                        </Button>
                      )}
                      {canManage(user) && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm" className="btn-animate">
                              <Icon name="Trash" className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Cette action est irréversible. Le compte de {user.name} sera définitivement supprimé.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDeleteUser(username)} className="bg-red-600 hover:bg-red-700">
                                Supprimer
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Icon name="Users" className="mx-auto text-4xl text-gray-300 mb-2" />
                    {searchQuery || filterRole !== 'all'
                      ? 'Aucun utilisateur ne correspond à votre recherche.' 
                      : 'Aucun utilisateur à afficher.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {editingUser && (
          <EditUserPermissionsDialog
            username={editingUser[0]}
            user={editingUser[1]}
            isOpen={!!editingUser}
            onClose={() => setEditingUser(null)}
            onSavePermissions={updateUserPermissions}
          />
        )}
        {resettingUser && (
          <ResetPasswordDialog
            isOpen={!!resettingUser}
            onOpenChange={() => setResettingUser(null)}
            userToReset={resettingUser}
          />
        )}
      </CardContent>
    </Card>
  );
};