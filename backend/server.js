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
const { supabase } = require('./supabaseClient');

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

// Helper pour créer des notifications (ne bloque pas la réponse en cas d'erreur)
const createNotification = async (recipientId, message, link = null) => {
  if (!recipientId) return;
  try {
    const id = uuidv4();
    if (supabase) {
      const { error } = await supabase.from('notifications').insert({
        id,
        recipient_id: recipientId,
        message,
        link,
        read: false,
        created_at: new Date().toISOString(),
      });
      if (error) {
        console.error('Erreur création notification (Supabase):', error.message);
      }
    } else {
      await pool.execute(
        `INSERT INTO notifications (id, recipient_id, message, link, \`read\`)
         VALUES (?, ?, ?, ?, FALSE)`,
        [id, recipientId, message, link]
      );
    }
  } catch (err) {
    console.error('Erreur création notification:', err.message);
  }
};

// Récupérer les IDs des superviseurs QHSE
const getSupervisorIds = async () => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['superviseur_qhse', 'superadmin']);
      if (error) {
        console.error('Erreur récupération superviseurs (Supabase):', error.message);
        return [];
      }
      return data.map(r => r.id);
    } else {
      const [rows] = await pool.execute(
        "SELECT id FROM profiles WHERE role IN ('superviseur_qhse', 'superadmin')"
      );
      return rows.map(r => r.id);
    }
  } catch (err) {
    console.error('Erreur récupération superviseurs:', err.message);
    return [];
  }
};

