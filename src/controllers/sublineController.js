const { pool } = require('../db/db');

/**
 * Create a new subline under a line (Admin only)
 */
async function createSubline(req, res, next) {
  const { line_id, name, description } = req.body;
  const created_by = req.user.id;

  try {
    if (!line_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'El ID de la línea y el nombre de la sublínea son requeridos.'
      });
    }

    // Verify line exists
    const [line] = await pool.query('SELECT id FROM `lines` WHERE id = ?', [line_id]);
    if (line.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'La línea especificada no existe.'
      });
    }

    // Check if subline name already exists under this line
    const [existing] = await pool.query('SELECT id FROM sublines WHERE line_id = ? AND name = ?', [line_id, name]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una sublínea con este nombre bajo esta línea.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO sublines (line_id, name, description, created_by) VALUES (?, ?, ?, ?)',
      [line_id, name, description || null, created_by]
    );

    return res.status(201).json({
      success: true,
      message: 'Sublínea creada con éxito.',
      data: {
        id: result.insertId,
        line_id,
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
 * Get all sublines (optional query filter by lineId)
 */
async function getSublines(req, res, next) {
  const { lineId } = req.query;

  try {
    let query = `
      SELECT s.id, s.line_id, l.name as line_name, s.name, s.description, s.created_at, s.updated_at, u.email as creator_email
      FROM sublines s
      INNER JOIN \`lines\` l ON s.line_id = l.id
      INNER JOIN users u ON s.created_by = u.id
    `;
    const params = [];

    if (lineId) {
      query += ` WHERE s.line_id = ?`;
      params.push(lineId);
    }

    query += ` ORDER BY s.name ASC`;

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
 * Get subline by ID
 */
async function getSublineById(req, res, next) {
  const { id } = req.params;

  try {
    const query = `
      SELECT s.id, s.line_id, l.name as line_name, s.name, s.description, s.created_at, s.updated_at, u.email as creator_email
      FROM sublines s
      INNER JOIN \`lines\` l ON s.line_id = l.id
      INNER JOIN users u ON s.created_by = u.id
      WHERE s.id = ?
    `;
    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sublínea no encontrada.'
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
 * Update subline (Admin only)
 */
async function updateSubline(req, res, next) {
  const { id } = req.params;
  const { name, description } = req.body;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la sublínea es requerido.'
      });
    }

    // Verify subline exists
    const [existing] = await pool.query('SELECT id, line_id FROM sublines WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sublínea no encontrada.'
      });
    }

    const { line_id } = existing[0];

    // Check if name is duplicate under the same line
    const [duplicate] = await pool.query(
      'SELECT id FROM sublines WHERE line_id = ? AND name = ? AND id != ?',
      [line_id, name, id]
    );
    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otra sublínea con este nombre bajo esta línea.'
      });
    }

    await pool.query(
      'UPDATE sublines SET name = ?, description = ? WHERE id = ?',
      [name, description || null, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Sublínea actualizada con éxito.',
      data: {
        id: parseInt(id),
        line_id,
        name,
        description
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete subline (Admin only)
 */
async function deleteSubline(req, res, next) {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM sublines WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Sublínea no encontrada.'
      });
    }

    await pool.query('DELETE FROM sublines WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Sublínea eliminada con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createSubline,
  getSublines,
  getSublineById,
  updateSubline,
  deleteSubline
};
