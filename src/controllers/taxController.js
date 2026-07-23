const { pool } = require('../db/db');

/**
 * Create a new tax (Admin only)
 */
async function createTax(req, res, next) {
  const { name, rate_percent, description } = req.body;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del impuesto es requerido.'
      });
    }

    if (rate_percent === undefined || rate_percent === null || isNaN(Number(rate_percent))) {
      return res.status(400).json({
        success: false,
        message: 'El porcentaje de la tasa es requerido y debe ser un número.'
      });
    }

    const rate = Number(rate_percent);
    if (rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        message: 'La tasa debe estar entre 0 y 100.'
      });
    }

    // Check if name already exists
    const [existing] = await pool.query('SELECT id FROM taxes WHERE name = ?', [name.trim()]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Este impuesto ya se encuentra registrado.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO taxes (name, rate_percent, description) VALUES (?, ?, ?)',
      [name.trim(), rate, description ? description.trim() : null]
    );

    return res.status(201).json({
      success: true,
      message: 'Impuesto creado con éxito.',
      data: {
        id: result.insertId,
        name: name.trim(),
        rate_percent: rate,
        description
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all taxes
 */
async function getTaxes(req, res, next) {
  try {
    const [rows] = await pool.query('SELECT * FROM taxes ORDER BY rate_percent ASC');
    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get tax by ID
 */
async function getTaxById(req, res, next) {
  const { id } = req.params;

  try {
    const [rows] = await pool.query('SELECT * FROM taxes WHERE id = ?', [id]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Impuesto no encontrado.'
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
 * Update tax (Admin only)
 */
async function updateTax(req, res, next) {
  const { id } = req.params;
  const { name, rate_percent, description } = req.body;

  try {
    const [existingTax] = await pool.query('SELECT * FROM taxes WHERE id = ?', [id]);
    if (existingTax.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Impuesto no encontrado.'
      });
    }

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre del impuesto es requerido.'
      });
    }

    if (rate_percent === undefined || rate_percent === null || isNaN(Number(rate_percent))) {
      return res.status(400).json({
        success: false,
        message: 'El porcentaje de la tasa es requerido y debe ser un número.'
      });
    }

    const rate = Number(rate_percent);
    if (rate < 0 || rate > 100) {
      return res.status(400).json({
        success: false,
        message: 'La tasa debe estar entre 0 y 100.'
      });
    }

    // Check if name is taken by another tax
    const [existingName] = await pool.query('SELECT id FROM taxes WHERE name = ? AND id != ?', [name.trim(), id]);
    if (existingName.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otro impuesto con este nombre.'
      });
    }

    await pool.query(
      'UPDATE taxes SET name = ?, rate_percent = ?, description = ? WHERE id = ?',
      [name.trim(), rate, description ? description.trim() : null, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Impuesto actualizado con éxito.',
      data: {
        id: Number(id),
        name: name.trim(),
        rate_percent: rate,
        description
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete tax (Admin only)
 */
async function deleteTax(req, res, next) {
  const { id } = req.params;

  try {
    const [existingTax] = await pool.query('SELECT * FROM taxes WHERE id = ?', [id]);
    if (existingTax.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Impuesto no encontrado.'
      });
    }

    await pool.query('DELETE FROM taxes WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Impuesto eliminado con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createTax,
  getTaxes,
  getTaxById,
  updateTax,
  deleteTax
};
