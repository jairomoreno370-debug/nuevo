// Sistema de Reportes y Análisis - COMPLETO
class ReportsSystem {
    constructor() {
        this.currentReport = null;
        this.reportData = {};
        this.charts = {};
        this.init();
    }

    async init() {
        await this.loadInitialData();
        this.setupEventListeners();
    }

    async loadInitialData() {
        try {
            this.showLoading('Cargando datos para reportes...');
            
            // Cargar todos los datos necesarios
            const [vehicles, failures, expenses, budgets] = await Promise.all([
                database.getVehicles(),
                database.getFailures(),
                database.getExpenses(),
                database.getBudgets()
            ]);

            this.reportData = {
                vehicles,
                failures,
                expenses,
                budgets,
                lastUpdated: new Date()
            };

            this.hideLoading();
            
        } catch (error) {
            console.error('Error cargando datos para reportes:', error);
            this.showError('Error al cargar los datos para reportes: ' + error.message);
            this.hideLoading();
        }
    }

    setupEventListeners() {
        // Filtros de fecha si existen
        const dateFilter = document.getElementById('reportDateFilter');
        if (dateFilter) {
            dateFilter.addEventListener('change', () => this.updateCurrentReport());
        }

        // Filtro de regional si existe
        const regionalFilter = document.getElementById('reportRegionalFilter');
        if (regionalFilter) {
            regionalFilter.addEventListener('change', () => this.updateCurrentReport());
        }
    }

    async loadReports() {
        // Recargar datos para reportes actualizados
        await this.loadInitialData();
        
        // Si hay un reporte activo, actualizarlo
        if (this.currentReport) {
            this.showReport(this.currentReport);
        }
    }

    showReport(reportType) {
        this.currentReport = reportType;
        let reportContent = '';
        let reportTitle = '';

        switch (reportType) {
            case 'budget':
                reportTitle = 'Reporte de Presupuesto vs Ejecutado';
                reportContent = this.generateBudgetReport();
                break;
            case 'failures':
                reportTitle = 'Análisis de Fallas';
                reportContent = this.generateFailuresReport();
                break;
            case 'expenses':
                reportTitle = 'Reporte de Gastos Detallados';
                reportContent = this.generateExpensesReport();
                break;
            case 'maintenance':
                reportTitle = 'Reporte de Mantenimiento';
                reportContent = this.generateMaintenanceReport();
                break;
            case 'vehicles':
                reportTitle = 'Reporte de Vehículos';
                reportContent = this.generateVehiclesReport();
                break;
            case 'executive':
                reportTitle = 'Reporte Ejecutivo';
                reportContent = this.generateExecutiveReport();
                break;
        }

        const reportContainer = document.getElementById('reportContent');
        if (reportContainer) {
            reportContainer.innerHTML = `
                <div class="report-header">
                    <div class="report-title">
                        <h3>${reportTitle}</h3>
                        <div class="report-actions">
                            <button class="btn-secondary" onclick="reportsSystem.exportReport('${reportType}')">
                                <i class="fas fa-download"></i> Exportar PDF
                            </button>
                            <button class="btn-secondary" onclick="reportsSystem.printReport('${reportType}')">
                                <i class="fas fa-print"></i> Imprimir
                            </button>
                            <button class="btn-primary" onclick="reportsSystem.refreshReport()">
                                <i class="fas fa-sync-alt"></i> Actualizar
                            </button>
                        </div>
                    </div>
                    <div class="report-filters">
                        <div class="filter-group">
                            <label for="reportDateRange">Período:</label>
                            <select id="reportDateRange" onchange="reportsSystem.updateCurrentReport()">
                                <option value="current_month">Mes Actual</option>
                                <option value="last_month">Mes Anterior</option>
                                <option value="last_3_months">Últimos 3 Meses</option>
                                <option value="current_year">Año Actual</option>
                                <option value="all">Todo el Período</option>
                            </select>
                        </div>
                        <div class="filter-group">
                            <label for="reportRegional">Regional:</label>
                            <select id="reportRegional" onchange="reportsSystem.updateCurrentReport()">
                                <option value="all">Todas las Regionales</option>
                                <option value="Norte">Norte</option>
                                <option value="Sur">Sur</option>
                                <option value="Centro">Centro</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="report-content">
                    ${reportContent}
                </div>
            `;

            // Inicializar gráficos después de renderizar el contenido
            setTimeout(() => {
                this.initializeReportCharts(reportType);
            }, 100);
        }
    }

    updateCurrentReport() {
        if (this.currentReport) {
            this.showReport(this.currentReport);
        }
    }

    refreshReport() {
        this.loadReports().then(() => {
            this.showSuccess('Reporte actualizado correctamente');
        });
    }

