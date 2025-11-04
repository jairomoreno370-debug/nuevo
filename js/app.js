// Aplicación Principal - ACTUALIZADO CON BASE DE DATOS Y MENÚ DE USUARIO
class FlotaApp {
    constructor() {
        this.currentModule = 'dashboard';
        this.init();
    }

    async init() {
        // Esperar a que la base de datos esté lista
        await database.db.open();
        
        this.setupNavigation();
        this.setupEventListeners();
        await this.loadInitialData();
        this.initializeCharts();
    }

    setupNavigation() {
        // Navegación por módulos
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const module = item.getAttribute('data-module');
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
    }

    setupEventListeners() {
        // Tabs
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.getAttribute('data-tab');
                this.switchTab(tab, button);
            });
        });

        // Admin tabs
        const adminTabButtons = document.querySelectorAll('.admin-tab-button');
        adminTabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.getAttribute('data-tab');
                this.switchAdminTab(tab, button);
            });
        });

        // Menú de usuario (si existe)
        this.setupUserDropdown();
    }

    setupUserDropdown() {
        const dropdownBtn = document.querySelector('.user-dropdown-btn');
        const dropdownContent = document.getElementById('userDropdown');

        if (dropdownBtn && dropdownContent) {
            dropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContent.classList.toggle('show');
            });

            // Cerrar dropdown al hacer clic fuera
            document.addEventListener('click', () => {
                dropdownContent.classList.remove('show');
            });
        }
    }

    showModule(moduleName) {
        // Ocultar módulo actual
        const currentModule = document.querySelector('.module.active');
        if (currentModule) {
            currentModule.classList.remove('active');
        }

        // Mostrar nuevo módulo
        const newModule = document.getElementById(moduleName);
        if (newModule) {
            newModule.classList.add('active');
        }

        // Actualizar menú activo
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-module') === moduleName) {
                item.classList.add('active');
            }
        });

        this.currentModule = moduleName;

        // Cargar datos específicos del módulo
        this.loadModuleData(moduleName);
    }

    toggleSidebar() {
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.toggle('active');
    }

    switchTab(tabName, button) {
        // Actualizar botones de tab
        const tabButtons = button.parentElement.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Mostrar contenido del tab
        const tabPanes = button.closest('.tabs').nextElementSibling.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        const targetPane = document.getElementById(tabName);
        if (targetPane) {
            targetPane.classList.add('active');
        }
    }

    switchAdminTab(tabName, button) {
        // Similar a switchTab pero para admin tabs
        const tabButtons = button.parentElement.querySelectorAll('.admin-tab-button');
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const tabPanes = button.closest('.admin-tabs').nextElementSibling.querySelectorAll('.admin-tab-pane');
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        const targetPane = document.getElementById(tabName);
        if (targetPane) {
            targetPane.classList.add('active');
        }
    }

    async loadInitialData() {
        // Cargar datos iniciales para el dashboard
        await this.updateDashboardStats();
        await this.loadRecentActivity();
    }

    async loadModuleData(moduleName) {
        switch (moduleName) {
            case 'dashboard':
                await this.updateDashboardStats();
                await this.loadRecentActivity();
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
                }
                break;
            case 'admin':
                if (authSystem.currentUser.role === 'admin') {
                    await this.loadAdminData();
                }
                break;
        }
    }

    async updateDashboardStats() {
        try {
            const vehicles = await database.getVehicles();
            const failures = await database.getFailures();
            const expenses = await database.getExpenses();
            
            const currentMonth = new Date().toISOString().slice(0, 7);
            const monthlyExpenses = expenses.filter(expense => 
                expense.fecha.startsWith(currentMonth)
            ).reduce((sum, expense) => sum + expense.monto, 0);

            const stats = {
                totalVehicles: vehicles.length,
                openIssues: failures.filter(f => f.estado === 'Abierta').length,
                resolvedIssues: failures.filter(f => f.estado === 'Resuelta').length,
                totalExpenses: monthlyExpenses
            };

            document.getElementById('totalVehicles').textContent = stats.totalVehicles;
            document.getElementById('openIssues').textContent = stats.openIssues;
            document.getElementById('resolvedIssues').textContent = stats.resolvedIssues;
            document.getElementById('totalExpenses').textContent = `$${stats.totalExpenses.toLocaleString()}`;
        } catch (error) {
            console.error('Error actualizando estadísticas:', error);
        }
    }

    async loadRecentActivity() {
        try {
            const failures = await database.getFailures();
            const expenses = await database.getExpenses();
            const vehicles = await database.getVehicles();

            // Ordenar actividades por fecha (más recientes primero)
            const activities = [
                ...failures.slice(-5).map(failure => ({
                    type: 'failure',
                    message: `Nueva falla reportada en vehículo ${failure.placa}`,
                    time: this.formatTimeAgo(new Date(failure.createdAt)),
                    date: new Date(failure.createdAt)
                })),
                ...expenses.slice(-3).map(expense => ({
                    type: 'expense',
                    message: `Gasto registrado: $${expense.monto} - ${expense.tipo}`,
                    time: this.formatTimeAgo(new Date(expense.createdAt)),
                    date: new Date(expense.createdAt)
                })),
                ...vehicles.slice(-2).map(vehicle => ({
                    type: 'vehicle',
                    message: `Nuevo vehículo registrado: ${vehicle.placa}`,
                    time: this.formatTimeAgo(new Date(vehicle.createdAt)),
                    date: new Date(vehicle.createdAt)
                }))
            ].sort((a, b) => b.date - a.date).slice(0, 5); // Top 5 más recientes

            const activityList = document.getElementById('recentActivity');
            if (activityList) {
                activityList.innerHTML = activities.map(activity => `
                    <div class="activity-item">
                        <div class="activity-icon ${activity.type}">
                            <i class="fas fa-${this.getActivityIcon(activity.type)}"></i>
                        </div>
                        <div class="activity-content">
                            <p>${activity.message}</p>
                            <span class="activity-time">${activity.time}</span>
                        </div>
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error cargando actividad reciente:', error);
        }
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
        
        return date.toLocaleDateString();
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
        // Inicializar gráficos del dashboard
        this.createBudgetChart();
        this.createFailuresChart();
        this.createExpensesChart();
        this.createMonthlyFailuresChart();
    }

    createBudgetChart() {
        const ctx = document.getElementById('budgetChart');
        if (!ctx) return;

        try {
            new Chart(ctx.getContext('2d'), {
                type: 'bar',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                    datasets: [
                        {
                            label: 'Presupuesto',
                            data: [12000, 12000, 12000, 12000, 12000, 12000],
                            backgroundColor: '#3498db'
                        },
                        {
                            label: 'Ejecutado',
                            data: [11500, 12500, 11000, 13000, 11800, 12200],
                            backgroundColor: '#2ecc71'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creando gráfico de presupuesto:', error);
        }
    }

    createFailuresChart() {
        const ctx = document.getElementById('failuresChart');
        if (!ctx) return;

        try {
            new Chart(ctx.getContext('2d'), {
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
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creando gráfico de fallas:', error);
        }
    }

    createExpensesChart() {
        const ctx = document.getElementById('expensesChart');
        if (!ctx) return;

        try {
            new Chart(ctx.getContext('2d'), {
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
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'bottom',
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creando gráfico de gastos:', error);
        }
    }

    createMonthlyFailuresChart() {
        const ctx = document.getElementById('monthlyFailuresChart');
        if (!ctx) return;

        try {
            new Chart(ctx.getContext('2d'), {
                type: 'line',
                data: {
                    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
                    datasets: [{
                        label: 'Fallas Reportadas',
                        data: [12, 19, 8, 15, 10, 7],
                        borderColor: '#e74c3c',
                        tension: 0.1,
                        fill: false
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: {
                            position: 'top',
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error creando gráfico de fallas mensuales:', error);
        }
    }

    async loadAdminData() {
        // Cargar datos para el módulo de administración
        await this.loadBudgetData();
        await this.loadUsersData();
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
                    budgetTableBody.innerHTML = budgets.map(budget => `
                        <tr>
                            <td>${budget.regional}</td>
                            <td>${budget.mes}</td>
                            <td>$${budget.presupuesto.toLocaleString()}</td>
                            <td>$${budget.ejecutado ? budget.ejecutado.toLocaleString() : '0'}</td>
                            <td class="${(budget.ejecutado || 0) > budget.presupuesto ? 'text-danger' : 'text-success'}">
                                $${((budget.ejecutado || 0) - budget.presupuesto).toLocaleString()}
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
                    `).join('');
                }
            }
        } catch (error) {
            console.error('Error cargando datos de presupuesto:', error);
        }
    }

    async loadUsersData() {
        try {
            const users = await database.getUsers();
            const usersTableBody = document.getElementById('usersTableBody');
            
            if (usersTableBody) {
                usersTableBody.innerHTML = users.map(user => `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.name}</td>
                        <td><span class="status-badge">${user.role}</span></td>
                        <td><span class="status-badge ${user.active ? 'status-resolved' : 'status-open'}">
                            ${user.active ? 'Activo' : 'Inactivo'}
                        </span></td>
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
        }
    }
}

