// Middlewares de validation et sécurité pour le backend

// Validation des emails
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validation des mots de passe (minimum 6 caractères, au moins une lettre et un chiffre)
const isValidPassword = (password) => {
  if (!password || password.length < 6) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins 6 caractères' };
  }
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins une lettre' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Le mot de passe doit contenir au moins un chiffre' };
  }
  return { valid: true };
};

// Sanitisation des entrées
const sanitizeInput = (input) => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '');
  }
  return input;
};

// Middleware de validation pour l'inscription
const validateSignup = (req, res, next) => {
  const { email, password, username, first_name, last_name, role } = req.body;

  // Validation email
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Email invalide' });
  }

  // Validation mot de passe
  const passwordValidation = isValidPassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  // Validation username
  if (!username || username.length < 3 || username.length > 50) {
    return res.status(400).json({ error: 'Le nom d\'utilisateur doit contenir entre 3 et 50 caractères' });
  }

  // Validation nom et prénom
  if (!first_name || first_name.trim().length < 2) {
    return res.status(400).json({ error: 'Le prénom est requis (minimum 2 caractères)' });
  }

  if (!last_name || last_name.trim().length < 2) {
    return res.status(400).json({ error: 'Le nom est requis (minimum 2 caractères)' });
  }

  // Validation rôle
  const validRoles = [
    'agent_securite', 'agent_entretien', 'technicien', 'superviseur_qhse',
    'superadmin', 'secretaire', 'superviseur_agent_securite',
    'superviseur_agent_entretien', 'superviseur_technicien', 'medecin', 'Infirmier'
  ];
  if (!role || !validRoles.includes(role)) {
    return res.status(400).json({ error: 'Rôle invalide' });
  }

  // Sanitisation
  req.body.email = sanitizeInput(email).toLowerCase();
  req.body.username = sanitizeInput(username);
  req.body.first_name = sanitizeInput(first_name);
  req.body.last_name = sanitizeInput(last_name);

  next();
};

// Middleware de validation pour la connexion
const validateSignin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Email invalide' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }

  req.body.email = sanitizeInput(email).toLowerCase();
  next();
};

// Middleware de validation pour la mise à jour du mot de passe
const validatePasswordUpdate = (req, res, next) => {
  const { password } = req.body;

  const passwordValidation = isValidPassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({ error: passwordValidation.error });
  }

  next();
};

// Middleware de validation pour les incidents
const validateIncident = (req, res, next) => {
  const { type, description, priorite, service, lieu } = req.body;

  // Debug: vérifier la priorité reçue dans le middleware
  console.log('Validation - priorité reçue brute:', priorite, 'type:', typeof priorite);

  if (!type || type.trim().length === 0) {
    return res.status(400).json({ error: 'Le type d\'incident est requis' });
  }

  if (!description || description.trim().length < 10) {
    return res.status(400).json({ error: 'La description doit contenir au moins 10 caractères' });
  }

  // Normaliser la priorité AVANT de vérifier si elle est valide
  let normalizedPriorite = null;
  if (priorite && typeof priorite === 'string') {
    normalizedPriorite = priorite.trim().toLowerCase();
  } else if (priorite) {
    normalizedPriorite = String(priorite).trim().toLowerCase();
  }

  const validPriorities = ['faible', 'moyenne', 'haute', 'critique'];
  
  // Si une priorité est fournie mais n'est pas valide après normalisation
  if (normalizedPriorite && !validPriorities.includes(normalizedPriorite)) {
    console.log('ERREUR: Priorité invalide reçue:', priorite, 'normalisée:', normalizedPriorite, 'Valeurs valides:', validPriorities);
    return res.status(400).json({ error: 'Priorité invalide' });
  }

  // Sanitisation
  req.body.type = sanitizeInput(type);
  req.body.description = sanitizeInput(description);
  if (service) req.body.service = sanitizeInput(service);
  if (lieu) req.body.lieu = sanitizeInput(lieu);
  
  // Préserver la priorité normalisée dans req.body
  if (normalizedPriorite && validPriorities.includes(normalizedPriorite)) {
    req.body.priorite = normalizedPriorite; // Utiliser la version normalisée
    console.log('Validation - priorité normalisée et préservée:', req.body.priorite);
  } else {
    // Si pas de priorité valide, mettre 'moyenne' par défaut
    req.body.priorite = 'moyenne';
    console.log('Validation - priorité par défaut mise à:', req.body.priorite);
  }
  
  console.log('Validation - req.body final:', JSON.stringify({ ...req.body, description: req.body.description?.substring(0, 50) + '...' }));

  next();
};

// Middleware de validation pour les visiteurs
const validateVisitor = (req, res, next) => {
  const { full_name, id_document, reason, destination } = req.body;

  if (!full_name || full_name.trim().length < 2) {
    return res.status(400).json({ error: 'Le nom complet est requis (minimum 2 caractères)' });
  }

  if (!id_document || id_document.trim().length === 0) {
    return res.status(400).json({ error: 'Le numéro de pièce d\'identité est requis' });
  }

  // Sanitisation
  req.body.full_name = sanitizeInput(full_name);
  req.body.id_document = sanitizeInput(id_document);
  if (reason) req.body.reason = sanitizeInput(reason);
  if (destination) req.body.destination = sanitizeInput(destination);

  next();
};

// Rate limiting simple (basique, à améliorer avec express-rate-limit en production)
const loginAttempts = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

const rateLimitLogin = (req, res, next) => {
  const { email } = req.body;
  const key = email || req.ip;

  const attempts = loginAttempts.get(key) || { count: 0, resetTime: Date.now() + LOCKOUT_TIME };

  // Reset si le temps est écoulé
  if (Date.now() > attempts.resetTime) {
    attempts.count = 0;
    attempts.resetTime = Date.now() + LOCKOUT_TIME;
  }

  // Vérifier si le compte est bloqué
  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    const remainingTime = Math.ceil((attempts.resetTime - Date.now()) / 1000 / 60);
    return res.status(429).json({ 
      error: `Trop de tentatives de connexion. Réessayez dans ${remainingTime} minute(s).` 
    });
  }

  // Incrémenter le compteur
  attempts.count++;
  loginAttempts.set(key, attempts);

  // Réinitialiser le compteur en cas de succès (sera fait dans la route signin)
  req.rateLimitKey = key;

  next();
};

// Middleware de logging
const requestLogger = (req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${req.ip}`);
  next();
};

module.exports = {
  validateSignup,
  validateSignin,
  validatePasswordUpdate,
  validateIncident,
  validateVisitor,
  rateLimitLogin,
  requestLogger,
  sanitizeInput,
  loginAttempts
};


