const express = require("express");
const router = express.Router();
const pool = require("../config/database");
const smsService = require("../services/smsService");

// On essaie d'importer le contrôleur principal des notifications
const controller = require("../controllers/notificationsController");

// Petite fonction pour vérifier qu'on appelle bien une fonction
const isFunction = (f) => typeof f === "function";

// Route pour récupérer toutes les notifications
router.get(
  "/",
  isFunction(controller?.list)
    ? controller.list
    : (_req, res) => res.status(501).json({ error: "Not implemented" })
);

// Route pour récupérer une notification par ID
router.get(
  "/:id",
  isFunction(controller?.getOne)
    ? controller.getOne
    : (_req, res) => res.status(501).json({ error: "Not implemented" })
);

// Route pour créer une notification
router.post(
  "/",
  isFunction(controller?.create)
    ? controller.create
    : (_req, res) => res.status(501).json({ error: "Not implemented" })
);

// Route pour marquer une notification comme lue
router.patch(
  "/:id/read",
  isFunction(controller?.markRead)
    ? controller.markRead
    : (_req, res) => res.status(501).json({ error: "Not implemented" })
);

// ============================================
// ROUTES SMS
// ============================================

// Route pour envoyer un SMS de test
router.post("/sms/test", async (req, res) => {
  try {
    const { phoneNumber, message } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        error: "Numéro de téléphone requis" 
      });
    }

    const result = await smsService.sendSMS(
      phoneNumber, 
      message || "🔔 Test ALLO BÉTON - Votre notification SMS fonctionne !"
    );

    res.json(result);
  } catch (error) {
    console.error("Erreur envoi SMS test:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour envoyer une notification SMS par type d'événement
router.post("/sms/send", async (req, res) => {
  try {
    const { eventType, data, phoneNumber } = req.body;

    if (!phoneNumber || !eventType) {
      return res.status(400).json({ 
        success: false, 
        error: "phoneNumber et eventType sont requis" 
      });
    }

    const result = await smsService.sendNotification(eventType, data || {}, phoneNumber);
    res.json(result);
  } catch (error) {
    console.error("Erreur envoi notification SMS:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour sauvegarder les préférences de notifications
router.post("/preferences", async (req, res) => {
  try {
    const userId = req.user?.id;
    const { preferences, phoneNumber } = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non authentifié" });
    }

    // Mettre à jour le numéro de téléphone de l'utilisateur
    if (phoneNumber) {
      await pool.execute(
        "UPDATE users SET phone = ? WHERE id = ?",
        [phoneNumber, userId]
      );
    }

    // Supprimer les anciennes préférences
    await pool.execute(
      "DELETE FROM notification_preferences WHERE user_id = ?",
      [userId]
    );

    // Insérer les nouvelles préférences
    if (preferences && preferences.length > 0) {
      const values = preferences.map(pref => [
        userId,
        pref.event_type,
        pref.notification_type,
        pref.enabled ? 1 : 0
      ]);

      for (const value of values) {
        await pool.execute(
          `INSERT INTO notification_preferences (user_id, event_type, notification_type, enabled) 
           VALUES (?, ?, ?, ?)`,
          value
        );
      }
    }

    res.json({ success: true, message: "Préférences sauvegardées" });
  } catch (error) {
    console.error("Erreur sauvegarde préférences:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour récupérer les préférences de notifications
router.get("/preferences", async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: "Non authentifié" });
    }

    const [preferences] = await pool.execute(
      "SELECT * FROM notification_preferences WHERE user_id = ?",
      [userId]
    );

    const [user] = await pool.execute(
      "SELECT phone FROM users WHERE id = ?",
      [userId]
    );

    res.json({ 
      success: true, 
      data: {
        preferences,
        phoneNumber: user[0]?.phone || ''
      }
    });
  } catch (error) {
    console.error("Erreur récupération préférences:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route pour vérifier le statut de Twilio
router.get("/sms/status", (req, res) => {
  res.json({
    success: true,
    twilioConfigured: smsService.isTwilioConfigured(),
    message: smsService.isTwilioConfigured() 
      ? "Twilio est configuré et prêt" 
      : "Twilio non configuré - Mode simulation actif"
  });
});

module.exports = router;
