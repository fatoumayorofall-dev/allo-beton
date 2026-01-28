module.exports = {
  // GET /api/notifications
  list: async (req, res) => {
    res.json([
      { id: 1, title: "Bienvenue sur Allo Béton", read: false, createdAt: new Date() },
    ]);
  },

  // GET /api/notifications/:id
  getOne: async (req, res) => {
    const id = Number(req.params.id);
    res.json({ id, title: "Notification " + id, read: false, createdAt: new Date() });
  },

  // POST /api/notifications
  create: async (req, res) => {
    const { title = "Nouvelle notification" } = req.body || {};
    // Ici tu pourrais insérer en base. Pour l'instant on renvoie un mock
    res.status(201).json({ id: Date.now(), title, read: false, createdAt: new Date() });
  },

  // PATCH /api/notifications/:id/read
  markRead: async (req, res) => {
    const id = Number(req.params.id);
    // Ici tu mettrais à jour la base. Pour l'instant on confirme juste.
    res.json({ id, read: true });
  },
};
