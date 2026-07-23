const { pool } = require('../db/db');

/**
 * Create a new displacement under a category (Admin only)
 */
async function createDisplacement(req, res, next) {
  const { category_id, displacement, description } = req.body;
  const created_by = req.user.id;

  try {
    if (!category_id || !displacement) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la categoría y el cilindraje son requeridos.'
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

    // Check if displacement already exists under this category
    const [existing] = await pool.query(
      'SELECT id FROM displacements WHERE category_id = ? AND displacement = ?',
      [category_id, displacement]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe este cilindraje bajo esta categoría.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO displacements (category_id, displacement, description, created_by) VALUES (?, ?, ?, ?)',
      [category_id, displacement, description || null, created_by]
    );

    return res.status(201).json({
      success: true,
      message: 'Cilindraje creado con éxito.',
      data: {
        id: result.insertId,
        category_id,
        displacement,
        description,
        created_by
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all displacements (optional query filter by categoryId)
 */
async function getDisplacements(req, res, next) {
  const { categoryId } = req.query;

  try {
    let query = `
      SELECT d.id, d.category_id, c.name as category_name, d.displacement, d.description, d.created_at, d.updated_at, 
             u1.email as creator_email, u2.email as updater_email
      FROM displacements d
      INNER JOIN categories c ON d.category_id = c.id
      INNER JOIN users u1 ON d.created_by = u1.id
      LEFT JOIN users u2 ON d.updated_by = u2.id
    `;
    const params = [];

    if (categoryId) {
      query += ` WHERE d.category_id = ?`;
      params.push(categoryId);
    }

    query += ` ORDER BY d.displacement ASC`;

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
 * Get displacement by ID
 */
async function getDisplacementById(req, res, next) {
  const { id } = req.params;

  try {
    const query = `
      SELECT d.id, d.category_id, c.name as category_name, d.displacement, d.description, d.created_at, d.updated_at, 
             u1.email as creator_email, u2.email as updater_email
      FROM displacements d
      INNER JOIN categories c ON d.category_id = c.id
      INNER JOIN users u1 ON d.created_by = u1.id
      LEFT JOIN users u2 ON d.updated_by = u2.id
      WHERE d.id = ?
    `;
    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cilindraje no encontrado.'
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
 * Update displacement (Admin only)
 */
async function updateDisplacement(req, res, next) {
  const { id } = req.params;
  const { displacement, description } = req.body;
  const updated_by = req.user.id;

  try {
    if (!displacement) {
      return res.status(400).json({
        success: false,
        message: 'El cilindraje es requerido.'
      });
    }

    // Verify displacement exists
    const [existing] = await pool.query('SELECT id, category_id FROM displacements WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cilindraje no encontrado.'
      });
    }

    const { category_id } = existing[0];

    // Check if duplicate displacement exists under same category
    const [duplicate] = await pool.query(
      'SELECT id FROM displacements WHERE category_id = ? AND displacement = ? AND id != ?',
      [category_id, displacement, id]
    );
    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otro registro con este cilindraje bajo esta categoría.'
      });
    }

    await pool.query(
      'UPDATE displacements SET displacement = ?, description = ?, updated_by = ? WHERE id = ?',
      [displacement, description || null, updated_by, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Cilindraje actualizado con éxito.',
      data: {
        id: parseInt(id),
        category_id,
        displacement,
        description,
        updated_by
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete displacement (Admin only)
 */
async function deleteDisplacement(req, res, next) {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM displacements WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Cilindraje no encontrado.'
      });
    }

    await pool.query('DELETE FROM displacements WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Cilindraje eliminado con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createDisplacement,
  getDisplacements,
  getDisplacementById,
  updateDisplacement,
  deleteDisplacement
};
