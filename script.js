     const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxGdrvl2vQxHb-Z6FaNnQ7ad8j4CxkUrKnfPiCyWaRzlERsctPAB4o9j-2embW1Xiwj/exec';
     let authToken = localStorage.getItem('inventario_auth_token') || '';
     let currentUser = JSON.parse(localStorage.getItem('inventario_user') || 'null');
     let appInitialized = false;

     // Agrega el token de sesion a las llamadas existentes sin duplicar logica HTTP.
     const nativeFetch = window.fetch.bind(window);
     window.fetch = function(input, options) {
         options = options || {};
         const url = typeof input === 'string' ? input : input.url;
         if (authToken && url && url.indexOf(SCRIPT_URL) === 0) {
            if ((!options.method || options.method.toUpperCase() === 'GET') && url.indexOf('token=') === -1) {
                 const separator = url.indexOf('?') >= 0 ? '&' : '?';
                 input = url + separator + 'token=' + encodeURIComponent(authToken);
             } else if (typeof options.body === 'string') {
                 try {
                     const payload = JSON.parse(options.body);
                     payload.token = authToken;
                     options.body = JSON.stringify(payload);
                 } catch (_) { /* solicitudes no JSON no requieren token aqui */ }
             }
         }
         return nativeFetch(input, options);
     };
      
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

        document.addEventListener('DOMContentLoaded', () => {
            setupAuth();
        });

        function setupAuth() {
            document.getElementById('loginForm').addEventListener('submit', handleLogin);
            if (authToken) {
                fetch(`${SCRIPT_URL}?action=perfil`).then(response => response.json()).then(data => {
                    if (data.status === 'success') {
                        currentUser = data.data;
                        localStorage.setItem('inventario_user', JSON.stringify(currentUser));
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
                const response = await nativeFetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'login', email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
                const data = await response.json();
                if (data.status !== 'success') throw new Error(data.message);
                authToken = data.token;
                currentUser = data.user;
                localStorage.setItem('inventario_auth_token', authToken);
                localStorage.setItem('inventario_user', JSON.stringify(currentUser));
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
            localStorage.removeItem('inventario_auth_token');
            localStorage.removeItem('inventario_user');
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
                const response = await fetch(`${SCRIPT_URL}?action=getCategorias`);
                const data = await response.json();
                
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
            // Configuración
            document.getElementById('iniciarDBBtn').addEventListener('click', () => handleConfigAction('iniciar'));
            document.getElementById('resetDBBtn').addEventListener('click', () => {
                if (window.confirm("¡ADVERTENCIA! ¿Deseas RESETEAR TODA la base de datos? Esto es irreversible.")) {
                    handleConfigAction('resetear');
                }
            });

            // Categorías y Productos
            document.getElementById('categoriaForm').addEventListener('submit', (e) => handlePostAction(e, 'agregarCategoria', 'statusCategoria'));
            document.getElementById('productoForm').addEventListener('submit', (e) => handlePostAction(e, 'agregarProducto', 'statusProducto'));
            
            // Compras/Ventas
            document.getElementById('co_query').addEventListener('input', (e) => handleQueryFilter(e.target.value, 'co'));
            document.getElementById('v_query').addEventListener('input', (e) => handleQueryFilter(e.target.value, 'v'));
            
            document.getElementById('compraForm').addEventListener('submit', (e) => handleTransactionPost(e, 'compra'));
            document.getElementById('ventaForm').addEventListener('submit', (e) => handleTransactionPost(e, 'venta'));

            // Resúmenes
            document.getElementById('resumenVentasBtn').addEventListener('click', () => loadSummary('Ventas'));
            document.getElementById('resumenComprasBtn').addEventListener('click', () => loadSummary('Compras'));
            document.getElementById('exportarResumenBtn').addEventListener('click', exportCurrentSummary);
            document.getElementById('imprimirResumenBtn').addEventListener('click', () => InventoryReports.printSummary());
            document.getElementById('anularForm').addEventListener('submit', handleCancellation);
            document.getElementById('inventarioAnterior').addEventListener('click', () => changeInventoryPage(-1));
            document.getElementById('inventarioSiguiente').addEventListener('click', () => changeInventoryPage(1));

            // Dashboard
            document.getElementById('cargarInventarioBtn').addEventListener('click', loadInventario);
            document.getElementById('inventarioFiltro').addEventListener('input', filterInventory);
            document.getElementById('inventarioTallaFiltro').addEventListener('change', filterInventory);
            document.getElementById('cargarDatosGraficosBtn').addEventListener('click', handleLoadDashboard);
            document.getElementById('calcularResumenBtn').addEventListener('click', calcularResumenFinanciero);
            document.getElementById('usuarioForm').addEventListener('submit', saveUser);
            document.getElementById('cancelarUsuarioBtn').addEventListener('click', resetUserForm);
            document.getElementById('perfilForm').addEventListener('submit', saveProfile);
            document.getElementById('passwordForm').addEventListener('submit', changePassword);
            document.getElementById('logoutBtn').addEventListener('click', logout);
        }

        // ================= DASHBOARD FUNCTIONS =================
        
        async function handleLoadDashboard() {
            await calcularResumenFinanciero();
            await cargarDatosGraficos();
        }

        async function calcularResumenFinanciero() {
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

            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify(data),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                const responseData = await response.json();

                if (responseData.status === 'success') {
                    displayStatus(statusDivId, 'success', responseData.message);
                    form.reset(); 
                    if (action === 'agregarCategoria') {
                        loadInitialData();
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
            const submitBtn = document.getElementById(`${prefix}_submit_btn`);
            const idInput = document.getElementById(`${prefix}_producto_id`);
            
            detailDiv.classList.add('hidden');
            detailDiv.innerHTML = '';
            idInput.value = '';
            submitBtn.disabled = true;

            if (query.length < 2) return;

            try {
                const response = await fetch(`${SCRIPT_URL}?action=buscarProducto&query=${encodeURIComponent(query)}`);
                const data = await response.json();

                if (data.status === 'success' && data.data && data.data.length > 0) {
                    const product = data.data[0];
                    productDataCache[product.id] = product;
                    updateProductDetails(product, detailDiv, prefix);
                    idInput.value = product.id;
                    submitBtn.disabled = false;
                } else {
                    detailDiv.classList.remove('hidden');
                    detailDiv.innerHTML = `<p style="color:var(--danger-color);"><i class="fas fa-exclamation-triangle"></i> ${data.message || 'No se encontraron productos.'}</p>`;
                }

            } catch (error) {
                detailDiv.classList.remove('hidden');
                detailDiv.innerHTML = `<p style="color:var(--danger-color);">Error de búsqueda: ${error.message}</p>`;
            }
        }

        function updateProductDetails(product, detailDiv, prefix) {
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
            };

            try {
                const response = await fetch(SCRIPT_URL, {
                    method: 'POST',
                    body: JSON.stringify(transaccionData),
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' }
                });
                const data = await response.json();

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
                    inventarioCache = data.data;
                    inventarioPagina = 1;
                    renderInventoryTable(inventarioCache);
                    const lowStock = inventarioCache.filter(p => Number(p.stock) < 5);
                    const alert = document.getElementById('alertasInventario');
                    alert.classList.remove('hidden');
                    alert.style.display = lowStock.length ? 'block' : 'none';
                    if (lowStock.length) alert.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${lowStock.length} producto(s) tienen stock bajo.`;
                } else {
                    displayStatus('statusInventario', 'warning', data.message);
                    tableBody.innerHTML = '<tr><td colspan="7">No hay productos en inventario.</td></tr>';
                }
            } catch (error) {
                displayStatus('statusInventario', 'error', `Error al cargar inventario: ${error.message}`);
                tableBody.innerHTML = '<tr><td colspan="7">Error al cargar datos.</td></tr>';
            }
        }
        
        function renderInventoryTable(products) {
            inventarioFiltrado = products;
            const result = InventoryModule.renderTable('inventarioTableBody', products, inventarioPagina, inventarioPorPagina);
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

        function filterInventory() {
            const query = document.getElementById('inventarioFiltro').value;
            const talla = document.getElementById('inventarioTallaFiltro').value;
            inventarioPagina = 1;
            renderInventoryTable(InventoryModule.filter(inventarioCache, query, talla));
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
        
        function exportCurrentSummary() {
            if (!currentSummaryType) return displayStatus('statusResumen', 'warning', 'Primero selecciona Ventas o Compras.');
            const exported = InventoryReports.exportTableToCsv('resumenTable', `${currentSummaryType.toLowerCase()}-reporte.csv`);
            if (exported) displayStatus('statusResumen', 'success', 'Reporte exportado correctamente.');
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
                const data = await (await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })).json();
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
                const response = await fetch(`${SCRIPT_URL}?action=${action}`);
                const data = await response.json();

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
            const response = await fetch(`${SCRIPT_URL}?action=usuarios`);
            const data = await response.json();
            if (data.status !== 'success') return displayStatus('statusUsuarios', 'error', data.message);
            document.getElementById('usuariosTableBody').innerHTML = data.data.map(user => `<tr><td>${user.nombre}</td><td>${user.cedula}</td><td>${user.email}</td><td>${user.rol}</td><td>${user.activo ? 'Activo' : 'Inactivo'}</td><td><button class="btn secondary-btn btn-small" onclick="editUser('${user.id}')">Editar</button> <button class="btn danger-btn btn-small" onclick="removeUser('${user.id}')">Eliminar</button></td></tr>`).join('');
        }

        async function saveUser(event) {
            event.preventDefault();
            const id = document.getElementById('u_id').value;
            const payload = { action: id ? 'actualizarUsuario' : 'crearUsuario', id: id, nombre: document.getElementById('u_nombre').value, cedula: document.getElementById('u_cedula').value, fecha_nacimiento: document.getElementById('u_fecha_nacimiento').value, email: document.getElementById('u_email').value, password: document.getElementById('u_password').value, rol: document.getElementById('u_rol').value, activo: true };
            try {
                const data = await (await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })).json();
                displayStatus('statusUsuarios', data.status === 'success' ? 'success' : 'error', data.message);
                if (data.status === 'success') { resetUserForm(); loadUsers(); }
            } catch (error) { displayStatus('statusUsuarios', 'error', error.message); }
        }

        window.editUser = async function(id) {
            const data = await (await fetch(`${SCRIPT_URL}?action=usuarios`)).json();
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
            const data = await (await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'eliminarUsuario', id: id }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })).json();
            displayStatus('statusUsuarios', data.status === 'success' ? 'success' : 'error', data.message);
            if (data.status === 'success') loadUsers();
        };

        function resetUserForm() { document.getElementById('usuarioForm').reset(); document.getElementById('u_id').value = ''; }

        async function loadProfile() {
            const data = await (await fetch(`${SCRIPT_URL}?action=perfil`)).json();
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
            const data = await (await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })).json();
            displayStatus('statusPerfil', data.status === 'success' ? 'success' : 'error', data.message);
        }

        async function changePassword(event) {
            event.preventDefault();
            const payload = { action: 'cambiarPassword', currentPassword: document.getElementById('currentPassword').value, newPassword: document.getElementById('newPassword').value };
            const data = await (await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })).json();
            displayStatus('statusPassword', data.status === 'success' ? 'success' : 'error', data.message);
            if (data.status === 'success') document.getElementById('passwordForm').reset();
        }

        async function logout() {
            try { await (await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'logout' }), headers: { 'Content-Type': 'text/plain;charset=utf-8' } })).json(); } catch (_) {}
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
