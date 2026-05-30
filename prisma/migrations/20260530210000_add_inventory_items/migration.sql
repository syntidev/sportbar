-- CreateTable
CREATE TABLE `inventory_items` (
  `id`         int           NOT NULL AUTO_INCREMENT,
  `product_id` int           NOT NULL,
  `quantity`   decimal(10,3) NOT NULL DEFAULT 0,
  `unit`       varchar(20)   NOT NULL DEFAULT 'unid',
  `min_stock`  decimal(10,3) NOT NULL DEFAULT 0,
  `updated_at` datetime(3)   NOT NULL,

  UNIQUE INDEX `inventory_items_product_id_key`(`product_id`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `inventory_items`
  ADD CONSTRAINT `inventory_items_product_id_fkey`
  FOREIGN KEY (`product_id`) REFERENCES `products`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;