// Récupérer les IDs des utilisateurs par rôle(s)
const getUserIdsByRoles = async (roles) => {
  if (!Array.isArray(roles)) roles = [roles];
  if (roles.length === 0) return [];
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .in('role', roles);
      if (error) {
        console.error('Erreur récupération utilisateurs par rôle (Supabase):', error.message);
        return [];
      }
      return data.map(r => r.id);
    } else {
      const placeholders = roles.map(() => '?').join(',');
      const [rows] = await pool.execute(
        `SELECT id FROM profiles WHERE role IN (${placeholders})`,
        roles
      );
      return rows.map(r => r.id);
    }
  } catch (err) {
    console.error('Erreur récupération utilisateurs par rôle:', err.message);
    return [];
  }
};

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
    // Avec Supabase (PostgreSQL), on désactive temporairement cette synchronisation basée sur MySQL
    if (supabase) {
      console.log('[Init] Supabase détecté, ensureConsultationSchedule (MySQL) désactivé pour le moment.');
      return;
    }

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

    if (supabase) {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', decoded.userId)
        .limit(1);

      if (error) {
        console.error('Erreur récupération utilisateur (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!data || data.length === 0) {
        return res.status(401).json({ error: 'Utilisateur non trouvé' });
      }

      req.user = data[0];
      return next();
    }

    // Fallback MySQL si Supabase n'est pas disponible
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
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour l\'authentification.' });
    }

    const { email, password, first_name, last_name, username, role, service, civility, pin } = req.body;

    // Vérifier si l'utilisateur existe déjà
    const { data: existing, error: existingError } = await supabase
      .from('profiles')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .limit(1);

    if (existingError) {
      console.error('Erreur Supabase lors de la vérification de l\'utilisateur existant:', existingError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (existing && existing.length > 0) {
      return res.status(400).json({ error: 'Email ou nom d\'utilisateur déjà utilisé' });
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    // Créer l'utilisateur dans Supabase
    const { error: insertError } = await supabase
      .from('profiles')
      .insert([{
        id,
        username,
        email,
        password_hash: passwordHash,
        first_name,
        last_name,
        civility: civility || 'M.',
        role,
        service: service || '',
        pin: pin || null
      }]);

    if (insertError) {
      console.error('Erreur Supabase lors de la création de l\'utilisateur:', insertError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

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
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour l\'authentification.' });
    }

    const { email, password } = req.body;

    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (usersError) {
      console.error('Erreur Supabase lors de la récupération de l\'utilisateur:', usersError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!users || users.length === 0) {
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

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour l\'authentification.' });
    }

    const { password } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ password_hash: passwordHash })
      .eq('id', req.user.id);

    if (updateError) {
      console.error('Erreur Supabase lors de la mise à jour du mot de passe:', updateError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

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

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour l\'authentification.' });
    }

    const { password } = req.body;
    const { userId } = req.params;

    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }

    // Vérifier que l'utilisateur cible existe
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .limit(1);

    if (usersError) {
      console.error('Erreur Supabase lors de la vérification de l\'utilisateur cible:', usersError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!users || users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    // Hasher le nouveau mot de passe
    const passwordHash = await bcrypt.hash(password, 10);

    // Mettre à jour le mot de passe dans Supabase
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ password_hash: passwordHash })
      .eq('id', userId);

    if (updateError) {
      console.error('Erreur Supabase lors de la mise à jour du mot de passe (reset):', updateError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    res.json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la réinitialisation du mot de passe:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les profils
app.get('/api/profiles', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les profils.' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, first_name, last_name, civility, role, service, pin, added_permissions, removed_permissions, created_at');

    if (error) {
      console.error('Erreur Supabase lors de la récupération des profils:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Erreur lors de la récupération des profils:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/profiles/:id', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les profils.' });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, email, first_name, last_name, civility, role, service, pin, added_permissions, removed_permissions')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Erreur Supabase lors de la récupération du profil:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Profil non trouvé' });
    }

    res.json(data);
  } catch (error) {
    console.error('Erreur lors de la récupération du profil:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/profiles/:id', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les profils.' });
    }

    const { added_permissions, removed_permissions } = req.body;

    const { error } = await supabase
      .from('profiles')
      .update({
        added_permissions: added_permissions || [],
        removed_permissions: removed_permissions || []
      })
      .eq('id', req.params.id);

    if (error) {
      console.error('Erreur Supabase lors de la mise à jour du profil:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

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

    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les profils.' });
    }

    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      console.error('Erreur Supabase lors de la suppression de l\'utilisateur:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

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

// Routes pour les incidents (Supabase)
app.get('/api/incidents', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les incidents.' });
    }

    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('date_creation', { ascending: false });

    if (error) {
      console.error('Erreur Supabase lors de la récupération des incidents:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const incidents = data || [];

    res.json(incidents.map(inc => {
      let rawPriorite = inc.priorite;
      
      if (rawPriorite != null && rawPriorite !== undefined) {
        if (typeof rawPriorite === 'object' && rawPriorite.toString) {
          rawPriorite = rawPriorite.toString();
        } else {
          rawPriorite = String(rawPriorite);
        }
      }
      
      let normalizedPriorite = 'moyenne';
      if (rawPriorite && typeof rawPriorite === 'string') {
        normalizedPriorite = rawPriorite.trim().toLowerCase();
      }
      
      const validPriorities = ['faible', 'moyenne', 'haute', 'critique'];
      const priorite = validPriorities.includes(normalizedPriorite) ? normalizedPriorite : 'moyenne';
      
      return {
        ...inc,
        priorite,
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
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les incidents.' });
    }

    const { type, description, priorite, service, lieu, photo_urls } = req.body;
    const id = uuidv4();
    
    console.log('POST /api/incidents - Body complet:', JSON.stringify(req.body));
    console.log('POST /api/incidents - priorite depuis req.body:', priorite, 'type:', typeof priorite);
    console.log('POST /api/incidents - req.body.priorite:', req.body.priorite, 'type:', typeof req.body.priorite);
    
    let finalPriorite = req.body.priorite || 'moyenne';
    
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
    
    const payload = {
      id,
      type,
      description,
      reported_by: req.user.id,
      statut: 'nouveau',
      priorite: finalPriorite,
      service,
      lieu,
      photo_urls: photo_urls || [],
      assigned_to_name: null
    };

    const { error: insertError } = await supabase
      .from('incidents')
      .insert([payload]);

    if (insertError) {
      console.error('Erreur Supabase lors de la création de l\'incident:', insertError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    let reporterName = 'Un utilisateur';
    try {
      const { data: reporter, error: reporterError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', req.user.id)
        .maybeSingle();

      if (!reporterError && reporter) {
        reporterName = `${reporter.first_name || ''} ${reporter.last_name || ''}`.trim() || 'Un utilisateur';
      }
    } catch (err) {
      console.warn('Impossible de récupérer le nom du rapporteur depuis Supabase:', err);
    }

    const supervisorIds = await getSupervisorIds();
    for (const sid of supervisorIds) {
      await createNotification(sid, `Nouvel incident (${type}) signalé par ${reporterName}.`, 'qhseTickets');
    }

    res.json({ id, message: 'Incident créé' });
  } catch (error) {
    console.error('Erreur lors de la création de l\'incident:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/incidents/:id', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les incidents.' });
    }

    const { statut, assigned_to, assigned_to_name, prestataire, priorite, deadline, report } = req.body;
    
    const { data: incidentRows, error: fetchError } = await supabase
      .from('incidents')
      .select('*')
      .eq('id', req.params.id);

    if (fetchError) {
      console.error('Erreur Supabase lors de la récupération de l\'incident:', fetchError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!incidentRows || incidentRows.length === 0) {
      return res.status(404).json({ error: 'Incident non trouvé' });
    }
    const incident = incidentRows[0];

    if (assigned_to !== undefined || priorite !== undefined || deadline !== undefined) {
      const isStatusUpdateOnly = statut !== undefined && 
                                  assigned_to === undefined && 
                                  priorite === undefined && 
                                  deadline === undefined &&
                                  report === undefined;
      
      if (!isStatusUpdateOnly || assigned_to !== undefined) {
        if (req.user.role !== 'superviseur_qhse' && req.user.role !== 'superadmin') {
          return res.status(403).json({ error: 'Seul le superviseur QHSE peut assigner ou planifier des interventions' });
        }
      }
    }

    const updates = {};

    if (statut !== undefined) {
      updates.statut = statut;
    }
    if (assigned_to !== undefined) {
      updates.assigned_to = assigned_to;

      if (assigned_to_name === undefined && assigned_to) {
        try {
          const { data: userRows, error: userError } = await supabase
            .from('profiles')
            .select('first_name, last_name, name, username')
            .eq('id', assigned_to);

          if (!userError && userRows && userRows.length > 0) {
            const user = userRows[0];
            const nameParts = [user.first_name, user.last_name].filter(Boolean);
            const fullName = nameParts.length > 0 ? nameParts.join(' ') : (user.name || user.username || null);
            if (fullName) {
              updates.assigned_to_name = fullName;
            }
          }
        } catch (err) {
          console.error('Erreur lors de la récupération du nom de l\'utilisateur (Supabase):', err);
        }
      } else if (assigned_to_name !== null && assigned_to_name !== undefined) {
        updates.assigned_to_name = assigned_to_name;
      } else if (assigned_to_name === null) {
        updates.assigned_to_name = null;
      }
    } else if (assigned_to_name !== undefined) {
      updates.assigned_to_name = assigned_to_name;
    }
    if (priorite !== undefined) {
      updates.priorite = priorite;
    }
    if (deadline !== undefined) {
      updates.deadline = deadline;
    }
    if (prestataire !== undefined) {
      updates.prestataire = prestataire || null;
    }
    if (report !== undefined) {
      updates.report = report;
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ success: true });
    }

    const { error: updateError } = await supabase
      .from('incidents')
      .update(updates)
      .eq('id', req.params.id);

    if (updateError) {
      console.error('Erreur Supabase lors de la mise à jour de l\'incident:', updateError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const incidentIdShort = req.params.id.substring(0, 8);
    const link = 'qhseTickets';

    if (statut !== undefined) {
      const statutLabels = { nouveau: 'Nouveau', attente: 'En attente', cours: 'En cours', en_cours: 'En cours', traite: 'Traité', resolu: 'Résolu' };
      const statutLabel = statutLabels[statut] || statut;
      if (incident.assigned_to) {
        await createNotification(incident.assigned_to, `Statut du ticket mis à jour: ${statutLabel}`, link);
      }
      const supervisorIds = await getSupervisorIds();
      for (const sid of supervisorIds) {
        await createNotification(sid, `Statut du ticket ${incidentIdShort} mis à jour: ${statutLabel}`, link);
      }
    }
    if (assigned_to !== undefined) {
      if (assigned_to) {
        await createNotification(assigned_to, `Nouveau ticket vous a été assigné: ${incidentIdShort}.`, link);
        const supervisorIds = await getSupervisorIds();
        for (const sid of supervisorIds) {
          await createNotification(sid, `Ticket ${incidentIdShort} assigné.`, link);
        }
      } else if (incident.assigned_to) {
        await createNotification(incident.assigned_to, `Un ticket vous a été retiré: ${incidentIdShort}.`, link);
        const supervisorIds = await getSupervisorIds();
        for (const sid of supervisorIds) {
          await createNotification(sid, `Un ticket ${incidentIdShort} a été désassigné.`, link);
        }
      }
    }
    if (report !== undefined) {
      const [reporter] = await pool.execute('SELECT first_name, last_name FROM profiles WHERE id = ?', [req.user.id]);
      const reporterName = reporter[0] ? `${reporter[0].first_name || ''} ${reporter[0].last_name || ''}`.trim() || 'Un utilisateur' : 'Un utilisateur';
      const supervisorIds = await getSupervisorIds();
      for (const sid of supervisorIds) {
        await createNotification(sid, `Rapport soumis pour ticket ${incidentIdShort} par ${reporterName}.`, link);
      }
    }

    res.json({ message: 'Incident mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'incident:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les commentaires d'incidents (Supabase)
app.get('/api/incidents/:id/comments', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les commentaires d\'incidents.' });
    }

    const { data, error } = await supabase
      .from('incident_comments')
      .select('*')
      .eq('incident_id', req.params.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur Supabase lors de la récupération des commentaires:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const comments = data || [];

    res.json(comments.map(c => ({
      ...c,
      created_at: c.created_at ? new Date(c.created_at) : undefined,
      updated_at: c.updated_at ? new Date(c.updated_at) : undefined
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des commentaires:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/incidents/:id/comments', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les commentaires d\'incidents.' });
    }

    const { comment, user_name } = req.body;
    if (!comment || !comment.trim()) {
      return res.status(400).json({ error: 'Le commentaire ne peut pas être vide' });
    }
    
    const id = uuidv4();
    const payload = {
      id,
      incident_id: req.params.id,
      user_id: req.user.id,
      user_name: user_name || req.user.username,
      comment: comment.trim()
    };

    const { data, error } = await supabase
      .from('incident_comments')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Erreur Supabase lors de l\'ajout du commentaire:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    res.json({
      ...data,
      created_at: data.created_at ? new Date(data.created_at) : undefined,
      updated_at: data.updated_at ? new Date(data.updated_at) : undefined
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout du commentaire:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/incidents/:id', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les incidents.' });
    }

    const { id } = req.params;

    const { data: incidents, error: fetchError } = await supabase
      .from('incidents')
      .select('reported_by')
      .eq('id', id);

    if (fetchError) {
      console.error('Erreur Supabase lors de la récupération de l\'incident pour suppression:', fetchError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!incidents || incidents.length === 0) {
      return res.json({ success: true, message: 'Incident déjà supprimé.' });
    }

    const incident = incidents[0];
    const allowedRoles = ['superadmin', 'superviseur_qhse', 'biomedical'];

    if (incident.reported_by !== req.user.id && !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Vous n\'êtes pas autorisé à supprimer cet incident.' });
    }

    const { error: deleteError } = await supabase
      .from('incidents')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erreur Supabase lors de la suppression de l\'incident:', deleteError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

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

// Routes pour les visiteurs (Supabase si configuré)
app.get('/api/visitors', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré côté backend.' });
    }

    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .order('entry_time', { ascending: false });

    if (error) {
      console.error('Erreur Supabase lors de la récupération des visiteurs:', error.message);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Erreur lors de la récupération des visiteurs:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/visitors', authenticateToken, validateVisitor, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré côté backend.' });
    }

    const {
      full_name, id_document, reason, destination, person_to_see,
      company, visit_type, id_verified, badge_code, entry_signature, access_observations
    } = req.body;

    const payload = {
      full_name,
      id_document,
      reason: reason || null,
      destination: destination || null,
      person_to_see: person_to_see || null,
      company: company || null,
      visit_type: visit_type || null,
      id_verified: !!id_verified,
      badge_code: badge_code || null,
      entry_signature: entry_signature || null,
      access_observations: access_observations || null,
      // ⚠️ Temporairement, on ne lie pas le visiteur à un profil Supabase
      // pour éviter la violation de contrainte tant que les profils ne sont
      // pas synchronisés dans la table public.profiles.
      registered_by: null,
    };

    const { data, error } = await supabase
      .from('visitors')
      .insert(payload)
      .select('id')
      .single();

    if (error) {
      console.error('Erreur Supabase lors de l\'enregistrement du visiteur:', error.message);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const { data: agentData, error: agentError } = await supabase
      .from('profiles')
      .select('first_name,last_name')
      .eq('id', req.user.id)
      .single();

    const agentName = agentError
      ? 'Un agent'
      : `${agentData?.first_name || ''} ${agentData?.last_name || ''}`.trim() || 'Un agent';

    const ids = await getUserIdsByRoles(['superviseur_agent_securite', 'superviseur_qhse', 'superadmin']);
    for (const uid of ids) {
      await createNotification(uid, `Nouveau visiteur enregistré: ${full_name} par ${agentName}.`, 'dashboardSecurite');
    }

    res.json({ id: data.id, message: 'Visiteur enregistré' });
  } catch (error) {
    console.error('Erreur lors de l\'enregistrement du visiteur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/visitors/:id/signout', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré côté backend.' });
    }

    const { error } = await supabase
      .from('visitors')
      .update({ exit_time: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) {
      console.error('Erreur Supabase lors de l\'enregistrement de la sortie:', error.message);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

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

// Routes pour les équipements biomédicaux (Supabase)
app.get('/api/biomedical-equipment', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les équipements biomédicaux.' });
    }

    const { data, error } = await supabase
      .from('biomedical_equipment')
      .select('*');

    if (error) {
      console.error('Erreur Supabase lors de la récupération des équipements:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Erreur lors de la récupération des équipements:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/biomedical-equipment', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les équipements biomédicaux.' });
    }

    const { name, serial_number, location, model, department, notes } = req.body;
    const id = uuidv4();
    const nextMaintenance = new Date();
    nextMaintenance.setMonth(nextMaintenance.getMonth() + 6);

    const payload = {
        id,
        name,
      model: model || 'N/A',
        serial_number,
      department: department || 'N/A',
        location,
      status: 'opérationnel',
      last_maintenance: new Date().toISOString(),
      next_maintenance: nextMaintenance.toISOString(),
      notes: notes || null
    };

    const { error } = await supabase
      .from('biomedical_equipment')
      .insert([payload]);

    if (error) {
      console.error('Erreur Supabase lors de l\'ajout de l\'équipement:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    res.json({ id, message: 'Équipement ajouté' });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de l\'équipement:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/biomedical-equipment/:id/status', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les équipements biomédicaux.' });
    }

    const { status } = req.body;
    const { data: equipmentRows, error: fetchError } = await supabase
      .from('biomedical_equipment')
      .select('id, name')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Erreur Supabase lors de la récupération de l\'équipement:', fetchError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!equipmentRows) {
      return res.status(404).json({ error: 'Équipement non trouvé' });
    }

    const { error: updateError } = await supabase
      .from('biomedical_equipment')
      .update({ status })
      .eq('id', req.params.id);

    if (updateError) {
      console.error('Erreur Supabase lors de la mise à jour du statut de l\'équipement:', updateError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (status === 'hors_service') {
      const ids = await getSupervisorIds();
      for (const uid of ids) {
        await createNotification(uid, `Équipement biomédical HS: ${equipmentRows.name}.`, 'biomedical');
      }
    }

    res.json({ message: 'Statut mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les tâches de maintenance (Supabase)
app.get('/api/maintenance-tasks', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les tâches de maintenance.' });
    }

    const { data, error } = await supabase
      .from('maintenance_tasks')
      .select('*')
      .order('scheduled_date', { ascending: true });

    if (error) {
      console.error('Erreur Supabase lors de la récupération des tâches:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    res.json(data || []);
  } catch (error) {
    console.error('Erreur lors de la récupération des tâches:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/maintenance-tasks', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les tâches de maintenance.' });
    }

    const { equipment_id, type, description, technician_id, scheduled_date, supplier_name, supplier_phone, comments } = req.body;
    const id = uuidv4();

    const payload = {
        id,
        equipment_id,
        type,
        description,
      technician_id: technician_id || null,
        scheduled_date,
      supplier_name: supplier_name || null,
      supplier_phone: supplier_phone || null,
      comments: comments || null,
      status: 'planifiée'
    };

    const { error } = await supabase
      .from('maintenance_tasks')
      .insert([payload]);

    if (error) {
      console.error('Erreur Supabase lors de la planification de la tâche:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (technician_id) {
      await createNotification(technician_id, 'Nouvelle tâche de maintenance pour vous.', 'biomedical');
    }

    res.json({ id, message: 'Tâche planifiée' });
  } catch (error) {
    console.error('Erreur lors de la planification de la tâche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/maintenance-tasks/:id/status', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les tâches de maintenance.' });
    }

    const { status } = req.body;
    const validStatuses = ['planifiée', 'en_cours', 'terminée', 'annulée'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    const { data: tasks, error: fetchError } = await supabase
      .from('maintenance_tasks')
      .select('id, type, description, technician_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (fetchError) {
      console.error('Erreur Supabase lors de la récupération de la tâche:', fetchError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!tasks) {
      return res.status(404).json({ error: 'Tâche non trouvée' });
    }

    const { error: updateError } = await supabase
      .from('maintenance_tasks')
      .update({ status })
      .eq('id', req.params.id);

    if (updateError) {
      console.error('Erreur Supabase lors de la mise à jour du statut de la tâche:', updateError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const task = tasks;
    const statusLabels = { planifiée: 'Planifiée', en_cours: 'En cours', terminée: 'Terminée', annulée: 'Annulée' };
    const label = statusLabels[status] || status;
    const taskTitle = task?.type || task?.description || 'Tâche';
    if (task?.technician_id) {
      await createNotification(task.technician_id, `La tâche "${taskTitle}" est maintenant: ${label}`, 'biomedical');
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
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les AES.' });
    }

    const { data, error } = await supabase
      .from('aes')
      .select('*')
      .order('date_aes', { ascending: false })
      .order('heure_aes', { ascending: false });

    if (error) {
      console.error('Erreur Supabase lors de la récupération des AES:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const rows = data || [];

    const creatorIds = Array.from(new Set(rows.map(a => a.created_by).filter(Boolean)));
    let profilesById = {};
    if (creatorIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', creatorIds);

      if (!profilesError && profiles) {
        profilesById = profiles.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    res.json(rows.map(a => {
      const creator = a.created_by ? profilesById[a.created_by] : null;
      const created_by_name = creator
        ? `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || null
        : null;
      return { ...a, created_by_name };
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des AES:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/aes/:id', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les AES.' });
    }

    const { data, error } = await supabase
      .from('aes')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Erreur Supabase lors de la récupération de l\'AES:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!data) {
      return res.status(404).json({ error: 'AES non trouvé' });
    }

    let created_by_name = null;
    if (data.created_by) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', data.created_by)
        .maybeSingle();

      if (!profileError && profile) {
        created_by_name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null;
      }
    }

    res.json({ ...data, created_by_name });
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'AES:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/aes', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les AES.' });
    }

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
    
    const toNull = (val) => (val === undefined || val === '') ? null : val;
    const toBool = (val) => val === true ? true : (val === false ? false : null);
    
    const payload = {
      id, 
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
      examen_vih: examen_vih || false,
      examen_vhb: examen_vhb || false,
      examen_vhc: examen_vhc || false,
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
      dossier_cloture: dossier_cloture || false,
      date_cloture: toNull(date_cloture),
      nom_signature_qhse: toNull(nom_signature_qhse),
      created_by: req.user.id
    };

    const { error } = await supabase
      .from('aes')
      .insert([payload]);

    if (error) {
      console.error('Erreur Supabase lors de la création de l\'AES:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    console.log('POST /api/aes - AES créé avec succès, ID:', id);
    const ids = await getSupervisorIds();
    const creatorName = agent_prenom && agent_nom ? `${agent_prenom} ${agent_nom}` : 'Un agent';
    for (const uid of ids) {
      await createNotification(uid, `Nouvel AES déclaré: ${creatorName} (${date_aes}).`, 'qhseAES');
    }
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
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les AES.' });
    }

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

    const toNull = (val) => (val === undefined || val === '') ? null : val;
    const toBool = (val) => val === true ? true : (val === false ? false : null);

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

    const updates = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    const { error: updateError } = await supabase
      .from('aes')
      .update(updates)
      .eq('id', req.params.id);

    if (updateError) {
      console.error('Erreur Supabase lors de la mise à jour de l\'AES:', updateError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

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
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les AES.' });
    }

    const { error } = await supabase
      .from('aes')
      .delete()
      .eq('id', req.params.id);

    if (error) {
      console.error('Erreur Supabase lors de la suppression de l\'AES:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
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
    // Branche Supabase principale
    if (supabase) {
      const { data: requests, error } = await supabase
        .from('camera_access_requests')
        .select('*')
        .order('request_date', { ascending: false });

      if (error) {
        console.error('Erreur Supabase lors de la récupération des demandes d\'accès caméras:', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const rows = requests || [];
      const requesterIds = Array.from(new Set(rows.map(r => r.requester_id).filter(Boolean)));

      let profilesById = {};
      if (requesterIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, service')
          .in('id', requesterIds);

        if (!profilesError && profiles) {
          profilesById = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      const normalized = rows.map(reqRow => {
        const profile = reqRow.requester_id ? profilesById[reqRow.requester_id] : null;
        const computedName = profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null
          : null;
        const computedService = profile ? profile.service || null : null;

        const requester_name =
          reqRow.requester_name && reqRow.requester_name.trim()
            ? reqRow.requester_name
            : computedName;
        const requester_service =
          reqRow.requester_service && reqRow.requester_service.trim()
            ? reqRow.requester_service
            : computedService;

        const safeDate = (value) => (value ? new Date(value).toISOString() : null);

        return {
          ...reqRow,
          requester_name,
          requester_service,
          request_date: safeDate(reqRow.request_date),
          access_start_date: safeDate(reqRow.access_start_date),
          access_end_date: safeDate(reqRow.access_end_date),
          hierarchical_authorization_date: safeDate(reqRow.hierarchical_authorization_date),
          qhse_validation_date: safeDate(reqRow.qhse_validation_date),
          created_at: safeDate(reqRow.created_at),
          updated_at: safeDate(reqRow.updated_at),
        };
      });

      return res.json(normalized);
    }

    // Fallback MySQL: ancienne logique conservée uniquement en secours
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

    const ids = await getSupervisorIds();
    for (const uid of ids) {
      await createNotification(uid, `Nouvelle demande d'accès caméra par ${finalRequesterName}.`, 'cameraAccessRequestsTraceability');
    }

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

    const [beforeUpdate] = await pool.execute('SELECT requester_id FROM camera_access_requests WHERE id = ?', [req.params.id]);
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

    if (status && beforeUpdate[0]?.requester_id) {
      const statusLabels = { approuve: 'Approuvée', refuse: 'Refusée', annule: 'Annulée' };
      const label = statusLabels[status] || status;
      await createNotification(beforeUpdate[0].requester_id, `Votre demande d'accès caméra: ${label}.`, 'cameraAccessRequestsTraceability');
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
    if (supabase) {
      const { data, error } = await supabase
        .from('camera_access_requests')
        .delete()
        .eq('id', req.params.id)
        .select('id');

      if (error) {
        console.error('Erreur lors de la suppression de la demande (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Demande non trouvée' });
      }

      return res.json({ message: 'Demande supprimée avec succès' });
    }

    // Fallback MySQL
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
    if (supabase) {
      const { data, error } = await supabase
        .from('rooms')
        .select('*');

      if (error) {
        console.error('Erreur lors de la récupération des salles (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json(data);
    }

    // Fallback MySQL
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
    if (supabase) {
      const { data, error } = await supabase
        .from('doctors')
        .select('*');

      if (error) {
        console.error('Erreur lors de la récupération des médecins (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json(data);
    }

    // Fallback MySQL
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
    if (supabase) {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) {
        console.error('Erreur lors de la récupération des réservations (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json(data);
    }

    // Fallback MySQL
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

    if (supabase) {
      const { error: insertError } = await supabase
        .from('bookings')
        .insert({
          id,
          room_id,
          title,
          booked_by: req.user.id,
          start_time,
          end_time,
          doctor_id: doctor_id || null,
          status: 'réservé'
        });

      if (insertError) {
        console.error('Erreur lors de la création de la réservation (Supabase):', insertError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const bookerName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'La secrétaire';
      const supervisorIds = await getSupervisorIds();
      for (const sid of supervisorIds) {
        await createNotification(sid, `Nouvelle réservation de salle par ${bookerName}.`, 'planningSalles');
      }

      return res.json({ id, message: 'Réservation créée' });
    }

    // Fallback MySQL
    await pool.execute(
      `INSERT INTO bookings (id, room_id, title, booked_by, start_time, end_time, doctor_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'réservé')`,
      [id, room_id, title, req.user.id, start_time, end_time, doctor_id || null]
    );

    const [booker] = await pool.execute('SELECT first_name, last_name FROM profiles WHERE id = ?', [req.user.id]);
    const bookerName = booker[0] ? `${booker[0].first_name || ''} ${booker[0].last_name || ''}`.trim() || 'La secrétaire' : 'La secrétaire';
    const supervisorIds = await getSupervisorIds();
    for (const sid of supervisorIds) {
      await createNotification(sid, `Nouvelle réservation de salle par ${bookerName}.`, 'planningSalles');
    }

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
    let booking;

    if (supabase) {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', req.params.id)
        .limit(1);

      if (error) {
        console.error('Erreur lors de la récupération de la réservation (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Réservation non trouvée' });
      }

      booking = data[0];
    } else {
      const [bookings] = await pool.execute('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
      if (bookings.length === 0) {
        return res.status(404).json({ error: 'Réservation non trouvée' });
      }
      booking = bookings[0];
    }

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
        if (supabase) {
          const { error } = await supabase
            .from('bookings')
            .update({ status })
            .eq('id', req.params.id);

          if (error) {
            console.error('Erreur lors de la mise à jour de la réservation (Supabase):', error.message);
            return res.status(500).json({ error: 'Erreur serveur' });
          }
        } else {
          await pool.execute(
            `UPDATE bookings SET status = ? WHERE id = ?`,
            [status, req.params.id]
          );
        }
        return res.json({ message: 'Réservation mise à jour' });
      }
    }

    // Pour toutes les autres modifications, seule la secrétaire peut modifier
    if (req.user.role !== 'secretaire') {
      return res.status(403).json({ error: 'Seule la secrétaire peut modifier des réservations' });
    }

    if (supabase) {
      const { error } = await supabase
        .from('bookings')
        .update({
          room_id,
          title,
          start_time,
          end_time,
          doctor_id: doctor_id || null,
          status
        })
        .eq('id', req.params.id);

      if (error) {
        console.error('Erreur lors de la mise à jour de la réservation (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    } else {
      await pool.execute(
        `UPDATE bookings SET room_id = ?, title = ?, start_time = ?, end_time = ?, doctor_id = ?, status = ? WHERE id = ?`,
        [room_id, title, start_time, end_time, doctor_id || null, status, req.params.id]
      );
    }
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

    if (supabase) {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', req.params.id);

      if (error) {
        console.error('Erreur lors de la suppression de la réservation (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ message: 'Réservation supprimée' });
    }

    // Fallback MySQL
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
    if (supabase) {
      const { data, error } = await supabase
        .from('planned_tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des tâches planifiées (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json(data || []);
    }

    // Fallback MySQL
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

    if (supabase) {
      const { error: insertError } = await supabase
        .from('planned_tasks')
        .insert({
          id,
          title,
          description,
          assigned_to,
          assignee_name: assignee_name || null,
          created_by: req.user.id,
          due_date,
          status: 'à faire'
        });

      if (insertError) {
        console.error('Erreur lors de la création de la tâche planifiée (Supabase):', insertError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (assigned_to) {
        await createNotification(assigned_to, `Nouvelle tâche planifiée: ${title}`, 'dashboardTechnicien');
      }

      return res.json({ id, message: 'Tâche créée' });
    }

    // Fallback MySQL
    await pool.execute(
      `INSERT INTO planned_tasks (id, title, description, assigned_to, assignee_name, created_by, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'à faire')`,
      [id, title, description, assigned_to, assignee_name || null, req.user.id, due_date]
    );

    if (assigned_to) {
      await createNotification(assigned_to, `Nouvelle tâche planifiée: ${title}`, 'dashboardTechnicien');
    }

    res.json({ id, message: 'Tâche créée' });
  } catch (error) {
    console.error('Erreur lors de la création de la tâche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/planned-tasks/:id', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    let task = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('planned_tasks')
        .select('title, created_by')
        .eq('id', req.params.id)
        .limit(1);

      if (error) {
        console.error('Erreur lors de la récupération de la tâche planifiée (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Tâche non trouvée' });
      }

      task = data[0];

      const { error: updateError } = await supabase
        .from('planned_tasks')
        .update({ status })
        .eq('id', req.params.id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour de la tâche planifiée (Supabase):', updateError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    } else {
      const [tasks] = await pool.execute('SELECT title, created_by FROM planned_tasks WHERE id = ?', [req.params.id]);
      if (tasks.length === 0) {
        return res.status(404).json({ error: 'Tâche non trouvée' });
      }
      task = tasks[0];
      await pool.execute('UPDATE planned_tasks SET status = ? WHERE id = ?', [status, req.params.id]);
    }

    const statusLabels = { 'à faire': 'À faire', 'en_cours': 'En cours', 'terminée': 'Terminée', 'annulée': 'Annulée' };
    const label = statusLabels[status] || status;
    if (task?.created_by && label) {
      await createNotification(task.created_by, `La tâche "${task.title}" est maintenant: ${label}`, 'dashboardTechnicien');
    }
    res.json({ message: 'Tâche mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la tâche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/planned-tasks/:id', authenticateToken, async (req, res) => {
  try {
    let task = null;

    if (supabase) {
      const { data, error } = await supabase
        .from('planned_tasks')
        .select('title, assigned_to')
        .eq('id', req.params.id)
        .limit(1);

      if (error) {
        console.error('Erreur lors de la récupération de la tâche à supprimer (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Tâche non trouvée' });
      }

      task = data[0];

      const { error: deleteError } = await supabase
        .from('planned_tasks')
        .delete()
        .eq('id', req.params.id);

      if (deleteError) {
        console.error('Erreur lors de la suppression de la tâche planifiée (Supabase):', deleteError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    } else {
      const [tasks] = await pool.execute('SELECT title, assigned_to FROM planned_tasks WHERE id = ?', [req.params.id]);
      if (tasks.length === 0) {
        return res.status(404).json({ error: 'Tâche non trouvée' });
      }
      task = tasks[0];
      await pool.execute('DELETE FROM planned_tasks WHERE id = ?', [req.params.id]);
    }

    if (task?.assigned_to) {
      await createNotification(task.assigned_to, `La tâche "${task.title}" a été supprimée.`, 'dashboardTechnicien');
    }
    res.json({ message: 'Tâche supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la tâche:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les déchets médicaux
app.get('/api/medical-waste', authenticateToken, async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('medical_waste')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des déchets médicaux (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const result = (data || []).map(w => ({
        ...w,
        photo_urls: w.photo_urls || []
      }));

      return res.json(result);
    }

    // Fallback MySQL
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

    if (supabase) {
      const { error: insertError } = await supabase
        .from('medical_waste')
        .insert({
          id,
          waste_type,
          category: category || null,
          quantity,
          unit,
          collection_date,
          collection_location,
          producer_service: producer_service || null,
          waste_code: waste_code || null,
          tracking_number: trackingNumber,
          status: 'collecté',
          registered_by: req.user.id,
          notes: notes || null,
          photo_urls: photo_urls || []
        });

      if (insertError) {
        console.error('Erreur lors de la création du déchet médical (Supabase):', insertError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const ids = await getSupervisorIds();
      const creatorName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Un agent';
      for (const uid of ids) {
        await createNotification(uid, `Nouveau déchet médical enregistré par ${creatorName} (${waste_type}).`, 'qhseWaste');
      }

      return res.json({ id, message: 'Déchet médical enregistré' });
    }

    // Fallback MySQL
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

    const ids = await getSupervisorIds();
    const [creator] = await pool.execute('SELECT first_name, last_name FROM profiles WHERE id = ?', [req.user.id]);
    const creatorName = creator[0] ? `${creator[0].first_name || ''} ${creator[0].last_name || ''}`.trim() || 'Un agent' : 'Un agent';
    for (const uid of ids) {
      await createNotification(uid, `Nouveau déchet médical enregistré par ${creatorName} (${waste_type}).`, 'qhseWaste');
    }

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

    if (supabase) {
      const updatePayload = {};
      const fieldNames = [
        'status',
        'treatment_method',
        'treatment_company',
        'treatment_date',
        'certificate_number',
        'handled_by',
        'notes'
      ];

      fieldNames.forEach((field) => {
        if (typeof req.body[field] !== 'undefined') {
          updatePayload[field] = req.body[field];
        }
      });

      updatePayload.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('medical_waste')
        .update(updatePayload)
        .eq('id', id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour du déchet médical (Supabase):', updateError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    } else {
      values.push(id);

      await pool.execute(
        `UPDATE medical_waste SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        values
      );
    }

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

    if (supabase) {
      const { error } = await supabase
        .from('medical_waste')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression du déchet médical (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ message: 'Déchet médical supprimé' });
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
    if (supabase) {
      const { data, error } = await supabase
        .from('trainings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des formations (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json(data || []);
    }

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

    if (supabase) {
      const { error: insertError } = await supabase
        .from('trainings')
        .insert({
          id,
          title,
          category,
          description: description || null,
          trainer: trainer || null,
          training_type,
          duration_hours: duration_hours || null,
          location: location || null,
          planned_date: planned_date || null,
          status: 'planifiée',
          max_participants: max_participants || null,
          certificate_required: certificate_required || false,
          validity_months: validity_months || null,
          prestataire: prestataire || null,
          prestataire_note: prestataire_note || null,
          prestataire_evaluation: prestataire_evaluation || null,
          created_by: req.user.id
        });

      if (insertError) {
        console.error('Erreur lors de la création de la formation (Supabase):', insertError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const ids = await getSupervisorIds();
      const creatorName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Un agent';
      for (const uid of ids) {
        await createNotification(uid, `Nouvelle formation planifiée: ${title} par ${creatorName}.`, 'qhseTrainings');
      }

      return res.json({ id, message: 'Formation créée' });
    }

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

    const ids = await getSupervisorIds();
    const [creator] = await pool.execute('SELECT first_name, last_name FROM profiles WHERE id = ?', [req.user.id]);
    const creatorName = creator[0] ? `${creator[0].first_name || ''} ${creator[0].last_name || ''}`.trim() || 'Un agent' : 'Un agent';
    for (const uid of ids) {
      await createNotification(uid, `Nouvelle formation planifiée: ${title} par ${creatorName}.`, 'qhseTrainings');
    }

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

    if (supabase) {
      const updates = {};

      if (title !== undefined) updates.title = title;
      if (category !== undefined) updates.category = category;
      if (description !== undefined) updates.description = description;
      if (trainer !== undefined) updates.trainer = trainer;
      if (training_type !== undefined) updates.training_type = training_type;
      if (duration_hours !== undefined) updates.duration_hours = duration_hours;
      if (location !== undefined) updates.location = location;
      if (planned_date !== undefined) updates.planned_date = planned_date;
      if (actual_date !== undefined) updates.actual_date = actual_date;
      if (status !== undefined) updates.status = status;
      if (max_participants !== undefined) updates.max_participants = max_participants;
      if (certificate_required !== undefined) updates.certificate_required = certificate_required;
      if (validity_months !== undefined) updates.validity_months = validity_months;
      if (prestataire !== undefined) updates.prestataire = prestataire || null;
      if (prestataire_note !== undefined) updates.prestataire_note = prestataire_note || null;
      if (prestataire_evaluation !== undefined) updates.prestataire_evaluation = prestataire_evaluation || null;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Aucune mise à jour fournie' });
      }

      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('trainings')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour de la formation (Supabase):', updateError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    } else {
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
    }

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

    if (supabase) {
      const { error } = await supabase
        .from('trainings')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression de la formation (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ message: 'Formation supprimée' });
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
    if (supabase) {
      const { data: participations, error } = await supabase
        .from('training_participations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des participations (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const tpList = participations || [];

      const trainingIds = Array.from(new Set(tpList.map(tp => tp.training_id).filter(Boolean)));
      const participantIds = Array.from(new Set(tpList.map(tp => tp.participant_id).filter(Boolean)));

      let trainingsById = {};
      if (trainingIds.length > 0) {
        const { data: trainings, error: trainingsError } = await supabase
          .from('trainings')
          .select('id, title, category')
          .in('id', trainingIds);

        if (!trainingsError && trainings) {
          trainingsById = trainings.reduce((acc, t) => {
            acc[t.id] = t;
            return acc;
          }, {});
        }
      }

      let profilesById = {};
      if (participantIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role')
          .in('id', participantIds);

        if (!profilesError && profiles) {
          profilesById = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      const result = tpList.map(item => {
        const training = item.training_id ? trainingsById[item.training_id] : null;
        const participant = item.participant_id ? profilesById[item.participant_id] : null;
        const participantName = participant
          ? `${participant.first_name || ''} ${participant.last_name || ''}`.trim()
          : item.participant_name || null;

        return {
          ...item,
          training_title: training ? training.title : null,
          training_category: training ? training.category : null,
          participant_first_name: participant ? participant.first_name : null,
          participant_last_name: participant ? participant.last_name : null,
          participant_role: participant ? participant.role : null,
          participant_display_name: participantName,
          attendance_date: item.attendance_date,
          certificate_issued_date: item.certificate_issued_date,
          certificate_expiry_date: item.certificate_expiry_date,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };
      });

      return res.json(result);
    }

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

    if (supabase) {
      const { error: insertError } = await supabase
        .from('training_participations')
        .insert({
          id,
          training_id,
          participant_id: participant_id || null,
          participant_name: participant_name || null,
          registration_status: registration_status || 'inscrit',
          attendance_date: attendance_date || null,
          score: score || null,
          passed: passed ?? false,
          certificate_number: certificate_number || null,
          certificate_issued_date: certificate_issued_date || null,
          certificate_expiry_date: certificate_expiry_date || null,
          comments: comments || null,
          registered_by: req.user.id
        });

      if (insertError) {
        console.error('Erreur lors de la création de la participation (Supabase):', insertError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ id, message: 'Participation ajoutée' });
    }

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

    if (supabase) {
      const updates = {};

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          if (field === 'passed') {
            updates.passed = !!req.body[field];
          } else {
            updates[field] = req.body[field];
          }
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Aucune mise à jour fournie' });
      }

      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('training_participations')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour de la participation (Supabase):', updateError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    } else {
      const updates = [];
      const values = [];

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
    }

    res.json({ message: 'Participation mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la participation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/training-participations/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (supabase) {
      const { error } = await supabase
        .from('training_participations')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression de la participation (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ message: 'Participation supprimée' });
    }

    await pool.execute('DELETE FROM training_participations WHERE id = ?', [id]);
    res.json({ message: 'Participation supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la participation:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.get('/api/competencies', authenticateToken, async (_req, res) => {
  try {
    if (supabase) {
      const { data: competencies, error } = await supabase
        .from('competencies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des compétences (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const list = competencies || [];
      const employeeIds = Array.from(new Set(list.map(c => c.employee_id).filter(Boolean)));

      let profilesById = {};
      if (employeeIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role')
          .in('id', employeeIds);

        if (!profilesError && profiles) {
          profilesById = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      const result = list.map(item => {
        const emp = item.employee_id ? profilesById[item.employee_id] : null;
        return {
          ...item,
          employee_first_name: emp ? emp.first_name : null,
          employee_last_name: emp ? emp.last_name : null,
          employee_role: emp ? emp.role : null,
          issued_date: item.issued_date,
          expiry_date: item.expiry_date,
          verification_date: item.verification_date,
          created_at: item.created_at,
          updated_at: item.updated_at,
        };
      });

      return res.json(result);
    }

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

    if (supabase) {
      const { error: insertError } = await supabase
        .from('competencies')
        .insert({
          id,
          employee_id,
          skill_name,
          skill_category: skill_category || null,
          level: level || 'débutant',
          certification_number: certification_number || null,
          issued_date: issued_date || null,
          expiry_date: expiry_date || null,
          issuing_authority: issuing_authority || null,
          verified: !!verified,
          verified_by: verified ? req.user.id : null,
          verification_date: verified ? new Date().toISOString() : null,
          notes: notes || null
        });

      if (insertError) {
        console.error('Erreur lors de la création de la compétence (Supabase):', insertError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ id, message: 'Compétence enregistrée' });
    }

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

    if (supabase) {
      const updates = {};

      allowedFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          if (field === 'verified') {
            updates.verified = !!req.body[field];
            updates.verified_by = req.body[field] ? req.user.id : null;
            updates.verification_date = req.body[field] ? new Date().toISOString() : null;
          } else {
            updates[field] = req.body[field];
          }
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Aucune mise à jour fournie' });
      }

      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('competencies')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour de la compétence (Supabase):', updateError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    } else {
      const updates = [];
      const values = [];

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
    }

    res.json({ message: 'Compétence mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la compétence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/competencies/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (supabase) {
      const { error } = await supabase
        .from('competencies')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression de la compétence (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ message: 'Compétence supprimée' });
    }

    await pool.execute('DELETE FROM competencies WHERE id = ?', [id]);
    res.json({ message: 'Compétence supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la compétence:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les audits (Supabase)
app.get('/api/audits', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les audits.' });
    }

    const { data, error } = await supabase
      .from('audits')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur Supabase lors de la récupération des audits:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const audits = data || [];

    res.json(audits.map(audit => ({
      ...audit,
      findings: safeJsonParse(audit.findings, null),
      actual_date: audit.actual_date || null,
      planned_date: audit.planned_date || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des audits:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/audits', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les audits.' });
    }

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

    const payload = {
        id,
        title,
        audit_type,
        scope,
        planned_date,
      auditor_id: auditor_id || null,
      audited_department: audited_department || null,
      status: 'planifié',
      non_conformities_count: 0,
      conformities_count: 0,
      opportunities_count: 0,
      recurrence_type: recurrence_type || 'aucune',
      recurrence_interval: recurrence_interval || null,
      reminder_days_before: reminder_days_before || 7,
      auto_generate_report: !!auto_generate_report,
      created_by: req.user.id
    };

    const { error: insertError } = await supabase
      .from('audits')
      .insert([payload]);

    if (insertError) {
      console.error('Erreur Supabase lors de la création de l\'audit:', insertError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    let creatorName = 'Un agent';
    try {
      const { data: creator, error: creatorError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', req.user.id)
        .maybeSingle();

      if (!creatorError && creator) {
        creatorName = `${creator.first_name || ''} ${creator.last_name || ''}`.trim() || 'Un agent';
      }
    } catch (e) {
      console.warn('Impossible de récupérer le créateur de l\'audit depuis Supabase:', e);
    }

    const ids = await getSupervisorIds();
    for (const uid of ids) {
      await createNotification(uid, `Nouvel audit planifié: ${title} par ${creatorName}.`, 'qhseAudits');
    }
    if (auditor_id && auditor_id !== req.user.id) {
      await createNotification(auditor_id, `Nouvel audit assigné: ${title}.`, 'qhseAudits');
    }

    res.json({ id, message: 'Audit créé' });
  } catch (error) {
    console.error('Erreur lors de la création de l\'audit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/audits/:id', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les audits.' });
    }

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

    const updates = {};

    if (title !== undefined) updates.title = title;
    if (audit_type !== undefined) updates.audit_type = audit_type;
    if (scope !== undefined) updates.scope = scope;
    if (planned_date !== undefined) updates.planned_date = planned_date;
    if (actual_date !== undefined) updates.actual_date = actual_date;
    if (auditor_id !== undefined) updates.auditor_id = auditor_id;
    if (audited_department !== undefined) updates.audited_department = audited_department;
    if (status !== undefined) updates.status = status;
    if (findings !== undefined) updates.findings = typeof findings === 'string' ? findings : JSON.stringify(findings);
    if (non_conformities_count !== undefined) updates.non_conformities_count = non_conformities_count;
    if (conformities_count !== undefined) updates.conformities_count = conformities_count;
    if (opportunities_count !== undefined) updates.opportunities_count = opportunities_count;
    if (report_path !== undefined) updates.report_path = report_path;
    if (recurrence_type !== undefined) updates.recurrence_type = recurrence_type;
    if (recurrence_interval !== undefined) updates.recurrence_interval = recurrence_interval;
    if (next_audit_date !== undefined) updates.next_audit_date = next_audit_date;
    if (reminder_days_before !== undefined) updates.reminder_days_before = reminder_days_before;
    if (auto_generate_report !== undefined) updates.auto_generate_report = auto_generate_report;
    if (report_generation_date !== undefined) updates.report_generation_date = report_generation_date;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }

    const { error: updateError } = await supabase
      .from('audits')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error('Erreur Supabase lors de la mise à jour de l\'audit:', updateError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    res.json({ message: 'Audit mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'audit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/audits/:id', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les audits.' });
    }

    const { id } = req.params;
    
    const { error } = await supabase
      .from('audits')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur Supabase lors de la suppression de l\'audit:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    
    res.json({ message: 'Audit supprimé' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'audit:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les checklists d'audit (Supabase)
app.get('/api/audits/:auditId/checklists', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les checklists d\'audit.' });
    }

    const { auditId } = req.params;
    const { data, error } = await supabase
      .from('audit_checklists')
      .select('*')
      .eq('audit_id', auditId)
      .order('id', { ascending: true });

    if (error) {
      console.error('Erreur Supabase lors de la récupération des checklists:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const checklists = data || [];

    res.json(checklists.map((item) => ({
      ...item,
      photo_urls: safeJsonParse(item.photo_urls, []),
      checked_at: item.checked_at || null,
      created_at: item.created_at || null,
      updated_at: item.updated_at || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des checklists:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/audits/:auditId/checklists', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les checklists d\'audit.' });
    }

    const { auditId } = req.params;
    const { question, requirement, compliance_status, observation, photo_urls } = req.body;
    
    const id = uuidv4();
    
    const payload = {
      id,
      audit_id: auditId,
        question,
      requirement: requirement || null,
      compliance_status: compliance_status || 'non_évalué',
      observation: observation || null,
      photo_urls: photo_urls || []
    };

    const { data, error } = await supabase
      .from('audit_checklists')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Erreur Supabase lors de la création de la checklist:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    res.json(data);
  } catch (error) {
    console.error('Erreur lors de la création de la checklist:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/audits/checklists/:id', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les checklists d\'audit.' });
    }

    const { id } = req.params;
    const { question, requirement, compliance_status, observation, photo_urls, checked_by } = req.body;
    
    const updates = {};

    if (question !== undefined) updates.question = question;
    if (requirement !== undefined) updates.requirement = requirement;
    if (compliance_status !== undefined) updates.compliance_status = compliance_status;
    if (observation !== undefined) updates.observation = observation;
    if (photo_urls !== undefined) updates.photo_urls = photo_urls;
    if (checked_by !== undefined) { 
      updates.checked_by = checked_by;
      if (checked_by) {
        updates.checked_at = new Date().toISOString();
      } else {
        updates.checked_at = null;
      }
    }
    updates.updated_at = new Date().toISOString();
    
    if (Object.keys(updates).length === 1 && updates.updated_at) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }
    
    const { error: updateError } = await supabase
      .from('audit_checklists')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error('Erreur Supabase lors de la mise à jour de la checklist:', updateError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    
    res.json({ message: 'Checklist mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la checklist:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/audits/checklists/:id', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les checklists d\'audit.' });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('audit_checklists')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur Supabase lors de la suppression de la checklist:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    res.json({ message: 'Checklist supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la checklist:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les plans d'action d'audit (Supabase)
app.get('/api/audits/:auditId/action-plans', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les plans d\'action d\'audit.' });
    }

    const { auditId } = req.params;

    const { data: plans, error } = await supabase
      .from('audit_action_plans')
      .select('*')
      .eq('audit_id', auditId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Erreur Supabase lors de la récupération des plans d\'action:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const rows = plans || [];

    const assignedIds = Array.from(new Set(rows.map(p => p.assigned_to).filter(Boolean)));
    const verifiedIds = Array.from(new Set(rows.map(p => p.verified_by).filter(Boolean)));
    const allProfileIds = Array.from(new Set([...assignedIds, ...verifiedIds]));

    let profilesById = {};
    if (allProfileIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', allProfileIds);

      if (!profilesError && profiles) {
        profilesById = profiles.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    res.json(rows.map(plan => {
      const assignedProfile = plan.assigned_to ? profilesById[plan.assigned_to] : null;
      const verifiedProfile = plan.verified_by ? profilesById[plan.verified_by] : null;

      return {
      ...plan,
        assigned_to_name: assignedProfile
          ? `${assignedProfile.first_name || ''} ${assignedProfile.last_name || ''}`.trim() || null
        : null,
        verified_by_name: verifiedProfile
          ? `${verifiedProfile.first_name || ''} ${verifiedProfile.last_name || ''}`.trim() || null
        : null,
      due_date: plan.due_date || null,
      completion_date: plan.completion_date || null,
      verification_date: plan.verification_date || null,
      created_at: plan.created_at || null,
      updated_at: plan.updated_at || null,
      };
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des plans d\'action:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/audits/:auditId/action-plans', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les plans d\'action d\'audit.' });
    }

    const { auditId } = req.params;
    const { title, description, action_type, priority, assigned_to, due_date, finding_id, status } = req.body;
    
    const id = uuidv4();
    
    const payload = {
      id,
      audit_id: auditId,
      finding_id: finding_id || null,
        title,
        description,
        action_type,
      priority: priority || 'moyenne',
      assigned_to: assigned_to || null,
      due_date: due_date || null,
      status: status || 'planifié',
      created_by: req.user.id
    };

    const { data, error } = await supabase
      .from('audit_action_plans')
      .insert([payload])
      .select('*')
      .single();

    if (error) {
      console.error('Erreur Supabase lors de la création du plan d\'action:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    let assigned_to_name = null;
    if (data.assigned_to) {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', data.assigned_to)
          .maybeSingle();

        if (!profileError && profile) {
          assigned_to_name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null;
        }
      } catch (e) {
        console.warn('Impossible de récupérer le profil assigné pour le plan d\'action:', e);
      }
    }

    res.json({
      ...data,
      assigned_to_name,
      due_date: data.due_date || null,
      created_at: data.created_at || null,
      updated_at: data.updated_at || null,
    });
  } catch (error) {
    console.error('Erreur lors de la création du plan d\'action:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/audits/action-plans/:id', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les plans d\'action d\'audit.' });
    }

    const { id } = req.params;
    const { title, description, action_type, priority, assigned_to, due_date, status, completion_date, verification_date, verified_by, notes } = req.body;
    
    const updates = {};

    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (action_type !== undefined) updates.action_type = action_type;
    if (priority !== undefined) updates.priority = priority;
    if (assigned_to !== undefined) updates.assigned_to = assigned_to;
    if (due_date !== undefined) updates.due_date = due_date;
    if (status !== undefined) { 
      updates.status = status;
      if (status === 'terminé' && !completion_date) {
        updates.completion_date = new Date().toISOString().slice(0, 10);
      }
      if (status === 'verifié' && !verification_date) {
        updates.verification_date = new Date().toISOString().slice(0, 10);
        updates.verified_by = req.user.id;
      }
    }
    if (completion_date !== undefined) updates.completion_date = completion_date;
    if (verification_date !== undefined) updates.verification_date = verification_date;
    if (verified_by !== undefined) updates.verified_by = verified_by;
    if (notes !== undefined) updates.notes = notes;

    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length === 1 && updates.updated_at) {
      return res.status(400).json({ error: 'Aucune mise à jour fournie' });
    }
    
    const { error: updateError } = await supabase
      .from('audit_action_plans')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error('Erreur Supabase lors de la mise à jour du plan d\'action:', updateError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    
    res.json({ message: 'Plan d\'action mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du plan d\'action:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/audits/action-plans/:id', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les plans d\'action d\'audit.' });
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('audit_action_plans')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Erreur Supabase lors de la suppression du plan d\'action:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

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
    if (supabase) {
      const { data: works, error } = await supabase
        .from('works')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des travaux (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const list = works || [];
      const assignedIds = Array.from(new Set(list.map(w => w.assigned_to).filter(Boolean)));

      let profilesById = {};
      if (assignedIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', assignedIds);

        if (!profilesError && profiles) {
          profilesById = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      const result = list.map(work => {
        const assignedProfile = work.assigned_to ? profilesById[work.assigned_to] : null;
        const assignedName = assignedProfile
          ? `${assignedProfile.first_name || ''} ${assignedProfile.last_name || ''}`.trim() || null
          : work.assigned_to_name || null;

        return {
          ...work,
          assigned_to_name: assignedName,
          photo_urls: work.photo_urls || [],
          planned_start_date: work.planned_start_date || null,
          planned_end_date: work.planned_end_date || null,
          actual_start_date: work.actual_start_date || null,
          actual_end_date: work.actual_end_date || null,
          created_at: work.created_at || null,
          updated_at: work.updated_at || null,
        };
      });

      return res.json(result);
    }

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

    if (supabase) {
      if (assigned_to) {
        const { data: users, error: userError } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', assigned_to)
          .limit(1);

        if (!userError && users && users.length > 0 && (users[0].first_name || users[0].last_name)) {
          assigned_to_name = `${users[0].first_name || ''} ${users[0].last_name || ''}`.trim() || null;
        }
      }

      const { error: insertError } = await supabase
        .from('works')
        .insert({
          id,
          title,
          description,
          work_type: work_type || 'maintenance',
          location: location || null,
          priority: priority || 'moyenne',
          status: status || 'planifié',
          assigned_to: assigned_to || null,
          assigned_to_name,
          planned_start_date: planned_start_date || null,
          planned_end_date: planned_end_date || null,
          estimated_cost: estimated_cost || null,
          supplier_name: supplier_name || null,
          supplier_contact: supplier_contact || null,
          notes: notes || null,
          created_by: req.user.id
        });

      if (insertError) {
        console.error('Erreur lors de la création du travail (Supabase):', insertError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const ids = await getSupervisorIds();
      const creatorName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Un agent';
      for (const uid of ids) {
        await createNotification(uid, `Nouveau travail planifié: ${title} par ${creatorName}.`, 'qhseWorks');
      }
      if (assigned_to) {
        await createNotification(assigned_to, `Nouveau travail assigné: ${title}.`, 'qhseWorks');
      }

      const { data: newWork, error: fetchError } = await supabase
        .from('works')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !newWork) {
        console.warn('Travail créé mais impossible de le relire depuis Supabase:', fetchError);
        return res.json({ id, message: 'Travail créé' });
      }

      return res.json({
        ...newWork,
        assigned_to_name: newWork.assigned_to_name || assigned_to_name,
        photo_urls: newWork.photo_urls || [],
      });
    }
    
    // Fallback MySQL
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

    const ids = await getSupervisorIds();
    const [creator] = await pool.execute('SELECT first_name, last_name FROM profiles WHERE id = ?', [req.user.id]);
    const creatorName = creator[0] ? `${creator[0].first_name || ''} ${creator[0].last_name || ''}`.trim() || 'Un agent' : 'Un agent';
    for (const uid of ids) {
      await createNotification(uid, `Nouveau travail planifié: ${title} par ${creatorName}.`, 'qhseWorks');
    }
    if (assigned_to) {
      await createNotification(assigned_to, `Nouveau travail assigné: ${title}.`, 'qhseWorks');
    }
    
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
    
    if (supabase) {
      const updates = {};

      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (work_type !== undefined) updates.work_type = work_type;
      if (location !== undefined) updates.location = location;
      if (priority !== undefined) updates.priority = priority;
      if (status !== undefined) {
        updates.status = status;
        if (status === 'en_cours' && !actual_start_date) {
          updates.actual_start_date = new Date().toISOString().slice(0, 10);
        }
        if (status === 'terminé' && !actual_end_date) {
          updates.actual_end_date = new Date().toISOString().slice(0, 10);
        }
      }
      if (assigned_to !== undefined) {
        updates.assigned_to = assigned_to || null;
        let assignedName = null;
        if (assigned_to) {
          const { data: users, error: userError } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', assigned_to)
            .limit(1);
          if (!userError && users && users.length > 0 && (users[0].first_name || users[0].last_name)) {
            assignedName = `${users[0].first_name || ''} ${users[0].last_name || ''}`.trim() || null;
          }
        }
        updates.assigned_to_name = assignedName;
      }
      if (planned_start_date !== undefined) updates.planned_start_date = planned_start_date || null;
      if (planned_end_date !== undefined) updates.planned_end_date = planned_end_date || null;
      if (actual_start_date !== undefined) updates.actual_start_date = actual_start_date || null;
      if (actual_end_date !== undefined) updates.actual_end_date = actual_end_date || null;
      if (estimated_cost !== undefined) updates.estimated_cost = estimated_cost || null;
      if (actual_cost !== undefined) updates.actual_cost = actual_cost || null;
      if (supplier_name !== undefined) updates.supplier_name = supplier_name || null;
      if (supplier_contact !== undefined) updates.supplier_contact = supplier_contact || null;
      if (notes !== undefined) updates.notes = notes || null;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Aucune mise à jour fournie' });
      }

      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('works')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour du travail (Supabase):', updateError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    } else {
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
    }
    
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
    if (supabase) {
      const { error } = await supabase
        .from('works')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression du travail (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ message: 'Travail supprimé' });
    }

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
    if (supabase) {
      const { data, error } = await supabase
        .from('network_equipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération du matériel réseau (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const equipment = data || [];
      return res.json(equipment.map(eq => ({
        ...eq,
        installation_date: eq.installation_date || null,
        warranty_expiry: eq.warranty_expiry || null,
        created_at: eq.created_at || null,
        updated_at: eq.updated_at || null,
      })));
    }

    // Fallback MySQL
    try {
      await ensureNetworkTables();
    } catch (migrationError) {
      console.error('Erreur lors de la migration des tables réseau:', migrationError);
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
    if (supabase) {
      const { error: insertError } = await supabase
        .from('network_equipment')
        .insert({
          id,
          name,
          type,
          brand: brand || null,
          model: model || null,
          serial_number: serial_number || null,
          ip_address: ip_address || null,
          mac_address: mac_address || null,
          location: location || null,
          status,
          installation_date: installation_date || null,
          warranty_expiry: warranty_expiry || null,
          notes: notes || null,
          created_by: req.user.id
        });

      if (insertError) {
        console.error('Erreur lors de la création du matériel réseau (Supabase):', insertError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const { data: newEquipment, error: fetchError } = await supabase
        .from('network_equipment')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !newEquipment) {
        console.warn('Matériel réseau créé mais impossible de le relire depuis Supabase:', fetchError);
        return res.json({ id, message: 'Équipement créé' });
      }

      return res.json(newEquipment);
    }

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
    const fields = ['name', 'type', 'brand', 'model', 'serial_number', 'ip_address', 'mac_address', 'location', 'status', 'installation_date', 'warranty_expiry', 'notes'];

    if (supabase) {
      const updates = {};
      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field] || null;
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Aucune mise à jour' });
      }

      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('network_equipment')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour du matériel réseau (Supabase):', updateError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const { data: updated, error: fetchError } = await supabase
        .from('network_equipment')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !updated) {
        return res.json({ message: 'Équipement mis à jour' });
      }

      return res.json(updated);
    }

    const updates = [];
    const values = [];
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
    if (supabase) {
      const { error } = await supabase
        .from('network_equipment')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression du matériel réseau (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ message: 'Équipement supprimé' });
    }

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
    if (supabase) {
      const { data, error } = await supabase
        .from('network_subscriptions')
        .select('*')
        .order('renewal_date', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des abonnements réseau (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const subs = data || [];
      return res.json(subs.map(sub => ({
        ...sub,
        start_date: sub.start_date || null,
        renewal_date: sub.renewal_date || null,
        created_at: sub.created_at || null,
        updated_at: sub.updated_at || null,
      })));
    }

    // Fallback MySQL
    try {
      await ensureNetworkTables();
    } catch (migrationError) {
      console.error('Erreur lors de la migration des tables réseau:', migrationError);
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
    if (supabase) {
      const { error: insertError } = await supabase
        .from('network_subscriptions')
        .insert({
          id,
          service_name,
          provider,
          subscription_type,
          monthly_cost: monthly_cost || 0,
          start_date: start_date || null,
          renewal_date: renewal_date || null,
          contract_number: contract_number || null,
          contact_person: contact_person || null,
          contact_phone: contact_phone || null,
          contact_email: contact_email || null,
          status,
          notes: notes || null,
          created_by: req.user.id
        });

      if (insertError) {
        console.error('Erreur lors de la création de l\'abonnement réseau (Supabase):', insertError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const { data: newSubscription, error: fetchError } = await supabase
        .from('network_subscriptions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !newSubscription) {
        return res.json({ id, message: 'Abonnement créé' });
      }

      return res.json(newSubscription);
    }

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
    const fields = ['service_name', 'provider', 'subscription_type', 'monthly_cost', 'start_date', 'renewal_date', 'contract_number', 'contact_person', 'contact_phone', 'contact_email', 'status', 'notes'];
    if (supabase) {
      const updates = {};
      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field] || null;
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Aucune mise à jour' });
      }

      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('network_subscriptions')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour de l\'abonnement réseau (Supabase):', updateError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const { data: updated, error: fetchError } = await supabase
        .from('network_subscriptions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !updated) {
        return res.json({ message: 'Abonnement mis à jour' });
      }

      return res.json(updated);
    }

    const updates = [];
    const values = [];
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
    if (supabase) {
      const { error } = await supabase
        .from('network_subscriptions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression de l\'abonnement réseau (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ message: 'Abonnement supprimé' });
    }

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
    if (supabase) {
      const { data, error } = await supabase
        .from('network_inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération de l\'inventaire réseau (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const inventory = data || [];
      return res.json(inventory.map(item => ({
        ...item,
        purchase_date: item.purchase_date || null,
        created_at: item.created_at || null,
        updated_at: item.updated_at || null,
      })));
    }

    // Fallback MySQL
    try {
      await ensureNetworkTables();
    } catch (migrationError) {
      console.error('Erreur lors de la migration des tables réseau:', migrationError);
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
    if (supabase) {
      const { error: insertError } = await supabase
        .from('network_inventory')
        .insert({
          id,
          item_name,
          category,
          brand: brand || null,
          model: model || null,
          quantity: quantity || 1,
          unit,
          location: location || null,
          supplier: supplier || null,
          purchase_date: purchase_date || null,
          purchase_cost: purchase_cost || null,
          notes: notes || null,
          created_by: req.user.id
        });

      if (insertError) {
        console.error('Erreur lors de la création de l\'article réseau (Supabase):', insertError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const { data: newItem, error: fetchError } = await supabase
        .from('network_inventory')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !newItem) {
        return res.json({ id, message: 'Article créé' });
      }

      return res.json(newItem);
    }

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
    const fields = ['item_name', 'category', 'brand', 'model', 'quantity', 'unit', 'location', 'supplier', 'purchase_date', 'purchase_cost', 'notes'];
    if (supabase) {
      const updates = {};
      fields.forEach(field => {
        if (req.body[field] !== undefined) {
          updates[field] = req.body[field] || null;
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Aucune mise à jour' });
      }

      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('network_inventory')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour de l\'article réseau (Supabase):', updateError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const { data: updated, error: fetchError } = await supabase
        .from('network_inventory')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (fetchError || !updated) {
        return res.json({ message: 'Article mis à jour' });
      }

      return res.json(updated);
    }

    const updates = [];
    const values = [];
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
    if (supabase) {
      const { error } = await supabase
        .from('network_inventory')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression de l\'article réseau (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ message: 'Article supprimé' });
    }

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

// Récupérer les rondes quotidiennes (Supabase)
app.get('/api/daily-rounds', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les rondes quotidiennes.' });
    }

    const { technician_id, round_type } = req.query;

    let query = supabase
      .from('daily_rounds')
      .select('*')
      .order('round_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (technician_id && typeof technician_id === 'string' && technician_id.trim() !== '') {
      query = query.eq('technician_id', technician_id);
    }

    if (round_type && typeof round_type === 'string' && round_type.trim() !== '') {
      query = query.eq('round_type', round_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur Supabase lors de la récupération des rondes:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const rounds = data || [];

    const technicianIds = Array.from(new Set(rounds.map(r => r.technician_id).filter(Boolean)));
    let profilesById = {};
    if (technicianIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', technicianIds);

      if (!profilesError && profiles) {
        profilesById = profiles.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
      }
    }

    res.json(rounds.map(round => {
      const profile = round.technician_id ? profilesById[round.technician_id] : null;
      const computedTechName = profile
        ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null
        : null;

      return {
      ...round,
        technician_name: round.technician_name || computedTechName,
      round_date: round.round_date || null,
      start_time: round.start_time || null,
      end_time: round.end_time || null,
      photo_urls: safeJsonParse(round.photo_urls, []),
      created_at: round.created_at || null,
      updated_at: round.updated_at || null,
      };
    }));
  } catch (error) {
    console.error('Erreur lors de la récupération des rondes:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Créer une ronde quotidienne
app.post('/api/daily-rounds', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les rondes quotidiennes.' });
    }

    const { technician_id, technician_name, round_type, round_date, status, start_time, notes, photo_urls } = req.body;
    
    if (!technician_id || !round_type || !round_date) {
      return res.status(400).json({ error: 'Les champs technician_id, round_type et round_date sont requis' });
    }
    
    const id = uuidv4();
    
    let formattedStartTime = null;
    if (start_time) {
        try {
          const date = new Date(start_time);
        formattedStartTime = date.toISOString();
        } catch (e) {
          console.error('Erreur de formatage de start_time:', e);
          formattedStartTime = null;
      }
    }

    const payload = {
        id,
        technician_id,
      technician_name: technician_name || null,
        round_type,
        round_date,
      status: status || 'en_cours',
      start_time: formattedStartTime,
      notes: notes || null,
      photo_urls: photo_urls || []
    };

    const { error: insertError } = await supabase
      .from('daily_rounds')
      .insert([payload]);

    if (insertError) {
      console.error('Erreur Supabase lors de la création de la ronde:', insertError);
      if (insertError.code === '23505') {
        return res.status(400).json({ error: 'Une ronde existe déjà pour cette date et ce technicien' });
      }
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const ids = await getSupervisorIds();
    const techName = technician_name || 'Un technicien';
    for (const uid of ids) {
      await createNotification(uid, `Nouvelle ronde quotidienne: ${round_type} par ${techName} (${round_date}).`, 'dailyRoundsView');
    }

    const { data: newRound, error: fetchError } = await supabase
      .from('daily_rounds')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !newRound) {
      console.warn('Ronde créée mais impossible de la relire depuis Supabase:', fetchError);
      return res.json({ id, message: 'Ronde créée' });
    }

    let finalTechName = newRound.technician_name || null;
    if (!finalTechName && newRound.technician_id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', newRound.technician_id)
        .maybeSingle();

      if (!profileError && profile) {
        finalTechName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null;
      }
    }

    res.json({
      ...newRound,
      technician_name: finalTechName,
      photo_urls: safeJsonParse(newRound.photo_urls, []),
    });
  } catch (error) {
    console.error('Erreur lors de la création de la ronde:', error);
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Mettre à jour une ronde quotidienne (Supabase)
app.put('/api/daily-rounds/:id', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les rondes quotidiennes.' });
    }

    const { id } = req.params;
    const { status, end_time, notes, photo_urls, technician_name } = req.body;
    
    const updates = {};

    if (status !== undefined) updates.status = status;
    if (end_time !== undefined) updates.end_time = end_time;
    if (notes !== undefined) updates.notes = notes;
    if (technician_name !== undefined) updates.technician_name = technician_name;
    if (photo_urls !== undefined) updates.photo_urls = photo_urls;
    updates.updated_at = new Date().toISOString();

    if (Object.keys(updates).length === 1 && updates.updated_at) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }
    
    const { error: updateError } = await supabase
      .from('daily_rounds')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error('Erreur Supabase lors de la mise à jour de la ronde:', updateError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const { data: updatedRound, error: fetchError } = await supabase
      .from('daily_rounds')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !updatedRound) {
      console.warn('Ronde mise à jour mais impossible de la relire depuis Supabase:', fetchError);
      return res.json({ message: 'Ronde mise à jour' });
    }

    let finalTechName = updatedRound.technician_name || null;
    if (!finalTechName && updatedRound.technician_id) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', updatedRound.technician_id)
        .maybeSingle();

      if (!profileError && profile) {
        finalTechName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || null;
      }
    }

    res.json({
      ...updatedRound,
      technician_name: finalTechName,
      photo_urls: safeJsonParse(updatedRound.photo_urls, []),
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de la ronde:', error);
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Supprimer une ronde quotidienne (Supabase)
app.delete('/api/daily-rounds/:id', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les rondes quotidiennes.' });
    }

    const { id } = req.params;
    
    const { data: existingRound, error: fetchError } = await supabase
      .from('daily_rounds')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (fetchError) {
      console.error('Erreur Supabase lors de la vérification de la ronde:', fetchError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    if (!existingRound) {
      return res.status(404).json({ error: 'Ronde non trouvée' });
    }
    
    const { error: deleteError } = await supabase
      .from('daily_rounds')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erreur Supabase lors de la suppression de la ronde:', deleteError);
      return res.status(500).json({ error: 'Erreur serveur' });
    }
    
    res.json({ message: 'Ronde supprimée avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la ronde:', error);
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Récupérer les templates de checklist (Supabase)
app.get('/api/round-checklist-templates', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les templates de rondes.' });
    }

    const { round_type } = req.query;
    let query = supabase
      .from('round_checklist_templates')
      .select('*')
      .order('item_order', { ascending: true });

    if (round_type && typeof round_type === 'string' && round_type.trim() !== '') {
      query = query.eq('round_type', round_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Erreur Supabase lors de la récupération des templates:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const templates = data || [];

    res.json(templates.map(template => ({
      ...template,
      options: safeJsonParse(template.options, null),
      created_at: template.created_at || null,
      updated_at: template.updated_at || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des templates:', error);
    res.status(500).json({ error: 'Erreur serveur: ' + (error.message || 'Erreur inconnue') });
  }
});

// Récupérer les réponses aux checklists (Supabase)
app.get('/api/round-checklist-responses', authenticateToken, async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase non configuré pour les réponses de rondes.' });
    }

    const { round_id } = req.query;
    
    if (!round_id) {
      return res.status(400).json({ error: 'round_id est requis' });
    }

    const { data, error } = await supabase
      .from('round_checklist_responses')
      .select('*, template:round_checklist_templates(*)')
      .eq('round_id', round_id)
      .order('template(item_order)', { ascending: true });

    if (error) {
      console.error('Erreur Supabase lors de la récupération des réponses:', error);
      return res.status(500).json({ error: 'Erreur serveur' });
    }

    const responses = data || [];

    res.json(responses.map(response => ({
      ...response,
      photo_urls: safeJsonParse(response.photo_urls, []),
      template: response.template ? {
        id: response.template.id,
        title: response.template.title,
        description: response.template.description,
        item_type: response.template.item_type,
        is_required: response.template.is_required === 1 || response.template.is_required === true,
        item_order: response.template.item_order,
        round_type: response.template.round_type,
        options: safeJsonParse(response.template.options, null),
      } : null,
      created_at: response.created_at || null,
      updated_at: response.updated_at || null,
    })));
  } catch (error) {
    console.error('Erreur lors de la récupération des réponses:', error);
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
    if (supabase) {
      const { data, error } = await supabase
        .from('risks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des risques (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json(data || []);
    }

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

    if (supabase) {
      const { error: insertError } = await supabase
        .from('risks')
        .insert({
          id,
          title,
          description,
          risk_category,
          poste: poste || null,
          risk_source: risk_source || null,
          probability,
          severity,
          risk_level,
          current_controls: current_controls || null,
          treatment_plan: treatment_plan || null,
          action_plan: action_plan || null,
          responsible_person: responsible_person || null,
          due_date: due_date || null,
          status: status || 'identifié',
          created_by: req.user.id
        });

      if (insertError) {
        console.error('Erreur lors de la création du risque (Supabase):', insertError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const ids = await getSupervisorIds();
      const creatorName = `${req.user.first_name || ''} ${req.user.last_name || ''}`.trim() || 'Un agent';
      for (const uid of ids) {
        await createNotification(uid, `Nouveau risque identifié: ${title} par ${creatorName}.`, 'qhseRisks');
      }
      if (responsible_person) {
        await createNotification(responsible_person, `Nouveau risque à traiter: ${title}.`, 'qhseRisks');
      }

      return res.json({ id, message: 'Risque créé' });
    }

    await pool.execute(
      `INSERT INTO risks (
        id, title, description, risk_category, poste, risk_source, probability, severity,
        risk_level, current_controls, treatment_plan, action_plan, responsible_person,
        due_date, status, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, title, description, risk_category, poste || null, risk_source || null, probability, severity,
        risk_level, current_controls || null, treatment_plan || null, action_plan || null,
        responsible_person || null, due_date || null, status || 'identifié',         req.user.id
      ]
    );

    const ids = await getSupervisorIds();
    const [creator] = await pool.execute('SELECT first_name, last_name FROM profiles WHERE id = ?', [req.user.id]);
    const creatorName = creator[0] ? `${creator[0].first_name || ''} ${creator[0].last_name || ''}`.trim() || 'Un agent' : 'Un agent';
    for (const uid of ids) {
      await createNotification(uid, `Nouveau risque identifié: ${title} par ${creatorName}.`, 'qhseRisks');
    }
    if (responsible_person) {
      await createNotification(responsible_person, `Nouveau risque à traiter: ${title}.`, 'qhseRisks');
    }

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

    const allowedFields = [
      'title', 'description', 'risk_category', 'poste', 'risk_source', 'probability', 'severity',
      'risk_level', 'current_controls', 'residual_probability', 'residual_severity',
      'residual_risk_level', 'treatment_plan', 'action_plan', 'responsible_person',
      'due_date', 'status', 'review_date', 'last_review_date', 'reviewed_by'
    ];

    if (supabase) {
      const updates = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Aucune mise à jour fournie' });
      }

      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('risks')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour du risque (Supabase):', updateError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    } else {
      const updates = [];
      const values = [];

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
    }

    res.json({ message: 'Risque mis à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du risque:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/risks/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    if (supabase) {
      const { error } = await supabase
        .from('risks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression du risque (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ message: 'Risque supprimé' });
    }

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
    if (supabase) {
      const { data: actions, error } = await supabase
        .from('risk_actions')
        .select('*')
        .eq('risk_id', riskId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des actions de risque (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      const list = actions || [];
      const assignedIds = Array.from(new Set(list.map(a => a.assigned_to).filter(Boolean)));

      let profilesById = {};
      if (assignedIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', assignedIds);

        if (!profilesError && profiles) {
          profilesById = profiles.reduce((acc, p) => {
            acc[p.id] = p;
            return acc;
          }, {});
        }
      }

      const result = list.map(a => {
        const assignedProfile = a.assigned_to ? profilesById[a.assigned_to] : null;
        const assignedName = assignedProfile
          ? `${assignedProfile.first_name || ''} ${assignedProfile.last_name || ''}`.trim() || null
          : null;

        return {
          ...a,
          assigned_to_first_name: assignedProfile ? assignedProfile.first_name : null,
          assigned_to_last_name: assignedProfile ? assignedProfile.last_name : null,
          assigned_to_name: assignedName,
        };
      });

      return res.json(result);
    }

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

    if (supabase) {
      const { error: insertError } = await supabase
        .from('risk_actions')
        .insert({
          id,
          risk_id: riskId,
          action_title,
          action_description: action_description || null,
          action_type: action_type || 'mitigation',
          action_status: action_status || 'planifiée',
          responsible_person: responsible_person || null,
          assigned_to: assigned_to || null,
          due_date: due_date || null,
          effectiveness_level: effectiveness_level || null,
          notes: notes || null,
          created_by: req.user.id
        });

      if (insertError) {
        console.error('Erreur lors de la création de l\'action de risque (Supabase):', insertError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ id, message: 'Action ajoutée' });
    }

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

    const allowedFields = [
      'action_title', 'action_description', 'action_type', 'action_status',
      'responsible_person', 'assigned_to', 'due_date', 'completion_date',
      'effectiveness_level', 'notes'
    ];

    if (supabase) {
      const updates = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updates[field] = updateData[field];
        }
      });

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'Aucune mise à jour fournie' });
      }

      updates.updated_at = new Date().toISOString();

      const { error: updateError } = await supabase
        .from('risk_actions')
        .update(updates)
        .eq('id', id);

      if (updateError) {
        console.error('Erreur lors de la mise à jour de l\'action de risque (Supabase):', updateError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    } else {
      const updates = [];
      const values = [];

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
    }

    res.json({ message: 'Action mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'action:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/risks/actions/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (supabase) {
      const { error } = await supabase
        .from('risk_actions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erreur lors de la suppression de l\'action de risque (Supabase):', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ message: 'Action supprimée' });
    }

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

    const ids = await getSupervisorIds();
    const [creator] = await pool.execute('SELECT first_name, last_name FROM profiles WHERE id = ?', [req.user.id]);
    const creatorName = creator[0] ? `${creator[0].first_name || ''} ${creator[0].last_name || ''}`.trim() || 'Un agent' : 'Un agent';
    const buanderieIds = await getUserIdsByRoles(['buanderie', 'superviseur_agent_entretien']);
    for (const uid of [...ids, ...buanderieIds]) {
      await createNotification(uid, `Nouveau suivi de linge par ${creatorName}.`, 'qhseLaundry');
    }

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

// Routes pour les anomalies QHSE
app.get('/api/qhse-anomalies', authenticateToken, async (req, res) => {
  try {
    const allowedRoles = ['assistante_qhse', 'superviseur_qhse', 'superadmin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const [rows] = await pool.execute(
      'SELECT * FROM qhse_anomalies ORDER BY date_anomalie DESC, created_at DESC'
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des anomalies QHSE:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.post('/api/qhse-anomalies', authenticateToken, async (req, res) => {
  try {
    const allowedRoles = ['assistante_qhse', 'superviseur_qhse', 'superadmin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const {
      date_anomalie,
      lieu,
      source,
      description,
      thematique,
      sous_thematique,
      responsable_action,
      message_prise_en_compte,
      actions_a_mettre_en_oeuvre,
      devis_a_faire,
      montant_devis,
      commentaires,
      impact_patient,
      impact_structure,
      niveau_priorite,
      date_limite,
      etat_avancement,
      date_resolution,
      date_verification,
      commentaire_verification
    } = req.body;

    if (!date_anomalie || !lieu || !description) {
      return res.status(400).json({ error: 'Date, lieu et description sont obligatoires' });
    }

    const id = uuidv4();
    await pool.execute(
      `INSERT INTO qhse_anomalies (
        id, date_anomalie, lieu, source, description, thematique, sous_thematique,
        responsable_action, message_prise_en_compte, actions_a_mettre_en_oeuvre,
        devis_a_faire, montant_devis, commentaires, impact_patient, impact_structure,
        niveau_priorite, date_limite, etat_avancement, date_resolution, date_verification,
        commentaire_verification, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        date_anomalie,
        lieu,
        source || null,
        description,
        thematique || null,
        sous_thematique || null,
        responsable_action || null,
        message_prise_en_compte || null,
        actions_a_mettre_en_oeuvre || null,
        devis_a_faire === true,
        montant_devis || null,
        commentaires || null,
        impact_patient || null,
        impact_structure || null,
        niveau_priorite || 'moyenne',
        date_limite || null,
        etat_avancement || null,
        date_resolution || null,
        date_verification || null,
        commentaire_verification || null,
        req.user.id
      ]
    );

    res.json({ id, message: 'Anomalie QHSE créée' });
  } catch (error) {
    console.error('Erreur lors de la création de l\'anomalie QHSE:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.put('/api/qhse-anomalies/:id', authenticateToken, async (req, res) => {
  try {
    const allowedRoles = ['assistante_qhse', 'superviseur_qhse', 'superadmin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { id } = req.params;
    const updateData = req.body || {};

    const allowedFields = [
      'date_anomalie', 'lieu', 'source', 'description', 'thematique', 'sous_thematique',
      'responsable_action', 'message_prise_en_compte', 'actions_a_mettre_en_oeuvre',
      'devis_a_faire', 'montant_devis', 'commentaires', 'impact_patient', 'impact_structure',
      'niveau_priorite', 'date_limite', 'etat_avancement', 'date_resolution', 'date_verification',
      'commentaire_verification'
    ];

    const updates = [];
    const values = [];

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
      `UPDATE qhse_anomalies SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.json({ message: 'Anomalie QHSE mise à jour' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'anomalie QHSE:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

app.delete('/api/qhse-anomalies/:id', authenticateToken, async (req, res) => {
  try {
    const allowedRoles = ['assistante_qhse', 'superviseur_qhse', 'superadmin'];
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const { id } = req.params;
    await pool.execute('DELETE FROM qhse_anomalies WHERE id = ?', [id]);
    res.json({ message: 'Anomalie QHSE supprimée' });
  } catch (error) {
    console.error('Erreur lors de la suppression de l\'anomalie QHSE:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Routes pour les notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', req.user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur Supabase lors de la récupération des notifications:', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json(data || []);
    }

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

    if (supabase) {
      const { error: insertError } = await supabase
        .from('notifications')
        .insert({
          id,
          recipient_id,
          message,
          link: link || null,
          read: false,
          created_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Erreur Supabase lors de la création de la notification:', insertError.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      return res.json({ id, message: 'Notification créée' });
    }

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
    if (supabase) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('recipient_id', req.user.id)
        .eq('read', false);

      if (error) {
        console.error('Erreur Supabase lors de la mise à jour des notifications:', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }
    } else {
      await pool.execute(
        'UPDATE notifications SET `read` = TRUE WHERE recipient_id = ? AND `read` = FALSE',
        [req.user.id]
      );
    }
    res.json({ message: 'Notifications marquées comme lues' });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des notifications:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Supprimer toutes les notifications de l'utilisateur connecté
app.delete('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const recipientId = req.user?.id;
    if (!recipientId) {
      return res.status(401).json({ error: 'Utilisateur non authentifié' });
    }
    let deleted = 0;

    if (supabase) {
      const { data, error } = await supabase
        .from('notifications')
        .delete()
        .eq('recipient_id', recipientId)
        .select('id');

      if (error) {
        console.error('Erreur Supabase lors de la suppression des notifications:', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      deleted = data ? data.length : 0;
    } else {
      const [result] = await pool.execute('DELETE FROM notifications WHERE recipient_id = ?', [recipientId]);
      deleted = result?.affectedRows ?? 0;
    }
    res.json({ message: 'Notifications supprimées', deleted });
  } catch (error) {
    console.error('Erreur lors de la suppression des notifications:', error);
    res.status(500).json({ error: error?.message || 'Erreur serveur' });
  }
});

// Marquer une notification individuelle comme lue
app.put('/api/notifications/:id/mark-read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    if (supabase) {
      const { data, error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id)
        .eq('recipient_id', req.user.id)
        .select('id');

      if (error) {
        console.error('Erreur Supabase lors de la mise à jour de la notification:', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Notification non trouvée' });
      }

      return res.json({ message: 'Notification marquée comme lue' });
    }

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
    // Branche Supabase principale
    if (supabase) {
      const { data: admins, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'superadmin')
        .limit(1);

      if (error) {
        console.error('Erreur Supabase lors de la vérification du superadmin:', error.message);
        return res.status(500).json({ error: 'Erreur serveur' });
      }

      if (!admins || admins.length === 0) {
        const id = uuidv4();
        const passwordHash = await bcrypt.hash('admin123', 10);

        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id,
            username: 'superadmin',
            email: 'admin@hospital.com',
            password_hash: passwordHash,
            first_name: 'Super',
            last_name: 'Admin',
            civility: 'M.',
            role: 'superadmin',
            service: 'Administration'
          });

        if (insertError) {
          console.error('Erreur Supabase lors de la création du superadmin:', insertError.message);
          return res.status(500).json({ error: 'Erreur serveur' });
        }

        return res.json({ success: true, message: 'Superadmin créé' });
      }

      return res.json({ success: true, message: 'Superadmin existe déjà' });
    }

    // Fallback MySQL si Supabase non disponible
    const [admins] = await pool.execute(
      "SELECT * FROM profiles WHERE role = 'superadmin'"
    );

    if (admins.length === 0) {
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


