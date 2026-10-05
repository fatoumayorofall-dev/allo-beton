-- ============================================================
--  MAEFA STORE — schéma MySQL 8 (InnoDB, utf8mb4)
--  Équivalent relationnel des données du site (aujourd'hui rangées
--  dans un fichier JSON côté serveur : server/store.js).
--
--  MySQL Workbench : File > Import > Reverse Engineer MySQL Create Script…
--  → choisir ce fichier → cocher « Place imported objects on a diagram ».
-- ============================================================

CREATE DATABASE IF NOT EXISTS maefa DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE maefa;

-- ---------- CATALOGUE ----------

CREATE TABLE categories (
  id           VARCHAR(30)  NOT NULL,            -- 'sacs', 'chaussures'
  name         VARCHAR(60)  NOT NULL,
  description  VARCHAR(160) NULL,
  image        VARCHAR(255) NULL,
  on_sale      TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE products (
  id             VARCHAR(20)   NOT NULL,          -- 'MAE-101' (numéro stable : liens courts /p/101)
  slug           VARCHAR(90)   NOT NULL,
  name           VARCHAR(160)  NOT NULL,
  category_id    VARCHAR(30)   NOT NULL,
  subcategory    VARCHAR(60)   NOT NULL,          -- 'Sacs à rabat', 'Mules à talon'…
  brand          VARCHAR(40)   NULL,              -- seulement pour une vraie marque (ex. Zara)
  material       VARCHAR(255)  NULL,
  care           VARCHAR(255)  NULL,
  style_tip      VARCHAR(255)  NULL,
  description    TEXT          NULL,
  price          INT UNSIGNED  NOT NULL,          -- FCFA
  old_price      INT UNSIGNED  NULL,
  stock          INT           NOT NULL DEFAULT 20, -- jamais affiché aux clientes ; 0 = épuisé
  preorder_days  SMALLINT      NULL,              -- vendu « sur commande » si épuisé
  video          VARCHAR(255)  NULL,
  is_new         TINYINT(1)    NOT NULL DEFAULT 0,
  is_bestseller  TINYINT(1)    NOT NULL DEFAULT 0,
  created_at     DATETIME      NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_products_slug (slug),
  KEY idx_products_category (category_id),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id)
) ENGINE=InnoDB;

