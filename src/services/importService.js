const xlsx = require('xlsx');
const { pool } = require('../db/db');

/**
 * Normalizes a header string by trimming, converting to lower case,
 * removing accents and replacing non-alphanumeric chars with underscore.
 */
function normalizeKey(str) {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9]/g, '_')     // replace spaces/symbols with _
    .replace(/_+/g, '_')           // condense underscores
    .replace(/^_|_$/g, '');        // trim leading/trailing underscore
}

/**
 * Parses an Excel (.xlsx, .xls) or CSV buffer into an array of normalized row objects.
 */
function parseFileBufferToRows(buffer) {
  const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('El archivo no contiene ninguna hoja de datos.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = xlsx.utils.sheet_to_json(sheet, { defval: '', raw: false });

  if (!rawRows || rawRows.length === 0) {
    return [];
  }

  // Normalize all row keys
  return rawRows.map((rawRow, index) => {
    const rowNumber = index + 2; // Row 1 is header, data starts at 2
    const normalized = { _rowNumber: rowNumber };

    for (const [key, val] of Object.entries(rawRow)) {
      const normKey = normalizeKey(key);
      normalized[normKey] = typeof val === 'string' ? val.trim() : val;
    }

    return normalized;
  });
}

/**
 * Extracts value from normalized row matching any of the candidate aliases
 */
function getField(row, aliases) {
  for (const alias of aliases) {
    if (row[alias] !== undefined && row[alias] !== '') {
      return row[alias];
    }
  }
  return null;
}

/**
 * Helper to normalize name for map indexing (lowercase, trimmed, accent-free)
 */
function cleanString(str) {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Loads all categories into quick lookup maps and array
 */
async function loadCategoriesLookup() {
  const [rows] = await pool.query('SELECT id, name, status FROM categories');
  const byId = new Map();
  const byName = new Map();

  for (const cat of rows) {
    byId.set(Number(cat.id), cat);
    byName.set(cleanString(cat.name), cat);
  }

  return { byId, byName, allCategories: rows };
}

/**
 * Intelligently resolves a category from ID, exact name, substring, or semantic aliases
 */
function findCategory(rawCat, catById, catByName, allCategories) {
  if (!rawCat) return null;

  // 1. Resolve by numeric ID
  if (!isNaN(rawCat) && catById.has(Number(rawCat))) {
    return catById.get(Number(rawCat));
  }

  const clean = cleanString(rawCat);
  if (!clean) return null;

  // 2. Exact clean string match
  if (catByName.has(clean)) {
    return catByName.get(clean);
  }

  // 3. Substring match (e.g. 'autos' matches 'autos - camionetas')
  for (const cat of allCategories) {
    const catClean = cleanString(cat.name);
    if (catClean === clean || catClean.includes(clean) || clean.includes(catClean)) {
      return cat;
    }
  }

  // 4. Token match against words in category name
  for (const cat of allCategories) {
    const tokens = cleanString(cat.name).split(/[\s\-_/,\\]+/);
    if (tokens.includes(clean) || tokens.some(t => t.startsWith(clean) || clean.startsWith(t))) {
      return cat;
    }
  }

  // 5. Semantic alias mapping
  const autoKeywords = [
    'vehiculo', 'vehiculos', 'auto', 'autos', 'automovil', 'automoviles',
    'carro', 'carros', 'camioneta', 'camionetas', 'suv', 'sedan', 'van', 'particular'
  ];
  const motoKeywords = [
    'moto', 'motos', 'motocicleta', 'motocicletas', 'ciclomotor', 'scooter', 'enduro'
  ];
  const heavyKeywords = [
    'pesado', 'pesados', 'camion', 'camiones', 'bus', 'buses', 'tractomula',
    'tractocamion', 'tractocamiones', 'volqueta', 'volquetas', 'maquinaria', 'carga'
  ];

  if (autoKeywords.includes(clean)) {
    const match = allCategories.find(c => {
      const n = cleanString(c.name);
      return n.includes('auto') || n.includes('camionet') || n.includes('vehicul') || n.includes('carro');
    });
    if (match) return match;
  }

  if (motoKeywords.includes(clean)) {
    const match = allCategories.find(c => cleanString(c.name).includes('moto'));
    if (match) return match;
  }

  if (heavyKeywords.includes(clean)) {
    const match = allCategories.find(c => {
      const n = cleanString(c.name);
      return n.includes('pesad') || n.includes('camion') || n.includes('bus');
    });
    if (match) return match;
  }

  return null;
}

/**
 * Loads all brands into quick lookup maps
 */
async function loadBrandsLookup() {
  const [rows] = await pool.query('SELECT id, category_id, name, status FROM brands');
  const byId = new Map();
  const byCategoryAndName = new Map();

  for (const b of rows) {
    byId.set(Number(b.id), b);
    const key = `${b.category_id}_${cleanString(b.name)}`;
    byCategoryAndName.set(key, b);
  }

  return { byId, byCategoryAndName };
}

/**
 * Loads all models into quick lookup maps
 */
async function loadModelsLookup() {
  const [rows] = await pool.query('SELECT id, category_id, brand_id, name, status FROM models');
  const byKey = new Map();

  for (const m of rows) {
    const key = `${m.category_id}_${m.brand_id}_${cleanString(m.name)}`;
    byKey.set(key, m);
  }

  return { byKey };
}

/**
 * Import brands from Excel or CSV
 */
async function importBrands(buffer, userId) {
  const rows = parseFileBufferToRows(buffer);
  if (rows.length === 0) {
    return {
      total_rows: 0,
      imported: 0,
      skipped: 0,
      errors: ['El archivo está vacío o no contiene filas de datos.']
    };
  }

  const { byId: catById, byName: catByName, allCategories } = await loadCategoriesLookup();
  const { byCategoryAndName: brandsByCatAndName } = await loadBrandsLookup();

  let imported = 0;
  let skipped = 0;
  const errors = [];

  const availableCategoriesMsg = allCategories.map(c => `'${c.name}' (ID: ${c.id})`).join(', ');

  for (const row of rows) {
    const rowNum = row._rowNumber;

    // 1. Resolve Category
    const rawCat = getField(row, [
      'categoria_id', 'category_id', 'id_categoria', 'id_category',
      'categoria', 'category', 'nombre_categoria', 'categoria_nombre'
    ]);

    if (!rawCat) {
      errors.push({
        row: rowNum,
        message: 'La columna de categoría (ID o Nombre) es requerida y no fue encontrada.'
      });
      continue;
    }

    const category = findCategory(rawCat, catById, catByName, allCategories);

    if (!category) {
      errors.push({
        row: rowNum,
        message: `La categoría '${rawCat}' no coincide con ninguna categoría disponible: ${availableCategoriesMsg}.`
      });
      continue;
    }

    // 2. Resolve Brand Name
    const brandName = getField(row, [
      'nombre_marca', 'brand_name', 'marca', 'brand',
      'nombre', 'name', 'marca_nombre'
    ]);

    if (!brandName) {
      errors.push({
        row: rowNum,
        message: 'El nombre de la marca es requerido.'
      });
      continue;
    }

    const description = getField(row, ['descripcion', 'description', 'desc', 'detalle']) || null;
    const rawStatus = getField(row, ['estado', 'status']);
    let status = 'Activo';
    if (rawStatus && cleanString(rawStatus) === 'inactivo') {
      status = 'Inactivo';
    }

    // 3. Check for duplicates in category
    const brandKey = `${category.id}_${cleanString(brandName)}`;
    if (brandsByCatAndName.has(brandKey)) {
      skipped++;
      continue;
    }

    try {
      const [result] = await pool.query(
        'INSERT INTO brands (category_id, name, description, status, created_by) VALUES (?, ?, ?, ?, ?)',
        [category.id, brandName, description, status, userId]
      );

      const newBrand = {
        id: result.insertId,
        category_id: category.id,
        name: brandName,
        status
      };
      brandsByCatAndName.set(brandKey, newBrand);
      imported++;
    } catch (err) {
      errors.push({
        row: rowNum,
        message: `Error al insertar marca '${brandName}': ${err.message}`
      });
    }
  }

  return {
    total_rows: rows.length,
    imported,
    skipped,
    errors
  };
}

/**
 * Import models from Excel or CSV
 */
async function importModels(buffer, userId) {
  const rows = parseFileBufferToRows(buffer);
  if (rows.length === 0) {
    return {
      total_rows: 0,
      imported: 0,
      skipped: 0,
      errors: ['El archivo está vacío o no contiene filas de datos.']
    };
  }

  const { byId: catById, byName: catByName, allCategories } = await loadCategoriesLookup();
  const { byId: brandById, byCategoryAndName: brandsByCatAndName } = await loadBrandsLookup();
  const { byKey: modelsByKey } = await loadModelsLookup();

  let imported = 0;
  let skipped = 0;
  const errors = [];

  const availableCategoriesMsg = allCategories.map(c => `'${c.name}' (ID: ${c.id})`).join(', ');

  for (const row of rows) {
    const rowNum = row._rowNumber;

    // 1. Resolve Category
    const rawCat = getField(row, [
      'categoria_id', 'category_id', 'id_categoria', 'id_category',
      'categoria', 'category', 'nombre_categoria', 'categoria_nombre'
    ]);

    let category = null;
    if (rawCat) {
      category = findCategory(rawCat, catById, catByName, allCategories);
    }

    // 2. Resolve Brand
    const rawBrand = getField(row, [
      'marca_id', 'brand_id', 'id_marca', 'id_brand',
      'marca', 'brand', 'nombre_marca', 'brand_name'
    ]);

    if (!rawBrand) {
      errors.push({
        row: rowNum,
        message: 'La marca (ID o Nombre) es requerida.'
      });
      continue;
    }

    let brand = null;
    if (!isNaN(rawBrand) && brandById.has(Number(rawBrand))) {
      brand = brandById.get(Number(rawBrand));
      if (!category) {
        category = catById.get(brand.category_id);
      }
    } else if (category) {
      const brandKey = `${category.id}_${cleanString(rawBrand)}`;
      brand = brandsByCatAndName.get(brandKey);
    } else {
      // Find across all brands if category wasn't provided
      for (const b of brandById.values()) {
        if (cleanString(b.name) === cleanString(rawBrand)) {
          brand = b;
          category = catById.get(brand.category_id);
          break;
        }
      }
    }

    if (!category) {
      errors.push({
        row: rowNum,
        message: `No se pudo determinar una categoría válida para '${rawCat || 'fila'}'. Disponibles: ${availableCategoriesMsg}.`
      });
      continue;
    }

    if (!brand) {
      errors.push({
        row: rowNum,
        message: `La marca '${rawBrand}' no existe bajo la categoría '${category.name}'.`
      });
      continue;
    }

    // 3. Resolve Model Name
    const modelName = getField(row, [
      'nombre_modelo', 'model_name', 'modelo', 'model',
      'nombre', 'name', 'modelo_nombre'
    ]);

    if (!modelName) {
      errors.push({
        row: rowNum,
        message: 'El nombre del modelo es requerido.'
      });
      continue;
    }

    const description = getField(row, ['descripcion', 'description', 'desc', 'detalle']) || null;
    const rawStatus = getField(row, ['estado', 'status']);
    let status = 'Activo';
    if (rawStatus && cleanString(rawStatus) === 'inactivo') {
      status = 'Inactivo';
    }

    // 4. Check for duplicates in category and brand
    const modelKey = `${category.id}_${brand.id}_${cleanString(modelName)}`;
    if (modelsByKey.has(modelKey)) {
      skipped++;
      continue;
    }

    try {
      const [result] = await pool.query(
        'INSERT INTO models (category_id, brand_id, name, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [category.id, brand.id, modelName, description, status, userId]
      );

      const newModel = {
        id: result.insertId,
        category_id: category.id,
        brand_id: brand.id,
        name: modelName,
        status
      };
      modelsByKey.set(modelKey, newModel);
      imported++;
    } catch (err) {
      errors.push({
        row: rowNum,
        message: `Error al insertar modelo '${modelName}': ${err.message}`
      });
    }
  }

  return {
    total_rows: rows.length,
    imported,
    skipped,
    errors
  };
}

/**
 * Combined vehicle catalog import (Category, Brand, Model in one file).
 */
async function importVehicleCatalog(buffer, userId) {
  const rows = parseFileBufferToRows(buffer);
  if (rows.length === 0) {
    return {
      total_rows: 0,
      brands_created: 0,
      models_created: 0,
      skipped: 0,
      errors: ['El archivo está vacío o no contiene filas de datos.']
    };
  }

  const { byId: catById, byName: catByName, allCategories } = await loadCategoriesLookup();
  const { byId: brandById, byCategoryAndName: brandsByCatAndName } = await loadBrandsLookup();
  const { byKey: modelsByKey } = await loadModelsLookup();

  let brandsCreated = 0;
  let modelsCreated = 0;
  let skipped = 0;
  const errors = [];

  const availableCategoriesMsg = allCategories.map(c => `'${c.name}' (ID: ${c.id})`).join(', ');

  for (const row of rows) {
    const rowNum = row._rowNumber;

    // 1. Resolve Category
    const rawCat = getField(row, [
      'categoria_id', 'category_id', 'id_categoria', 'id_category',
      'categoria', 'category', 'nombre_categoria', 'categoria_nombre'
    ]);

    if (!rawCat) {
      errors.push({
        row: rowNum,
        message: 'La columna de categoría es requerida.'
      });
      continue;
    }

    const category = findCategory(rawCat, catById, catByName, allCategories);

    if (!category) {
      errors.push({
        row: rowNum,
        message: `La categoría '${rawCat}' no coincide con ninguna categoría disponible: ${availableCategoriesMsg}.`
      });
      continue;
    }

    // 2. Resolve or Create Brand
    const brandName = getField(row, [
      'nombre_marca', 'brand_name', 'marca', 'brand', 'marca_nombre'
    ]);

    if (!brandName) {
      errors.push({
        row: rowNum,
        message: 'El nombre de la marca es requerido.'
      });
      continue;
    }

    const brandKey = `${category.id}_${cleanString(brandName)}`;
    let brand = brandsByCatAndName.get(brandKey);

    if (!brand) {
      try {
        const [bRes] = await pool.query(
          'INSERT INTO brands (category_id, name, description, status, created_by) VALUES (?, ?, ?, ?, ?)',
          [category.id, brandName, `Importado automáticamente en catálogo`, 'Activo', userId]
        );
        brand = {
          id: bRes.insertId,
          category_id: category.id,
          name: brandName,
          status: 'Activo'
        };
        brandsByCatAndName.set(brandKey, brand);
        brandById.set(brand.id, brand);
        brandsCreated++;
      } catch (err) {
        errors.push({
          row: rowNum,
          message: `Error al crear marca '${brandName}': ${err.message}`
        });
        continue;
      }
    }

    // 3. Resolve Model
    const modelName = getField(row, [
      'nombre_modelo', 'model_name', 'modelo', 'model', 'modelo_nombre'
    ]);

    if (!modelName) {
      continue;
    }

    const description = getField(row, ['descripcion', 'description', 'desc', 'detalle']) || null;
    const rawStatus = getField(row, ['estado', 'status']);
    let status = 'Activo';
    if (rawStatus && cleanString(rawStatus) === 'inactivo') {
      status = 'Inactivo';
    }

    const modelKey = `${category.id}_${brand.id}_${cleanString(modelName)}`;
    if (modelsByKey.has(modelKey)) {
      skipped++;
      continue;
    }

    try {
      const [mRes] = await pool.query(
        'INSERT INTO models (category_id, brand_id, name, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
        [category.id, brand.id, modelName, description, status, userId]
      );
      const newModel = {
        id: mRes.insertId,
        category_id: category.id,
        brand_id: brand.id,
        name: modelName,
        status
      };
      modelsByKey.set(modelKey, newModel);
      modelsCreated++;
    } catch (err) {
      errors.push({
        row: rowNum,
        message: `Error al insertar modelo '${modelName}': ${err.message}`
      });
    }
  }

  return {
    total_rows: rows.length,
    brands_created: brandsCreated,
    models_created: modelsCreated,
    skipped,
    errors
  };
}

/**
 * Generate Excel / CSV templates for Brands
 */
function generateBrandsTemplate(format = 'xlsx') {
  const data = [
    {
      'Categoria': 'Autos - Camionetas',
      'Nombre de Marca': 'Toyota',
      'Descripcion': 'Fabricante multinacional japonés de automóviles',
      'Estado': 'Activo'
    },
    {
      'Categoria': 'Autos - Camionetas',
      'Nombre de Marca': 'Chevrolet',
      'Descripcion': 'Marca líder de automóviles y camionetas',
      'Estado': 'Activo'
    },
    {
      'Categoria': 'Motos',
      'Nombre de Marca': 'Yamaha',
      'Descripcion': 'Fabricante de motocicletas',
      'Estado': 'Activo'
    },
    {
      'Categoria': 'Pesados - Camiones - Buses - Otros',
      'Nombre de Marca': 'Hino',
      'Descripcion': 'Camiones y chasises de carga pesada',
      'Estado': 'Activo'
    }
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Marcas');

  if (format === 'csv') {
    return xlsx.write(wb, { type: 'buffer', bookType: 'csv' });
  }
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generate Excel / CSV templates for Models
 */
function generateModelsTemplate(format = 'xlsx') {
  const data = [
    {
      'Categoria': 'Autos - Camionetas',
      'Marca': 'Toyota',
      'Nombre de Modelo': 'Corolla',
      'Descripcion': 'Sedán compacto 1.8L / 2.0L',
      'Estado': 'Activo'
    },
    {
      'Categoria': 'Autos - Camionetas',
      'Marca': 'Toyota',
      'Nombre de Modelo': 'Hilux',
      'Descripcion': 'Camioneta Pickup 2.4L / 2.8L Diésel',
      'Estado': 'Activo'
    },
    {
      'Categoria': 'Autos - Camionetas',
      'Marca': 'Chevrolet',
      'Nombre de Modelo': 'Onix',
      'Descripcion': 'Hatchback / Sedán Turbo 1.0L',
      'Estado': 'Activo'
    },
    {
      'Categoria': 'Motos',
      'Marca': 'Yamaha',
      'Nombre de Modelo': 'FZ 250',
      'Descripcion': 'Motocicleta urbana 250cc',
      'Estado': 'Activo'
    }
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Modelos');

  if (format === 'csv') {
    return xlsx.write(wb, { type: 'buffer', bookType: 'csv' });
  }
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Generate Excel / CSV templates for Combined Catalog
 */
function generateCatalogTemplate(format = 'xlsx') {
  const data = [
    {
      'Categoria': 'Autos - Camionetas',
      'Marca': 'Mazda',
      'Modelo': 'Mazda 3',
      'Descripcion': 'Sedán / Hatchback Skyactiv',
      'Estado': 'Activo'
    },
    {
      'Categoria': 'Autos - Camionetas',
      'Marca': 'Mazda',
      'Modelo': 'CX-5',
      'Descripcion': 'SUV Compacta Skyactiv',
      'Estado': 'Activo'
    },
    {
      'Categoria': 'Autos - Camionetas',
      'Marca': 'Renault',
      'Modelo': 'Duster',
      'Descripcion': 'SUV 1.3L Turbo / 1.6L',
      'Estado': 'Activo'
    },
    {
      'Categoria': 'Motos',
      'Marca': 'Honda',
      'Modelo': 'CB 190R',
      'Descripcion': 'Motocicleta Sport 190cc',
      'Estado': 'Activo'
    }
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Catalogo');

  if (format === 'csv') {
    return xlsx.write(wb, { type: 'buffer', bookType: 'csv' });
  }
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * Loads all vehicle versions into quick lookup maps
 */
async function loadVersionsLookup() {
  const [rows] = await pool.query('SELECT id, model_id, name, status FROM vehicle_versions');
  const byKey = new Map();

  for (const v of rows) {
    const key = `${v.model_id}_${cleanString(v.name)}`;
    byKey.set(key, v);
  }

  return { byKey };
}

/**
 * Import vehicle versions from Excel or CSV
 */
async function importVersions(buffer, userId) {
  const rows = parseFileBufferToRows(buffer);
  if (rows.length === 0) {
    return {
      total_rows: 0,
      imported: 0,
      skipped: 0,
      errors: ['El archivo está vacío o no contiene filas de datos.']
    };
  }

  const { byId: catById, byName: catByName, allCategories } = await loadCategoriesLookup();
  const { byId: brandById, byCategoryAndName: brandsByCatAndName } = await loadBrandsLookup();
  const [modelRows] = await pool.query('SELECT id, category_id, brand_id, name FROM models');
  const { byKey: versionsByKey } = await loadVersionsLookup();

  // Map models by id, by brand_id + name, and by name
  const modelById = new Map();
  const modelByBrandAndName = new Map();
  for (const m of modelRows) {
    modelById.set(Number(m.id), m);
    modelByBrandAndName.set(`${m.brand_id}_${cleanString(m.name)}`, m);
  }

  let imported = 0;
  let skipped = 0;
  const errors = [];

  for (const row of rows) {
    const rowNum = row._rowNumber;

    // 1. Resolve Category (Optional helper)
    const rawCat = getField(row, [
      'categoria_id', 'category_id', 'id_categoria', 'id_category',
      'categoria', 'category', 'nombre_categoria', 'categoria_nombre',
      'nombre_de_categoria', 'nombre_de_la_categoria'
    ]);
    let category = null;
    if (rawCat) {
      category = findCategory(rawCat, catById, catByName, allCategories);
    }

    // 2. Resolve Brand
    const rawBrand = getField(row, [
      'marca_id', 'brand_id', 'id_marca', 'id_brand',
      'marca', 'brand', 'nombre_marca', 'brand_name',
      'nombre_de_marca', 'nombre_de_la_marca'
    ]);
    let brand = null;
    if (rawBrand) {
      if (!isNaN(rawBrand) && brandById.has(Number(rawBrand))) {
        brand = brandById.get(Number(rawBrand));
      } else if (category) {
        brand = brandsByCatAndName.get(`${category.id}_${cleanString(rawBrand)}`);
      } else {
        for (const b of brandById.values()) {
          if (cleanString(b.name) === cleanString(rawBrand)) {
            brand = b;
            break;
          }
        }
      }
    }

    // 3. Resolve Model
    const rawModel = getField(row, [
      'modelo_id', 'model_id', 'id_modelo', 'id_model',
      'modelo', 'model', 'nombre_modelo', 'model_name',
      'nombre_de_modelo', 'nombre_del_modelo'
    ]);

    if (!rawModel) {
      errors.push({
        row: rowNum,
        message: 'El modelo (ID o Nombre) es requerido.'
      });
      continue;
    }

    let model = null;
    if (!isNaN(rawModel) && modelById.has(Number(rawModel))) {
      model = modelById.get(Number(rawModel));
    } else if (brand) {
      model = modelByBrandAndName.get(`${brand.id}_${cleanString(rawModel)}`);
    } else {
      // Find across all models if brand wasn't provided
      for (const m of modelById.values()) {
        if (cleanString(m.name) === cleanString(rawModel)) {
          model = m;
          break;
        }
      }
    }

    if (!model) {
      errors.push({
        row: rowNum,
        message: `El modelo '${rawModel}' no fue encontrado en el sistema.`
      });
      continue;
    }

    // 4. Resolve Version Name
    const versionName = getField(row, [
      'nombre_version', 'version_name', 'version', 'nombre', 'name', 'version_nombre',
      'nombre_de_version', 'nombre_de_la_version', 'version_del_vehiculo', 'version_vehiculo',
      'trim', 'edicion', 'submodelo'
    ]);

    if (!versionName) {
      errors.push({
        row: rowNum,
        message: 'El nombre de la versión es requerido.'
      });
      continue;
    }

    const description = getField(row, ['descripcion', 'description', 'desc', 'detalle']) || null;
    const rawStatus = getField(row, ['estado', 'status']);
    let status = 'Activo';
    if (rawStatus && cleanString(rawStatus) === 'inactivo') {
      status = 'Inactivo';
    }

    // 5. Check for duplicates under this model
    const versionKey = `${model.id}_${cleanString(versionName)}`;
    if (versionsByKey.has(versionKey)) {
      skipped++;
      continue;
    }

    try {
      const [result] = await pool.query(
        'INSERT INTO vehicle_versions (model_id, name, description, status, created_by) VALUES (?, ?, ?, ?, ?)',
        [model.id, versionName, description, status, userId]
      );

      const newVersion = {
        id: result.insertId,
        model_id: model.id,
        name: versionName,
        status
      };
      versionsByKey.set(versionKey, newVersion);
      imported++;
    } catch (err) {
      errors.push({
        row: rowNum,
        message: `Error al insertar versión '${versionName}': ${err.message}`
      });
    }
  }

  return {
    total_rows: rows.length,
    imported,
    skipped,
    errors
  };
}

/**
 * Generate Excel / CSV templates for Vehicle Versions
 */
function generateVersionsTemplate(format = 'xlsx') {
  const data = [
    {
      'Categoria': 'Autos - Camionetas',
      'Marca': 'Toyota',
      'Modelo': 'Corolla',
      'Nombre de Version': 'XEI 2.0 CVT',
      'Descripcion': 'Versión intermedia con transmisión automática CVT',
      'Estado': 'Activo'
    },
    {
      'Categoria': 'Autos - Camionetas',
      'Marca': 'Toyota',
      'Modelo': 'Corolla',
      'Nombre de Version': 'SEG Hybrid',
      'Descripcion': 'Versión full equipo híbrida 1.8L',
      'Estado': 'Activo'
    },
    {
      'Categoria': 'Autos - Camionetas',
      'Marca': 'Chevrolet',
      'Modelo': 'Onix',
      'Nombre de Version': 'Premier Turbo',
      'Descripcion': 'Versión tope de gama motor 1.0 Turbo',
      'Estado': 'Activo'
    },
    {
      'Categoria': 'Autos - Camionetas',
      'Marca': 'Mazda',
      'Modelo': 'CX-5',
      'Nombre de Version': 'Grand Touring LX AWD',
      'Descripcion': 'Tracción total con motor 2.5L Turbo',
      'Estado': 'Activo'
    }
  ];

  const ws = xlsx.utils.json_to_sheet(data);
  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Versiones');

  if (format === 'csv') {
    return xlsx.write(wb, { type: 'buffer', bookType: 'csv' });
  }
  return xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

module.exports = {
  importBrands,
  importModels,
  importVersions,
  importVehicleCatalog,
  generateBrandsTemplate,
  generateModelsTemplate,
  generateVersionsTemplate,
  generateCatalogTemplate
};

