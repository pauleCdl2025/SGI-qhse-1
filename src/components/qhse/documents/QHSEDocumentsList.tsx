import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/Icon";
import { QHSEDocument, DocumentType, DocumentStatus, User } from "@/types";
import { showSuccess, showError, showWarning, showInfo } from "@/utils/toast";
import { differenceInCalendarDays, format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useFilterAndSearch } from "@/components/shared/SearchAndFilter";
import { LoadingSpinner } from "@/components/shared/Loading";
import { supabase } from "@/integrations/supabase/client";
import { DOCUMENT_TYPES, PROCESSUS_CODES, PROCESSUS_BY_CATEGORY, generateDocumentCode } from "@/lib/document-coding";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { fr } from "date-fns/locale";

interface QHSEDocumentsListProps {
  currentUser?: { username: string; details: User } | null;
}

const documentTypeLabels: Record<DocumentType, string> = {
  procedure: "Procédure",
  instruction: "Instruction",
  registre: "Registre",
  rapport: "Rapport",
  audit: "Audit",
  formation: "Formation",
  autre: "Autre",
  POL: "Politique",
  PROC: "Procédure",
  PROT: "Protocole",
  FP: "Fiche de poste",
  FT: "Fiche technique",
  FORM: "Formulaire",
  ANN: "Annexe",
};

const statusLabels: Record<DocumentStatus, string> = {
  brouillon: "Brouillon",
  en_validation: "En validation",
  validé: "Validé",
  obsolète: "Obsolète",
  archivé: "Archivé",
};

const statusColors: Record<DocumentStatus, string> = {
  brouillon: "bg-gray-100 text-gray-700",
  en_validation: "bg-yellow-100 text-yellow-700",
  validé: "bg-green-100 text-green-700",
  obsolète: "bg-red-100 text-red-700",
  archivé: "bg-blue-100 text-blue-700",
};

