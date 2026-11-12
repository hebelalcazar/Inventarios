// ***************************************************************
// ⚠️ 1. REEMPLAZA ESTE VALOR con el ID real de tu Google Sheet
// ***************************************************************
const SPREADSHEET_ID = "1jSob3--tbiVLC1NbOb1RBnj29YwtPsCZMiuu-NLVh2o"; 

// Nombres de las pestañas
const HOJA_CATEGORIAS = "Categorias";
const HOJA_PRODUCTOS = "Productos";
const HOJA_COMPRAS = "Compras";
const HOJA_VENTAS = "Ventas";
const HOJA_RESUMEN = "resumen_diario";
const HOJA_USUARIOS = "Usuarios";
const HOJA_AUDITORIA = "Auditoria";

// Encabezados
const CATEGORIAS_HEADERS = ["id", "nombre"];
const PRODUCTOS_HEADERS = ["id", "nombre", "código", "categoría", "precio_compra", "precio_venta", "stock", "fecha_creado"];
const COMPRAS_HEADERS = ["id", "producto_id", "cantidad", "precio_compra", "fecha", "proveedor", "metodo_pago", "talla", "estado"];
const VENTAS_HEADERS = ["id", "producto_id", "cantidad", "precio_venta", "fecha", "cliente", "metodo_pago", "talla", "estado"];
const RESUMEN_HEADERS = ["fecha", "total_ventas", "total_compras", "ganancia", "productos_vendidos"];
const USUARIOS_HEADERS = ["id", "nombre", "cedula", "fecha_nacimiento", "email", "password_hash", "rol", "activo", "fecha_creado", "fecha_actualizado"];
const AUDITORIA_HEADERS = ["id", "fecha", "usuario_id", "usuario_email", "rol", "accion", "entidad", "entidad_id", "detalle"];

// --- FUNCIÓN CENTRAL PARA ACCEDER A LA HOJA ---
function getSpreadsheet() {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
}

// 🔑 FUNCIÓN CORREGIDA: Generación de ID Único
function generateUniqueAppId() {
    return 'id-' + (new Date().getTime().toString(36) + Math.random().toString(36).substring(2, 9)).toUpperCase();
}

