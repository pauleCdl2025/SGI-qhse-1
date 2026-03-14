import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { User } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { supabase } from "@/integrations/supabase/client";
import { format, isBefore, differenceInDays } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingSpinner } from "@/components/shared/Loading";
import { DashboardCard } from "@/components/shared/DashboardCard";

interface NetworkSubscription {
  id: string;
  service_name: string;
  provider: string;
  subscription_type: 'internet' | 'telephonie' | 'cloud' | 'securite' | 'autre';
  monthly_cost: number;
  start_date: Date;
  renewal_date: Date;
  contract_number?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  status: 'actif' | 'suspendu' | 'expire' | 'resilie';
  notes?: string;
  created_at: Date;
  updated_at: Date;
}

const subscriptionTypeLabels: Record<string, string> = {
  internet: "Internet",
  telephonie: "Téléphonie",
  cloud: "Cloud",
  securite: "Sécurité",
  autre: "Autre",
};

const statusLabels: Record<string, string> = {
  actif: "Actif",
  suspendu: "Suspendu",
  expire: "Expiré",
  resilie: "Résilié",
};

const statusColors: Record<string, string> = {
  actif: "bg-green-100 text-green-700",
  suspendu: "bg-yellow-100 text-yellow-700",
  expire: "bg-red-100 text-red-700",
  resilie: "bg-gray-100 text-gray-700",
};

interface NetworkSubscriptionsListProps {
  user: User;
}

