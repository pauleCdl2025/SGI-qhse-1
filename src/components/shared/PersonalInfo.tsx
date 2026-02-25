import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { User } from "@/types";
import { Icon } from "@/components/Icon";
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { showError, showSuccess } from '@/utils/toast';

interface PersonalInfoProps {
  user: User;
  onUpdatePassword: (newPassword: string) => Promise<boolean>;
}

export const PersonalInfo = ({ user, onUpdatePassword }: PersonalInfoProps) => {
  const [showPin, setShowPin] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const handleChangePassword = async () => {
    setPasswordError('');
    if (!newPassword || !confirmPassword) {
      setPasswordError('Veuillez remplir tous les champs de mot de passe.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Les mots de passe ne correspondent pas.');
      return;
    }

    setIsUpdatingPassword(true);
    const success = await onUpdatePassword(newPassword);
    setIsUpdatingPassword(false);

    if (success) {
      showSuccess('Votre mot de passe a été mis à jour avec succès.');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      showError('Échec de la mise à jour du mot de passe.');
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Icon name="User" className="mr-2 text-blue-600" />
          Mes Informations Personnelles
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
          <span className="font-medium text-gray-600">Nom Complet</span>
          <span className="text-gray-800">{user.civility} {user.first_name} {user.last_name}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
          <span className="font-medium text-gray-600">Poste</span>
          <span className="text-gray-800">{user.position}</span>
        </div>
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
          <span className="font-medium text-gray-600">Email</span>
          <span className="text-gray-800">{user.email}</span>
        </div>
        {user.role === 'medecin' && user.pin && (
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-md">
            <span className="font-medium text-gray-600">Code PIN de validation</span>
            <div className="flex items-center space-x-2">
              <span className="text-gray-800 font-mono tracking-widest">
                {showPin ? user.pin : '****'}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setShowPin(!showPin)}>
                <Icon name={showPin ? 'EyeOff' : 'Eye'} className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {user.role === 'superadmin' && (
          <div className="border-t pt-4 mt-4 space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Icon name="KeyRound" className="mr-2 h-5 w-5 text-gray-600" />
              Changer mon mot de passe
            </h3>
            <div>
              <Label htmlFor="new-password">Nouveau mot de passe</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
              />
            </div>
            {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
            <Button onClick={handleChangePassword} disabled={isUpdatingPassword}>
              {isUpdatingPassword ? 'Mise à jour...' : 'Mettre à jour le mot de passe'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};