// ----------------------------------------------------------------------
// ENTRADA PRINCIPAL PARA SOLICITUDES GET
// ----------------------------------------------------------------------
function doGet(e) {
    const action = e.parameter.action;
    const query = e.parameter.query;
    const sheetName = e.parameter.sheetName;
    let auth;
    let result;

    try {
        auth = authenticate_(e.parameter.token);
        if (action === "iniciar" || action === "resetear") {
            requireRole_(auth, ["admin"]);
            result = action === "iniciar" ? iniciarBaseDeDatos() : resetearBaseDeDatos();
        } else if (action === "getCategorias") {
            requireRole_(auth, ["admin"]);
            result = getCategorias();
        } else if (action === "buscarProducto") {
            requireRole_(auth, ["admin", "vendedor"]);
            result = buscarProducto(query); 
        } else if (action === "getInventario") {
            requireRole_(auth, ["admin", "vendedor"]);
            result = getInventario();
        } else if (action === "getResumenDiario") {
            requireRole_(auth, ["admin", "vendedor"]);
            result = getResumenDiario();
        } else if (action === "getData" && sheetName) {
            requireRole_(auth, ["admin", "vendedor"]);
            if ([HOJA_VENTAS.toUpperCase(), HOJA_COMPRAS.toUpperCase()].indexOf(String(sheetName).toUpperCase()) === -1) throw new Error("Hoja no permitida.");
            const normalizedSheetName = String(sheetName).toUpperCase() === HOJA_VENTAS.toUpperCase() ? HOJA_VENTAS : HOJA_COMPRAS;
            result = getData(normalizedSheetName);
        } else if (action === "usuarios") {
            requireRole_(auth, ["admin"]);
            result = listUsers_();
        } else if (action === "perfil") {
            result = getProfile_(auth);
        } else {
            result = { status: "error", message: `Acción GET '${action}' no válida o faltan parámetros.` };
        }
    } catch (error) {
        result = { status: "error", message: `Error en doGet: ${error.message}` };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
           .setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------------------------
// ENTRADA PRINCIPAL PARA SOLICITUDES POST
// ----------------------------------------------------------------------
function doPost(e) {
    try {
        if (!e.postData || !e.postData.contents) {
            return ContentService.createTextOutput(JSON.stringify({ 
                status: "error", 
                message: "No se recibieron datos en la solicitud POST." 
            })).setMimeType(ContentService.MimeType.JSON);
        }
        
        const requestData = JSON.parse(e.postData.contents);
        const action = requestData.action;

        let result;
        if (action === "login") {
            result = login_(requestData);
        } else if (action === "setupAdmin") {
            result = { status: "error", message: "La configuración pública del administrador inicial está deshabilitada." };
        } else if (action === "agregarCategoria") {
            const auth = authenticate_(requestData.token);
            requireRole_(auth, ["admin"]);
            result = agregarCategoria(requestData, auth);
        } else if (action === "agregarProducto") {
            const auth = authenticate_(requestData.token);
            requireRole_(auth, ["admin"]);
            result = agregarProducto(requestData, auth);
        } else if (action === "registrarTransaccion") {
            const auth = authenticate_(requestData.token);
            requireRole_(auth, ["admin", "vendedor"]);
            result = registrarTransaccion(requestData, auth);
        } else if (action === "anularTransaccion") {
            const auth = authenticate_(requestData.token);
            requireRole_(auth, ["admin"]);
            result = anularTransaccion(requestData, auth);
        } else if (action === "crearUsuario") {
            const auth = authenticate_(requestData.token);
            requireRole_(auth, ["admin"]);
            result = createUser_(requestData, auth);
        } else if (action === "actualizarUsuario") {
            const auth = authenticate_(requestData.token);
            requireRole_(auth, ["admin"]);
            result = updateUser_(requestData, auth);
        } else if (action === "eliminarUsuario") {
            const auth = authenticate_(requestData.token);
            requireRole_(auth, ["admin"]);
            result = deleteUser_(requestData, auth);
        } else if (action === "actualizarPerfil") {
            const auth = authenticate_(requestData.token);
            result = updateProfile_(requestData, auth);
        } else if (action === "cambiarPassword") {
            const auth = authenticate_(requestData.token);
            result = changePassword_(requestData, auth);
        } else if (action === "logout") {
            result = logout_(requestData.token);
        } else {
            result = { status: "error", message: "Acción POST no reconocida." };
        }
        
        return ContentService.createTextOutput(JSON.stringify(result))
               .setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ 
            status: "error", 
            message: `Error al procesar la solicitud POST: ${error.message}` 
        })).setMimeType(ContentService.MimeType.JSON);
    }
}

// ----------------------------------------------------------------------
// FUNCIONES DE GESTIÓN DE CATEGORÍAS
// ----------------------------------------------------------------------
function getCategorias() {
    return getData(HOJA_CATEGORIAS);
}

function agregarCategoria(data, auth) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_CATEGORIAS);

    if (!sheet) {
        return { status: "error", message: `La pestaña '${HOJA_CATEGORIAS}' no existe. Inicie la Base de Datos.` };
    }

    const newId = generateUniqueAppId();
    
    const newRow = [
        newId,
        data.nombre
    ];

    try {
        sheet.appendRow(newRow);
        registrarAuditoria_(auth, "CREAR_CATEGORIA", HOJA_CATEGORIAS, newId, { nombre: data.nombre });
        return { status: "success", message: `Categoría '${data.nombre}' agregada (ID: ${newId}).` };
    } catch (e) {
        return { status: "error", message: `Error al escribir categoría: ${e.message}` };
    }
}

