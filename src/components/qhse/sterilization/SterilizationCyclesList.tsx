import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { SterilizationCycle, CycleStatus, CycleResult } from "@/types";
import { showSuccess, showError } from "@/utils/toast";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFilterAndSearch } from "@/components/shared/SearchAndFilter";
import { LoadingSpinner } from "@/components/shared/Loading";
import { supabase } from "@/integrations/supabase/client";

const statusLabels: Record<CycleStatus, string> = {
  en_cours: "En cours",
  terminé: "Terminé",
  échoué: "Échoué",
  annulé: "Annulé",
};

const statusColors: Record<CycleStatus, string> = {
  en_cours: "bg-yellow-100 text-yellow-700",
  terminé: "bg-green-100 text-green-700",
  échoué: "bg-red-100 text-red-700",
  annulé: "bg-gray-100 text-gray-700",
};

const resultLabels: Record<CycleResult, string> = {
  conforme: "Conforme",
  non_conforme: "Non conforme",
  en_attente: "En attente",
};

const resultColors: Record<CycleResult, string> = {
  conforme: "bg-green-100 text-green-700",
  non_conforme: "bg-red-100 text-red-700",
  en_attente: "bg-yellow-100 text-yellow-700",
};

export const SterilizationCyclesList = () => {
  const [cycles, setCycles] = useState<SterilizationCycle[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { filteredData: filteredCycles, searchQuery, setSearchQuery } = useFilterAndSearch(
    cycles,
    ['cycle_number', 'sterilizer_id', 'batch_number']
  );

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sterilization_cycles')
        .select('*')
        .order('start_time', { ascending: false });

      if (error) {
        throw error;
      }

      setCycles(data.map((cycle: any) => ({
        ...cycle,
        start_time: new Date(cycle.start_time),
        end_time: cycle.end_time ? new Date(cycle.end_time) : undefined,
        created_at: new Date(cycle.created_at),
        updated_at: new Date(cycle.updated_at),
      })));
    } catch (error: any) {
      showError("Erreur lors du chargement des cycles: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCycle = async (cycleData: any) => {
    try {
      const { error } = await supabase.from('sterilization_cycles').insert([cycleData]);

      if (error) {
        throw error;
      }

      showSuccess("Cycle de stérilisation démarré avec succès");
      setIsDialogOpen(false);
      fetchCycles();
    } catch (error: any) {
      showError("Erreur lors de la création: " + error.message);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center">
          <Icon name="Droplet" className="text-cyan-600 mr-2" />
          Suivi Stérilisation & Linge
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">
              <Icon name="Plus" className="mr-2 h-4 w-4" /> Nouveau Cycle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Démarrer un nouveau cycle de stérilisation</DialogTitle>
            </DialogHeader>
            <CycleForm onSubmit={handleCreateCycle} onCancel={() => setIsDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <div className="relative">
            <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par numéro de cycle, stérilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Numéro</TableHead>
              <TableHead>Stérilisateur</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Début</TableHead>
              <TableHead>Durée (min)</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Résultat</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredCycles.length > 0 ? filteredCycles.map((cycle) => (
              <TableRow key={cycle.id}>
                <TableCell className="font-mono font-medium">{cycle.cycle_number}</TableCell>
                <TableCell>{cycle.sterilizer_id}</TableCell>
                <TableCell>{cycle.sterilizer_type}</TableCell>
                <TableCell>{format(cycle.start_time, 'dd/MM/yyyy HH:mm')}</TableCell>
                <TableCell>{cycle.duration_minutes || '-'}</TableCell>
                <TableCell>
                  <Badge className={statusColors[cycle.status]}>
                    {statusLabels[cycle.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={resultColors[cycle.result]}>
                    {resultLabels[cycle.result]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button size="sm" variant="outline">
                    <Icon name="Eye" className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Icon name="Droplet" className="mx-auto text-4xl text-gray-300 mb-2" />
                  {searchQuery ? 'Aucun cycle ne correspond à votre recherche.' : 'Aucun cycle enregistré.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const CycleForm = ({ onSubmit, onCancel }: { onSubmit: (data: any) => void; onCancel: () => void }) => {
  const [cycleNumber, setCycleNumber] = useState('');
  const [sterilizerId, setSterilizerId] = useState('');
  const [sterilizerType, setSterilizerType] = useState<'autoclave' | 'ETO' | 'plasma' | 'peroxyde'>('autoclave');
  const [cycleType, setCycleType] = useState<'stérilisation' | 'désinfection' | 'préventif'>('stérilisation');
  const [programName, setProgramName] = useState('');
  const [temperature, setTemperature] = useState('');
  const [pressure, setPressure] = useState('');
  const [batchNumber, setBatchNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      cycle_number: cycleNumber,
      sterilizer_id: sterilizerId,
      sterilizer_type: sterilizerType,
      cycle_type: cycleType,
      program_name: programName || null,
      temperature: temperature ? parseFloat(temperature) : null,
      pressure: pressure ? parseFloat(pressure) : null,
      batch_number: batchNumber || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Numéro de cycle *</Label>
          <Input value={cycleNumber} onChange={(e) => setCycleNumber(e.target.value)} required />
        </div>
        <div>
          <Label>ID Stérilisateur *</Label>
          <Input value={sterilizerId} onChange={(e) => setSterilizerId(e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type de stérilisateur *</Label>
          <Select value={sterilizerType} onValueChange={(v) => setSterilizerType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="autoclave">Autoclave</SelectItem>
              <SelectItem value="ETO">ETO</SelectItem>
              <SelectItem value="plasma">Plasma</SelectItem>
              <SelectItem value="peroxyde">Peroxyde</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Type de cycle *</Label>
          <Select value={cycleType} onValueChange={(v) => setCycleType(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="stérilisation">Stérilisation</SelectItem>
              <SelectItem value="désinfection">Désinfection</SelectItem>
              <SelectItem value="préventif">Préventif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Programme</Label>
          <Input value={programName} onChange={(e) => setProgramName(e.target.value)} />
        </div>
        <div>
          <Label>Numéro de lot</Label>
          <Input value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Température (°C)</Label>
          <Input type="number" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
        </div>
        <div>
          <Label>Pression (bar)</Label>
          <Input type="number" step="0.1" value={pressure} onChange={(e) => setPressure(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">Démarrer</Button>
      </div>
    </form>
  );
};









