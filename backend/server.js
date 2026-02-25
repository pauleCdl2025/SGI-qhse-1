const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const consultationSchedule = require('../src/data/consultationSchedule.json');
require('dotenv').config();

// Import middlewares de validation
const {
  validateSignup,
  validateSignin,
  validatePasswordUpdate,
  validateIncident,
  validateVisitor,
  rateLimitLogin,
  requestLogger,
  loginAttempts
} = require('./middlewares/validation');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// Configuration CORS
app.use(cors({
  origin: ['http://localhost:8080', 'http://localhost:8081'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Middleware de logging
app.use(requestLogger);

// Servir les fichiers statiques (images)
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Configuration MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hospital_management',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Pool de connexions MySQL
const pool = mysql.createPool(dbConfig);

const dayNameToIndex = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6
};

const padWithZero = (value) => value.toString().padStart(2, '0');

const formatDateTime = (date) => {
  const year = date.getFullYear();
  const month = padWithZero(date.getMonth() + 1);
  const day = padWithZero(date.getDate());
  const hours = padWithZero(date.getHours());
  const minutes = padWithZero(date.getMinutes());
  const seconds = padWithZero(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const getDateForDay = (dayIndex, weekOffset = 0) => {
  const now = new Date();
  const currentDay = now.getDay();
  let diff = dayIndex - currentDay;
  if (diff < 0) {
    diff += 7;
  }
  const targetDate = new Date(now);
  targetDate.setHours(0, 0, 0, 0);
  targetDate.setDate(now.getDate() + diff + weekOffset * 7);
  return targetDate;
};

const combineDateAndTime = (date, timeString) => {
  const [hours, minutes] = timeString.split(':').map((v) => parseInt(v, 10));
  const combined = new Date(date);
  combined.setHours(hours, minutes, 0, 0);
  return combined;
};

const CONSULTATION_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes
let lastConsultationSync = 0;

const ensureConsultationSchedule = async (force = false) => {
  try {
    const now = Date.now();
    if (!force && now - lastConsultationSync < CONSULTATION_SYNC_INTERVAL) {
      return;
    }
    lastConsultationSync = now;

    const roomIdCache = new Map();
    const doctorIdCache = new Map();

    const [secretaireRows] = await pool.execute(
      'SELECT id FROM profiles WHERE username = ? LIMIT 1',
      ['secretaire']
    );
    const bookedById = secretaireRows.length > 0 ? secretaireRows[0].id : null;

    for (const dayBlock of consultationSchedule) {
      const dayIndex = dayNameToIndex[dayBlock.day.toLowerCase()];
      if (dayIndex === undefined) {
        continue;
      }

      for (const slot of dayBlock.slots) {
        const roomName = slot.room;
        if (!roomIdCache.has(roomName)) {
          const [existingRooms] = await pool.execute(
            'SELECT id FROM rooms WHERE name = ? LIMIT 1',
            [roomName]
          );

          let roomId;
          if (existingRooms.length > 0) {
            roomId = existingRooms[0].id;
          } else {
            roomId = uuidv4();
            await pool.execute(
              `INSERT INTO rooms (id, name, location, doctor_in_charge)
               VALUES (?, ?, ?, ?)`,
              [
                roomId,
                roomName,
                slot.location || slot.shortRoom || roomName,
                slot.doctor || null
              ]
            );
          }
          roomIdCache.set(roomName, roomId);
        }

        let doctorId = null;
        if (slot.doctor) {
          if (!doctorIdCache.has(slot.doctor)) {
            const [existingDoctors] = await pool.execute(
              'SELECT id FROM doctors WHERE name = ? LIMIT 1',
              [slot.doctor]
            );

            if (existingDoctors.length > 0) {
              doctorIdCache.set(slot.doctor, existingDoctors[0].id);
            } else {
              const newDoctorId = uuidv4();
              await pool.execute(
                `INSERT INTO doctors (id, name, specialty, status)
                 VALUES (?, ?, ?, 'Résident')`,
                [newDoctorId, slot.doctor, slot.specialty || 'Médecine générale']
              );
              doctorIdCache.set(slot.doctor, newDoctorId);
            }
          }
          doctorId = doctorIdCache.get(slot.doctor);
        }

        for (let weekOffset = 0; weekOffset < 4; weekOffset++) {
          const dayDate = getDateForDay(dayIndex, weekOffset);
          const startDate = combineDateAndTime(dayDate, slot.start);
          const endDate = combineDateAndTime(dayDate, slot.end);

          const startTimestamp = formatDateTime(startDate);
          const endTimestamp = formatDateTime(endDate);

          const [existingBookings] = await pool.execute(
            'SELECT id FROM bookings WHERE room_id = ? AND start_time = ? LIMIT 1',
            [roomIdCache.get(roomName), startTimestamp]
          );

          if (existingBookings.length > 0) {
            continue;
          }

          const bookingId = uuidv4();
          await pool.execute(
            `INSERT INTO bookings (id, room_id, title, booked_by, start_time, end_time, doctor_id, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, 'réservé')`,
            [
              bookingId,
              roomIdCache.get(roomName),
              slot.specialty + (slot.doctor ? ` - ${slot.doctor}` : ''),
              bookedById,
              startTimestamp,
              endTimestamp,
              doctorId
            ]
          );
        }
      }
    }

    console.log('[Init] Grille de disponibilité des consultations synchronisée.');
  } catch (error) {
    console.error('[Init] Erreur lors de la synchronisation des consultations:', error);
    lastConsultationSync = 0;
  }
};

ensureConsultationSchedule(true);

// Configuration Multer pour l'upload d'images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadsDir, 'incident_photos');
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

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image sont autorisés'));
    }
  }
});

// Configuration Multer pour l'upload de comptes rendus d'audit
const auditReportStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadsDir, 'audit_reports');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const auditId = req.body.auditId || 'unknown';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `audit-${auditId}-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const uploadAuditReport = multer({
  storage: auditReportStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB pour les documents
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = file.mimetype.includes('pdf') || 
                     file.mimetype.includes('msword') || 
                     file.mimetype.includes('spreadsheet') ||
                     file.mimetype.includes('excel') ||
                     file.mimetype.includes('word') ||
                     file.mimetype.includes('application/pdf') ||
                     file.mimetype.includes('application/vnd.openxmlformats-officedocument') ||
                     file.mimetype.includes('application/vnd.ms-excel');
    if (extname || mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers PDF, Word et Excel sont autorisés'));
    }
  }
});

// Middleware d'authentification
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const [users] = await pool.execute(
      'SELECT * FROM profiles WHERE id = ?',
      [decoded.userId]
    );
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Utilisateur non trouvé' });
    }

    req.user = users[0];
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Token invalide' });
  }
};

// Routes d'authentification
app.post('/api/auth/signup', validateSignup, async (req, res) => {
  try {
    const { email, password, first_name, last_name, username, role, service, civility, pin } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const [existing] = await pool.execute(
      'SELECT * FROM profiles WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existing.length > 0) {
      return res.status(400).json({ error: 'Email ou nom d\'utilisateur déjà utilisé' });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    // Créer l'utilisateur
    await pool.execute(
      `INSERT INTO profiles (id, username, email, password_hash, first_name, last_name, civility, role, service, pin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, username, email, passwordHash, first_name, last_name, civility || 'M.', role, service || '', pin || null]
    );

    // Générer un token JWT
    const token = jwt.sign({ userId: id, email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: { id, email, username },
      token
    });
  } catch (error) {
    console.error('Erreur lors de l\'inscription:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/signin', rateLimitLogin, validateSignin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await pool.execute(
      'SELECT * FROM profiles WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = users[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Réinitialiser le compteur de tentatives en cas de succès
    if (req.rateLimitKey) {
      loginAttempts.delete(req.rateLimitKey);
    }

    const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        username: user.username
      },
      token
    });
  } catch (error) {
    console.error('Erreur lors de la connexion:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/auth/signout', authenticateToken, (req, res) => {
  res.json({ message: 'Déconnexion réussie' });
});

// Changer son propre mot de passe (réservé au superadmin)
app.put('/api/auth/password', authenticateToken, validatePasswordUpdate, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Seul le super administrateur peut modifier les mots de passe.' });
    }

    const { password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    await pool.execute(
      'UPDATE profiles SET password_hash = ? WHERE id = ?',
      [passwordHash, req.user.id]
    );

    res.json({ message: 'Mot de passe mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour réinitialiser le mot de passe d'un utilisateur (réservé au superadmin)
app.put('/api/auth/reset-password/:userId', authenticateToken, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est un super administrateur
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Accès refusé. Seul le super administrateur peut réinitialiser les mots de passe.' });
    }

    const { password } = req.body;
    const { userId } = req.params;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    // Vérifier que l'utilisateur cible existe
    const [users] = await pool.execute('SELECT id FROM profiles WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Hasher le nouveau mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Mettre à jour le mot de passe
    await pool.execute(
      'UPDATE profiles SET password_hash = ? WHERE id = ?',
      [passwordHash, userId]
    );

    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les profils
app.get('/api/profiles', authenticateToken, async (req, res) => {
  try {
    const [profiles] = await pool.execute(
      'SELECT id, username, email, first_name, last_name, civility, role, service, pin, added_permissions, removed_permissions, created_at FROM profiles'
    );
    res.json(profiles);
  } catch (error) {
    console.error('Erreur lors de la récupération des profils:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/profiles/:id', authenticateToken, async (req, res) => {
  try {
    const [profiles] = await pool.execute(
      'SELECT id, username, email, first_name, last_name, civility, role, service, pin, added_permissions, removed_permissions FROM profiles WHERE id = ?',
      [req.params.id]
    );
    if (profiles.length === 0) {
      return res.status(404).json({ error: 'Profil non trouvé' });
    }
    res.json(profiles[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/profiles/:id', authenticateToken, async (req, res) => {
  try {
    const { added_permissions, removed_permissions } = req.body;
    await pool.execute(
      'UPDATE profiles SET added_permissions = ?, removed_permissions = ? WHERE id = ?',
      [JSON.stringify(added_permissions || []), JSON.stringify(removed_permissions || []), req.params.id]
    );
    res.json({ message: 'Profil mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/profiles/:id', authenticateToken, async (req, res) => {
  try {
    // Seul le superadmin peut supprimer des utilisateurs
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    await pool.execute('DELETE FROM profiles WHERE id = ?', [req.params.id]);
    res.json({ message: 'Utilisateur supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'utilisateur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

const safeJsonParse = (value, defaultValue = null) => {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue !== null ? defaultValue : value;
  }
};

// Routes pour les incidents
app.get('/api/incidents', authenticateToken, async (req, res) => {
  try {
    const [incidents] = await pool.execute(
      'SELECT * FROM incidents ORDER BY date_creation DESC'
    );
    res.json(incidents.map(inc => {
      // Debug: vérifier la priorité dans la DB
      let rawPriorite = inc.priorite;
      
      // Conversion explicite en string (MySQL peut retourner des Buffers ou d'autres types)
      if (rawPriorite != null && rawPriorite !== undefined) {
        // Si c'est un Buffer, le convertir en string
        if (Buffer.isBuffer(rawPriorite)) {
          rawPriorite = rawPriorite.toString('utf8');
        }
        // Si c'est un objet avec une méthode toString, l'utiliser
        else if (typeof rawPriorite === 'object' && rawPriorite.toString) {
          rawPriorite = rawPriorite.toString();
        }
        // Sinon convertir en string
        else {
          rawPriorite = String(rawPriorite);
        }
      }
      
      console.log('Incident priorité DB:', inc.id, 'priorité brute:', rawPriorite, 'type:', typeof rawPriorite, 'valeur:', JSON.stringify(rawPriorite));
      
      // Normaliser la priorité (enlever espaces, convertir en minuscules)
      let normalizedPriorite = 'moyenne'; // Valeur par défaut
      if (rawPriorite && typeof rawPriorite === 'string') {
        normalizedPriorite = rawPriorite.trim().toLowerCase();
      }
      
      // S'assurer que la priorité existe et est valide
      const validPriorities = ['faible', 'moyenne', 'haute', 'critique'];
      const priorite = validPriorities.includes(normalizedPriorite) ? normalizedPriorite : 'moyenne';
      
      console.log('Incident priorité normalisée:', inc.id, 'raw:', rawPriorite, 'normalized:', normalizedPriorite, 'final:', priorite);
      
      return {
        ...inc,
        priorite: priorite, // Forcer la priorité à une valeur valide
        assigned_to_name: inc.assigned_to_name || null,
        prestataire: inc.prestataire || null,
        photo_urls: (() => {
          const parsed = safeJsonParse(inc.photo_urls, []);
          if (Array.isArray(parsed)) {
            return parsed;
          }
          if (typeof parsed === 'string' && parsed.trim() !== '') {
            return [parsed];
          }
          return [];
        })(),
        report: safeJsonParse(inc.report, null)
      };
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des incidents:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/incidents', authenticateToken, validateIncident, async (req, res) => {
  try {
    const { type, description, priorite, service, lieu, photo_urls } = req.body;
    const id = uuidv4();
    
    // Debug: vérifier la priorité reçue après validation middleware
    console.log('POST /api/incidents - Body complet:', JSON.stringify(req.body));
    console.log('POST /api/incidents - priorite depuis req.body:', priorite, 'type:', typeof priorite);
    console.log('POST /api/incidents - req.body.priorite:', req.body.priorite, 'type:', typeof req.body.priorite);
    
    // La priorité devrait déjà être validée et préservée par le middleware
    // Utiliser directement req.body.priorite qui a été normalisé par le middleware
    let finalPriorite = req.body.priorite || 'moyenne';
    
    // Normaliser la priorité (minuscules, sans espaces) - double vérification
    if (finalPriorite && typeof finalPriorite === 'string') {
      const normalized = finalPriorite.trim().toLowerCase();
      const validPriorities = ['faible', 'moyenne', 'haute', 'critique'];
      if (validPriorities.includes(normalized)) {
        finalPriorite = normalized;
      } else {
        console.warn('POST /api/incidents - Priorité normalisée invalide, utilisation de "moyenne":', normalized);
        finalPriorite = 'moyenne';
      }
    } else {
      console.warn('POST /api/incidents - Priorité manquante ou invalide, utilisation de "moyenne"');
      finalPriorite = 'moyenne';
    }

    console.log('POST /api/incidents - Valeur de priorité finale à insérer:', finalPriorite, 'type:', typeof finalPriorite);
    
    await pool.execute(
      `INSERT INTO incidents (id, type, description, reported_by, statut, priorite, service, lieu, photo_urls, assigned_to_name)
       VALUES (?, ?, ?, ?, 'nouveau', ?, ?, ?, ?, NULL)`,
      [id, type, description, req.user.id, finalPriorite, service, lieu, JSON.stringify(photo_urls || [])]
    );

    // Vérifier que la priorité a bien été sauvegardée (immédiatement après insertion)
    const [savedIncident] = await pool.execute(
      'SELECT priorite, CAST(priorite AS CHAR) as priorite_str FROM incidents WHERE id = ?',
      [id]
    );
    
    const savedPriorite = savedIncident[0]?.priorite;
    const savedPrioriteStr = savedIncident[0]?.priorite_str;
    console.log('Priorité sauvegardée en DB (raw):', savedPriorite, 'type:', typeof savedPriorite);
    console.log('Priorité sauvegardée en DB (as CHAR):', savedPrioriteStr, 'type:', typeof savedPrioriteStr);
    
    // Si la priorité sauvegardée ne correspond pas, c'est qu'il y a un problème
    if (savedPriorite !== finalPriorite) {
      console.error('ERREUR: Priorité différente! Insérée:', finalPriorite, 'Récupérée:', savedPriorite);
    }

    res.json({ id, message: 'Incident créé' });
  } catch (error) {
    console.error('Erreur lors de la création de l\'incident:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/incidents/:id', authenticateToken, async (req, res) => {
  try {
    const { statut, assigned_to, assigned_to_name, prestataire, priorite, deadline, report } = req.body;
    
    // Récupérer l'incident existant pour vérifier les permissions
    const [incidents] = await pool.execute('SELECT * FROM incidents WHERE id = ?', [req.params.id]);
    if (incidents.length === 0) {
      return res.status(404).json({ error: 'Incident non trouvé' });
    }
    const incident = incidents[0];

    // Si on essaie d'assigner ou de modifier la priorité/déadline, seul le superviseur QHSE peut le faire
    // (sauf si c'est juste une mise à jour de statut par l'assigné lui-même)
    if (assigned_to !== undefined || priorite !== undefined || deadline !== undefined) {
      const isStatusUpdateOnly = statut !== undefined && 
                                  assigned_to === undefined && 
                                  priorite === undefined && 
                                  deadline === undefined &&
                                  report === undefined;
      
      // Si ce n'est pas juste une mise à jour de statut, ou si on essaie d'assigner, vérifier les permissions
      if (!isStatusUpdateOnly || assigned_to !== undefined) {
        if (req.user.role !== 'superviseur_qhse' && req.user.role !== 'superadmin') {
          return res.status(403).json({ error: 'Seul le superviseur QHSE peut assigner ou planifier des interventions' });
        }
      }
    }

    const updates = [];
    const values = [];

    if (statut !== undefined) {
      updates.push('statut = ?');
      values.push(statut);
    }
    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(assigned_to);
      
      // Si assigned_to_name n'est pas fourni mais assigned_to l'est, récupérer le nom depuis la base
      if (assigned_to_name === undefined) {
        try {
          const [userRows] = await pool.execute('SELECT first_name, last_name, name, username FROM profiles WHERE id = ?', [assigned_to]);
          if (userRows.length > 0) {
            const user = userRows[0];
            const nameParts = [user.first_name, user.last_name].filter(Boolean);
            const fullName = nameParts.length > 0 ? nameParts.join(' ') : (user.name || user.username || null);
            if (fullName) {
              updates.push('assigned_to_name = ?');
              values.push(fullName);
            }
          }
        } catch (err) {
          console.error('Erreur lors de la récupération du nom de l\'utilisateur:', err);
        }
      } else if (assigned_to_name !== null) {
        updates.push('assigned_to_name = ?');
        values.push(assigned_to_name);
      } else {
        // Si assigned_to_name est explicitement null, le mettre à null
        updates.push('assigned_to_name = NULL');
      }
    } else if (assigned_to_name !== undefined) {
      // Si seulement assigned_to_name est fourni (sans assigned_to)
      updates.push('assigned_to_name = ?');
      values.push(assigned_to_name);
    }
    if (priorite !== undefined) {
      updates.push('priorite = ?');
      values.push(priorite);
    }
    if (deadline !== undefined) {
      updates.push('deadline = ?');
      values.push(deadline);
    }
    if (prestataire !== undefined) {
      updates.push('prestataire = ?');
      values.push(prestataire || null);
    }
    if (report !== undefined) {
      updates.push('report = ?');
      values.push(JSON.stringify(report));
    }

    values.push(req.params.id);
    await pool.execute(
      `UPDATE incidents SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({ message: 'Incident mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'incident:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les commentaires d'incidents
app.get('/api/incidents/:id/comments', authenticateToken, async (req, res) => {
  try {
    const [comments] = await pool.execute(
      'SELECT * FROM incident_comments WHERE incident_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(comments.map(c => ({
      ...c,
      created_at: new Date(c.created_at),
      updated_at: c.updated_at ? new Date(c.updated_at) : undefined
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des commentaires:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/incidents/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { comment, user_name } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Le commentaire ne peut pas être vide' });
    }
    
    const id = uuidv4();
    await pool.execute(
      'INSERT INTO incident_comments (id, incident_id, user_id, user_name, comment) VALUES (?, ?, ?, ?, ?)',
      [id, req.params.id, req.user.id, user_name || req.user.username, comment.trim()]
    );
    
    const [newComment] = await pool.execute('SELECT * FROM incident_comments WHERE id = ?', [id]);
    res.json({
      ...newComment[0],
      created_at: new Date(newComment[0].created_at),
      updated_at: newComment[0].updated_at ? new Date(newComment[0].updated_at) : undefined
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du commentaire:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/incidents/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [incidents] = await pool.execute('SELECT reported_by FROM incidents WHERE id = ?', [id]);

    if (incidents.length === 0) {
      // Déjà supprimé ou inexistant : considérer comme succès idempotent
      return res.json({ success: true, message: 'Incident déjà supprimé.' });
    }

    const incident = incidents[0];
    const allowedRoles = ['superadmin', 'superviseur_qhse', 'biomedical'];

    if (incident.reported_by !== req.user.id && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer cet incident.' });
    }

    await pool.execute('DELETE FROM incidents WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'incident:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Upload d'images pour les incidents
app.post('/api/incidents/upload-images', authenticateToken, upload.array('images', 10), (req, res) => {
  try {
    const urls = req.files.map(file => {
      return `${process.env.UPLOAD_BASE_URL || 'http://localhost:3001/uploads'}/incident_photos/${file.filename}`;
    });
    res.json({ urls });
  } catch (error) {
    console.error('Erreur lors de l\'upload des images:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Configuration Multer pour l'upload d'images de déchets médicaux
const wasteStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(uploadsDir, 'waste_photos');
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

const uploadWaste = multer({ 
  storage: wasteStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image sont autorisés'));
    }
  }
});

// Upload d'images pour les déchets médicaux
app.post('/api/medical-waste/upload-images', authenticateToken, (req, res, next) => {
  console.log('📸 Upload d\'images de déchets médicaux - Fichiers reçus:', req.files?.length || 0);
  uploadWaste.array('images', 10)(req, res, (err) => {
    if (err) {
      console.error('❌ Erreur Multer lors de l\'upload des images de déchets:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Fichier trop volumineux (max 10MB)' });
      }
      if (err.message && err.message.includes('image')) {
        return res.status(400).json({ error: 'Seuls les fichiers image sont autorisés' });
      }
      return res.status(400).json({ error: 'Erreur lors de l\'upload: ' + err.message });
    }
    next();
  });
}, (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      console.warn('⚠️ Aucun fichier reçu pour l\'upload de déchets médicaux');
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }
    
    console.log(`✅ ${req.files.length} fichier(s) reçu(s) pour l'upload de déchets médicaux`);
    const urls = req.files.map(file => {
      const url = `${process.env.UPLOAD_BASE_URL || 'http://localhost:3001/uploads'}/waste_photos/${file.filename}`;
      console.log(`  - Fichier sauvegardé: ${file.filename} -> ${url}`);
      return url;
    });
    res.json({ urls });
  } catch (error) {
    console.error('❌ Erreur lors de l\'upload des images de déchets:', error);
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Routes pour les visiteurs
app.get('/api/visitors', authenticateToken, async (req, res) => {
  try {
    const [visitors] = await pool.execute(
      'SELECT * FROM visitors ORDER BY entry_time DESC'
    );
    res.json(visitors);
  } catch (error) {
    console.error('Erreur lors de la récupération des visiteurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/visitors', authenticateToken, validateVisitor, async (req, res) => {
  try {
    const { full_name, id_document, reason, destination, person_to_see } = req.body;
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO visitors (id, full_name, id_document, reason, destination, person_to_see, registered_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, full_name, id_document, reason, destination, person_to_see, req.user.id]
    );

    res.json({ id, message: 'Visiteur enregistré' });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du visiteur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/visitors/:id/signout', authenticateToken, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE visitors SET exit_time = NOW() WHERE id = ?',
      [req.params.id]
    );
    res.json({ message: 'Sortie enregistrée' });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement de la sortie:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Suppression d'un visiteur
app.delete('/api/visitors/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM visitors WHERE id = ?', [req.params.id]);
    res.json({ message: 'Visiteur supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression du visiteur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les équipements biomédicaux
app.get('/api/biomedical-equipment', authenticateToken, async (req, res) => {
  try {
    const [equipment] = await pool.execute('SELECT * FROM biomedical_equipment');
    res.json(equipment);
  } catch (error) {
    console.error('Erreur lors de la récupération des équipements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/biomedical-equipment', authenticateToken, async (req, res) => {
  try {
    const { name, serial_number, location, model, department, notes } = req.body;
    const id = uuidv4();
    const nextMaintenance = new Date();
    nextMaintenance.setMonth(nextMaintenance.getMonth() + 6);

    await pool.execute(
      `INSERT INTO biomedical_equipment (
        id,
        name,
        model,
        serial_number,
        department,
        location,
        status,
        last_maintenance,
        next_maintenance,
        notes
      )
       VALUES (?, ?, ?, ?, ?, ?, 'opérationnel', NOW(), ?, ?)`,
      [
        id,
        name,
        model || 'N/A',
        serial_number,
        department || 'N/A',
        location,
        nextMaintenance,
        notes || null
      ]
    );

    res.json({ id, message: 'Équipement ajouté' });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'équipement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/biomedical-equipment/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.execute('UPDATE biomedical_equipment SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Statut mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les tâches de maintenance
app.get('/api/maintenance-tasks', authenticateToken, async (req, res) => {
  try {
    const [tasks] = await pool.execute('SELECT * FROM maintenance_tasks ORDER BY scheduled_date');
    res.json(tasks);
  } catch (error) {
    console.error('Erreur lors de la récupération des tâches:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/maintenance-tasks', authenticateToken, async (req, res) => {
  try {
    const { equipment_id, type, description, technician_id, scheduled_date, supplier_name, supplier_phone, comments } = req.body;
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO maintenance_tasks (
        id,
        equipment_id,
        type,
        description,
        technician_id,
        scheduled_date,
        supplier_name,
        supplier_phone,
        comments,
        status
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planifiée')`,
      [
        id,
        equipment_id,
        type,
        description,
        technician_id || null,
        scheduled_date,
        supplier_name || null,
        supplier_phone || null,
        comments || null
      ]
    );

    res.json({ id, message: 'Tâche planifiée' });
  } catch (error) {
    console.error('Erreur lors de la planification de la tâche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/maintenance-tasks/:id/status', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['planifiée', 'en_cours', 'terminée', 'annulée'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }
    const [result] = await pool.execute('UPDATE maintenance_tasks SET status = ? WHERE id = ?', [status, req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }
    res.json({ message: 'Statut de la tâche mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut de la tâche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les Accidents d'Exposition au Sang (AES)
app.get('/api/aes', authenticateToken, async (req, res) => {
  try {
    const [aes] = await pool.execute(
      `SELECT a.*, 
              CONCAT(p.first_name, ' ', p.last_name) as created_by_name
       FROM aes a
       LEFT JOIN profiles p ON a.created_by = p.id
       ORDER BY a.date_aes DESC, a.heure_aes DESC`
    );
    res.json(aes);
  } catch (error) {
    console.error('Erreur lors de la récupération des AES:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/aes/:id', authenticateToken, async (req, res) => {
  try {
    const [aes] = await pool.execute(
      `SELECT a.*, 
              CONCAT(p.first_name, ' ', p.last_name) as created_by_name
       FROM aes a
       LEFT JOIN profiles p ON a.created_by = p.id
       WHERE a.id = ?`,
      [req.params.id]
    );
    if (aes.length === 0) {
      return res.status(404).json({ error: 'AES non trouvé' });
    }
    res.json(aes[0]);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'AES:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/aes', authenticateToken, async (req, res) => {
  try {
    console.log('POST /api/aes - Données reçues:', JSON.stringify(req.body, null, 2));
    
    const {
      agent_nom, agent_prenom, agent_matricule, agent_fonction, agent_service, agent_telephone, agent_statut,
      date_aes, heure_aes, lieu_precis, type_exposition, description_circonstances,
      type_dispositif, usage_unique, souille_sang, dans_sac_dasri,
      patient_source_identifiee, patient_code_identifiant, consentement_prelevement,
      lavage_eau_savon, desinfection, rinçage_muqueuse, heure_premiers_soins,
      medecin_referent_aes, examen_vih, examen_vhb, examen_vhc, traitement_arv_initie, date_debut_traitement,
      resultat_agent_vih, resultat_agent_vhb, resultat_agent_vhc,
      resultat_patient_vih, resultat_patient_vhb, resultat_patient_vhc, conduite_tenir,
      orientation_infectiologue, orientation_psychologue, dates_suivi_prevues,
      suivi_m1_date, suivi_m1_vih, suivi_m1_vhb, suivi_m1_vhc,
      suivi_m6_date, suivi_m6_vih, suivi_m6_vhb, suivi_m6_vhc,
      suivi_m9_date, suivi_m9_vih, suivi_m9_vhb, suivi_m9_vhc,
      dossier_cloture, date_cloture, nom_signature_qhse
    } = req.body;

    const id = uuidv4();
    
    // Fonction helper pour convertir undefined en null
    const toNull = (val) => (val === undefined || val === '') ? null : val;
    const toBool = (val) => val === true ? true : (val === false ? false : null);
    
    // Préparer les valeurs pour l'insertion
    const values = [
      id, 
      agent_nom, 
      agent_prenom, 
      toNull(agent_matricule), 
      toNull(agent_fonction), 
      toNull(agent_service), 
      toNull(agent_telephone), 
      agent_statut,
      date_aes, 
      heure_aes, 
      toNull(lieu_precis), 
      type_exposition, 
      toNull(description_circonstances),
      toNull(type_dispositif), 
      toBool(usage_unique), 
      toBool(souille_sang), 
      toBool(dans_sac_dasri),
      toBool(patient_source_identifiee), 
      toNull(patient_code_identifiant), 
      toBool(consentement_prelevement),
      toBool(lavage_eau_savon), 
      toBool(desinfection), 
      toBool(rinçage_muqueuse), 
      toNull(heure_premiers_soins),
      toNull(medecin_referent_aes), 
      examen_vih || false, 
      examen_vhb || false, 
      examen_vhc || false, 
      toBool(traitement_arv_initie), 
      toNull(date_debut_traitement),
      toBool(resultat_agent_vih), 
      toBool(resultat_agent_vhb), 
      toBool(resultat_agent_vhc),
      toBool(resultat_patient_vih), 
      toBool(resultat_patient_vhb), 
      toBool(resultat_patient_vhc), 
      toNull(conduite_tenir),
      toBool(orientation_infectiologue), 
      toBool(orientation_psychologue), 
      toNull(dates_suivi_prevues),
      toNull(suivi_m1_date), 
      toBool(suivi_m1_vih), 
      toBool(suivi_m1_vhb), 
      toBool(suivi_m1_vhc),
      toNull(suivi_m6_date), 
      toBool(suivi_m6_vih), 
      toBool(suivi_m6_vhb), 
      toBool(suivi_m6_vhc),
      toNull(suivi_m9_date), 
      toBool(suivi_m9_vih), 
      toBool(suivi_m9_vhb), 
      toBool(suivi_m9_vhc),
      dossier_cloture || false, 
      toNull(date_cloture), 
      toNull(nom_signature_qhse), 
      req.user.id
    ];
    
    console.log('POST /api/aes - Nombre de valeurs:', values.length);
    console.log('POST /api/aes - Valeurs:', JSON.stringify(values, null, 2));

    await pool.execute(
      `INSERT INTO aes (
        id, agent_nom, agent_prenom, agent_matricule, agent_fonction, agent_service, agent_telephone, agent_statut,
        date_aes, heure_aes, lieu_precis, type_exposition, description_circonstances,
        type_dispositif, usage_unique, souille_sang, dans_sac_dasri,
        patient_source_identifiee, patient_code_identifiant, consentement_prelevement,
        lavage_eau_savon, desinfection, rinçage_muqueuse, heure_premiers_soins,
        medecin_referent_aes, examen_vih, examen_vhb, examen_vhc, traitement_arv_initie, date_debut_traitement,
        resultat_agent_vih, resultat_agent_vhb, resultat_agent_vhc,
        resultat_patient_vih, resultat_patient_vhb, resultat_patient_vhc, conduite_tenir,
        orientation_infectiologue, orientation_psychologue, dates_suivi_prevues,
        suivi_m1_date, suivi_m1_vih, suivi_m1_vhb, suivi_m1_vhc,
        suivi_m6_date, suivi_m6_vih, suivi_m6_vhb, suivi_m6_vhc,
        suivi_m9_date, suivi_m9_vih, suivi_m9_vhb, suivi_m9_vhc,
        dossier_cloture, date_cloture, nom_signature_qhse, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values
    );

    console.log('POST /api/aes - AES créé avec succès, ID:', id);
    res.json({ id, message: 'AES créé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la création de l\'AES:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.put('/api/aes/:id', authenticateToken, async (req, res) => {
  try {
    console.log('PUT /api/aes/:id - Données reçues:', JSON.stringify(req.body, null, 2));
    
    const {
      agent_nom, agent_prenom, agent_matricule, agent_fonction, agent_service, agent_telephone, agent_statut,
      date_aes, heure_aes, lieu_precis, type_exposition, description_circonstances,
      type_dispositif, usage_unique, souille_sang, dans_sac_dasri,
      patient_source_identifiee, patient_code_identifiant, consentement_prelevement,
      lavage_eau_savon, desinfection, rinçage_muqueuse, heure_premiers_soins,
      medecin_referent_aes, examen_vih, examen_vhb, examen_vhc, traitement_arv_initie, date_debut_traitement,
      resultat_agent_vih, resultat_agent_vhb, resultat_agent_vhc,
      resultat_patient_vih, resultat_patient_vhb, resultat_patient_vhc, conduite_tenir,
      orientation_infectiologue, orientation_psychologue, dates_suivi_prevues,
      suivi_m1_date, suivi_m1_vih, suivi_m1_vhb, suivi_m1_vhc,
      suivi_m6_date, suivi_m6_vih, suivi_m6_vhb, suivi_m6_vhc,
      suivi_m9_date, suivi_m9_vih, suivi_m9_vhb, suivi_m9_vhc,
      dossier_cloture, date_cloture, nom_signature_qhse
    } = req.body;

    // Fonction helper pour convertir undefined en null
    const toNull = (val) => (val === undefined || val === '') ? null : val;
    const toBool = (val) => val === true ? true : (val === false ? false : null);

    const updates = [];
    const values = [];

    // Construire dynamiquement la requête UPDATE avec gestion correcte des types
    const fields = {
      agent_nom, 
      agent_prenom, 
      agent_matricule: toNull(agent_matricule), 
      agent_fonction: toNull(agent_fonction), 
      agent_service: toNull(agent_service), 
      agent_telephone: toNull(agent_telephone), 
      agent_statut,
      date_aes, 
      heure_aes, 
      lieu_precis: toNull(lieu_precis), 
      type_exposition, 
      description_circonstances: toNull(description_circonstances),
      type_dispositif: toNull(type_dispositif), 
      usage_unique: toBool(usage_unique), 
      souille_sang: toBool(souille_sang), 
      dans_sac_dasri: toBool(dans_sac_dasri),
      patient_source_identifiee: toBool(patient_source_identifiee), 
      patient_code_identifiant: toNull(patient_code_identifiant), 
      consentement_prelevement: toBool(consentement_prelevement),
      lavage_eau_savon: toBool(lavage_eau_savon), 
      desinfection: toBool(desinfection), 
      rinçage_muqueuse: toBool(rinçage_muqueuse), 
      heure_premiers_soins: toNull(heure_premiers_soins),
      medecin_referent_aes: toNull(medecin_referent_aes), 
      examen_vih: examen_vih !== undefined ? (examen_vih || false) : undefined, 
      examen_vhb: examen_vhb !== undefined ? (examen_vhb || false) : undefined, 
      examen_vhc: examen_vhc !== undefined ? (examen_vhc || false) : undefined, 
      traitement_arv_initie: toBool(traitement_arv_initie), 
      date_debut_traitement: toNull(date_debut_traitement),
      resultat_agent_vih: toBool(resultat_agent_vih), 
      resultat_agent_vhb: toBool(resultat_agent_vhb), 
      resultat_agent_vhc: toBool(resultat_agent_vhc),
      resultat_patient_vih: toBool(resultat_patient_vih), 
      resultat_patient_vhb: toBool(resultat_patient_vhb), 
      resultat_patient_vhc: toBool(resultat_patient_vhc), 
      conduite_tenir: toNull(conduite_tenir),
      orientation_infectiologue: toBool(orientation_infectiologue), 
      orientation_psychologue: toBool(orientation_psychologue), 
      dates_suivi_prevues: toNull(dates_suivi_prevues),
      suivi_m1_date: toNull(suivi_m1_date), 
      suivi_m1_vih: toBool(suivi_m1_vih), 
      suivi_m1_vhb: toBool(suivi_m1_vhb), 
      suivi_m1_vhc: toBool(suivi_m1_vhc),
      suivi_m6_date: toNull(suivi_m6_date), 
      suivi_m6_vih: toBool(suivi_m6_vih), 
      suivi_m6_vhb: toBool(suivi_m6_vhb), 
      suivi_m6_vhc: toBool(suivi_m6_vhc),
      suivi_m9_date: toNull(suivi_m9_date), 
      suivi_m9_vih: toBool(suivi_m9_vih), 
      suivi_m9_vhb: toBool(suivi_m9_vhb), 
      suivi_m9_vhc: toBool(suivi_m9_vhc),
      dossier_cloture: dossier_cloture !== undefined ? (dossier_cloture || false) : undefined, 
      date_cloture: toNull(date_cloture), 
      nom_signature_qhse: toNull(nom_signature_qhse)
    };

    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    values.push(req.params.id);

    console.log('PUT /api/aes/:id - Requête UPDATE:', updates.join(', '));
    console.log('PUT /api/aes/:id - Valeurs:', JSON.stringify(values, null, 2));

    await pool.execute(
      `UPDATE aes SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    console.log('PUT /api/aes/:id - AES mis à jour avec succès');
    res.json({ message: 'AES mis à jour avec succès' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'AES:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erreur serveur',
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.delete('/api/aes/:id', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM aes WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'AES non trouvé' });
    }
    res.json({ message: 'AES supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'AES:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les demandes d'accès aux caméras
app.get('/api/camera-access-requests', authenticateToken, async (req, res) => {
  try {
    // Vérifier si la table existe, sinon la créer
    let hasTable = false;
    try {
      const [tables] = await pool.execute(
        `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'camera_access_requests'`,
        [dbConfig.database]
      );
      hasTable = Number(tables?.[0]?.cnt || 0) > 0;
    } catch (checkError) {
      console.error('Erreur lors de la vérification de la table:', checkError);
      // Si on ne peut pas vérifier, on essaie de créer la table
      hasTable = false;
    }
    
    if (!hasTable) {
      try {
        console.log('🛠️  Création de la table camera_access_requests...');
        await pool.execute(`
          CREATE TABLE IF NOT EXISTS camera_access_requests (
            id VARCHAR(36) PRIMARY KEY,
            requester_id VARCHAR(36) NOT NULL,
            requester_name VARCHAR(255),
            requester_service VARCHAR(255),
            requester_position VARCHAR(255),
            request_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            access_reason TEXT NOT NULL,
            access_start_date DATE NOT NULL,
            access_end_date DATE NOT NULL,
            access_start_time TIME,
            access_end_time TIME,
            camera_zones TEXT,
            hierarchical_authorization VARCHAR(255),
            hierarchical_authorization_date DATETIME,
            status ENUM('en_attente', 'approuve', 'refuse', 'annule') NOT NULL DEFAULT 'en_attente',
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_requester_id (requester_id),
            INDEX idx_status (status),
            INDEX idx_request_date (request_date)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log('✅ Table camera_access_requests créée.');
        // Retourner un tableau vide si la table vient d'être créée
        return res.json([]);
      } catch (createError) {
        console.error('Erreur lors de la création de la table:', createError);
        // Si la création échoue, retourner un tableau vide plutôt qu'une erreur
        return res.json([]);
      }
    }

    // Si la table existe, récupérer les demandes
    try {
      const [requests] = await pool.execute(
        `SELECT car.*, 
                COALESCE(car.requester_name, CONCAT(p.first_name, ' ', p.last_name)) as requester_name,
                COALESCE(car.requester_service, p.service) as requester_service
         FROM camera_access_requests car
         LEFT JOIN profiles p ON car.requester_id = p.id
         ORDER BY car.request_date DESC`
      );
      
      res.json(requests.map(req => {
        try {
          return {
            ...req,
            request_date: req.request_date ? new Date(req.request_date).toISOString() : null,
            access_start_date: req.access_start_date ? new Date(req.access_start_date).toISOString() : null,
            access_end_date: req.access_end_date ? new Date(req.access_end_date).toISOString() : null,
            hierarchical_authorization_date: req.hierarchical_authorization_date ? new Date(req.hierarchical_authorization_date).toISOString() : null,
            qhse_validation_date: req.qhse_validation_date ? new Date(req.qhse_validation_date).toISOString() : null,
            created_at: req.created_at ? new Date(req.created_at).toISOString() : null,
            updated_at: req.updated_at ? new Date(req.updated_at).toISOString() : null,
          };
        } catch (dateError) {
          console.error('Erreur lors de la conversion de date:', dateError, req);
          return req; // Retourner l'objet tel quel si la conversion échoue
        }
      }));
    } catch (queryError) {
      // Si la table n'existe pas (ER_NO_SUCH_TABLE), retourner un tableau vide
      if (queryError.code === 'ER_NO_SUCH_TABLE' || queryError.message?.includes("doesn't exist")) {
        console.log('Table camera_access_requests n\'existe pas, retour d\'un tableau vide');
        return res.json([]);
      }
      throw queryError; // Relancer l'erreur si ce n'est pas une erreur de table manquante
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des demandes d\'accès aux caméras:', error);
    console.error('Code erreur:', error.code);
    console.error('Message:', error.message);
    console.error('SQL Message:', error.sqlMessage);
    
    // Si c'est une erreur de table manquante, retourner un tableau vide
    if (error.code === 'ER_NO_SUCH_TABLE' || error.message?.includes("doesn't exist")) {
      return res.json([]);
    }
    
    res.status(500).json({ 
      error: 'Erreur serveur', 
      details: error.message,
      code: error.code 
    });
  }
});

app.get('/api/camera-access-requests/:id', authenticateToken, async (req, res) => {
  try {
    const [requests] = await pool.execute(
      `SELECT car.*, 
              COALESCE(car.requester_name, CONCAT(p.first_name, ' ', p.last_name)) as requester_name,
              COALESCE(car.requester_service, p.service) as requester_service
       FROM camera_access_requests car
       LEFT JOIN profiles p ON car.requester_id = p.id
       WHERE car.id = ?`,
      [req.params.id]
    );
    if (requests.length === 0) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    const req = requests[0];
    res.json({
      ...req,
      request_date: req.request_date ? new Date(req.request_date).toISOString() : null,
      access_start_date: req.access_start_date ? new Date(req.access_start_date).toISOString() : null,
      access_end_date: req.access_end_date ? new Date(req.access_end_date).toISOString() : null,
      hierarchical_authorization_date: req.hierarchical_authorization_date ? new Date(req.hierarchical_authorization_date).toISOString() : null,
      qhse_validation_date: req.qhse_validation_date ? new Date(req.qhse_validation_date).toISOString() : null,
      created_at: req.created_at ? new Date(req.created_at).toISOString() : null,
      updated_at: req.updated_at ? new Date(req.updated_at).toISOString() : null,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la demande d\'accès:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/camera-access-requests', authenticateToken, async (req, res) => {
  try {
    const {
      requester_id,
      requester_name,
      requester_service,
      request_date,
      access_reason,
      access_start_date,
      access_end_date,
      access_start_time,
      access_end_time,
      camera_zones,
      hierarchical_authorization,
      notes,
      qhse_validation,
      qhse_validation_date,
      requester_signature
    } = req.body;

    if (!requester_id || !access_reason || !access_start_date || !access_end_date) {
      return res.status(400).json({ error: 'Champs obligatoires manquants' });
    }

    // Utiliser les valeurs fournies (même si vides, elles doivent être remplies par le frontend)
    // Si elles ne sont pas fournies du tout (undefined), alors utiliser le profil comme fallback
    let finalRequesterName = requester_name;
    let finalRequesterService = requester_service;
    
    // Seulement utiliser le profil si les valeurs ne sont pas du tout fournies (undefined)
    // Si elles sont des chaînes vides, c'est une erreur de validation côté frontend
    if (finalRequesterName === undefined || finalRequesterService === undefined) {
      const [profiles] = await pool.execute(
        'SELECT first_name, last_name, service FROM profiles WHERE id = ?',
        [requester_id]
      );

      if (profiles.length === 0) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      const profile = profiles[0];
      if (finalRequesterName === undefined) {
        finalRequesterName = `${profile.first_name} ${profile.last_name}`;
      }
      if (finalRequesterService === undefined) {
        finalRequesterService = profile.service || null;
      }
    }
    
    // Validation : les champs doivent être remplis
    if (!finalRequesterName || !finalRequesterName.trim()) {
      return res.status(400).json({ error: 'Le nom du demandeur est obligatoire' });
    }
    if (!finalRequesterService || !finalRequesterService.trim()) {
      return res.status(400).json({ error: 'Le service/département est obligatoire' });
    }

    const id = uuidv4();
    // Utiliser l'heure actuelle pour la date de demande (moment de la soumission)
    const now = new Date();
    const finalRequestDate = formatDateTime(now);

    await pool.execute(
      `INSERT INTO camera_access_requests (
        id, requester_id, requester_name, requester_service, request_date,
        access_reason, access_start_date, access_end_date, access_start_time, access_end_time,
        camera_zones, hierarchical_authorization, notes, qhse_validation, qhse_validation_date, requester_signature, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'en_attente')`,
      [
        id, requester_id, finalRequesterName, finalRequesterService, finalRequestDate,
        access_reason, access_start_date, access_end_date, access_start_time || null, access_end_time || null,
        camera_zones || null, hierarchical_authorization || null, notes || null,
        qhse_validation || null, qhse_validation_date || null, requester_signature || null
      ]
    );

    const [newRequest] = await pool.execute(
      'SELECT * FROM camera_access_requests WHERE id = ?',
      [id]
    );

    res.status(201).json({
      ...newRequest[0],
      request_date: newRequest[0].request_date ? new Date(newRequest[0].request_date).toISOString() : null,
      access_start_date: newRequest[0].access_start_date ? new Date(newRequest[0].access_start_date).toISOString() : null,
      access_end_date: newRequest[0].access_end_date ? new Date(newRequest[0].access_end_date).toISOString() : null,
      qhse_validation_date: newRequest[0].qhse_validation_date ? new Date(newRequest[0].qhse_validation_date).toISOString() : null,
      created_at: newRequest[0].created_at ? new Date(newRequest[0].created_at).toISOString() : null,
      updated_at: newRequest[0].updated_at ? new Date(newRequest[0].updated_at).toISOString() : null,
    });
  } catch (error) {
    console.error('Erreur lors de la création de la demande d\'accès:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/camera-access-requests/:id', authenticateToken, async (req, res) => {
  try {
    const {
      status,
      hierarchical_authorization,
      hierarchical_authorization_date,
      notes
    } = req.body;

    const updates = [];
    const values = [];

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (hierarchical_authorization !== undefined) {
      updates.push('hierarchical_authorization = ?');
      values.push(hierarchical_authorization || null);
    }
    if (hierarchical_authorization_date !== undefined) {
      updates.push('hierarchical_authorization_date = ?');
      values.push(hierarchical_authorization_date ? formatDateTime(new Date(hierarchical_authorization_date)) : null);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune modification à effectuer' });
    }

    values.push(req.params.id);

    await pool.execute(
      `UPDATE camera_access_requests SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    const [updatedRequest] = await pool.execute(
      'SELECT * FROM camera_access_requests WHERE id = ?',
      [req.params.id]
    );

    if (updatedRequest.length === 0) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }

    res.json({
      ...updatedRequest[0],
      request_date: updatedRequest[0].request_date ? new Date(updatedRequest[0].request_date).toISOString() : null,
      access_start_date: updatedRequest[0].access_start_date ? new Date(updatedRequest[0].access_start_date).toISOString() : null,
      access_end_date: updatedRequest[0].access_end_date ? new Date(updatedRequest[0].access_end_date).toISOString() : null,
      hierarchical_authorization_date: updatedRequest[0].hierarchical_authorization_date ? new Date(updatedRequest[0].hierarchical_authorization_date).toISOString() : null,
      qhse_validation_date: updatedRequest[0].qhse_validation_date ? new Date(updatedRequest[0].qhse_validation_date).toISOString() : null,
      created_at: updatedRequest[0].created_at ? new Date(updatedRequest[0].created_at).toISOString() : null,
      updated_at: updatedRequest[0].updated_at ? new Date(updatedRequest[0].updated_at).toISOString() : null,
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la demande d\'accès:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/camera-access-requests/:id', authenticateToken, async (req, res) => {
  try {
    const [result] = await pool.execute('DELETE FROM camera_access_requests WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Demande non trouvée' });
    }
    res.json({ message: 'Demande supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la demande:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les salles
app.get('/api/rooms', authenticateToken, async (req, res) => {
  try {
    await ensureConsultationSchedule();
    const [rooms] = await pool.execute('SELECT * FROM rooms');
    res.json(rooms);
  } catch (error) {
    console.error('Erreur lors de la récupération des salles:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les médecins
app.get('/api/doctors', authenticateToken, async (req, res) => {
  try {
    await ensureConsultationSchedule();
    const [doctors] = await pool.execute('SELECT * FROM doctors');
    res.json(doctors);
  } catch (error) {
    console.error('Erreur lors de la récupération des médecins:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les réservations
app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    await ensureConsultationSchedule();
    const [bookings] = await pool.execute('SELECT * FROM bookings ORDER BY start_time');
    res.json(bookings);
  } catch (error) {
    console.error('Erreur lors de la récupération des réservations:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    // Seule la secrétaire peut créer des réservations
    if (req.user.role !== 'secretaire') {
      return res.status(403).json({ error: 'Seule la secrétaire peut créer des réservations' });
    }

    const { room_id, title, start_time, end_time, doctor_id } = req.body;
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO bookings (id, room_id, title, booked_by, start_time, end_time, doctor_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'réservé')`,
      [id, room_id, title, req.user.id, start_time, end_time, doctor_id || null]
    );

    res.json({ id, message: 'Réservation créée' });
  } catch (error) {
    console.error('Erreur lors de la création de la réservation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    const { room_id, title, start_time, end_time, doctor_id, status } = req.body;
    
    // Récupérer la réservation existante
    const [bookings] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (bookings.length === 0) {
      return res.status(404).json({ error: 'Réservation non trouvée' });
    }
    const booking = bookings[0];

    // Si c'est seulement une mise à jour du statut (démarrer/terminer), vérifier si c'est le médecin assigné
    // Comparer les dates correctement en convertissant en ISO string
    const existingStartTime = booking.start_time instanceof Date 
      ? booking.start_time.toISOString() 
      : new Date(booking.start_time).toISOString();
    const existingEndTime = booking.end_time instanceof Date 
      ? booking.end_time.toISOString() 
      : new Date(booking.end_time).toISOString();

    const isStatusOnlyUpdate = status && 
      (status === 'en_cours' || status === 'terminé') &&
      (!room_id || room_id === booking.room_id) &&
      (!title || title === booking.title) &&
      (!start_time || start_time === existingStartTime) &&
      (!end_time || end_time === existingEndTime) &&
      (!doctor_id || doctor_id === booking.doctor_id);

    if (isStatusOnlyUpdate) {
      // Permettre au médecin assigné de démarrer/terminer sa consultation
      // Vérifier que le médecin est assigné à cette réservation
      if (req.user.role === 'medecin' && booking.doctor_id && booking.doctor_id === req.user.id) {
        await pool.execute(
          `UPDATE bookings SET status = ? WHERE id = ?`,
          [status, req.params.id]
        );
        return res.json({ message: 'Réservation mise à jour' });
      }
    }

    // Pour toutes les autres modifications, seule la secrétaire peut modifier
    if (req.user.role !== 'secretaire') {
      return res.status(403).json({ error: 'Seule la secrétaire peut modifier des réservations' });
    }

    await pool.execute(
      `UPDATE bookings SET room_id = ?, title = ?, start_time = ?, end_time = ?, doctor_id = ?, status = ? WHERE id = ?`,
      [room_id, title, start_time, end_time, doctor_id || null, status, req.params.id]
    );
    res.json({ message: 'Réservation mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la réservation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    // Seule la secrétaire peut supprimer des réservations
    if (req.user.role !== 'secretaire') {
      return res.status(403).json({ error: 'Seule la secrétaire peut annuler des réservations' });
    }

    await pool.execute('DELETE FROM bookings WHERE id = ?', [req.params.id]);
    res.json({ message: 'Réservation supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la réservation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les tâches planifiées
app.get('/api/planned-tasks', authenticateToken, async (req, res) => {
  try {
    const [tasks] = await pool.execute(
      'SELECT * FROM planned_tasks ORDER BY created_at DESC'
    );
    res.json(tasks);
  } catch (error) {
    console.error('Erreur lors de la récupération des tâches planifiées:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/planned-tasks', authenticateToken, async (req, res) => {
  try {
    const { title, description, assigned_to, due_date, assignee_name } = req.body;
    
    console.log('📋 Création de tâche planifiée:', {
      user_id: req.user.id,
      user_role: req.user.role,
      assigned_to: assigned_to,
      title: title
    });
    
    // Vérifier les permissions : superviseur QHSE et superadmin peuvent créer pour n'importe qui
    // Les techniciens (biomedical, technicien_polyvalent) peuvent créer des tâches uniquement pour eux-mêmes
    const rawRole = req.user.role || '';
    const userRole = typeof rawRole === 'string' ? rawRole.toLowerCase().trim() : String(rawRole).toLowerCase().trim();
    const allowedTechnicianRoles = ['biomedical', 'technicien_polyvalent', 'technicien_biomedical', 'technicien'];
    const allowedSupervisorRoles = ['superviseur_qhse', 'superadmin', 'superviseur_technicien'];
    
    console.log('🔍 Vérification des permissions:', {
      raw_role: rawRole,
      normalized_role: userRole,
      user_id: req.user.id,
      assigned_to: assigned_to,
      user_object: JSON.stringify(req.user, null, 2)
    });
    
    // Vérifier si c'est un superviseur
    if (allowedSupervisorRoles.includes(userRole)) {
      console.log('✅ Permission accordée: superviseur/superadmin');
    } 
    // Vérifier si c'est un technicien autorisé
    else if (allowedTechnicianRoles.includes(userRole)) {
      // Les techniciens ne peuvent créer des tâches que pour eux-mêmes
      if (assigned_to !== req.user.id) {
        console.warn('⚠️ Tentative de créer une tâche pour un autre utilisateur:', {
          user_id: req.user.id,
          assigned_to: assigned_to
        });
        return res.status(403).json({ error: 'Vous ne pouvez créer des tâches que pour vous-même' });
      }
      console.log('✅ Permission accordée: technicien crée une tâche pour lui-même');
    } 
    // Si le rôle contient "biomedical" ou "technicien", autoriser quand même (solution temporaire pour debug)
    else if (userRole.includes('biomedical') || userRole.includes('technicien')) {
      console.warn('⚠️ Rôle partiellement reconnu (contient "biomedical" ou "technicien"), autorisation accordée:', userRole);
      if (assigned_to !== req.user.id) {
        return res.status(403).json({ error: 'Vous ne pouvez créer des tâches que pour vous-même' });
      }
      console.log('✅ Permission accordée: technicien (détection partielle) crée une tâche pour lui-même');
    }
    // Sinon, refuser
    else {
      console.error('❌ Rôle non autorisé:', { 
        raw_role: rawRole, 
        normalized_role: userRole,
        allowed_technician_roles: allowedTechnicianRoles,
        allowed_supervisor_roles: allowedSupervisorRoles,
        full_user: req.user
      });
      return res.status(403).json({ 
        error: 'Vous n\'avez pas la permission de créer des tâches planifiées',
        details: `Rôle détecté: "${rawRole}" (normalisé: "${userRole}")`
      });
    }

    const id = uuidv4();

    await pool.execute(
      `INSERT INTO planned_tasks (id, title, description, assigned_to, assignee_name, created_by, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'à faire')`,
      [id, title, description, assigned_to, assignee_name || null, req.user.id, due_date]
    );

    res.json({ id, message: 'Tâche créée' });
  } catch (error) {
    console.error('Erreur lors de la création de la tâche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/planned-tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.execute('UPDATE planned_tasks SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ message: 'Tâche mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la tâche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/planned-tasks/:id', authenticateToken, async (req, res) => {
  try {
    await pool.execute('DELETE FROM planned_tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Tâche supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la tâche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les déchets médicaux
app.get('/api/medical-waste', authenticateToken, async (req, res) => {
  try {
    const [waste] = await pool.execute(
      'SELECT * FROM medical_waste ORDER BY created_at DESC'
    );
    res.json(waste.map(w => ({
      ...w,
      photo_urls: w.photo_urls ? (typeof w.photo_urls === 'string' ? JSON.parse(w.photo_urls) : w.photo_urls) : []
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des déchets médicaux:', error.message || error);
    // Si la table n'existe pas, retourner un message plus explicite
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(500).json({ error: 'Table medical_waste non trouvée. Veuillez exécuter le script SQL de migration.' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/medical-waste', authenticateToken, async (req, res) => {
  try {
    const {
      waste_type,
      category,
      quantity,
      unit,
      collection_date,
      collection_location,
      producer_service,
      waste_code,
      tracking_number,
      notes,
      photo_urls
    } = req.body;
    
    const id = uuidv4();
    const trackingNumber = tracking_number || `WM-${Date.now()}`;

    await pool.execute(
      `INSERT INTO medical_waste (
        id, waste_type, category, quantity, unit, collection_date, collection_location,
        producer_service, waste_code, tracking_number, status, registered_by, notes, photo_urls
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'collecté', ?, ?, ?)`,
      [
        id,
        waste_type,
        category || null,
        quantity,
        unit,
        collection_date,
        collection_location,
        producer_service || null,
        waste_code || null,
        trackingNumber,
        req.user.id,
        notes || null,
        photo_urls ? JSON.stringify(photo_urls) : null
      ]
    );

    res.json({ id, message: 'Déchet médical enregistré' });
  } catch (error) {
    console.error('Erreur lors de la création du déchet médical:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/medical-waste/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      treatment_method,
      treatment_company,
      treatment_date,
      certificate_number,
      handled_by,
      notes
    } = req.body;

    const updates = [];
    const values = [];

    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }
    if (treatment_method !== undefined) {
      updates.push('treatment_method = ?');
      values.push(treatment_method);
    }
    if (treatment_company !== undefined) {
      updates.push('treatment_company = ?');
      values.push(treatment_company);
    }
    if (treatment_date !== undefined) {
      updates.push('treatment_date = ?');
      values.push(treatment_date);
    }
    if (certificate_number !== undefined) {
      updates.push('certificate_number = ?');
      values.push(certificate_number);
    }
    if (handled_by !== undefined) {
      updates.push('handled_by = ?');
      values.push(handled_by);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      values.push(notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }

    values.push(id);

    await pool.execute(
      `UPDATE medical_waste SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({ message: 'Déchet médical mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du déchet médical:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/medical-waste/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier que l'utilisateur a le droit de supprimer (superviseur QHSE ou superadmin)
    if (req.user.role !== 'superviseur_qhse' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer des déchets médicaux.' });
    }

    await pool.execute('DELETE FROM medical_waste WHERE id = ?', [id]);
    res.json({ message: 'Déchet médical supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression du déchet médical:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les formations
app.get('/api/trainings', authenticateToken, async (req, res) => {
  try {
    const [trainings] = await pool.execute(
      'SELECT * FROM trainings ORDER BY created_at DESC'
    );
    res.json(trainings);
  } catch (error) {
    console.error('Erreur lors de la récupération des formations:', error.message || error);
    console.error('Code d\'erreur MySQL:', error.code);
    console.error('Stack trace:', error.stack);
    // Si la table n'existe pas, retourner un message plus explicite
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table trainings non trouvée. Veuillez exécuter le script SQL: database/create_trainings_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

app.post('/api/trainings', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      category,
      description,
      trainer,
      training_type,
      duration_hours,
      location,
      planned_date,
      max_participants,
      certificate_required,
      validity_months,
      prestataire,
      prestataire_note,
      prestataire_evaluation
    } = req.body;
    
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO trainings (
        id, title, category, description, trainer, training_type, duration_hours,
        location, planned_date, status, max_participants, certificate_required,
        validity_months, prestataire, prestataire_note, prestataire_evaluation, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'planifiée', ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        category,
        description || null,
        trainer || null,
        training_type,
        duration_hours || null,
        location || null,
        planned_date || null,
        max_participants || null,
        certificate_required || false,
        validity_months || null,
        prestataire || null,
        prestataire_note || null,
        prestataire_evaluation || null,
        req.user.id
      ]
    );

    res.json({ id, message: 'Formation créée' });
  } catch (error) {
    console.error('Erreur lors de la création de la formation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/trainings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      category,
      description,
      trainer,
      training_type,
      duration_hours,
      location,
      planned_date,
      actual_date,
      status,
      max_participants,
      certificate_required,
      validity_months,
      prestataire,
      prestataire_note,
      prestataire_evaluation
    } = req.body;

    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (trainer !== undefined) { updates.push('trainer = ?'); values.push(trainer); }
    if (training_type !== undefined) { updates.push('training_type = ?'); values.push(training_type); }
    if (duration_hours !== undefined) { updates.push('duration_hours = ?'); values.push(duration_hours); }
    if (location !== undefined) { updates.push('location = ?'); values.push(location); }
    if (planned_date !== undefined) { updates.push('planned_date = ?'); values.push(planned_date); }
    if (actual_date !== undefined) { updates.push('actual_date = ?'); values.push(actual_date); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (max_participants !== undefined) { updates.push('max_participants = ?'); values.push(max_participants); }
    if (certificate_required !== undefined) { updates.push('certificate_required = ?'); values.push(certificate_required); }
    if (validity_months !== undefined) { updates.push('validity_months = ?'); values.push(validity_months); }
    if (prestataire !== undefined) { updates.push('prestataire = ?'); values.push(prestataire || null); }
    if (prestataire_note !== undefined) { updates.push('prestataire_note = ?'); values.push(prestataire_note || null); }
    if (prestataire_evaluation !== undefined) { updates.push('prestataire_evaluation = ?'); values.push(prestataire_evaluation || null); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }

    values.push(id);

    await pool.execute(
      `UPDATE trainings SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({ message: 'Formation mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la formation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/trainings/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier que l'utilisateur a le droit de supprimer (superviseur QHSE ou superadmin)
    if (req.user.role !== 'superviseur_qhse' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer des formations.' });
    }

    await pool.execute('DELETE FROM trainings WHERE id = ?', [id]);
    res.json({ message: 'Formation supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la formation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// ===============================
// Training participations & competencies
// ===============================
app.get('/api/training-participations', authenticateToken, async (_req, res) => {
  try {
    const [participations] = await pool.execute(
      `SELECT tp.*, 
        t.title as training_title,
        t.category as training_category,
        p.first_name as participant_first_name,
        p.last_name as participant_last_name,
        p.role as participant_role,
        COALESCE(CONCAT(p.first_name, ' ', p.last_name), tp.participant_name) as participant_display_name
      FROM training_participations tp
      LEFT JOIN trainings t ON tp.training_id = t.id
      LEFT JOIN profiles p ON tp.participant_id = p.id
      ORDER BY tp.created_at DESC`
    );

    res.json(participations.map((item) => ({
      ...item,
      attendance_date: item.attendance_date,
      certificate_issued_date: item.certificate_issued_date,
      certificate_expiry_date: item.certificate_expiry_date,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des participations:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table training_participations non trouvée. Veuillez exécuter le script SQL: database/create_training_participations_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/training-participations', authenticateToken, async (req, res) => {
  try {
    const {
      training_id,
      participant_id,
      participant_name,
      registration_status,
      attendance_date,
      score,
      passed,
      certificate_number,
      certificate_issued_date,
      certificate_expiry_date,
      comments
    } = req.body;

    // Validation: au moins participant_id OU participant_name doit être fourni
    if (!participant_id && !participant_name) {
      return res.status(400).json({ error: 'participant_id ou participant_name requis' });
    }

    const id = uuidv4();

    await pool.execute(
      `INSERT INTO training_participations (
        id, training_id, participant_id, participant_name, registration_status, attendance_date,
        score, passed, certificate_number, certificate_issued_date, certificate_expiry_date,
        comments, registered_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        training_id,
        participant_id || null,
        participant_name || null,
        registration_status || 'inscrit',
        attendance_date || null,
        score || null,
        passed ?? false,
        certificate_number || null,
        certificate_issued_date || null,
        certificate_expiry_date || null,
        comments || null,
        req.user.id
      ]
    );

    res.json({ id, message: 'Participation ajoutée' });
  } catch (error) {
    console.error('Erreur lors de la création de la participation:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table training_participations non trouvée. Veuillez exécuter le script SQL: database/create_training_participations_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/training-participations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = [];
    const values = [];
    const allowedFields = [
      'participant_id',
      'participant_name',
      'registration_status',
      'attendance_date',
      'score',
      'passed',
      'certificate_number',
      'certificate_issued_date',
      'certificate_expiry_date',
      'comments'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        if (field === 'passed') {
          values.push(!!req.body[field]);
        } else {
          values.push(req.body[field]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }

    values.push(id);
    await pool.execute(
      `UPDATE training_participations SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({ message: 'Participation mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la participation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/training-participations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM training_participations WHERE id = ?', [id]);
    res.json({ message: 'Participation supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la participation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/competencies', authenticateToken, async (_req, res) => {
  try {
    const [competencies] = await pool.execute(
      `SELECT c.*, 
        p.first_name as employee_first_name,
        p.last_name as employee_last_name,
        p.role as employee_role
      FROM competencies c
      LEFT JOIN profiles p ON c.employee_id = p.id
      ORDER BY c.created_at DESC`
    );

    res.json(competencies.map((item) => ({
      ...item,
      issued_date: item.issued_date,
      expiry_date: item.expiry_date,
      verification_date: item.verification_date,
      created_at: item.created_at,
      updated_at: item.updated_at,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des compétences:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table competencies non trouvée. Veuillez exécuter le script SQL: database/create_competencies_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/competencies', authenticateToken, async (req, res) => {
  try {
    const {
      employee_id,
      skill_name,
      skill_category,
      level,
      certification_number,
      issued_date,
      expiry_date,
      issuing_authority,
      verified,
      notes
    } = req.body;

    const id = uuidv4();

    await pool.execute(
      `INSERT INTO competencies (
        id, employee_id, skill_name, skill_category, level,
        certification_number, issued_date, expiry_date, issuing_authority,
        verified, verified_by, verification_date, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        employee_id,
        skill_name,
        skill_category || null,
        level || 'débutant',
        certification_number || null,
        issued_date || null,
        expiry_date || null,
        issuing_authority || null,
        !!verified,
        verified ? req.user.id : null,
        verified ? new Date() : null,
        notes || null
      ]
    );

    res.json({ id, message: 'Compétence enregistrée' });
  } catch (error) {
    console.error('Erreur lors de la création de la compétence:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table competencies non trouvée. Veuillez exécuter le script SQL: database/create_competencies_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/competencies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = [];
    const values = [];
    const allowedFields = [
      'skill_name',
      'skill_category',
      'level',
      'certification_number',
      'issued_date',
      'expiry_date',
      'issuing_authority',
      'verified',
      'notes'
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        if (field === 'verified') {
          updates.push('verified = ?');
          values.push(!!req.body[field]);
          updates.push('verified_by = ?');
          values.push(req.body[field] ? req.user.id : null);
          updates.push('verification_date = ?');
          values.push(req.body[field] ? new Date() : null);
        } else {
          updates.push(`${field} = ?`);
          values.push(req.body[field]);
        }
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }

    values.push(id);
    await pool.execute(
      `UPDATE competencies SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({ message: 'Compétence mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la compétence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/competencies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM competencies WHERE id = ?', [id]);
    res.json({ message: 'Compétence supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la compétence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les audits
app.get('/api/audits', authenticateToken, async (req, res) => {
  try {
    const [audits] = await pool.execute(
      'SELECT * FROM audits ORDER BY created_at DESC'
    );
    res.json(audits.map(audit => ({
      ...audit,
      findings: safeJsonParse(audit.findings, null),
      actual_date: audit.actual_date || null,
      planned_date: audit.planned_date || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des audits:', error.message || error);
    console.error('Code d\'erreur MySQL:', error.code);
    console.error('Stack trace:', error.stack);
    // Si la table n'existe pas, retourner un message plus explicite
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table audits non trouvée. Veuillez exécuter le script SQL: database/create_audits_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

app.post('/api/audits', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      audit_type,
      scope,
      planned_date,
      auditor_id,
      audited_department,
      recurrence_type,
      recurrence_interval,
      reminder_days_before,
      auto_generate_report
    } = req.body;
    
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO audits (
        id, title, audit_type, scope, planned_date, auditor_id,
        audited_department, status, non_conformities_count, conformities_count,
        opportunities_count, recurrence_type, recurrence_interval, reminder_days_before,
        auto_generate_report, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'planifié', 0, 0, 0, ?, ?, ?, ?, ?)`,
      [
        id,
        title,
        audit_type,
        scope,
        planned_date,
        auditor_id || null,
        audited_department || null,
        recurrence_type || 'aucune',
        recurrence_interval || null,
        reminder_days_before || 7,
        auto_generate_report || false,
        req.user.id
      ]
    );

    res.json({ id, message: 'Audit créé' });
  } catch (error) {
    console.error('Erreur lors de la création de l\'audit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/audits/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      audit_type,
      scope,
      planned_date,
      actual_date,
      auditor_id,
      audited_department,
      status,
      findings,
      non_conformities_count,
      conformities_count,
      opportunities_count,
      report_path,
      recurrence_type,
      recurrence_interval,
      next_audit_date,
      reminder_days_before,
      auto_generate_report,
      report_generation_date
    } = req.body;

    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (audit_type !== undefined) { updates.push('audit_type = ?'); values.push(audit_type); }
    if (scope !== undefined) { updates.push('scope = ?'); values.push(scope); }
    if (planned_date !== undefined) { updates.push('planned_date = ?'); values.push(planned_date); }
    if (actual_date !== undefined) { updates.push('actual_date = ?'); values.push(actual_date); }
    if (auditor_id !== undefined) { updates.push('auditor_id = ?'); values.push(auditor_id); }
    if (audited_department !== undefined) { updates.push('audited_department = ?'); values.push(audited_department); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (findings !== undefined) { updates.push('findings = ?'); values.push(typeof findings === 'string' ? findings : JSON.stringify(findings)); }
    if (non_conformities_count !== undefined) { updates.push('non_conformities_count = ?'); values.push(non_conformities_count); }
    if (conformities_count !== undefined) { updates.push('conformities_count = ?'); values.push(conformities_count); }
    if (opportunities_count !== undefined) { updates.push('opportunities_count = ?'); values.push(opportunities_count); }
    if (report_path !== undefined) { updates.push('report_path = ?'); values.push(report_path); }
    if (recurrence_type !== undefined) { updates.push('recurrence_type = ?'); values.push(recurrence_type); }
    if (recurrence_interval !== undefined) { updates.push('recurrence_interval = ?'); values.push(recurrence_interval); }
    if (next_audit_date !== undefined) { updates.push('next_audit_date = ?'); values.push(next_audit_date); }
    if (reminder_days_before !== undefined) { updates.push('reminder_days_before = ?'); values.push(reminder_days_before); }
    if (auto_generate_report !== undefined) { updates.push('auto_generate_report = ?'); values.push(auto_generate_report); }
    if (report_generation_date !== undefined) { updates.push('report_generation_date = ?'); values.push(report_generation_date); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }

    values.push(id);

    await pool.execute(
      `UPDATE audits SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({ message: 'Audit mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'audit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/audits/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute('DELETE FROM audits WHERE id = ?', [id]);
    
    res.json({ message: 'Audit supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'audit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les checklists d'audit
app.get('/api/audits/:auditId/checklists', authenticateToken, async (req, res) => {
  try {
    const { auditId } = req.params;
    const [checklists] = await pool.execute(
      'SELECT * FROM audit_checklists WHERE audit_id = ? ORDER BY id ASC',
      [auditId]
    );
    res.json(checklists.map((item) => ({
      ...item,
      photo_urls: safeJsonParse(item.photo_urls, []),
      checked_at: item.checked_at || null,
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des checklists:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table audit_checklists non trouvée. Veuillez exécuter le script SQL: database/create_audit_checklists_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

app.post('/api/audits/:auditId/checklists', authenticateToken, async (req, res) => {
  try {
    const { auditId } = req.params;
    const { question, requirement, compliance_status, observation, photo_urls } = req.body;
    
    const id = uuidv4();
    
    await pool.execute(
      `INSERT INTO audit_checklists (
        id, audit_id, question, requirement, compliance_status, observation, photo_urls
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        auditId,
        question,
        requirement || null,
        compliance_status || 'non_évalué',
        observation || null,
        JSON.stringify(photo_urls || [])
      ]
    );
    
    const [newChecklist] = await pool.execute('SELECT * FROM audit_checklists WHERE id = ?', [id]);
    res.json(newChecklist[0]);
  } catch (error) {
    console.error('Erreur lors de la création de la checklist:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table audit_checklists non trouvée. Veuillez exécuter le script SQL: database/create_audit_checklists_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/audits/checklists/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { question, requirement, compliance_status, observation, photo_urls, checked_by } = req.body;
    
    const updates = [];
    const values = [];
    
    if (question !== undefined) { updates.push('question = ?'); values.push(question); }
    if (requirement !== undefined) { updates.push('requirement = ?'); values.push(requirement); }
    if (compliance_status !== undefined) { updates.push('compliance_status = ?'); values.push(compliance_status); }
    if (observation !== undefined) { updates.push('observation = ?'); values.push(observation); }
    if (photo_urls !== undefined) { updates.push('photo_urls = ?'); values.push(JSON.stringify(photo_urls)); }
    if (checked_by !== undefined) { 
      updates.push('checked_by = ?'); 
      values.push(checked_by);
      if (checked_by) {
        updates.push('checked_at = CURRENT_TIMESTAMP');
      }
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }
    
    values.push(id);
    await pool.execute(
      `UPDATE audit_checklists SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    res.json({ message: 'Checklist mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la checklist:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/audits/checklists/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM audit_checklists WHERE id = ?', [id]);
    res.json({ message: 'Checklist supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la checklist:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les plans d'action d'audit
app.get('/api/audits/:auditId/action-plans', authenticateToken, async (req, res) => {
  try {
    const { auditId } = req.params;
    const [actionPlans] = await pool.execute(
      `SELECT ap.*, 
        p1.first_name as assigned_to_first_name, p1.last_name as assigned_to_last_name,
        p2.first_name as verified_by_first_name, p2.last_name as verified_by_last_name
      FROM audit_action_plans ap
      LEFT JOIN profiles p1 ON ap.assigned_to = p1.id
      LEFT JOIN profiles p2 ON ap.verified_by = p2.id
      WHERE ap.audit_id = ? ORDER BY ap.created_at DESC`,
      [auditId]
    );
    res.json(actionPlans.map((plan) => ({
      ...plan,
      assigned_to_name: plan.assigned_to_first_name && plan.assigned_to_last_name 
        ? `${plan.assigned_to_first_name} ${plan.assigned_to_last_name}` 
        : null,
      verified_by_name: plan.verified_by_first_name && plan.verified_by_last_name
        ? `${plan.verified_by_first_name} ${plan.verified_by_last_name}`
        : null,
      due_date: plan.due_date || null,
      completion_date: plan.completion_date || null,
      verification_date: plan.verification_date || null,
      created_at: plan.created_at || null,
      updated_at: plan.updated_at || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des plans d\'action:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table audit_action_plans non trouvée. Veuillez exécuter le script SQL: database/create_audit_action_plans_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

app.post('/api/audits/:auditId/action-plans', authenticateToken, async (req, res) => {
  try {
    const { auditId } = req.params;
    const { title, description, action_type, priority, assigned_to, due_date, finding_id, status } = req.body;
    
    const id = uuidv4();
    
    await pool.execute(
      `INSERT INTO audit_action_plans (
        id, audit_id, finding_id, title, description, action_type, priority,
        assigned_to, due_date, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        auditId,
        finding_id || null,
        title,
        description,
        action_type,
        priority || 'moyenne',
        assigned_to || null,
        due_date || null,
        status || 'planifié',
        req.user.id
      ]
    );
    
    // Récupérer le plan d'action créé avec les noms
    const [newPlan] = await pool.execute(
      `SELECT ap.*, 
        p1.first_name as assigned_to_first_name, p1.last_name as assigned_to_last_name
      FROM audit_action_plans ap
      LEFT JOIN profiles p1 ON ap.assigned_to = p1.id
      WHERE ap.id = ?`,
      [id]
    );
    
    const plan = newPlan[0];
    res.json({
      ...plan,
      assigned_to_name: plan.assigned_to_first_name && plan.assigned_to_last_name 
        ? `${plan.assigned_to_first_name} ${plan.assigned_to_last_name}` 
        : null,
      due_date: plan.due_date || null,
      created_at: plan.created_at || null,
      updated_at: plan.updated_at || null,
    });
  } catch (error) {
    console.error('Erreur lors de la création du plan d\'action:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table audit_action_plans non trouvée. Veuillez exécuter le script SQL: database/create_audit_action_plans_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/audits/action-plans/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, action_type, priority, assigned_to, due_date, status, completion_date, verification_date, verified_by, notes } = req.body;
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (action_type !== undefined) { updates.push('action_type = ?'); values.push(action_type); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (assigned_to !== undefined) { updates.push('assigned_to = ?'); values.push(assigned_to); }
    if (due_date !== undefined) { updates.push('due_date = ?'); values.push(due_date); }
    if (status !== undefined) { 
      updates.push('status = ?'); 
      values.push(status);
      if (status === 'terminé' && !completion_date) {
        updates.push('completion_date = CURRENT_DATE');
      }
      if (status === 'verifié' && !verification_date) {
        updates.push('verification_date = CURRENT_DATE');
        updates.push('verified_by = ?');
        values.push(req.user.id);
      }
    }
    if (completion_date !== undefined) { updates.push('completion_date = ?'); values.push(completion_date); }
    if (verification_date !== undefined) { updates.push('verification_date = ?'); values.push(verification_date); }
    if (verified_by !== undefined) { updates.push('verified_by = ?'); values.push(verified_by); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }
    
    values.push(id);
    await pool.execute(
      `UPDATE audit_action_plans SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    res.json({ message: 'Plan d\'action mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du plan d\'action:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/audits/action-plans/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM audit_action_plans WHERE id = ?', [id]);
    res.json({ message: 'Plan d\'action supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression du plan d\'action:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =====================================================
// ROUTES POUR LA GESTION DES TRAVAUX
// =====================================================

// Récupérer tous les travaux
app.get('/api/works', authenticateToken, async (req, res) => {
  try {
    const [works] = await pool.execute(
      `SELECT w.*, 
        p1.first_name as assigned_to_first_name, p1.last_name as assigned_to_last_name
      FROM works w
      LEFT JOIN profiles p1 ON w.assigned_to = p1.id
      ORDER BY w.created_at DESC`
    );
    res.json(works.map(work => ({
      ...work,
      assigned_to_name: work.assigned_to_first_name && work.assigned_to_last_name 
        ? `${work.assigned_to_first_name} ${work.assigned_to_last_name}` 
        : null,
      photo_urls: work.photo_urls ? (typeof work.photo_urls === 'string' ? JSON.parse(work.photo_urls) : work.photo_urls) : [],
      planned_start_date: work.planned_start_date || null,
      planned_end_date: work.planned_end_date || null,
      actual_start_date: work.actual_start_date || null,
      actual_end_date: work.actual_end_date || null,
      created_at: work.created_at || null,
      updated_at: work.updated_at || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des travaux:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table works non trouvée. Veuillez exécuter le script SQL: database/create_works_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Créer un nouveau travail
app.post('/api/works', authenticateToken, async (req, res) => {
  try {
    const {
      title, description, work_type, location, priority, status,
      assigned_to, planned_start_date, planned_end_date,
      estimated_cost, supplier_name, supplier_contact, notes
    } = req.body;
    
    const id = uuidv4();
    
    // Récupérer le nom de l'utilisateur assigné si fourni
    let assigned_to_name = null;
    if (assigned_to) {
      const [users] = await pool.execute(
        'SELECT first_name, last_name FROM profiles WHERE id = ?',
        [assigned_to]
      );
      if (users.length > 0 && users[0].first_name && users[0].last_name) {
        assigned_to_name = `${users[0].first_name} ${users[0].last_name}`;
      }
    }
    
    await pool.execute(
      `INSERT INTO works (
        id, title, description, work_type, location, priority, status,
        assigned_to, assigned_to_name, planned_start_date, planned_end_date,
        estimated_cost, supplier_name, supplier_contact, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, title, description, work_type || 'maintenance',
        location || null, priority || 'moyenne', status || 'planifié',
        assigned_to || null, assigned_to_name,
        planned_start_date || null, planned_end_date || null,
        estimated_cost || null, supplier_name || null, supplier_contact || null,
        notes || null, req.user.id
      ]
    );
    
    // Récupérer le travail créé
    const [newWork] = await pool.execute(
      `SELECT w.*, 
        p1.first_name as assigned_to_first_name, p1.last_name as assigned_to_last_name
      FROM works w
      LEFT JOIN profiles p1 ON w.assigned_to = p1.id
      WHERE w.id = ?`,
      [id]
    );
    
    const work = newWork[0];
    res.json({
      ...work,
      assigned_to_name: work.assigned_to_first_name && work.assigned_to_last_name 
        ? `${work.assigned_to_first_name} ${work.assigned_to_last_name}` 
        : null,
      photo_urls: work.photo_urls ? (typeof work.photo_urls === 'string' ? JSON.parse(work.photo_urls) : work.photo_urls) : [],
    });
  } catch (error) {
    console.error('Erreur lors de la création du travail:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table works non trouvée. Veuillez exécuter le script SQL: database/create_works_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Mettre à jour un travail
app.put('/api/works/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title, description, work_type, location, priority, status,
      assigned_to, planned_start_date, planned_end_date,
      actual_start_date, actual_end_date,
      estimated_cost, actual_cost, supplier_name, supplier_contact, notes
    } = req.body;
    
    const updates = [];
    const values = [];
    
    if (title !== undefined) { updates.push('title = ?'); values.push(title); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (work_type !== undefined) { updates.push('work_type = ?'); values.push(work_type); }
    if (location !== undefined) { updates.push('location = ?'); values.push(location); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (status !== undefined) { 
      updates.push('status = ?'); 
      values.push(status);
      // Si le statut passe à "en_cours" et actual_start_date n'est pas défini, le définir
      if (status === 'en_cours' && !actual_start_date) {
        updates.push('actual_start_date = CURRENT_DATE');
      }
      // Si le statut passe à "terminé" et actual_end_date n'est pas défini, le définir
      if (status === 'terminé' && !actual_end_date) {
        updates.push('actual_end_date = CURRENT_DATE');
      }
    }
    if (assigned_to !== undefined) {
      updates.push('assigned_to = ?');
      values.push(assigned_to || null);
      // Mettre à jour le nom de l'utilisateur assigné
      if (assigned_to) {
        const [users] = await pool.execute(
          'SELECT first_name, last_name FROM profiles WHERE id = ?',
          [assigned_to]
        );
        if (users.length > 0 && users[0].first_name && users[0].last_name) {
          updates.push('assigned_to_name = ?');
          values.push(`${users[0].first_name} ${users[0].last_name}`);
        } else {
          updates.push('assigned_to_name = NULL');
        }
      } else {
        updates.push('assigned_to_name = NULL');
      }
    }
    if (planned_start_date !== undefined) { updates.push('planned_start_date = ?'); values.push(planned_start_date || null); }
    if (planned_end_date !== undefined) { updates.push('planned_end_date = ?'); values.push(planned_end_date || null); }
    if (actual_start_date !== undefined) { updates.push('actual_start_date = ?'); values.push(actual_start_date || null); }
    if (actual_end_date !== undefined) { updates.push('actual_end_date = ?'); values.push(actual_end_date || null); }
    if (estimated_cost !== undefined) { updates.push('estimated_cost = ?'); values.push(estimated_cost || null); }
    if (actual_cost !== undefined) { updates.push('actual_cost = ?'); values.push(actual_cost || null); }
    if (supplier_name !== undefined) { updates.push('supplier_name = ?'); values.push(supplier_name || null); }
    if (supplier_contact !== undefined) { updates.push('supplier_contact = ?'); values.push(supplier_contact || null); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes || null); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }
    
    values.push(id);
    
    await pool.execute(
      `UPDATE works SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );
    
    res.json({ message: 'Travail mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du travail:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer un travail
app.delete('/api/works/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM works WHERE id = ?', [id]);
    res.json({ message: 'Travail supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression du travail:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =====================================================
// ROUTES POUR LA GESTION RÉSEAU
// =====================================================

// Matériel Réseau
app.get('/api/network/equipment', authenticateToken, async (req, res) => {
  try {
    // Vérifier que la table existe, sinon la créer
    try {
      await ensureNetworkTables();
    } catch (migrationError) {
      console.error('Erreur lors de la migration des tables réseau:', migrationError);
      // Continuer quand même, peut-être que les tables existent déjà
    }
    const [equipment] = await pool.execute('SELECT * FROM network_equipment ORDER BY created_at DESC');
    res.json(equipment.map(eq => ({
      ...eq,
      installation_date: eq.installation_date || null,
      warranty_expiry: eq.warranty_expiry || null,
      created_at: eq.created_at || null,
      updated_at: eq.updated_at || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération du matériel:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table network_equipment non trouvée' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/network/equipment', authenticateToken, async (req, res) => {
  try {
    const { name, type, brand, model, serial_number, ip_address, mac_address, location, status, installation_date, warranty_expiry, notes } = req.body;
    const id = uuidv4();
    await pool.execute(
      `INSERT INTO network_equipment (id, name, type, brand, model, serial_number, ip_address, mac_address, location, status, installation_date, warranty_expiry, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, name, type, brand || null, model || null, serial_number || null, ip_address || null, mac_address || null, location || null, status, installation_date || null, warranty_expiry || null, notes || null, req.user.id]
    );
    const [newEquipment] = await pool.execute('SELECT * FROM network_equipment WHERE id = ?', [id]);
    res.json(newEquipment[0]);
  } catch (error) {
    console.error('Erreur lors de la création:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/network/equipment/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = [];
    const values = [];
    const fields = ['name', 'type', 'brand', 'model', 'serial_number', 'ip_address', 'mac_address', 'location', 'status', 'installation_date', 'warranty_expiry', 'notes'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field] || null);
      }
    });
    if (updates.length === 0) return res.status(400).json({ error: 'Aucune mise à jour' });
    values.push(id);
    await pool.execute(`UPDATE network_equipment SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    const [updated] = await pool.execute('SELECT * FROM network_equipment WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/network/equipment/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM network_equipment WHERE id = ?', [id]);
    res.json({ message: 'Équipement supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Abonnements Réseau
app.get('/api/network/subscriptions', authenticateToken, async (req, res) => {
  try {
    // Vérifier que la table existe, sinon la créer
    try {
      await ensureNetworkTables();
    } catch (migrationError) {
      console.error('Erreur lors de la migration des tables réseau:', migrationError);
      // Continuer quand même, peut-être que les tables existent déjà
    }
    const [subscriptions] = await pool.execute('SELECT * FROM network_subscriptions ORDER BY renewal_date DESC');
    res.json(subscriptions.map(sub => ({
      ...sub,
      start_date: sub.start_date || null,
      renewal_date: sub.renewal_date || null,
      created_at: sub.created_at || null,
      updated_at: sub.updated_at || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des abonnements:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table network_subscriptions non trouvée' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/network/subscriptions', authenticateToken, async (req, res) => {
  try {
    const { service_name, provider, subscription_type, monthly_cost, start_date, renewal_date, contract_number, contact_person, contact_phone, contact_email, status, notes } = req.body;
    const id = uuidv4();
    await pool.execute(
      `INSERT INTO network_subscriptions (id, service_name, provider, subscription_type, monthly_cost, start_date, renewal_date, contract_number, contact_person, contact_phone, contact_email, status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, service_name, provider, subscription_type, monthly_cost || 0, start_date || null, renewal_date || null, contract_number || null, contact_person || null, contact_phone || null, contact_email || null, status, notes || null, req.user.id]
    );
    const [newSubscription] = await pool.execute('SELECT * FROM network_subscriptions WHERE id = ?', [id]);
    res.json(newSubscription[0]);
  } catch (error) {
    console.error('Erreur lors de la création:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/network/subscriptions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = [];
    const values = [];
    const fields = ['service_name', 'provider', 'subscription_type', 'monthly_cost', 'start_date', 'renewal_date', 'contract_number', 'contact_person', 'contact_phone', 'contact_email', 'status', 'notes'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field] || null);
      }
    });
    if (updates.length === 0) return res.status(400).json({ error: 'Aucune mise à jour' });
    values.push(id);
    await pool.execute(`UPDATE network_subscriptions SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    const [updated] = await pool.execute('SELECT * FROM network_subscriptions WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/network/subscriptions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM network_subscriptions WHERE id = ?', [id]);
    res.json({ message: 'Abonnement supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Inventaire Réseau
app.get('/api/network/inventory', authenticateToken, async (req, res) => {
  try {
    // Vérifier que la table existe, sinon la créer
    try {
      await ensureNetworkTables();
    } catch (migrationError) {
      console.error('Erreur lors de la migration des tables réseau:', migrationError);
      // Continuer quand même, peut-être que les tables existent déjà
    }
    const [inventory] = await pool.execute('SELECT * FROM network_inventory ORDER BY created_at DESC');
    res.json(inventory.map(item => ({
      ...item,
      purchase_date: item.purchase_date || null,
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'inventaire:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table network_inventory non trouvée' });
    }
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/network/inventory', authenticateToken, async (req, res) => {
  try {
    const { item_name, category, brand, model, quantity, unit, location, supplier, purchase_date, purchase_cost, notes } = req.body;
    const id = uuidv4();
    await pool.execute(
      `INSERT INTO network_inventory (id, item_name, category, brand, model, quantity, unit, location, supplier, purchase_date, purchase_cost, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, item_name, category, brand || null, model || null, quantity || 1, unit, location || null, supplier || null, purchase_date || null, purchase_cost || null, notes || null, req.user.id]
    );
    const [newItem] = await pool.execute('SELECT * FROM network_inventory WHERE id = ?', [id]);
    res.json(newItem[0]);
  } catch (error) {
    console.error('Erreur lors de la création:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/network/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = [];
    const values = [];
    const fields = ['item_name', 'category', 'brand', 'model', 'quantity', 'unit', 'location', 'supplier', 'purchase_date', 'purchase_cost', 'notes'];
    fields.forEach(field => {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field] || null);
      }
    });
    if (updates.length === 0) return res.status(400).json({ error: 'Aucune mise à jour' });
    values.push(id);
    await pool.execute(`UPDATE network_inventory SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
    const [updated] = await pool.execute('SELECT * FROM network_inventory WHERE id = ?', [id]);
    res.json(updated[0]);
  } catch (error) {
    console.error('Erreur lors de la mise à jour:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/network/inventory/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM network_inventory WHERE id = ?', [id]);
    res.json({ message: 'Article supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// =====================================================
// ROUTES POUR LES RONDES QUOTIDIENNES
// =====================================================

// Récupérer les rondes quotidiennes
app.get('/api/daily-rounds', authenticateToken, async (req, res) => {
  try {
    const { technician_id, round_type } = req.query;
    let query = 'SELECT dr.*, p.first_name, p.last_name FROM daily_rounds dr LEFT JOIN profiles p ON dr.technician_id = p.id WHERE 1=1';
    const params = [];

    if (technician_id && technician_id.trim() !== '') {
      query += ' AND dr.technician_id = ?';
      params.push(technician_id);
    }

    if (round_type && round_type.trim() !== '') {
      query += ' AND dr.round_type = ?';
      params.push(round_type);
    }

    query += ' ORDER BY dr.round_date DESC, dr.created_at DESC';

    const [rounds] = await pool.execute(query, params);
    res.json(rounds.map(round => ({
      ...round,
      technician_name: round.technician_name || (round.first_name && round.last_name ? `${round.first_name} ${round.last_name}` : null),
      round_date: round.round_date || null,
      start_time: round.start_time || null,
      end_time: round.end_time || null,
      photo_urls: safeJsonParse(round.photo_urls, []),
      created_at: round.created_at || null,
      updated_at: round.updated_at || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des rondes:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table daily_rounds non trouvée. Veuillez exécuter le script SQL: database/create_daily_rounds_tables.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Créer une ronde quotidienne
app.post('/api/daily-rounds', authenticateToken, async (req, res) => {
  try {
    const { technician_id, technician_name, round_type, round_date, status, start_time, notes, photo_urls } = req.body;
    
    // Validation des champs requis
    if (!technician_id || !round_type || !round_date) {
      return res.status(400).json({ error: 'Les champs technician_id, round_type et round_date sont requis' });
    }
    
    const id = uuidv4();
    
    // Formater start_time si fourni
    let formattedStartTime = null;
    if (start_time) {
      // Si c'est déjà au format MySQL, l'utiliser tel quel
      if (typeof start_time === 'string' && start_time.match(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)) {
        formattedStartTime = start_time;
      } else {
        // Sinon, essayer de parser et formater
        try {
          const date = new Date(start_time);
          formattedStartTime = formatDateTime(date);
        } catch (e) {
          console.error('Erreur de formatage de start_time:', e);
          formattedStartTime = null;
        }
      }
    }
    
    await pool.execute(
      `INSERT INTO daily_rounds (
        id, technician_id, technician_name, round_type, round_date, status, start_time, notes, photo_urls
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        technician_id,
        technician_name || null,
        round_type,
        round_date,
        status || 'en_cours',
        formattedStartTime,
        notes || null,
        JSON.stringify(photo_urls || [])
      ]
    );

    const [newRound] = await pool.execute(
      'SELECT dr.*, p.first_name, p.last_name FROM daily_rounds dr LEFT JOIN profiles p ON dr.technician_id = p.id WHERE dr.id = ?',
      [id]
    );

    res.json({
      ...newRound[0],
      technician_name: newRound[0].technician_name || (newRound[0].first_name && newRound[0].last_name ? `${newRound[0].first_name} ${newRound[0].last_name}` : null),
      photo_urls: safeJsonParse(newRound[0].photo_urls, []),
    });
  } catch (error) {
    console.error('Erreur lors de la création de la ronde:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Une ronde existe déjà pour cette date et ce technicien' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Mettre à jour une ronde quotidienne
app.put('/api/daily-rounds/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, end_time, notes, photo_urls, technician_name } = req.body;
    
    const updates = [];
    const values = [];
    
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (end_time !== undefined) { updates.push('end_time = ?'); values.push(end_time); }
    if (notes !== undefined) { updates.push('notes = ?'); values.push(notes); }
    if (technician_name !== undefined) { updates.push('technician_name = ?'); values.push(technician_name); }
    if (photo_urls !== undefined) { updates.push('photo_urls = ?'); values.push(JSON.stringify(photo_urls)); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }
    
    values.push(id);
    await pool.execute(
      `UPDATE daily_rounds SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    const [updatedRound] = await pool.execute(
      'SELECT dr.*, p.first_name, p.last_name FROM daily_rounds dr LEFT JOIN profiles p ON dr.technician_id = p.id WHERE dr.id = ?',
      [id]
    );

    res.json({
      ...updatedRound[0],
      technician_name: updatedRound[0].technician_name || (updatedRound[0].first_name && updatedRound[0].last_name ? `${updatedRound[0].first_name} ${updatedRound[0].last_name}` : null),
      photo_urls: safeJsonParse(updatedRound[0].photo_urls, []),
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la ronde:', error);
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Supprimer une ronde quotidienne
app.delete('/api/daily-rounds/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Vérifier que la ronde existe
    const [existingRound] = await pool.execute(
      'SELECT * FROM daily_rounds WHERE id = ?',
      [id]
    );
    
    if (existingRound.length === 0) {
      return res.status(404).json({ error: 'Ronde non trouvée' });
    }
    
    // Supprimer la ronde (les réponses seront supprimées automatiquement grâce à ON DELETE CASCADE)
    await pool.execute('DELETE FROM daily_rounds WHERE id = ?', [id]);
    
    res.json({ message: 'Ronde supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la ronde:', error);
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Récupérer les templates de checklist
app.get('/api/round-checklist-templates', authenticateToken, async (req, res) => {
  try {
    const { round_type } = req.query;
    let query = 'SELECT * FROM round_checklist_templates WHERE 1=1';
    const params = [];

    if (round_type) {
      query += ' AND round_type = ?';
      params.push(round_type);
    }

    query += ' ORDER BY item_order ASC';

    const [templates] = await pool.execute(query, params);
    res.json(templates.map(template => ({
      ...template,
      options: safeJsonParse(template.options, null),
      created_at: template.created_at || null,
      updated_at: template.updated_at || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des templates:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table round_checklist_templates non trouvée. Veuillez exécuter le script SQL: database/create_daily_rounds_tables.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Récupérer les réponses aux checklists
app.get('/api/round-checklist-responses', authenticateToken, async (req, res) => {
  try {
    const { round_id } = req.query;
    
    if (!round_id) {
      return res.status(400).json({ error: 'round_id est requis' });
    }

    const [responses] = await pool.execute(
      `SELECT rcr.*, 
       rct.id as template_id_full,
       rct.title as template_title, 
       rct.description as template_description,
       rct.item_type, 
       rct.is_required,
       rct.item_order,
       rct.round_type as template_round_type,
       rct.options as template_options
       FROM round_checklist_responses rcr
       LEFT JOIN round_checklist_templates rct ON rcr.template_id = rct.id
       WHERE rcr.round_id = ?
       ORDER BY rct.item_order ASC`,
      [round_id]
    );

    res.json(responses.map(response => ({
      ...response,
      photo_urls: safeJsonParse(response.photo_urls, []),
      template: response.template_title ? {
        id: response.template_id_full,
        title: response.template_title,
        description: response.template_description,
        item_type: response.item_type,
        is_required: response.is_required === 1 || response.is_required === true,
        item_order: response.item_order,
        round_type: response.template_round_type,
        options: safeJsonParse(response.template_options, null),
      } : null,
      created_at: response.created_at || null,
      updated_at: response.updated_at || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des réponses:', error);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table round_checklist_responses non trouvée. Veuillez exécuter le script SQL: database/create_daily_rounds_tables.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Créer une réponse de checklist
app.post('/api/round-checklist-responses', authenticateToken, async (req, res) => {
  try {
    const { round_id, template_id, response_value, is_checked, observation, photo_urls } = req.body;
    
    const id = uuidv4();
    
    await pool.execute(
      `INSERT INTO round_checklist_responses (
        id, round_id, template_id, response_value, is_checked, equipment_status, equipment_name, service_name, observation, photo_urls
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        round_id,
        template_id,
        response_value || null,
        is_checked || false,
        req.body.equipment_status || null,
        req.body.equipment_name || null,
        req.body.service_name || null,
        observation || null,
        JSON.stringify(photo_urls || [])
      ]
    );

    const [newResponse] = await pool.execute(
      `SELECT rcr.*, rct.title as template_title, rct.item_type, rct.is_required
       FROM round_checklist_responses rcr
       LEFT JOIN round_checklist_templates rct ON rcr.template_id = rct.id
       WHERE rcr.id = ?`,
      [id]
    );

    res.json({
      ...newResponse[0],
      photo_urls: safeJsonParse(newResponse[0].photo_urls, []),
    });
  } catch (error) {
    console.error('Erreur lors de la création de la réponse:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Une réponse existe déjà pour ce template et cette ronde' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Mettre à jour une réponse de checklist
app.put('/api/round-checklist-responses/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { response_value, is_checked, equipment_status, equipment_name, service_name, observation, photo_urls } = req.body;
    
    const updates = [];
    const values = [];
    
    if (response_value !== undefined) { updates.push('response_value = ?'); values.push(response_value); }
    if (is_checked !== undefined) { updates.push('is_checked = ?'); values.push(is_checked); }
    if (equipment_status !== undefined) { updates.push('equipment_status = ?'); values.push(equipment_status); }
    if (equipment_name !== undefined) { updates.push('equipment_name = ?'); values.push(equipment_name); }
    if (service_name !== undefined) { updates.push('service_name = ?'); values.push(service_name); }
    if (observation !== undefined) { updates.push('observation = ?'); values.push(observation); }
    if (photo_urls !== undefined) { updates.push('photo_urls = ?'); values.push(JSON.stringify(photo_urls)); }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }
    
    values.push(id);
    
    await pool.execute(
      `UPDATE round_checklist_responses SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    const [updatedResponse] = await pool.execute(
      `SELECT rcr.*, rct.title as template_title, rct.item_type, rct.is_required
       FROM round_checklist_responses rcr
       LEFT JOIN round_checklist_templates rct ON rcr.template_id = rct.id
       WHERE rcr.id = ?`,
      [id]
    );

    res.json({
      ...updatedResponse[0],
      photo_urls: safeJsonParse(updatedResponse[0].photo_urls, []),
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la réponse:', error);
    console.error('Détails:', { 
      code: error.code, 
      message: error.message, 
      sqlMessage: error.sqlMessage,
      sql: error.sql 
    });
    
    // Vérifier si c'est une erreur de colonne manquante
    if (error.code === 'ER_BAD_FIELD_ERROR' || error.message?.includes('Unknown column') || error.sqlMessage?.includes('Unknown column')) {
      console.error('⚠️ Colonne manquante dans round_checklist_responses.');
      console.error('💡 Solution: Redémarrez le serveur backend pour déclencher la migration automatique, ou exécutez manuellement: database/migration_add_equipment_status.sql');
      return res.status(500).json({ 
        error: 'Colonne manquante dans la base de données. Veuillez redémarrer le serveur backend ou exécuter le script SQL: database/migration_add_equipment_status.sql',
        details: error.sqlMessage || error.message
      });
    }
    
    // Erreur 400 si c'est une erreur de validation
    if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate entry')) {
      return res.status(400).json({ error: 'Données en conflit: ' + (error.sqlMessage || error.message) });
    }
    
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Endpoint pour uploader le compte rendu d'un audit
app.post('/api/audits/upload-report', authenticateToken, uploadAuditReport.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier fourni' });
    }

    const { auditId } = req.body;
    if (!auditId) {
      // Supprimer le fichier uploadé si l'auditId est manquant
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'ID de l\'audit manquant' });
    }

    const reportPath = `/uploads/audit_reports/${req.file.filename}`;

    // Mettre à jour l'audit avec le chemin du rapport
    await pool.execute(
      'UPDATE audits SET report_path = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [reportPath, auditId]
    );

    res.json({ 
      message: 'Compte rendu uploadé avec succès',
      report_path: reportPath,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Erreur lors de l\'upload du compte rendu:', error);
    // Supprimer le fichier en cas d'erreur
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Erreur lors de la suppression du fichier:', unlinkError);
      }
    }
    res.status(500).json({ error: 'Erreur serveur lors de l\'upload' });
  }
});

// Routes pour les risques
app.get('/api/risks', authenticateToken, async (req, res) => {
  try {
    const [risks] = await pool.execute(
      'SELECT * FROM risks ORDER BY created_at DESC'
    );
    res.json(risks);
  } catch (error) {
    console.error('Erreur lors de la récupération des risques:', error.message || error);
    console.error('Code d\'erreur MySQL:', error.code);
    console.error('Stack trace:', error.stack);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table risks non trouvée. Veuillez exécuter le script SQL: database/create_risks_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

app.post('/api/risks', authenticateToken, async (req, res) => {
  try {
    const {
      title, description, risk_category, poste, risk_source, probability, severity,
      risk_level, current_controls, treatment_plan, action_plan, responsible_person,
      due_date, status
    } = req.body;
    
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO risks (
        id, title, description, risk_category, poste, risk_source, probability, severity,
        risk_level, current_controls, treatment_plan, action_plan, responsible_person,
        due_date, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, title, description, risk_category, poste || null, risk_source || null, probability, severity,
        risk_level, current_controls || null, treatment_plan || null, action_plan || null,
        responsible_person || null, due_date || null, status || 'identifié', req.user.id
      ]
    );

    res.json({ id, message: 'Risque créé' });
  } catch (error) {
    console.error('Erreur lors de la création du risque:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/risks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updates = [];
    const values = [];

    const allowedFields = [
      'title', 'description', 'risk_category', 'poste', 'risk_source', 'probability', 'severity',
      'risk_level', 'current_controls', 'residual_probability', 'residual_severity',
      'residual_risk_level', 'treatment_plan', 'action_plan', 'responsible_person',
      'due_date', 'status', 'review_date', 'last_review_date', 'reviewed_by'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }

    values.push(id);

    await pool.execute(
      `UPDATE risks SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({ message: 'Risque mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du risque:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/risks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute('DELETE FROM risks WHERE id = ?', [id]);
    
    res.json({ message: 'Risque supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression du risque:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les actions de risque
app.get('/api/risks/:riskId/actions', authenticateToken, async (req, res) => {
  try {
    const { riskId } = req.params;
    const [actions] = await pool.execute(
      `SELECT ra.*, 
        p.first_name as assigned_to_first_name,
        p.last_name as assigned_to_last_name,
        CONCAT(p.first_name, ' ', p.last_name) as assigned_to_name
      FROM risk_actions ra
      LEFT JOIN profiles p ON ra.assigned_to = p.id
      WHERE ra.risk_id = ?
      ORDER BY ra.created_at DESC`,
      [riskId]
    );
    res.json(actions);
  } catch (error) {
    console.error('Erreur lors de la récupération des actions:', error);
    console.error('Code d\'erreur MySQL:', error.code);
    console.error('Message d\'erreur:', error.message);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table risk_actions non trouvée. Veuillez exécuter le script SQL: database/create_risk_actions_table.sql' });
    }
    res.status(500).json({ error: `Erreur serveur: ${error.message || 'Erreur inconnue'}` });
  }
});

app.post('/api/risks/:riskId/actions', authenticateToken, async (req, res) => {
  try {
    const { riskId } = req.params;
    const {
      action_title,
      action_description,
      action_type,
      action_status,
      responsible_person,
      assigned_to,
      due_date,
      effectiveness_level,
      notes
    } = req.body;
    
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO risk_actions (
        id, risk_id, action_title, action_description, action_type, action_status,
        responsible_person, assigned_to, due_date, effectiveness_level, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, riskId, action_title, action_description || null, action_type || 'mitigation',
        action_status || 'planifiée', responsible_person || null, assigned_to || null,
        due_date || null, effectiveness_level || null, notes || null, req.user.id
      ]
    );

    res.json({ id, message: 'Action ajoutée' });
  } catch (error) {
    console.error('Erreur lors de la création de l\'action:', error);
    console.error('Code d\'erreur MySQL:', error.code);
    console.error('Message d\'erreur:', error.message);
    console.error('Stack trace:', error.stack);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table risk_actions non trouvée. Veuillez exécuter le script SQL: database/create_risk_actions_table.sql' });
    }
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ error: `Champ inconnu dans la table risk_actions: ${error.message}. Veuillez vérifier le schéma de la base de données.` });
    }
    if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 1452) {
      return res.status(500).json({ error: 'Référence invalide: le risk_id ou created_by n\'existe pas dans la base de données.' });
    }
    res.status(500).json({ error: `Erreur serveur: ${error.message || 'Erreur inconnue'}` });
  }
});

app.put('/api/risks/actions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updates = [];
    const values = [];

    const allowedFields = [
      'action_title', 'action_description', 'action_type', 'action_status',
      'responsible_person', 'assigned_to', 'due_date', 'completion_date',
      'effectiveness_level', 'notes'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }

    values.push(id);

    await pool.execute(
      `UPDATE risk_actions SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({ message: 'Action mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'action:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/risks/actions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.execute('DELETE FROM risk_actions WHERE id = ?', [id]);
    res.json({ message: 'Action supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'action:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les cycles de stérilisation
app.get('/api/sterilization-cycles', authenticateToken, async (req, res) => {
  try {
    const [cycles] = await pool.execute(
      'SELECT * FROM sterilization_cycles ORDER BY created_at DESC'
    );
    res.json(cycles);
  } catch (error) {
    console.error('Erreur lors de la récupération des cycles de stérilisation:', error.message || error);
    console.error('Code d\'erreur MySQL:', error.code);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table sterilization_cycles non trouvée. Veuillez exécuter le script SQL: database/create_sterilization_cycles_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

app.post('/api/sterilization-cycles', authenticateToken, async (req, res) => {
  try {
    const {
      cycle_number, sterilizer_id, sterilizer_type, cycle_type, program_name,
      start_time, end_time, duration_minutes, temperature, pressure, operator_id,
      status, result, biological_indicator_result, chemical_indicator_result,
      non_conformity_reason, batch_number, items_count, notes
    } = req.body;
    
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO sterilization_cycles (
        id, cycle_number, sterilizer_id, sterilizer_type, cycle_type, program_name,
        start_time, end_time, duration_minutes, temperature, pressure, operator_id,
        status, result, biological_indicator_result, chemical_indicator_result,
        non_conformity_reason, batch_number, items_count, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, cycle_number, sterilizer_id, sterilizer_type, cycle_type, program_name || null,
        start_time, end_time || null, duration_minutes || null, temperature || null,
        pressure || null, operator_id || req.user.id, status || 'en_cours',
        result || 'en_attente', biological_indicator_result || 'non_testé',
        chemical_indicator_result || 'non_testé', non_conformity_reason || null,
        batch_number || null, items_count || 0, notes || null
      ]
    );

    res.json({ id, message: 'Cycle de stérilisation créé' });
  } catch (error) {
    console.error('Erreur lors de la création du cycle de stérilisation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/sterilization-cycles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updates = [];
    const values = [];

    const allowedFields = [
      'cycle_number', 'sterilizer_id', 'sterilizer_type', 'cycle_type', 'program_name',
      'start_time', 'end_time', 'duration_minutes', 'temperature', 'pressure', 'operator_id',
      'status', 'result', 'biological_indicator_result', 'chemical_indicator_result',
      'non_conformity_reason', 'batch_number', 'items_count', 'notes'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }

    values.push(id);

    await pool.execute(
      `UPDATE sterilization_cycles SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({ message: 'Cycle de stérilisation mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du cycle de stérilisation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/sterilization-cycles/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute('DELETE FROM sterilization_cycles WHERE id = ?', [id]);
    
    res.json({ message: 'Cycle de stérilisation supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression du cycle de stérilisation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour le registre de stérilisation
app.get('/api/sterilization-register', authenticateToken, async (req, res) => {
  try {
    const [registers] = await pool.execute(
      'SELECT * FROM sterilization_register ORDER BY created_at DESC'
    );
    res.json(registers);
  } catch (error) {
    console.error('Erreur lors de la récupération du registre de stérilisation:', error.message || error);
    console.error('Code d\'erreur MySQL:', error.code);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table sterilization_register non trouvée. Veuillez exécuter le script SQL: database/create_sterilization_register_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

app.post('/api/sterilization-register', authenticateToken, async (req, res) => {
  try {
    const id = uuidv4();
    const registerData = req.body;

    // Construire la requête SQL dynamiquement pour tous les champs du registre
    const fields = [
      'code_document', 'version', 'date_cycle', 'service_concerne', 'operateur_nom',
      'type_materiel', 'numero_lot', 'methode_sterilisation', 'numero_cycle', 'programme',
      'temperature', 'duree_cycle', 'resultat_test_controle', 'status_cycle',
      'observation_action_corrective', 'date_controle', 'type_charge', 'nombre_unites',
      'numero_cycle_controle', 'resultat_controle', 'statut_charge', 'date_liberation',
      'numero_lot_charge', 'service_destinataire', 'delai_validite', 'observations_liberation',
      'date_maintenance', 'type_operation_maintenance', 'nom_technicien',
      'resultat_controle_maintenance', 'observations_maintenance', 'observations_generales',
      'non_conformites', 'responsable_sterilisation', 'date_validation', 'created_by'
    ];

    const fieldPlaceholders = fields.map(() => '?').join(', ');
    const fieldNames = fields.join(', ');
    const values = [
      id,
      registerData.code_document || 'EN-STE-001-CDL',
      registerData.version || 'AA',
      registerData.date_cycle,
      registerData.service_concerne,
      registerData.operateur_nom,
      registerData.type_materiel,
      registerData.numero_lot || null,
      registerData.methode_sterilisation,
      registerData.numero_cycle || null,
      registerData.programme || null,
      registerData.temperature || null,
      registerData.duree_cycle || null,
      registerData.resultat_test_controle || 'en_attente',
      registerData.status_cycle || 'en_cours',
      registerData.observation_action_corrective || null,
      registerData.date_controle || null,
      registerData.type_charge || null,
      registerData.nombre_unites || null,
      registerData.numero_cycle_controle || null,
      registerData.resultat_controle || null,
      registerData.statut_charge || null,
      registerData.date_liberation || null,
      registerData.numero_lot_charge || null,
      registerData.service_destinataire || null,
      registerData.delai_validite || null,
      registerData.observations_liberation || null,
      registerData.date_maintenance || null,
      registerData.type_operation_maintenance || null,
      registerData.nom_technicien || null,
      registerData.resultat_controle_maintenance || null,
      registerData.observations_maintenance || null,
      registerData.observations_generales || null,
      registerData.non_conformites || null,
      registerData.responsable_sterilisation || null,
      registerData.date_validation || null,
      req.user.id
    ];

    await pool.execute(
      `INSERT INTO sterilization_register (id, ${fieldNames}) VALUES (?, ${fieldPlaceholders})`,
      values
    );

    res.json({ id, message: 'Registre de stérilisation créé' });
  } catch (error) {
    console.error('Erreur lors de la création du registre de stérilisation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/sterilization-register/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updates = [];
    const values = [];

    const allowedFields = [
      'code_document', 'version', 'date_cycle', 'service_concerne', 'operateur_nom',
      'type_materiel', 'numero_lot', 'methode_sterilisation', 'numero_cycle', 'programme',
      'temperature', 'duree_cycle', 'resultat_test_controle', 'status_cycle',
      'observation_action_corrective', 'date_controle', 'type_charge', 'nombre_unites',
      'numero_cycle_controle', 'resultat_controle', 'statut_charge', 'date_liberation',
      'numero_lot_charge', 'service_destinataire', 'delai_validite', 'observations_liberation',
      'date_maintenance', 'type_operation_maintenance', 'nom_technicien',
      'resultat_controle_maintenance', 'observations_maintenance', 'observations_generales',
      'non_conformites', 'responsable_sterilisation', 'date_validation'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }

    values.push(id);

    await pool.execute(
      `UPDATE sterilization_register SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({ message: 'Registre de stérilisation mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du registre de stérilisation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/sterilization-register/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute('DELETE FROM sterilization_register WHERE id = ?', [id]);
    
    res.json({ message: 'Registre de stérilisation supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression du registre de stérilisation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour le suivi de linge
app.get('/api/laundry-tracking', authenticateToken, async (req, res) => {
  try {
    const [trackings] = await pool.execute(
      'SELECT * FROM laundry_tracking ORDER BY created_at DESC'
    );
    res.json(trackings);
  } catch (error) {
    console.error('Erreur lors de la récupération du suivi de linge:', error.message || error);
    console.error('Code d\'erreur MySQL:', error.code);
    if (error.code === 'ER_NO_SUCH_TABLE' || error.code === 1146) {
      return res.status(500).json({ error: 'Table laundry_tracking non trouvée. Veuillez exécuter le script SQL: database/create_laundry_tracking_table.sql' });
    }
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

app.post('/api/laundry-tracking', authenticateToken, async (req, res) => {
  try {
    const id = uuidv4();
    const trackingData = req.body;

    // Construire la requête SQL dynamiquement pour tous les champs du suivi de linge
    const fields = [
      'service_emetteur', 'periode_concernee', 'date_etablissement', 'date_reception',
      'service_origine', 'type_linge', 'poids_kg', 'quantite', 'etat_linge',
      'date_lavage', 'machine_utilisee', 'cycle_temperature', 'produit_lessiviel',
      'duree_cycle', 'agent_lavage', 'controle_visuel', 'observations_lavage',
      'date_sechage', 'type_sechage', 'temperature_sechage', 'duree_sechage',
      'repassage_effectue_par', 'controle_qualite_sechage',
      'date_livraison', 'service_destinataire', 'type_linge_livre', 'quantite_livree',
      'etat_linge_livre', 'heure_livraison', 'agent_livreur', 'receptonnaire_nom',
      'status', 'created_by'
    ];

    const fieldPlaceholders = fields.map(() => '?').join(', ');
    const fieldNames = fields.join(', ');
    const values = [
      id,
      trackingData.service_emetteur,
      trackingData.periode_concernee || null,
      trackingData.date_etablissement,
      trackingData.date_reception,
      trackingData.service_origine,
      trackingData.type_linge,
      trackingData.poids_kg || null,
      trackingData.quantite || null,
      trackingData.etat_linge || null,
      trackingData.date_lavage || null,
      trackingData.machine_utilisee || null,
      trackingData.cycle_temperature || null,
      trackingData.produit_lessiviel || null,
      trackingData.duree_cycle || null,
      trackingData.agent_lavage || null,
      trackingData.controle_visuel || false,
      trackingData.observations_lavage || null,
      trackingData.date_sechage || null,
      trackingData.type_sechage || null,
      trackingData.temperature_sechage || null,
      trackingData.duree_sechage || null,
      trackingData.repassage_effectue_par || null,
      trackingData.controle_qualite_sechage || false,
      trackingData.date_livraison || null,
      trackingData.service_destinataire || null,
      trackingData.type_linge_livre || null,
      trackingData.quantite_livree || null,
      trackingData.etat_linge_livre || null,
      trackingData.heure_livraison || null,
      trackingData.agent_livreur || null,
      trackingData.receptonnaire_nom || null,
      trackingData.status || 'en_reception',
      req.user.id
    ];

    await pool.execute(
      `INSERT INTO laundry_tracking (id, ${fieldNames}) VALUES (?, ${fieldPlaceholders})`,
      values
    );

    res.json({ id, message: 'Suivi de linge créé' });
  } catch (error) {
    console.error('Erreur lors de la création du suivi de linge:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/laundry-tracking/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updates = [];
    const values = [];

    const allowedFields = [
      'service_emetteur', 'periode_concernee', 'date_etablissement', 'date_reception',
      'service_origine', 'type_linge', 'poids_kg', 'quantite', 'etat_linge',
      'date_lavage', 'machine_utilisee', 'cycle_temperature', 'produit_lessiviel',
      'duree_cycle', 'agent_lavage', 'controle_visuel', 'observations_lavage',
      'date_sechage', 'type_sechage', 'temperature_sechage', 'duree_sechage',
      'repassage_effectue_par', 'controle_qualite_sechage',
      'date_livraison', 'service_destinataire', 'type_linge_livre', 'quantite_livree',
      'etat_linge_livre', 'heure_livraison', 'agent_livreur', 'receptonnaire_nom',
      'status'
    ];

    allowedFields.forEach(field => {
      if (updateData[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(updateData[field]);
      }
    });

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }

    values.push(id);

    await pool.execute(
      `UPDATE laundry_tracking SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({ message: 'Suivi de linge mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du suivi de linge:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/laundry-tracking/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.execute('DELETE FROM laundry_tracking WHERE id = ?', [id]);
    
    res.json({ message: 'Suivi de linge supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression du suivi de linge:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const [notifications] = await pool.execute(
      'SELECT * FROM notifications WHERE recipient_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(notifications);
  } catch (error) {
    console.error('Erreur lors de la récupération des notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const { recipient_id, message, link } = req.body;
    const id = uuidv4();

    await pool.execute(
      `INSERT INTO notifications (id, recipient_id, message, link, \`read\`)
       VALUES (?, ?, ?, ?, FALSE)`,
      [id, recipient_id, message, link || null]
    );

    res.json({ id, message: 'Notification créée' });
  } catch (error) {
    console.error('Erreur lors de la création de la notification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/notifications/mark-read', authenticateToken, async (req, res) => {
  try {
    await pool.execute(
      'UPDATE notifications SET `read` = TRUE WHERE recipient_id = ? AND `read` = FALSE',
      [req.user.id]
    );
    res.json({ message: 'Notifications marquées comme lues' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Marquer une notification individuelle comme lue
app.put('/api/notifications/:id/mark-read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      'UPDATE notifications SET `read` = TRUE WHERE id = ? AND recipient_id = ?',
      [id, req.user.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Notification non trouvée' });
    }
    
    res.json({ message: 'Notification marquée comme lue' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la notification:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route pour vérifier que le superadmin existe
app.post('/api/ensure-superadmin', async (req, res) => {
  try {
    const [admins] = await pool.execute(
      "SELECT * FROM profiles WHERE role = 'superadmin'"
    );

    if (admins.length === 0) {
      // Créer un superadmin par défaut
      const id = uuidv4();
      const passwordHash = await bcrypt.hash('admin123', 10);

      await pool.execute(
        `INSERT INTO profiles (id, username, email, password_hash, first_name, last_name, civility, role, service)
         VALUES (?, 'superadmin', 'admin@hospital.com', ?, 'Super', 'Admin', 'M.', 'superadmin', 'Administration')`,
        [id, passwordHash]
      );

      res.json({ success: true, message: 'Superadmin créé' });
    } else {
      res.json({ success: true, message: 'Superadmin existe déjà' });
    }
  } catch (error) {
    console.error('Erreur lors de la vérification du superadmin:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes QHSE (nouveaux modules)
const qhseRoutes = require('./routes/qhse')(pool, authenticateToken, dbConfig.database);
app.use('/api/qhse', qhseRoutes);

// Middleware de gestion d'erreurs globale
app.use((err, req, res, next) => {
  console.error('Erreur:', err);

  // Erreur Multer (upload)
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Le fichier est trop volumineux (max 10MB)' });
    }
    return res.status(400).json({ error: 'Erreur lors de l\'upload du fichier' });
  }

  // Erreur de validation
  if (err.status === 400) {
    return res.status(400).json({ error: err.message || 'Données invalides' });
  }

  // Erreur d'authentification
  if (err.status === 401 || err.status === 403) {
    return res.status(err.status).json({ error: err.message || 'Accès non autorisé' });
  }

  // Erreur serveur
  res.status(500).json({ error: 'Erreur serveur interne' });
});

async function columnExists(tableName, columnName) {
  const [rows] = await pool.execute(
    `SELECT COUNT(*) AS cnt
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ?
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [dbConfig.database, tableName, columnName]
  );
  return Number(rows?.[0]?.cnt || 0) > 0;
}

async function ensureDailyRoundsTechnicianNameColumn() {
  try {
    // Si la table n'existe pas encore, ne rien faire (le script SQL doit être exécuté)
    const [tables] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'daily_rounds'`,
      [dbConfig.database]
    );
    const hasDailyRoundsTable = Number(tables?.[0]?.cnt || 0) > 0;
    if (!hasDailyRoundsTable) return;

    const hasColumn = await columnExists('daily_rounds', 'technician_name');
    if (hasColumn) return;

    console.log('🛠️  Migration auto: ajout de la colonne daily_rounds.technician_name ...');
    await pool.execute(
      `ALTER TABLE daily_rounds
       ADD COLUMN technician_name VARCHAR(255) NULL
       AFTER technician_id`
    );

    // Remplir les anciennes entrées si possible
    try {
      await pool.execute(
        `UPDATE daily_rounds dr
         JOIN profiles p ON dr.technician_id = p.id
         SET dr.technician_name = CONCAT(p.first_name, ' ', p.last_name)
         WHERE dr.technician_name IS NULL`
      );
    } catch (e) {
      console.warn('⚠️  Migration auto: impossible de backfill technician_name depuis profiles:', e?.message || e);
    }

    console.log('✅ Migration auto terminée: daily_rounds.technician_name ajouté.');
  } catch (error) {
    console.warn('⚠️  Migration auto ignorée (technician_name):', error?.message || error);
  }
}

async function ensureRoundChecklistResponsesEquipmentStatusColumn() {
  try {
    // Si la table n'existe pas encore, ne rien faire (le script SQL doit être exécuté)
    const [tables] = await pool.execute(
      `SELECT COUNT(*) AS cnt
       FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'round_checklist_responses'`,
      [dbConfig.database]
    );
    const hasTable = Number(tables?.[0]?.cnt || 0) > 0;
    if (!hasTable) return;

    console.log('🛠️  Migration auto: vérification des colonnes round_checklist_responses (equipment_status, equipment_name, service_name) ...');
    
    // Vérifier et ajouter equipment_status
    const hasEquipmentStatus = await columnExists('round_checklist_responses', 'equipment_status');
    if (!hasEquipmentStatus) {
      console.log('  → Ajout de equipment_status...');
      await pool.execute(
        `ALTER TABLE round_checklist_responses
         ADD COLUMN equipment_status ENUM('bon_état', 'défectueux') NULL
         AFTER observation`
      );
    }

    // Vérifier et ajouter equipment_name
    const hasEquipmentName = await columnExists('round_checklist_responses', 'equipment_name');
    if (!hasEquipmentName) {
      console.log('  → Ajout de equipment_name...');
      await pool.execute(
        `ALTER TABLE round_checklist_responses
         ADD COLUMN equipment_name VARCHAR(255) NULL
         AFTER equipment_status`
      );
    }

    // Vérifier et ajouter service_name
    const hasServiceName = await columnExists('round_checklist_responses', 'service_name');
    if (!hasServiceName) {
      console.log('  → Ajout de service_name...');
      await pool.execute(
        `ALTER TABLE round_checklist_responses
         ADD COLUMN service_name VARCHAR(255) NULL
         AFTER equipment_name`
      );
    }

    // Mettre à jour les réponses existantes avec is_checked = true pour avoir 'bon_état' par défaut
    try {
      await pool.execute(
        `UPDATE round_checklist_responses
         SET equipment_status = 'bon_état'
         WHERE is_checked = TRUE AND equipment_status IS NULL`
      );
    } catch (e) {
      console.warn('⚠️  Migration auto: impossible de backfill equipment_status:', e?.message || e);
    }

    console.log('✅ Migration auto terminée: round_checklist_responses (equipment_status, equipment_name, service_name) ajoutés.');
  } catch (error) {
    console.warn('⚠️  Migration auto ignorée (equipment_status):', error?.message || error);
  }
}

async function ensureIncidentsPrestataireColumn() {
  try {
    const [tables] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'incidents'`,
      [dbConfig.database]
    );
    const hasTable = Number(tables?.[0]?.cnt || 0) > 0;
    if (!hasTable) return;

    console.log('🛠️  Migration auto: vérification de la colonne prestataire dans incidents...');

    const hasPrestataire = await columnExists('incidents', 'prestataire');
    if (!hasPrestataire) {
      console.log('  → Ajout de prestataire...');
      await pool.execute(
        `ALTER TABLE incidents ADD COLUMN prestataire VARCHAR(255) NULL AFTER assigned_to_name`
      );
      console.log('✅ Migration auto terminée: prestataire ajouté à incidents.');
    } else {
      console.log('✅ Colonne prestataire déjà présente dans incidents.');
    }
  } catch (error) {
    console.warn('⚠️  Migration auto ignorée (prestataire):', error?.message || error);
  }
}

async function ensureIncidentCommentsTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'incident_comments'`,
      [dbConfig.database]
    );
    const hasTable = Number(tables?.[0]?.cnt || 0) > 0;
    if (hasTable) {
      console.log('✅ Table incident_comments déjà présente.');
      return;
    }

    console.log('🛠️  Migration auto: création de la table incident_comments...');

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS incident_comments (
        id VARCHAR(36) PRIMARY KEY,
        incident_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36) NOT NULL,
        user_name VARCHAR(255) NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
        INDEX idx_incident_id (incident_id),
        INDEX idx_created_at (created_at)
      )
    `);

    console.log('✅ Migration auto terminée: table incident_comments créée.');
  } catch (error) {
    console.warn('⚠️  Migration auto ignorée (incident_comments):', error?.message || error);
  }
}

async function ensureAESTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'aes'`,
      [dbConfig.database]
    );
    const hasTable = Number(tables?.[0]?.cnt || 0) > 0;
    
    if (!hasTable) {
      console.log('🛠️  Migration auto: création de la table aes...');

      await pool.execute(`
      CREATE TABLE IF NOT EXISTS aes (
        id VARCHAR(36) PRIMARY KEY,
        agent_nom VARCHAR(255) NOT NULL,
        agent_prenom VARCHAR(255) NOT NULL,
        agent_matricule VARCHAR(100),
        agent_fonction VARCHAR(255),
        agent_service VARCHAR(255),
        agent_telephone VARCHAR(50),
        agent_statut ENUM('Personnel', 'Stagiaire', 'Prestataire') NOT NULL,
        date_aes DATE NOT NULL,
        heure_aes TIME NOT NULL,
        lieu_precis VARCHAR(500),
        type_exposition ENUM('Piqure', 'Coupure', 'Projection muqueuse', 'Contact peau lésée') NOT NULL,
        description_circonstances TEXT,
        type_dispositif VARCHAR(255),
        usage_unique BOOLEAN,
        souille_sang BOOLEAN,
        dans_sac_dasri BOOLEAN,
        patient_source_identifiee BOOLEAN,
        patient_code_identifiant VARCHAR(255),
        consentement_prelevement BOOLEAN,
        lavage_eau_savon BOOLEAN,
        desinfection BOOLEAN,
        rinçage_muqueuse BOOLEAN,
        heure_premiers_soins TIME,
        medecin_referent_aes VARCHAR(255),
        examen_vih BOOLEAN DEFAULT FALSE,
        examen_vhb BOOLEAN DEFAULT FALSE,
        examen_vhc BOOLEAN DEFAULT FALSE,
        traitement_arv_initie BOOLEAN,
        date_debut_traitement DATE,
        resultat_agent_vih BOOLEAN,
        resultat_agent_vhb BOOLEAN,
        resultat_agent_vhc BOOLEAN,
        resultat_patient_vih BOOLEAN,
        resultat_patient_vhb BOOLEAN,
        resultat_patient_vhc BOOLEAN,
        conduite_tenir TEXT,
        orientation_infectiologue BOOLEAN,
        orientation_psychologue BOOLEAN,
        dates_suivi_prevues TEXT,
        suivi_m1_date DATE,
        suivi_m1_vih BOOLEAN,
        suivi_m1_vhb BOOLEAN,
        suivi_m1_vhc BOOLEAN,
        suivi_m6_date DATE,
        suivi_m6_vih BOOLEAN,
        suivi_m6_vhb BOOLEAN,
        suivi_m6_vhc BOOLEAN,
        suivi_m9_date DATE,
        suivi_m9_vih BOOLEAN,
        suivi_m9_vhb BOOLEAN,
        suivi_m9_vhc BOOLEAN,
        dossier_cloture BOOLEAN DEFAULT FALSE,
        date_cloture DATE,
        nom_signature_qhse VARCHAR(255),
        created_by VARCHAR(36) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT
      )
    `);

    console.log('✅ Migration auto terminée: table aes créée.');
    } else {
      console.log('✅ Table aes déjà présente.');
      
      // Vérifier et ajouter les colonnes manquantes pour le tableau de suivi
      const [columns] = await pool.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'aes'`,
        [dbConfig.database]
      );
      const columnNames = columns.map(col => col.COLUMN_NAME);
      
      const newColumns = [
        { name: 'numero_aes', def: 'INT NULL COMMENT "Numéro unique de l\'AES"' },
        { name: 'port_epi', def: 'BOOLEAN DEFAULT FALSE COMMENT "Port des EPI"' },
        { name: 'declaration_immediate', def: 'BOOLEAN DEFAULT FALSE COMMENT "Déclaration immédiate"' },
        { name: 'date_declaration', def: 'DATE NULL COMMENT "Date de déclaration"' },
        { name: 'prise_charge_immediate', def: 'BOOLEAN DEFAULT FALSE COMMENT "Prise en charge immédiate réalisée"' },
        { name: 'inscription_sentimed', def: 'BOOLEAN DEFAULT FALSE COMMENT "Inscription sur SENTIMED"' },
        { name: 'bon_examen_prescrit', def: 'BOOLEAN DEFAULT FALSE COMMENT "Bon d\'examen prescrit"' },
        { name: 'matricule_sentimed', def: 'VARCHAR(100) NULL COMMENT "Matricule SENTIMED"' },
        { name: 'date_prise_resultat', def: 'DATE NULL COMMENT "Date de prise de résultat"' },
        { name: 'suivi_m3_date', def: 'DATE NULL COMMENT "Date de suivi M+3"' },
        { name: 'suivi_m3_vhb', def: 'BOOLEAN NULL COMMENT "Résultat M+3 VHB"' },
        { name: 'suivi_m3_vhc', def: 'BOOLEAN NULL COMMENT "Résultat M+3 VHC"' },
        { name: 'observations', def: 'TEXT NULL COMMENT "Observations / Commentaires"' }
      ];
      
      for (const col of newColumns) {
        if (!columnNames.includes(col.name)) {
          try {
            await pool.execute(`ALTER TABLE aes ADD COLUMN ${col.name} ${col.def}`);
            console.log(`✅ Colonne ${col.name} ajoutée à aes.`);
          } catch (err) {
            console.warn(`⚠️  Erreur lors de l'ajout de ${col.name}:`, err.message);
          }
        }
      }
      
      // Mettre à jour numero_aes pour les enregistrements existants
      try {
        const [existing] = await pool.execute('SELECT COUNT(*) as cnt FROM aes WHERE numero_aes IS NULL');
        if (existing[0].cnt > 0) {
          // Utiliser une variable de session pour numéroter
          await pool.execute('SET @row_number = 0');
          await pool.execute(`
            UPDATE aes 
            SET numero_aes = (@row_number := @row_number + 1)
            WHERE numero_aes IS NULL
            ORDER BY created_at, date_aes
          `);
          console.log(`✅ Numéros AES mis à jour pour ${existing[0].cnt} enregistrement(s).`);
        }
      } catch (err) {
        console.warn('⚠️  Erreur lors de la mise à jour des numéros AES:', err.message);
      }
    }
  } catch (error) {
    console.warn('⚠️  Migration auto ignorée (aes):', error?.message || error);
  }
}

async function ensureCameraAccessRequestsTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'camera_access_requests'`,
      [dbConfig.database]
    );
    const hasTable = Number(tables?.[0]?.cnt || 0) > 0;
    
    if (!hasTable) {
      console.log('🛠️  Migration auto: création de la table camera_access_requests...');

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS camera_access_requests (
          id VARCHAR(36) PRIMARY KEY,
          requester_id VARCHAR(36) NOT NULL,
          requester_name VARCHAR(255),
          requester_service VARCHAR(255),
          requester_position VARCHAR(255),
          request_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          access_reason TEXT NOT NULL,
          access_start_date DATE NOT NULL,
          access_end_date DATE NOT NULL,
          access_start_time TIME,
          access_end_time TIME,
          camera_zones TEXT,
          hierarchical_authorization VARCHAR(255),
          hierarchical_authorization_date DATETIME,
          status ENUM('en_attente', 'approuve', 'refuse', 'annule') NOT NULL DEFAULT 'en_attente',
          notes TEXT,
          qhse_validation VARCHAR(255),
          qhse_validation_date DATETIME,
          requester_signature VARCHAR(255),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_requester_id (requester_id),
          INDEX idx_status (status),
          INDEX idx_request_date (request_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('✅ Migration auto terminée: table camera_access_requests créée.');
    } else {
      console.log('✅ Table camera_access_requests déjà présente.');
      
      // Vérifier et ajouter les colonnes manquantes
      const [columns] = await pool.execute(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'camera_access_requests'`,
        [dbConfig.database]
      );
      const columnNames = columns.map(col => col.COLUMN_NAME);
      
      if (!columnNames.includes('qhse_validation')) {
        await pool.execute(
          `ALTER TABLE camera_access_requests ADD COLUMN qhse_validation VARCHAR(255) NULL AFTER notes`
        );
        console.log('✅ Colonne qhse_validation ajoutée à camera_access_requests.');
      }
      
      if (!columnNames.includes('qhse_validation_date')) {
        await pool.execute(
          `ALTER TABLE camera_access_requests ADD COLUMN qhse_validation_date DATETIME NULL AFTER qhse_validation`
        );
        console.log('✅ Colonne qhse_validation_date ajoutée à camera_access_requests.');
      }
      
      if (!columnNames.includes('requester_signature')) {
        await pool.execute(
          `ALTER TABLE camera_access_requests ADD COLUMN requester_signature VARCHAR(255) NULL AFTER qhse_validation_date`
        );
        console.log('✅ Colonne requester_signature ajoutée à camera_access_requests.');
      }
    }
  } catch (error) {
    console.warn('⚠️  Migration auto ignorée (camera_access_requests):', error?.message || error);
  }
}

async function ensureWorksTable() {
  try {
    const [tables] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'works'`,
      [dbConfig.database]
    );
    const hasTable = Number(tables?.[0]?.cnt || 0) > 0;
    
    if (!hasTable) {
      console.log('🛠️  Migration auto: création de la table works...');

      await pool.execute(`
        CREATE TABLE IF NOT EXISTS works (
          id VARCHAR(36) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          description TEXT NOT NULL,
          work_type ENUM('maintenance', 'reparation', 'renovation', 'construction', 'amelioration', 'autre') NOT NULL DEFAULT 'maintenance',
          location VARCHAR(255) NULL,
          priority ENUM('faible', 'moyenne', 'haute', 'critique') DEFAULT 'moyenne',
          status ENUM('planifié', 'en_cours', 'en_pause', 'terminé', 'annulé') DEFAULT 'planifié',
          assigned_to VARCHAR(36) NULL,
          assigned_to_name VARCHAR(255) NULL,
          planned_start_date DATE NULL,
          planned_end_date DATE NULL,
          actual_start_date DATE NULL,
          actual_end_date DATE NULL,
          estimated_cost DECIMAL(10, 2) NULL,
          actual_cost DECIMAL(10, 2) NULL,
          supplier_name VARCHAR(255) NULL,
          supplier_contact VARCHAR(255) NULL,
          notes TEXT NULL,
          photo_urls JSON DEFAULT NULL,
          created_by VARCHAR(36) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL,
          FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL,
          INDEX idx_works_status (status),
          INDEX idx_works_assigned_to (assigned_to),
          INDEX idx_works_work_type (work_type),
          INDEX idx_works_planned_start_date (planned_start_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);

      console.log('✅ Migration auto terminée: table works créée.');
    } else {
      console.log('✅ Table works déjà présente.');
    }
  } catch (error) {
    console.warn('⚠️  Migration auto ignorée (works):', error?.message || error);
  }
}

async function ensureNetworkTables() {
  try {
    // Table network_equipment
    const [tables1] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'network_equipment'`,
      [dbConfig.database]
    );
    if (Number(tables1?.[0]?.cnt || 0) === 0) {
      console.log('🛠️  Migration auto: création de la table network_equipment...');
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS network_equipment (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          type ENUM('routeur', 'switch', 'point_acces', 'serveur', 'firewall', 'autre') NOT NULL,
          brand VARCHAR(255) NULL,
          model VARCHAR(255) NULL,
          serial_number VARCHAR(255) NULL,
          ip_address VARCHAR(45) NULL,
          mac_address VARCHAR(17) NULL,
          location VARCHAR(255) NULL,
          status ENUM('operationnel', 'en_maintenance', 'hors_service') DEFAULT 'operationnel',
          installation_date DATE NULL,
          warranty_expiry DATE NULL,
          notes TEXT NULL,
          created_by VARCHAR(36) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT,
          INDEX idx_network_equipment_status (status),
          INDEX idx_network_equipment_type (type)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table network_equipment créée.');
    }

    // Table network_subscriptions
    const [tables2] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'network_subscriptions'`,
      [dbConfig.database]
    );
    if (Number(tables2?.[0]?.cnt || 0) === 0) {
      console.log('🛠️  Migration auto: création de la table network_subscriptions...');
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS network_subscriptions (
          id VARCHAR(36) PRIMARY KEY,
          service_name VARCHAR(255) NOT NULL,
          provider VARCHAR(255) NOT NULL,
          subscription_type ENUM('internet', 'telephonie', 'cloud', 'securite', 'autre') NOT NULL,
          monthly_cost DECIMAL(10, 2) DEFAULT 0,
          start_date DATE NOT NULL,
          renewal_date DATE NOT NULL,
          contract_number VARCHAR(255) NULL,
          contact_person VARCHAR(255) NULL,
          contact_phone VARCHAR(50) NULL,
          contact_email VARCHAR(255) NULL,
          status ENUM('actif', 'suspendu', 'expire', 'resilie') DEFAULT 'actif',
          notes TEXT NULL,
          created_by VARCHAR(36) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT,
          INDEX idx_network_subscriptions_status (status),
          INDEX idx_network_subscriptions_renewal_date (renewal_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table network_subscriptions créée.');
    }

    // Table network_inventory
    const [tables3] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'network_inventory'`,
      [dbConfig.database]
    );
    if (Number(tables3?.[0]?.cnt || 0) === 0) {
      console.log('🛠️  Migration auto: création de la table network_inventory...');
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS network_inventory (
          id VARCHAR(36) PRIMARY KEY,
          item_name VARCHAR(255) NOT NULL,
          category ENUM('cable', 'connecteur', 'antenne', 'boitier', 'autre') NOT NULL,
          brand VARCHAR(255) NULL,
          model VARCHAR(255) NULL,
          quantity INT NOT NULL DEFAULT 1,
          unit ENUM('unite', 'metre', 'lot') DEFAULT 'unite',
          location VARCHAR(255) NULL,
          supplier VARCHAR(255) NULL,
          purchase_date DATE NULL,
          purchase_cost DECIMAL(10, 2) NULL,
          notes TEXT NULL,
          created_by VARCHAR(36) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE RESTRICT,
          INDEX idx_network_inventory_category (category)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table network_inventory créée.');
    }
  } catch (error) {
    console.warn('⚠️  Migration auto ignorée (network tables):', error?.message || error);
  }
}

async function ensureTrainingsPrestataireColumns() {
  try {
    const [tables] = await pool.execute(
      `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'trainings'`,
      [dbConfig.database]
    );
    const hasTable = Number(tables?.[0]?.cnt || 0) > 0;
    
    if (!hasTable) {
      return; // La table n'existe pas encore, elle sera créée avec le schéma complet
    }

    // Vérifier et ajouter les colonnes manquantes pour les prestataires
    const [columns] = await pool.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'trainings'`,
      [dbConfig.database]
    );
    const columnNames = columns.map(col => col.COLUMN_NAME);
    
    const newColumns = [
      { name: 'prestataire', def: 'VARCHAR(255) NULL COMMENT "Nom du prestataire"' },
      { name: 'prestataire_evaluation', def: 'TEXT NULL COMMENT "Évaluation/commentaire sur le prestataire"' },
      { name: 'prestataire_note', def: 'DECIMAL(3,1) NULL COMMENT "Note du prestataire (sur 10)"' }
    ];
    
    for (const col of newColumns) {
      if (!columnNames.includes(col.name)) {
        try {
          await pool.execute(`ALTER TABLE trainings ADD COLUMN ${col.name} ${col.def}`);
          console.log(`✅ Colonne ${col.name} ajoutée à trainings.`);
        } catch (err) {
          console.warn(`⚠️  Erreur lors de l'ajout de ${col.name}:`, err.message);
        }
      }
    }
  } catch (error) {
    console.warn('⚠️  Migration auto ignorée (trainings prestataire):', error?.message || error);
  }
}

async function startServer() {
  console.log('🔄 Initialisation du serveur...');

  // Test de connexion + migrations légères
  try {
    const [result] = await pool.execute('SELECT COUNT(*) as count FROM profiles');
    console.log(`✅ Connexion MySQL réussie! ${result[0].count} utilisateur(s) trouvé(s)`);
  } catch (error) {
    console.error(`❌ Erreur de connexion à MySQL: ${error.message}`);
    console.error('💡 Vérifiez votre configuration dans backend/.env');
  }

  await ensureDailyRoundsTechnicianNameColumn();
  await ensureRoundChecklistResponsesEquipmentStatusColumn();
  await ensureIncidentsPrestataireColumn();
  await ensureIncidentCommentsTable();
  await ensureAESTable();
  await ensureCameraAccessRequestsTable();
  await ensureTrainingsPrestataireColumns();
  await ensureWorksTable();
  await ensureNetworkTables();

  // Démarrage du serveur
  app.listen(PORT, () => {
    console.log(`✅ Serveur API démarré sur le port ${PORT}`);
    console.log(`📊 Base de données: ${dbConfig.database} sur ${dbConfig.host}:${dbConfig.port}`);
    console.log(`📦 Modules QHSE chargés: GED, Audits, Formations, Déchets, Stérilisation, Risques`);
  });
}

startServer();