export const QHSEDocumentsList = ({ currentUser }: QHSEDocumentsListProps) => {
  const [documents, setDocuments] = useState<QHSEDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const tableRef = useRef<HTMLDivElement | null>(null);
  const hasShownLifecycleAlerts = useRef(false);

  // Vérifier si l'utilisateur peut valider des documents (seulement superviseur QHSE et superadmin)
  const canValidateDocuments =
    currentUser?.details.role === 'superviseur_qhse' ||
    currentUser?.details.role === 'superadmin' ||
    currentUser?.details.role === 'dop';

  const { filteredData: filteredDocuments, searchQuery, setSearchQuery } = useFilterAndSearch(
    documents,
    ['title', 'code', 'category', 'processus', 'sous_processus', 'description', 'lifecycle_note']
  );

  const pendingValidation = useMemo(
    () => documents.filter((doc) => doc.status === 'en_validation'),
    [documents]
  );

  const expiredDocuments = useMemo(() => {
    const today = new Date();
    return documents.filter(
      (doc) =>
        doc.validity_date &&
        doc.validity_date < today &&
        doc.status !== 'archivé'
    );
  }, [documents]);

  const expiringSoonDocuments = useMemo(() => {
    const today = new Date();
    return documents.filter((doc) => {
      if (!doc.validity_date || doc.status === 'archivé') {
        return false;
      }
      const days = differenceInCalendarDays(doc.validity_date, today);
      return days >= 0 && days <= 30;
    });
  }, [documents]);

  const reviewDueSoonDocuments = useMemo(() => {
    const today = new Date();
    return documents.filter((doc) => {
      if (!doc.review_date || doc.status === 'archivé') {
        return false;
      }
      const days = differenceInCalendarDays(doc.review_date, today);
      return days <= 30;
    });
  }, [documents]);

  const lifecycleStats = useMemo(() => {
    const total = documents.length;
    const validated = documents.filter((doc) => doc.status === 'validé').length;
    const obsoletes = documents.filter((doc) => doc.status === 'obsolète').length;
    const archived = documents.filter((doc) => doc.status === 'archivé').length;
    const displayed = documents.filter((doc) => doc.is_displayed).length;

    return {
      total,
      validated,
      obsoletes,
      archived,
      displayed,
      complianceRate: total > 0 ? Math.round((validated / total) * 100) : 0,
    };
  }, [documents]);

  const documentsPerMonth = useMemo(() => {
    const monthMap = new Map<
      string,
      { key: string; label: string; count: number }
    >();

    documents.forEach((doc) => {
      const key = format(doc.created_at, 'yyyy-MM');
      const label = format(doc.created_at, 'MMM yyyy', { locale: fr });
      if (!monthMap.has(key)) {
        monthMap.set(key, { key, label, count: 0 });
      }
      const bucket = monthMap.get(key);
      if (bucket) {
        bucket.count += 1;
      }
    });

    return Array.from(monthMap.values())
      .sort((a, b) => (a.key > b.key ? 1 : -1))
      .slice(-6);
  }, [documents]);

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (
      !loading &&
      !hasShownLifecycleAlerts.current &&
      documents.length > 0
    ) {
      if (pendingValidation.length > 0) {
        showWarning(`${pendingValidation.length} document(s) en attente de validation.`);
      }

      if (expiringSoonDocuments.length > 0) {
        showInfo(`${expiringSoonDocuments.length} document(s) arrivent à échéance dans les 30 prochains jours.`);
      }

      if (expiredDocuments.length > 0) {
        showWarning(`${expiredDocuments.length} document(s) ont dépassé leur date de validité.`);
      }

      hasShownLifecycleAlerts.current = true;
    }
  }, [
    loading,
    documents.length,
    pendingValidation.length,
    expiringSoonDocuments.length,
    expiredDocuments.length,
  ]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('qhse_documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }
      setDocuments(data.map((doc: any) => ({
        ...doc,
        created_at: new Date(doc.created_at),
        updated_at: new Date(doc.updated_at),
        validation_date: doc.validation_date ? new Date(doc.validation_date) : undefined,
        effective_date: doc.effective_date ? new Date(doc.effective_date) : undefined,
        review_date: doc.review_date ? new Date(doc.review_date) : undefined,
        validity_date: doc.validity_date ? new Date(doc.validity_date) : undefined,
        archived_at: doc.archived_at ? new Date(doc.archived_at) : undefined,
        is_displayed: doc.is_displayed === 1 || doc.is_displayed === true,
        lifecycle_note: doc.lifecycle_note || undefined,
      })));
    } catch (error: any) {
      showError("Erreur lors du chargement des documents: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDocument = async (formData: FormData) => {
    try {
      const plain: any = {};
      formData.forEach((value, key) => {
        plain[key] = value;
      });

      const { error } = await supabase.from('qhse_documents').insert([plain]);

      if (error) {
        throw error;
      }
      showSuccess("Document créé avec succès");
      setIsDialogOpen(false);
      fetchDocuments();
    } catch (error: any) {
      showError("Erreur lors de la création: " + error.message);
    }
  };

  const handleUpdateStatus = async (id: string, status: DocumentStatus) => {
    try {
      const { error } = await supabase
        .from('qhse_documents')
        .update({ status })
        .eq('id', id);

      if (error) {
        throw error;
      }
      showSuccess("Statut mis à jour");
      fetchDocuments();
    } catch (error: any) {
      showError("Erreur lors de la mise à jour: " + error.message);
    }
  };

  const handleValidateDocument = async (id: string) => {
    if (!canValidateDocuments) {
      showError("Vous n'avez pas les permissions pour valider ce document. Seuls le Service Qualité (QHSE) et la Direction Opérationnelle peuvent valider les documents.");
      return;
    }

    try {
      const { error } = await supabase
        .from('qhse_documents')
        .update({ status: 'validé' })
        .eq('id', id);

      if (error) {
        throw error;
      }
      showSuccess("Document validé avec succès");
      fetchDocuments();
    } catch (error: any) {
      showError("Erreur lors de la validation: " + error.message);
    }
  };

  const exportToExcel = () => {
    if (documents.length === 0) {
      showWarning("Aucun document à exporter.");
      return;
    }

    const workbook = XLSX.utils.book_new();
    const sheetData = documents.map((doc) => ({
      Code: doc.code || '',
      "Nom du document": doc.title,
      Type: documentTypeLabels[doc.document_type],
      Processus: doc.processus || '',
      "Sous-processus": doc.sous_processus || '',
      Version: doc.version,
      "Date de validité": doc.validity_date ? format(doc.validity_date, 'dd/MM/yyyy') : '',
      "Responsable révision": doc.revision_responsible || '',
      Statut: statusLabels[doc.status],
      "Validé par": doc.validated_by_name || doc.validated_by || '',
      "Date validation": doc.validation_date ? format(doc.validation_date, 'dd/MM/yyyy HH:mm') : '',
      "Date archivage": doc.archived_at ? format(doc.archived_at, 'dd/MM/yyyy HH:mm') : '',
      "Document affiché": doc.is_displayed ? 'Oui' : 'Non',
      "Lieu d'affichage": doc.display_location || '',
      "Date de création": format(doc.created_at, 'dd/MM/yyyy'),
      "Note cycle de vie": doc.lifecycle_note || '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(sheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Documents');
    const fileSuffix = format(new Date(), 'yyyyMMdd');
    XLSX.writeFile(workbook, `GED_${fileSuffix}.xlsx`);
    showSuccess('Export Excel généré.');
  };

  const exportToPDF = async () => {
    if (!tableRef.current || documents.length === 0) {
      showWarning("Aucun document à exporter.");
      return;
    }

    try {
      setIsExportingPdf(true);
      const canvas = await html2canvas(tableRef.current, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      let position = 0;
      let heightLeft = pdfHeight;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      const fileSuffix = format(new Date(), 'yyyyMMdd');
      pdf.save(`GED_${fileSuffix}.pdf`);
      showSuccess('Export PDF généré.');
    } catch (error) {
      console.error('Erreur export PDF:', error);
      showError("Erreur lors de l'export PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center">
          <Icon name="FileText" className="text-cyan-600 mr-2" />
          Gestion Documentaire (GED QHSE)
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={exportToExcel}
            disabled={documents.length === 0}
          >
            <Icon name="FileSpreadsheet" className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={exportToPDF}
            disabled={documents.length === 0 || isExportingPdf}
          >
            <Icon name="FileDown" className="mr-2 h-4 w-4" />
            {isExportingPdf ? 'Export en cours...' : 'Export PDF'}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600 hover:from-cyan-700 hover:via-blue-700 hover:to-teal-700">
                <Icon name="Plus" className="mr-2 h-4 w-4" /> Nouveau Document
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Créer un nouveau document</DialogTitle>
                <DialogDescription>
                  Remplissez le formulaire ci-dessous pour créer un nouveau document QHSE.
                </DialogDescription>
              </DialogHeader>
              <DocumentForm onSubmit={handleCreateDocument} onCancel={() => setIsDialogOpen(false)} existingDocuments={documents} />
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {(pendingValidation.length > 0 ||
          expiringSoonDocuments.length > 0 ||
          expiredDocuments.length > 0 ||
          reviewDueSoonDocuments.length > 0) && (
          <div className="grid gap-3 mb-6">
            {pendingValidation.length > 0 && (
              <Alert variant="warning">
                <Icon name="AlertTriangle" className="h-4 w-4" />
                <AlertTitle>Documents en attente de validation</AlertTitle>
                <AlertDescription>
                  {pendingValidation.length} document(s) doivent être validés&nbsp;:{" "}
                  {pendingValidation
                    .slice(0, 3)
                    .map((doc) => doc.code || doc.title)
                    .join(", ")}
                  {pendingValidation.length > 3 ? "..." : "."}
                </AlertDescription>
              </Alert>
            )}

            {expiringSoonDocuments.length > 0 && (
              <Alert variant="default">
                <Icon name="CalendarClock" className="h-4 w-4" />
                <AlertTitle>Échéances à venir</AlertTitle>
                <AlertDescription>
                  {expiringSoonDocuments.length} document(s) expirent dans les 30 prochains jours.
                </AlertDescription>
              </Alert>
            )}

            {expiredDocuments.length > 0 && (
              <Alert variant="destructive">
                <Icon name="AlarmClock" className="h-4 w-4" />
                <AlertTitle>Validité dépassée</AlertTitle>
                <AlertDescription>
                  {expiredDocuments.length} document(s) ont dépassé leur date de validité et ont été placés en obsolescence automatique.
                </AlertDescription>
              </Alert>
            )}

            {reviewDueSoonDocuments.length > 0 && (
              <Alert variant="default">
                <Icon name="RotateCcw" className="h-4 w-4" />
                <AlertTitle>Révisions à planifier</AlertTitle>
                <AlertDescription>
                  {reviewDueSoonDocuments.length} document(s) doivent être révisés (échéance dans 30 jours ou déjà dépassée).
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        <div className="mb-6 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Documents totaux</p>
              <p className="text-2xl font-semibold">{lifecycleStats.total}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Taux de conformité</p>
              <p className="text-2xl font-semibold">{lifecycleStats.complianceRate}%</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Documents obsolètes</p>
              <p className="text-2xl font-semibold">{lifecycleStats.obsoletes}</p>
            </div>
            <div className="rounded-lg border bg-muted/40 p-4">
              <p className="text-sm text-muted-foreground">Documents archivés</p>
              <p className="text-2xl font-semibold">{lifecycleStats.archived}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {lifecycleStats.displayed} document(s) affiché(s) actuellement.
              </p>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold">Créations des 6 derniers mois</h3>
              <span className="text-sm text-muted-foreground">Volume mensuel</span>
            </div>
            {documentsPerMonth.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={documentsPerMonth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0891b2" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucun document enregistré sur les 6 derniers mois.
              </p>
            )}
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Icon name="Search" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Rechercher par titre, catégorie..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div ref={tableRef} className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Nom du document</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Processus</TableHead>
                <TableHead>Sous-processus</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Date de validité</TableHead>
                <TableHead>Responsable révision</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Validé par</TableHead>
                <TableHead>Date validation</TableHead>
                <TableHead>Date archivage</TableHead>
                <TableHead>Document affiché</TableHead>
                <TableHead>Lieu d'affichage</TableHead>
                <TableHead>Date création</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocuments.length > 0 ? filteredDocuments.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.code || '-'}</TableCell>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell>{documentTypeLabels[doc.document_type]}</TableCell>
                  <TableCell>{doc.processus || '-'}</TableCell>
                  <TableCell>{doc.sous_processus || '-'}</TableCell>
                  <TableCell><Badge variant="outline">{doc.version}</Badge></TableCell>
                  <TableCell>{doc.validity_date ? format(doc.validity_date, 'dd/MM/yyyy') : '-'}</TableCell>
                  <TableCell>{doc.revision_responsible || '-'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge className={statusColors[doc.status]}>
                        {statusLabels[doc.status]}
                      </Badge>
                      {doc.lifecycle_note && (
                        <span className="text-xs text-muted-foreground">{doc.lifecycle_note}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{doc.validated_by_name || doc.validated_by || '-'}</TableCell>
                  <TableCell>{doc.validation_date ? format(doc.validation_date, 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                  <TableCell>{doc.archived_at ? format(doc.archived_at, 'dd/MM/yyyy HH:mm') : '-'}</TableCell>
                  <TableCell>
                    {doc.is_displayed ? (
                      <Badge className="bg-green-100 text-green-700">Oui</Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-700">Non</Badge>
                    )}
                  </TableCell>
                  <TableCell>{doc.display_location || '-'}</TableCell>
                  <TableCell>{format(doc.created_at, 'dd/MM/yyyy')}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      {doc.status === 'brouillon' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleUpdateStatus(doc.id, 'en_validation')}
                        >
                          Envoyer en validation
                        </Button>
                      )}
                      {doc.status === 'en_validation' && canValidateDocuments && (
                        <Button
                          size="sm"
                          variant="default"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleValidateDocument(doc.id)}
                        >
                          <Icon name="Check" className="mr-1 h-4 w-4" />
                          Valider
                        </Button>
                      )}
                      {doc.file_path && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`http://localhost:3001${doc.file_path}`, '_blank')}
                        >
                          <Icon name="Download" className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={16} className="py-8 text-center">
                    <Icon name="FileText" className="mx-auto mb-2 text-4xl text-gray-300" />
                    {searchQuery ? 'Aucun document ne correspond à votre recherche.' : 'Aucun document enregistré.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

const DocumentForm = ({ onSubmit, onCancel, existingDocuments }: { onSubmit: (formData: FormData) => void; onCancel: () => void; existingDocuments: QHSEDocument[] }) => {
  const [title, setTitle] = useState('');
  const [code, setCode] = useState('');
  const [documentType, setDocumentType] = useState<DocumentType>('PROC');
  const [processusCode, setProcessusCode] = useState('');
  const [processus, setProcessus] = useState('');
  const [sousProcessus, setSousProcessus] = useState('');
  const [category, setCategory] = useState('');
  const [version, setVersion] = useState('01');
  const [description, setDescription] = useState('');
  const [accessLevel, setAccessLevel] = useState<'public' | 'interne' | 'confidentiel'>('interne');
  const [validityDate, setValidityDate] = useState('');
  const [isDisplayed, setIsDisplayed] = useState(false);
  const [displayLocation, setDisplayLocation] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [autoGenerateCode, setAutoGenerateCode] = useState(true);

  // Générer automatiquement le code quand le processus ou le type change
  useEffect(() => {
    if (autoGenerateCode && processusCode && documentType) {
      const existingCodes = existingDocuments.map(doc => doc.code || '').filter(Boolean);
      const generatedCode = generateDocumentCode(processusCode, documentType, existingCodes);
      setCode(generatedCode);
    }
  }, [processusCode, documentType, autoGenerateCode, existingDocuments]);

  // Mettre à jour le processus quand le code processus change
  useEffect(() => {
    if (processusCode && PROCESSUS_CODES[processusCode as keyof typeof PROCESSUS_CODES]) {
      const processusInfo = PROCESSUS_CODES[processusCode as keyof typeof PROCESSUS_CODES];
      setProcessus(processusInfo.label);
      setCategory(processusInfo.category);
    }
  }, [processusCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('title', title);
    formData.append('code', code);
    formData.append('document_type', documentType);
    formData.append('processus', processus);
    formData.append('sous_processus', sousProcessus);
    formData.append('category', category);
    formData.append('version', version);
    formData.append('description', description);
    formData.append('access_level', accessLevel);
    if (validityDate) {
      formData.append('validity_date', validityDate);
    }
    formData.append('is_displayed', isDisplayed.toString());
    formData.append('display_location', displayLocation);
    if (file) {
      formData.append('file', file);
    }
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nom du document *</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div>
          <Label>Code {autoGenerateCode && '(Généré automatiquement)'}</Label>
          <div className="flex gap-2">
            <Input 
              value={code} 
              onChange={(e) => setCode(e.target.value)} 
              placeholder="Ex: QGR-PROC-001"
              disabled={autoGenerateCode}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAutoGenerateCode(!autoGenerateCode)}
            >
              {autoGenerateCode ? 'Manuel' : 'Auto'}
            </Button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Type de document *</Label>
          <Select value={documentType} onValueChange={(v) => setDocumentType(v as DocumentType)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(DOCUMENT_TYPES).map(([key, docType]) => (
                <SelectItem key={key} value={docType.code as DocumentType}>
                  {docType.label} ({docType.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Processus/Thématique *</Label>
          <Select value={processusCode} onValueChange={setProcessusCode}>
            <SelectTrigger><SelectValue placeholder="Sélectionner un processus" /></SelectTrigger>
            <SelectContent>
              {Object.entries(PROCESSUS_BY_CATEGORY).map(([category, processusList]) => (
                <div key={category}>
                  <div className="px-2 py-1 text-xs font-semibold text-gray-500 bg-gray-100">{category}</div>
                  {processusList.map((proc) => (
                    <SelectItem key={proc.code} value={proc.code}>
                      {proc.label} ({proc.code})
                    </SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Processus</Label>
          <Input value={processus} onChange={(e) => setProcessus(e.target.value)} placeholder="Ex: Qualité et gestion des risques" disabled />
        </div>
        <div>
          <Label>Sous-processus</Label>
          <Input value={sousProcessus} onChange={(e) => setSousProcessus(e.target.value)} placeholder="Ex: Management" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label>Catégorie</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} disabled />
        </div>
        <div>
          <Label>Version</Label>
          <Input value={version} onChange={(e) => setVersion(e.target.value)} placeholder="01" />
        </div>
        <div>
          <Label>Date de validité</Label>
          <Input 
            type="date" 
            value={validityDate} 
            onChange={(e) => setValidityDate(e.target.value)} 
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Niveau d'accès</Label>
          <Select value={accessLevel} onValueChange={(v) => setAccessLevel(v as any)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="public">Public</SelectItem>
              <SelectItem value="interne">Interne</SelectItem>
              <SelectItem value="confidentiel">Confidentiel</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Document affiché</Label>
          <div className="flex items-center space-x-2 mt-2">
            <input
              type="checkbox"
              checked={isDisplayed}
              onChange={(e) => setIsDisplayed(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-600">Afficher ce document</span>
          </div>
        </div>
      </div>
      {isDisplayed && (
        <div>
          <Label>Lieu d'affichage</Label>
          <Input 
            value={displayLocation} 
            onChange={(e) => setDisplayLocation(e.target.value)} 
            placeholder="Ex: Hall d'entrée, Service QHSE..."
          />
        </div>
      )}
      <div>
        <Label>Description</Label>
        <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </div>
      <div>
        <Label>Fichier</Label>
        <Input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.jpg,.jpeg,.png"
        />
      </div>
      <div className="flex justify-end space-x-2">
        <Button type="button" variant="outline" onClick={onCancel}>Annuler</Button>
        <Button type="submit" className="bg-gradient-to-r from-cyan-600 via-blue-600 to-teal-600">Créer</Button>
      </div>
    </form>
  );
};

