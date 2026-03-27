import * as XLSX from 'xlsx';
import { showError, showSuccess } from './toast';

/**
 * Lit un fichier Excel et retourne les données
 * @param file - Fichier Excel à lire
 * @param sheetIndex - Index de la feuille à lire (0 par défaut)
 * @returns Promesse résolue avec les données parsées
 */
export const importFromExcel = async <T = any>(
  file: File,
  sheetIndex: number = 0
): Promise<T[]> => {
  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          // Récupérer le nom de la feuille
          const sheetNames = workbook.SheetNames;
          if (sheetNames.length === 0) {
            reject(new Error('Le fichier Excel ne contient aucune feuille'));
            return;
          }
          
          const sheetName = sheetNames[sheetIndex] || sheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          const normalizeHeaderCell = (value: any) =>
            String(value ?? '')
              .normalize('NFD')
              .replace(/[\u0300-\u036f]/g, '')
              .replace(/['’`"]/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .toLowerCase();

          // Détecter la ligne d'en-tête (souvent décalée / précédée de lignes vides)
          // On lit d'abord en mode "tableau" (header: 1) pour repérer la 1ère ligne qui contient Date/Lieux/Description.
          const preview = XLSX.utils.sheet_to_json<any[]>(worksheet, {
            header: 1,
            raw: false,
            defval: '',
            blankrows: false,
          });

          const maxScan = Math.min(preview.length, 50);
          let headerRowIndex = 0;
          for (let i = 0; i < maxScan; i++) {
            const row = Array.isArray(preview[i]) ? preview[i] : [];
            const cells = row.map(normalizeHeaderCell).filter(Boolean);
            if (cells.length === 0) continue;

            const hasDate = cells.some(c => c === 'date' || c.includes('date anomalie') || c === 'date anomalie');
            const hasLieu = cells.some(c => c === 'lieux' || c === 'lieu' || c.includes('lieux'));
            const hasDesc = cells.some(c => c.includes("description") || c.includes('anomalie'));

            if (hasDate && hasLieu && hasDesc) {
              headerRowIndex = i;
              break;
            }
          }
          
          // Convertir en JSON en prenant la ligne détectée comme en-tête
          const jsonData = XLSX.utils.sheet_to_json<T>(worksheet, {
            raw: false, // Convertir les nombres en chaînes
            defval: null, // Valeur par défaut pour les cellules vides
            blankrows: false,
            range: headerRowIndex, // démarre à la ligne d'en-tête
          });
          
          resolve(jsonData);
        } catch (error: any) {
          reject(new Error(`Erreur lors de la lecture du fichier: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Erreur lors de la lecture du fichier'));
      };
      
      reader.readAsBinaryString(file);
    });
  } catch (error: any) {
    console.error('Erreur lors de l\'import Excel:', error);
    throw error;
  }
};

/**
 * Valide les données importées selon un schéma
 * @param data - Données importées
 * @param requiredFields - Champs requis
 * @returns true si valide, false sinon
 */
export const validateImportedData = (
  data: any[],
  requiredFields: string[]
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  if (data.length === 0) {
    errors.push('Le fichier est vide ou ne contient aucune donnée');
    return { valid: false, errors };
  }
  
  data.forEach((row, index) => {
    requiredFields.forEach(field => {
      if (!(field in row) || row[field] === null || row[field] === undefined || row[field] === '') {
        errors.push(`Ligne ${index + 2}: Le champ "${field}" est requis mais est manquant ou vide`);
      }
    });
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Convertit les données Excel en format attendu par l'API
 * @param excelData - Données brutes du fichier Excel
 * @param fieldMapping - Mapping entre les colonnes Excel et les champs API
 * @returns Données converties
 */
export const mapExcelToApiFormat = <T = any>(
  excelData: any[],
  fieldMapping: Record<string, string>
): T[] => {
  return excelData.map(row => {
    const mapped: any = {};
    
    Object.entries(fieldMapping).forEach(([excelField, apiField]) => {
      const value = row[excelField] || row[excelField.toLowerCase()] || row[excelField.toUpperCase()];
      
      // Essayer différentes variations du nom de colonne
      const variations = [
        excelField,
        excelField.toLowerCase(),
        excelField.toUpperCase(),
        excelField.charAt(0).toUpperCase() + excelField.slice(1).toLowerCase(),
      ];
      
      let mappedValue = null;
      for (const variation of variations) {
        if (row[variation] !== undefined && row[variation] !== null && row[variation] !== '') {
          mappedValue = row[variation];
          break;
        }
      }
      
      mapped[apiField] = mappedValue || null;
    });
    
    return mapped as T;
  });
};

/**
 * Composant helper pour uploader un fichier Excel
 */
export const handleExcelFileUpload = async (
  file: File,
  onSuccess: (data: any[]) => void | Promise<void>,
  onError?: (error: string) => void,
  validator?: (data: any[]) => { valid: boolean; errors: string[] }
): Promise<void> => {
  try {
    // Vérifier le type de fichier
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      const error = 'Le fichier doit être au format Excel (.xlsx ou .xls)';
      if (onError) {
        onError(error);
      } else {
        showError(error);
      }
      return;
    }
    
    // Importer le fichier
    const data = await importFromExcel(file);
    
    // Valider si un validateur est fourni
    if (validator) {
      const validation = validator(data);
      if (!validation.valid) {
        const error = `Erreurs de validation:\n${validation.errors.join('\n')}`;
        if (onError) {
          onError(error);
        } else {
          showError(error);
        }
        return;
      }
    }
    
    // Appeler le callback de succès
    await onSuccess(data);
    showSuccess(`Données importées avec succès (${data.length} lignes)`);
  } catch (error: any) {
    const errorMessage = error.message || 'Erreur lors de l\'import du fichier';
    if (onError) {
      onError(errorMessage);
    } else {
      showError(errorMessage);
    }
  }
};



