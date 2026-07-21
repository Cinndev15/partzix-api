const { pool } = require('../db/db');

/**
 * Create a new model under a brand (Admin only)
 */
async function createModel(req, res, next) {
  const { brand_id, name, description } = req.body;
  const created_by = req.user.id;

  try {
    if (!brand_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la marca y el nombre del modelo son requeridos.'
      });
    }

    // Verify brand exists
    const [brand] = await pool.query('SELECT id FROM brands WHERE id = ?', [brand_id]);
    if (brand.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'La marca especificada no existe.'
      });
    }

    // Check if model name already exists under this brand
    const [existing] = await pool.query('SELECT id FROM models WHERE brand_id = ? AND name = ?', [brand_id, name]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un modelo con este nombre bajo esta marca.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO models (brand_id, name, description, created_by) VALUES (?, ?, ?, ?)',
      [brand_id, name, description || null, created_by]
    );

    return res.status(201).json({
      success: true,
      message: 'Modelo creado con éxito.',
      data: {
        id: result.insertId,
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
 * Get all models (optional query filter by brandId)
 */
async function getModels(req, res, next) {
  const { brandId } = req.query;

  try {
    let query = `
      SELECT m.id, m.brand_id, b.name as brand_name, m.name, m.description, m.created_at, m.updated_at, 
             u1.email as creator_email, u2.email as updater_email
      FROM models m
      INNER JOIN brands b ON m.brand_id = b.id
      INNER JOIN users u1 ON m.created_by = u1.id
      LEFT JOIN users u2 ON m.updated_by = u2.id
    `;
    const params = [];

    if (brandId) {
      query += ` WHERE m.brand_id = ?`;
      params.push(brandId);
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
      SELECT m.id, m.brand_id, b.name as brand_name, m.name, m.description, m.created_at, m.updated_at, 
             u1.email as creator_email, u2.email as updater_email
      FROM models m
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
    const [existing] = await pool.query('SELECT id, brand_id FROM models WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Modelo no encontrado.'
      });
    }

    const { brand_id } = existing[0];

    // Check if name is duplicate under the same brand
    const [duplicate] = await pool.query(
      'SELECT id FROM models WHERE brand_id = ? AND name = ? AND id != ?',
      [brand_id, name, id]
    );
    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otro modelo con este nombre bajo esta marca.'
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
