# Guía de Importación y Gestión de Marcas, Modelos y Versiones de Vehículos (Excel / CSV)

Esta guía detalla los endpoints, formatos de archivo compatibles, nombres de columnas aceptados y estructura de respuesta para la carga masiva y gestión de marcas, modelos y versiones de vehículos en la API de Partzix.

---

## 📋 Resumen de Endpoints Disponibles

| Método | Endpoint | Rol Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/brands/import` | `admin` (Bearer JWT) | Importación masiva de **Marcas** desde archivo Excel (.xlsx, .xls) o CSV (.csv). |
| **GET** | `/api/brands/import/template` | Público / Admin | Descarga de la plantilla de ejemplo para importación de **Marcas** (`?format=xlsx` o `?format=csv`). |
| **POST** | `/api/models/import` | `admin` (Bearer JWT) | Importación masiva de **Modelos** vinculados a su Marca y Categoría desde Excel o CSV. |
| **GET** | `/api/models/import/template` | Público / Admin | Descarga de la plantilla de ejemplo para importación de **Modelos** (`?format=xlsx` o `?format=csv`). |
| **POST** | `/api/vehicle-versions/import` | `admin` (Bearer JWT) | Importación masiva de **Versiones de Vehículos** vinculadas a su Modelo desde Excel o CSV. |
| **GET** | `/api/vehicle-versions/import/template` | Público / Admin | Descarga de la plantilla de ejemplo para importación de **Versiones** (`?format=xlsx` o `?format=csv`). |
| **POST** | `/api/brands/import/catalog` | `admin` (Bearer JWT) | Importación combinada de **Catálogo (Marcas + Modelos)** en un solo archivo. Si la marca no existe, se crea automáticamente. |
| **GET** | `/api/brands/import/catalog-template` | Público / Admin | Descarga de plantilla combinada de catálogo en Excel o CSV. |

---

## 1. Importación de Marcas (`POST /api/brands/import`)

### Headers
- `Authorization: Bearer <token_jwt_admin>`
- `Content-Type: multipart/form-data`

### Parámetros Form-Data
- `file`: Archivo binario `.xlsx`, `.xls` o `.csv` (hasta 15 MB).

### Columnas y Encabezados Aceptados (No distingue mayúsculas/minúsculas ni tildes)
| Campo | Encabezados Aceptados | Obligatorio | Descripción / Ejemplo |
| :--- | :--- | :--- | :--- |
| **Categoría** | `categoria`, `category`, `categoria_id`, `category_id`, `id_categoria`, `nombre_categoria` | **Sí** | ID de categoría (ej. `1`) o Nombre (ej. `Vehículos`, `Motos`). |
| **Nombre de Marca** | `nombre_marca`, `brand_name`, `marca`, `brand`, `nombre`, `name` | **Sí** | Nombre de la marca (ej. `Toyota`, `Chevrolet`, `Yamaha`). |
| **Descripción** | `descripcion`, `description`, `desc`, `detalle` | No | Breve descripción de la marca. |
| **Estado** | `estado`, `status` | No | `Activo` (por defecto) o `Inactivo`. |

### Ejemplo de Estructura de Datos (Excel / CSV)
| Categoria | Nombre de Marca | Descripcion | Estado |
| :--- | :--- | :--- | :--- |
| Vehículos | Toyota | Fabricante japonés líder | Activo |
| Vehículos | Mazda | Marca de vehículos | Activo |
| Motos | Yamaha | Motocicletas y cuatrimotos | Activo |

### Respuesta Exitosa (HTTP 200)
```json
{
  "success": true,
  "message": "Proceso de importación finalizado. Se importaron 2 marcas nuevas (1 duplicadas omitidas).",
  "data": {
    "total_rows": 3,
    "imported": 2,
    "skipped": 1,
    "errors": []
  }
}
```

---

## 2. Importación de Modelos (`POST /api/models/import`)

### Headers
- `Authorization: Bearer <token_jwt_admin>`
- `Content-Type: multipart/form-data`

### Parámetros Form-Data
- `file`: Archivo binario `.xlsx`, `.xls` o `.csv` (hasta 15 MB).

### Columnas y Encabezados Aceptados
| Campo | Encabezados Aceptados | Obligatorio | Descripción / Ejemplo |
| :--- | :--- | :--- | :--- |
| **Categoría** | `categoria`, `category`, `categoria_id`, `category_id`, `id_categoria`, `nombre_categoria` | No (opcional si la marca es única) | ID o Nombre de la categoría (ej. `Vehículos`). |
| **Marca** | `marca`, `brand`, `marca_id`, `brand_id`, `id_marca`, `nombre_marca` | **Sí** | ID o Nombre de la marca existente (ej. `Toyota`). |
| **Nombre del Modelo** | `nombre_modelo`, `model_name`, `modelo`, `model`, `nombre`, `name` | **Sí** | Nombre del modelo (ej. `Corolla`, `Hilux`, `Onix`). |
| **Descripción** | `descripcion`, `description`, `desc`, `detalle` | No | Detalle del modelo (ej. `Sedán 1.8L`). |
| **Estado** | `estado`, `status` | No | `Activo` o `Inactivo`. |

### Ejemplo de Estructura de Datos (Excel / CSV)
| Categoria | Marca | Nombre de Modelo | Descripcion | Estado |
| :--- | :--- | :--- | :--- | :--- |
| Vehículos | Toyota | Corolla | Sedán compacto 1.8L / 2.0L | Activo |
| Vehículos | Toyota | Hilux | Camioneta Pickup 4x4 | Activo |
| Vehículos | Chevrolet | Onix | Hatchback Turbo | Activo |
| Motos | Yamaha | FZ 250 | Moto urbana 250cc | Activo |

### Respuesta Exitosa (HTTP 200)
```json
{
  "success": true,
  "message": "Proceso de importación finalizado. Se importaron 4 modelos nuevos (0 duplicados omitidos).",
  "data": {
    "total_rows": 4,
    "imported": 4,
    "skipped": 0,
    "errors": []
  }
}
```

---

## 3. Importación de Versiones de Vehículos (`POST /api/vehicle-versions/import`)

### Headers
- `Authorization: Bearer <token_jwt_admin>`
- `Content-Type: multipart/form-data`

### Parámetros Form-Data
- `file`: Archivo binario `.xlsx`, `.xls` o `.csv` (hasta 15 MB).

### Columnas y Encabezados Aceptados
| Campo | Encabezados Aceptados | Obligatorio | Descripción / Ejemplo |
| :--- | :--- | :--- | :--- |
| **Categoría** | `categoria`, `category`, `categoria_id`, `category_id`, `id_categoria`, `nombre_categoria` | No | ID o Nombre de la categoría. |
| **Marca** | `marca`, `brand`, `marca_id`, `brand_id`, `id_marca`, `nombre_marca` | No | ID o Nombre de la marca (ej. `Toyota`). |
| **Modelo** | `modelo`, `model`, `modelo_id`, `model_id`, `id_modelo`, `nombre_modelo` | **Sí** | ID o Nombre del modelo (ej. `Corolla`). |
| **Nombre de Versión** | `nombre_version`, `version_name`, `version`, `nombre`, `name` | **Sí** | Nombre de la versión (ej. `XEI 2.0 CVT`, `SEG Hybrid`). |
| **Descripción** | `descripcion`, `description`, `desc`, `detalle` | No | Detalle o especificación de equipamiento. |
| **Estado** | `estado`, `status` | No | `Activo` o `Inactivo` (por defecto `Activo`). |

### Ejemplo de Estructura de Datos (Excel / CSV)
| Categoria | Marca | Modelo | Nombre de Version | Descripcion | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Vehículos | Toyota | Corolla | XEI 2.0 CVT | Versión intermedia con caja automática CVT | Activo |
| Vehículos | Toyota | Corolla | SEG Hybrid | Versión tope híbrida | Activo |
| Vehículos | Chevrolet | Onix | Premier Turbo | Full equipo con motor 1.0 Turbo | Activo |
| Vehículos | Mazda | CX-5 | Grand Touring LX AWD | Motor 2.5 Turbo 4x4 | Activo |

### Respuesta Exitosa (HTTP 200)
```json
{
  "success": true,
  "message": "Proceso de importación finalizado. Se importaron 4 versiones nuevas (0 duplicadas omitidas).",
  "data": {
    "total_rows": 4,
    "imported": 4,
    "skipped": 0,
    "errors": []
  }
}
```

---

## 4. Endpoints CRUD para Versiones de Vehículos

| Método | Endpoint | Rol | Descripción |
| :--- | :--- | :--- | :--- |
| **GET** | `/api/vehicle-versions` | Público | Obtener todas las versiones (filtros: `modelId`, `brandId`, `categoryId`, `status`). |
| **GET** | `/api/vehicle-versions/:id` | Público | Obtener detalle de una versión por ID. |
| **POST** | `/api/vehicle-versions` | `admin` | Crear una versión (`model_id`, `name`, `description`, `status`). |
| **PUT** | `/api/vehicle-versions/:id` | `admin` | Actualizar versión (`model_id`, `name`, `description`, `status`). |
| **PATCH** | `/api/vehicle-versions/:id/status` | `admin` | Cambiar estado (`Activo` / `Inactivo`). |
| **DELETE** | `/api/vehicle-versions/:id` | `admin` | Eliminar versión por ID. |

*(Nota: También se encuentra disponible el alias `/api/versions`)*

---

## 5. Importación Unificada de Catálogo (`POST /api/brands/import/catalog`)

Permite subir en un único archivo tanto marcas como modelos. Si la marca no existe bajo la categoría, se crea automáticamente en la base de datos antes de crear el modelo.

### Ejemplo de Estructura de Datos
| Categoria | Marca | Modelo | Descripcion | Estado |
| :--- | :--- | :--- | :--- | :--- |
| Vehículos | Mazda | Mazda 3 | Sedán / Hatchback Skyactiv | Activo |
| Vehículos | Mazda | CX-5 | SUV Compacta | Activo |
| Vehículos | Renault | Duster | Camioneta SUV 1.3L Turbo | Activo |

### Respuesta Exitosa (HTTP 200)
```json
{
  "success": true,
  "message": "Proceso de importación del catálogo finalizado. Se crearon 2 marcas y 3 modelos (0 duplicados omitidos).",
  "data": {
    "total_rows": 3,
    "brands_created": 2,
    "models_created": 3,
    "skipped": 0,
    "errors": []
  }
}
```

---

## 6. Descarga de Plantillas

Para obtener archivos listos para usar con cabeceras y ejemplos prellenados:

- **Plantilla de Marcas:**
  - `GET /api/brands/import/template?format=xlsx` (Excel)
  - `GET /api/brands/import/template?format=csv` (CSV)
- **Plantilla de Modelos:**
  - `GET /api/models/import/template?format=xlsx` (Excel)
  - `GET /api/models/import/template?format=csv` (CSV)
- **Plantilla de Versiones de Vehículos:**
  - `GET /api/vehicle-versions/import/template?format=xlsx` (Excel)
  - `GET /api/vehicle-versions/import/template?format=csv` (CSV)
- **Plantilla de Catálogo Completo:**
  - `GET /api/brands/import/catalog-template?format=xlsx` (Excel)
  - `GET /api/brands/import/catalog-template?format=csv` (CSV)

---

## 7. Manejo de Errores y Validaciones

- **Duplicados:** Si una marca, modelo o versión ya existe bajo su entidad padre, se omite automáticamente (`skipped++`) sin detener el resto de filas.
- **Entidades no encontradas:** Si la categoría, marca o modelo no existe, se registra el número de fila (`row`) y el mensaje descriptivo en el arreglo `errors`.
- **Archivos no soportados:** Si el archivo no tiene extensión `.xlsx`, `.xls` o `.csv`, el servidor responde `HTTP 400` con mensaje claro.
