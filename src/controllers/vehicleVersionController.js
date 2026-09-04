const { pool } = require('../db/db');
const {
  importVersions: importVersionsService,
  generateVersionsTemplate
} = require('../services/importService');

/**
 * Create a new vehicle version under a model (Admin only)
 */
async function createVersion(req, res, next) {
  const { model_id, name, description, status } = req.body;
  const created_by = req.user.id;

  try {
    if (!model_id || !name) {
      return res.status(400).json({
        success: false,
        message: 'El ID del modelo y el nombre de la versión son requeridos.'
      });
    }

    // Verify model exists
    const [model] = await pool.query('SELECT id, category_id, brand_id FROM models WHERE id = ?', [model_id]);
    if (model.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El modelo de vehículo especificado no existe.'
      });
    }

    // Check if version name already exists under this model
    const [existing] = await pool.query(
      'SELECT id FROM vehicle_versions WHERE model_id = ? AND name = ?',
      [model_id, name]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una versión con este nombre para el modelo especificado.'
      });
    }

    const versionStatus = status && status.toLowerCase() === 'inactivo' ? 'Inactivo' : 'Activo';

    const [result] = await pool.query(
      'INSERT INTO vehicle_versions (model_id, name, description, status, created_by) VALUES (?, ?, ?, ?, ?)',
      [model_id, name, description || null, versionStatus, created_by]
    );

    return res.status(201).json({
      success: true,
      message: 'Versión de vehículo creada con éxito.',
      data: {
        id: result.insertId,
        model_id: parseInt(model_id),
        name,
        description: description || null,
        status: versionStatus,
        created_by
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all vehicle versions (optional filters by modelId, brandId, categoryId, status)
 */
async function getVersions(req, res, next) {
  const { modelId, brandId, categoryId, status } = req.query;

  try {
    let query = `
      SELECT v.id, v.model_id, m.name as model_name, 
             m.brand_id, b.name as brand_name,
             m.category_id, c.name as category_name,
             v.name, v.description, v.status, v.created_at, v.updated_at,
             u1.email as creator_email, u2.email as updater_email, 
             COALESCE(u1.name, u1.email) as creator_name
      FROM vehicle_versions v
      INNER JOIN models m ON v.model_id = m.id
      INNER JOIN brands b ON m.brand_id = b.id
      INNER JOIN categories c ON m.category_id = c.id
      INNER JOIN users u1 ON v.created_by = u1.id
      LEFT JOIN users u2 ON v.updated_by = u2.id
    `;
    const params = [];
    const whereClauses = [];

    if (modelId) {
      whereClauses.push(`v.model_id = ?`);
      params.push(modelId);
    }

    if (brandId) {
      whereClauses.push(`m.brand_id = ?`);
      params.push(brandId);
    }

    if (categoryId) {
      whereClauses.push(`m.category_id = ?`);
      params.push(categoryId);
    }

    if (status) {
      whereClauses.push(`v.status = ?`);
      params.push(status);
    }

    if (whereClauses.length > 0) {
      query += ` WHERE ` + whereClauses.join(' AND ');
    }

    query += ` ORDER BY v.name ASC`;

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
 * Get vehicle version by ID
 */
async function getVersionById(req, res, next) {
  const { id } = req.params;

  try {
    const query = `
      SELECT v.id, v.model_id, m.name as model_name, 
             m.brand_id, b.name as brand_name,
             m.category_id, c.name as category_name,
             v.name, v.description, v.status, v.created_at, v.updated_at,
             u1.email as creator_email, u2.email as updater_email, 
             COALESCE(u1.name, u1.email) as creator_name
      FROM vehicle_versions v
      INNER JOIN models m ON v.model_id = m.id
      INNER JOIN brands b ON m.brand_id = b.id
      INNER JOIN categories c ON m.category_id = c.id
      INNER JOIN users u1 ON v.created_by = u1.id
      LEFT JOIN users u2 ON v.updated_by = u2.id
      WHERE v.id = ?
    `;
    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Versión de vehículo no encontrada.'
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
 * Update vehicle version (Admin only)
 */
async function updateVersion(req, res, next) {
  const { id } = req.params;
  const { model_id, name, description, status } = req.body;
  const updated_by = req.user.id;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la versión es requerido.'
      });
    }

    // Verify version exists
    const [existing] = await pool.query('SELECT id, model_id FROM vehicle_versions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Versión de vehículo no encontrada.'
      });
    }

    const finalModelId = model_id !== undefined ? parseInt(model_id) : existing[0].model_id;

    // Verify model exists if model_id is being updated
    if (model_id !== undefined) {
      const [modelExists] = await pool.query('SELECT id FROM models WHERE id = ?', [finalModelId]);
      if (modelExists.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'El modelo especificado no existe.'
        });
      }
    }

    // Check if duplicate name under same model
    const [duplicate] = await pool.query(
      'SELECT id FROM vehicle_versions WHERE model_id = ? AND name = ? AND id != ?',
      [finalModelId, name, id]
    );
    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otra versión con este nombre bajo el mismo modelo.'
      });
    }

    const versionStatus = status && status.toLowerCase() === 'inactivo' ? 'Inactivo' : 'Activo';

    await pool.query(
      'UPDATE vehicle_versions SET model_id = ?, name = ?, description = ?, status = ?, updated_by = ? WHERE id = ?',
      [finalModelId, name, description !== undefined ? description : null, versionStatus, updated_by, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Versión de vehículo actualizada con éxito.',
      data: {
        id: parseInt(id),
        model_id: finalModelId,
        name,
        description: description !== undefined ? description : null,
        status: versionStatus,
        updated_by
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update vehicle version status (Admin only)
 */
async function updateVersionStatus(req, res, next) {
  const { id } = req.params;
  const { status } = req.body;
  const updated_by = req.user.id;

  try {
    if (status !== 'Activo' && status !== 'Inactivo') {
      return res.status(400).json({
        success: false,
        message: "El estado debe ser 'Activo' o 'Inactivo'."
      });
    }

    const [result] = await pool.query(
      'UPDATE vehicle_versions SET status = ?, updated_by = ? WHERE id = ?',
      [status, updated_by, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Versión de vehículo no encontrada.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Estado actualizado con éxito.',
      data: {
        id: parseInt(id),
        status
      }
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Delete vehicle version (Admin only)
 */
async function deleteVersion(req, res, next) {
  const { id } = req.params;

  try {
    const [existing] = await pool.query('SELECT id FROM vehicle_versions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Versión de vehículo no encontrada.'
      });
    }

    await pool.query('DELETE FROM vehicle_versions WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Versión de vehículo eliminada con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Import vehicle versions from Excel or CSV (Admin only)
 */
async function importVersions(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No se ha proporcionado ningún archivo. Debe adjuntar un archivo Excel (.xlsx, .xls) o CSV (.csv) en el campo "file".'
      });
    }

    const userId = req.user.id;
    const result = await importVersionsService(req.file.buffer, userId);

    return res.status(200).json({
      success: true,
      message: `Proceso de importación finalizado. Se importaron ${result.imported} versiones nuevas (${result.skipped} duplicadas omitidas).`,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Download sample template for Vehicle Versions import
 */
async function downloadVersionsTemplate(req, res, next) {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase();
    const buffer = generateVersionsTemplate(format);
    const contentType = format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const filename = `plantilla_versiones_vehiculo.${format === 'csv' ? 'csv' : 'xlsx'}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(buffer);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createVersion,
  getVersions,
  getVersionById,
  updateVersion,
  updateVersionStatus,
  deleteVersion,
  importVersions,
  downloadVersionsTemplate
};
