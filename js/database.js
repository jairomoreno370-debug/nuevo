// Sistema de Base de Datos con Dexie.js
class Database {
    constructor() {
        this.db = new Dexie('FlotaVehicularDB');
        this.init();
    }

    init() {
        // Definir esquema de la base de datos
        this.db.version(1).stores({
            users: '++id, username, password, name, role, lastLogin, active',
            vehicles: '++id, placa, vin, marca, modelo, año, capacidad, odometroInicial, regional, createdAt',
            components: '++id, vehicleId, nombre, caracteristicas, fechaInstalacion, vidaUtil, createdAt',
            failures: '++id, vehicleId, placa, componente, fechaHora, ubicacion, descripcion, prioridad, estado, createdAt',
            maintenance: '++id, failureId, fechaInicio, fechaFin, taller, costo, notas, reparadaPor, createdAt',
            expenses: '++id, vehicleId, placa, tipo, monto, fecha, regional, proveedor, comprobante, createdAt',
            budgets: '++id, regional, mes, presupuesto, ejecutado, createdAt'
        });

        this.db.open().catch(err => {
            console.error('Error abriendo la base de datos:', err);
        });
    }

    // Métodos para Usuarios
    async getUsers() {
        return await this.db.users.toArray();
    }

    async createUser(user) {
        return await this.db.users.add(user);
    }

    async updateUser(id, updates) {
        return await this.db.users.update(id, updates);
    }

    // Métodos para Vehículos
    async getVehicles() {
        return await this.db.vehicles.toArray();
    }

    async createVehicle(vehicle) {
        vehicle.createdAt = new Date();
        return await this.db.vehicles.add(vehicle);
    }

    async updateVehicle(id, updates) {
        return await this.db.vehicles.update(id, updates);
    }

    async deleteVehicle(id) {
        return await this.db.vehicles.delete(id);
    }

    // Métodos para Componentes
    async getComponentsByVehicle(vehicleId) {
        return await this.db.components.where('vehicleId').equals(vehicleId).toArray();
    }

    async createComponent(component) {
        component.createdAt = new Date();
        return await this.db.components.add(component);
    }

    // Métodos para Fallas
    async getFailures() {
        return await this.db.failures.toArray();
    }

    async createFailure(failure) {
        failure.createdAt = new Date();
        return await this.db.failures.add(failure);
    }

    async updateFailure(id, updates) {
        return await this.db.failures.update(id, updates);
    }

    // Métodos para Mantenimiento
    async createMaintenanceRecord(maintenance) {
        maintenance.createdAt = new Date();
        return await this.db.maintenance.add(maintenance);
    }

    async getMaintenanceByFailure(failureId) {
        return await this.db.maintenance.where('failureId').equals(failureId).first();
    }

    // Métodos para Gastos
    async getExpenses() {
        return await this.db.expenses.toArray();
    }

    async createExpense(expense) {
        expense.createdAt = new Date();
        return await this.db.expenses.add(expense);
    }

    async updateExpense(id, updates) {
        return await this.db.expenses.update(id, updates);
    }

    async deleteExpense(id) {
        return await this.db.expenses.delete(id);
    }

    // Métodos para Presupuestos
    async getBudgets() {
        return await this.db.budgets.toArray();
    }

    async createBudget(budget) {
        budget.createdAt = new Date();
        return await this.db.budgets.add(budget);
    }

    async updateBudget(id, updates) {
        return await this.db.budgets.update(id, updates);
    }

    // Métodos de utilidad
    async getExpensesByMonth(month) {
        return await this.db.expenses
            .where('fecha')
            .startsWith(month)
            .toArray();
    }

    async getFailuresByStatus(estado) {
        return await this.db.failures
            .where('estado')
            .equals(estado)
            .toArray();
    }
}

// Inicializar base de datos global
window.database = new Database();
