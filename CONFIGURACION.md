# Configuración y despliegue

## 1. Google Sheets

1. Crear o abrir la hoja de inventario.
2. Copiar el ID de la hoja desde su URL.
3. Verificar que `SPREADSHEET_ID` en `sg.js` corresponda a esa hoja.
4. No cambiar manualmente los nombres de las pestañas sin actualizar el backend.
5. Crear una copia de seguridad antes de ejecutar inicialización o migraciones.

## 2. Google Apps Script

1. Abrir el proyecto de Apps Script.
2. Reemplazar el contenido del archivo backend con `sg.js`.
3. Guardar el proyecto.
4. Ejecutar o autorizar las funciones solicitadas por Google.
5. Crear una nueva versión del despliegue.
6. Publicar como aplicación web.
7. Verificar que la URL utilizada en `script.js` y `api.js` sea la URL `/exec` del despliegue activo.

Las funciones de seguridad agregan automáticamente columnas nuevas cuando son necesarias. No se deben eliminar las columnas `password_salt`, `session_version`, `stock_anterior`, `stock_posterior`, `precio_anterior`, `precio_posterior` ni `request_id`.

### Alertas de stock bajo

El backend envia un correo a los administradores activos cuando un producto queda con 3 unidades o menos. Para que funcione:

1. Cada administrador debe tener un correo valido en la hoja `Usuarios` y estar activo.
2. Al guardar `sg.js` en Apps Script, aceptar los permisos solicitados para `MailApp` y `PropertiesService`.
3. Publicar una nueva version del despliegue.

La alerta se envia una sola vez mientras el producto permanezca bajo el umbral. Si el stock vuelve a ser mayor que 3 y luego vuelve a bajar, se genera una nueva alerta.

## 3. GitHub

Subir individualmente los archivos de la raíz:

- `index.html`
- `estilo.css`
- `script.js`
- `api.js`
- `inventario.js`
- `reportes.js`
- `validaciones.js`
- `auth.js`
- `logo-moteros-popayan.png`

Los archivos Markdown también pueden subirse para documentar el proyecto. `sg.js` pertenece principalmente a Google Apps Script, aunque puede conservarse como respaldo en GitHub.

## 4. Vercel

1. Verificar que el repositorio correcto esté conectado.
2. Confirmar que el directorio raíz de Vercel contenga `index.html`.
3. Esperar el despliegue automático después del commit.
4. Abrir la URL de producción en una ventana privada.
5. Probar login, inventario, transacciones y reportes.

Si el navegador conserva una versión anterior, utilizar recarga forzada o limpiar la caché.

## 5. Cambio de backend y frontend

Cuando se actualicen ambos lados:

1. Actualizar y probar primero `sg.js` en Apps Script.
2. Publicar la nueva versión del backend.
3. Subir los archivos frontend a GitHub.
4. Esperar el despliegue de Vercel.
5. Ejecutar la lista de [CHECKLIST_PRUEBAS.md](./CHECKLIST_PRUEBAS.md).
