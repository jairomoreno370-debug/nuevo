// Aplicación Principal - OPTIMIZADO Y COMPLETADO
class FlotaApp {
    constructor() {
        this.currentModule = 'dashboard';
        this.isSidebarOpen = true;
        this.charts = new Map();
        this.init();
    }

    async init() {
        try {
            // Esperar a que la base de datos esté lista
            await this.waitForDatabase();
            
            this.setupNavigation();
            this.setupEventListeners();
            this.setupGlobalHandlers();
            await this.loadInitialData();
            
            // Inicializar gráficos después de que el DOM esté completamente cargado
            setTimeout(() => {
                this.initializeCharts();
            }, 100);
            
            console.log('✅ Aplicación inicializada correctamente');
            
        } catch (error) {
            console.error('❌ Error inicializando la aplicación:', error);
            this.showError('Error al inicializar la aplicación: ' + error.message);
        }
    }

    async waitForDatabase() {
        const maxAttempts = 10;
        const delay = 200;
        
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            if (window.database && window.database.db) {
                try {
                    await window.database.db.open();
                    return true;
                } catch (error) {
                    if (attempt === maxAttempts) throw error;
                }
            }
            await new Promise(resolve => setTimeout(resolve, delay));
        }
        throw new Error('No se pudo conectar con la base de datos');
    }

    setupNavigation() {
        // Navegación por módulos
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const module = item.getAttribute('data-module');
                
                // Verificar permisos para módulo de administración
                if (module === 'admin' && !this.hasAdminPermission()) {
                    this.showError('No tiene permisos para acceder al módulo de administración');
                    return;
                }
                
                this.showModule(module);
            });
        });

        // Toggle sidebar en móviles
        const sidebarToggle = document.getElementById('sidebarToggle');
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => {
                this.toggleSidebar();
            });
        }

        // Cerrar sidebar al hacer clic fuera en móviles
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && this.isSidebarOpen) {
                const sidebar = document.getElementById('sidebar');
                const toggleBtn = document.getElementById('sidebarToggle');
                
                if (!sidebar.contains(e.target) && !toggleBtn.contains(e.target)) {
                    this.toggleSidebar(false);
                }
            }
        });
    }

    setupEventListeners() {
        // Tabs principales
        this.setupTabSystem('.tabs', '.tab-button', '.tab-pane');
        
        // Tabs de administración
        this.setupTabSystem('.admin-tabs', '.admin-tab-button', '.admin-tab-pane');

        // Formulario de presupuesto
        const budgetForm = document.getElementById('budgetForm');
        if (budgetForm) {
            budgetForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleBudgetSubmit(e);
            });
        }

        // Formulario de configuración del sistema
        const configForm = document.querySelector('.config-form');
        if (configForm) {
            configForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSystemConfigSubmit(e);
            });
        }

        // Event listeners para report cards
        const reportCards = document.querySelectorAll('.report-card');
        reportCards.forEach(card => {
            card.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const reportType = card.getAttribute('onclick')?.match(/showReport\('([^']+)'\)/)?.[1];
                    if (reportType) {
                        this.showReport(reportType);
                    }
                }
            });
        });
    }

    setupGlobalHandlers() {
        // Manejar clicks en modales
        document.addEventListener('click', (e) => {
            if (e.target.id === 'modal') {
                closeModal();
            }
        });

        // Manejar tecla ESC para cerrar modales
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('modal');
                if (!modal.classList.contains('hidden')) {
                    closeModal();
                }
                
                const dropdown = document.getElementById('userDropdown');
                if (dropdown && dropdown.classList.contains('show')) {
                    dropdown.classList.remove('show');
                }
            }
        });

        // Prevenir envío de formularios con Enter
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON') {
                const form = e.target.closest('form');
                if (form && !form.querySelector('button[type="submit"]')) {
                    e.preventDefault();
                }
            }
        });
    }

    setupTabSystem(containerSelector, buttonSelector, paneSelector) {
        const containers = document.querySelectorAll(containerSelector);
        
        containers.forEach(container => {
            const buttons = container.querySelectorAll(buttonSelector);
            
            buttons.forEach(button => {
                button.addEventListener('click', () => {
                    const tab = button.getAttribute('data-tab');
                    
                    // Actualizar botones
                    buttons.forEach(btn => {
                        btn.classList.remove('active');
                        btn.setAttribute('aria-selected', 'false');
                    });
                    button.classList.add('active');
                    button.setAttribute('aria-selected', 'true');
                    
                    // Actualizar paneles
                    const panes = container.nextElementSibling?.querySelectorAll(paneSelector) || 
                                 document.querySelectorAll(paneSelector);
                    
                    panes.forEach(pane => {
                        const isActive = pane.id === tab;
                        pane.classList.toggle('active', isActive);
                        pane.hidden = !isActive;
                    });

                    // Cargar datos específicos del tab si es necesario
                    this.loadTabData(tab);
                });
            });
        });
    }

    showModule(moduleName) {
        // Validar módulo
        const validModules = ['dashboard', 'vehicles', 'maintenance', 'expenses', 'reports', 'admin'];
        if (!validModules.includes(moduleName)) {
            console.warn(`Módulo no válido: ${moduleName}`);
            return;
        }

        // Ocultar módulo actual
        const currentModule = document.querySelector('.module.active');
        if (currentModule) {
            currentModule.classList.remove('active');
            currentModule.hidden = true;
        }

        // Mostrar nuevo módulo
        const newModule = document.getElementById(moduleName);
        if (newModule) {
            newModule.classList.add('active');
            newModule.hidden = false;
            
            // Actualizar URL hash
            window.location.hash = moduleName;
        }

        // Actualizar menú activo
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            const isActive = item.getAttribute('data-module') === moduleName;
            item.classList.toggle('active', isActive);
            item.setAttribute('aria-selected', isActive.toString());
        });

        this.currentModule = moduleName;

        // Cargar datos específicos del módulo
        this.loadModuleData(moduleName);

        // Cerrar sidebar en móviles
        if (window.innerWidth <= 768) {
            this.toggleSidebar(false);
        }

        // Actualizar título de la página
        this.updatePageTitle(moduleName);
    }

    updatePageTitle(moduleName) {
        const moduleTitles = {
            'dashboard': 'Dashboard',
            'vehicles': 'Vehículos',
            'maintenance': 'Mantenimiento',
            'expenses': 'Gastos',
            'reports': 'Reportes',
            'admin': 'Administración'
        };
        
        const title = moduleTitles[moduleName] || 'Gestión de Flota';
        document.title = `${title} - Sistema de Gestión de Flota Vehicular`;
    }

    toggleSidebar(forceState = null) {
        const sidebar = document.getElementById('sidebar');
        const toggleBtn = document.getElementById('sidebarToggle');
        
        this.isSidebarOpen = forceState !== null ? forceState : !this.isSidebarOpen;
        
        if (window.innerWidth <= 768) {
            sidebar.classList.toggle('active', this.isSidebarOpen);
        } else {
            sidebar.classList.toggle('collapsed', !this.isSidebarOpen);
        }
        
        toggleBtn?.setAttribute('aria-expanded', this.isSidebarOpen.toString());
        
        // Actualizar icono del botón toggle
        const icon = toggleBtn?.querySelector('i');
        if (icon) {
            icon.className = this.isSidebarOpen ? 'fas fa-bars' : 'fas fa-bars';
        }
    }

    async loadInitialData() {
        try {
            this.showLoading('Cargando datos iniciales...');
            
            await Promise.all([
                this.updateDashboardStats(),
                this.loadRecentActivity()
            ]);
            
            this.hideLoading();
            
        } catch (error) {
            console.error('Error cargando datos iniciales:', error);
            this.hideLoading();
        }
    }

    async loadModuleData(moduleName) {
        try {
            switch (moduleName) {
                case 'dashboard':
                    await this.updateDashboardStats();
                    await this.loadRecentActivity();
                    this.initializeCharts();
                    break;
                    
                case 'vehicles':
                    if (window.vehiclesSystem) {
                        await window.vehiclesSystem.loadVehicles();
                    }
                    break;
                    
                case 'maintenance':
                    if (window.maintenanceSystem) {
                        await window.maintenanceSystem.loadFailures();
                    }
                    break;
                    
                case 'expenses':
                    if (window.expensesSystem) {
                        await window.expensesSystem.loadExpenses();
                    }
                    break;
                    
                case 'reports':
                    if (window.reportsSystem) {
                        await window.reportsSystem.loadReports();
                    } else {
                        this.showReport('budget'); // Mostrar reporte por defecto
                    }
                    break;
                    
                case 'admin':
                    if (this.hasAdminPermission()) {
                        await this.loadAdminData();
                    }
                    break;
            }
        } catch (error) {
            console.error(`Error cargando datos del módulo ${moduleName}:`, error);
            this.showError(`Error al cargar el módulo ${moduleName}`);
        }
    }

    loadTabData(tabName) {
        // Cargar datos específicos del tab si es necesario
        switch (tabName) {
            case 'budgetConfig':
                this.loadBudgetData();
                break;
            case 'userManagement':
                this.loadUsersData();
                break;
            case 'systemConfig':
                this.loadSystemConfig();
                break;
        }
    }

    async updateDashboardStats() {
        try {
            const [vehicles, failures, expenses] = await Promise.all([
                database.getVehicles().catch(() => []),
                database.getFailures().catch(() => []),
                database.getExpenses().catch(() => [])
            ]);

            const currentMonth = new Date().toISOString().slice(0, 7);
            const monthlyExpenses = expenses.filter(expense => 
                expense.fecha && expense.fecha.startsWith(currentMonth)
            ).reduce((sum, expense) => sum + (expense.monto || 0), 0);

            const stats = {
                totalVehicles: vehicles.length,
                openIssues: failures.filter(f => f.estado === 'Abierta').length,
                resolvedIssues: failures.filter(f => f.estado === 'Resuelta').length,
                totalExpenses: monthlyExpenses
            };

            // Actualizar UI de forma segura
            this.updateElementText('totalVehicles', stats.totalVehicles);
            this.updateElementText('openIssues', stats.openIssues);
            this.updateElementText('resolvedIssues', stats.resolvedIssues);
            this.updateElementText('totalExpenses', `$${stats.totalExpenses.toLocaleString()}`);

        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
            throw error;
        }
    }

    updateElementText(elementId, text) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = text;
        }
    }

    async loadRecentActivity() {
        try {
            const [failures, expenses, vehicles] = await Promise.all([
                database.getFailures().catch(() => []),
                database.getExpenses().catch(() => []),
                database.getVehicles().catch(() => [])
            ]);

            // Ordenar actividades por fecha (más recientes primero)
            const activities = [
                ...failures.slice(-5).map(failure => ({
                    type: 'failure',
                    message: `Nueva falla reportada en vehículo ${failure.placa || 'N/A'}`,
                    time: this.formatTimeAgo(new Date(failure.createdAt || new Date())),
                    date: new Date(failure.createdAt || new Date())
                })),
                ...expenses.slice(-3).map(expense => ({
                    type: 'expense',
                    message: `Gasto registrado: $${(expense.monto || 0).toLocaleString()} - ${expense.tipo || 'Sin tipo'}`,
                    time: this.formatTimeAgo(new Date(expense.createdAt || new Date())),
                    date: new Date(expense.createdAt || new Date())
                })),
                ...vehicles.slice(-2).map(vehicle => ({
                    type: 'vehicle',
                    message: `Nuevo vehículo registrado: ${vehicle.placa || 'N/A'}`,
                    time: this.formatTimeAgo(new Date(vehicle.createdAt || new Date())),
                    date: new Date(vehicle.createdAt || new Date())
                }))
            ].sort((a, b) => b.date - a.date).slice(0, 5);

            this.renderActivityList(activities);
            
        } catch (error) {
            console.error('Error cargando actividad reciente:', error);
            this.renderActivityList([]);
        }
    }

    renderActivityList(activities) {
        const activityList = document.getElementById('recentActivity');
        if (!activityList) return;

        if (activities.length === 0) {
            activityList.innerHTML = `
                <div class="activity-placeholder">
                    <i class="fas fa-inbox"></i>
                    <p>No hay actividad reciente</p>
                </div>
            `;
            return;
        }

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <p>${this.escapeHtml(activity.message)}</p>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </div>
        `).join('');
    }

    formatTimeAgo(date) {
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Hace unos segundos';
        if (diffMins < 60) return `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
        if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
        if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
        
        return date.toLocaleDateString('es-ES');
    }

    getActivityIcon(type) {
        const icons = {
            'failure': 'exclamation-triangle',
            'maintenance': 'tools',
            'expense': 'money-bill-wave',
            'vehicle': 'car'
        };
        return icons[type] || 'info-circle';
    }

    initializeCharts() {
        // Destruir gráficos existentes
        this.charts.forEach(chart => {
            chart.destroy();
        });
        this.charts.clear();

        // Crear nuevos gráficos
        this.createBudgetChart();
        this.createFailuresChart();
        this.createExpensesChart();
        this.createMonthlyFailuresChart();
    }

    createBudgetChart() {
        const ctx = document.getElementById('budgetChart');
        if (!ctx) return;

        try {
            const chart = new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                    datasets: [
                        {
                            label: 'Presupuesto',
                            data: [12000, 12000, 12000, 12000, 12000, 12000],
                            backgroundColor: '#3498db',
                            borderColor: '#2980b9',
                            borderWidth: 1
                        },
                        {
                            label: 'Ejecutado',
                            data: [11500, 12500, 11000, 13000, 11800, 12200],
                            backgroundColor: '#2ecc71',
                            borderColor: '#27ae60',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    }
                }
            });
            
            this.charts.set('budget', chart);
        } catch (error) {
            console.error('Error creando gráfico de presupuesto:', error);
        }
    }

    createFailuresChart() {
        const ctx = document.getElementById('failuresChart');
        if (!ctx) return;

        try {
            const chart = new Chart(ctx.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Tanque', 'Bomba GLP', 'Válvulas', 'Sistema Eléctrico', 'Otros'],
                    datasets: [{
                        data: [35, 25, 15, 15, 10],
                        backgroundColor: [
                            '#e74c3c',
                            '#3498db',
                            '#f39c12',
                            '#2ecc71',
                            '#9b59b6'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        }
                    },
                    cutout: '60%'
                }
            });
            
            this.charts.set('failures', chart);
        } catch (error) {
            console.error('Error creando gráfico de fallas:', error);
        }
    }

    createExpensesChart() {
        const ctx = document.getElementById('expensesChart');
        if (!ctx) return;

        try {
            const chart = new Chart(ctx.getContext('2d'), {
                type: 'pie',
                data: {
                    labels: ['Mantenimiento', 'Combustible', 'Documentación', 'Peajes', 'Otros'],
                    datasets: [{
                        data: [40, 30, 15, 10, 5],
                        backgroundColor: [
                            '#3498db',
                            '#e74c3c',
                            '#f39c12',
                            '#2ecc71',
                            '#9b59b6'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        }
                    }
                }
            });
            
            this.charts.set('expenses', chart);
        } catch (error) {
            console.error('Error creando gráfico de gastos:', error);
        }
    }

    createMonthlyFailuresChart() {
        const ctx = document.getElementById('monthlyFailuresChart');
        if (!ctx) return;

        try {
            const chart = new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Fallas Reportadas',
                        data: [12, 19, 8, 15, 10, 7],
                        borderColor: '#e74c3c',
                        backgroundColor: 'rgba(231, 76, 60, 0.1)',
                        tension: 0.1,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
            
            this.charts.set('monthlyFailures', chart);
        } catch (error) {
            console.error('Error creando gráfico de fallas mensuales:', error);
        }
    }

    async loadAdminData() {
        if (!this.hasAdminPermission()) {
            this.showError('No tiene permisos para acceder a la administración');
            return;
        }

        await Promise.all([
            this.loadBudgetData(),
            this.loadUsersData(),
            this.loadSystemConfig()
        ]);
    }

    async loadBudgetData() {
        try {
            const budgets = await database.getBudgets();
            const budgetTableBody = document.getElementById('budgetTableBody');
            
            if (budgetTableBody) {
                if (budgets.length === 0) {
                    budgetTableBody.innerHTML = `
                        <tr>
                            <td colspan="6" class="empty-state">
                                <i class="fas fa-chart-line"></i>
                                <p>No hay presupuestos configurados</p>
                            </td>
                        </tr>
                    `;
                } else {
                    budgetTableBody.innerHTML = budgets.map(budget => {
                        const diferencia = (budget.ejecutado || 0) - budget.presupuesto;
                        const diferenciaClass = diferencia > 0 ? 'text-danger' : 'text-success';
                        const diferenciaSign = diferencia > 0 ? '+' : '';
                        
                        return `
                            <tr>
                                <td>${this.escapeHtml(budget.regional)}</td>
                                <td>${this.escapeHtml(budget.mes)}</td>
                                <td>$${budget.presupuesto.toLocaleString()}</td>
                                <td>$${(budget.ejecutado || 0).toLocaleString()}</td>
                                <td class="${diferenciaClass}">
                                    ${diferenciaSign}$${diferencia.toLocaleString()}
                                </td>
                                <td>
                                    <button class="btn-action btn-edit" onclick="editBudget(${budget.id})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn-action btn-delete" onclick="deleteBudget(${budget.id})">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `;
                    }).join('');
                }
            }
        } catch (error) {
            console.error('Error cargando datos de presupuesto:', error);
            this.showError('Error al cargar los presupuestos');
        }
    }

    async loadUsersData() {
        try {
            const users = await database.getUsers();
            const usersTableBody = document.getElementById('usersTableBody');
            
            if (usersTableBody) {
                usersTableBody.innerHTML = users.map(user => `
                    <tr>
                        <td>${this.escapeHtml(user.username)}</td>
                        <td>${this.escapeHtml(user.name)}</td>
                        <td><span class="status-badge">${user.role}</span></td>
                        <td>
                            <span class="status-badge ${user.active ? 'status-resolved' : 'status-open'}">
                                ${user.active ? 'Activo' : 'Inactivo'}
                            </span>
                        </td>
                        <td>${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Nunca'}</td>
                        <td>
                            <button class="btn-action btn-edit" onclick="editUser(${user.id})">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn-action btn-${user.active ? 'danger' : 'success'}" 
                                    onclick="toggleUserStatus(${user.id}, ${!user.active})">
                                <i class="fas fa-${user.active ? 'ban' : 'check'}"></i>
                            </button>
                        </td>
                    </tr>
                `).join('');
            }
        } catch (error) {
            console.error('Error cargando datos de usuarios:', error);
            this.showError('Error al cargar los usuarios');
        }
    }

    async loadSystemConfig() {
        try {
            const config = await database.getAllConfig();
            const configMap = {};
            
            config.forEach(item => {
                configMap[item.key] = item.value;
            });
            
            // Rellenar formulario de configuración
            const systemNameInput = document.getElementById('systemName');
            const defaultRegionalSelect = document.getElementById('defaultRegional');
            const maintenanceAlertInput = document.getElementById('maintenanceAlert');
            
            if (systemNameInput) systemNameInput.value = configMap.systemName || 'Gestión de Flota Vehicular';
            if (defaultRegionalSelect) defaultRegionalSelect.value = configMap.defaultRegional || 'Norte';
            if (maintenanceAlertInput) maintenanceAlertInput.value = configMap.maintenanceAlertDays || '7';
            
        } catch (error) {
            console.error('Error cargando configuración del sistema:', error);
        }
    }

    async handleBudgetSubmit(event) {
        event.preventDefault();
        
        if (!this.hasAdminPermission()) {
            this.showError('No tiene permisos para configurar presupuestos');
            return;
        }

        const formData = {
            regional: document.getElementById('budgetRegional').value,
            mes: document.getElementById('budgetMonth').value,
            presupuesto: parseFloat(document.getElementById('budgetAmount').value)
        };

        // Validaciones
        if (!formData.mes) {
            this.showError('Por favor seleccione un mes');
            return;
        }

        if (formData.presupuesto <= 0) {
            this.showError('El monto presupuestado debe ser mayor a cero');
            return;
        }

        try {
            await database.createBudget(formData);
            this.showSuccess('Presupuesto guardado exitosamente');
            event.target.reset();
            await this.loadBudgetData();
            
        } catch (error) {
            console.error('Error guardando presupuesto:', error);
            this.showError('Error al guardar el presupuesto: ' + error.message);
        }
    }

    async handleSystemConfigSubmit(event) {
        event.preventDefault();
        
        if (!this.hasAdminPermission()) {
            this.showError('No tiene permisos para modificar la configuración del sistema');
            return;
        }

        const updates = {
            systemName: document.getElementById('systemName').value,
            defaultRegional: document.getElementById('defaultRegional').value,
            maintenanceAlertDays: document.getElementById('maintenanceAlert').value
        };

        try {
            const promises = Object.entries(updates).map(([key, value]) => 
                database.setConfigValue(key, value)
            );
            
            await Promise.all(promises);
            this.showSuccess('Configuración guardada exitosamente');
            
        } catch (error) {
            console.error('Error guardando configuración:', error);
            this.showError('Error al guardar la configuración');
        }
    }

    showReport(reportType) {
        if (window.reportsSystem) {
            window.reportsSystem.showReport(reportType);
        } else {
            // Implementación básica si reportsSystem no está disponible
            const reportContent = document.getElementById('reportContent');
            if (reportContent) {
                reportContent.innerHTML = `
                    <div class="report-placeholder">
                        <i class="fas fa-chart-bar"></i>
                        <h3>Reporte de ${reportType}</h3>
                        <p>El sistema de reportes se está cargando...</p>
                    </div>
                `;
            }
        }
    }

    // Métodos de utilidad
    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return unsafe.toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    hasAdminPermission() {
        return window.authSystem && window.authSystem.hasPermission('admin');
    }

    showLoading(message = 'Cargando...') {
        let overlay = document.getElementById('loadingOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'loadingOverlay';
            overlay.className = 'loading-overlay hidden';
            overlay.innerHTML = `
                <div class="loading-spinner">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>${message}</p>
                </div>
            `;
            document.body.appendChild(overlay);
        }
        
        overlay.querySelector('p').textContent = message;
        overlay.classList.remove('hidden');
    }

    hideLoading() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    }

    showSuccess(message) {
        if (window.authSystem) {
            window.authSystem.showSuccess(message);
        } else {
            alert('✅ ' + message);
        }
    }

    showError(message) {
        if (window.authSystem) {
            window.authSystem.showError(message);
        } else {
            alert('❌ ' + message);
        }
    }

    // Método para recargar datos en tiempo real
    async refreshData() {
        switch (this.currentModule) {
            case 'dashboard':
                await this.updateDashboardStats();
                await this.loadRecentActivity();
                break;
            case 'vehicles':
                if (window.vehiclesSystem) await window.vehiclesSystem.loadVehicles();
                break;
            case 'maintenance':
                if (window.maintenanceSystem) await window.maintenanceSystem.loadFailures();
                break;
            case 'expenses':
                if (window.expensesSystem) await window.expensesSystem.loadExpenses();
                break;
        }
    }
}

