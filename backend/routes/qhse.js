// =====================================================
// ROUTES API POUR LES MODULES QHSE
// Centre Diagnostic Libreville
// =====================================================

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Note: authenticateToken sera injecté depuis server.js

// Configuration Multer pour upload de documents
const documentsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'documents');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const uploadDocument = multer({ 
  storage: documentsStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xls|xlsx|ppt|pptx|txt|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Type de fichier non autorisé'));
    }
  }
});

// Note: pool et authenticateToken seront injectés depuis server.js
let pool;
let authenticateToken;
let databaseName;

module.exports = (dbPool, authMiddleware, dbName) => {
  pool = dbPool;
  authenticateToken = authMiddleware;
  databaseName = dbName || 'hospital_management';

  const AUTO_ARCHIVE_GRACE_DAYS = 30;

  // Fonction helper pour vérifier si une table existe
  // Note: tableName doit être une constante hardcodée pour éviter les injections SQL
  const tableExists = async (tableName) => {
    try {
      // Utiliser INFORMATION_SCHEMA avec le nom de la base de données explicite
      const [results] = await pool.execute(
        `SELECT COUNT(*) as count 
         FROM information_schema.tables 
         WHERE table_schema = ? 
         AND table_name = ?`,
        [databaseName, tableName]
      );
      return results[0].count > 0;
    } catch (error) {
      // En cas d'erreur, on assume que la table n'existe pas
      console.error(`Erreur lors de la vérification de la table ${tableName}:`, error.message);
      return false;
    }
  };

  // Fonction helper pour gérer les erreurs de table manquante
  const handleTableError = (res, error, tableName) => {
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log(`Table ${tableName} n'existe pas encore, retour d'un tableau vide`);
      return res.json([]);
    }
    console.error(`Erreur avec la table ${tableName}:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Erreur serveur: ' + error.message });
    }
  };

  const autoUpdateDocumentLifecycle = async () => {
    try {
      await pool.execute(
        `UPDATE qhse_documents
         SET status = 'obsolète',
             lifecycle_note = 'Mise en obsolescence automatique - validité expirée'
         WHERE validity_date IS NOT NULL
           AND validity_date < CURDATE()
           AND status NOT IN ('archivé', 'obsolète')`
      );

      await pool.execute(
        `UPDATE qhse_documents
         SET status = 'archivé',
             archived_at = IFNULL(archived_at, NOW()),
             lifecycle_note = 'Archivage automatique - délai de grâce dépassé'
         WHERE validity_date IS NOT NULL
           AND validity_date < DATE_SUB(CURDATE(), INTERVAL ? DAY)
           AND status = 'obsolète'
           AND archived_at IS NULL`,
        [AUTO_ARCHIVE_GRACE_DAYS]
      );
    } catch (error) {
      if (error.code !== 'ER_NO_SUCH_TABLE' && error.code !== 'ER_BAD_TABLE_ERROR') {
        console.error('Erreur lors de la mise à jour automatique du cycle de vie des documents:', error);
      }
    }
  };

  // =====================================================
  // 1. GESTION DOCUMENTAIRE (GED QHSE)
  // =====================================================
  
  // Récupérer tous les documents
  router.get('/documents', authenticateToken, async (req, res) => {
    try {
      await autoUpdateDocumentLifecycle();

      // Essayer directement de récupérer les documents avec les informations du validateur
      const [documents] = await pool.execute(
        `SELECT d.*, 
                v.username as validated_by_username,
                CONCAT(v.first_name, ' ', v.last_name) as validated_by_name
         FROM qhse_documents d
         LEFT JOIN profiles v ON d.validated_by = v.id
         ORDER BY d.created_at DESC`
      );
      
      res.json(documents.map(doc => ({
        ...doc,
        tags: doc.tags ? (typeof doc.tags === 'string' ? JSON.parse(doc.tags) : doc.tags) : [],
        validated_by_name: doc.validated_by_name || null
      })));
    } catch (error) {
      // Si la table n'existe pas, retourner un tableau vide
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        console.log('Table qhse_documents n\'existe pas encore, retour d\'un tableau vide');
        return res.json([]);
      }
      
      // Pour toutes les autres erreurs, logger et retourner une erreur
      console.error('Erreur lors de la récupération des documents:', error);
      console.error('Code d\'erreur:', error.code);
      console.error('Message d\'erreur:', error.message);
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue'),
          code: error.code || 'UNKNOWN'
        });
      }
    }
  });

  // Créer un document
  router.post('/documents', authenticateToken, uploadDocument.single('file'), async (req, res) => {
    try {
      const {
        title, code, document_type, processus, sous_processus, category, description, version, 
        access_level, tags, validity_date, revision_responsible, is_displayed, display_location
      } = req.body;

      const id = uuidv4();
      const filePath = req.file ? `/uploads/documents/${req.file.filename}` : null;

      await pool.execute(
        `INSERT INTO qhse_documents 
        (id, title, code, document_type, processus, sous_processus, category, version, description, 
         file_path, file_name, file_size, mime_type, access_level, tags, validity_date, 
         revision_responsible, is_displayed, display_location, created_by, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'brouillon')`,
        [
          id, title, code || null, document_type, processus || null, sous_processus || null, 
          category || '', version || '1.0', description || null,
          filePath, req.file?.originalname, req.file?.size, req.file?.mimetype,
          access_level || 'interne', JSON.stringify(tags ? (Array.isArray(tags) ? tags : [tags]) : []),
          validity_date || null, revision_responsible || null, 
          is_displayed === 'true' || is_displayed === true ? 1 : 0, display_location || null,
          req.user.id
        ]
      );

      res.json({ id, message: 'Document créé' });
    } catch (error) {
      console.error('Erreur lors de la création du document:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Mettre à jour un document
  router.put('/documents/:id', authenticateToken, async (req, res) => {
    try {
      // Vérifier les permissions pour la validation
      if (req.body.status === 'validé') {
        // Seul le superviseur QHSE ou superadmin peut valider
        if (
          req.user.role !== 'superviseur_qhse' &&
          req.user.role !== 'superadmin' &&
          req.user.role !== 'dop'
        ) {
          return res.status(403).json({ error: 'Seuls le Service Qualité (QHSE) et la Direction Opérationnelle peuvent valider les documents' });
        }
      }

      const updates = [];
      const values = [];
      const allowedFields = [
        'title', 'code', 'processus', 'sous_processus', 'category', 'description', 'status', 
        'version', 'effective_date', 'review_date', 'validity_date', 'access_level', 'tags',
        'revision_responsible', 'is_displayed', 'display_location', 'archived_at', 'lifecycle_note'
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          if (field === 'tags') {
            values.push(JSON.stringify(Array.isArray(req.body[field]) ? req.body[field] : [req.body[field]]));
          } else if (field === 'is_displayed') {
            values.push(req.body[field] === 'true' || req.body[field] === true ? 1 : 0);
          } else {
            values.push(req.body[field] || null);
          }
        }
      }

      if (req.body.status === 'archivé' && req.body.archived_at === undefined) {
        updates.push('archived_at = NOW()');
      }

      if (req.body.status === 'validé' && !req.body.validated_by) {
        updates.push('validated_by = ?');
        updates.push('validation_date = NOW()');
        values.push(req.user.id);
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucune mise à jour fournie' });
      }

      values.push(req.params.id);

      await pool.execute(
        `UPDATE qhse_documents SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      res.json({ message: 'Document mis à jour' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du document:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // =====================================================
  // 2. AUDITS & INSPECTIONS
  // =====================================================

  // Récupérer tous les audits
  router.get('/audits', authenticateToken, async (req, res) => {
    try {
      const [audits] = await pool.execute(
        'SELECT * FROM audits ORDER BY planned_date DESC'
      );
      res.json(audits.map(audit => ({
        ...audit,
        findings: audit.findings ? (typeof audit.findings === 'string' ? JSON.parse(audit.findings) : audit.findings) : null
      })));
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.json([]);
      }
      console.error('Erreur lors de la récupération des audits:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Créer un audit
  router.post('/audits', authenticateToken, async (req, res) => {
    try {
      const {
        title, audit_type, scope, planned_date, auditor_id, audited_department
      } = req.body;

      const id = uuidv4();

      await pool.execute(
        `INSERT INTO audits 
        (id, title, audit_type, scope, planned_date, auditor_id, audited_department, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'planifié', ?)`,
        [id, title, audit_type, scope, planned_date, auditor_id || null, audited_department || null, req.user.id]
      );

      res.json({ id, message: 'Audit créé' });
    } catch (error) {
      console.error('Erreur lors de la création de l\'audit:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Récupérer les non-conformités
  router.get('/non-conformities', authenticateToken, async (req, res) => {
    try {
      const [nonConformities] = await pool.execute(
        'SELECT * FROM non_conformities ORDER BY created_at DESC'
      );
      res.json(nonConformities);
    } catch (error) {
      console.error('Erreur lors de la récupération des non-conformités:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Créer une non-conformité
  router.post('/non-conformities', authenticateToken, async (req, res) => {
    try {
      const {
        audit_id, incident_id, title, description, severity, root_cause,
        corrective_action, preventive_action, assigned_to, due_date
      } = req.body;

      const id = uuidv4();

      await pool.execute(
        `INSERT INTO non_conformities 
        (id, audit_id, incident_id, title, description, severity, root_cause, 
         corrective_action, preventive_action, assigned_to, due_date, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ouvert', ?)`,
        [
          id, audit_id || null, incident_id || null, title, description, severity,
          root_cause || null, corrective_action || null, preventive_action || null,
          assigned_to || null, due_date || null, req.user.id
        ]
      );

      res.json({ id, message: 'Non-conformité créée' });
    } catch (error) {
      console.error('Erreur lors de la création de la non-conformité:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // =====================================================
  // 3. FORMATIONS & COMPÉTENCES
  // =====================================================

  // Récupérer toutes les formations
  router.get('/trainings', authenticateToken, async (req, res) => {
    try {
      const [trainings] = await pool.execute(
        'SELECT * FROM trainings ORDER BY planned_date DESC'
      );
      res.json(trainings);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.json([]);
      }
      console.error('Erreur lors de la récupération des formations:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Créer une formation
  router.post('/trainings', authenticateToken, async (req, res) => {
    try {
      const {
        title, category, description, trainer, training_type, duration_hours,
        location, planned_date, max_participants, certificate_required, validity_months
      } = req.body;

      const id = uuidv4();

      await pool.execute(
        `INSERT INTO trainings 
        (id, title, category, description, trainer, training_type, duration_hours,
         location, planned_date, max_participants, certificate_required, validity_months, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'planifiée', ?)`,
        [
          id, title, category, description || null, trainer || null, training_type,
          duration_hours || null, location || null, planned_date || null,
          max_participants || null, certificate_required || false, validity_months || null,
          req.user.id
        ]
      );

      res.json({ id, message: 'Formation créée' });
    } catch (error) {
      console.error('Erreur lors de la création de la formation:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Inscrire un participant à une formation
  router.post('/trainings/:id/participants', authenticateToken, async (req, res) => {
    try {
      const { participant_id } = req.body;
      const id = uuidv4();

      await pool.execute(
        `INSERT INTO training_participations 
        (id, training_id, participant_id, registration_status, registered_by)
        VALUES (?, ?, ?, 'inscrit', ?)`,
        [id, req.params.id, participant_id, req.user.id]
      );

      res.json({ id, message: 'Participant inscrit' });
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // Récupérer les compétences d'un employé
  router.get('/competencies/:employeeId', authenticateToken, async (req, res) => {
    try {
      const [competencies] = await pool.execute(
        'SELECT * FROM competencies WHERE employee_id = ? ORDER BY created_at DESC',
        [req.params.employeeId]
      );
      res.json(competencies);
    } catch (error) {
      console.error('Erreur lors de la récupération des compétences:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // =====================================================
  // 4. SUIVI DES DÉCHETS MÉDICAUX
  // =====================================================

  // Récupérer tous les déchets
  router.get('/waste', authenticateToken, async (req, res) => {
    try {
      const [waste] = await pool.execute(
        'SELECT * FROM medical_waste ORDER BY collection_date DESC'
      );
      res.json(waste.map(w => ({
        ...w,
        photo_urls: w.photo_urls ? (typeof w.photo_urls === 'string' ? JSON.parse(w.photo_urls) : w.photo_urls) : []
      })));
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.json([]);
      }
      console.error('Erreur lors de la récupération des déchets:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Enregistrer un déchet
  router.post('/waste', authenticateToken, async (req, res) => {
    try {
      const {
        waste_type, category, quantity, unit, collection_date, collection_location,
        producer_service, waste_code, photo_urls
      } = req.body;

      const id = uuidv4();

      await pool.execute(
        `INSERT INTO medical_waste 
        (id, waste_type, category, quantity, unit, collection_date, collection_location,
         producer_service, waste_code, status, registered_by, photo_urls)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'collecté', ?, ?)`,
        [
          id, waste_type, category || null, quantity, unit, collection_date,
          collection_location, producer_service || null, waste_code || null,
          req.user.id, JSON.stringify(photo_urls || [])
        ]
      );

      res.json({ id, message: 'Déchet enregistré' });
    } catch (error) {
      console.error('Erreur lors de l\'enregistrement du déchet:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // =====================================================
  // 5. SUIVI STÉRILISATION & LINGE
  // =====================================================

  // Récupérer les cycles de stérilisation
  router.get('/sterilization-cycles', authenticateToken, async (req, res) => {
    try {
      const [cycles] = await pool.execute(
        'SELECT * FROM sterilization_cycles ORDER BY start_time DESC'
      );
      res.json(cycles);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.json([]);
      }
      console.error('Erreur lors de la récupération des cycles:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Créer un cycle de stérilisation
  router.post('/sterilization-cycles', authenticateToken, async (req, res) => {
    try {
      const {
        cycle_number, sterilizer_id, sterilizer_type, cycle_type, program_name,
        temperature, pressure, batch_number
      } = req.body;

      const id = uuidv4();
      const startTime = new Date();

      await pool.execute(
        `INSERT INTO sterilization_cycles 
        (id, cycle_number, sterilizer_id, sterilizer_type, cycle_type, program_name,
         start_time, temperature, pressure, operator_id, status, result, batch_number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_cours', 'en_attente', ?)`,
        [
          id, cycle_number, sterilizer_id, sterilizer_type, cycle_type,
          program_name || null, startTime, temperature || null, pressure || null,
          req.user.id, batch_number || null
        ]
      );

      res.json({ id, message: 'Cycle de stérilisation démarré' });
    } catch (error) {
      console.error('Erreur lors de la création du cycle:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // =====================================================
  // 6. GESTION DES RISQUES
  // =====================================================

  // Récupérer tous les risques
  router.get('/risks', authenticateToken, async (req, res) => {
    try {
      const [risks] = await pool.execute(
        'SELECT * FROM risks ORDER BY created_at DESC'
      );
      res.json(risks);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.json([]);
      }
      console.error('Erreur lors de la récupération des risques:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Créer un risque
  router.post('/risks', authenticateToken, async (req, res) => {
    try {
      const {
        title, description, risk_category, risk_source, probability, severity,
        risk_level, current_controls, responsible_person, due_date
      } = req.body;

      const id = uuidv4();

      await pool.execute(
        `INSERT INTO risks 
        (id, title, description, risk_category, risk_source, probability, severity,
         risk_level, current_controls, responsible_person, due_date, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'identifié', ?)`,
        [
          id, title, description, risk_category, risk_source || null,
          probability, severity, risk_level, current_controls || null,
          responsible_person || null, due_date || null, req.user.id
        ]
      );

      res.json({ id, message: 'Risque créé' });
    } catch (error) {
      console.error('Erreur lors de la création du risque:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // =====================================================
  // 7. REPORTING
  // =====================================================

  // Générer un rapport (placeholder - à implémenter avec bibliothèque de génération de PDF/Excel)
  router.post('/reports/generate', authenticateToken, async (req, res) => {
    try {
      const {
        title, report_type, period_type, start_date, end_date, filters, file_format
      } = req.body;

      const id = uuidv4();

      // TODO: Implémenter la génération réelle du rapport
      // Pour l'instant, on crée juste l'enregistrement
      await pool.execute(
        `INSERT INTO reports 
        (id, title, report_type, period_type, start_date, end_date, filters, file_format, status, generated_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'en_cours', ?)`,
        [
          id, title, report_type, period_type, start_date, end_date,
          JSON.stringify(filters || {}), file_format || 'pdf', req.user.id
        ]
      );

      res.json({ id, message: 'Rapport en cours de génération' });
    } catch (error) {
      console.error('Erreur lors de la génération du rapport:', error);
      res.status(500).json({ error: 'Erreur serveur' });
    }
  });

  // =====================================================
  // 8. SUIVI ET TRAÇABILITÉ DU LINGE À LA BUANDERIE
  // =====================================================

  // Récupérer tous les suivis de linge
  router.get('/laundry-tracking', authenticateToken, async (req, res) => {
    try {
      const [trackings] = await pool.execute(
        'SELECT * FROM laundry_tracking ORDER BY date_etablissement DESC, date_reception DESC'
      );
      res.json(trackings);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.json([]);
      }
      console.error('Erreur lors de la récupération des suivis de linge:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Créer un suivi de linge
  router.post('/laundry-tracking', authenticateToken, async (req, res) => {
    try {
      const {
        service_emetteur, periode_concernee, date_etablissement,
        date_reception, service_origine, type_linge, poids_kg, quantite,
        etat_linge, agent_reception, signature_reception
      } = req.body;

      const id = uuidv4();

      await pool.execute(
        `INSERT INTO laundry_tracking 
        (id, service_emetteur, periode_concernee, etabli_par, date_etablissement,
         date_reception, service_origine, type_linge, poids_kg, quantite,
         etat_linge, agent_reception, signature_reception, status, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_reception', ?)`,
        [
          id, service_emetteur, periode_concernee, req.user.id, date_etablissement,
          date_reception, service_origine, type_linge, poids_kg || null, quantite || null,
          etat_linge || null, agent_reception || null, signature_reception || null, req.user.id
        ]
      );

      res.json({ id, message: 'Suivi de linge créé' });
    } catch (error) {
      console.error('Erreur lors de la création du suivi de linge:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Mettre à jour un suivi de linge
  router.put('/laundry-tracking/:id', authenticateToken, async (req, res) => {
    try {
      const updates = [];
      const values = [];
      const allowedFields = [
        'service_emetteur', 'periode_concernee', 'date_etablissement',
        'date_reception', 'service_origine', 'type_linge', 'poids_kg', 'quantite',
        'etat_linge', 'agent_reception', 'signature_reception',
        'date_lavage', 'machine_utilisee', 'cycle_temperature', 'produit_lessiviel',
        'duree_cycle', 'agent_lavage', 'controle_visuel', 'observations_lavage',
        'date_sechage', 'type_sechage', 'temperature_sechage', 'duree_sechage',
        'repassage_effectue_par', 'controle_qualite_sechage', 'signature_sechage',
        'date_pliage', 'type_linge_plie', 'quantite_pliee', 'mode_conditionnement',
        'zone_stockage', 'controle_conformite_pliage', 'signature_agent_pliage',
        'observations_pliage', 'date_livraison', 'service_destinataire',
        'type_linge_livre', 'quantite_livree', 'etat_linge_livre', 'agent_livreur',
        'receptonnaire_nom', 'signature_receptonnaire', 'heure_livraison',
        'date_non_conformite', 'type_non_conformite', 'service_concerne_non_conformite',
        'mesure_corrective', 'responsable_corrective', 'date_cloture_non_conformite',
        'signature_non_conformite', 'responsable_traçabilite', 'date_validation_traçabilite',
        'signature_traçabilite', 'observations_traçabilite', 'status'
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(req.body[field]);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
      }

      values.push(req.params.id);

      await pool.execute(
        `UPDATE laundry_tracking SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      res.json({ message: 'Suivi de linge mis à jour' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du suivi de linge:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Récupérer les synthèses hebdomadaires/mensuelles
  router.get('/laundry-summary', authenticateToken, async (req, res) => {
    try {
      const { periode_type, date_debut, date_fin } = req.query;
      let query = 'SELECT * FROM laundry_summary WHERE 1=1';
      const params = [];

      if (periode_type) {
        query += ' AND periode_type = ?';
        params.push(periode_type);
      }
      if (date_debut) {
        query += ' AND date_debut >= ?';
        params.push(date_debut);
      }
      if (date_fin) {
        query += ' AND date_fin <= ?';
        params.push(date_fin);
      }

      query += ' ORDER BY date_debut DESC';

      const [summaries] = await pool.execute(query, params);
      res.json(summaries);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.json([]);
      }
      console.error('Erreur lors de la récupération des synthèses:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Créer une synthèse hebdomadaire/mensuelle
  router.post('/laundry-summary', authenticateToken, async (req, res) => {
    try {
      const {
        periode_type, date_debut, date_fin, observations,
        responsable_buanderie, signature_responsable, date_visa
      } = req.body;

      const id = uuidv4();

      // Calculer les statistiques depuis laundry_tracking
      const [stats] = await pool.execute(
        `SELECT 
          SUM(COALESCE(poids_kg, 0)) as total_poids,
          COUNT(*) as total_lots,
          COUNT(DISTINCT service_origine) as nombre_services,
          COUNT(CASE WHEN date_non_conformite IS NOT NULL THEN 1 END) as non_conformites
        FROM laundry_tracking
        WHERE date_reception BETWEEN ? AND ?`,
        [date_debut, date_fin]
      );

      const totalPoids = stats[0]?.total_poids || 0;
      const totalLots = stats[0]?.total_lots || 0;
      const nombreServices = stats[0]?.nombre_services || 0;
      const nonConformites = stats[0]?.non_conformites || 0;
      const tauxNonConformite = totalLots > 0 ? (nonConformites / totalLots) * 100 : 0;

      await pool.execute(
        `INSERT INTO laundry_summary 
        (id, periode_type, date_debut, date_fin, total_linge_traite_kg,
         taux_non_conformite, nombre_services_desservis, observations,
         responsable_buanderie, signature_responsable, date_visa, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, periode_type, date_debut, date_fin, totalPoids,
          tauxNonConformite, nombreServices, observations || null,
          responsable_buanderie || null, signature_responsable || null,
          date_visa || null, req.user.id
        ]
      );

      res.json({ id, message: 'Synthèse créée' });
    } catch (error) {
      console.error('Erreur lors de la création de la synthèse:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // =====================================================
  // 9. REGISTRE DE TRAÇABILITÉ DE LA STÉRILISATION
  // =====================================================

  // Récupérer tous les registres de stérilisation
  router.get('/sterilization-register', authenticateToken, async (req, res) => {
    try {
      const [registers] = await pool.execute(
        'SELECT * FROM sterilization_register ORDER BY date_cycle DESC, created_at DESC'
      );
      res.json(registers);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.json([]);
      }
      console.error('Erreur lors de la récupération des registres:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Créer un registre de stérilisation
  router.post('/sterilization-register', authenticateToken, async (req, res) => {
    try {
      const {
        code_document, version, date_application, date_limite_validite,
        redacteur, verificateur, approbateur, periode_debut, periode_fin,
        date_cycle, service_concerne, operateur_nom, operateur_id,
        type_materiel, numero_lot, code_traçabilite, methode_sterilisation,
        numero_cycle, programme, temperature, duree_cycle,
        resultat_test_controle, status_cycle, observation_action_corrective,
        signature_operateur, signature_superviseur
      } = req.body;

      const id = uuidv4();

      await pool.execute(
        `INSERT INTO sterilization_register 
        (id, code_document, version, date_application, date_limite_validite,
         redacteur, verificateur, approbateur, periode_debut, periode_fin,
         date_cycle, service_concerne, operateur_nom, operateur_id,
         type_materiel, numero_lot, code_traçabilite, methode_sterilisation,
         numero_cycle, programme, temperature, duree_cycle,
         resultat_test_controle, status_cycle, observation_action_corrective,
         signature_operateur, signature_superviseur, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, code_document || 'EN-STE-001-CDL', version || 'AA',
          date_application || null, date_limite_validite || null,
          redacteur || null, verificateur || null, approbateur || null,
          periode_debut || null, periode_fin || null,
          date_cycle, service_concerne, operateur_nom, operateur_id || null,
          type_materiel, numero_lot || null, code_traçabilite || null, methode_sterilisation,
          numero_cycle || null, programme || null, temperature || null, duree_cycle || null,
          resultat_test_controle || 'en_attente', status_cycle || 'en_cours',
          observation_action_corrective || null, signature_operateur || null,
          signature_superviseur || null, req.user.id
        ]
      );

      res.json({ id, message: 'Registre de stérilisation créé' });
    } catch (error) {
      console.error('Erreur lors de la création du registre:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Mettre à jour un registre de stérilisation
  router.put('/sterilization-register/:id', authenticateToken, async (req, res) => {
    try {
      const updates = [];
      const values = [];
      const allowedFields = [
        'date_cycle', 'service_concerne', 'operateur_nom', 'operateur_id',
        'type_materiel', 'numero_lot', 'code_traçabilite', 'methode_sterilisation',
        'numero_cycle', 'programme', 'temperature', 'duree_cycle',
        'resultat_test_controle', 'status_cycle', 'observation_action_corrective',
        'signature_operateur', 'signature_superviseur',
        'date_controle', 'type_charge', 'nombre_unites', 'numero_cycle_controle',
        'resultat_controle', 'statut_charge', 'signature_controle',
        'date_liberation', 'numero_lot_charge', 'service_destinataire',
        'delai_validite', 'signature_receptionnaire', 'observations_liberation',
        'date_maintenance', 'type_operation_maintenance', 'nom_technicien',
        'technicien_id', 'resultat_controle_maintenance', 'signature_maintenance',
        'observations_maintenance', 'observations_generales', 'non_conformites',
        'responsable_sterilisation', 'responsable_sterilisation_id',
        'date_validation', 'signature_validation'
      ];

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          updates.push(`${field} = ?`);
          values.push(req.body[field]);
        }
      }

      if (updates.length === 0) {
        return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
      }

      values.push(req.params.id);

      await pool.execute(
        `UPDATE sterilization_register SET ${updates.join(', ')} WHERE id = ?`,
        values
      );

      res.json({ message: 'Registre mis à jour' });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du registre:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Récupérer les charges d'un registre
  router.get('/sterilization-register/:id/charges', authenticateToken, async (req, res) => {
    try {
      const [charges] = await pool.execute(
        'SELECT * FROM sterilization_charges WHERE register_id = ? ORDER BY date_controle DESC',
        [req.params.id]
      );
      res.json(charges);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.json([]);
      }
      console.error('Erreur lors de la récupération des charges:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Ajouter une charge
  router.post('/sterilization-register/:id/charges', authenticateToken, async (req, res) => {
    try {
      const {
        date_controle, type_charge, nombre_unites, numero_cycle,
        resultat_controle, statut, signature, observations
      } = req.body;

      const id = uuidv4();

      await pool.execute(
        `INSERT INTO sterilization_charges 
        (id, register_id, date_controle, type_charge, nombre_unites,
         numero_cycle, resultat_controle, statut, signature, observations)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, req.params.id, date_controle, type_charge, nombre_unites,
          numero_cycle || null, resultat_controle || 'en_attente',
          statut || 'en_attente', signature || null, observations || null
        ]
      );

      res.json({ id, message: 'Charge ajoutée' });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la charge:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Récupérer les libérations d'un registre
  router.get('/sterilization-register/:id/liberations', authenticateToken, async (req, res) => {
    try {
      const [liberations] = await pool.execute(
        'SELECT * FROM sterilization_liberations WHERE register_id = ? ORDER BY date_liberation DESC',
        [req.params.id]
      );
      res.json(liberations);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.json([]);
      }
      console.error('Erreur lors de la récupération des libérations:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Ajouter une libération
  router.post('/sterilization-register/:id/liberations', authenticateToken, async (req, res) => {
    try {
      const {
        date_liberation, numero_lot_charge, service_destinataire,
        delai_validite, signature_receptionnaire, observations
      } = req.body;

      const id = uuidv4();

      await pool.execute(
        `INSERT INTO sterilization_liberations 
        (id, register_id, date_liberation, numero_lot_charge, service_destinataire,
         delai_validite, signature_receptionnaire, observations)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, req.params.id, date_liberation, numero_lot_charge,
          service_destinataire, delai_validite || null,
          signature_receptionnaire || null, observations || null
        ]
      );

      res.json({ id, message: 'Libération ajoutée' });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la libération:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Récupérer les maintenances d'un registre
  router.get('/sterilization-register/:id/maintenance', authenticateToken, async (req, res) => {
    try {
      const [maintenances] = await pool.execute(
        'SELECT * FROM sterilization_maintenance WHERE register_id = ? ORDER BY date_maintenance DESC',
        [req.params.id]
      );
      res.json(maintenances);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.json([]);
      }
      console.error('Erreur lors de la récupération des maintenances:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Ajouter une maintenance
  router.post('/sterilization-register/:id/maintenance', authenticateToken, async (req, res) => {
    try {
      const {
        date_maintenance, type_operation, nom_technicien, technicien_id,
        resultat_controle, signature, observations
      } = req.body;

      const id = uuidv4();

      await pool.execute(
        `INSERT INTO sterilization_maintenance 
        (id, register_id, date_maintenance, type_operation, nom_technicien,
         technicien_id, resultat_controle, signature, observations)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, req.params.id, date_maintenance, type_operation,
          nom_technicien || null, technicien_id || null,
          resultat_controle || 'en_attente', signature || null, observations || null
        ]
      );

      res.json({ id, message: 'Maintenance ajoutée' });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la maintenance:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Récupérer les non-conformités d'un registre
  router.get('/sterilization-register/:id/non-conformites', authenticateToken, async (req, res) => {
    try {
      const [nonConformites] = await pool.execute(
        'SELECT * FROM sterilization_non_conformites WHERE register_id = ? ORDER BY date_observation DESC',
        [req.params.id]
      );
      res.json(nonConformites);
    } catch (error) {
      if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.json([]);
      }
      console.error('Erreur lors de la récupération des non-conformités:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  // Ajouter une non-conformité
  router.post('/sterilization-register/:id/non-conformites', authenticateToken, async (req, res) => {
    try {
      const {
        date_observation, description, type_non_conformite,
        action_corrective, responsable_action, date_cloture, status, signature
      } = req.body;

      const id = uuidv4();

      await pool.execute(
        `INSERT INTO sterilization_non_conformites 
        (id, register_id, date_observation, description, type_non_conformite,
         action_corrective, responsable_action, date_cloture, status, signature)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, req.params.id, date_observation, description,
          type_non_conformite || null, action_corrective || null,
          responsable_action || null, date_cloture || null,
          status || 'ouverte', signature || null
        ]
      );

      res.json({ id, message: 'Non-conformité ajoutée' });
    } catch (error) {
      console.error('Erreur lors de l\'ajout de la non-conformité:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur: ' + error.message });
      }
    }
  });

  return router;
};

