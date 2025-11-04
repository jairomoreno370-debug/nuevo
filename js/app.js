// Aplicación Principal - ACTUALIZADO CON BASE DE DATOS
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

    async loadInitialData() {
        await this.updateDashboardStats();
        await this.loadRecentActivity();
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

    // [El resto del código se mantiene igual...]
}
