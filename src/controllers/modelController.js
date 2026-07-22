const { pool } = require('../db/db');

/**
 * Create a new model under a brand and a category (Admin only)
 */
async function createModel(req, res, next) {
  const { category_id, brand_id, name, description } = req.body;
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
      'INSERT INTO models (category_id, brand_id, name, description, created_by) VALUES (?, ?, ?, ?, ?)',
      [category_id, brand_id, name, description || null, created_by]
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
             m.name, m.description, m.created_at, m.updated_at, 
             u1.email as creator_email, u2.email as updater_email
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
             m.name, m.description, m.created_at, m.updated_at, 
             u1.email as creator_email, u2.email as updater_email
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
  const { name, description } = req.body;
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

    const { category_id, brand_id } = existing[0];

    // Check if name is duplicate under the same category and brand
    const [duplicate] = await pool.query(
      'SELECT id FROM models WHERE category_id = ? AND brand_id = ? AND name = ? AND id != ?',
      [category_id, brand_id, name, id]
    );
    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otro modelo con este nombre bajo la misma marca y categoría.'
      });
    }

    await pool.query(
      'UPDATE models SET name = ?, description = ?, updated_by = ? WHERE id = ?',
      [name, description || null, updated_by, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Modelo actualizado con éxito.',
      data: {
        id: parseInt(id),
        category_id,
        brand_id,
        name,
        description,
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

module.exports = {
  createModel,
  getModels,
  getModelById,
  updateModel,
  deleteModel
};