// ----------------------------------------------------------------------
// FUNCIONES DE GESTIÓN DE PRODUCTOS Y BÚSQUEDA
// ----------------------------------------------------------------------
function getInventario() {
    ensureProductSizeColumn_(getSpreadsheet().getSheetByName(HOJA_PRODUCTOS));
    return getData(HOJA_PRODUCTOS);
}

function buscarProducto(query) {
    ensureProductSizeColumn_(getSpreadsheet().getSheetByName(HOJA_PRODUCTOS));
    const data = getData(HOJA_PRODUCTOS);

    if (data.status !== 'success') return data;
    
    const products = data.data;
    const lowerQuery = query.toLowerCase().trim();

    if (lowerQuery.length === 0) {
        return { status: "warning", message: "Especifique un ID, Código o Nombre para buscar." };
    }

    // Filtra productos por ID, Código, o Nombre - CONVERSIÓN SEGURA A STRING
    const results = products.filter(p => {
        // Convertir todos los valores a string de forma segura
        const idStr = String(p.id || '');
        const codigoStr = String(p.código || '');
        const nombreStr = String(p.nombre || '');

        return idStr.toLowerCase().includes(lowerQuery) ||
               codigoStr.toLowerCase().includes(lowerQuery) ||
               nombreStr.toLowerCase().includes(lowerQuery);
    });

    if (results.length > 0) {
        return { status: "success", data: results, message: `${results.length} coincidencias encontradas.` };
    } else {
        return { status: "warning", message: "Producto no encontrado." };
    }
}

function ensureProductSizeColumn_(sheet) {
    if (!sheet) return;
    const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    if (headers.indexOf("talla") === -1) {
        sheet.getRange(1, headers.length + 1).setValue("talla");
        if (sheet.getLastRow() > 1) sheet.getRange(2, headers.length + 1, sheet.getLastRow() - 1, 1).setValue("N/A");
    }
}

function agregarProducto(data, auth) {
    
    const sheetForSize = getSpreadsheet().getSheetByName(HOJA_PRODUCTOS);
    ensureProductSizeColumn_(sheetForSize);
    if (["S", "M", "L", "XL", "XXL", "N/A"].indexOf(String(data.talla || "").toUpperCase()) === -1) {
        return { status: "error", message: "Seleccione una talla valida." };
    }
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(HOJA_PRODUCTOS);

    if (!sheet) {
        return { status: "error", message: `La pestaña '${HOJA_PRODUCTOS}' no existe. Inicie la Base de Datos.` };
    }
    
    const newId = generateUniqueAppId();

    const newRow = [
        newId,
        data.nombre,
        data.codigo,
        data.categoria,
        parseFloat(data.precio_compra),
        parseFloat(data.precio_venta),
        parseInt(data.stock),
        new Date(),
        String(data.talla).toUpperCase()
    ];

    try {
        sheet.appendRow(newRow);
        registrarAuditoria_(auth, "CREAR_PRODUCTO", HOJA_PRODUCTOS, newId, { nombre: data.nombre, talla: data.talla });
        return { status: "success", message: `Producto '${data.nombre}' registrado con éxito. ID: ${newId}` };
    } catch (e) {
        return { status: "error", message: `Error al escribir producto: ${e.message}` };
    }
}

// ----------------------------------------------------------------------
// FUNCIONES DE GESTIÓN DE TRANSACCIONES (COMPRAS/VENTAS)
// ----------------------------------------------------------------------
function ensurePaymentColumn_(sheet) {
    const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    if (headers.indexOf("metodo_pago") === -1) {
        sheet.getRange(1, headers.length + 1).setValue("metodo_pago");
    }
}

function ensureTransactionSizeColumn_(sheet) {
    const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    if (headers.indexOf("talla") === -1) sheet.getRange(1, headers.length + 1).setValue("talla");
}

function ensureTransactionStatusColumn_(sheet) {
    const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
    if (headers.indexOf("estado") === -1) sheet.getRange(1, headers.length + 1).setValue("estado");
}

function registrarTransaccion(data, auth) {
    const lock = LockService.getScriptLock();
    let locked = false;
    try {
        lock.waitLock(30000);
        locked = true;
        return registrarTransaccionProtegida_(data, auth);
    } finally {
        if (locked) lock.releaseLock();
    }
}

