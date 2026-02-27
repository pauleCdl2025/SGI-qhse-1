import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Icon } from "@/components/Icon";
import { AES, AgentStatut, TypeExposition } from '@/types';
import { apiClient } from "@/integrations/api/client";
import { showError, showSuccess } from '@/utils/toast';

interface AESFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  aes?: AES | null;
  currentUserId?: string;
}

export const AESFormDialog = ({ isOpen, onClose, aes, currentUserId }: AESFormDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // A. Identification de l'agent exposé
  const [agent_nom, setAgent_nom] = useState('');
  const [agent_prenom, setAgent_prenom] = useState('');
  const [agent_matricule, setAgent_matricule] = useState('');
  const [agent_fonction, setAgent_fonction] = useState('');
  const [agent_service, setAgent_service] = useState('');
  const [agent_telephone, setAgent_telephone] = useState('');
  const [agent_statut, setAgent_statut] = useState<AgentStatut>('Personnel');
  
  // B. Informations sur l'accident
  const [date_aes, setDate_aes] = useState(new Date().toISOString().split('T')[0]);
  const [heure_aes, setHeure_aes] = useState(new Date().toTimeString().slice(0, 5));
  const [lieu_precis, setLieu_precis] = useState('');
  const [type_exposition, setType_exposition] = useState<TypeExposition>('Piqure');
  const [description_circonstances, setDescription_circonstances] = useState('');
  
  // C. Matériel ou produit en cause
  const [type_dispositif, setType_dispositif] = useState('');
  const [usage_unique, setUsage_unique] = useState<boolean | null>(null);
  const [souille_sang, setSouille_sang] = useState<boolean | null>(null);
  const [dans_sac_dasri, setDans_sac_dasri] = useState<boolean | null>(null);
  
  // D. Patient source
  const [patient_source_identifiee, setPatient_source_identifiee] = useState<boolean | null>(null);
  const [patient_code_identifiant, setPatient_code_identifiant] = useState('');
  const [consentement_prelevement, setConsentement_prelevement] = useState<boolean | null>(null);
  
  // E. Gestes immédiats
  const [lavage_eau_savon, setLavage_eau_savon] = useState<boolean | null>(null);
  const [desinfection, setDesinfection] = useState<boolean | null>(null);
  const [rinçage_muqueuse, setRinçage_muqueuse] = useState<boolean | null>(null);
  const [heure_premiers_soins, setHeure_premiers_soins] = useState('');
  
  // F. Prise en charge médicale
  const [medecin_referent_aes, setMedecin_referent_aes] = useState('');
  const [examen_vih, setExamen_vih] = useState(false);
  const [examen_vhb, setExamen_vhb] = useState(false);
  const [examen_vhc, setExamen_vhc] = useState(false);
  const [traitement_arv_initie, setTraitement_arv_initie] = useState<boolean | null>(null);
  const [date_debut_traitement, setDate_debut_traitement] = useState('');
  
  // G. Résultats biologiques
  const [resultat_agent_vih, setResultat_agent_vih] = useState<boolean | null>(null);
  const [resultat_agent_vhb, setResultat_agent_vhb] = useState<boolean | null>(null);
  const [resultat_agent_vhc, setResultat_agent_vhc] = useState<boolean | null>(null);
  const [resultat_patient_vih, setResultat_patient_vih] = useState<boolean | null>(null);
  const [resultat_patient_vhb, setResultat_patient_vhb] = useState<boolean | null>(null);
  const [resultat_patient_vhc, setResultat_patient_vhc] = useState<boolean | null>(null);
  const [conduite_tenir, setConduite_tenir] = useState('');
  
  // H. Suivi et accompagnement
  const [orientation_infectiologue, setOrientation_infectiologue] = useState<boolean | null>(null);
  const [orientation_psychologue, setOrientation_psychologue] = useState<boolean | null>(null);
  const [dates_suivi_prevues, setDates_suivi_prevues] = useState('');
  
  // I. Suivi médical
  const [suivi_m1_date, setSuivi_m1_date] = useState('');
  const [suivi_m1_vih, setSuivi_m1_vih] = useState<boolean | null>(null);
  const [suivi_m1_vhb, setSuivi_m1_vhb] = useState<boolean | null>(null);
  const [suivi_m1_vhc, setSuivi_m1_vhc] = useState<boolean | null>(null);
  const [suivi_m6_date, setSuivi_m6_date] = useState('');
  const [suivi_m6_vih, setSuivi_m6_vih] = useState<boolean | null>(null);
  const [suivi_m6_vhb, setSuivi_m6_vhb] = useState<boolean | null>(null);
  const [suivi_m6_vhc, setSuivi_m6_vhc] = useState<boolean | null>(null);
  const [suivi_m9_date, setSuivi_m9_date] = useState('');
  const [suivi_m9_vih, setSuivi_m9_vih] = useState<boolean | null>(null);
  const [suivi_m9_vhb, setSuivi_m9_vhb] = useState<boolean | null>(null);
  const [suivi_m9_vhc, setSuivi_m9_vhc] = useState<boolean | null>(null);
  
  // J. Clôture QHSE
  const [dossier_cloture, setDossier_cloture] = useState(false);
  const [date_cloture, setDate_cloture] = useState('');
  const [nom_signature_qhse, setNom_signature_qhse] = useState('');

  useEffect(() => {
    if (aes) {
      // Charger les données de l'AES existant
      setAgent_nom(aes.agent_nom);
      setAgent_prenom(aes.agent_prenom);
      setAgent_matricule(aes.agent_matricule || '');
      setAgent_fonction(aes.agent_fonction || '');
      setAgent_service(aes.agent_service || '');
      setAgent_telephone(aes.agent_telephone || '');
      setAgent_statut(aes.agent_statut);
      setDate_aes(aes.date_aes.toISOString().split('T')[0]);
      setHeure_aes(aes.heure_aes);
      setLieu_precis(aes.lieu_precis || '');
      setType_exposition(aes.type_exposition);
      setDescription_circonstances(aes.description_circonstances || '');
      setType_dispositif(aes.type_dispositif || '');
      setUsage_unique(aes.usage_unique ?? null);
      setSouille_sang(aes.souille_sang ?? null);
      setDans_sac_dasri(aes.dans_sac_dasri ?? null);
      setPatient_source_identifiee(aes.patient_source_identifiee ?? null);
      setPatient_code_identifiant(aes.patient_code_identifiant || '');
      setConsentement_prelevement(aes.consentement_prelevement ?? null);
      setLavage_eau_savon(aes.lavage_eau_savon ?? null);
      setDesinfection(aes.desinfection ?? null);
      setRinçage_muqueuse(aes.rinçage_muqueuse ?? null);
      setHeure_premiers_soins(aes.heure_premiers_soins || '');
      setMedecin_referent_aes(aes.medecin_referent_aes || '');
      setExamen_vih(aes.examen_vih || false);
      setExamen_vhb(aes.examen_vhb || false);
      setExamen_vhc(aes.examen_vhc || false);
      setTraitement_arv_initie(aes.traitement_arv_initie ?? null);
      setDate_debut_traitement(aes.date_debut_traitement ? aes.date_debut_traitement.toISOString().split('T')[0] : '');
      setResultat_agent_vih(aes.resultat_agent_vih ?? null);
      setResultat_agent_vhb(aes.resultat_agent_vhb ?? null);
      setResultat_agent_vhc(aes.resultat_agent_vhc ?? null);
      setResultat_patient_vih(aes.resultat_patient_vih ?? null);
      setResultat_patient_vhb(aes.resultat_patient_vhb ?? null);
      setResultat_patient_vhc(aes.resultat_patient_vhc ?? null);
      setConduite_tenir(aes.conduite_tenir || '');
      setOrientation_infectiologue(aes.orientation_infectiologue ?? null);
      setOrientation_psychologue(aes.orientation_psychologue ?? null);
      setDates_suivi_prevues(aes.dates_suivi_prevues || '');
      setSuivi_m1_date(aes.suivi_m1_date ? aes.suivi_m1_date.toISOString().split('T')[0] : '');
      setSuivi_m1_vih(aes.suivi_m1_vih ?? null);
      setSuivi_m1_vhb(aes.suivi_m1_vhb ?? null);
      setSuivi_m1_vhc(aes.suivi_m1_vhc ?? null);
      setSuivi_m6_date(aes.suivi_m6_date ? aes.suivi_m6_date.toISOString().split('T')[0] : '');
      setSuivi_m6_vih(aes.suivi_m6_vih ?? null);
      setSuivi_m6_vhb(aes.suivi_m6_vhb ?? null);
      setSuivi_m6_vhc(aes.suivi_m6_vhc ?? null);
      setSuivi_m9_date(aes.suivi_m9_date ? aes.suivi_m9_date.toISOString().split('T')[0] : '');
      setSuivi_m9_vih(aes.suivi_m9_vih ?? null);
      setSuivi_m9_vhb(aes.suivi_m9_vhb ?? null);
      setSuivi_m9_vhc(aes.suivi_m9_vhc ?? null);
      setDossier_cloture(aes.dossier_cloture);
      setDate_cloture(aes.date_cloture ? aes.date_cloture.toISOString().split('T')[0] : '');
      setNom_signature_qhse(aes.nom_signature_qhse || '');
    } else {
      // Réinitialiser le formulaire
      resetForm();
    }
  }, [aes, isOpen]);

  const resetForm = () => {
    setAgent_nom('');
    setAgent_prenom('');
    setAgent_matricule('');
    setAgent_fonction('');
    setAgent_service('');
    setAgent_telephone('');
    setAgent_statut('Personnel');
    setDate_aes(new Date().toISOString().split('T')[0]);
    setHeure_aes(new Date().toTimeString().slice(0, 5));
    setLieu_precis('');
    setType_exposition('Piqure');
    setDescription_circonstances('');
    setType_dispositif('');
    setUsage_unique(null);
    setSouille_sang(null);
    setDans_sac_dasri(null);
    setPatient_source_identifiee(null);
    setPatient_code_identifiant('');
    setConsentement_prelevement(null);
    setLavage_eau_savon(null);
    setDesinfection(null);
    setRinçage_muqueuse(null);
    setHeure_premiers_soins('');
    setMedecin_referent_aes('');
    setExamen_vih(false);
    setExamen_vhb(false);
    setExamen_vhc(false);
    setTraitement_arv_initie(null);
    setDate_debut_traitement('');
    setResultat_agent_vih(null);
    setResultat_agent_vhb(null);
    setResultat_agent_vhc(null);
    setResultat_patient_vih(null);
    setResultat_patient_vhb(null);
    setResultat_patient_vhc(null);
    setConduite_tenir('');
    setOrientation_infectiologue(null);
    setOrientation_psychologue(null);
    setDates_suivi_prevues('');
    setSuivi_m1_date('');
    setSuivi_m1_vih(null);
    setSuivi_m1_vhb(null);
    setSuivi_m1_vhc(null);
    setSuivi_m6_date('');
    setSuivi_m6_vih(null);
    setSuivi_m6_vhb(null);
    setSuivi_m6_vhc(null);
    setSuivi_m9_date('');
    setSuivi_m9_vih(null);
    setSuivi_m9_vhb(null);
    setSuivi_m9_vhc(null);
    setDossier_cloture(false);
    setDate_cloture('');
    setNom_signature_qhse('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!agent_nom || !agent_prenom || !date_aes || !heure_aes || !type_exposition) {
      showError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setIsSubmitting(true);
    try {
      const aesData = {
        agent_nom,
        agent_prenom,
        agent_matricule: agent_matricule || undefined,
        agent_fonction: agent_fonction || undefined,
        agent_service: agent_service || undefined,
        agent_telephone: agent_telephone || undefined,
        agent_statut,
        date_aes,
        heure_aes,
        lieu_precis: lieu_precis || undefined,
        type_exposition,
        description_circonstances: description_circonstances || undefined,
        type_dispositif: type_dispositif || undefined,
        usage_unique: usage_unique ?? undefined,
        souille_sang: souille_sang ?? undefined,
        dans_sac_dasri: dans_sac_dasri ?? undefined,
        patient_source_identifiee: patient_source_identifiee ?? undefined,
        patient_code_identifiant: patient_code_identifiant || undefined,
        consentement_prelevement: consentement_prelevement ?? undefined,
        lavage_eau_savon: lavage_eau_savon ?? undefined,
        desinfection: desinfection ?? undefined,
        rinçage_muqueuse: rinçage_muqueuse ?? undefined,
        heure_premiers_soins: heure_premiers_soins || undefined,
        medecin_referent_aes: medecin_referent_aes || undefined,
        examen_vih,
        examen_vhb,
        examen_vhc,
        traitement_arv_initie: traitement_arv_initie ?? undefined,
        date_debut_traitement: date_debut_traitement || undefined,
        resultat_agent_vih: resultat_agent_vih ?? undefined,
        resultat_agent_vhb: resultat_agent_vhb ?? undefined,
        resultat_agent_vhc: resultat_agent_vhc ?? undefined,
        resultat_patient_vih: resultat_patient_vih ?? undefined,
        resultat_patient_vhb: resultat_patient_vhb ?? undefined,
        resultat_patient_vhc: resultat_patient_vhc ?? undefined,
        conduite_tenir: conduite_tenir || undefined,
        orientation_infectiologue: orientation_infectiologue ?? undefined,
        orientation_psychologue: orientation_psychologue ?? undefined,
        dates_suivi_prevues: dates_suivi_prevues || undefined,
        suivi_m1_date: suivi_m1_date || undefined,
        suivi_m1_vih: suivi_m1_vih ?? undefined,
        suivi_m1_vhb: suivi_m1_vhb ?? undefined,
        suivi_m1_vhc: suivi_m1_vhc ?? undefined,
        suivi_m6_date: suivi_m6_date || undefined,
        suivi_m6_vih: suivi_m6_vih ?? undefined,
        suivi_m6_vhb: suivi_m6_vhb ?? undefined,
        suivi_m6_vhc: suivi_m6_vhc ?? undefined,
        suivi_m9_date: suivi_m9_date || undefined,
        suivi_m9_vih: suivi_m9_vih ?? undefined,
        suivi_m9_vhb: suivi_m9_vhb ?? undefined,
        suivi_m9_vhc: suivi_m9_vhc ?? undefined,
        dossier_cloture,
        date_cloture: date_cloture || undefined,
        nom_signature_qhse: nom_signature_qhse || undefined,
      };

      if (aes) {
        await apiClient.updateAES(aes.id, aesData);
        showSuccess("AES mis à jour avec succès.");
      } else {
        await apiClient.createAES(aesData);
        showSuccess("AES créé avec succès.");
      }
      onClose();
    } catch (error: any) {
      console.error("Error saving AES:", error);
      showError("Erreur lors de l'enregistrement de l'AES.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon name="Droplet" className="text-red-600" />
            {aes ? "Modifier l'AES" : "Nouvel Accident d'Exposition au Sang (AES)"}
          </DialogTitle>
          <DialogDescription>
            Formulaire FAES - Tous les champs marqués d'un * sont obligatoires
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Accordion type="multiple" defaultValue={['section-a', 'section-b']} className="w-full">
            {/* A. Identification de l'agent exposé */}
            <AccordionItem value="section-a">
              <AccordionTrigger>A. Identification de l'agent exposé</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Nom <span className="text-red-500">*</span></Label>
                    <Input value={agent_nom} onChange={(e) => setAgent_nom(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Prénom <span className="text-red-500">*</span></Label>
                    <Input value={agent_prenom} onChange={(e) => setAgent_prenom(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Matricule</Label>
                    <Input value={agent_matricule} onChange={(e) => setAgent_matricule(e.target.value)} />
                  </div>
                  <div>
                    <Label>Fonction</Label>
                    <Input value={agent_fonction} onChange={(e) => setAgent_fonction(e.target.value)} />
                  </div>
                  <div>
                    <Label>Service / Unité</Label>
                    <Input value={agent_service} onChange={(e) => setAgent_service(e.target.value)} />
                  </div>
                  <div>
                    <Label>Téléphone</Label>
                    <Input value={agent_telephone} onChange={(e) => setAgent_telephone(e.target.value)} />
                  </div>
                  <div>
                    <Label>Statut <span className="text-red-500">*</span></Label>
                    <Select value={agent_statut} onValueChange={(v) => setAgent_statut(v as AgentStatut)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Personnel">Personnel</SelectItem>
                        <SelectItem value="Stagiaire">Stagiaire</SelectItem>
                        <SelectItem value="Prestataire">Prestataire</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* B. Informations sur l'accident */}
            <AccordionItem value="section-b">
              <AccordionTrigger>B. Informations sur l'accident</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Date de l'AES <span className="text-red-500">*</span></Label>
                    <Input type="date" value={date_aes} onChange={(e) => setDate_aes(e.target.value)} required />
                  </div>
                  <div>
                    <Label>Heure de l'AES <span className="text-red-500">*</span></Label>
                    <Input type="time" value={heure_aes} onChange={(e) => setHeure_aes(e.target.value)} required />
                  </div>
                  <div className="col-span-2">
                    <Label>Lieu précis</Label>
                    <Input value={lieu_precis} onChange={(e) => setLieu_precis(e.target.value)} />
                  </div>
                  <div>
                    <Label>Type d'exposition <span className="text-red-500">*</span></Label>
                    <Select value={type_exposition} onValueChange={(v) => setType_exposition(v as TypeExposition)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Piqure">Piqure</SelectItem>
                        <SelectItem value="Coupure">Coupure</SelectItem>
                        <SelectItem value="Projection muqueuse">Projection muqueuse</SelectItem>
                        <SelectItem value="Contact peau lésée">Contact peau lésée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Description détaillée des circonstances</Label>
                    <Textarea value={description_circonstances} onChange={(e) => setDescription_circonstances(e.target.value)} rows={4} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* C. Matériel ou produit en cause */}
            <AccordionItem value="section-c">
              <AccordionTrigger>C. Matériel ou produit en cause</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Type de dispositif</Label>
                    <Input value={type_dispositif} onChange={(e) => setType_dispositif(e.target.value)} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="usage_unique" 
                      checked={usage_unique === true}
                      onCheckedChange={(checked) => setUsage_unique(checked === true ? true : checked === false ? false : null)}
                    />
                    <Label htmlFor="usage_unique">Était-il à usage unique ?</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="souille_sang" 
                      checked={souille_sang === true}
                      onCheckedChange={(checked) => setSouille_sang(checked === true ? true : checked === false ? false : null)}
                    />
                    <Label htmlFor="souille_sang">Était-il souillé de sang ou liquide biologique ?</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="dans_sac_dasri" 
                      checked={dans_sac_dasri === true}
                      onCheckedChange={(checked) => setDans_sac_dasri(checked === true ? true : checked === false ? false : null)}
                    />
                    <Label htmlFor="dans_sac_dasri">Était-il dans un sac DASRI ?</Label>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* D. Patient source */}
            <AccordionItem value="section-d">
              <AccordionTrigger>D. Patient source (si applicable)</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="patient_source_identifiee" 
                      checked={patient_source_identifiee === true}
                      onCheckedChange={(checked) => setPatient_source_identifiee(checked === true ? true : checked === false ? false : null)}
                    />
                    <Label htmlFor="patient_source_identifiee">Patient source identifiée</Label>
                  </div>
                  <div>
                    <Label>Code / Identifiant patient</Label>
                    <Input value={patient_code_identifiant} onChange={(e) => setPatient_code_identifiant(e.target.value)} />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="consentement_prelevement" 
                      checked={consentement_prelevement === true}
                      onCheckedChange={(checked) => setConsentement_prelevement(checked === true ? true : checked === false ? false : null)}
                    />
                    <Label htmlFor="consentement_prelevement">Consentement prélèvement</Label>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* E. Gestes immédiats */}
            <AccordionItem value="section-e">
              <AccordionTrigger>E. Gestes immédiats réalisés</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="lavage_eau_savon" 
                      checked={lavage_eau_savon === true}
                      onCheckedChange={(checked) => setLavage_eau_savon(checked === true ? true : checked === false ? false : null)}
                    />
                    <Label htmlFor="lavage_eau_savon">Lavage eau + savon</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="desinfection" 
                      checked={desinfection === true}
                      onCheckedChange={(checked) => setDesinfection(checked === true ? true : checked === false ? false : null)}
                    />
                    <Label htmlFor="desinfection">Désinfection</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="rinçage_muqueuse" 
                      checked={rinçage_muqueuse === true}
                      onCheckedChange={(checked) => setRinçage_muqueuse(checked === true ? true : checked === false ? false : null)}
                    />
                    <Label htmlFor="rinçage_muqueuse">Rinçage muqueuse</Label>
                  </div>
                  <div>
                    <Label>Heure des premiers soins</Label>
                    <Input type="time" value={heure_premiers_soins} onChange={(e) => setHeure_premiers_soins(e.target.value)} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* F. Prise en charge médicale */}
            <AccordionItem value="section-f">
              <AccordionTrigger>F. Prise en charge médicale</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Médecin référent AES</Label>
                    <Input
                      value={medecin_referent_aes}
                      onChange={(e) => setMedecin_referent_aes(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Examens prescrits</Label>
                    <div className="flex gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="examen_vih" checked={examen_vih} onCheckedChange={(checked) => setExamen_vih(checked === true)} />
                        <Label htmlFor="examen_vih">VIH</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="examen_vhb" checked={examen_vhb} onCheckedChange={(checked) => setExamen_vhb(checked === true)} />
                        <Label htmlFor="examen_vhb">VHB</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="examen_vhc" checked={examen_vhc} onCheckedChange={(checked) => setExamen_vhc(checked === true)} />
                        <Label htmlFor="examen_vhc">VHC</Label>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="traitement_arv_initie" 
                      checked={traitement_arv_initie === true}
                      onCheckedChange={(checked) => setTraitement_arv_initie(checked === true ? true : checked === false ? false : null)}
                    />
                    <Label htmlFor="traitement_arv_initie">Traitement ARV initié</Label>
                  </div>
                  <div>
                    <Label>Date de début traitement</Label>
                    <Input type="date" value={date_debut_traitement} onChange={(e) => setDate_debut_traitement(e.target.value)} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* G. Résultats biologiques */}
            <AccordionItem value="section-g">
              <AccordionTrigger>G. Résultats biologiques (confidentiel – médical)</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Résultats agent (Cochez si positif)</Label>
                    <div className="flex gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="resultat_agent_vih" checked={resultat_agent_vih === true} onCheckedChange={(checked) => setResultat_agent_vih(checked === true ? true : checked === false ? false : null)} />
                        <Label htmlFor="resultat_agent_vih">VIH</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="resultat_agent_vhb" checked={resultat_agent_vhb === true} onCheckedChange={(checked) => setResultat_agent_vhb(checked === true ? true : checked === false ? false : null)} />
                        <Label htmlFor="resultat_agent_vhb">VHB</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="resultat_agent_vhc" checked={resultat_agent_vhc === true} onCheckedChange={(checked) => setResultat_agent_vhc(checked === true ? true : checked === false ? false : null)} />
                        <Label htmlFor="resultat_agent_vhc">VHC</Label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label>Résultats patient source (Cochez si positif)</Label>
                    <div className="flex gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox id="resultat_patient_vih" checked={resultat_patient_vih === true} onCheckedChange={(checked) => setResultat_patient_vih(checked === true ? true : checked === false ? false : null)} />
                        <Label htmlFor="resultat_patient_vih">VIH</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="resultat_patient_vhb" checked={resultat_patient_vhb === true} onCheckedChange={(checked) => setResultat_patient_vhb(checked === true ? true : checked === false ? false : null)} />
                        <Label htmlFor="resultat_patient_vhb">VHB</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox id="resultat_patient_vhc" checked={resultat_patient_vhc === true} onCheckedChange={(checked) => setResultat_patient_vhc(checked === true ? true : checked === false ? false : null)} />
                        <Label htmlFor="resultat_patient_vhc">VHC</Label>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <Label>Conduite à tenir décidée</Label>
                    <Textarea value={conduite_tenir} onChange={(e) => setConduite_tenir(e.target.value)} rows={3} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* H. Suivi et accompagnement */}
            <AccordionItem value="section-h">
              <AccordionTrigger>H. Suivi et accompagnement</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="orientation_infectiologue" 
                      checked={orientation_infectiologue === true}
                      onCheckedChange={(checked) => setOrientation_infectiologue(checked === true ? true : checked === false ? false : null)}
                    />
                    <Label htmlFor="orientation_infectiologue">Orientation infectiologue</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="orientation_psychologue" 
                      checked={orientation_psychologue === true}
                      onCheckedChange={(checked) => setOrientation_psychologue(checked === true ? true : checked === false ? false : null)}
                    />
                    <Label htmlFor="orientation_psychologue">Orientation psychologue</Label>
                  </div>
                  <div className="col-span-2">
                    <Label>Dates de suivi prévues</Label>
                    <Textarea value={dates_suivi_prevues} onChange={(e) => setDates_suivi_prevues(e.target.value)} rows={2} placeholder="Ex: M+1: 15/02/2026, M+6: 15/07/2026" />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* I. Suivi médical */}
            <AccordionItem value="section-i">
              <AccordionTrigger>I. Suivi médical</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="space-y-4">
                  <div className="border p-4 rounded">
                    <h4 className="font-semibold mb-2">Suivi à M+1</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date</Label>
                        <Input type="date" value={suivi_m1_date} onChange={(e) => setSuivi_m1_date(e.target.value)} />
                      </div>
                      <div>
                        <Label>Résultats agent (Cochez si positif)</Label>
                        <div className="flex gap-4 mt-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="suivi_m1_vih" checked={suivi_m1_vih === true} onCheckedChange={(checked) => setSuivi_m1_vih(checked === true ? true : checked === false ? false : null)} />
                            <Label htmlFor="suivi_m1_vih">VIH</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="suivi_m1_vhb" checked={suivi_m1_vhb === true} onCheckedChange={(checked) => setSuivi_m1_vhb(checked === true ? true : checked === false ? false : null)} />
                            <Label htmlFor="suivi_m1_vhb">VHB</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="suivi_m1_vhc" checked={suivi_m1_vhc === true} onCheckedChange={(checked) => setSuivi_m1_vhc(checked === true ? true : checked === false ? false : null)} />
                            <Label htmlFor="suivi_m1_vhc">VHC</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border p-4 rounded">
                    <h4 className="font-semibold mb-2">Suivi à M+6</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date</Label>
                        <Input type="date" value={suivi_m6_date} onChange={(e) => setSuivi_m6_date(e.target.value)} />
                      </div>
                      <div>
                        <Label>Résultats agent (Cochez si positif)</Label>
                        <div className="flex gap-4 mt-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="suivi_m6_vih" checked={suivi_m6_vih === true} onCheckedChange={(checked) => setSuivi_m6_vih(checked === true ? true : checked === false ? false : null)} />
                            <Label htmlFor="suivi_m6_vih">VIH</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="suivi_m6_vhb" checked={suivi_m6_vhb === true} onCheckedChange={(checked) => setSuivi_m6_vhb(checked === true ? true : checked === false ? false : null)} />
                            <Label htmlFor="suivi_m6_vhb">VHB</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="suivi_m6_vhc" checked={suivi_m6_vhc === true} onCheckedChange={(checked) => setSuivi_m6_vhc(checked === true ? true : checked === false ? false : null)} />
                            <Label htmlFor="suivi_m6_vhc">VHC</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="border p-4 rounded">
                    <h4 className="font-semibold mb-2">Suivi à M+9</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Date</Label>
                        <Input type="date" value={suivi_m9_date} onChange={(e) => setSuivi_m9_date(e.target.value)} />
                      </div>
                      <div>
                        <Label>Résultats agent (Cochez si positif)</Label>
                        <div className="flex gap-4 mt-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="suivi_m9_vih" checked={suivi_m9_vih === true} onCheckedChange={(checked) => setSuivi_m9_vih(checked === true ? true : checked === false ? false : null)} />
                            <Label htmlFor="suivi_m9_vih">VIH</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="suivi_m9_vhb" checked={suivi_m9_vhb === true} onCheckedChange={(checked) => setSuivi_m9_vhb(checked === true ? true : checked === false ? false : null)} />
                            <Label htmlFor="suivi_m9_vhb">VHB</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="suivi_m9_vhc" checked={suivi_m9_vhc === true} onCheckedChange={(checked) => setSuivi_m9_vhc(checked === true ? true : checked === false ? false : null)} />
                            <Label htmlFor="suivi_m9_vhc">VHC</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* J. Clôture QHSE */}
            <AccordionItem value="section-j">
              <AccordionTrigger>J. Clôture QHSE</AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="dossier_cloture" 
                      checked={dossier_cloture}
                      onCheckedChange={(checked) => setDossier_cloture(checked === true)}
                    />
                    <Label htmlFor="dossier_cloture">Dossier AES clôturé</Label>
                  </div>
                  <div>
                    <Label>Date de clôture</Label>
                    <Input type="date" value={date_cloture} onChange={(e) => setDate_cloture(e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <Label>Nom et signature QHSE</Label>
                    <Input value={nom_signature_qhse} onChange={(e) => setNom_signature_qhse(e.target.value)} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Icon name={isSubmitting ? "Loader2" : "Save"} className={`mr-2 h-4 w-4 ${isSubmitting ? 'animate-spin' : ''}`} />
              {isSubmitting ? "Enregistrement..." : aes ? "Modifier" : "Créer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
