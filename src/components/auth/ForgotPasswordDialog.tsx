import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Icon } from "@/components/Icon";
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

interface ForgotPasswordDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ForgotPasswordDialog = ({ isOpen, onOpenChange }: ForgotPasswordDialogProps) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`, // Redirect back to login after reset
    });
    setLoading(false);

    if (error) {
      showError(error.message);
    } else {
      showSuccess("Un e-mail de réinitialisation de mot de passe a été envoyé à votre adresse.");
      onOpenChange(false);
      setEmail('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Mot de passe oublié ?</DialogTitle>
          <DialogDescription>
            Saisissez votre adresse e-mail pour recevoir un lien de réinitialisation.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="email" className="text-right">Email</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="col-span-3" 
              required 
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Envoi en cours...' : <><Icon name="Mail" className="mr-2 h-4 w-4" /> Envoyer le lien</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};