function registrarTransaccionProtegida_(data, auth) {
    const ss = getSpreadsheet();
    const action = data.type; // 'compra' o 'venta'
    const isCompra = action === "compra";
    const sheetName = isCompra ? HOJA_COMPRAS : HOJA_VENTAS;
    const sheet = ss.getSheetByName(sheetName);
    const sheetProductos = ss.getSheetByName(HOJA_PRODUCTOS);

    if (!sheet || !sheetProductos) {
        return { status: "error", message: `Una o más pestañas necesarias no existen. Inicie la Base de Datos.` };
    }

    ensureProductSizeColumn_(sheetProductos);
    ensurePaymentColumn_(sheet);
    ensureTransactionSizeColumn_(sheet);
    ensureTransactionStatusColumn_(sheet);
    if (["efectivo", "transferencia"].indexOf(String(data.metodo_pago || "").toLowerCase()) === -1) {
        return { status: "error", message: "Seleccione un metodo de pago valido." };
    }

    // 1. Validar producto y obtener fila actual
    const { rowData, rowIndex } = findProductRow(sheetProductos, data.producto_id);
    
    if (rowIndex !== -1) {
        const tallaProducto = String(rowData[8] || "N/A").toUpperCase();
        if (String(data.talla || "").toUpperCase() !== tallaProducto) {
            return { status: "error", message: `La talla seleccionada no coincide con la talla del producto (${tallaProducto}).` };
        }
    }
    if (rowIndex === -1) {
        return { status: "error", message: `Producto ID ${data.producto_id} no encontrado en inventario.` };
    }
    
    // 2. Obtener datos actuales del producto
    const stockColIndex = 6;
    const precioCompraColIndex = 4;
    const precioVentaColIndex = 5;
    
    const cantidad = parseInt(data.cantidad);
    const precioTransaccion = parseFloat(data.precio);
    
    let stockActual = parseFloat(rowData[stockColIndex]) || 0;
    let nuevoStock;

    // 3. Validar stock para ventas
    if (!isCompra) {
        if (stockActual < cantidad) {
            return { 
                status: "warning", 
                message: `Stock insuficiente. Solo hay ${stockActual} unidades disponibles para la venta de ${cantidad} unidades.` 
            };
        }
        nuevoStock = stockActual - cantidad;
    } else {
        nuevoStock = stockActual + cantidad;
    }

    // 4. Escribir nueva transacción
    const transaccionId = generateUniqueAppId(); 
    const newRow = [
        transaccionId,
        data.producto_id,
        cantidad,
        precioTransaccion,
        new Date(),
        data.extra_data || '',
        String(data.metodo_pago).toLowerCase(),
        String(data.talla).toUpperCase(),
        "ACTIVA"
    ];

    try {
        sheet.appendRow(newRow);
    } catch (e) {
        return { status: "error", message: `Error al registrar transacción: ${e.message}` };
    }

    // 5. Actualizar stock del producto
    try {
        sheetProductos.getRange(rowIndex + 1, stockColIndex + 1).setValue(nuevoStock);
        
        // 6. Actualizar precio si es diferente
        if (isCompra) {
            const precioActualCompra = parseFloat(rowData[precioCompraColIndex]) || 0;
            if (precioTransaccion !== precioActualCompra) {
                sheetProductos.getRange(rowIndex + 1, precioCompraColIndex + 1).setValue(precioTransaccion);
            }
        } else {
            const precioActualVenta = parseFloat(rowData[precioVentaColIndex]) || 0;
            if (precioTransaccion !== precioActualVenta) {
                sheetProductos.getRange(rowIndex + 1, precioVentaColIndex + 1).setValue(precioTransaccion);
            }
        }

        registrarAuditoria_(auth, isCompra ? "REGISTRAR_COMPRA" : "REGISTRAR_VENTA", isCompra ? HOJA_COMPRAS : HOJA_VENTAS, transaccionId, {
            producto_id: data.producto_id,
            cantidad: cantidad,
            precio: precioTransaccion,
            metodo_pago: data.metodo_pago,
            talla: data.talla,
            stock_resultante: nuevoStock
        });

        return { 
            status: "success", 
            message: `${isCompra ? 'Compra' : 'Venta'} registrada exitosamente. Stock actualizado: ${nuevoStock} unidades.` 
        };

    } catch (e) {
        // Si falla la actualización, revertir la transacción
        sheet.deleteRow(sheet.getLastRow());
        return { status: "error", message: `Error al actualizar inventario: ${e.message}` };
    }
}

