import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Icon } from "@/components/Icon";
import { Visitor, Doctor, Users } from "@/types";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { visitorDestinations, visitReasons } from '@/lib/data';
import { doctors } from '@/lib/doctors';

interface AddVisitorFormProps {
  onAddVisitor: (visitor: Omit<Visitor, 'id' | 'entry_time' | 'registered_by'>) => void;
  onClose: () => void;
  users: Users; // Pass users to AddVisitorForm
  doctors: Doctor[]; // Pass doctors to AddVisitorForm
}

const AddVisitorForm = ({ onAddVisitor, onClose, users, doctors }: AddVisitorFormProps) => {
  const [fullName, setFullName] = useState('');
  const [idDocument, setIdDocument] = useState('');
  const [reason, setReason] = useState('');
  const [destination, setDestination] = useState('');
  const [personToSee, setPersonToSee] = useState('');
  const [otherPersonToSee, setOtherPersonToSee] = useState('');
  const [company, setCompany] = useState('');
  const [visitType, setVisitType] = useState('');
  const [badgeCode, setBadgeCode] = useState('');
  const [entrySignature, setEntrySignature] = useState('');
  const [observations, setObservations] = useState('');
  const [idVerified, setIdVerified] = useState<boolean | undefined>(undefined);

  const staffList = [
    ...doctors.map(d => ({ value: d.name, label: `${d.name} (${d.specialty})` })),
    ...Object.values(users).map(u => ({ value: u.name, label: `${u.name} (${u.position})` }))
  ].sort((a, b) => a.label.localeCompare(b.label));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalPersonToSee =
      personToSee === '__autre__' ? otherPersonToSee.trim() : personToSee.trim();

    if (!fullName || !idDocument || !reason || !destination || !finalPersonToSee) return;

    onAddVisitor({
      full_name: fullName,
      id_document: idDocument,
      reason,
      destination,
      person_to_see: finalPersonToSee,
      company: company || undefined,
      visit_type: visitType || undefined,
      badge_code: badgeCode || undefined,
      entry_signature: entrySignature || undefined,
      access_observations: observations || undefined,
      id_verified: idVerified,
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input placeholder="Nom et Prénom" value={fullName} onChange={e => setFullName(e.target.value)} required />
      <Input placeholder="Numéro de la pièce d'identité" value={idDocument} onChange={e => setIdDocument(e.target.value)} required />
      <Input placeholder="Société / Organisme" value={company} onChange={e => setCompany(e.target.value)} />
      <Select onValueChange={setReason} value={reason} required>
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner le motif de la visite" />
        </SelectTrigger>
        <SelectContent>
          {visitReasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
        </SelectContent>
      </Select>
      <Input
        placeholder="Type (Visiteur, Prestataire, Intervenant...)"
        value={visitType}
        onChange={e => setVisitType(e.target.value)}
      />
      <Select onValueChange={setDestination} value={destination} required>
        <SelectTrigger>
          <SelectValue placeholder="Sélectionner le service / la destination" />
        </SelectTrigger>
        <SelectContent>
          {visitorDestinations.map(group => (
            <SelectGroup key={group.label}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.options.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select>
      <Select onValueChange={setPersonToSee} value={personToSee} required>
        <SelectTrigger>
          <SelectValue placeholder="Service / Personne visitée" />
        </SelectTrigger>
        <SelectContent>
          {staffList.map((staff, index) => (
            <SelectItem key={`${staff.value}-${index}`} value={staff.value}>{staff.label}</SelectItem>
          ))}
          <SelectItem value="__autre__">Autre...</SelectItem>
        </SelectContent>
      </Select>
      {personToSee === '__autre__' && (
        <Input
          placeholder="Préciser la personne à rencontrer"
          value={otherPersonToSee}
          onChange={e => setOtherPersonToSee(e.target.value)}
          required
        />
      )}
      <div className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={!!idVerified}
          onChange={e => setIdVerified(e.target.checked)}
        />
        <span>Pièce d'identité vérifiée</span>
      </div>
      <Input
        placeholder="Code du badge remis"
        value={badgeCode}
        onChange={e => setBadgeCode(e.target.value)}
      />
      <Input
        placeholder="Signature entrée"
        value={entrySignature}
        onChange={e => setEntrySignature(e.target.value)}
      />
      <Input
        placeholder="Observations"
        value={observations}
        onChange={e => setObservations(e.target.value)}
      />
      <Button type="submit" className="w-full">Enregistrer l'entrée</Button>
    </form>
  );
};

interface VisitorLogProps {
  visitors: Visitor[];
  onAddVisitor: (visitor: Omit<Visitor, 'id' | 'entry_time' | 'registered_by'>) => void;
  onSignOutVisitor: (visitorId: string) => void;
  onDeleteVisitor?: (visitorId: string) => void;
  users: Users; // Pass users to VisitorLog
  doctors: Doctor[]; // Pass doctors to VisitorLog
}

export const VisitorLog = ({ visitors, onAddVisitor, onSignOutVisitor, onDeleteVisitor, users, doctors }: VisitorLogProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center">
          <Icon name="BookUser" className="text-blue-600 mr-2" />
          <CardTitle>Registre des Visiteurs</CardTitle>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><Icon name="Plus" className="mr-2 h-4 w-4" />Nouveau Visiteur</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enregistrer un nouveau visiteur</DialogTitle>
              <DialogDescription>Renseignez les informations du nouveau visiteur entrant.</DialogDescription>
            </DialogHeader>
            <AddVisitorForm onAddVisitor={onAddVisitor} onClose={() => setIsDialogOpen(false)} users={users} doctors={doctors} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>N°</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Heure d'entrée</TableHead>
              <TableHead>Nom et Prénom</TableHead>
              <TableHead>Société / Organisme</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Service / Personne visitée</TableHead>
              <TableHead>Motif de la visite</TableHead>
              <TableHead>Pièce d'identité vérifiée ?</TableHead>
              <TableHead>Numéro de la pièce</TableHead>
              <TableHead>Code du badge remis</TableHead>
              <TableHead>Signature entrée</TableHead>
              <TableHead>Heure de sortie</TableHead>
              <TableHead>Signature sortie</TableHead>
              <TableHead>Observations</TableHead>
              <TableHead>Agent de sécurité</TableHead>
              <TableHead>Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visitors.map((visitor, index) => {
              const agent = Object.values(users).find(u => u.id === visitor.registered_by);
              const entryDate = visitor.entry_time ? new Date(visitor.entry_time) : null;
              const exitDate = visitor.exit_time ? new Date(visitor.exit_time) : null;

              return (
                <TableRow key={visitor.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{entryDate ? format(entryDate, 'dd/MM/yyyy', { locale: fr }) : '-'}</TableCell>
                  <TableCell>{entryDate ? format(entryDate, 'HH:mm', { locale: fr }) : '-'}</TableCell>
                  <TableCell>{visitor.full_name}</TableCell>
                  <TableCell>{visitor.company || '-'}</TableCell>
                  <TableCell>{visitor.visit_type || 'Visiteur'}</TableCell>
                  <TableCell>{visitor.person_to_see || visitor.destination || '-'}</TableCell>
                  <TableCell>{visitor.reason}</TableCell>
                  <TableCell>
                    {visitor.id_verified !== undefined
                      ? visitor.id_verified ? 'Oui' : 'Non'
                      : visitor.id_document ? 'Oui' : 'Non'}
                  </TableCell>
                  <TableCell>{visitor.id_document}</TableCell>
                  <TableCell>{visitor.badge_code || '-'}</TableCell>
                  <TableCell>{visitor.entry_signature || '-'}</TableCell>
                  <TableCell>{exitDate ? format(exitDate, 'HH:mm', { locale: fr }) : '-'}</TableCell>
                  <TableCell>{visitor.exit_signature || '-'}</TableCell>
                  <TableCell>{visitor.access_observations || '-'}</TableCell>
                  <TableCell>
                    {agent ? `${agent.first_name} ${agent.last_name}` : '-'}
                  </TableCell>
                  <TableCell className="space-x-2">
                  <Button
                    size="sm"
                    onClick={() => onSignOutVisitor(visitor.id)}
                    disabled={!!visitor.exit_time}
                  >
                    <Icon name="LogOut" className="mr-1 h-4 w-4" />
                    Enregistrer la sortie
                  </Button>
                  {onDeleteVisitor && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => onDeleteVisitor(visitor.id)}
                    >
                      <Icon name="X" className="mr-1 h-4 w-4" />
                      Supprimer
                    </Button>
                  )}
                </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};