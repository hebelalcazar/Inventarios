     const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxGdrvl2vQxHb-Z6FaNnQ7ad8j4CxkUrKnfPiCyWaRzlERsctPAB4o9j-2embW1Xiwj/exec';
     let authToken = InventoryAuth.getToken();
     let currentUser = InventoryAuth.getUser();
     let appInitialized = false;

  const mobileToggle = document.getElementById('mobileToggle');
    const sidebar = document.querySelector('.sidebar');
    
    // Crear botón móvil si no existe
    if (!mobileToggle) {
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'mobile-toggle hidden';
        toggleBtn.id = 'mobileToggle';
        toggleBtn.innerHTML = '<i class="fas fa-bars"></i>';
        document.body.appendChild(toggleBtn);
    }
    
    const mobileToggleBtn = document.getElementById('mobileToggle');
    
    if (mobileToggleBtn && sidebar) {
        // Verificar ancho de pantalla
        function checkMobile() {
            if (window.innerWidth <= 992) {
                mobileToggleBtn.classList.remove('hidden');
            } else {
                mobileToggleBtn.classList.add('hidden');
                sidebar.classList.remove('active');
            }
        }
        
        // Inicializar
        checkMobile();
        
        // Redimensionamiento
        window.addEventListener('resize', checkMobile);
        
        // Toggle del menú
        mobileToggleBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            sidebar.classList.toggle('active');
        });
        
        // Cerrar menú al hacer clic fuera
        document.addEventListener('click', function(e) {
            if (window.innerWidth <= 992 && 
                sidebar.classList.contains('active') &&
                !sidebar.contains(e.target) && 
                !mobileToggleBtn.contains(e.target)) {
                sidebar.classList.remove('active');
            }
        });
        
        // Cerrar menú al hacer clic en enlace
        document.querySelectorAll('.sidebar-nav a').forEach(link => {
            link.addEventListener('click', function() {
                if (window.innerWidth <= 992) {
                    sidebar.classList.remove('active');
                }
            });
        });
    }
    
    // Optimizar tablas para móviles
    function optimizeTablesForMobile() {
        const tableContainers = document.querySelectorAll('.data-table-container');
        
        tableContainers.forEach(container => {
            const table = container.querySelector('.data-table');
            const hint = container.querySelector('.scroll-hint');
            
            if (table && window.innerWidth <= 768) {
                // Mostrar hint de scroll
                if (hint) {
                    hint.classList.remove('hidden');
                }
                
                // Verificar si la tabla es más ancha que el contenedor
                const tableWidth = table.scrollWidth;
                const containerWidth = container.clientWidth;
                
                if (tableWidth > containerWidth && hint) {
                    hint.classList.remove('hidden');
                } else if (hint) {
                    hint.classList.add('hidden');
                }
            } else if (hint) {
                // Ocultar hint en pantallas grandes
                hint.classList.add('hidden');
            }
        });
    }
    
    // Inicializar optimización de tablas
    optimizeTablesForMobile();
    
    // Re-optimizar al redimensionar
    window.addEventListener('resize', optimizeTablesForMobile);
    
    // Re-optimizar después de cargar datos en tablas
    const originalLoadInventario = window.loadInventario;
    if (originalLoadInventario) {
        window.loadInventario = async function() {
            await originalLoadInventario();
            setTimeout(optimizeTablesForMobile, 100);
        };
    }
    
    // Ajustar botones para evitar texto desbordado
    function adjustButtons() {
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            const text = btn.textContent || btn.innerText;
            if (text.length > 30) {
                btn.style.fontSize = '0.8rem';
                btn.style.padding = 'var(--space-2) var(--space-3)';
            }
        });
    }
    
    // Ajustar después de cargar la página
    setTimeout(adjustButtons, 500);
     
     let productDataCache = {};
        let inventarioCache = [];
        let inventarioFiltrado = [];
        let inventarioPagina = 1;
        const inventarioPorPagina = 10;
        let currentSummaryType = '';
        let resumenFinancieroChart, tendenciasChart;
        let dashboardRawData = { ventas: [], compras: [] };
        let dashboardReportSeries = [];
        let productoEditandoId = '';

        document.addEventListener('DOMContentLoaded', () => {
            setupAuth();
        });

        function setupAuth() {
            document.getElementById('loginForm').addEventListener('submit', handleLogin);
            if (authToken) {
                InventoryApi.get('perfil').then(data => {
                    if (data.status === 'success') {
                        currentUser = data.data;
                        InventoryAuth.saveSession(authToken, currentUser);
                        showApp();
                    } else {
                        clearSession();
                    }
                }).catch(clearSession);
            }
        }

        async function handleLogin(event) {
            event.preventDefault();
            displayStatus('loginStatus', 'info', 'Validando credenciales...');
            try {
                const data = await InventoryApi.post({ action: 'login', email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value });
                if (data.status !== 'success') throw new Error(data.message);
                authToken = data.token;
                currentUser = data.user;
                InventoryAuth.saveSession(authToken, currentUser);
                showApp();
            } catch (error) {
                displayStatus('loginStatus', 'error', error.message || 'No se pudo iniciar sesion.');
            }
        }

        function showApp() {
            document.getElementById('authView').classList.add('hidden');
            document.querySelector('.app-shell').classList.remove('hidden');
            const sessionInfo = document.getElementById('userSessionInfo');
            sessionInfo.textContent = '';
            const sessionName = document.createElement('strong');
            sessionName.textContent = currentUser.nombre || '';
            const sessionRole = document.createElement('small');
            sessionRole.textContent = currentUser.rol === 'admin' ? 'Administrador' : 'Vendedor';
            sessionInfo.append(sessionName, sessionRole);
            document.querySelectorAll('[data-role="admin"]').forEach(element => element.classList.toggle('hidden', currentUser.rol !== 'admin'));
            if (!appInitialized) {
                appInitialized = true;
                setupNavigation();
                if (currentUser.rol === 'admin') loadInitialData();
                setupForms();
                loadProfile();
                if (currentUser.rol === 'admin') loadUsers();
            }
        }

        function clearSession() {
            authToken = '';
            currentUser = null;
            InventoryAuth.clearSession();
        }
        
        function setupNavigation() {
            const navLinks = document.querySelectorAll('.sidebar-nav a');
            const sections = document.querySelectorAll('.main-content .content-section');
            
            navLinks.forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('data-section');

                    navLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');

                    sections.forEach(section => {
                        if (section.id === targetId) {
                            section.classList.add('active');
                            if (targetId === 'dashboard') {
                                handleLoadDashboard();
                            } else if (targetId === 'inventario') {
                                document.getElementById('cargarInventarioBtn').click();
                            }
                        } else {
                            section.classList.remove('active');
                        }
                    });
                });
            });
        }

        async function loadInitialData() {
            try {
                const data = await InventoryApi.get('getCategorias');
                
                if (data.status === 'success') {
                    populateCategories(data.data);
                } else {
                    displayStatus('statusProducto', 'warning', `No se pudieron cargar las categorías: ${data.message}.`);
                    populateCategories([]);
                }
            } catch (error) {
                displayStatus('statusProducto', 'error', `Error de conexión al cargar categorías.`);
                populateCategories([]);
            }
        }

        function populateCategories(categories) {
            {
                const select = document.getElementById('p_categoria');
                const list = document.getElementById('listaCategorias');
                select.replaceChildren();
                list.replaceChildren();
                if (!categories.length) {
                    const empty = new Option('No hay categorias registradas', '', true, true);
                    empty.disabled = true;
                    select.add(empty);
                    const item = document.createElement('li');
                    item.textContent = 'No hay categorias.';
                    list.append(item);
                    return;
                }
                const placeholder = new Option('Seleccione una categoria', '', true, true);
                placeholder.disabled = true;
                select.add(placeholder);
                categories.forEach(function (category) {
                    const name = String(category.nombre || `(ID ${category.id})`);
                    select.add(new Option(name, name));
                    const item = document.createElement('li');
                    item.textContent = `ID: ${category.id} | Nombre: ${name}`;
                    list.append(item);
                });
                return;
            }
            const selectProducto = document.getElementById('p_categoria');
            selectProducto.innerHTML = '';
            
            if (categories.length === 0) {
                selectProducto.innerHTML = '<option value="" disabled selected>No hay categorías registradas</option>';
                document.getElementById('listaCategorias').innerHTML = '<li>No hay categorías.</li>';
                return;
            }

            selectProducto.innerHTML = '<option value="" disabled selected>Seleccione una categoría</option>';
            
            const listHtml = categories.map(cat => {
                const name = cat.nombre || `(ID ${cat.id})`;
                selectProducto.innerHTML += `<option value="${name}">${name}</option>`;
                return `<li>ID: ${cat.id} | Nombre: ${name}</li>`;
            }).join('');
            
            document.getElementById('listaCategorias').innerHTML = listHtml;
        }

        function setupForms() {
            const today = new Date().toISOString().slice(0, 10);
            document.getElementById('dashboardFecha').value = today;
            document.getElementById('resumenFecha').value = today;
            // Configuración
            document.getElementById('iniciarDBBtn').addEventListener('click', () => handleConfigAction('iniciar'));
            document.getElementById('resetDBBtn').addEventListener('click', () => {
                if (window.confirm("¡ADVERTENCIA! ¿Deseas RESETEAR TODA la base de datos? Esto es irreversible.")) {
                    handleConfigAction('resetear');
                }
            });

            // Categorías y Productos
            document.getElementById('categoriaForm').addEventListener('submit', (e) => handlePostAction(e, 'agregarCategoria', 'statusCategoria'));
            document.getElementById('productoForm').addEventListener('submit', (e) => handlePostAction(e, productoEditandoId ? 'actualizarProducto' : 'agregarProducto', 'statusProducto'));
            
            // Compras/Ventas
            document.getElementById('co_query').addEventListener('input', (e) => handleQueryFilter(e.target.value, 'co'));
            document.getElementById('v_query').addEventListener('input', (e) => handleQueryFilter(e.target.value, 'v'));
            
            document.getElementById('compraForm').addEventListener('submit', (e) => handleTransactionPost(e, 'compra'));
            document.getElementById('ventaForm').addEventListener('submit', (e) => handleTransactionPost(e, 'venta'));

            // Resúmenes
            document.getElementById('resumenVentasBtn').addEventListener('click', () => loadSummary('Ventas'));
            document.getElementById('resumenComprasBtn').addEventListener('click', () => loadSummary('Compras'));
            document.getElementById('resumenPeriodo').addEventListener('change', () => { if (currentSummaryType) loadSummary(currentSummaryType); });
            document.getElementById('resumenFecha').addEventListener('change', () => { if (currentSummaryType) loadSummary(currentSummaryType); });
            document.getElementById('exportarResumenBtn').addEventListener('click', exportCurrentSummary);
            document.getElementById('imprimirResumenBtn').addEventListener('click', () => InventoryReports.printSummary());
            document.getElementById('anularForm').addEventListener('submit', handleCancellation);
            document.getElementById('inventarioAnterior').addEventListener('click', () => changeInventoryPage(-1));
            document.getElementById('inventarioSiguiente').addEventListener('click', () => changeInventoryPage(1));

            // Dashboard
            document.getElementById('cargarInventarioBtn').addEventListener('click', loadInventario);
            document.getElementById('inventarioFiltro').addEventListener('input', filterInventory);
            document.getElementById('inventarioTallaFiltro').addEventListener('change', filterInventory);
            document.getElementById('inventarioCategoriaFiltro').addEventListener('change', filterInventory);
            document.getElementById('inventarioTableBody').addEventListener('click', handleInventoryAction);
            document.getElementById('cancelarEdicionProductoBtn').addEventListener('click', cancelarEdicionProducto);
            document.getElementById('cargarDatosGraficosBtn').addEventListener('click', handleLoadDashboard);
            document.getElementById('calcularResumenBtn').addEventListener('click', calcularResumenFinanciero);
            document.getElementById('exportarDashboardBtn').addEventListener('click', exportCurrentDashboard);
            document.getElementById('imprimirDashboardBtn').addEventListener('click', () => InventoryReports.printDashboard());
            document.getElementById('dashboardPeriodo').addEventListener('change', handleLoadDashboard);
            document.getElementById('dashboardFecha').addEventListener('change', handleLoadDashboard);
            document.getElementById('usuarioForm').addEventListener('submit', saveUser);
            document.getElementById('cancelarUsuarioBtn').addEventListener('click', resetUserForm);
            document.getElementById('perfilForm').addEventListener('submit', saveProfile);
            document.getElementById('passwordForm').addEventListener('submit', changePassword);
            document.getElementById('logoutBtn').addEventListener('click', logout);
        }

        // ================= DASHBOARD FUNCTIONS =================

        function getDashboardFilters() {
            return {
                period: document.getElementById('dashboardPeriodo').value,
                date: document.getElementById('dashboardFecha').value
            };
        }

        async function loadDashboardTransactions() {
            const filters = getDashboardFilters();
            const reportData = await InventoryApi.get('getReportePeriodo', { tipo: 'dashboard', periodo: filters.period, fecha: filters.date });
            if (reportData.status !== 'success') throw new Error(reportData.message || 'No se pudo cargar el reporte.');
            dashboardRawData = {
                ventas: reportData.ventas || [],
                compras: reportData.compras || []
            };
            dashboardReportSeries = reportData.resumen || [];
            return dashboardRawData;
        }
        
        async function handleLoadDashboard() {
            await calcularResumenFinanciero();
            await cargarDatosGraficos();
        }

        async function calcularResumenFinanciero() {
            try {
                const rawData = await loadDashboardTransactions();
                const filters = getDashboardFilters();
                const ventas = InventoryReports.filterTransactions(rawData.ventas, filters.period, filters.date);
                const compras = InventoryReports.filterTransactions(rawData.compras, filters.period, filters.date);
                const totalVentas = ventas.reduce((sum, row) => sum + InventoryReports.transactionAmount(row, 'venta'), 0);
                const totalCompras = compras.reduce((sum, row) => sum + InventoryReports.transactionAmount(row, 'compra'), 0);
                const costoVentas = ventas.reduce((sum, row) => sum + InventoryReports.transactionCost(row), 0);
                const ganancias = totalVentas - costoVentas;
                document.getElementById('totalVentas').textContent = `$${totalVentas.toFixed(2)}`;
                document.getElementById('totalCompras').textContent = `$${totalCompras.toFixed(2)}`;
                document.getElementById('totalGanancias').textContent = `$${ganancias.toFixed(2)}`;
                document.getElementById('totalGastos').textContent = `$${totalCompras.toFixed(2)}`;
                const gananciasElement = document.getElementById('totalGanancias');
                gananciasElement.style.color = ganancias > 0 ? 'var(--secondary-color)' : ganancias < 0 ? 'var(--danger-color)' : '#666';
                displayStatus('statusDashboard', 'success', `Periodo: ${filters.period}. Ventas: $${totalVentas.toFixed(2)} | Costo ventas: $${costoVentas.toFixed(2)} | Ganancia: $${ganancias.toFixed(2)}`);
                return { totalVentas, totalCompras, costoVentas, ganancias };
            } catch (error) {
                displayStatus('statusDashboard', 'error', `Error al calcular resumen: ${error.message}`);
                return { totalVentas: 0, totalCompras: 0, ganancias: 0 };
            }

            displayStatus('statusDashboard', 'info', 'Calculando resumen financiero...');
            
            try {
                // Obtener datos de ventas y compras
                const [ventasResponse, comprasResponse] = await Promise.all([
                    fetch(`${SCRIPT_URL}?action=getData&sheetName=VENTAS`),
                    fetch(`${SCRIPT_URL}?action=getData&sheetName=COMPRAS`)
                ]);

                const ventasData = await ventasResponse.json();
                const comprasData = await comprasResponse.json();

                let totalVentas = 0;
                let totalCompras = 0;

                // Calcular total de ventas
                if (ventasData.status === 'success' && ventasData.data) {
                    totalVentas = ventasData.data.reduce((sum, venta) => {
                        return sum + (parseFloat(venta.cantidad) * parseFloat(venta.precio_venta));
                    }, 0);
                }

                // Calcular total de compras
                if (comprasData.status === 'success' && comprasData.data) {
                    totalCompras = comprasData.data.reduce((sum, compra) => {
                        return sum + (parseFloat(compra.cantidad) * parseFloat(compra.precio_compra));
                    }, 0);
                }

                const ganancias = totalVentas - totalCompras;

                // Actualizar estadísticas
                document.getElementById('totalVentas').textContent = `$${totalVentas.toFixed(2)}`;
                document.getElementById('totalCompras').textContent = `$${totalCompras.toFixed(2)}`;
                document.getElementById('totalGanancias').textContent = `$${ganancias.toFixed(2)}`;
                document.getElementById('totalGastos').textContent = `$${totalCompras.toFixed(2)}`;

                // Colores según ganancias
                const gananciasElement = document.getElementById('totalGanancias');
                if (ganancias > 0) {
                    gananciasElement.style.color = 'var(--secondary-color)';
                } else if (ganancias < 0) {
                    gananciasElement.style.color = 'var(--danger-color)';
                } else {
                    gananciasElement.style.color = '#666';
                }

                displayStatus('statusDashboard', 'success', `Resumen calculado: Ventas: $${totalVentas.toFixed(2)} | Compras: $${totalCompras.toFixed(2)} | Ganancia: $${ganancias.toFixed(2)}`);

                return { totalVentas, totalCompras, ganancias };

            } catch (error) {
                displayStatus('statusDashboard', 'error', `Error al calcular resumen: ${error.message}`);
                return { totalVentas: 0, totalCompras: 0, ganancias: 0 };
            }
        }

        async function cargarDatosGraficos() {
            await renderChartsFromRawData();
            return;

            try {
                // Obtener datos para gráficos
                const resumenResponse = await fetch(`${SCRIPT_URL}?action=getResumenDiario`);
                const resumenData = await resumenResponse.json();

                if (resumenData.status === 'success' && resumenData.data && resumenData.data.length > 0) {
                    renderCharts(resumenData.data);
                } else {
                    // Si no hay datos en resumen_diario, usar datos de ventas/compras
                    await renderChartsFromRawData();
                }

            } catch (error) {
                displayStatus('statusDashboard', 'error', `Error al cargar gráficos: ${error.message}`);
            }
        }

        async function renderChartsFromRawData() {
            try {
                const filters = getDashboardFilters();
                const resumen = dashboardReportSeries.length ? dashboardReportSeries : InventoryReports.aggregateByPeriod(dashboardRawData.ventas, dashboardRawData.compras, filters.period, filters.date);
                renderCharts(resumen);
            } catch (error) {
                console.error('Error al procesar datos para graficos:', error);
                displayStatus('statusDashboard', 'warning', 'No hay datos suficientes para generar graficos.');
            }
            return;

            try {
                const [ventasResponse, comprasResponse] = await Promise.all([
                    fetch(`${SCRIPT_URL}?action=getData&sheetName=VENTAS`),
                    fetch(`${SCRIPT_URL}?action=getData&sheetName=COMPRAS`)
                ]);

                const ventasData = await ventasResponse.json();
                const comprasData = await comprasResponse.json();

                // Agrupar por fecha
                const ventasPorFecha = {};
                const comprasPorFecha = {};

                if (ventasData.status === 'success' && ventasData.data) {
                    ventasData.data.forEach(venta => {
                        const fecha = new Date(venta.fecha).toLocaleDateString();
                        const monto = parseFloat(venta.cantidad) * parseFloat(venta.precio_venta);
                        ventasPorFecha[fecha] = (ventasPorFecha[fecha] || 0) + monto;
                    });
                }

                if (comprasData.status === 'success' && comprasData.data) {
                    comprasData.data.forEach(compra => {
                        const fecha = new Date(compra.fecha).toLocaleDateString();
                        const monto = parseFloat(compra.cantidad) * parseFloat(compra.precio_compra);
                        comprasPorFecha[fecha] = (comprasPorFecha[fecha] || 0) + monto;
                    });
                }

                // Combinar fechas
                const todasFechas = [...new Set([...Object.keys(ventasPorFecha), ...Object.keys(comprasPorFecha)])];
                todasFechas.sort((a, b) => new Date(a) - new Date(b));

                const datosResumen = todasFechas.map(fecha => ({
                    fecha: fecha,
                    total_ventas: ventasPorFecha[fecha] || 0,
                    total_compras: comprasPorFecha[fecha] || 0,
                    ganancia: (ventasPorFecha[fecha] || 0) - (comprasPorFecha[fecha] || 0)
                }));

                renderCharts(datosResumen);

            } catch (error) {
                console.error('Error al procesar datos para gráficos:', error);
                displayStatus('statusDashboard', 'warning', 'No hay datos suficientes para generar gráficos.');
            }
        }

        function renderCharts(resumenData) {
            const labels = resumenData.map(row => {
                if (row.fecha instanceof Date) {
                    return row.fecha.toLocaleDateString();
                }
                return row.fecha;
            });

            const ventas = resumenData.map(row => row.total_ventas || 0);
            const compras = resumenData.map(row => row.total_compras || 0);
            const ganancias = resumenData.map(row => row.ganancia || 0);

            // 1. Gráfico de Resumen Financiero
            const ctx1 = document.getElementById('resumenFinancieroChart').getContext('2d');
            if (resumenFinancieroChart) resumenFinancieroChart.destroy();
            resumenFinancieroChart = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Ventas',
                            data: ventas,
                            backgroundColor: 'rgba(0, 123, 255, 0.7)',
                            borderColor: 'rgba(0, 123, 255, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Compras',
                            data: compras,
                            backgroundColor: 'rgba(23, 162, 184, 0.7)',
                            borderColor: 'rgba(23, 162, 184, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Ganancias',
                            data: ganancias,
                            type: 'line',
                            fill: false,
                            backgroundColor: 'rgba(40, 167, 69, 0.7)',
                            borderColor: 'rgba(40, 167, 69, 1)',
                            borderWidth: 2,
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Resumen Financiero - Ventas, Compras y Ganancias'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Monto ($)'
                            }
                        }
                    }
                }
            });

            // 2. Gráfico de Tendencias
            const ctx2 = document.getElementById('tendenciasChart').getContext('2d');
            if (tendenciasChart) tendenciasChart.destroy();
            tendenciasChart = new Chart(ctx2, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Ventas Acumuladas',
                            data: ventas.reduce((acc, curr, i) => [...acc, (acc[i-1] || 0) + curr], []),
                            borderColor: 'rgba(0, 123, 255, 1)',
                            backgroundColor: 'rgba(0, 123, 255, 0.1)',
                            tension: 0.1,
                            fill: true
                        },
                        {
                            label: 'Compras Acumuladas',
                            data: compras.reduce((acc, curr, i) => [...acc, (acc[i-1] || 0) + curr], []),
                            borderColor: 'rgba(23, 162, 184, 1)',
                            backgroundColor: 'rgba(23, 162, 184, 0.1)',
                            tension: 0.1,
                            fill: true
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Tendencias Acumuladas - Ventas vs Compras'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Monto Acumulado ($)'
                            }
                        }
                    }
                }
            });
        }

        // ================= REST OF THE FUNCTIONS (sin cambios) =================

        function handleInventoryAction(event) {
            const button = event.target.closest('button[data-product-id]');
            if (!button) return;
            const productId = button.dataset.productId;
            const product = inventarioCache.find(function (item) { return String(item.id) === String(productId); });
            if (!product) return;
            if (button.classList.contains('inventory-edit-btn')) {
                productoEditandoId = productId;
                document.getElementById('p_nombre').value = product.nombre || '';
                document.getElementById('p_codigo').value = InventoryModule.getProductField(product, 'codigo', '');
                document.getElementById('p_categoria').value = InventoryModule.getProductField(product, 'categoria', '');
                document.getElementById('p_talla').value = product.talla || 'N/A';
                document.getElementById('p_precio_compra').value = Number(product.precio_compra || 0).toFixed(2);
                document.getElementById('p_precio_venta').value = Number(product.precio_venta || 0).toFixed(2);
                document.getElementById('p_stock').value = Number(product.stock || 0);
                document.querySelector('label[for="p_stock"]').textContent = 'Stock actual:';
                document.getElementById('p_stock').readOnly = false;
                document.getElementById('productoSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Guardar cambios';
                document.getElementById('cancelarEdicionProductoBtn').classList.remove('hidden');
                document.getElementById('productos').scrollIntoView({ behavior: 'smooth' });
            } else if (button.classList.contains('inventory-delete-btn')) {
                eliminarProducto(productId);
            }
        }

        function cancelarEdicionProducto() {
            productoEditandoId = '';
            document.getElementById('productoForm').reset();
            document.querySelector('label[for="p_stock"]').textContent = 'Stock Inicial:';
            document.getElementById('p_stock').readOnly = false;
            document.getElementById('productoSubmitBtn').innerHTML = '<i class="fas fa-save"></i> Registrar Nuevo Producto';
            document.getElementById('cancelarEdicionProductoBtn').classList.add('hidden');
        }

        async function eliminarProducto(productId) {
            if (!window.confirm('Solo se eliminara el producto si no tiene stock ni movimientos activos. ¿Deseas continuar?')) return;
            try {
                const data = await InventoryApi.post({ action: 'eliminarProducto', id: productId });
                displayStatus('statusInventario', data.status === 'success' ? 'success' : 'error', data.message);
                if (data.status === 'success') await loadInventario();
            } catch (error) {
                displayStatus('statusInventario', 'error', error.message);
            }
        }
        
        async function handlePostAction(e, action, statusDivId) {
            e.preventDefault();
            const form = e.target;
            const submitBtn = e.submitter;
            submitBtn.disabled = true;
            displayStatus(statusDivId, 'info', `Procesando...`);

            const data = {};
            Array.from(form.elements).forEach(input => {
                if (input.id && (input.id.startsWith('p_') || input.id.startsWith('c_'))) {
                    data[input.id.replace(/p_|c_/, '')] = input.value;
                }
            });
            data.action = action;
            if (action === 'actualizarProducto') data.id = productoEditandoId;

            if (action === 'agregarProducto' || action === 'actualizarProducto') {
                const validationMessage = InventoryValidation.validateProduct(data);
                if (validationMessage) {
                    displayStatus(statusDivId, 'error', validationMessage);
                    submitBtn.disabled = false;
                    return;
                }
            }

            try {
                const responseData = await InventoryApi.post(data);

                if (responseData.status === 'success') {
                    displayStatus(statusDivId, 'success', responseData.message);
                    form.reset(); 
                    if (action === 'agregarCategoria') {
                        loadInitialData();
                    }
                    if (action === 'actualizarProducto') {
                        cancelarEdicionProducto();
                        loadInventario();
                    }
                } else {
                    displayStatus(statusDivId, 'error', responseData.message);
                }
            } catch (error) {
                displayStatus(statusDivId, 'error', `Error de conexión: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
            }
        }
        
        async function handleQueryFilter(query, prefix) {
            const detailDiv = document.getElementById(`${prefix}_product_details`);
            const suggestionsDiv = document.getElementById(`${prefix}_product_suggestions`);
            const submitBtn = document.getElementById(`${prefix}_submit_btn`);
            const idInput = document.getElementById(`${prefix}_producto_id`);
            
            detailDiv.classList.add('hidden');
            detailDiv.innerHTML = '';
            if (suggestionsDiv) {
                suggestionsDiv.replaceChildren();
                suggestionsDiv.classList.add('hidden');
            }
            idInput.value = '';
            submitBtn.disabled = true;

            if (query.length < 2) return;

            try {
                const data = await InventoryApi.get('buscarProducto', { query: query });

                if (data.status === 'success' && data.data && data.data.length > 0) {
                    renderProductSuggestions(data.data, prefix);
                } else {
                    detailDiv.classList.remove('hidden');
                    detailDiv.innerHTML = `<p style="color:var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> ${data.message || 'No se encontraron productos.'}</p>`;
                }

            } catch (error) {
                detailDiv.classList.remove('hidden');
                detailDiv.innerHTML = `<p style="color:var(--danger-color);">Error de búsqueda: ${error.message}</p>`;
            }
        }

        function renderProductSuggestions(products, prefix) {
            const suggestionsDiv = document.getElementById(`${prefix}_product_suggestions`);
            if (!suggestionsDiv) return;
            suggestionsDiv.replaceChildren();
            products.slice(0, 10).forEach(function (product) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = 'product-suggestion';
                button.dataset.productId = product.id;
                const code = InventoryModule.getProductField(product, 'codigo', '');
                const category = InventoryModule.getProductField(product, 'categoria', '');
                button.textContent = `${product.nombre || ''} | Código: ${code} | Categoría: ${category} | Talla: ${product.talla || 'N/A'} | Stock: ${product.stock ?? 0}`;
                button.addEventListener('click', function () { selectProductSuggestion(product, prefix); });
                suggestionsDiv.append(button);
            });
            suggestionsDiv.classList.remove('hidden');
        }

        function selectProductSuggestion(product, prefix) {
            const detailDiv = document.getElementById(`${prefix}_product_details`);
            const suggestionsDiv = document.getElementById(`${prefix}_product_suggestions`);
            const idInput = document.getElementById(`${prefix}_producto_id`);
            const submitBtn = document.getElementById(`${prefix}_submit_btn`);
            productDataCache[product.id] = product;
            idInput.value = product.id;
            document.getElementById(`${prefix}_query`).value = `${product.nombre || ''} - ${InventoryModule.getProductField(product, 'codigo', '')}`;
            if (suggestionsDiv) {
                suggestionsDiv.replaceChildren();
                suggestionsDiv.classList.add('hidden');
            }
            updateProductDetails(product, detailDiv, prefix);
            submitBtn.disabled = false;
        }

        function updateProductDetails(product, detailDiv, prefix) {
            {
                detailDiv.classList.remove('hidden');
                const isPurchase = prefix === 'co';
                const priceValue = isPurchase ? product.precio_compra : product.precio_venta;
                const codeKey = Object.keys(product).find(key => key.toLowerCase().includes('digo'));
                const categoryKey = Object.keys(product).find(key => key.toLowerCase().includes('categor'));
                const addLine = function (label, value) {
                    const line = document.createElement('p');
                    const strong = document.createElement('b');
                    strong.textContent = `${label}: `;
                    line.append(strong, document.createTextNode(String(value ?? '')));
                    return line;
                };
                detailDiv.replaceChildren();
                detailDiv.append(addLine('ID', product.id), addLine('Producto', `${product.nombre || ''} (Cod: ${codeKey ? product[codeKey] : ''})`), addLine('Categoria', categoryKey ? product[categoryKey] : ''), addLine('Talla', product.talla || 'N/A'), addLine('Stock Actual', product.stock), addLine(isPurchase ? 'Precio Compra Actual' : 'Precio Venta Actual', `$${Number(priceValue) || 0}`));
                document.getElementById(`${prefix}_precio_${isPurchase ? 'compra' : 'venta'}`).value = Number(priceValue || 0).toFixed(2);
                document.getElementById(`${prefix}_talla`).value = product.talla || 'N/A';
                if (!isPurchase && Number(product.stock) < 5) {
                    const warning = document.createElement('p');
                    warning.className = 'status-message warning';
                    warning.style.cssText = 'display:block; margin-top:10px;';
                    warning.textContent = `Stock bajo. Solo quedan ${product.stock} unidades.`;
                    detailDiv.append(warning);
                }
                return;
            }
            detailDiv.classList.remove('hidden');
            
            const isCompra = prefix === 'co';
            const price = isCompra ? product.precio_compra : product.precio_venta;
            const priceLabel = isCompra ? 'Precio Compra Actual' : 'Precio Venta Actual';

            const stockStyle = product.stock < 5 ? 'style="font-weight:bold; color:var(--danger-color);"' : 'style="font-weight:bold; color:var(--secondary-color);"';

            detailDiv.innerHTML = `
                <p><b>ID:</b> ${product.id} | <b>Producto:</b> ${product.nombre} (Cód: ${product.código})</p>
                <p><b>Categoría:</b> ${product.categoría}</p>
                <p><b>Talla:</b> ${product.talla || 'N/A'}</p>
                <p><b>Stock Actual:</b> <span ${stockStyle}>${product.stock}</span></p>
                <p><b>${priceLabel}:</b> $${parseFloat(price).toFixed(2)}</p>
            `;
            
            document.getElementById(`${prefix}_precio_${isCompra ? 'compra' : 'venta'}`).value = parseFloat(price).toFixed(2);
            document.getElementById(`${prefix}_talla`).value = product.talla || 'N/A';
            
            if (!isCompra && product.stock < 5) {
                detailDiv.innerHTML += `<p class="status-message warning" style="display:block; margin-top: 10px;">Stock bajo. Solo quedan ${product.stock} unidades.</p>`;
            }
        }

        async function handleTransactionPost(e, type) {
            e.preventDefault();
            const form = e.target;
            const prefix = type === 'compra' ? 'co' : 'v';
            const statusDivId = type === 'compra' ? 'statusCompra' : 'statusVenta';
            
            const submitBtn = document.getElementById(`${prefix}_submit_btn`);
            submitBtn.disabled = true;
            displayStatus(statusDivId, 'info', `Registrando ${type}...`);

            const productoId = document.getElementById(`${prefix}_producto_id`).value;
            
            if (!productoId) {
                 displayStatus(statusDivId, 'error', `No hay producto seleccionado. Busque y seleccione uno.`);
                 submitBtn.disabled = false;
                 return;
            }

            const transaccionData = {
                action: 'registrarTransaccion',
                producto_id: productoId,
                cantidad: document.getElementById(`${prefix}_cantidad`).value,
                precio: document.getElementById(`${prefix}_precio_${type === 'compra' ? 'compra' : 'venta'}`).value,
                type: type,
                extra_data: document.getElementById(`${prefix}_${type === 'compra' ? 'proveedor' : 'cliente'}`).value,
                metodo_pago: document.getElementById(`${prefix}_metodo_pago`).value,
                talla: document.getElementById(`${prefix}_talla`).value,
                request_id: window.crypto && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            };

            const validationMessage = InventoryValidation.validateTransaction(transaccionData);
            if (validationMessage) {
                displayStatus(statusDivId, 'error', validationMessage);
                submitBtn.disabled = false;
                return;
            }

            try {
                const data = await InventoryApi.post(transaccionData);

                if (data.status === 'success') {
                    displayStatus(statusDivId, 'success', data.message);
                    form.reset(); 
                    delete productDataCache[productoId]; 
                    document.getElementById(`${prefix}_product_details`).classList.add('hidden');
                } else {
                    displayStatus(statusDivId, 'error', data.message);
                }
            } catch (error) {
                displayStatus(statusDivId, 'error', `Error de conexión: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
            }
        }
        
        async function loadInventario() {
            displayStatus('statusInventario', 'info', 'Cargando datos de inventario...');
            const tableBody = document.getElementById('inventarioTableBody');
            tableBody.innerHTML = '<tr><td colspan="7">Cargando...</td></tr>';

            try {
                const data = await InventoryApi.get('getInventario');

                if (data.status === 'success' && data.data && data.data.length > 0) {
                    displayStatus('statusInventario', 'success', `Inventario cargado: ${data.data.length} productos.`);
                    /* Legacy table rendering removed; InventoryModule handles the table.
                    if (false) tableBody.innerHTML = data.data.map(p => {
                        const stockStyle = p.stock < 5 ? 'style="color: var(--danger-color); font-weight: bold;"' : '';
                        return `
                            <tr>
                                <td>${p.id}</td>
                                <td>${p.nombre}</td>
                                <td>${p.código}</td>
                                <td>${p.categoría}</td>
                                <td>${p.talla || 'N/A'}</td>
                                <td ${stockStyle}>${p.stock}</td>
                                <td>$${p.precio_venta.toFixed(2)}</td>
                            </tr>
                        `;
                    }).join('');
                    */
                    inventarioCache = data.data;
                    populateInventoryCategories(inventarioCache);
                    inventarioPagina = 1;
                    renderInventoryTable(inventarioCache);
                    const lowStock = inventarioCache.filter(p => Number(p.stock) < 5);
                    const alert = document.getElementById('alertasInventario');
                    alert.classList.remove('hidden');
                    alert.style.display = lowStock.length ? 'block' : 'none';
                    if (lowStock.length) alert.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${lowStock.length} producto(s) tienen stock bajo.`;
                } else {
                    displayStatus('statusInventario', 'warning', data.message);
                    tableBody.innerHTML = '<tr><td colspan="8">No hay productos en inventario.</td></tr>';
                }
            } catch (error) {
                displayStatus('statusInventario', 'error', `Error al cargar inventario: ${error.message}`);
                tableBody.innerHTML = '<tr><td colspan="8">Error al cargar datos.</td></tr>';
            }
        }
        
        function renderInventoryTable(products) {
            inventarioFiltrado = products;
            const result = InventoryModule.renderTable('inventarioTableBody', products, inventarioPagina, inventarioPorPagina, currentUser && currentUser.rol === 'admin');
            inventarioPagina = result.page;
            const legacyControls = document.getElementById('inventarioPaginacion');
            legacyControls.classList.toggle('hidden', products.length <= inventarioPorPagina);
            document.getElementById('inventarioPaginaInfo').textContent = `Pagina ${inventarioPagina} de ${result.totalPages}`;
            document.getElementById('inventarioAnterior').disabled = inventarioPagina <= 1;
            document.getElementById('inventarioSiguiente').disabled = inventarioPagina >= result.totalPages;
            return;

            const tableBody = document.getElementById('inventarioTableBody');
            inventarioFiltrado = products;
            const totalPaginas = Math.max(1, Math.ceil(products.length / inventarioPorPagina));
            inventarioPagina = Math.min(inventarioPagina, totalPaginas);
            const inicio = (inventarioPagina - 1) * inventarioPorPagina;
            const pagina = products.slice(inicio, inicio + inventarioPorPagina);
            tableBody.innerHTML = pagina.map(p => {
                const stockStyle = Number(p.stock) < 5 ? 'style="color: var(--danger-color); font-weight: bold;"' : '';
                return `<tr><td>${p.id}</td><td>${p.nombre}</td><td>${p['cÃ³digo']}</td><td>${p['categorÃ­a']}</td><td>${p.talla || 'N/A'}</td><td ${stockStyle}>${p.stock}</td><td>$${Number(p.precio_venta).toFixed(2)}</td></tr>`;
            }).join('') || '<tr><td colspan="7">No hay productos que coincidan con el filtro.</td></tr>';
            const controls = document.getElementById('inventarioPaginacion');
            controls.classList.toggle('hidden', products.length <= inventarioPorPagina);
            document.getElementById('inventarioPaginaInfo').textContent = `Pagina ${inventarioPagina} de ${totalPaginas}`;
            document.getElementById('inventarioAnterior').disabled = inventarioPagina <= 1;
            document.getElementById('inventarioSiguiente').disabled = inventarioPagina >= totalPaginas;
        }

        function populateInventoryCategories(products) {
            const select = document.getElementById('inventarioCategoriaFiltro');
            const currentValue = select.value;
            const categories = Array.from(new Set((products || []).map(function (product) {
                return String(InventoryModule.getProductField(product, 'categoria', '') || '').trim();
            }).filter(Boolean))).sort(function (a, b) { return a.localeCompare(b); });
            select.replaceChildren(new Option('Todas las categorias', ''));
            categories.forEach(function (category) { select.add(new Option(category, category)); });
            if (categories.indexOf(currentValue) !== -1) select.value = currentValue;
        }

        function filterInventory() {
            const query = document.getElementById('inventarioFiltro').value;
            const talla = document.getElementById('inventarioTallaFiltro').value;
            const categoria = document.getElementById('inventarioCategoriaFiltro').value;
            inventarioPagina = 1;
            renderInventoryTable(InventoryModule.filter(inventarioCache, query, talla, categoria));
            return;

            const legacyQuery = document.getElementById('inventarioFiltro').value.toLowerCase().trim();
            const legacyTalla = document.getElementById('inventarioTallaFiltro').value;
            const filtered = inventarioCache.filter(p => {
                const text = `${p.nombre || ''} ${p['cÃ³digo'] || ''} ${p.id || ''}`.toLowerCase();
                return text.includes(legacyQuery) && (!legacyTalla || String(p.talla || 'N/A') === legacyTalla);
            });
            inventarioPagina = 1;
            renderInventoryTable(filtered);
        }

        function changeInventoryPage(delta) {
            inventarioPagina += delta;
            renderInventoryTable(inventarioFiltrado);
        }

        async function loadSummary(type) {
            currentSummaryType = type;
            document.getElementById('exportarResumenBtn').disabled = false;
            document.getElementById('imprimirResumenBtn').disabled = false;
            const sheetName = type === 'Ventas' ? 'VENTAS' : 'COMPRAS';
            const period = document.getElementById('resumenPeriodo').value;
            const referenceDate = document.getElementById('resumenFecha').value;
            displayStatus('statusResumen', 'info', `Cargando resumen de ${sheetName}...`);
            const table = document.getElementById('resumenTable');
            const tableHead = table.querySelector('thead');
            const tableBody = document.getElementById('resumenTableBody');
            table.classList.add('hidden');
            tableBody.textContent = '';
            try {
                const data = await InventoryApi.get('getReportePeriodo', { tipo: type.toLowerCase(), periodo: period, fecha: referenceDate });
                const rows = data.status === 'success' ? (data.data || []) : [];
                if (data.status === 'success' && rows.length > 0) {
                    displayStatus('statusResumen', 'success', `${rows.length} ${sheetName.toLowerCase()} encontradas para el periodo seleccionado.`);
                    table.classList.remove('hidden');
                    const headers = Object.keys(rows[0]);
                    tableHead.innerHTML = `<tr>${headers.map(header => `<th>${escapeHtml(header.toUpperCase().replace('_', ' '))}</th>`).join('')}</tr>`;
                    tableBody.innerHTML = rows.map(row => `<tr>${headers.map(header => {
                        const value = row[header] instanceof Date ? row[header].toLocaleDateString() : row[header];
                        return `<td>${escapeHtml(value)}</td>`;
                    }).join('')}</tr>`).join('');
                } else {
                    displayStatus('statusResumen', 'warning', 'No hay registros activos para el periodo seleccionado.');
                }
            } catch (error) {
                displayStatus('statusResumen', 'error', `Error al cargar resumen: ${error.message}`);
            }
            return;

            /* Legacy summary rendering retained only for reference during migration.
            if (false) {
            currentSummaryType = type;
            document.getElementById('exportarResumenBtn').disabled = false;
            document.getElementById('imprimirResumenBtn').disabled = false;
            const sheetName = type === 'Ventas' ? 'VENTAS' : 'COMPRAS';
            displayStatus('statusResumen', 'info', `Cargando resumen de ${sheetName}...`);
            const table = document.getElementById('resumenTable');
            const tableHead = table.querySelector('thead');
            const tableBody = document.getElementById('resumenTableBody');
            table.classList.add('hidden');
            tableBody.innerHTML = '';

            try {
                const response = await fetch(`${SCRIPT_URL}?action=getData&sheetName=${sheetName}`);
                const data = await response.json();

                if (data.status === 'success' && data.data.length > 0) {
                    displayStatus('statusResumen', 'success', `${data.data.length} ${sheetName} registradas.`);
                    table.classList.remove('hidden');
                    
                    const headers = Object.keys(data.data[0]).map(h => `<th>${h.toUpperCase().replace('_', ' ')}</th>`).join('');
                    tableHead.innerHTML = `<tr>${headers}</tr>`;

                    tableBody.innerHTML = data.data.map(row => {
                        const cells = Object.values(row).map(value => {
                            if (value instanceof Date) {
                                value = value.toLocaleDateString();
                            } else if (typeof value === 'number') {
                                value = value.toFixed(2);
                            }
                            return `<td>${value}</td>`;
                        }).join('');
                        return `<tr>${cells}</tr>`;
                    }).join('');

                } else {
                    displayStatus('statusResumen', 'warning', `No hay datos en la pestaña ${sheetName}.`);
                }
            } catch (error) {
                displayStatus('statusResumen', 'error', `Error al cargar resumen: ${error.message}`);
            }
            }
        }
        
            */
        }
        function exportCurrentSummary() {
            if (!currentSummaryType) return displayStatus('statusResumen', 'warning', 'Primero selecciona Ventas o Compras.');
            const period = document.getElementById('resumenPeriodo').value;
            const date = document.getElementById('resumenFecha').value || 'actual';
            const exported = InventoryReports.exportTableToCsv('resumenTable', `${currentSummaryType.toLowerCase()}-${period}-${date}.csv`);
            if (exported) displayStatus('statusResumen', 'success', 'Reporte exportado correctamente.');
        }

        function exportCurrentDashboard() {
            const filters = getDashboardFilters();
            const rows = InventoryReports.aggregateByPeriod(dashboardRawData.ventas, dashboardRawData.compras, filters.period, filters.date).map(row => ({
                fecha: row.fecha,
                ventas: row.total_ventas.toFixed(2),
                compras: row.total_compras.toFixed(2),
                ganancia: row.ganancia.toFixed(2)
            }));
            const date = filters.date || 'actual';
            const exported = InventoryReports.exportRowsToCsv(rows, `dashboard-${filters.period}-${date}.csv`);
            displayStatus('statusDashboard', exported ? 'success' : 'warning', exported ? 'Dashboard exportado correctamente.' : 'No hay datos para exportar.');
        }

        async function handleCancellation(event) {
            event.preventDefault();
            if (!confirm('Esta accion revertira el stock y marcara la transaccion como ANULADA. ¿Deseas continuar?')) return;
            const payload = {
                action: 'anularTransaccion',
                type: document.getElementById('anularTipo').value,
                id: document.getElementById('anularId').value.trim()
            };
            try {
                const data = await InventoryApi.post(payload);
                displayStatus('statusAnular', data.status === 'success' ? 'success' : 'error', data.message);
                if (data.status === 'success') {
                    document.getElementById('anularForm').reset();
                    document.getElementById('cargarInventarioBtn').click();
                    if (currentSummaryType) loadSummary(currentSummaryType);
                }
            } catch (error) {
                displayStatus('statusAnular', 'error', error.message || 'No se pudo anular la transaccion.');
            }
        }

        async function handleConfigAction(action) {
            const statusConfig = document.getElementById('statusConfig');
            setButtonState(true);
            displayStatus('statusConfig', 'info', `Procesando la acción de ${action}...`);

            try {
                const data = await InventoryApi.get(action);

                if (data.status === 'success') {
                    displayStatus('statusConfig', 'success', data.message);
                    loadInitialData();
                } else {
                    displayStatus('statusConfig', 'error', data.message);
                }
            } catch (error) {
                displayStatus('statusConfig', 'error', `Error de conexión: ${error.message}.`);
            } finally {
                setButtonState(false);
            }
        }

        function setButtonState(disabled) {
            document.getElementById('iniciarDBBtn').disabled = disabled;
            document.getElementById('resetDBBtn').disabled = disabled;
        }
        
        async function loadUsers() {
            const data = await InventoryApi.get('usuarios');
            if (data.status !== 'success') return displayStatus('statusUsuarios', 'error', data.message);
            const tableBody = document.getElementById('usuariosTableBody');
            tableBody.replaceChildren();
            data.data.forEach(function (user) {
                const row = document.createElement('tr');
                [user.nombre, user.cedula, user.email, user.rol, user.activo ? 'Activo' : 'Inactivo'].forEach(function (value) {
                    const cell = document.createElement('td');
                    cell.textContent = value || '';
                    row.append(cell);
                });
                const actions = document.createElement('td');
                const editButton = document.createElement('button');
                editButton.className = 'btn secondary-btn btn-small';
                editButton.textContent = 'Editar';
                editButton.addEventListener('click', function () { window.editUser(user.id); });
                const deleteButton = document.createElement('button');
                deleteButton.className = 'btn danger-btn btn-small';
                deleteButton.textContent = 'Eliminar';
                deleteButton.addEventListener('click', function () { window.removeUser(user.id); });
                actions.append(editButton, document.createTextNode(' '), deleteButton);
                row.append(actions);
                tableBody.append(row);
            });
        }

        async function saveUser(event) {
            event.preventDefault();
            const id = document.getElementById('u_id').value;
            const payload = { action: id ? 'actualizarUsuario' : 'crearUsuario', id: id, nombre: document.getElementById('u_nombre').value, cedula: document.getElementById('u_cedula').value, fecha_nacimiento: document.getElementById('u_fecha_nacimiento').value, email: document.getElementById('u_email').value, password: document.getElementById('u_password').value, rol: document.getElementById('u_rol').value, activo: true };
            try {
                const data = await InventoryApi.post(payload);
                displayStatus('statusUsuarios', data.status === 'success' ? 'success' : 'error', data.message);
                if (data.status === 'success') { resetUserForm(); loadUsers(); }
            } catch (error) { displayStatus('statusUsuarios', 'error', error.message); }
        }

        window.editUser = async function(id) {
            const data = await InventoryApi.get('usuarios');
            const user = (data.data || []).find(item => item.id === id);
            if (!user) return;
            document.getElementById('u_id').value = user.id;
            document.getElementById('u_nombre').value = user.nombre;
            document.getElementById('u_cedula').value = user.cedula;
            document.getElementById('u_fecha_nacimiento').value = user.fecha_nacimiento ? String(user.fecha_nacimiento).substring(0, 10) : '';
            document.getElementById('u_email').value = user.email;
            document.getElementById('u_rol').value = user.rol;
            document.getElementById('u_password').value = '';
        };

        window.removeUser = async function(id) {
            if (!confirm('¿Deseas desactivar este usuario?')) return;
            const data = await InventoryApi.post({ action: 'eliminarUsuario', id: id });
            displayStatus('statusUsuarios', data.status === 'success' ? 'success' : 'error', data.message);
            if (data.status === 'success') loadUsers();
        };

        function resetUserForm() { document.getElementById('usuarioForm').reset(); document.getElementById('u_id').value = ''; }

        async function loadProfile() {
            const data = await InventoryApi.get('perfil');
            if (data.status !== 'success') return;
            const user = data.data;
            document.getElementById('perfilNombre').value = user.nombre;
            document.getElementById('perfilCedula').value = user.cedula;
            document.getElementById('perfilFechaNacimiento').value = user.fecha_nacimiento ? String(user.fecha_nacimiento).substring(0, 10) : '';
            document.getElementById('perfilEmail').value = user.email;
        }

        async function saveProfile(event) {
            event.preventDefault();
            const payload = { action: 'actualizarPerfil', nombre: document.getElementById('perfilNombre').value, cedula: document.getElementById('perfilCedula').value, fecha_nacimiento: document.getElementById('perfilFechaNacimiento').value, email: document.getElementById('perfilEmail').value };
            const data = await InventoryApi.post(payload);
            displayStatus('statusPerfil', data.status === 'success' ? 'success' : 'error', data.message);
        }

        async function changePassword(event) {
            event.preventDefault();
            const payload = { action: 'cambiarPassword', currentPassword: document.getElementById('currentPassword').value, newPassword: document.getElementById('newPassword').value };
            const data = await InventoryApi.post(payload);
            displayStatus('statusPassword', data.status === 'success' ? 'success' : 'error', data.message);
            if (data.status === 'success') document.getElementById('passwordForm').reset();
        }

        async function logout() {
            try { await InventoryApi.post({ action: 'logout' }); } catch (_) {}
            clearSession();
            window.location.reload();
        }

        function displayStatus(elementId, type, message) {
            const el = document.getElementById(elementId);
            el.style.display = 'block';
            el.className = `status-message ${type}`;
            el.textContent = '';
            const icon = document.createElement('i');
            icon.className = `fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : type === 'warning' ? 'exclamation-triangle' : 'info'}-circle`;
            el.append(icon, document.createTextNode(` ${String(message || '')}`));
        }