// ----------------------------------------------------------------------
// FUNCIÓN PARA OBTENER RESUMEN DIARIO
// ----------------------------------------------------------------------
function anularTransaccion(data, auth) {
    const lock = LockService.getScriptLock();
    let locked = false;
    try {
        lock.waitLock(30000);
        locked = true;
        const isCompra = data.type === "compra";
        if (!isCompra && data.type !== "venta") throw new Error("Tipo de transaccion no valido.");
        const sheet = getSpreadsheet().getSheetByName(isCompra ? HOJA_COMPRAS : HOJA_VENTAS);
        const products = getSpreadsheet().getSheetByName(HOJA_PRODUCTOS);
        if (!sheet || !products) throw new Error("No se encontraron las hojas necesarias.");
        ensureProductSizeColumn_(products);
        ensureTransactionStatusColumn_(sheet);
        const values = sheet.getDataRange().getValues();
        const headers = values[0];
        const idIndex = headers.indexOf("id");
        const statusIndex = headers.indexOf("estado");
        const productIndex = headers.indexOf("producto_id");
        const quantityIndex = headers.indexOf("cantidad");
        let transactionRow = -1;
        for (let i = 1; i < values.length; i++) {
            if (String(values[i][idIndex] || "") === String(data.id || "")) {
                transactionRow = i;
                break;
            }
        }
        if (transactionRow === -1) throw new Error("Transaccion no encontrada.");
        if (String(values[transactionRow][statusIndex] || "ACTIVA").toUpperCase() === "ANULADA") throw new Error("La transaccion ya fue anulada.");
        const productId = values[transactionRow][productIndex];
        const quantity = parseInt(values[transactionRow][quantityIndex], 10);
        const product = findProductRow(products, productId);
        if (product.rowIndex === -1) throw new Error("El producto asociado ya no existe.");
        const currentStock = Number(product.rowData[6]) || 0;
        const newStock = isCompra ? currentStock - quantity : currentStock + quantity;
        if (newStock < 0) throw new Error("No se puede anular la compra porque el stock ya fue utilizado.");
        products.getRange(product.rowIndex + 1, 7).setValue(newStock);
        sheet.getRange(transactionRow + 1, statusIndex + 1).setValue("ANULADA");
        registrarAuditoria_(auth, "ANULAR_TRANSACCION", isCompra ? HOJA_COMPRAS : HOJA_VENTAS, data.id, { producto_id: productId, cantidad: quantity, stock_resultante: newStock });
        return { status: "success", message: "Transaccion anulada y stock revertido correctamente." };
    } finally {
        if (locked) lock.releaseLock();
    }
}

function getResumenDiario() {
    return getData(HOJA_RESUMEN);
}