    generateBudgetReport() {
        const budgets = this.reportData.budgets;
        const expenses = this.reportData.expenses;
        
        // Calcular ejecutado por regional y mes
        const executedByRegionalMonth = this.calculateExecutedByRegionalMonth(expenses);
        
        // Combinar presupuestos con ejecutado
        const budgetAnalysis = budgets.map(budget => {
            const executed = executedByRegionalMonth[budget.regional]?.[budget.mes] || 0;
            const difference = executed - budget.presupuesto;
            const percentage = budget.presupuesto > 0 ? (executed / budget.presupuesto) * 100 : 0;
            
            return {
                ...budget,
                ejecutado: executed,
                diferencia: difference,
                porcentaje: percentage
            };
        });

        return `
            <div class="report-section">
                <div class="section-header">
                    <h4><i class="fas fa-chart-line"></i> Resumen Presupuestario</h4>
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="summary-icon primary">
                                <i class="fas fa-money-bill-wave"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Presupuesto Total</span>
                                <span class="summary-value">${this.formatCurrency(this.calculateTotalBudget(budgets))}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon success">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Ejecutado Total</span>
                                <span class="summary-value">${this.formatCurrency(this.calculateTotalExecuted(expenses))}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon ${this.calculateTotalDifference(budgets, expenses) >= 0 ? 'danger' : 'warning'}">
                                <i class="fas fa-balance-scale"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Diferencia Total</span>
                                <span class="summary-value">${this.formatCurrency(this.calculateTotalDifference(budgets, expenses))}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="charts-row">
                    <div class="chart-container">
                        <h5>Presupuesto vs Ejecutado por Regional</h5>
                        <canvas id="budgetRegionalChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h5>Distribución del Presupuesto</h5>
                        <canvas id="budgetDistributionChart"></canvas>
                    </div>
                </div>

                <div class="report-section">
                    <h5><i class="fas fa-table"></i> Detalle Presupuestario</h5>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Regional</th>
                                    <th>Mes</th>
                                    <th>Presupuesto</th>
                                    <th>Ejecutado</th>
                                    <th>Diferencia</th>
                                    <th>% Ejecución</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${budgetAnalysis.length > 0 ? 
                                    budgetAnalysis.map(item => `
                                        <tr>
                                            <td>${item.regional}</td>
                                            <td>${this.formatMonth(item.mes)}</td>
                                            <td>${this.formatCurrency(item.presupuesto)}</td>
                                            <td>${this.formatCurrency(item.ejecutado)}</td>
                                            <td class="${item.diferencia >= 0 ? 'text-danger' : 'text-success'}">
                                                ${this.formatCurrency(item.diferencia)}
                                            </td>
                                            <td>
                                                <div class="progress-bar-container">
                                                    <div class="progress-bar">
                                                        <div class="progress-fill ${this.getProgressBarClass(item.porcentaje)}" 
                                                             style="width: ${Math.min(item.porcentaje, 100)}%">
                                                        </div>
                                                    </div>
                                                    <span class="progress-text">${item.porcentaje.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span class="status-badge ${this.getBudgetStatus(item.porcentaje)}">
                                                    ${this.getBudgetStatusText(item.porcentaje)}
                                                </span>
                                            </td>
                                        </tr>
                                    `).join('') :
                                    `<tr><td colspan="7" class="empty-state">No hay datos presupuestarios</td></tr>`
                                }
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    generateFailuresReport() {
        const failures = this.reportData.failures;
        const vehicles = this.reportData.vehicles;
        
        const failuresByComponent = this.groupFailuresByComponent(failures);
        const failuresByStatus = this.groupFailuresByStatus(failures);
        const failuresByMonth = this.groupFailuresByMonth(failures);
        const failuresByVehicle = this.groupFailuresByVehicle(failures, vehicles);

        return `
            <div class="report-section">
                <div class="section-header">
                    <h4><i class="fas fa-exclamation-triangle"></i> Análisis de Fallas</h4>
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="summary-icon warning">
                                <i class="fas fa-tools"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Total Fallas</span>
                                <span class="summary-value">${failures.length}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon danger">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Fallas Abiertas</span>
                                <span class="summary-value">${failuresByStatus.Abierta || 0}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon success">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Fallas Resueltas</span>
                                <span class="summary-value">${failuresByStatus.Resuelta || 0}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon info">
                                <i class="fas fa-cog"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Tasa de Resolución</span>
                                <span class="summary-value">${failures.length > 0 ? ((failuresByStatus.Resuelta || 0) / failures.length * 100).toFixed(1) : 0}%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="charts-row">
                    <div class="chart-container">
                        <h5>Fallas por Componente</h5>
                        <canvas id="failuresByComponentChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h5>Fallas por Estado</h5>
                        <canvas id="failuresByStatusChart"></canvas>
                    </div>
                </div>

                <div class="charts-row">
                    <div class="chart-container">
                        <h5>Evolución Mensual de Fallas</h5>
                        <canvas id="failuresTrendChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h5>Fallas por Vehículo (Top 10)</h5>
                        <canvas id="failuresByVehicleChart"></canvas>
                    </div>
                </div>

                <div class="report-section">
                    <h5><i class="fas fa-table"></i> Componentes con Más Fallas</h5>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Componente</th>
                                    <th>Total Fallas</th>
                                    <th>Abiertas</th>
                                    <th>En Proceso</th>
                                    <th>Resueltas</th>
                                    <th>Tasa de Resolución</th>
                                    <th>Prioridad Promedio</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(failuresByComponent).slice(0, 10).map(([component, data]) => `
                                    <tr>
                                        <td><strong>${this.escapeHtml(component)}</strong></td>
                                        <td>${data.total}</td>
                                        <td class="text-danger">${data.estados?.Abierta || 0}</td>
                                        <td class="text-warning">${data.estados?.['En Proceso'] || 0}</td>
                                        <td class="text-success">${data.estados?.Resuelta || 0}</td>
                                        <td>
                                            <div class="progress-bar-container">
                                                <div class="progress-bar">
                                                    <div class="progress-fill ${this.getResolutionRateClass(data.tasaResolucion)}" 
                                                         style="width: ${data.tasaResolucion}%">
                                                    </div>
                                                </div>
                                                <span class="progress-text">${data.tasaResolucion.toFixed(1)}%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="priority-badge ${this.getAveragePriorityClass(data.prioridadPromedio)}">
                                                ${data.prioridadPromedio}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    generateExpensesReport() {
        const expenses = this.reportData.expenses;
        const vehicles = this.reportData.vehicles;
        
        const expensesByType = this.groupExpensesByType(expenses);
        const expensesByMonth = this.groupExpensesByMonth(expenses);
        const expensesByVehicle = this.groupExpensesByVehicle(expenses, vehicles);
        const expensesByRegional = this.groupExpensesByRegional(expenses);

        return `
            <div class="report-section">
                <div class="section-header">
                    <h4><i class="fas fa-chart-pie"></i> Análisis de Gastos</h4>
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="summary-icon primary">
                                <i class="fas fa-money-bill-wave"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Gasto Total</span>
                                <span class="summary-value">${this.formatCurrency(this.calculateTotalExpenses(expenses))}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon info">
                                <i class="fas fa-tags"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Tipos de Gasto</span>
                                <span class="summary-value">${Object.keys(expensesByType).length}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon success">
                                <i class="fas fa-car"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Vehículos con Gastos</span>
                                <span class="summary-value">${Object.keys(expensesByVehicle).length}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon warning">
                                <i class="fas fa-calendar-alt"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Promedio Mensual</span>
                                <span class="summary-value">${this.formatCurrency(this.calculateMonthlyAverage(expenses))}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="charts-row">
                    <div class="chart-container">
                        <h5>Distribución por Tipo de Gasto</h5>
                        <canvas id="expensesByTypeChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h5>Gastos por Mes</h5>
                        <canvas id="expensesTrendChart"></canvas>
                    </div>
                </div>

                <div class="charts-row">
                    <div class="chart-container">
                        <h5>Gastos por Regional</h5>
                        <canvas id="expensesByRegionalChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h5>Top 10 Vehículos por Gasto</h5>
                        <canvas id="expensesByVehicleChart"></canvas>
                    </div>
                </div>

                <div class="report-section">
                    <h5><i class="fas fa-table"></i> Detalle de Gastos por Tipo</h5>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Tipo de Gasto</th>
                                    <th>Total Gastado</th>
                                    <th>% del Total</th>
                                    <th>Cantidad</th>
                                    <th>Promedio por Gasto</th>
                                    <th>Último Gasto</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${Object.entries(expensesByType).map(([type, data]) => `
                                    <tr>
                                        <td>
                                            <span class="expense-type type-${this.getExpenseTypeClass(type)}">
                                                <i class="fas fa-${this.getExpenseTypeIcon(type)}"></i>
                                                ${this.escapeHtml(type)}
                                            </span>
                                        </td>
                                        <td><strong>${this.formatCurrency(data.total)}</strong></td>
                                        <td>
                                            <div class="progress-bar-container">
                                                <div class="progress-bar">
                                                    <div class="progress-fill" style="width: ${data.percentage}%"></div>
                                                </div>
                                                <span class="progress-text">${data.percentage.toFixed(1)}%</span>
                                            </div>
                                        </td>
                                        <td>${data.count}</td>
                                        <td>${this.formatCurrency(data.average)}</td>
                                        <td>${data.lastDate ? new Date(data.lastDate).toLocaleDateString() : 'N/A'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    generateMaintenanceReport() {
        const failures = this.reportData.failures;
        const expenses = this.reportData.expenses;
        
        const maintenanceCosts = this.calculateMaintenanceCosts(failures, expenses);
        const maintenanceByVehicle = this.groupMaintenanceByVehicle(maintenanceCosts);
        const maintenanceByComponent = this.groupMaintenanceByComponent(maintenanceCosts);

        return `
            <div class="report-section">
                <div class="section-header">
                    <h4><i class="fas fa-tools"></i> Reporte de Mantenimiento</h4>
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="summary-icon primary">
                                <i class="fas fa-dollar-sign"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Costo Total Mantenimiento</span>
                                <span class="summary-value">${this.formatCurrency(maintenanceCosts.totalCost)}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon warning">
                                <i class="fas fa-wrench"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Intervenciones</span>
                                <span class="summary-value">${maintenanceCosts.interventions}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon info">
                                <i class="fas fa-car"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Vehículos Atendidos</span>
                                <span class="summary-value">${maintenanceCosts.vehiclesServed}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon success">
                                <i class="fas fa-calculator"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Costo Promedio</span>
                                <span class="summary-value">${this.formatCurrency(maintenanceCosts.averageCost)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="charts-row">
                    <div class="chart-container">
                        <h5>Costos de Mantenimiento por Vehículo</h5>
                        <canvas id="maintenanceByVehicleChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h5>Costos por Tipo de Componente</h5>
                        <canvas id="maintenanceByComponentChart"></canvas>
                    </div>
                </div>

                <div class="report-section">
                    <h5><i class="fas fa-table"></i> Vehículos con Mayor Costo de Mantenimiento</h5>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Vehículo</th>
                                    <th>Total Mantenimiento</th>
                                    <th>Intervenciones</th>
                                    <th>Costo Promedio</th>
                                    <th>Última Intervención</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${maintenanceByVehicle.slice(0, 10).map(vehicle => `
                                    <tr>
                                        <td><strong>${this.escapeHtml(vehicle.placa)}</strong></td>
                                        <td class="amount">${this.formatCurrency(vehicle.totalCost)}</td>
                                        <td>${vehicle.interventions}</td>
                                        <td>${this.formatCurrency(vehicle.averageCost)}</td>
                                        <td>${vehicle.lastIntervention ? new Date(vehicle.lastIntervention).toLocaleDateString() : 'N/A'}</td>
                                        <td>
                                            <span class="status-badge ${this.getMaintenanceStatus(vehicle)}">
                                                ${this.getMaintenanceStatusText(vehicle)}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    generateVehiclesReport() {
        const vehicles = this.reportData.vehicles;
        const failures = this.reportData.failures;
        const expenses = this.reportData.expenses;

        const vehicleStats = this.calculateVehicleStats(vehicles, failures, expenses);

        return `
            <div class="report-section">
                <div class="section-header">
                    <h4><i class="fas fa-car"></i> Reporte de Vehículos</h4>
                    <div class="summary-cards">
                        <div class="summary-card">
                            <div class="summary-icon primary">
                                <i class="fas fa-car-side"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Total Vehículos</span>
                                <span class="summary-value">${vehicles.length}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon success">
                                <i class="fas fa-check-circle"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Vehículos Activos</span>
                                <span class="summary-value">${vehicleStats.activeVehicles}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon warning">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Con Fallas Activas</span>
                                <span class="summary-value">${vehicleStats.vehiclesWithActiveFailures}</span>
                            </div>
                        </div>
                        <div class="summary-card">
                            <div class="summary-icon info">
                                <i class="fas fa-chart-line"></i>
                            </div>
                            <div class="summary-content">
                                <span class="summary-label">Gasto Promedio</span>
                                <span class="summary-value">${this.formatCurrency(vehicleStats.averageExpense)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="charts-row">
                    <div class="chart-container">
                        <h5>Distribución por Regional</h5>
                        <canvas id="vehiclesByRegionalChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h5>Vehículos por Año</h5>
                        <canvas id="vehiclesByYearChart"></canvas>
                    </div>
                </div>

                <div class="report-section">
                    <h5><i class="fas fa-table"></i> Resumen por Vehículo</h5>
                    <div class="table-container">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Vehículo</th>
                                    <th>Regional</th>
                                    <th>Año</th>
                                    <th>Total Fallas</th>
                                    <th>Fallas Activas</th>
                                    <th>Total Gastos</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${vehicleStats.detailedStats.map(vehicle => `
                                    <tr>
                                        <td>
                                            <strong>${this.escapeHtml(vehicle.placa)}</strong>
                                            <div class="vehicle-details">
                                                ${this.escapeHtml(vehicle.marca)} ${this.escapeHtml(vehicle.modelo)}
                                            </div>
                                        </td>
                                        <td>
                                            <span class="status-badge regional-${vehicle.regional.toLowerCase()}">
                                                ${vehicle.regional}
                                            </span>
                                        </td>
                                        <td>${vehicle.año}</td>
                                        <td>${vehicle.totalFailures}</td>
                                        <td class="${vehicle.activeFailures > 0 ? 'text-danger' : 'text-success'}">
                                            ${vehicle.activeFailures}
                                        </td>
                                        <td class="amount">${this.formatCurrency(vehicle.totalExpenses)}</td>
                                        <td>
                                            <span class="status-badge ${this.getVehicleStatus(vehicle)}">
                                                ${this.getVehicleStatusText(vehicle)}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }

    generateExecutiveReport() {
        const vehicles = this.reportData.vehicles;
        const failures = this.reportData.failures;
        const expenses = this.reportData.expenses;
        const budgets = this.reportData.budgets;

        const kpis = this.calculateKPIs(vehicles, failures, expenses, budgets);

        return `
            <div class="report-section">
                <div class="section-header">
                    <h4><i class="fas fa-chart-bar"></i> Reporte Ejecutivo - Dashboard</h4>
                    <div class="kpi-grid">
                        <div class="kpi-card">
                            <div class="kpi-icon primary">
                                <i class="fas fa-caravan"></i>
                            </div>
                            <div class="kpi-content">
                                <span class="kpi-value">${vehicles.length}</span>
                                <span class="kpi-label">Total Vehículos</span>
                            </div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-icon ${kpis.failureRate < 10 ? 'success' : 'warning'}">
                                <i class="fas fa-tachometer-alt"></i>
                            </div>
                            <div class="kpi-content">
                                <span class="kpi-value">${kpis.failureRate.toFixed(1)}%</span>
                                <span class="kpi-label">Tasa de Fallas</span>
                            </div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-icon ${kpis.maintenanceEfficiency > 80 ? 'success' : 'warning'}">
                                <i class="fas fa-wrench"></i>
                            </div>
                            <div class="kpi-content">
                                <span class="kpi-value">${kpis.maintenanceEfficiency.toFixed(1)}%</span>
                                <span class="kpi-label">Eficiencia Mantenimiento</span>
                            </div>
                        </div>
                        <div class="kpi-card">
                            <div class="kpi-icon ${kpis.budgetUtilization > 90 ? 'danger' : kpis.budgetUtilization > 80 ? 'warning' : 'success'}">
                                <i class="fas fa-money-bill-wave"></i>
                            </div>
                            <div class="kpi-content">
                                <span class="kpi-value">${kpis.budgetUtilization.toFixed(1)}%</span>
                                <span class="kpi-label">Utilización Presupuesto</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="charts-row">
                    <div class="chart-container">
                        <h5>KPIs Principales</h5>
                        <canvas id="kpiRadarChart"></canvas>
                    </div>
                    <div class="chart-container">
                        <h5>Tendencias Mensuales</h5>
                        <canvas id="executiveTrendChart"></canvas>
                    </div>
                </div>

                <div class="insights-section">
                    <h5><i class="fas fa-lightbulb"></i> Insights y Recomendaciones</h5>
                    <div class="insights-grid">
                        ${this.generateInsights(kpis).map(insight => `
                            <div class="insight-card ${insight.type}">
                                <div class="insight-icon">
                                    <i class="fas fa-${insight.icon}"></i>
                                </div>
                                <div class="insight-content">
                                    <h6>${insight.title}</h6>
                                    <p>${insight.message}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Métodos de utilidad para cálculos
    calculateExecutedByRegionalMonth(expenses) {
        const result = {};
        expenses.forEach(expense => {
            const month = expense.fecha.substring(0, 7); // YYYY-MM
            if (!result[expense.regional]) {
                result[expense.regional] = {};
            }
            if (!result[expense.regional][month]) {
                result[expense.regional][month] = 0;
            }
            result[expense.regional][month] += expense.monto;
        });
        return result;
    }

    calculateTotalBudget(budgets) {
        return budgets.reduce((sum, budget) => sum + budget.presupuesto, 0);
    }

    calculateTotalExecuted(expenses) {
        return expenses.reduce((sum, expense) => sum + expense.monto, 0);
    }

    calculateTotalDifference(budgets, expenses) {
        return this.calculateTotalExecuted(expenses) - this.calculateTotalBudget(budgets);
    }

    groupFailuresByComponent(failures) {
        const result = {};
        failures.forEach(failure => {
            if (!result[failure.componente]) {
                result[failure.componente] = {
                    total: 0,
                    estados: {},
                    prioridades: [],
                    tasaResolucion: 0
                };
            }
            result[failure.componente].total++;
            
            // Contar por estado
            if (!result[failure.componente].estados[failure.estado]) {
                result[failure.componente].estados[failure.estado] = 0;
            }
            result[failure.componente].estados[failure.estado]++;
            
            // Acumular prioridades para promedio
            result[failure.componente].prioridades.push(failure.prioridad);
        });

        // Calcular tasa de resolución y prioridad promedio
        Object.keys(result).forEach(component => {
            const data = result[component];
            const resueltas = data.estados.Resuelta || 0;
            data.tasaResolucion = data.total > 0 ? (resueltas / data.total) * 100 : 0;
            
            // Calcular prioridad promedio
            const priorityWeights = { 'Alta': 3, 'Media': 2, 'Baja': 1 };
            const avgWeight = data.prioridades.reduce((sum, prio) => sum + priorityWeights[prio], 0) / data.prioridades.length;
            data.prioridadPromedio = avgWeight >= 2.5 ? 'Alta' : avgWeight >= 1.5 ? 'Media' : 'Baja';
        });

        return result;
    }

    groupFailuresByStatus(failures) {
        const result = {};
        failures.forEach(failure => {
            if (!result[failure.estado]) {
                result[failure.estado] = 0;
            }
            result[failure.estado]++;
        });
        return result;
    }

    groupFailuresByMonth(failures) {
        const result = {};
        failures.forEach(failure => {
            const month = failure.fechaHora.substring(0, 7); // YYYY-MM
            if (!result[month]) {
                result[month] = 0;
            }
            result[month]++;
        });
        return result;
    }

    groupFailuresByVehicle(failures, vehicles) {
        const result = {};
        failures.forEach(failure => {
            if (!result[failure.placa]) {
                result[failure.placa] = 0;
            }
            result[failure.placa]++;
        });

        // Ordenar por cantidad de fallas
        return Object.entries(result)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .reduce((acc, [placa, count]) => {
                acc[placa] = count;
                return acc;
            }, {});
    }

    // Métodos para inicializar gráficos
    initializeReportCharts(reportType) {
        // Destruir gráficos existentes
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
        this.charts = {};

        switch (reportType) {
            case 'budget':
                this.initializeBudgetCharts();
                break;
            case 'failures':
                this.initializeFailureCharts();
                break;
            case 'expenses':
                this.initializeExpenseCharts();
                break;
            case 'maintenance':
                this.initializeMaintenanceCharts();
                break;
            case 'vehicles':
                this.initializeVehicleCharts();
                break;
            case 'executive':
                this.initializeExecutiveCharts();
                break;
        }
    }

    initializeBudgetCharts() {
        // Implementar inicialización de gráficos de presupuesto
        console.log('Inicializando gráficos de presupuesto');
    }

    initializeFailureCharts() {
        // Implementar inicialización de gráficos de fallas
        console.log('Inicializando gráficos de fallas');
    }

    initializeExpenseCharts() {
        // Implementar inicialización de gráficos de gastos
        console.log('Inicializando gráficos de gastos');
    }

    initializeMaintenanceCharts() {
        // Implementar inicialización de gráficos de mantenimiento
        console.log('Inicializando gráficos de mantenimiento');
    }

    initializeVehicleCharts() {
        // Implementar inicialización de gráficos de vehículos
        console.log('Inicializando gráficos de vehículos');
    }

    initializeExecutiveCharts() {
        // Implementar inicialización de gráficos ejecutivos
        console.log('Inicializando gráficos ejecutivos');
    }

    // Métodos de utilidad
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    }

    formatMonth(monthString) {
        const [year, month] = monthString.split('-');
        const date = new Date(year, month - 1);
        return date.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
    }

    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .toString()
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    getProgressBarClass(percentage) {
        if (percentage >= 90) return 'danger';
        if (percentage >= 80) return 'warning';
        return 'success';
    }

    getBudgetStatus(percentage) {
        if (percentage >= 100) return 'danger';
        if (percentage >= 90) return 'warning';
        if (percentage >= 70) return 'info';
        return 'success';
    }

    getBudgetStatusText(percentage) {
        if (percentage >= 100) return 'Sobregirado';
        if (percentage >= 90) return 'Alto';
        if (percentage >= 70) return 'Moderado';
        return 'Bajo';
    }

    // Métodos para exportación
    exportReport(reportType) {
        this.showSuccess(`Exportando reporte ${reportType} en PDF...`);
        // En una implementación real, usarías una librería como jsPDF
    }

    printReport(reportType) {
        this.showSuccess(`Preparando reporte ${reportType} para impresión...`);
        window.print();
    }

    // Métodos de UI
    showLoading(message = 'Cargando...') {
        console.log('Loading:', message);
    }

    hideLoading() {
        // Ocultar loading si está implementado
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

    // Métodos placeholder para cálculos complejos
    groupExpensesByType(expenses) {
        const result = {};
        const total = expenses.reduce((sum, expense) => sum + expense.monto, 0);
        
        expenses.forEach(expense => {
            if (!result[expense.tipo]) {
                result[expense.tipo] = {
                    total: 0,
                    count: 0,
                    average: 0,
                    percentage: 0,
                    lastDate: null
                };
            }
            result[expense.tipo].total += expense.monto;
            result[expense.tipo].count++;
            if (!result[expense.tipo].lastDate || new Date(expense.fecha) > new Date(result[expense.tipo].lastDate)) {
                result[expense.tipo].lastDate = expense.fecha;
            }
        });

        // Calcular promedios y porcentajes
        Object.keys(result).forEach(type => {
            result[type].average = result[type].total / result[type].count;
            result[type].percentage = total > 0 ? (result[type].total / total) * 100 : 0;
        });

        return result;
    }

    groupExpensesByMonth(expenses) {
        const result = {};
        expenses.forEach(expense => {
            const month = expense.fecha.substring(0, 7);
            if (!result[month]) {
                result[month] = 0;
            }
            result[month] += expense.monto;
        });
        return result;
    }

    groupExpensesByVehicle(expenses, vehicles) {
        const result = {};
        expenses.forEach(expense => {
            if (!result[expense.placa]) {
                result[expense.placa] = 0;
            }
            result[expense.placa] += expense.monto;
        });

        // Ordenar por monto total
        return Object.entries(result)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .reduce((acc, [placa, amount]) => {
                acc[placa] = amount;
                return acc;
            }, {});
    }

    groupExpensesByRegional(expenses) {
        const result = {};
        expenses.forEach(expense => {
            if (!result[expense.regional]) {
                result[expense.regional] = 0;
            }
            result[expense.regional] += expense.monto;
        });
        return result;
    }

    calculateMonthlyAverage(expenses) {
        if (expenses.length === 0) return 0;
        
        const monthlyTotals = {};
        expenses.forEach(expense => {
            const month = expense.fecha.substring(0, 7);
            if (!monthlyTotals[month]) {
                monthlyTotals[month] = 0;
            }
            monthlyTotals[month] += expense.monto;
        });

        const totalMonths = Object.keys(monthlyTotals).length;
        const totalAmount = Object.values(monthlyTotals).reduce((sum, amount) => sum + amount, 0);
        
        return totalMonths > 0 ? totalAmount / totalMonths : 0;
    }

    // Métodos para mantenimiento
    calculateMaintenanceCosts(failures, expenses) {
        // Este es un método simplificado - en una implementación real
        // conectarías las fallas con los gastos de mantenimiento
        const maintenanceExpenses = expenses.filter(expense => 
            expense.tipo === 'Mantenimiento Correctivo' || 
            expense.tipo === 'Mantenimiento Preventivo'
        );

        return {
            totalCost: maintenanceExpenses.reduce((sum, expense) => sum + expense.monto, 0),
            interventions: maintenanceExpenses.length,
            vehiclesServed: new Set(maintenanceExpenses.map(expense => expense.placa)).size,
            averageCost: maintenanceExpenses.length > 0 ? 
                maintenanceExpenses.reduce((sum, expense) => sum + expense.monto, 0) / maintenanceExpenses.length : 0
        };
    }

    groupMaintenanceByVehicle(maintenanceCosts) {
        // Implementación simplificada
        return [];
    }

    groupMaintenanceByComponent(maintenanceCosts) {
        // Implementación simplificada
        return [];
    }

    // Métodos para vehículos
    calculateVehicleStats(vehicles, failures, expenses) {
        const detailedStats = vehicles.map(vehicle => {
            const vehicleFailures = failures.filter(f => f.placa === vehicle.placa);
            const vehicleExpenses = expenses.filter(e => e.placa === vehicle.placa);
            
            return {
                ...vehicle,
                totalFailures: vehicleFailures.length,
                activeFailures: vehicleFailures.filter(f => f.estado !== 'Resuelta').length,
                totalExpenses: vehicleExpenses.reduce((sum, expense) => sum + expense.monto, 0)
            };
        });

        return {
            activeVehicles: vehicles.length, // Simplificado - en realidad verificarías estado
            vehiclesWithActiveFailures: detailedStats.filter(v => v.activeFailures > 0).length,
            averageExpense: vehicles.length > 0 ? 
                detailedStats.reduce((sum, v) => sum + v.totalExpenses, 0) / vehicles.length : 0,
            detailedStats
        };
    }

    // Métodos para reporte ejecutivo
    calculateKPIs(vehicles, failures, expenses, budgets) {
        const totalBudget = this.calculateTotalBudget(budgets);
        const totalExecuted = this.calculateTotalExecuted(expenses);
        
        return {
            failureRate: vehicles.length > 0 ? (failures.length / vehicles.length) * 100 : 0,
            maintenanceEfficiency: failures.length > 0 ? 
                (failures.filter(f => f.estado === 'Resuelta').length / failures.length) * 100 : 0,
            budgetUtilization: totalBudget > 0 ? (totalExecuted / totalBudget) * 100 : 0,
            costPerVehicle: vehicles.length > 0 ? totalExecuted / vehicles.length : 0
        };
    }

    generateInsights(kpis) {
        const insights = [];

        if (kpis.failureRate > 15) {
            insights.push({
                type: 'warning',
                icon: 'exclamation-triangle',
                title: 'Alta Tasa de Fallas',
                message: 'La tasa de fallas supera el 15%. Considere revisar el programa de mantenimiento preventivo.'
            });
        }

        if (kpis.maintenanceEfficiency < 80) {
            insights.push({
                type: 'danger',
                icon: 'wrench',
                title: 'Baja Eficiencia de Mantenimiento',
                message: 'Menos del 80% de las fallas están siendo resueltas. Revise los procesos de mantenimiento.'
            });
        }

        if (kpis.budgetUtilization > 90) {
            insights.push({
                type: 'warning',
                icon: 'money-bill-wave',
                title: 'Alta Utilización de Presupuesto',
                message: 'El presupuesto está siendo utilizado en más del 90%. Considere ajustar el presupuesto o reducir gastos.'
            });
        }

        if (insights.length === 0) {
            insights.push({
                type: 'success',
                icon: 'check-circle',
                title: 'Operación Normal',
                message: 'Todos los indicadores se encuentran dentro de los parámetros esperados.'
            });
        }

        return insights;
    }

    getExpenseTypeClass(type) {
        const classes = {
            'Mantenimiento Correctivo': 'corrective',
            'Combustible': 'fuel',
            'Mantenimiento Preventivo': 'preventive',
            'Documentación/Seguros': 'documentation',
            'Peajes/Viáticos': 'tolls',
            'Lavado y Limpieza': 'cleaning',
            'Repuestos': 'parts',
            'Otros': 'other'
        };
        return classes[type] || 'other';
    }

    getExpenseTypeIcon(type) {
        const icons = {
            'Mantenimiento Correctivo': 'wrench',
            'Combustible': 'gas-pump',
            'Mantenimiento Preventivo': 'tools',
            'Documentación/Seguros': 'file-contract',
            'Peajes/Viáticos': 'road',
            'Lavado y Limpieza': 'soap',
            'Repuestos': 'cog',
            'Otros': 'receipt'
        };
        return icons[type] || 'receipt';
    }

    getResolutionRateClass(rate) {
        if (rate >= 90) return 'success';
        if (rate >= 70) return 'warning';
        return 'danger';
    }

    getAveragePriorityClass(priority) {
        return priority.toLowerCase();
    }

    getMaintenanceStatus(vehicle) {
        if (vehicle.activeFailures > 0) return 'danger';
        if (vehicle.totalFailures > 5) return 'warning';
        return 'success';
    }

    getMaintenanceStatusText(vehicle) {
        if (vehicle.activeFailures > 0) return 'Con Fallas';
        if (vehicle.totalFailures > 5) return 'Alto Uso';
        return 'Óptimo';
    }

    getVehicleStatus(vehicle) {
        if (vehicle.activeFailures > 0) return 'danger';
        if (vehicle.totalExpenses > 10000) return 'warning';
        return 'success';
    }

    getVehicleStatusText(vehicle) {
        if (vehicle.activeFailures > 0) return 'Con Fallas';
        if (vehicle.totalExpenses > 10000) return 'Alto Costo';
        return 'Operativo';
    }
}

// Funciones globales
function generateComprehensiveReport() {
    if (window.reportsSystem) {
        window.reportsSystem.showReport('executive');
    }
}

function showReport(reportType) {
    if (window.reportsSystem) {
        window.reportsSystem.showReport(reportType);
    }
}

// Inicializar sistema de reportes
window.reportsSystem = new ReportsSystem();
