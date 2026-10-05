# Base de données Maefa Store (MySQL)

- `maefa-mysql.sql` : les 21 tables et leurs 22 relations (MySQL 8, InnoDB, utf8mb4).
- `maefa-diagramme-eer.png` : le diagramme EER (façon MySQL Workbench).

## Ouvrir le diagramme dans MySQL Workbench

1. Ouvrir MySQL Workbench.
2. Menu **File > Import > Reverse Engineer MySQL Create Script…**
3. Choisir `maefa-mysql.sql`, cocher **Place imported objects on a diagram**, puis **Execute**.
4. Le diagramme apparaît dans l'onglet **EER Diagram** ; l'enregistrer en `.mwb` (File > Save Model).

## Créer la base sur un serveur MySQL

```
mysql -u root -p < maefa-mysql.sql
```

## Note

Aujourd'hui, le site n'utilise pas MySQL : le serveur range ses données dans un fichier JSON
(`server/store.js`). Ce schéma en est l'équivalent relationnel ; il sert de documentation et de
point de départ si la boutique passe un jour à MySQL.

Les groupes de tables :
- **Catalogue** : categories, products, product_images, product_colors, product_sizes, occasions, product_occasions
- **Clientes** : customers, sessions, wishlist
- **Commandes** : orders, order_items, order_status_history, order_notifications
- **Livraison** : deliveries, delivery_legs (une étape par livreur, relais possibles)
- **Outils de la gérante** : stock_alerts, auth_codes, showcase, product_visits, product_voices