// ----------------------------------------------------------------------
// FUNCIONES DE UTILIDAD GENERAL
// ----------------------------------------------------------------------
function getData(sheetName) {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet || sheet.getLastRow() < 2) {
        return { status: "error", message: `Pestaña '${sheetName}' vacía o no existe.` };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const mappedData = rows.map(row => {
        let entry = {};
        headers.forEach((header, index) => {
            let value = row[index];
            
            // Manejar valores vacíos
            if (value === '' || value === null || value === undefined) {
                value = '';
            }
            // Si es número, mantenerlo como número
            else if (typeof value === 'number') {
                value = value;
            }
            // Si es string que representa número, convertirlo a número
            else if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
                // Para códigos, mantener como string si tiene letras
                if (header === 'código' && /[a-zA-Z]/.test(value)) {
                    value = value; // Mantener como string
                } else {
                    value = parseFloat(value);
                }
            }
            // Si es fecha, dejarla como está
            else if (value instanceof Date) {
                // Mantener como Date
            }
            // Para cualquier otro caso, asegurar que sea string
            else {
                value = String(value);
            }
            
            entry[header] = value;
        });
        return entry;
    });

    // Filtrar filas completamente vacías
    const filteredData = mappedData.filter(entry => {
        return Object.values(entry).some(value => value !== '' && value !== null);
    });

    return { status: "success", data: filteredData };
}

function findProductRow(sheetProductos, productoId) {
    try {
        const data = sheetProductos.getDataRange().getValues();
        const idColIndex = 0;

        for (let i = 1; i < data.length; i++) {
            const rowId = String(data[i][idColIndex] || '');
            const searchId = String(productoId || '');
            
            if (rowId.toLowerCase() === searchId.toLowerCase()) {
                return { rowData: data[i], rowIndex: i };
            }
        }
        return { rowData: null, rowIndex: -1 };
    } catch (error) {
        console.error(`Error en findProductRow: ${error}`);
        return { rowData: null, rowIndex: -1 };
    }
}

// ----------------------------------------------------------------------
// FUNCIONES DE CONFIGURACIÓN DE BASE DE DATOS
// ----------------------------------------------------------------------
function createOrResetSheet(ss, name, headers) {
    let sheet = ss.getSheetByName(name);
    let action = "verificada";

    if (!sheet) {
        sheet = ss.insertSheet(name);
        action = "creada";
    }

    // Limpiar contenido y establecer encabezados
    sheet.clearContents();
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);

    return `Pestaña '${name}' ${action}.`;
}

function iniciarBaseDeDatos() {
    const ss = getSpreadsheet();
    let msg = [];

    msg.push(createOrResetSheet(ss, HOJA_CATEGORIAS, CATEGORIAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_PRODUCTOS, PRODUCTOS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_COMPRAS, COMPRAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_VENTAS, VENTAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_RESUMEN, RESUMEN_HEADERS));
    ensureUsersSheet_();
    ensureAuditSheet_();

    return { status: "success", message: `Base de datos inicializada: ${msg.join(" ")}` };
}

function resetearBaseDeDatos() {
    const ss = getSpreadsheet();
    let msg = [];

    // Se eliminan todas las pestañas excepto la primera ("Hoja 1")
    ss.getSheets().forEach(sheet => {
        const sheetName = sheet.getName();
        if (sheetName !== "Hoja 1" && sheetName !== HOJA_USUARIOS && sheetName !== HOJA_AUDITORIA) {
            ss.deleteSheet(sheet);
            msg.push(`Pestaña '${sheetName}' eliminada.`);
        }
    });

    // Se recrean las pestañas
    msg.push(createOrResetSheet(ss, HOJA_CATEGORIAS, CATEGORIAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_PRODUCTOS, PRODUCTOS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_COMPRAS, COMPRAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_VENTAS, VENTAS_HEADERS));
    msg.push(createOrResetSheet(ss, HOJA_RESUMEN, RESUMEN_HEADERS));

    return { status: "success", message: `Base de datos reseteada completamente: ${msg.join(" ")}` };
}

// ----------------------------------------------------------------------
// AUTENTICACION, ROLES Y USUARIOS
// ----------------------------------------------------------------------
function authError_(message) {
    const error = new Error(message);
    error.code = "AUTH";
    return error;
}

function hashPassword_(password) {
    const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(password), Utilities.Charset.UTF_8);
    return bytes.map(function(byte) {
        const value = byte < 0 ? byte + 256 : byte;
        return (value < 16 ? "0" : "") + value.toString(16);
    }).join("");
}