// Funciones globales para modales
function showModal(title, content) {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.querySelector('.modal-body');

    modalTitle.textContent = title;
    modalBody.innerHTML = content;
    modal.classList.remove('hidden');
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.classList.add('hidden');
}

// Funciones globales para reportes
function generateQuickReport() {
    alert('Generando reporte rápido...');
    // Implementación de reporte rápido
}

function generateComprehensiveReport() {
    if (window.reportsSystem) {
        window.reportsSystem.generateComprehensiveReport();
    }
}

function showReport(reportType) {
    if (window.reportsSystem) {
        window.reportsSystem.showReport(reportType);
    }
}

// Funciones globales para formularios
function showVehicleForm() {
    if (window.vehiclesSystem) {
        window.vehiclesSystem.showVehicleForm();
    }
}

function showFailureForm() {
    if (window.maintenanceSystem) {
        window.maintenanceSystem.showFailureForm();
    }
}

function showExpenseForm() {
    if (window.expensesSystem) {
        window.expensesSystem.showExpenseForm();
    }
}

function showUserForm() {
    // Implementar creación de usuarios
    alert('Función de crear usuario - Por implementar');
}

// Funciones de administración (placeholder)
function editBudget(id) {
    alert(`Editar presupuesto ${id} - Por implementar`);
}

function deleteBudget(id) {
    if (confirm('¿Está seguro de eliminar este presupuesto?')) {
        alert(`Eliminar presupuesto ${id} - Por implementar`);
    }
}

function editUser(id) {
    alert(`Editar usuario ${id} - Por implementar`);
}

function toggleUserStatus(id, newStatus) {
    const action = newStatus ? 'activar' : 'desactivar';
    if (confirm(`¿Está seguro de ${action} este usuario?`)) {
        alert(`${action.charAt(0).toUpperCase() + action.slice(1)} usuario ${id} - Por implementar`);
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.flotaApp = new FlotaApp();
});
