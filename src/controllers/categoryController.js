const { pool } = require('../db/db');

/**
 * Create a new category (Admin only)
 */
async function createCategory(req, res, next) {
  const { name, description } = req.body;
  const created_by = req.user.id;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es requerido.'
      });
    }

    // Check if category name already exists
    const [existing] = await pool.query('SELECT id FROM categories WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una categoría con este nombre.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (name, description, created_by) VALUES (?, ?, ?)',
      [name, description || null, created_by]
    );

    return res.status(201).json({
      success: true,
      message: 'Categoría creada con éxito.',
      data: {
        id: result.insertId,
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
 * Get all categories
 */
async function getCategories(req, res, next) {
  try {
    const query = `
      SELECT c.id, c.name, c.description, c.created_at, c.updated_at, u.email as creator_email
      FROM categories c
      INNER JOIN users u ON c.created_by = u.id
      ORDER BY c.name ASC
    `;
    const [rows] = await pool.query(query);

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get category by ID
 */
async function getCategoryById(req, res, next) {
  const { id } = req.params;

  try {
    const query = `
      SELECT c.id, c.name, c.description, c.created_at, c.updated_at, u.email as creator_email
      FROM categories c
      INNER JOIN users u ON c.created_by = u.id
      WHERE c.id = ?
    `;
    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada.'
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
 * Update category (Admin only)
 */
async function updateCategory(req, res, next) {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la categoría es requerido.'
      });
    }

    // Verify category exists
    const [existing] = await pool.query('SELECT id FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada.'
      });
    }

    // Check if name is taken by another category
    const [duplicate] = await pool.query('SELECT id FROM categories WHERE name = ? AND id != ?', [name, id]);
    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otra categoría con este nombre.'
      });
    }

    await pool.query(
      'UPDATE categories SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Categoría actualizada con éxito.',
      data: {
        id: parseInt(id),
        name,
        description
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete category (Admin only)
 */
async function deleteCategory(req, res, next) {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM categories WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada.'
      });
    }

    await pool.query('DELETE FROM categories WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Categoría eliminada con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createCategory,
  getCategories,
  getCategoryById,
  updateCategory,
  deleteCategory
};
