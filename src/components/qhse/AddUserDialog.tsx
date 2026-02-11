import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Icon } from "@/components/Icon";
import { User, UserRole, Civility } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { roleConfig } from '@/lib/data';
import { Badge } from '../ui/badge';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface AddUserDialogProps {
  onAddUser: (username: string, user: Omit<User, 'id' | 'name'>) => void;
  currentUserRole: UserRole;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddUserDialog = ({ onAddUser, currentUserRole, isOpen, onOpenChange }: AddUserDialogProps) => {
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole | ''>('');
  const [civility, setCivility] = useState<Civility | ''>('');
  const [position, setPosition] = useState('');
  const [pin, setPin] = useState('');

  const resetForm = () => {
    setUsername('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setRole('');
    setCivility('');
    setPosition('');
    setPin('');
  };

  const handleSubmit = () => {
    if (!username || !firstName || !lastName || !password || !role || !civility || !position || !email) {
      showError('Veuillez remplir tous les champs.');
      return;
    }
    if (role === 'medecin' && pin.length !== 4) {
      showError('Le code PIN doit contenir 4 chiffres.');
      return;
    }

    onAddUser(username, { 
      username, 
      first_name: firstName, 
      last_name: lastName, 
      password, 
      role: role as UserRole, 
      civility: civility as Civility, 
      position, 
      email, 
      pin: role === 'medecin' ? pin : undefined 
    });
    
    resetForm();
    onOpenChange(false);
  };

  const renderRoleOptions = () => {
    switch (currentUserRole) {
      case 'superadmin':
        return (
          <>
            <SelectItem value="superviseur_qhse">Superviseur QHSE</SelectItem>
            <SelectItem value="assistante_qhse">Assistante QHSE</SelectItem>
            <SelectItem value="superviseur_agent_securite">Superviseur Agent de Sécurité</SelectItem>
            <SelectItem value="superviseur_agent_entretien">Superviseur Agent d'Entretien</SelectItem>
            <SelectItem value="superviseur_technicien">Superviseur Technicien</SelectItem>
            <SelectItem value="secretaire">Secrétaire</SelectItem>
            <SelectItem value="technicien">Technicien</SelectItem>
            <SelectItem value="agent_entretien">Agent d'Entretien</SelectItem>
            <SelectItem value="agent_securite">Agent de Sécurité</SelectItem>
            <SelectItem value="medecin">Médecin</SelectItem>
            <SelectItem value="buandiere">Buandière</SelectItem>
            <SelectItem value="technicien_polyvalent">Technicien Polyvalent</SelectItem>
          </>
        );
      case 'superviseur_qhse':
        return (
          <>
            <SelectItem value="assistante_qhse">Assistante QHSE</SelectItem>
            <SelectItem value="superviseur_agent_securite">Superviseur Agent de Sécurité</SelectItem>
            <SelectItem value="superviseur_agent_entretien">Superviseur Agent d'Entretien</SelectItem>
            <SelectItem value="superviseur_technicien">Superviseur Technicien</SelectItem>
            <SelectItem value="secretaire">Secrétaire</SelectItem>
            <SelectItem value="technicien">Technicien</SelectItem>
            <SelectItem value="agent_entretien">Agent d'Entretien</SelectItem>
            <SelectItem value="agent_securite">Agent de Sécurité</SelectItem>
            <SelectItem value="medecin">Médecin</SelectItem>
            <SelectItem value="buandiere">Buandière</SelectItem>
            <SelectItem value="technicien_polyvalent">Technicien Polyvalent</SelectItem>
          </>
        );
      case 'superviseur_agent_securite':
        return <SelectItem value="agent_securite">Agent de Sécurité</SelectItem>;
      case 'superviseur_agent_entretien':
        return <SelectItem value="agent_entretien">Agent d'Entretien</SelectItem>;
      case 'superviseur_technicien':
        return <SelectItem value="technicien">Technicien</SelectItem>;
      default:
        return null; // Other roles cannot add users
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) resetForm();
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Ajouter un nouvel utilisateur</DialogTitle>
          <DialogDescription>
            Créez un nouveau profil et assignez-lui un rôle.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="civility" className="text-right">Civilité</Label>
            <Select onValueChange={(value) => setCivility(value as Civility)} value={civility}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="M.">M.</SelectItem>
                <SelectItem value="Mme">Mme</SelectItem>
                <SelectItem value="Mlle">Mlle</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="firstName" className="text-right">Prénom</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="lastName" className="text-right">Nom</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="position" className="text-right">Poste</Label>
            <Input id="position" value={position} onChange={(e) => setPosition(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="username" className="text-right">Identifiant</Label>
            <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="password" className="text-right">Mot de passe</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="role" className="text-right">Rôle</Label>
            <Select onValueChange={(value) => setRole(value as UserRole)} value={role}>
              <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
              <SelectContent>
                {renderRoleOptions()}
              </SelectContent>
            </Select>
          </div>
          {role === 'medecin' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pin" className="text-right">Code PIN</Label>
              <div className="col-span-3">
                <InputOTP maxLength={4} value={pin} onChange={setPin}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
          )}
          {role && roleConfig[role] && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right pt-2">Permissions</Label>
              <div className="col-span-3 flex flex-wrap gap-1">
                {roleConfig[role].map(perm => (
                  <Badge key={perm.id} variant="secondary">{perm.name}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit}>Enregistrer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};