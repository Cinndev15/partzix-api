const { pool } = require('../db/db');

/**
 * Create a new year (Admin only)
 */
async function createYear(req, res, next) {
  const { year } = req.body;
  const created_by = req.user.id;

  try {
    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'El año es requerido.'
      });
    }

    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Por favor ingrese un año válido (entre 1900 y 2100).'
      });
    }

    // Check if year already exists
    const [existing] = await pool.query('SELECT id FROM years WHERE year = ?', [yearNum]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Este año ya se encuentra registrado.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO years (year, created_by) VALUES (?, ?)',
      [yearNum, created_by]
    );

    return res.status(201).json({
      success: true,
      message: 'Año creado con éxito.',
      data: {
        id: result.insertId,
        year: yearNum,
        created_by
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all years
 */
async function getYears(req, res, next) {
  try {
    const query = `
      SELECT y.id, y.year, y.created_at, y.updated_at, u.email as creator_email
      FROM years y
      INNER JOIN users u ON y.created_by = u.id
      ORDER BY y.year DESC
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
 * Get year by ID
 */
async function getYearById(req, res, next) {
  const { id } = req.params;

  try {
    const query = `
      SELECT y.id, y.year, y.created_at, y.updated_at, u.email as creator_email
      FROM years y
      INNER JOIN users u ON y.created_by = u.id
      WHERE y.id = ?
    `;
    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Año no encontrado.'
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
 * Update year (Admin only)
 */
async function updateYear(req, res, next) {
  const { id } = req.params;
  const { year } = req.body;

  try {
    if (!year) {
      return res.status(400).json({
        success: false,
        message: 'El año es requerido.'
      });
    }

    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > 2100) {
      return res.status(400).json({
        success: false,
        message: 'Por favor ingrese un año válido.'
      });
    }

    // Verify year exists
    const [existing] = await pool.query('SELECT id FROM years WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Año no encontrado.'
      });
    }

    // Check if year value is taken by another entry
    const [duplicate] = await pool.query('SELECT id FROM years WHERE year = ? AND id != ?', [yearNum, id]);
    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Este año ya se encuentra registrado con otro ID.'
      });
    }

    await pool.query('UPDATE years SET year = ? WHERE id = ?', [yearNum, id]);

    return res.status(200).json({
      success: true,
      message: 'Año actualizado con éxito.',
      data: {
        id: parseInt(id),
        year: yearNum
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete year (Admin only)
 */
async function deleteYear(req, res, next) {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM years WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Año no encontrado.'
      });
    }

    await pool.query('DELETE FROM years WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Año eliminado con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createYear,
  getYears,
  getYearById,
  updateYear,
  deleteYear
};
