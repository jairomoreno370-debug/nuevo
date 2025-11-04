// Sistema de Reportes y Análisis
class ReportsSystem {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Event listeners para reportes
    }

    loadReports() {
        // Cargar datos para los reportes
        this.updateReportCharts();
    }

    updateReportCharts() {
        // Actualizar gráficos específicos de reportes
    }

    showReport(reportType) {
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
        }

        const reportContainer = document.getElementById('reportContent');
        if (reportContainer) {
            reportContainer.innerHTML = `
                <div class="report-header">
                    <h3>${reportTitle}</h3>
                    <button class="btn-secondary" onclick="reportsSystem.exportReport('${reportType}')">
                        <i class="fas fa-download"></i> Exportar PDF
                    </button>
                </div>
                ${reportContent}
            `;
        }
    }

    generateBudgetReport() {
        return `
            <div class="report-section">
                <h4>Presupuesto por Regional - ${new Date().toLocaleDateString()}</h4>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Regional</th>
                                <th>Presupuesto Mensual</th>
                                <th>Ejecutado</th>
                                <th>Diferencia</th>
                                <th>% Ejecutado</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Norte</td>
                                <td>$12,000</td>
                                <td>$11,500</td>
                                <td class="text-success">-$500</td>
                                <td>96%</td>
                            </tr>
                            <tr>
                                <td>Sur</td>
                                <td>$10,000</td>
                                <td>$12,500</td>
                                <td class="text-danger">+$2,500</td>
                                <td>125%</td>
                            </tr>
                            <tr>
                                <td>Centro</td>
                                <td>$15,000</td>
                                <td>$13,000</td>
                                <td class="text-success">-$2,000</td>
                                <td>87%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    generateFailuresReport() {
        const maintenanceSystem = window.maintenanceSystem;
        if (!maintenanceSystem) return '<p>No hay datos de fallas disponibles</p>';

        const failuresByComponent = this.groupFailuresByComponent();
        const failuresByMonth = this.groupFailuresByMonth();

        return `
            <div class="report-section">
                <h4>Fallas por Componente</h4>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Componente</th>
                                <th>Total Fallas</th>
                                <th>Fallas Abiertas</th>
                                <th>Fallas Resueltas</th>
                                <th>Tasa de Resolución</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(failuresByComponent).map(([component, data]) => `
                                <tr>
                                    <td>${component}</td>
                                    <td>${data.total}</td>
                                    <td>${data.abiertas}</td>
                                    <td>${data.resueltas}</td>
                                    <td>${data.total > 0 ? Math.round((data.resueltas / data.total) * 100) : 0}%</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="report-section">
                <h4>Evolución Mensual de Fallas</h4>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Mes</th>
                                <th>Total Fallas</th>
                                <th>Fallas Nuevas</th>
                                <th>Fallas Resueltas</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(failuresByMonth).map(([month, data]) => `
                                <tr>
                                    <td>${month}</td>
                                    <td>${data.total}</td>
                                    <td>${data.nuevas}</td>
                                    <td>${data.resueltas}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    groupFailuresByComponent() {
        const maintenanceSystem = window.maintenanceSystem;
        if (!maintenanceSystem) return {};

        const grouped = {};
        maintenanceSystem.failures.forEach(failure => {
            if (!grouped[failure.componente]) {
                grouped[failure.componente] = {
                    total: 0,
                    abiertas: 0,
                    resueltas: 0
                };
            }

            grouped[failure.componente].total++;
            if (failure.estado === 'Abierta') {
                grouped[failure.componente].abiertas++;
            } else if (failure.estado === 'Resuelta') {
                grouped[failure.componente].resueltas++;
            }
        });

        return grouped;
    }

    groupFailuresByMonth() {
        // Implementar agrupación por mes
        return {
            'Enero 2024': { total: 12, nuevas: 8, resueltas: 10 },
            'Febrero 2024': { total: 15, nuevas: 10, resueltas: 12 },
            'Marzo 2024': { total: 8, nuevas: 5, resueltas: 7 }
        };
    }

    generateExpensesReport() {
        const expensesSystem = window.expensesSystem;
        if (!expensesSystem) return '<p>No hay datos de gastos disponibles</p>';

        const expensesByType = this.groupExpensesByType();
        const expensesByVehicle = this.groupExpensesByVehicle();

        return `
            <div class="report-section">
                <h4>Gastos por Tipo</h4>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Tipo de Gasto</th>
                                <th>Total Gastado</th>
                                <th>% del Total</th>
                                <th>Número de Transacciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(expensesByType).map(([type, data]) => `
                                <tr>
                                    <td>${type}</td>
                                    <td>$${data.total.toLocaleString()}</td>
                                    <td>${data.percentage}%</td>
                                    <td>${data.count}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="report-section">
                <h4>Gastos por Vehículo</h4>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>Vehículo</th>
                                <th>Total Gastado</th>
                                <th>Mantenimiento</th>
                                <th>Combustible</th>
                                <th>Otros</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(expensesByVehicle).map(([placa, data]) => `
                                <tr>
                                    <td>${placa}</td>
                                    <td>$${data.total.toLocaleString()}</td>
                                    <td>$${data.mantenimiento.toLocaleString()}</td>
                                    <td>$${data.combustible.toLocaleString()}</td>
                                    <td>$${data.otros.toLocaleString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    groupExpensesByType() {
        const expensesSystem = window.expensesSystem;
        if (!expensesSystem) return {};

        const total = expensesSystem.expenses.reduce((sum, expense) => sum + expense.monto, 0);
        const grouped = {};

        expensesSystem.expenses.forEach(expense => {
            if (!grouped[expense.tipo]) {
                grouped[expense.tipo] = {
                    total: 0,
                    count: 0
                };
            }

            grouped[expense.tipo].total += expense.monto;
            grouped[expense.tipo].count++;
        });

        // Calcular porcentajes
        Object.keys(grouped).forEach(type => {
            grouped[type].percentage = total > 0 ? Math.round((grouped[type].total / total) * 100) : 0;
        });

        return grouped;
    }

    groupExpensesByVehicle() {
        // Implementar agrupación por vehículo
        return {
            'ABC-123': { total: 8500, mantenimiento: 4500, combustible: 3000, otros: 1000 },
            'XYZ-789': { total: 6200, mantenimiento: 3500, combustible: 2000, otros: 700 }
        };
    }

    generateMaintenanceReport() {
        return `
            <div class="report-section">
                <h4>Resumen de Mantenimiento</h4>
                <div class="stats-grid">
                    <div class="stat-card">
                        <div class="stat-icon">
                            <i class="fas fa-tools"></i>
                        </div>
                        <div class="stat-info">
                            <h3>24</h3>
                            <p>Mantenimientos Realizados</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon warning">
                            <i class="fas fa-clock"></i>
                        </div>
                        <div class="stat-info">
                            <h3>8</h3>
                            <p>Mantenimientos Pendientes</p>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon success">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="stat-info">
                            <h3>85%</h3>
                            <p>Tasa de Completación</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    exportReport(reportType) {
        // En una implementación real, esto generaría un PDF
        alert(`Generando reporte ${reportType} en PDF...`);
        // Aquí iría la lógica para generar el PDF
    }

    generateComprehensiveReport() {
        const comprehensiveContent = `
            <div class="comprehensive-report">
                <div class="report-header">
                    <h2>Reporte Completo del Sistema</h2>
                    <p>Generado el: ${new Date().toLocaleDateString()}</p>
                </div>
                ${this.generateBudgetReport()}
                ${this.generateFailuresReport()}
                ${this.generateExpensesReport()}
                ${this.generateMaintenanceReport()}
            </div>
        `;

        const reportContainer = document.getElementById('reportContent');
        if (reportContainer) {
            reportContainer.innerHTML = comprehensiveContent;
        }
    }
}

// Funciones globales para reportes
function generateQuickReport() {
    alert('Generando reporte rápido...');
    // Implementación de reporte rápido
}

function generateComprehensiveReport() {
    window.reportsSystem.generateComprehensiveReport();
}

// Inicializar sistema de reportes
window.reportsSystem = new ReportsSystem();