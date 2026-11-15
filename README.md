# Moteros Popayán - Sistema de Inventario

Aplicación web para administrar productos, inventario, compras, ventas, usuarios y reportes mediante una interfaz desplegada en Vercel y un backend conectado a Google Sheets mediante Google Apps Script.

## Componentes principales

- `index.html`: estructura de la aplicación.
- `estilo.css`: estilos y diseño responsive.
- `script.js`: navegación, autenticación y operaciones de la interfaz.
- `api.js`: cliente común para solicitudes al backend.
- `inventario.js`: filtrado, paginación y renderizado seguro del inventario.
- `reportes.js`: filtros de período, exportación CSV e impresión PDF.
- `validaciones.js`: validaciones reutilizables del frontend.
- `auth.js`: gestión centralizada de sesión y autenticación.
- `sg.js`: backend de Google Apps Script.
- `logo-moteros-popayan.png`: logo utilizado en la aplicación y reportes.

## Roles

### Administrador

Puede administrar productos, categorías, usuarios, configuración, inventario, compras, ventas, reportes y anulaciones.

### Vendedor

Puede consultar dashboard, inventario, compras, ventas, reportes y su perfil.

Los permisos se validan en el backend; ocultar una opción en la interfaz no es la única medida de seguridad.

## Despliegue

La interfaz se sube como archivos individuales a GitHub. Vercel debe estar conectado al repositorio para desplegar automáticamente los cambios de los archivos frontend.

El archivo `sg.js` se copia en el proyecto de Google Apps Script y se publica como aplicación web.

Consulta [CONFIGURACION.md](./CONFIGURACION.md) para el procedimiento completo y [CHECKLIST_PRUEBAS.md](./CHECKLIST_PRUEBAS.md) antes de publicar cambios.

## Recomendaciones operativas

- Realizar una copia de seguridad de Google Sheets antes de modificar `sg.js`.
- No compartir públicamente las credenciales de usuarios.
- No ejecutar el reinicio de la base de datos en producción sin respaldo.
- Probar primero en una hoja de prueba.
- Revisar periódicamente la pestaña `Auditoria`.
