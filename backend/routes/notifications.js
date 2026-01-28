const express = require("express");
const router = express.Router();

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

module.exports = router;