function ensureUsersSheet_() {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(HOJA_USUARIOS);
    if (!sheet) {
        sheet = ss.insertSheet(HOJA_USUARIOS);
        sheet.getRange(1, 1, 1, USUARIOS_HEADERS.length).setValues([USUARIOS_HEADERS]);
        sheet.setFrozenRows(1);
    }
    return sheet;
}

function ensureAuditSheet_() {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(HOJA_AUDITORIA);
    if (!sheet) {
        sheet = ss.insertSheet(HOJA_AUDITORIA);
        sheet.getRange(1, 1, 1, AUDITORIA_HEADERS.length).setValues([AUDITORIA_HEADERS]);
        sheet.setFrozenRows(1);
    }
    return sheet;
}

function registrarAuditoria_(auth, accion, entidad, entidadId, detalle) {
    const user = auth || {};
    try {
        ensureAuditSheet_().appendRow([
            generateUniqueAppId(), new Date(), user.id || "", user.email || "", user.rol || "",
            accion, entidad, entidadId || "", JSON.stringify(detalle || {})
        ]);
    } catch (error) {
        console.error("No se pudo registrar auditoria: " + error.message);
    }
}

function rowToUser_(row) {
    return {
        id: String(row[0] || ""),
        nombre: String(row[1] || ""),
        cedula: String(row[2] || ""),
        fecha_nacimiento: row[3] || "",
        email: String(row[4] || "").toLowerCase(),
        password_hash: String(row[5] || ""),
        rol: String(row[6] || "vendedor").toLowerCase(),
        activo: row[7] === true || String(row[7]).toLowerCase() === "true",
        fecha_creado: row[8] || "",
        fecha_actualizado: row[9] || ""
    };
}

function publicUser_(user) {
    return {
        id: user.id,
        nombre: user.nombre,
        cedula: user.cedula,
        fecha_nacimiento: user.fecha_nacimiento,
        email: user.email,
        rol: user.rol,
        activo: user.activo,
        fecha_creado: user.fecha_creado
    };
}

function findUser_(identifier) {
    const sheet = ensureUsersSheet_();
    const values = sheet.getDataRange().getValues();
    const key = String(identifier || "").trim().toLowerCase();
    for (let i = 1; i < values.length; i++) {
        const user = rowToUser_(values[i]);
        if (user.email === key || user.cedula.toLowerCase() === key || user.id.toLowerCase() === key) {
            return { user: user, row: i + 1 };
        }
    }
    return null;
}

function login_(data) {
    const found = findUser_(data.email);
    if (!found || !found.user.activo || found.user.password_hash !== hashPassword_(data.password)) {
        throw authError_("Correo o contraseña incorrectos.");
    }
    const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, "");
    CacheService.getScriptCache().put(token, JSON.stringify(publicUser_(found.user)), 21600);
    return { status: "success", token: token, user: publicUser_(found.user) };
}

function authenticate_(token) {
    if (!token) throw authError_("Sesión no iniciada o expirada.");
    const raw = CacheService.getScriptCache().get(String(token));
    if (!raw) throw authError_("Sesión no iniciada o expirada.");
    return JSON.parse(raw);
}

function requireRole_(user, roles) {
    if (!user || roles.indexOf(user.rol) === -1) throw authError_("No tienes permisos para realizar esta acción.");
}

function logout_(token) {
    if (token) CacheService.getScriptCache().remove(String(token));
    return { status: "success", message: "Sesión cerrada." };
}

