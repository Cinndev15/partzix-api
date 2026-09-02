const { pool } = require('../db/db');
const {
  importBrands: importBrandsService,
  importVehicleCatalog: importCatalogService,
  generateBrandsTemplate,
  generateCatalogTemplate
} = require('../services/importService');

/**
 * Create a new brand under a category (Admin only)
 */
async function createBrand(req, res, next) {
  const { category_id, name, description, status } = req.body;
  const created_by = req.user.id;

  try {
    if (!category_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la categoría y el nombre de la marca son requeridos.'
      });
    }

    // Verify category exists
    const [category] = await pool.query('SELECT id FROM categories WHERE id = ?', [category_id]);
    if (category.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'La categoría especificada no existe.'
      });
    }

    // Check if brand name already exists under this category
    const [existing] = await pool.query('SELECT id FROM brands WHERE category_id = ? AND name = ?', [category_id, name]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una marca con este nombre bajo esta categoría.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO brands (category_id, name, description, status, created_by) VALUES (?, ?, ?, ?, ?)',
      [category_id, name, description || null, status || 'Activo', created_by]
    );

    return res.status(201).json({
      success: true,
      message: 'Marca creada con éxito.',
      data: {
        id: result.insertId,
        category_id,
        name,
        description,
        status: status || 'Activo',
        created_by
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all brands (optional query filter by categoryId)
 */
async function getBrands(req, res, next) {
  const { categoryId } = req.query;

  try {
    let query = `
      SELECT b.id, b.category_id, c.name as category_name, b.name, b.description, b.status, b.created_at, b.updated_at, 
             u1.email as creator_email, u2.email as updater_email, COALESCE(u1.name, u1.email) as creator_name
      FROM brands b
      INNER JOIN categories c ON b.category_id = c.id
      INNER JOIN users u1 ON b.created_by = u1.id
      LEFT JOIN users u2 ON b.updated_by = u2.id
    `;
    const params = [];

    if (categoryId) {
      query += ` WHERE b.category_id = ?`;
      params.push(categoryId);
    }

    query += ` ORDER BY b.name ASC`;

    const [rows] = await pool.query(query, params);

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get brand by ID
 */
async function getBrandById(req, res, next) {
  const { id } = req.params;

  try {
    const query = `
      SELECT b.id, b.category_id, c.name as category_name, b.name, b.description, b.status, b.created_at, b.updated_at, 
             u1.email as creator_email, u2.email as updater_email, COALESCE(u1.name, u1.email) as creator_name
      FROM brands b
      INNER JOIN categories c ON b.category_id = c.id
      INNER JOIN users u1 ON b.created_by = u1.id
      LEFT JOIN users u2 ON b.updated_by = u2.id
      WHERE b.id = ?
    `;
    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marca no encontrada.'
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update brand (Admin only)
 */
async function updateBrand(req, res, next) {
  const { id } = req.params;
  const { category_id, name, description, status } = req.body;
  const updated_by = req.user.id;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la marca es requerido.'
      });
    }

    // Verify brand exists
    const [existing] = await pool.query('SELECT id, category_id FROM brands WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marca no encontrada.'
      });
    }

    const finalCategoryId = category_id !== undefined ? parseInt(category_id) : existing[0].category_id;

    // Check if name is duplicate under the same category
    const [duplicate] = await pool.query(
      'SELECT id FROM brands WHERE category_id = ? AND name = ? AND id != ?',
      [finalCategoryId, name, id]
    );
    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otra marca con este nombre bajo esta categoría.'
      });
    }

    await pool.query(
      'UPDATE brands SET category_id = ?, name = ?, description = ?, status = ?, updated_by = ? WHERE id = ?',
      [finalCategoryId, name, description || null, status || 'Activo', updated_by, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Marca actualizada con éxito.',
      data: {
        id: parseInt(id),
        category_id: finalCategoryId,
        name,
        description,
        status: status || 'Activo',
        updated_by
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete brand (Admin only)
 */
async function deleteBrand(req, res, next) {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM brands WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marca no encontrada.'
      });
    }

    await pool.query('DELETE FROM brands WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Marca eliminada con éxito.'
    });
  } catch (error) {
    next(error);
  }
}


/**
 * Update brand status (Admin only)
 */
async function updateBrandStatus(req, res, next) {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (status !== 'Activo' && status !== 'Inactivo') {
      return res.status(400).json({ success: false, message: "El estado debe ser 'Activo' o 'Inactivo'." });
    }
    const [result] = await pool.query('UPDATE `brands` SET status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Marca no encontrada.' });
    }
    return res.status(200).json({ success: true, message: 'Estado actualizado con éxito.', data: { id: parseInt(id), status } });
  } catch (error) { next(error); }
}

/**
 * Import brands from Excel or CSV (Admin only)
 */
async function importBrands(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo. Debe adjuntar un archivo Excel (.xlsx, .xls) o CSV (.csv) en el campo "file".'
      });
    }

    const userId = req.user.id;
    const result = await importBrandsService(req.file.buffer, userId);

    return res.status(200).json({
      success: true,
      message: `Proceso de importación finalizado. Se importaron ${result.imported} marcas nuevas (${result.skipped} duplicadas omitidas).`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Download sample template for Brands import
 */
async function downloadBrandsTemplate(req, res, next) {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase();
    const buffer = generateBrandsTemplate(format);
    const contentType = format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const filename = `plantilla_marcas.${format === 'csv' ? 'csv' : 'xlsx'}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

/**
 * Import combined vehicle catalog (Brands and Models) from Excel or CSV (Admin only)
 */
async function importCatalog(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo. Debe adjuntar un archivo Excel (.xlsx, .xls) o CSV (.csv) en el campo "file".'
      });
    }

    const userId = req.user.id;
    const result = await importCatalogService(req.file.buffer, userId);

    return res.status(200).json({
      success: true,
      message: `Proceso de importación del catálogo finalizado. Se crearon ${result.brands_created} marcas y ${result.models_created} modelos (${result.skipped} duplicados omitidos).`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Download sample template for Catalog import
 */
async function downloadCatalogTemplate(req, res, next) {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase();
    const buffer = generateCatalogTemplate(format);
    const contentType = format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const filename = `plantilla_catalogo_vehiculos.${format === 'csv' ? 'csv' : 'xlsx'}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createBrand,
  getBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  updateBrandStatus,
  importBrands,
  downloadBrandsTemplate,
  importCatalog,
  downloadCatalogTemplate
};

