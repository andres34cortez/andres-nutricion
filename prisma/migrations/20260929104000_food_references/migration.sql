CREATE TABLE "FoodReference" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "aliases" TEXT[],
    "servingAmount" DOUBLE PRECISION NOT NULL,
    "servingUnit" TEXT NOT NULL,
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRef" TEXT,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodReference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FoodReference_name_key" ON "FoodReference"("name");
CREATE INDEX "FoodReference_active_name_idx" ON "FoodReference"("active", "name");

INSERT INTO "FoodReference" ("id", "name", "aliases", "servingAmount", "servingUnit", "calories", "protein", "carbs", "fat", "source", "sourceRef", "note", "updatedAt") VALUES
('ref-coffee-brewed', 'Café filtrado o instantáneo, sin azúcar', ARRAY['café', 'cafe', 'café negro', 'cafe negro', 'café solo', 'cafe solo', 'café filtrado', 'cafe filtrado', 'café instantáneo', 'cafe instantaneo'], 100, 'ml', 1, 0.12, 0, 0.02, 'USDA FoodData Central', 'FDC 2710375', 'Promedio para café preparado con agua, sin leche ni azúcar.', CURRENT_TIMESTAMP),
('ref-espresso', 'Café espresso, sin azúcar', ARRAY['espresso', 'café espresso', 'cafe espresso'], 30, 'ml', 3, 0.12, 0.5, 0.05, 'USDA FoodData Central', 'Valor promedio', 'El tamaño de la extracción puede variar.', CURRENT_TIMESTAMP),
('ref-milk-whole', 'Leche entera', ARRAY['leche', 'leche entera', 'leche de vaca', 'leche común', 'leche comun'], 100, 'ml', 61, 3.27, 4.63, 3.2, 'USDA FoodData Central', 'FDC 2705385', 'Promedio; la etiqueta de la marca tiene prioridad.', CURRENT_TIMESTAMP),
('ref-milk-2pct', 'Leche parcialmente descremada (2%)', ARRAY['leche parcialmente descremada', 'leche semidescremada', 'leche 2%', 'leche reducida en grasa'], 100, 'ml', 50, 3.36, 4.9, 1.9, 'USDA FoodData Central', 'FDC 2705386', 'Promedio; la etiqueta de la marca tiene prioridad.', CURRENT_TIMESTAMP),
('ref-milk-skim', 'Leche descremada', ARRAY['leche descremada', 'leche desnatada', 'leche sin grasa', 'leche 0%'], 100, 'ml', 37, 3.57, 5.02, 0.25, 'USDA FoodData Central', 'FDC 171270', 'Promedio; la etiqueta de la marca tiene prioridad.', CURRENT_TIMESTAMP),
('ref-soy-milk-unsweetened', 'Bebida de soja sin azúcar', ARRAY['leche de soja', 'bebida de soja', 'leche de soya', 'bebida de soya'], 100, 'ml', 38, 3.55, 1.29, 2.12, 'USDA FoodData Central', 'FDC 2705405', 'Promedio sin azúcar; revisar etiqueta si es endulzada.', CURRENT_TIMESTAMP),
('ref-almond-milk-unsweetened', 'Bebida de almendras sin azúcar', ARRAY['leche de almendras', 'bebida de almendras'], 100, 'ml', 15, 0.4, 1.3, 1.1, 'USDA FoodData Central', 'Valor promedio', 'Las marcas varían mucho; revisar etiqueta.', CURRENT_TIMESTAMP),
('ref-oat-milk-unsweetened', 'Bebida de avena sin azúcar', ARRAY['leche de avena', 'bebida de avena'], 100, 'ml', 46, 1, 6.7, 1.5, 'USDA FoodData Central', 'Valor promedio', 'Las marcas varían mucho; revisar etiqueta.', CURRENT_TIMESTAMP),
('ref-sugar', 'Azúcar', ARRAY['azúcar', 'azucar', 'azúcar blanca', 'azucar blanca', 'azúcar granulada', 'azucar granulada'], 100, 'g', 387, 0, 100, 0, 'USDA FoodData Central', 'FDC 169655', 'Una cucharadita al ras suele aportar aproximadamente 4 g.', CURRENT_TIMESTAMP),
('ref-coffee-milk-whole', 'Café con leche entera, mitad leche, sin azúcar', ARRAY['café con leche', 'cafe con leche', 'taza de café con leche', 'taza de cafe con leche'], 100, 'ml', 31, 1.7, 2.3, 1.6, 'Cálculo desde USDA FoodData Central', 'FDC 2710375 + 2705385', 'Estimación 50% café y 50% leche entera, sin azúcar.', CURRENT_TIMESTAMP),
('ref-coffee-milk-2pct', 'Café con leche parcialmente descremada, mitad leche, sin azúcar', ARRAY['café con leche semidescremada', 'cafe con leche semidescremada', 'café con leche 2%', 'cafe con leche 2%'], 100, 'ml', 26, 1.7, 2.5, 1, 'Cálculo desde USDA FoodData Central', 'FDC 2710375 + 2705386', 'Estimación 50% café y 50% leche parcialmente descremada, sin azúcar.', CURRENT_TIMESTAMP),
('ref-coffee-milk-skim', 'Café con leche descremada, mitad leche, sin azúcar', ARRAY['café con leche descremada', 'cafe con leche descremada'], 100, 'ml', 19, 1.8, 2.5, 0.1, 'Cálculo desde USDA FoodData Central', 'FDC 2710375 + 171270', 'Estimación 50% café y 50% leche descremada, sin azúcar.', CURRENT_TIMESTAMP),
('ref-coffee-soy', 'Café con bebida de soja, mitad bebida, sin azúcar', ARRAY['café con leche de soja', 'cafe con leche de soja', 'café con bebida de soja', 'cafe con bebida de soja'], 100, 'ml', 20, 1.8, 0.6, 1.1, 'Cálculo desde USDA FoodData Central', 'FDC 2710375 + 2705405', 'Estimación 50% café y 50% bebida de soja sin azúcar.', CURRENT_TIMESTAMP),
('ref-tea', 'Té preparado, sin azúcar', ARRAY['té', 'te', 'té negro', 'te negro', 'té verde', 'te verde', 'infusión', 'infusion'], 100, 'ml', 1, 0, 0.3, 0, 'USDA FoodData Central', 'Valor promedio', 'Sin leche, azúcar ni miel.', CURRENT_TIMESTAMP),
('ref-rice-white-cooked', 'Arroz blanco cocido', ARRAY['arroz', 'arroz blanco', 'arroz cocido', 'arroz blanco cocido'], 100, 'g', 130, 2.7, 28.2, 0.3, 'USDA FoodData Central', 'Valor promedio por 100 g', 'Peso cocido, sin aceite agregado.', CURRENT_TIMESTAMP),
('ref-pasta-cooked', 'Pasta cocida', ARRAY['pasta', 'fideos', 'tallarines', 'pasta cocida', 'fideos cocidos'], 100, 'g', 131, 5.2, 25.5, 1.1, 'USDA FoodData Central', 'Valor promedio por 100 g', 'Cocida, sin salsa ni aceite agregado.', CURRENT_TIMESTAMP),
('ref-chicken-breast-cooked', 'Pechuga de pollo cocida', ARRAY['pollo', 'pechuga de pollo', 'pollo cocido', 'pollo a la plancha', 'pechuga a la plancha'], 100, 'g', 165, 31, 0, 3.6, 'USDA FoodData Central', 'Valor promedio por 100 g', 'Sin piel ni aceite agregado.', CURRENT_TIMESTAMP),
('ref-egg', 'Huevo de gallina', ARRAY['huevo', 'huevo duro', 'huevo hervido', 'huevo cocido'], 1, 'unidad', 78, 6.3, 0.6, 5.3, 'USDA FoodData Central', 'Valor promedio por unidad grande', 'Sin aceite agregado.', CURRENT_TIMESTAMP),
('ref-banana', 'Banana', ARRAY['banana', 'plátano', 'platano'], 100, 'g', 89, 1.1, 22.8, 0.3, 'USDA FoodData Central', 'Valor promedio por 100 g', 'Parte comestible, sin cáscara.', CURRENT_TIMESTAMP),
('ref-apple', 'Manzana', ARRAY['manzana'], 100, 'g', 52, 0.3, 13.8, 0.2, 'USDA FoodData Central', 'Valor promedio por 100 g', 'Parte comestible.', CURRENT_TIMESTAMP),
('ref-oats', 'Avena arrollada seca', ARRAY['avena', 'avena arrollada', 'copos de avena'], 100, 'g', 379, 13.2, 67.7, 6.5, 'USDA FoodData Central', 'Valor promedio por 100 g', 'Peso en seco.', CURRENT_TIMESTAMP),
('ref-bread-white', 'Pan blanco', ARRAY['pan', 'pan blanco', 'tostada', 'tostada de pan blanco'], 100, 'g', 266, 8.9, 49.4, 3.3, 'USDA FoodData Central', 'Valor promedio por 100 g', 'Las recetas y marcas varían.', CURRENT_TIMESTAMP),
('ref-yogurt-plain-whole', 'Yogur natural entero sin azúcar', ARRAY['yogur', 'yogurt', 'yogur natural', 'yogurt natural'], 100, 'g', 61, 3.5, 4.7, 3.3, 'USDA FoodData Central', 'Valor promedio por 100 g', 'Sin azúcar agregado.', CURRENT_TIMESTAMP),
('ref-potato-boiled', 'Papa hervida', ARRAY['papa', 'patata', 'papa hervida', 'papa cocida'], 100, 'g', 87, 1.9, 20.1, 0.1, 'USDA FoodData Central', 'Valor promedio por 100 g', 'Sin aceite ni manteca.', CURRENT_TIMESTAMP),
('ref-olive-oil', 'Aceite de oliva', ARRAY['aceite', 'aceite de oliva'], 10, 'ml', 82, 0, 0, 9.1, 'USDA FoodData Central', 'Conversión promedio por densidad', 'Una cucharada suele contener aproximadamente 15 ml.', CURRENT_TIMESTAMP),
('ref-butter', 'Manteca', ARRAY['manteca', 'mantequilla'], 10, 'g', 72, 0.1, 0, 8.1, 'USDA FoodData Central', 'Valor promedio por 10 g', 'Con sal o sin sal puede variar ligeramente.', CURRENT_TIMESTAMP);
