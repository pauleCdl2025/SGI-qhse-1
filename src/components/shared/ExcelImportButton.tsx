import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/Icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { handleExcelFileUpload, validateImportedData, mapExcelToApiFormat } from "@/utils/excelImport";
import { showError, showSuccess } from "@/utils/toast";

interface ExcelImportButtonProps<T = any> {
  onImport: (data: T[]) => Promise<void> | void;
  requiredFields?: string[];
  fieldMapping?: Record<string, string>;
  buttonText?: string;
  dialogTitle?: string;
  dialogDescription?: string;
  acceptedFileTypes?: string;
  buttonClassName?: string;
}

export const ExcelImportButton = <T extends Record<string, any>>({
  onImport,
  requiredFields = [],
  fieldMapping,
  buttonText = "Importer Excel",
  dialogTitle = "Importer des données depuis Excel",
  dialogDescription = "Sélectionnez un fichier Excel (.xlsx ou .xls) pour importer les données.",
  acceptedFileTypes = ".xlsx,.xls",
  buttonClassName,
}: ExcelImportButtonProps<T>) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportErrors([]);

    try {
      await handleExcelFileUpload(
        file,
        async (data) => {
          // Valider les données si des champs requis sont spécifiés
          if (requiredFields.length > 0) {
            const validation = validateImportedData(data, requiredFields);
            if (!validation.valid) {
              setImportErrors(validation.errors);
              setIsImporting(false);
              return;
            }
          }

          // Mapper les données si un mapping est fourni
          let processedData = data;
          if (fieldMapping) {
            processedData = mapExcelToApiFormat(data, fieldMapping) as T[];
          }

          // Importer les données
          await onImport(processedData as T[]);
          
          setIsDialogOpen(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        },
        (error) => {
          setImportErrors([error]);
        },
        requiredFields.length > 0 ? (data) => validateImportedData(data, requiredFields) : undefined
      );
    } catch (error: any) {
      setImportErrors([error.message || 'Erreur lors de l\'import']);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className={
            buttonClassName ??
            "border-orange-300 text-orange-700 hover:bg-orange-50"
          }
          size="sm"
        >
          <Icon name="Upload" className="mr-2 h-4 w-4" />
          {buttonText}
        </Button>
      </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription>{dialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {requiredFields.length > 0 && (
              <Alert>
                <AlertTitle>Champs requis</AlertTitle>
                <AlertDescription>
                  Les colonnes suivantes doivent être présentes dans votre fichier Excel: {requiredFields.join(', ')}
                </AlertDescription>
              </Alert>
            )}

            {fieldMapping && (
              <Alert>
                <AlertTitle>Mapping des colonnes</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 space-y-1 text-sm">
                    {Object.entries(fieldMapping).map(([excelField, apiField]) => (
                      <div key={excelField}>
                        <strong>{excelField}</strong> → {apiField}
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {importErrors.length > 0 && (
              <Alert variant="destructive">
                <AlertTitle>Erreurs d'import</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {importErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg">
              <Icon name="Upload" className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-sm text-gray-600 mb-4">
                Cliquez sur le bouton ci-dessous pour sélectionner un fichier Excel
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedFileTypes}
                onChange={handleFileSelect}
                disabled={isImporting}
                className="hidden"
                id="excel-file-input"
              />
              <label htmlFor="excel-file-input">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isImporting}
                  className="cursor-pointer"
                  asChild
                >
                  <span>
                    {isImporting ? (
                      <>
                        <Icon name="Clock" className="mr-2 h-4 w-4 animate-spin" />
                        Import en cours...
                      </>
                    ) : (
                      <>
                        <Icon name="FileText" className="mr-2 h-4 w-4" />
                        Sélectionner un fichier Excel
                      </>
                    )}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

