const { pool } = require('../db/db');

/**
 * Create a new product brand under a warehouse
 */
async function createProductBrand(req, res, next) {
  const { name, description } = req.body;
  let { warehouse_id } = req.body;
  const created_by = req.user.id;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la marca de producto es requerido.'
      });
    }

    // Determine warehouse_id based on user role
    if (req.user.role === 'warehouse') {
      warehouse_id = req.user.warehouse_id;
    } else if (req.user.role === 'admin') {
      if (!warehouse_id) {
        return res.status(400).json({
          success: false,
          message: 'El ID del almacén (warehouse_id) es requerido para administradores.'
        });
      }
    }

    // Verify warehouse exists
    const [warehouse] = await pool.query('SELECT id FROM warehouses WHERE id = ?', [warehouse_id]);
    if (warehouse.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'El almacén especificado no existe.'
      });
    }

    // Check if name is already taken in the same warehouse
    const [existing] = await pool.query(
      'SELECT id FROM product_brands WHERE warehouse_id = ? AND name = ?',
      [warehouse_id, name]
    );
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe una marca de producto con este nombre en este almacén.'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO product_brands (warehouse_id, name, description, created_by) VALUES (?, ?, ?, ?)',
      [warehouse_id, name, description || null, created_by]
    );

    return res.status(201).json({
      success: true,
      message: 'Marca de producto creada con éxito.',
      data: {
        id: result.insertId,
        warehouse_id,
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
 * Get all product brands (warehouse filters by their own warehouse, admin can see all or filter by warehouse_id)
 */
async function getProductBrands(req, res, next) {
  const { warehouseId } = req.query;

  try {
    let query = `
      SELECT pb.id, pb.warehouse_id, w.name as warehouse_name, pb.name, pb.description, pb.created_at, pb.updated_at,
             u1.email as creator_email, u2.email as updater_email
      FROM product_brands pb
      INNER JOIN warehouses w ON pb.warehouse_id = w.id
      INNER JOIN users u1 ON pb.created_by = u1.id
      LEFT JOIN users u2 ON pb.updated_by = u2.id
    `;
    const params = [];

    if (req.user.role === 'warehouse') {
      query += ` WHERE pb.warehouse_id = ?`;
      params.push(req.user.warehouse_id);
    } else if (req.user.role === 'admin' && warehouseId) {
      query += ` WHERE pb.warehouse_id = ?`;
      params.push(warehouseId);
    }

    query += ` ORDER BY pb.name ASC`;

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
 * Get product brand by ID
 */
async function getProductBrandById(req, res, next) {
  const { id } = req.params;

  try {
    const query = `
      SELECT pb.id, pb.warehouse_id, w.name as warehouse_name, pb.name, pb.description, pb.created_at, pb.updated_at,
             u1.email as creator_email, u2.email as updater_email
      FROM product_brands pb
      INNER JOIN warehouses w ON pb.warehouse_id = w.id
      INNER JOIN users u1 ON pb.created_by = u1.id
      LEFT JOIN users u2 ON pb.updated_by = u2.id
      WHERE pb.id = ?
    `;
    const [rows] = await pool.query(query, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marca de producto no encontrada.'
      });
    }

    const brand = rows[0];

    // Access control: warehouse user can only view their own warehouse's product brands
    if (req.user.role === 'warehouse' && brand.warehouse_id !== req.user.warehouse_id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para ver esta marca de producto.'
      });
    }

    return res.status(200).json({
      success: true,
      data: brand
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update product brand
 */
async function updateProductBrand(req, res, next) {
  const { id } = req.params;
  const { name, description } = req.body;
  const updated_by = req.user.id;

  try {
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'El nombre de la marca de producto es requerido.'
      });
    }

    // Verify product brand exists
    const [existing] = await pool.query('SELECT id, warehouse_id FROM product_brands WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marca de producto no encontrada.'
      });
    }

    const brand = existing[0];

    // Access control: warehouse user can only update their own warehouse's product brands
    if (req.user.role === 'warehouse' && brand.warehouse_id !== req.user.warehouse_id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para modificar esta marca de producto.'
      });
    }

    // Check duplicate name in same warehouse
    const [duplicate] = await pool.query(
      'SELECT id FROM product_brands WHERE warehouse_id = ? AND name = ? AND id != ?',
      [brand.warehouse_id, name, id]
    );
    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe otra marca de producto con este nombre en este almacén.'
      });
    }

    await pool.query(
      'UPDATE product_brands SET name = ?, description = ?, updated_by = ? WHERE id = ?',
      [name, description || null, updated_by, id]
    );

    return res.status(200).json({
      success: true,
      message: 'Marca de producto actualizada con éxito.',
      data: {
        id: parseInt(id),
        warehouse_id: brand.warehouse_id,
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
 * Delete product brand
 */
async function deleteProductBrand(req, res, next) {
  const { id } = req.params;

  try {
    // Verify product brand exists
    const [existing] = await pool.query('SELECT id, warehouse_id FROM product_brands WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Marca de producto no encontrada.'
      });
    }

    const brand = existing[0];

    // Access control: warehouse user can only delete their own warehouse's product brands
    if (req.user.role === 'warehouse' && brand.warehouse_id !== req.user.warehouse_id) {
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para eliminar esta marca de producto.'
      });
    }

    await pool.query('DELETE FROM product_brands WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Marca de producto eliminada con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  createProductBrand,
  getProductBrands,
  getProductBrandById,
  updateProductBrand,
  deleteProductBrand
};