CREATE TABLE product_images (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  VARCHAR(20)  NOT NULL,
  url         VARCHAR(255) NOT NULL,
  position    TINYINT      NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_images_product (product_id),
  CONSTRAINT fk_images_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_colors (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  VARCHAR(20)  NOT NULL,
  name        VARCHAR(40)  NOT NULL,
  hex         VARCHAR(80)  NOT NULL,
  PRIMARY KEY (id),
  KEY idx_colors_product (product_id),
  CONSTRAINT fk_colors_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_sizes (
  product_id  VARCHAR(20) NOT NULL,
  size        VARCHAR(10) NOT NULL,               -- '36' … '41'
  PRIMARY KEY (product_id, size),
  CONSTRAINT fk_sizes_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE occasions (
  id       VARCHAR(30) NOT NULL,                  -- 'mariage', 'soiree', 'bureau'…
  name     VARCHAR(60) NOT NULL,
  tagline  VARCHAR(120) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB;

CREATE TABLE product_occasions (
  product_id   VARCHAR(20) NOT NULL,
  occasion_id  VARCHAR(30) NOT NULL,
  PRIMARY KEY (product_id, occasion_id),
  CONSTRAINT fk_po_product  FOREIGN KEY (product_id)  REFERENCES products (id)  ON DELETE CASCADE,
  CONSTRAINT fk_po_occasion FOREIGN KEY (occasion_id) REFERENCES occasions (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- CLIENTES ----------

CREATE TABLE customers (
  phone        VARCHAR(16)  NOT NULL,             -- '+221771234567' (identifiant du compte)
  first_name   VARCHAR(40)  NULL,
  last_name    VARCHAR(40)  NULL,
  zone         VARCHAR(60)  NULL,                 -- quartier / ville de livraison
  address      VARCHAR(160) NULL,
  location_lat DECIMAL(9,6) NULL,
  location_lng DECIMAL(9,6) NULL,
  location_label VARCHAR(200) NULL,
  pin_hash     CHAR(64)     NULL,                 -- code secret (scrypt), jamais en clair
  pin_salt     CHAR(32)     NULL,
  pin_fails    TINYINT      NOT NULL DEFAULT 0,   -- bloqué à 10
  last_login   DATETIME     NULL,
  created_at   DATETIME     NOT NULL,
  updated_at   DATETIME     NOT NULL,
  PRIMARY KEY (phone)
) ENGINE=InnoDB;

CREATE TABLE sessions (
  token_hash  CHAR(64)    NOT NULL,               -- empreinte SHA-256 du jeton (jamais le jeton)
  phone       VARCHAR(16) NOT NULL,
  created_at  DATETIME    NOT NULL,               -- valable 180 jours
  PRIMARY KEY (token_hash),
  KEY idx_sessions_phone (phone),
  CONSTRAINT fk_sessions_customer FOREIGN KEY (phone) REFERENCES customers (phone) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE wishlist (
  phone       VARCHAR(16) NOT NULL,
  product_id  VARCHAR(20) NOT NULL,
  added_at    DATETIME    NOT NULL,
  PRIMARY KEY (phone, product_id),
  CONSTRAINT fk_wish_customer FOREIGN KEY (phone)      REFERENCES customers (phone) ON DELETE CASCADE,
  CONSTRAINT fk_wish_product  FOREIGN KEY (product_id) REFERENCES products (id)     ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- COMMANDES ----------

CREATE TABLE orders (
  id               VARCHAR(20)  NOT NULL,         -- 'MAE-8F3K2Q'
  customer_phone   VARCHAR(16)  NULL,             -- NULL : commande sans compte
  first_name       VARCHAR(40)  NOT NULL,
  last_name        VARCHAR(40)  NULL,
  phone            VARCHAR(16)  NOT NULL,
  zone             VARCHAR(60)  NOT NULL,
  address          VARCHAR(160) NULL,
  location_lat     DECIMAL(9,6) NULL,
  location_lng     DECIMAL(9,6) NULL,
  landmark         VARCHAR(160) NULL,
  notes            VARCHAR(500) NULL,
  subtotal         INT UNSIGNED NOT NULL,
  discount         INT UNSIGNED NOT NULL DEFAULT 0,
  delivery_fee     INT UNSIGNED NOT NULL,
  gift_fee         INT UNSIGNED NOT NULL DEFAULT 0,
  gift_message     VARCHAR(300) NULL,
  total            INT UNSIGNED NOT NULL,
  promo_code       VARCHAR(30)  NULL,
  payment_method   ENUM('wave','orange_money','free_money','card','cash') NOT NULL,
  payment_status   ENUM('en_attente','paye') NOT NULL DEFAULT 'en_attente',
  payer_phone      VARCHAR(16)  NULL,             -- numéro Wave / OM qui a payé
  status           ENUM('en_attente','confirmee','en_preparation','expediee','livree','annulee') NOT NULL DEFAULT 'en_attente',
  rating_stars     TINYINT      NULL,             -- note de la cliente après livraison
  rating_comment   VARCHAR(500) NULL,
  created_at       DATETIME     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_orders_customer (customer_phone),
  KEY idx_orders_status (status),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_phone) REFERENCES customers (phone) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_items (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id     VARCHAR(20)  NOT NULL,
  product_id   VARCHAR(20)  NULL,                 -- NULL si la pièce a été retirée du catalogue
  name         VARCHAR(160) NOT NULL,             -- copie au moment de l'achat
  image        VARCHAR(255) NULL,
  unit_price   INT UNSIGNED NOT NULL,
  size         VARCHAR(10)  NULL,
  color        VARCHAR(40)  NULL,
  quantity     SMALLINT     NOT NULL,
  preorder_days SMALLINT    NULL,
  PRIMARY KEY (id),
  KEY idx_items_order (order_id),
  KEY idx_items_product (product_id),
  CONSTRAINT fk_items_order   FOREIGN KEY (order_id)   REFERENCES orders (id)   ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE order_status_history (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    VARCHAR(20)  NOT NULL,
  status      ENUM('en_attente','confirmee','en_preparation','expediee','livree','annulee') NOT NULL,
  changed_at  DATETIME     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_history_order (order_id),
  CONSTRAINT fk_history_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE order_notifications (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id    VARCHAR(20)  NOT NULL,
  recipient   ENUM('gerante','cliente','livreur') NOT NULL,
  kind        VARCHAR(40)  NOT NULL,              -- 'nouvelle_commande', 'en_route'…
  ok          TINYINT(1)   NOT NULL,
  provider_id VARCHAR(64)  NULL,                  -- identifiant du message WhatsApp
  sent_at     DATETIME     NOT NULL,
  PRIMARY KEY (id),
  KEY idx_notif_order (order_id),
  CONSTRAINT fk_notif_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- LIVRAISON ----------

CREATE TABLE deliveries (
  order_id     VARCHAR(20) NOT NULL,
  handover_code CHAR(4)    NULL,                  -- code de remise donné par la cliente au livreur
  proof_at     DATETIME    NULL,                  -- remise confirmée par le code
  PRIMARY KEY (order_id),
  CONSTRAINT fk_delivery_order FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE delivery_legs (                      -- une étape par livreur (relais possibles)
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  order_id      VARCHAR(20)  NOT NULL,
  leg_index     TINYINT      NOT NULL,
  driver_name   VARCHAR(60)  NOT NULL,
  driver_phone  VARCHAR(16)  NOT NULL,
  driver_token  VARCHAR(32)  NOT NULL,            -- lien secret du livreur
  vehicle       ENUM('moto','voiture','car') NOT NULL DEFAULT 'moto',
  relay_to      VARCHAR(160) NULL,                -- point de relais ; NULL = jusqu'à la cliente
  pos_lat       DECIMAL(9,6) NULL,                -- dernière position GPS du livreur
  pos_lng       DECIMAL(9,6) NULL,
  pos_at        DATETIME     NULL,
  assigned_at   DATETIME     NOT NULL,
  started_at    DATETIME     NULL,
  done_at       DATETIME     NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_leg_token (driver_token),
  UNIQUE KEY uk_leg_order_index (order_id, leg_index),
  CONSTRAINT fk_leg_delivery FOREIGN KEY (order_id) REFERENCES deliveries (order_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------- BOUTIQUE : OUTILS DE LA GÉRANTE ----------

CREATE TABLE stock_alerts (                       -- « Me prévenir du retour en stock »
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  product_id  VARCHAR(20)  NOT NULL,
  contact     VARCHAR(120) NOT NULL,              -- numéro WhatsApp ou e-mail
  created_at  DATETIME     NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_alert (product_id, contact),
  CONSTRAINT fk_alert_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE auth_codes (                         -- étiquettes d'authenticité (QR + code)
  code           VARCHAR(20)  NOT NULL,
  product_id     VARCHAR(20)  NULL,
  order_id       VARCHAR(20)  NULL,
  product_name   VARCHAR(160) NULL,
  scans          INT          NOT NULL DEFAULT 0,
  first_scan_at  DATETIME     NULL,
  last_scan_at   DATETIME     NULL,
  created_at     DATETIME     NOT NULL,
  PRIMARY KEY (code),
  CONSTRAINT fk_auth_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL,
  CONSTRAINT fk_auth_order   FOREIGN KEY (order_id)   REFERENCES orders (id)   ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE showcase (                           -- vitrine du statut WhatsApp
  product_id  VARCHAR(20) NOT NULL,
  added_at    DATETIME    NOT NULL,
  PRIMARY KEY (product_id),
  CONSTRAINT fk_showcase_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_visits (                     -- visites par source (statut, lien partagé, vitrine)
  product_id  VARCHAR(20) NOT NULL,
  source      ENUM('statut','partage','vitrine') NOT NULL,
  count       INT UNSIGNED NOT NULL DEFAULT 0,
  last_at     DATETIME    NULL,
  PRIMARY KEY (product_id, source),
  CONSTRAINT fk_visits_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE product_voices (                     -- note vocale de la gérante sur une pièce
  product_id    VARCHAR(20)  NOT NULL,
  file_path     VARCHAR(255) NOT NULL,
  content_type  VARCHAR(40)  NOT NULL,
  uploaded_at   DATETIME     NOT NULL,
  PRIMARY KEY (product_id),
  CONSTRAINT fk_voice_product FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE CASCADE
) ENGINE=InnoDB;
