// Aplicación Principal - Gestión de Módulos y Navegación

class FlotaApp {
    constructor() {
        this.currentModule = 'dashboard';
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupEventListeners();
        this.loadInitialData();
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

    loadInitialData() {
        // Cargar datos iniciales para el dashboard
        this.updateDashboardStats();
        this.loadRecentActivity();
    }

    loadModuleData(moduleName) {
        switch (moduleName) {
            case 'dashboard':
                this.updateDashboardStats();
                this.loadRecentActivity();
                break;
            case 'vehicles':
                window.vehiclesSystem.loadVehicles();
                break;
            case 'maintenance':
                window.maintenanceSystem.loadFailures();
                break;
            case 'expenses':
                window.expensesSystem.loadExpenses();
                break;
            case 'reports':
                window.reportsSystem.loadReports();
                break;
            case 'admin':
                if (authSystem.currentUser.role === 'admin') {
                    this.loadAdminData();
                }
                break;
        }
    }

    updateDashboardStats() {
        // Datos de ejemplo - en una aplicación real estos vendrían de una API
        const stats = {
            totalVehicles: 24,
            openIssues: 8,
            resolvedIssues: 45,
            totalExpenses: 12500
        };

        document.getElementById('totalVehicles').textContent = stats.totalVehicles;
        document.getElementById('openIssues').textContent = stats.openIssues;
        document.getElementById('resolvedIssues').textContent = stats.resolvedIssues;
        document.getElementById('totalExpenses').textContent = `$${stats.totalExpenses.toLocaleString()}`;
    }

    loadRecentActivity() {
        const activities = [
            { type: 'failure', message: 'Nueva falla reportada en vehículo ABC-123', time: 'Hace 2 horas' },
            { type: 'maintenance', message: 'Mantenimiento completado en vehículo XYZ-789', time: 'Hace 4 horas' },
            { type: 'expense', message: 'Gasto registrado: $350 - Combustible', time: 'Hace 1 día' },
            { type: 'vehicle', message: 'Nuevo vehículo registrado: DEF-456', time: 'Hace 2 días' }
        ];

        const activityList = document.getElementById('recentActivity');
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
        const ctx = document.getElementById('budgetChart').getContext('2d');
        new Chart(ctx, {
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
    }

    createFailuresChart() {
        const ctx = document.getElementById('failuresChart').getContext('2d');
        new Chart(ctx, {
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
    }

    createExpensesChart() {
        const ctx = document.getElementById('expensesChart').getContext('2d');
        new Chart(ctx, {
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
    }

    createMonthlyFailuresChart() {
        const ctx = document.getElementById('monthlyFailuresChart').getContext('2d');
        new Chart(ctx, {
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
    }

    loadAdminData() {
        // Cargar datos para el módulo de administración
        this.loadBudgetData();
        this.loadUsersData();
    }

    loadBudgetData() {
        // Implementar carga de datos de presupuesto
    }

    loadUsersData() {
        // Implementar carga de datos de usuarios
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

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.flotaApp = new FlotaApp();
});