export const NetworkSubscriptionsList = ({ user }: NetworkSubscriptionsListProps) => {
  const [subscriptions, setSubscriptions] = useState<NetworkSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState<NetworkSubscription | null>(null);

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('network_subscriptions')
        .select('*')
        .order('start_date', { ascending: false });
      if (error) throw error;
      setSubscriptions((data || []).map((sub: any) => ({
        ...sub,
        start_date: new Date(sub.start_date),
        renewal_date: new Date(sub.renewal_date),
        created_at: new Date(sub.created_at),
        updated_at: new Date(sub.updated_at),
      })));
    } catch (error: any) {
      showError("Erreur lors du chargement: " + (error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async (data: any) => {
    try {
      const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const { error } = await supabase.from('network_subscriptions').insert([{ ...data, id }]);
      if (error) throw error;
      showSuccess("Abonnement créé avec succès");
      setIsDialogOpen(false);
      fetchSubscriptions();
    } catch (error: any) {
      showError("Erreur: " + (error?.message || error));
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  const today = new Date();
  const stats = {
    total: subscriptions.length,
    actif: subscriptions.filter(s => s.status === 'actif').length,
    expire: subscriptions.filter(s => s.status === 'expire').length,
    totalMonthlyCost: subscriptions.filter(s => s.status === 'actif').reduce((sum, s) => sum + (s.monthly_cost || 0), 0),
    expiringSoon: subscriptions.filter(s => {
      if (s.status !== 'actif') return false;
      const daysUntilRenewal = differenceInDays(s.renewal_date, today);
      return daysUntilRenewal >= 0 && daysUntilRenewal <= 30;
    }).length,
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Icon name="CreditCard" className="text-green-600 mr-2" />
          Abonnements Réseau
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-green-600 to-emerald-600">
              <Icon name="Plus" className="mr-2 h-4 w-4" /> Nouvel Abonnement
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Ajouter un abonnement</DialogTitle>
            </DialogHeader>
            <NetworkSubscriptionForm onSubmit={handleCreateSubscription} onCancel={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {/* Statistiques */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <DashboardCard title="Total" value={stats.total} iconName="CreditCard" colorClass="bg-blue-100 text-blue-600" />
          <DashboardCard title="Actifs" value={stats.actif} iconName="CheckCircle" colorClass="bg-green-100 text-green-600" />
          <DashboardCard title="Expirés" value={stats.expire} iconName="XCircle" colorClass="bg-red-100 text-red-600" />
          <DashboardCard title="Expirent bientôt" value={stats.expiringSoon} iconName="AlertTriangle" colorClass="bg-yellow-100 text-yellow-600" />
        </div>

        {/* Coût mensuel total */}
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700 mb-1">Coût Mensuel Total (Actifs)</p>
                <p className="text-2xl font-bold text-green-800">
                  {stats.totalMonthlyCost.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' })}
                </p>
              </div>
              <Icon name="DollarSign" className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        {/* Tableau */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Service</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Coût Mensuel</TableHead>
                <TableHead>Date Renouvellement</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length > 0 ? subscriptions.map((sub) => {
                const daysUntilRenewal = differenceInDays(sub.renewal_date, today);
                const isExpiringSoon = sub.status === 'actif' && daysUntilRenewal >= 0 && daysUntilRenewal <= 30;
                
                return (
                  <TableRow key={sub.id} className={isExpiringSoon ? 'bg-yellow-50' : ''}>
                    <TableCell className="font-medium">{sub.service_name}</TableCell>
                    <TableCell>{sub.provider}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{subscriptionTypeLabels[sub.subscription_type] || sub.subscription_type}</Badge>
                    </TableCell>
                    <TableCell>
                      {sub.monthly_cost.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span>{format(sub.renewal_date, 'dd/MM/yyyy')}</span>
                        {isExpiringSoon && (
                          <span className="ml-2 text-xs text-yellow-600 font-medium">
                            (Dans {daysUntilRenewal} jour{daysUntilRenewal > 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[sub.status]}>
                        {statusLabels[sub.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setSelectedSubscription(sub);
                          setIsViewDialogOpen(true);
                        }}
                      >
                        <Icon name="Eye" className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              }) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Icon name="CreditCard" className="mx-auto text-4xl text-gray-300 mb-2" />
                    <p className="text-gray-500">Aucun abonnement enregistré</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Dialog pour voir les détails */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Icon name="CreditCard" className="mr-2 h-5 w-5" />
              Détails de l'abonnement
            </DialogTitle>
          </DialogHeader>
          {selectedSubscription && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Nom du service</Label>
                  <p className="text-gray-900">{selectedSubscription.service_name}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Fournisseur</Label>
                  <p className="text-gray-900">{selectedSubscription.provider}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Type</Label>
                  <p className="text-gray-900">
                    <Badge variant="outline">
                      {subscriptionTypeLabels[selectedSubscription.subscription_type] || selectedSubscription.subscription_type}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Statut</Label>
                  <p className="text-gray-900">
                    <Badge className={statusColors[selectedSubscription.status]}>
                      {statusLabels[selectedSubscription.status]}
                    </Badge>
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Coût mensuel</Label>
                  <p className="text-gray-900 font-semibold">
                    {selectedSubscription.monthly_cost.toLocaleString('fr-FR', { style: 'currency', currency: 'XAF' })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Date de début</Label>
                  <p className="text-gray-900">{format(selectedSubscription.start_date, 'dd/MM/yyyy')}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Date de renouvellement</Label>
                  <p className="text-gray-900">
                    {format(selectedSubscription.renewal_date, 'dd/MM/yyyy')}
                    {(() => {
                      const daysUntilRenewal = differenceInDays(selectedSubscription.renewal_date, today);
                      if (selectedSubscription.status === 'actif' && daysUntilRenewal >= 0 && daysUntilRenewal <= 30) {
                        return (
                          <span className="ml-2 text-xs text-yellow-600 font-medium">
                            (Dans {daysUntilRenewal} jour{daysUntilRenewal > 1 ? 's' : ''})
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </p>
                </div>
                {selectedSubscription.contract_number && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Numéro de contrat</Label>
                    <p className="text-gray-900 font-mono">{selectedSubscription.contract_number}</p>
                  </div>
                )}
                {selectedSubscription.contact_person && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Contact (Nom)</Label>
                    <p className="text-gray-900">{selectedSubscription.contact_person}</p>
                  </div>
                )}
                {selectedSubscription.contact_phone && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Téléphone</Label>
                    <p className="text-gray-900">{selectedSubscription.contact_phone}</p>
                  </div>
                )}
                {selectedSubscription.contact_email && (
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Email</Label>
                    <p className="text-gray-900">{selectedSubscription.contact_email}</p>
                  </div>
                )}
              </div>
              {selectedSubscription.notes && (
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Notes</Label>
                  <p className="text-gray-900 whitespace-pre-wrap">{selectedSubscription.notes}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Date de création</Label>
                  <p className="text-gray-600 text-sm">{format(selectedSubscription.created_at, 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Dernière modification</Label>
                  <p className="text-gray-600 text-sm">{format(selectedSubscription.updated_at, 'dd/MM/yyyy HH:mm')}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

const NetworkSubscriptionForm = ({ onSubmit, onCancel, initialData }: { onSubmit: (data: any) => void; onCancel: () => void; initialData?: NetworkSubscription }) => {
  const [serviceName, setServiceName] = useState(initialData?.service_name || '');
  const [provider, setProvider] = useState(initialData?.provider || '');
  const [subscriptionType, setSubscriptionType] = useState<'internet' | 'telephonie' | 'cloud' | 'securite' | 'autre'>(initialData?.subscription_type || 'internet');
  const [monthlyCost, setMonthlyCost] = useState(initialData?.monthly_cost?.toString() || '');
  const [startDate, setStartDate] = useState(initialData?.start_date ? format(initialData.start_date, 'yyyy-MM-dd') : '');
  const [renewalDate, setRenewalDate] = useState(initialData?.renewal_date ? format(initialData.renewal_date, 'yyyy-MM-dd') : '');
  const [contractNumber, setContractNumber] = useState(initialData?.contract_number || '');
  const [contactPerson, setContactPerson] = useState(initialData?.contact_person || '');
  const [contactPhone, setContactPhone] = useState(initialData?.contact_phone || '');
  const [contactEmail, setContactEmail] = useState(initialData?.contact_email || '');
  const [status, setStatus] = useState<'actif' | 'suspendu' | 'expire' | 'resilie'>(initialData?.status || 'actif');
  const [notes, setNotes] = useState(initialData?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      service_name: serviceName,
      provider,
      subscription_type: subscriptionType,
      monthly_cost: monthlyCost ? parseFloat(monthlyCost) : 0,
      start_date: startDate || null,
      renewal_date: renewalDate || null,
      contract_number: contractNumber || null,
      contact_person: contactPerson || null,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
      status,
      notes: notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>Nom du service *</Label>
        <Input value={serviceName} onChange={(e) => setServiceName(e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Fournisseur *</Label>
          <Input value={provider} onChange={(e) => setProvider(e.target.value)} required />
        </div>
        <div>
          <Label>Type *</Label>
          <Select value={subscriptionType} onValueChange={(v) => setSubscriptionType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(subscriptionTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Coût mensuel (XAF) *</Label>
          <Input type="number" value={monthlyCost} onChange={(e) => setMonthlyCost(e.target.value)} required min="0" step="0.01" />
        </div>
        <div>
          <Label>Statut *</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(statusLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Date de début *</Label>
          <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div>
          <Label>Date de renouvellement *</Label>
          <Input type="date" value={renewalDate} onChange={(e) => setRenewalDate(e.target.value)} required />
        </div>
      </div>
      <div>
        <Label>Numéro de contrat</Label>
        <Input value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Contact (Nom)</Label>
          <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
        </div>
        <div>
          <Label>Téléphone</Label>
          <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
        </div>
      </div>
      <div>
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="bg-gradient-to-r from-green-600 to-emerald-600">
          {initialData ? 'Mettre à jour' : 'Créer'}
        </Button>
      </div>
    </form>
  );
};
