const { pool } = require('../db/db');
const {
  importModels: importModelsService,
  generateModelsTemplate
} = require('../services/importService');

/**
 * Create a new model under a brand and a category (Admin only)
 */
async function createModel(req, res, next) {
  const { category_id, brand_id, name, description, status } = req.body;
  const created_by = req.user.id;

  try {
    if (!category_id || !brand_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la categoría, el ID de la marca y el nombre del modelo son requeridos.'
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

    // Verify brand exists and is linked to the specified category
    const [brand] = await pool.query('SELECT id FROM brands WHERE id = ? AND category_id = ?', [brand_id, category_id]);
    if (brand.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'La marca especificada no existe o no está vinculada a la categoría provista.'
      });
    }

    // Check if model name already exists under this category and brand
    const [existing] = await pool.query(
      'SELECT id FROM models WHERE category_id = ? AND brand_id = ? AND name = ?',
      [category_id, brand_id, name]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un modelo con este nombre para esta marca y categoría.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO models (category_id, brand_id, name, description, status, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [category_id, brand_id, name, description || null, status || 'Activo', created_by]
    );

    return res.status(201).json({
      success: true,
      message: 'Modelo creado con éxito.',
      data: {
        id: result.insertId,
        category_id,
        brand_id,
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
 * Get all models (optional query filters by categoryId and brandId)
 */
async function getModels(req, res, next) {
  const { categoryId, brandId } = req.query;

  try {
    let query = `
      SELECT m.id, m.category_id, c.name as category_name, m.brand_id, b.name as brand_name, 
             m.name, m.description, m.status, m.created_at, m.updated_at, 
             u1.email as creator_email, u2.email as updater_email, COALESCE(u1.name, u1.email) as creator_name
      FROM models m
      INNER JOIN categories c ON m.category_id = c.id
      INNER JOIN brands b ON m.brand_id = b.id
      INNER JOIN users u1 ON m.created_by = u1.id
      LEFT JOIN users u2 ON m.updated_by = u2.id
    `;
    const params = [];
    const whereClauses = [];

    if (categoryId) {
      whereClauses.push(`m.category_id = ?`);
      params.push(categoryId);
    }

    if (brandId) {
      whereClauses.push(`m.brand_id = ?`);
      params.push(brandId);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY m.name ASC`;

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
 * Get model by ID
 */
async function getModelById(req, res, next) {
  const { id } = req.params;

  try {
    const query = `
      SELECT m.id, m.category_id, c.name as category_name, m.brand_id, b.name as brand_name, 
             m.name, m.description, m.status, m.created_at, m.updated_at, 
             u1.email as creator_email, u2.email as updater_email, COALESCE(u1.name, u1.email) as creator_name
      FROM models m
      INNER JOIN categories c ON m.category_id = c.id
      INNER JOIN brands b ON m.brand_id = b.id
      INNER JOIN users u1 ON m.created_by = u1.id
      LEFT JOIN users u2 ON m.updated_by = u2.id
      WHERE m.id = ?
    `;
    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Modelo no encontrado.'
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
 * Update model (Admin only)
 */
async function updateModel(req, res, next) {
  const { id } = req.params;
  const { category_id, brand_id, name, description, status } = req.body;
  const updated_by = req.user.id;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del modelo es requerido.'
      });
    }

    // Verify model exists
    const [existing] = await pool.query('SELECT id, category_id, brand_id FROM models WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Modelo no encontrado.'
      });
    }

    const finalCategoryId = category_id !== undefined ? parseInt(category_id) : existing[0].category_id;
    const finalBrandId = brand_id !== undefined ? parseInt(brand_id) : existing[0].brand_id;

    // Check if name is duplicate under the same category and brand
    const [duplicate] = await pool.query(
      'SELECT id FROM models WHERE category_id = ? AND brand_id = ? AND name = ? AND id != ?',
      [finalCategoryId, finalBrandId, name, id]
    );
    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otro modelo con este nombre bajo la misma marca y categoría.'
      });
    }

    await pool.query(
      'UPDATE models SET category_id = ?, brand_id = ?, name = ?, description = ?, status = ?, updated_by = ? WHERE id = ?',
      [finalCategoryId, finalBrandId, name, description || null, status || 'Activo', updated_by, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Modelo actualizado con éxito.',
      data: {
        id: parseInt(id),
        category_id: finalCategoryId,
        brand_id: finalBrandId,
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
 * Delete model (Admin only)
 */
async function deleteModel(req, res, next) {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM models WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Modelo no encontrado.'
      });
    }

    await pool.query('DELETE FROM models WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Modelo eliminado con éxito.'
    });
  } catch (error) {
    next(error);
  }
}


/**
 * Update model status (Admin only)
 */
async function updateModelStatus(req, res, next) {
  const { id } = req.params;
  const { status } = req.body;
  try {
    if (status !== 'Activo' && status !== 'Inactivo') {
      return res.status(400).json({ success: false, message: "El estado debe ser 'Activo' o 'Inactivo'." });
    }
    const [result] = await pool.query('UPDATE `models` SET status = ? WHERE id = ?', [status, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Modelo no encontrado.' });
    }
    return res.status(200).json({ success: true, message: 'Estado actualizado con éxito.', data: { id: parseInt(id), status } });
  } catch (error) { next(error); }
}

/**
 * Import models from Excel or CSV (Admin only)
 */
async function importModels(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo. Debe adjuntar un archivo Excel (.xlsx, .xls) o CSV (.csv) en el campo "file".'
      });
    }

    const userId = req.user.id;
    const result = await importModelsService(req.file.buffer, userId);

    return res.status(200).json({
      success: true,
      message: `Proceso de importación finalizado. Se importaron ${result.imported} modelos nuevos (${result.skipped} duplicados omitidos).`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Download sample template for Models import
 */
async function downloadModelsTemplate(req, res, next) {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase();
    const buffer = generateModelsTemplate(format);
    const contentType = format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const filename = `plantilla_modelos.${format === 'csv' ? 'csv' : 'xlsx'}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createModel,
  getModels,
  getModelById,
  updateModel,
  deleteModel,
  updateModelStatus,
  importModels,
  downloadModelsTemplate
};

