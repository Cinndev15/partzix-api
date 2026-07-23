const fs = require('fs');
const path = require('path');
const { pool } = require('../db/db');

// Helper to parse arrays from multipart/form-data
function parseArrayField(field) {
  if (!field) return [];
  if (Array.isArray(field)) return field.map(Number);
  try {
    const parsed = JSON.parse(field);
    return Array.isArray(parsed) ? parsed.map(Number) : [Number(parsed)];
  } catch (error) {
    if (typeof field === 'string') {
      return field.split(',').map(item => Number(item.trim())).filter(val => !isNaN(val));
    }
    return [Number(field)];
  }
}

// Helper to generate a unique consecutive code KPXXXXXX (6 random digits)
async function generateConsecutiveCode() {
  let unique = false;
  let code = '';
  while (!unique) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    code = `KP${randomDigits}`;
    const [rows] = await pool.query('SELECT id FROM products WHERE consecutive_code = ?', [code]);
    if (rows.length === 0) {
      unique = true;
    }
  }
  return code;
}

/**
 * Get all available taxes
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
 * Create a new product
 */
async function createProduct(req, res, next) {
  const files = req.files || [];
  const created_by = req.user.id;

  const {
    sku,
    commercial_name,
    factory_reference,
    stock_units,
    purchase_price,
    profit_percent,
    product_brand_id,
    category_id,
    line_id,
    subline_id,
    provider_profile_id,
    physical_condition,
    status,
    is_featured,
    spare_part_type,
    mechanical_position,
    vehicle_side,
    compatible_transmission_type,
    technical_description,
    // Compatibilities & Taxes
    model_ids,
    year_ids,
    displacement_ids,
    tax_ids
  } = req.body;

  let { warehouse_id } = req.body;

  try {
    // Resolve warehouse_id
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

    // Verify warehouse
    const [warehouse] = await pool.query('SELECT id FROM warehouses WHERE id = ?', [warehouse_id]);
    if (warehouse.length === 0) {
      return res.status(404).json({ success: false, message: 'El almacén especificado no existe.' });
    }

    // Validate required fields
    if (!sku || !commercial_name || stock_units === undefined || purchase_price === undefined || profit_percent === undefined || !category_id) {
      return res.status(400).json({
        success: false,
        message: 'Los campos sku, nombre comercial, stock, precio compra, ganancia % y categoría son obligatorios.'
      });
    }

    // Check SKU duplicate in the same warehouse
    const [existingSku] = await pool.query(
      'SELECT id FROM products WHERE warehouse_id = ? AND sku = ?',
      [warehouse_id, sku]
    );
    if (existingSku.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Ya existe un producto con este SKU en este almacén.'
      });
    }

    // Calculate sale price
    const pPrice = parseFloat(purchase_price);
    const pProfit = parseFloat(profit_percent);
    const sale_price = pPrice + (pPrice * pProfit / 100);

    // Generate consecutive code
    const consecutive_code = await generateConsecutiveCode();

    // Insert Product
    const [result] = await pool.query(
      `INSERT INTO products (
        warehouse_id, sku, commercial_name, factory_reference, stock_units, purchase_price, profit_percent, sale_price,
        product_brand_id, category_id, line_id, subline_id, provider_profile_id, consecutive_code, physical_condition,
        status, is_featured, spare_part_type, mechanical_position, vehicle_side, compatible_transmission_type,
        technical_description, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        warehouse_id, sku, commercial_name, factory_reference || null, stock_units, pPrice, pProfit, sale_price,
        product_brand_id || null, category_id, line_id || null, subline_id || null, provider_profile_id || null,
        consecutive_code, physical_condition || 'Nuevo (Garantizado)', status || 'Activo (Visible en tienda)',
        is_featured === 'true' || is_featured === true || false, spare_part_type || 'Genérico',
        mechanical_position || null, vehicle_side || null, compatible_transmission_type || null,
        technical_description || null, created_by
      ]
    );

    const productId = result.insertId;

    // Save compatibility relations
    const parsedModels = parseArrayField(model_ids);
    for (const mId of parsedModels) {
      await pool.query('INSERT IGNORE INTO product_models (product_id, model_id) VALUES (?, ?)', [productId, mId]);
    }

    const parsedYears = parseArrayField(year_ids);
    for (const yId of parsedYears) {
      await pool.query('INSERT IGNORE INTO product_years (product_id, year_id) VALUES (?, ?)', [productId, yId]);
    }

    const parsedDisplacements = parseArrayField(displacement_ids);
    for (const dId of parsedDisplacements) {
      await pool.query('INSERT IGNORE INTO product_displacements (product_id, displacement_id) VALUES (?, ?)', [productId, dId]);
    }

    // Save tax relations
    const parsedTaxes = parseArrayField(tax_ids);
    for (const tId of parsedTaxes) {
      await pool.query('INSERT IGNORE INTO product_taxes (product_id, tax_id) VALUES (?, ?)', [productId, tId]);
    }

    // Save uploaded images
    const imagesData = [];
    for (let i = 0; i < files.length; i++) {
      const isMain = i === 0; // First image as main
      const imagePath = `/uploads/${files[i].filename}`;
      const [imgResult] = await pool.query(
        'INSERT INTO product_images (product_id, image_path, is_main) VALUES (?, ?, ?)',
        [productId, imagePath, isMain]
      );
      imagesData.push({
        id: imgResult.insertId,
        image_path: imagePath,
        is_main: isMain
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Producto creado con éxito.',
      data: {
        id: productId,
        consecutive_code,
        sku,
        commercial_name,
        sale_price,
        images: imagesData
      }
    });

  } catch (error) {
    // Delete files in case of failure
    files.forEach(f => {
      fs.unlink(f.path, err => {
        if (err) console.error(`Error deleting file: ${f.path}`, err.message);
      });
    });
    next(error);
  }
}

/**
 * Get all products (with paginated/filtered queries)
 */
async function getProducts(req, res, next) {
  const { warehouseId, categoryId, lineId, sublineId, search } = req.query;

  try {
    let query = `
      SELECT p.*, pb.name as product_brand_name, c.name as category_name, l.name as line_name, sl.name as subline_name,
             w.name as warehouse_name
      FROM products p
      INNER JOIN warehouses w ON p.warehouse_id = w.id
      INNER JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_brands pb ON p.product_brand_id = pb.id
      LEFT JOIN lines l ON p.line_id = l.id
      LEFT JOIN sublines sl ON p.subline_id = sl.id
    `;
    const params = [];
    const conditions = [];

    // Filter by role / ownership
    if (req.user.role === 'warehouse') {
      conditions.push('p.warehouse_id = ?');
      params.push(req.user.warehouse_id);
    } else if (warehouseId) {
      conditions.push('p.warehouse_id = ?');
      params.push(warehouseId);
    }

    if (categoryId) {
      conditions.push('p.category_id = ?');
      params.push(categoryId);
    }
    if (lineId) {
      conditions.push('p.line_id = ?');
      params.push(lineId);
    }
    if (sublineId) {
      conditions.push('p.subline_id = ?');
      params.push(sublineId);
    }
    if (search) {
      conditions.push('(p.commercial_name LIKE ? OR p.sku LIKE ? OR p.consecutive_code LIKE ?)');
      const searchPattern = `%${search}%`;
      params.push(searchPattern, searchPattern, searchPattern);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY p.created_at DESC';

    const [rows] = await pool.query(query, params);

    // Fetch primary image for each product to show in the list
    for (const row of rows) {
      const [images] = await pool.query('SELECT image_path FROM product_images WHERE product_id = ? ORDER BY is_main DESC, id ASC LIMIT 1', [row.id]);
      row.main_image = images.length > 0 ? images[0].image_path : null;
    }

    return res.status(200).json({
      success: true,
      data: rows
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get detailed product by ID
 */
async function getProductById(req, res, next) {
  const { id } = req.params;

  try {
    const query = `
      SELECT p.*, pb.name as product_brand_name, c.name as category_name, l.name as line_name, sl.name as subline_name,
             w.name as warehouse_name
      FROM products p
      INNER JOIN warehouses w ON p.warehouse_id = w.id
      INNER JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_brands pb ON p.product_brand_id = pb.id
      LEFT JOIN lines l ON p.line_id = l.id
      LEFT JOIN sublines sl ON p.subline_id = sl.id
      WHERE p.id = ?
    `;
    const [products] = await pool.query(query, [id]);

    if (products.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    const product = products[0];

    // Ownership check
    if (req.user.role === 'warehouse' && product.warehouse_id !== req.user.warehouse_id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para ver este producto.' });
    }

    // Load related details
    const [images] = await pool.query('SELECT id, image_path, is_main FROM product_images WHERE product_id = ? ORDER BY is_main DESC, id ASC', [id]);
    const [models] = await pool.query('SELECT m.id, m.name, b.name as brand_name FROM product_models pm INNER JOIN models m ON pm.model_id = m.id INNER JOIN brands b ON m.brand_id = b.id WHERE pm.product_id = ?', [id]);
    const [years] = await pool.query('SELECT y.id, y.year FROM product_years py INNER JOIN years y ON py.year_id = y.id WHERE py.product_id = ?', [id]);
    const [displacements] = await pool.query('SELECT d.id, d.displacement FROM product_displacements pd INNER JOIN displacements d ON pd.displacement_id = d.id WHERE pd.product_id = ?', [id]);
    const [taxes] = await pool.query('SELECT t.id, t.name, t.rate_percent FROM product_taxes pt INNER JOIN taxes t ON pt.tax_id = t.id WHERE pt.product_id = ?', [id]);

    product.images = images;
    product.compatible_models = models;
    product.compatible_years = years;
    product.compatible_displacements = displacements;
    product.applicable_taxes = taxes;

    return res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update product details
 */
async function updateProduct(req, res, next) {
  const { id } = req.params;
  const files = req.files || [];
  const updated_by = req.user.id;

  const {
    sku,
    commercial_name,
    factory_reference,
    stock_units,
    purchase_price,
    profit_percent,
    product_brand_id,
    category_id,
    line_id,
    subline_id,
    provider_profile_id,
    physical_condition,
    status,
    is_featured,
    spare_part_type,
    mechanical_position,
    vehicle_side,
    compatible_transmission_type,
    technical_description,
    // Compatibilities, Taxes & Image Deletion
    model_ids,
    year_ids,
    displacement_ids,
    tax_ids,
    delete_image_ids
  } = req.body;

  try {
    // Check if product exists
    const [product] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (product.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    const currentProduct = product[0];

    // Ownership check
    if (req.user.role === 'warehouse' && currentProduct.warehouse_id !== req.user.warehouse_id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para modificar este producto.' });
    }

    // Validate SKU uniqueness
    if (sku && sku !== currentProduct.sku) {
      const [existingSku] = await pool.query(
        'SELECT id FROM products WHERE warehouse_id = ? AND sku = ? AND id != ?',
        [currentProduct.warehouse_id, sku, id]
      );
      if (existingSku.length > 0) {
        return res.status(400).json({ success: false, message: 'Ya existe otro producto con este SKU.' });
      }
    }

    // Calculate sale price
    const pPrice = purchase_price !== undefined ? parseFloat(purchase_price) : parseFloat(currentProduct.purchase_price);
    const pProfit = profit_percent !== undefined ? parseFloat(profit_percent) : parseFloat(currentProduct.profit_percent);
    const sale_price = pPrice + (pPrice * pProfit / 100);

    // Update Product Record
    await pool.query(
      `UPDATE products SET
        sku = ?, commercial_name = ?, factory_reference = ?, stock_units = ?, purchase_price = ?, profit_percent = ?,
        sale_price = ?, product_brand_id = ?, category_id = ?, line_id = ?, subline_id = ?, provider_profile_id = ?,
        physical_condition = ?, status = ?, is_featured = ?, spare_part_type = ?, mechanical_position = ?,
        vehicle_side = ?, compatible_transmission_type = ?, technical_description = ?, updated_by = ?
      WHERE id = ?`,
      [
        sku || currentProduct.sku,
        commercial_name || currentProduct.commercial_name,
        factory_reference !== undefined ? factory_reference : currentProduct.factory_reference,
        stock_units !== undefined ? stock_units : currentProduct.stock_units,
        pPrice,
        pProfit,
        sale_price,
        product_brand_id !== undefined ? product_brand_id : currentProduct.product_brand_id,
        category_id || currentProduct.category_id,
        line_id !== undefined ? line_id : currentProduct.line_id,
        subline_id !== undefined ? subline_id : currentProduct.subline_id,
        provider_profile_id !== undefined ? provider_profile_id : currentProduct.provider_profile_id,
        physical_condition || currentProduct.physical_condition,
        status || currentProduct.status,
        is_featured !== undefined ? (is_featured === 'true' || is_featured === true) : currentProduct.is_featured,
        spare_part_type || currentProduct.spare_part_type,
        mechanical_position !== undefined ? mechanical_position : currentProduct.mechanical_position,
        vehicle_side !== undefined ? vehicle_side : currentProduct.vehicle_side,
        compatible_transmission_type !== undefined ? compatible_transmission_type : currentProduct.compatible_transmission_type,
        technical_description !== undefined ? technical_description : currentProduct.technical_description,
        updated_by,
        id
      ]
    );

    // Update Compatibilities if provided
    if (model_ids !== undefined) {
      await pool.query('DELETE FROM product_models WHERE product_id = ?', [id]);
      const parsedModels = parseArrayField(model_ids);
      for (const mId of parsedModels) {
        await pool.query('INSERT IGNORE INTO product_models (product_id, model_id) VALUES (?, ?)', [id, mId]);
      }
    }

    if (year_ids !== undefined) {
      await pool.query('DELETE FROM product_years WHERE product_id = ?', [id]);
      const parsedYears = parseArrayField(year_ids);
      for (const yId of parsedYears) {
        await pool.query('INSERT IGNORE INTO product_years (product_id, year_id) VALUES (?, ?)', [id, yId]);
      }
    }

    if (displacement_ids !== undefined) {
      await pool.query('DELETE FROM product_displacements WHERE product_id = ?', [id]);
      const parsedDisplacements = parseArrayField(displacement_ids);
      for (const dId of parsedDisplacements) {
        await pool.query('INSERT IGNORE INTO product_displacements (product_id, displacement_id) VALUES (?, ?)', [id, dId]);
      }
    }

    // Update Taxes if provided
    if (tax_ids !== undefined) {
      await pool.query('DELETE FROM product_taxes WHERE product_id = ?', [id]);
      const parsedTaxes = parseArrayField(tax_ids);
      for (const tId of parsedTaxes) {
        await pool.query('INSERT IGNORE INTO product_taxes (product_id, tax_id) VALUES (?, ?)', [id, tId]);
      }
    }

    // Delete selected images
    const parsedDeleteImageIds = parseArrayField(delete_image_ids);
    if (parsedDeleteImageIds.length > 0) {
      const [imgRows] = await pool.query('SELECT * FROM product_images WHERE product_id = ? AND id IN (?)', [id, parsedDeleteImageIds]);
      for (const img of imgRows) {
        const fullPath = path.join(__dirname, '../..', img.image_path);
        fs.unlink(fullPath, err => {
          if (err) console.error(`Error deleting file from disk: ${fullPath}`, err.message);
        });
        await pool.query('DELETE FROM product_images WHERE id = ?', [img.id]);
      }
    }

    // Save new uploaded images
    for (const f of files) {
      const imagePath = `/uploads/${f.filename}`;
      // Check if there is already a main image
      const [hasMain] = await pool.query('SELECT id FROM product_images WHERE product_id = ? AND is_main = TRUE', [id]);
      const isMain = hasMain.length === 0; // If no main image exists, make this the main
      await pool.query('INSERT INTO product_images (product_id, image_path, is_main) VALUES (?, ?, ?)', [id, imagePath, isMain]);
    }

    return res.status(200).json({
      success: true,
      message: 'Producto actualizado con éxito.'
    });

  } catch (error) {
    files.forEach(f => {
      fs.unlink(f.path, err => {
        if (err) console.error(`Error deleting file: ${f.path}`, err.message);
      });
    });
    next(error);
  }
}

/**
 * Delete product
 */
async function deleteProduct(req, res, next) {
  const { id } = req.params;

  try {
    const [product] = await pool.query('SELECT warehouse_id FROM products WHERE id = ?', [id]);
    if (product.length === 0) {
      return res.status(404).json({ success: false, message: 'Producto no encontrado.' });
    }

    // Ownership check
    if (req.user.role === 'warehouse' && product[0].warehouse_id !== req.user.warehouse_id) {
      return res.status(403).json({ success: false, message: 'No tienes permiso para eliminar este producto.' });
    }

    // Fetch all image paths to delete files from disk
    const [images] = await pool.query('SELECT image_path FROM product_images WHERE product_id = ?', [id]);
    for (const img of images) {
      const fullPath = path.join(__dirname, '../..', img.image_path);
      fs.unlink(fullPath, err => {
        if (err) console.error(`Error deleting file from disk: ${fullPath}`, err.message);
      });
    }

    // Delete product from database (cascade deletes compatibility, taxes and images)
    await pool.query('DELETE FROM products WHERE id = ?', [id]);

    return res.status(200).json({
      success: true,
      message: 'Producto eliminado con éxito.'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getTaxes,
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
};