function validateUserData_(data, requirePassword) {
    if (!data.nombre || !data.cedula || !data.email || (requirePassword && !data.password)) throw new Error("Nombre, cédula, correo y contraseña son obligatorios.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) throw new Error("El correo electrónico no es válido.");
    if (requirePassword && String(data.password).length < 8) throw new Error("La contraseña debe tener mínimo 8 caracteres.");
    if (data.rol && ["admin", "vendedor"].indexOf(String(data.rol).toLowerCase()) === -1) throw new Error("Rol no válido.");
}

function createUser_(data, auth) {
    validateUserData_(data, true);
    if (findUser_(data.email) || findUser_(data.cedula)) throw new Error("Ya existe un usuario con ese correo o cédula.");
    const now = new Date();
    ensureUsersSheet_().appendRow([generateUniqueAppId(), data.nombre.trim(), String(data.cedula).trim(), data.fecha_nacimiento || "", data.email.trim().toLowerCase(), hashPassword_(data.password), String(data.rol || "vendedor").toLowerCase(), data.activo !== false, now, now]);
    registrarAuditoria_(auth, "CREAR_USUARIO", HOJA_USUARIOS, data.email, { rol: String(data.rol || "vendedor").toLowerCase() });
    return { status: "success", message: "Usuario creado correctamente." };
}

function listUsers_() {
    const sheet = ensureUsersSheet_();
    if (sheet.getLastRow() < 2) return { status: "success", data: [] };
    return { status: "success", data: sheet.getDataRange().getValues().slice(1).map(rowToUser_).map(publicUser_) };
}

function updateUser_(data, auth) {
    validateUserData_(data, false);
    const found = findUser_(data.id);
    if (!found) throw new Error("Usuario no encontrado.");
    const duplicate = findUser_(data.email);
    if (duplicate && duplicate.user.id !== found.user.id) throw new Error("El correo ya pertenece a otro usuario.");
    const current = found.user;
    const row = [current.id, data.nombre.trim(), String(data.cedula).trim(), data.fecha_nacimiento || "", data.email.trim().toLowerCase(), data.password ? hashPassword_(data.password) : current.password_hash, String(data.rol || current.rol).toLowerCase(), data.activo !== false, current.fecha_creado, new Date()];
    ensureUsersSheet_().getRange(found.row, 1, 1, USUARIOS_HEADERS.length).setValues([row]);
    registrarAuditoria_(auth, "ACTUALIZAR_USUARIO", HOJA_USUARIOS, found.user.id, { rol: row[6] });
    return { status: "success", message: "Usuario actualizado correctamente." };
}

function deleteUser_(data, auth) {
    if (data.id === auth.id) throw new Error("No puedes eliminar tu propio usuario.");
    const found = findUser_(data.id);
    if (!found) throw new Error("Usuario no encontrado.");
    ensureUsersSheet_().getRange(found.row, 8).setValue(false);
    registrarAuditoria_(auth, "DESACTIVAR_USUARIO", HOJA_USUARIOS, found.user.id, {});
    return { status: "success", message: "Usuario desactivado correctamente." };
}

function getProfile_(auth) {
    const found = findUser_(auth.id);
    if (!found) throw authError_("Usuario no encontrado.");
    return { status: "success", data: publicUser_(found.user) };
}

function updateProfile_(data, auth) {
    const found = findUser_(auth.id);
    if (!found) throw authError_("Usuario no encontrado.");
    if (!data.nombre || !data.cedula || !data.email) throw new Error("Nombre, cédula y correo son obligatorios.");
    const current = found.user;
    ensureUsersSheet_().getRange(found.row, 2, 1, 4).setValues([[data.nombre.trim(), String(data.cedula).trim(), data.fecha_nacimiento || "", data.email.trim().toLowerCase()]]);
    ensureUsersSheet_().getRange(found.row, 10).setValue(new Date());
    return { status: "success", message: "Perfil actualizado correctamente." };
}

function changePassword_(data, auth) {
    if (!data.currentPassword || !data.newPassword || String(data.newPassword).length < 8) throw new Error("La contraseña actual y una nueva contraseña de mínimo 8 caracteres son obligatorias.");
    const found = findUser_(auth.id);
    if (!found || found.user.password_hash !== hashPassword_(data.currentPassword)) throw authError_("La contraseña actual no es correcta.");
    ensureUsersSheet_().getRange(found.row, 6).setValue(hashPassword_(data.newPassword));
    ensureUsersSheet_().getRange(found.row, 10).setValue(new Date());
    return { status: "success", message: "Contraseña cambiada correctamente." };
}
