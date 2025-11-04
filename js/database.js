// Sistema de Base de Datos con Dexie.js
class Database {
    constructor() {
        this.db = new Dexie('FlotaVehicularDB');
        this.init();
    }

    init() {
        // Definir esquema de la base de datos
        this.db.version(2).stores({
            users: '++id, username, password, name, role, lastLogin, active, forcePasswordChange, createdAt',
            vehicles: '++id, placa, vin, marca, modelo, año, capacidad, odometroInicial, regional, createdAt',
            components: '++id, vehicleId, nombre, caracteristicas, fechaInstalacion, vidaUtil, createdAt',
            failures: '++id, vehicleId, placa, componente, fechaHora, ubicacion, descripcion, prioridad, estado, createdAt',
            maintenance: '++id, failureId, fechaInicio, fechaFin, taller, costo, notas, reparadaPor, createdAt',
            expenses: '++id, vehicleId, placa, tipo, monto, fecha, regional, proveedor, comprobante, createdAt',
            budgets: '++id, regional, mes, presupuesto, ejecutado, createdAt',
            systemConfig: '++id, key, value, createdAt'
        });

        // Agregar índices compuestos para mejor performance
        this.db.version(3).stores({
            users: '++id, username, password, name, role, lastLogin, active, forcePasswordChange, createdAt',
            vehicles: '++id, placa, vin, marca, modelo, año, capacidad, odometroInicial, regional, createdAt, [marca+modelo]',
            components: '++id, vehicleId, nombre, caracteristicas, fechaInstalacion, vidaUtil, createdAt, [vehicleId+nombre]',
            failures: '++id, vehicleId, placa, componente, fechaHora, ubicacion, descripcion, prioridad, estado, createdAt, [estado+prioridad], [placa+estado]',
            maintenance: '++id, failureId, fechaInicio, fechaFin, taller, costo, notas, reparadaPor, createdAt, [failureId+fechaInicio]',
            expenses: '++id, vehicleId, placa, tipo, monto, fecha, regional, proveedor, comprobante, createdAt, [tipo+fecha], [placa+fecha]',
            budgets: '++id, regional, mes, presupuesto, ejecutado, createdAt, [regional+mes]',
            systemConfig: '++id, key, value, createdAt'
        }).upgrade(trans => {
            // Migración: agregar campos faltantes si es necesario
            console.log('Actualizando a versión 3 de la base de datos...');
        });

        this.db.open().catch(err => {
            console.error('Error abriendo la base de datos:', err);
        });

        // Inicializar configuración por defecto
        this.initializeDefaultConfig();
    }

    async initializeDefaultConfig() {
        try {
            const existingConfig = await this.db.systemConfig.toArray();
            if (existingConfig.length === 0) {
                const defaultConfig = [
                    { key: 'systemName', value: 'Sistema de Gestión de Flota Vehicular' },
                    { key: 'defaultRegional', value: 'Norte' },
                    { key: 'maintenanceAlertDays', value: '7' },
                    { key: 'currency', value: 'USD' },
                    { key: 'dateFormat', value: 'dd/MM/yyyy' },
                    { key: 'itemsPerPage', value: '10' }
                ];

                for (const config of defaultConfig) {
                    config.createdAt = new Date();
                    await this.db.systemConfig.add(config);
                }
            }
        } catch (error) {
            console.error('Error inicializando configuración:', error);
        }
    }

    // ==================== MÉTODOS PARA USUARIOS ====================
    async getUsers() {
        try {
            return await this.db.users.toArray();
        } catch (error) {
            console.error('Error obteniendo usuarios:', error);
            throw error;
        }
    }

    async getUserById(id) {
        try {
            return await this.db.users.get(id);
        } catch (error) {
            console.error('Error obteniendo usuario:', error);
            throw error;
        }
    }

    async getUserByUsername(username) {
        try {
            return await this.db.users.where('username').equals(username).first();
        } catch (error) {
            console.error('Error obteniendo usuario por username:', error);
            throw error;
        }
    }

    async createUser(user) {
        try {
            user.createdAt = new Date();
            user.lastLogin = user.lastLogin || null;
            user.active = user.active !== undefined ? user.active : true;
            user.forcePasswordChange = user.forcePasswordChange !== undefined ? user.forcePasswordChange : false;
            
            return await this.db.users.add(user);
        } catch (error) {
            console.error('Error creando usuario:', error);
            throw error;
        }
    }

