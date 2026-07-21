const { pool } = require('../db/db');

/**
 * Create a new line under a category (Admin only)
 */
async function createLine(req, res, next) {
  const { category_id, name, description } = req.body;
  const created_by = req.user.id;

  try {
    if (!category_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la categoría y el nombre de la línea son requeridos.'
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

    // Check if line name already exists under this category
    const [existing] = await pool.query('SELECT id FROM `lines` WHERE category_id = ? AND name = ?', [category_id, name]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una línea con este nombre bajo esta categoría.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO `lines` (category_id, name, description, created_by) VALUES (?, ?, ?, ?)',
      [category_id, name, description || null, created_by]
    );

    return res.status(201).json({
      success: true,
      message: 'Línea creada con éxito.',
      data: {
        id: result.insertId,
        category_id,
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
 * Get all lines (optional query filter by categoryId)
 */
async function getLines(req, res, next) {
  const { categoryId } = req.query;

  try {
    let query = `
      SELECT l.id, l.category_id, c.name as category_name, l.name, l.description, l.created_at, l.updated_at, u.email as creator_email
      FROM \`lines\` l
      INNER JOIN categories c ON l.category_id = c.id
      INNER JOIN users u ON l.created_by = u.id
    `;
    const params = [];

    if (categoryId) {
      query += ` WHERE l.category_id = ?`;
      params.push(categoryId);
    }

    query += ` ORDER BY l.name ASC`;

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
 * Get line by ID
 */
async function getLineById(req, res, next) {
  const { id } = req.params;

  try {
    const query = `
      SELECT l.id, l.category_id, c.name as category_name, l.name, l.description, l.created_at, l.updated_at, u.email as creator_email
      FROM \`lines\` l
      INNER JOIN categories c ON l.category_id = c.id
      INNER JOIN users u ON l.created_by = u.id
      WHERE l.id = ?
    `;
    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Línea no encontrada.'
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
 * Update line (Admin only)
 */
async function updateLine(req, res, next) {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la línea es requerido.'
      });
    }

    // Verify line exists
    const [existing] = await pool.query('SELECT id, category_id FROM `lines` WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Línea no encontrada.'
      });
    }

    const { category_id } = existing[0];

    // Check if name is duplicate under the same category
    const [duplicate] = await pool.query(
      'SELECT id FROM `lines` WHERE category_id = ? AND name = ? AND id != ?',
      [category_id, name, id]
    );
    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otra línea con este nombre bajo esta categoría.'
      });
    }

    await pool.query(
      'UPDATE `lines` SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Línea actualizada con éxito.',
      data: {
        id: parseInt(id),
        category_id,
        name,
        description
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete line (Admin only)
 */
async function deleteLine(req, res, next) {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM `lines` WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Línea no encontrada.'
      });
    }

    await pool.query('DELETE FROM `lines` WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Línea eliminada con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createLine,
  getLines,
  getLineById,
  updateLine,
  deleteLine
};
