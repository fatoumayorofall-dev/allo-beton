export const sendAutomaticNotifications = {
  async onOrderConfirmed(_userId: string, _saleNumber: string, _customerName: string) {
    // Pas encore implémenté : on évite juste que ça casse l'app
    return { success: true };
  },
};