    async updateUser(id, updates) {
        try {
            return await this.db.users.update(id, updates);
        } catch (error) {
            console.error('Error actualizando usuario:', error);
            throw error;
        }
    }

    async deleteUser(id) {
        try {
            return await this.db.users.delete(id);
        } catch (error) {
            console.error('Error eliminando usuario:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS PARA VEHÍCULOS ====================
    async getVehicles() {
        try {
            return await this.db.vehicles.toArray();
        } catch (error) {
            console.error('Error obteniendo vehículos:', error);
            throw error;
        }
    }

    async getVehicleById(id) {
        try {
            return await this.db.vehicles.get(id);
        } catch (error) {
            console.error('Error obteniendo vehículo:', error);
            throw error;
        }
    }

    async getVehicleByPlaca(placa) {
        try {
            return await this.db.vehicles.where('placa').equals(placa).first();
        } catch (error) {
            console.error('Error obteniendo vehículo por placa:', error);
            throw error;
        }
    }

    async createVehicle(vehicle) {
        try {
            // Verificar si ya existe un vehículo con la misma placa
            const existing = await this.getVehicleByPlaca(vehicle.placa);
            if (existing) {
                throw new Error(`Ya existe un vehículo con la placa ${vehicle.placa}`);
            }

            vehicle.createdAt = new Date();
            vehicle.año = parseInt(vehicle.año);
            vehicle.odometroInicial = parseInt(vehicle.odometroInicial);
            
            return await this.db.vehicles.add(vehicle);
        } catch (error) {
            console.error('Error creando vehículo:', error);
            throw error;
        }
    }

    async updateVehicle(id, updates) {
        try {
            // Si se actualiza la placa, verificar que no exista otra
            if (updates.placa) {
                const existing = await this.getVehicleByPlaca(updates.placa);
                if (existing && existing.id !== id) {
                    throw new Error(`Ya existe un vehículo con la placa ${updates.placa}`);
                }
            }

            // Convertir números si es necesario
            if (updates.año) updates.año = parseInt(updates.año);
            if (updates.odometroInicial) updates.odometroInicial = parseInt(updates.odometroInicial);

            return await this.db.vehicles.update(id, updates);
        } catch (error) {
            console.error('Error actualizando vehículo:', error);
            throw error;
        }
    }

    async deleteVehicle(id) {
        try {
            // Eliminar componentes asociados al vehículo
            await this.db.components.where('vehicleId').equals(id).delete();
            
            // Eliminar fallas asociadas al vehículo
            const failures = await this.db.failures.where('vehicleId').equals(id).toArray();
            for (const failure of failures) {
                await this.db.maintenance.where('failureId').equals(failure.id).delete();
            }
            await this.db.failures.where('vehicleId').equals(id).delete();
            
            // Eliminar gastos asociados al vehículo
            await this.db.expenses.where('vehicleId').equals(id).delete();
            
            // Finalmente eliminar el vehículo
            return await this.db.vehicles.delete(id);
        } catch (error) {
            console.error('Error eliminando vehículo:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS PARA COMPONENTES ====================
    async getComponentsByVehicle(vehicleId) {
        try {
            return await this.db.components
                .where('vehicleId')
                .equals(vehicleId)
                .sortBy('nombre');
        } catch (error) {
            console.error('Error obteniendo componentes:', error);
            throw error;
        }
    }

    async getComponentById(id) {
        try {
            return await this.db.components.get(id);
        } catch (error) {
            console.error('Error obteniendo componente:', error);
            throw error;
        }
    }

    async createComponent(component) {
        try {
            component.createdAt = new Date();
            component.vidaUtil = parseInt(component.vidaUtil);
            
            return await this.db.components.add(component);
        } catch (error) {
            console.error('Error creando componente:', error);
            throw error;
        }
    }

    async updateComponent(id, updates) {
        try {
            if (updates.vidaUtil) updates.vidaUtil = parseInt(updates.vidaUtil);
            return await this.db.components.update(id, updates);
        } catch (error) {
            console.error('Error actualizando componente:', error);
            throw error;
        }
    }

    async deleteComponent(id) {
        try {
            return await this.db.components.delete(id);
        } catch (error) {
            console.error('Error eliminando componente:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS PARA FALLAS ====================
    async getFailures() {
        try {
            return await this.db.failures.toArray();
        } catch (error) {
            console.error('Error obteniendo fallas:', error);
            throw error;
        }
    }

    async getFailureById(id) {
        try {
            return await this.db.failures.get(id);
        } catch (error) {
            console.error('Error obteniendo falla:', error);
            throw error;
        }
    }

    async getFailuresByVehicle(vehicleId) {
        try {
            return await this.db.failures
                .where('vehicleId')
                .equals(vehicleId)
                .sortBy('fechaHora');
        } catch (error) {
            console.error('Error obteniendo fallas por vehículo:', error);
            throw error;
        }
    }

    async getFailuresByStatus(estado) {
        try {
            return await this.db.failures
                .where('estado')
                .equals(estado)
                .sortBy('fechaHora');
        } catch (error) {
            console.error('Error obteniendo fallas por estado:', error);
            throw error;
        }
    }

    async createFailure(failure) {
        try {
            failure.createdAt = new Date();
            failure.estado = failure.estado || 'Abierta';
            
            return await this.db.failures.add(failure);
        } catch (error) {
            console.error('Error creando falla:', error);
            throw error;
        }
    }

    async updateFailure(id, updates) {
        try {
            return await this.db.failures.update(id, updates);
        } catch (error) {
            console.error('Error actualizando falla:', error);
            throw error;
        }
    }

    async deleteFailure(id) {
        try {
            // Eliminar mantenimiento asociado
            await this.db.maintenance.where('failureId').equals(id).delete();
            return await this.db.failures.delete(id);
        } catch (error) {
            console.error('Error eliminando falla:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS PARA MANTENIMIENTO ====================
    async createMaintenanceRecord(maintenance) {
        try {
            maintenance.createdAt = new Date();
            maintenance.costo = parseFloat(maintenance.costo);
            
            return await this.db.maintenance.add(maintenance);
        } catch (error) {
            console.error('Error creando registro de mantenimiento:', error);
            throw error;
        }
    }

    async getMaintenanceByFailure(failureId) {
        try {
            return await this.db.maintenance
                .where('failureId')
                .equals(failureId)
                .first();
        } catch (error) {
            console.error('Error obteniendo mantenimiento:', error);
            throw error;
        }
    }

    async updateMaintenance(id, updates) {
        try {
            if (updates.costo) updates.costo = parseFloat(updates.costo);
            return await this.db.maintenance.update(id, updates);
        } catch (error) {
            console.error('Error actualizando mantenimiento:', error);
            throw error;
        }
    }

    async deleteMaintenance(id) {
        try {
            return await this.db.maintenance.delete(id);
        } catch (error) {
            console.error('Error eliminando mantenimiento:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS PARA GASTOS ====================
    async getExpenses() {
        try {
            return await this.db.expenses.toArray();
        } catch (error) {
            console.error('Error obteniendo gastos:', error);
            throw error;
        }
    }

    async getExpenseById(id) {
        try {
            return await this.db.expenses.get(id);
        } catch (error) {
            console.error('Error obteniendo gasto:', error);
            throw error;
        }
    }

    async getExpensesByVehicle(vehicleId) {
        try {
            return await this.db.expenses
                .where('vehicleId')
                .equals(vehicleId)
                .sortBy('fecha');
        } catch (error) {
            console.error('Error obteniendo gastos por vehículo:', error);
            throw error;
        }
    }

    async getExpensesByType(tipo) {
        try {
            return await this.db.expenses
                .where('tipo')
                .equals(tipo)
                .sortBy('fecha');
        } catch (error) {
            console.error('Error obteniendo gastos por tipo:', error);
            throw error;
        }
    }

    async createExpense(expense) {
        try {
            expense.createdAt = new Date();
            expense.monto = parseFloat(expense.monto);
            
            return await this.db.expenses.add(expense);
        } catch (error) {
            console.error('Error creando gasto:', error);
            throw error;
        }
    }

    async updateExpense(id, updates) {
        try {
            if (updates.monto) updates.monto = parseFloat(updates.monto);
            return await this.db.expenses.update(id, updates);
        } catch (error) {
            console.error('Error actualizando gasto:', error);
            throw error;
        }
    }

    async deleteExpense(id) {
        try {
            return await this.db.expenses.delete(id);
        } catch (error) {
            console.error('Error eliminando gasto:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS PARA PRESUPUESTOS ====================
    async getBudgets() {
        try {
            return await this.db.budgets.toArray();
        } catch (error) {
            console.error('Error obteniendo presupuestos:', error);
            throw error;
        }
    }

    async getBudgetById(id) {
        try {
            return await this.db.budgets.get(id);
        } catch (error) {
            console.error('Error obteniendo presupuesto:', error);
            throw error;
        }
    }

    async getBudgetByRegionalAndMonth(regional, mes) {
        try {
            return await this.db.budgets
                .where('[regional+mes]')
                .equals([regional, mes])
                .first();
        } catch (error) {
            console.error('Error obteniendo presupuesto por regional y mes:', error);
            throw error;
        }
    }

    async createBudget(budget) {
        try {
            // Verificar si ya existe un presupuesto para esa regional y mes
            const existing = await this.getBudgetByRegionalAndMonth(budget.regional, budget.mes);
            if (existing) {
                throw new Error(`Ya existe un presupuesto para ${budget.regional} en ${budget.mes}`);
            }

            budget.createdAt = new Date();
            budget.presupuesto = parseFloat(budget.presupuesto);
            budget.ejecutado = budget.ejecutado ? parseFloat(budget.ejecutado) : 0;
            
            return await this.db.budgets.add(budget);
        } catch (error) {
            console.error('Error creando presupuesto:', error);
            throw error;
        }
    }

    async updateBudget(id, updates) {
        try {
            // Si se actualiza regional o mes, verificar que no exista duplicado
            if (updates.regional && updates.mes) {
                const existing = await this.getBudgetByRegionalAndMonth(updates.regional, updates.mes);
                if (existing && existing.id !== id) {
                    throw new Error(`Ya existe un presupuesto para ${updates.regional} en ${updates.mes}`);
                }
            }

            if (updates.presupuesto) updates.presupuesto = parseFloat(updates.presupuesto);
            if (updates.ejecutado) updates.ejecutado = parseFloat(updates.ejecutado);

            return await this.db.budgets.update(id, updates);
        } catch (error) {
            console.error('Error actualizando presupuesto:', error);
            throw error;
        }
    }

    async deleteBudget(id) {
        try {
            return await this.db.budgets.delete(id);
        } catch (error) {
            console.error('Error eliminando presupuesto:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS PARA CONFIGURACIÓN ====================
    async getConfigValue(key) {
        try {
            const config = await this.db.systemConfig.where('key').equals(key).first();
            return config ? config.value : null;
        } catch (error) {
            console.error('Error obteniendo configuración:', error);
            throw error;
        }
    }

    async setConfigValue(key, value) {
        try {
            const existing = await this.db.systemConfig.where('key').equals(key).first();
            
            if (existing) {
                return await this.db.systemConfig.update(existing.id, { value, createdAt: new Date() });
            } else {
                return await this.db.systemConfig.add({ 
                    key, 
                    value, 
                    createdAt: new Date() 
                });
            }
        } catch (error) {
            console.error('Error actualizando configuración:', error);
            throw error;
        }
    }

    async getAllConfig() {
        try {
            return await this.db.systemConfig.toArray();
        } catch (error) {
            console.error('Error obteniendo toda la configuración:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS DE UTILIDAD ====================
    async getExpensesByMonth(month) {
        try {
            return await this.db.expenses
                .where('fecha')
                .startsWith(month)
                .toArray();
        } catch (error) {
            console.error('Error obteniendo gastos por mes:', error);
            throw error;
        }
    }

    async getFailuresByComponent(componente) {
        try {
            return await this.db.failures
                .where('componente')
                .equals(componente)
                .toArray();
        } catch (error) {
            console.error('Error obteniendo fallas por componente:', error);
            throw error;
        }
    }

    async getMaintenanceCostsByVehicle(vehicleId) {
        try {
            const failures = await this.getFailuresByVehicle(vehicleId);
            const maintenanceRecords = [];
            
            for (const failure of failures) {
                const maintenance = await this.getMaintenanceByFailure(failure.id);
                if (maintenance) {
                    maintenanceRecords.push({
                        ...maintenance,
                        failure: failure
                    });
                }
            }
            
            return maintenanceRecords;
        } catch (error) {
            console.error('Error obteniendo costos de mantenimiento:', error);
            throw error;
        }
    }

    async getTotalExpensesByVehicle(vehicleId) {
        try {
            const expenses = await this.getExpensesByVehicle(vehicleId);
            return expenses.reduce((total, expense) => total + expense.monto, 0);
        } catch (error) {
            console.error('Error calculando total de gastos:', error);
            throw error;
        }
    }

    async getStatistics() {
        try {
            const [
                totalVehicles,
                totalFailures,
                openFailures,
                totalExpenses,
                totalMaintenanceCosts
            ] = await Promise.all([
                this.db.vehicles.count(),
                this.db.failures.count(),
                this.db.failures.where('estado').equals('Abierta').count(),
                this.db.expenses.toArray().then(expenses => 
                    expenses.reduce((sum, expense) => sum + expense.monto, 0)
                ),
                this.db.maintenance.toArray().then(maintenance => 
                    maintenance.reduce((sum, m) => sum + m.costo, 0)
                )
            ]);

            return {
                totalVehicles,
                totalFailures,
                openFailures,
                totalExpenses,
                totalMaintenanceCosts,
                resolvedFailures: totalFailures - openFailures
            };
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS DE BACKUP Y RESTAURACIÓN ====================
    async exportData() {
        try {
            const data = {
                users: await this.getUsers(),
                vehicles: await this.getVehicles(),
                components: await this.db.components.toArray(),
                failures: await this.getFailures(),
                maintenance: await this.db.maintenance.toArray(),
                expenses: await this.getExpenses(),
                budgets: await this.getBudgets(),
                systemConfig: await this.getAllConfig(),
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
            
            return JSON.stringify(data, null, 2);
        } catch (error) {
            console.error('Error exportando datos:', error);
            throw error;
        }
    }

    async importData(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            // Verificar que sea un formato válido
            if (!data.version || !data.exportDate) {
                throw new Error('Formato de datos inválido');
            }

            // Usar transacción para asegurar consistencia
            return await this.db.transaction('rw', 
                this.db.users, 
                this.db.vehicles, 
                this.db.components, 
                this.db.failures, 
                this.db.maintenance, 
                this.db.expenses, 
                this.db.budgets, 
                this.db.systemConfig,
            async () => {
                // Limpiar datos existentes
                await Promise.all([
                    this.db.users.clear(),
                    this.db.vehicles.clear(),
                    this.db.components.clear(),
                    this.db.failures.clear(),
                    this.db.maintenance.clear(),
                    this.db.expenses.clear(),
                    this.db.budgets.clear(),
                    this.db.systemConfig.clear()
                ]);

                // Importar nuevos datos
                await Promise.all([
                    this.db.users.bulkAdd(data.users || []),
                    this.db.vehicles.bulkAdd(data.vehicles || []),
                    this.db.components.bulkAdd(data.components || []),
                    this.db.failures.bulkAdd(data.failures || []),
                    this.db.maintenance.bulkAdd(data.maintenance || []),
                    this.db.expenses.bulkAdd(data.expenses || []),
                    this.db.budgets.bulkAdd(data.budgets || []),
                    this.db.systemConfig.bulkAdd(data.systemConfig || [])
                ]);

                return true;
            });

        } catch (error) {
            console.error('Error importando datos:', error);
            throw error;
        }
    }

    // ==================== MÉTODOS DE MANTENIMIENTO ====================
    async clearAllData() {
        try {
            await Promise.all([
                this.db.users.clear(),
                this.db.vehicles.clear(),
                this.db.components.clear(),
                this.db.failures.clear(),
                this.db.maintenance.clear(),
                this.db.expenses.clear(),
                this.db.budgets.clear()
            ]);
            
            // No limpiar systemConfig para mantener la configuración
            return true;
        } catch (error) {
            console.error('Error limpiando datos:', error);
            throw error;
        }
    }

    async getDatabaseSize() {
        try {
            // Estimación del tamaño de la base de datos
            const sizes = await Promise.all([
                this.db.users.count(),
                this.db.vehicles.count(),
                this.db.components.count(),
                this.db.failures.count(),
                this.db.maintenance.count(),
                this.db.expenses.count(),
                this.db.budgets.count()
            ]);
            
            const totalRecords = sizes.reduce((sum, count) => sum + count, 0);
            // Estimación aproximada: 1KB por registro en promedio
            const estimatedSizeKB = totalRecords;
            
            return {
                totalRecords,
                estimatedSizeKB,
                estimatedSizeMB: (estimatedSizeKB / 1024).toFixed(2)
            };
        } catch (error) {
            console.error('Error calculando tamaño de base de datos:', error);
            throw error;
        }
    }
}

// Inicializar base de datos global
window.database = new Database();