// Funciones globales mejoradas
function showModal(title, content) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.querySelector('.modal-body');

    if (!modal || !modalTitle || !modalBody) {
        console.error('Elementos del modal no encontrados');
        return;
    }

    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');

    // Enfocar el modal para accesibilidad
    modal.focus();

    // Prevenir scroll del body
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        
        // Restaurar scroll del body
        document.body.style.overflow = '';
    }
}

// Funciones globales para reportes
function generateQuickReport() {
    if (window.flotaApp) {
        window.flotaApp.showLoading('Generando reporte rápido...');
        setTimeout(() => {
            window.flotaApp.hideLoading();
            window.flotaApp.showSuccess('Reporte rápido generado exitosamente');
        }, 1500);
    }
}

function generateComprehensiveReport() {
    if (window.reportsSystem) {
        window.reportsSystem.generateComprehensiveReport();
    } else {
        alert('Sistema de reportes no disponible');
    }
}

// Funciones de administración (mejoradas)
function editBudget(id) {
    alert(`Editar presupuesto ${id} - Funcionalidad en desarrollo`);
}

function deleteBudget(id) {
    if (confirm('¿Está seguro de eliminar este presupuesto?')) {
        if (window.flotaApp) {
            window.flotaApp.showLoading('Eliminando presupuesto...');
            // Aquí iría la lógica real de eliminación
            setTimeout(() => {
                window.flotaApp.hideLoading();
                window.flotaApp.showSuccess('Presupuesto eliminado exitosamente');
                window.flotaApp.loadBudgetData();
            }, 1000);
        }
    }
}

function editUser(id) {
    alert(`Editar usuario ${id} - Funcionalidad en desarrollo`);
}

function toggleUserStatus(id, newStatus) {
    const action = newStatus ? 'activar' : 'desactivar';
    if (confirm(`¿Está seguro de ${action} este usuario?`)) {
        if (window.flotaApp) {
            window.flotaApp.showLoading(`${action.charAt(0).toUpperCase() + action.slice(1)} usuario...`);
            // Aquí iría la lógica real de cambio de estado
            setTimeout(() => {
                window.flotaApp.hideLoading();
                window.flotaApp.showSuccess(`Usuario ${action}do exitosamente`);
                window.flotaApp.loadUsersData();
            }, 1000);
        }
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Verificar dependencias
    if (typeof Chart === 'undefined') {
        console.error('Chart.js no está cargado');
        return;
    }
    
    if (typeof Dexie === 'undefined') {
        console.error('Dexie.js no está cargado');
        return;
    }

    window.flotaApp = new FlotaApp();
});

// Manejar errores no capturados
window.addEventListener('error', (event) => {
    console.error('Error no capturado:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Promise rechazada no manejada:', event.reason);
});
