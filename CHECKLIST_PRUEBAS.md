# Checklist de pruebas antes de publicar

## Autenticación y permisos

- [ ] Login con credenciales correctas.
- [ ] Login con contraseña incorrecta.
- [ ] Sesión expirada o invalidada.
- [ ] Cierre de sesión.
- [ ] Un vendedor no puede acceder a opciones administrativas.
- [ ] Un administrador puede acceder a todas las opciones.
- [ ] Cambiar contraseña invalida la sesión anterior.
- [ ] No se puede desactivar el último administrador activo.

## Usuarios y perfiles

- [ ] Crear vendedor.
- [ ] Crear administrador desde una sesión administrativa.
- [ ] Editar usuario.
- [ ] Rechazar correo duplicado.
- [ ] Rechazar cédula duplicada.
- [ ] Desactivar usuario.
- [ ] No se puede eliminar el propio usuario.
- [ ] Actualizar perfil.
- [ ] Cambiar contraseña con contraseña actual incorrecta.

## Productos e inventario

- [ ] Crear producto válido.
- [ ] Rechazar producto sin nombre, código o categoría.
- [ ] Rechazar código de producto duplicado.
- [ ] Validar tallas S, M, L, XL, XXL y N/A.
- [ ] Mostrar talla en inventario.
- [ ] Buscar por nombre, código e ID.
- [ ] Filtrar por talla.
- [ ] Cambiar de página en inventario.
- [ ] Mostrar alerta de stock bajo.

## Compras y ventas

- [ ] Registrar compra con efectivo.
- [ ] Registrar compra con transferencia.
- [ ] Registrar venta con efectivo.
- [ ] Registrar venta con transferencia.
- [ ] Rechazar cantidad cero o negativa.
- [ ] Rechazar precio inválido.
- [ ] Rechazar venta con stock insuficiente.
- [ ] Rechazar talla diferente a la del producto.
- [ ] Confirmar que el stock se actualiza correctamente.
- [ ] Confirmar que no se registra una operación duplicada al repetir la solicitud.

## Anulaciones y auditoría

- [ ] Administrador puede anular una venta.
- [ ] Administrador puede anular una compra.
- [ ] Vendedor no puede anular transacciones.
- [ ] Una transacción anulada no puede anularse nuevamente.
- [ ] El stock se revierte correctamente.
- [ ] El precio se restaura solo cuando corresponde.
- [ ] La acción aparece en `Auditoria`.

## Reportes

- [ ] Dashboard por día.
- [ ] Dashboard por semana.
- [ ] Dashboard por mes.
- [ ] Dashboard por año.
- [ ] Resumen por día.
- [ ] Resumen por semana.
- [ ] Resumen por mes.
- [ ] Resumen por año.
- [ ] Las transacciones anuladas no aparecen en los resultados.
- [ ] Exportar CSV desde Dashboard.
- [ ] Exportar CSV desde Resúmenes.
- [ ] Imprimir Dashboard en PDF con logo.
- [ ] Imprimir Resúmenes en PDF con logo.

## Despliegue

- [ ] El frontend carga desde Vercel.
- [ ] El logo se muestra en producción.
- [ ] La URL de Apps Script responde correctamente.
- [ ] Se probó en una ventana privada.
- [ ] Se confirmó que la hoja tiene respaldo.
