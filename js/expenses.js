// Sistema de Gestión de Gastos
class ExpensesSystem {
    constructor() {
        this.expenses = this.loadExpensesFromStorage();
        this.expenseTypes = [
            'Mantenimiento Correctivo',
            'Combustible',
            'Mantenimiento Preventivo',
            'Documentación/Seguros',
            'Peajes/Viáticos'
        ];
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const typeFilter = document.getElementById('expenseTypeFilter');
        const monthFilter = document.getElementById('expenseMonthFilter');

        if (typeFilter) {
            typeFilter.addEventListener('change', () => this.filterExpenses());
        }

        if (monthFilter) {
            monthFilter.addEventListener('change', () => this.filterExpenses());
        }
    }

    loadExpensesFromStorage() {
        const storedExpenses = localStorage.getItem('flota_expenses');
        if (storedExpenses) {
            return JSON.parse(storedExpenses);
        } else {
            // Datos de ejemplo
            return [
                {
                    id: 1,
                    fecha: '2024-01-10',
                    tipo: 'Combustible',
                    monto: 350,
                    placa: 'ABC-123',
                    regional: 'Norte',
                    proveedor: 'Estación Shell',
                    comprobante: null
                }
            ];
        }
    }

    saveExpensesToStorage() {
        localStorage.setItem('flota_expenses', JSON.stringify(this.expenses));
    }

    loadExpenses() {
        this.renderExpensesTable(this.expenses);
    }

    filterExpenses() {
        const typeFilter = document.getElementById('expenseTypeFilter').value;
        const monthFilter = document.getElementById('expenseMonthFilter').value;

        let filteredExpenses = this.expenses;

        if (typeFilter) {
            filteredExpenses = filteredExpenses.filter(expense => expense.tipo === typeFilter);
        }

        if (monthFilter) {
            filteredExpenses = filteredExpenses.filter(expense => 
                expense.fecha.startsWith(monthFilter)
            );
        }

        this.renderExpensesTable(filteredExpenses);
    }

    renderExpensesTable(expenses) {
        const tableBody = document.getElementById('expensesTableBody');
        if (!tableBody) return;

        if (expenses.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>No hay gastos registrados</p>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = expenses.map(expense => `
            <tr>
                <td>${new Date(expense.fecha).toLocaleDateString()}</td>
                <td>${expense.tipo}</td>
                <td>$${expense.monto.toLocaleString()}</td>
                <td>${expense.placa}</td>
                <td>${expense.regional}</td>
                <td>${expense.proveedor}</td>
                <td>
                    ${expense.comprobante ? 
                        '<i class="fas fa-paperclip text-success" title="Comprobante adjunto"></i>' : 
                        '<i class="fas fa-times text-danger" title="Sin comprobante"></i>'
                    }
                </td>
                <td>
                    <button class="btn-action btn-edit" onclick="expensesSystem.viewExpense(${expense.id})" title="Ver Detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="expensesSystem.deleteExpense(${expense.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    showExpenseForm() {
        const vehicles = window.vehiclesSystem ? window.vehiclesSystem.vehicles : [];
        
        const formContent = `
            <form id="expenseForm" onsubmit="expensesSystem.handleExpenseSubmit(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label for="expenseFecha">Fecha *</label>
                        <input type="date" id="expenseFecha" required>
                    </div>
                    <div class="form-group">
                        <label for="expenseTipo">Tipo de Gasto *</label>
                        <select id="expenseTipo" required>
                            <option value="">Seleccionar tipo</option>
                            ${this.expenseTypes.map(type => `
                                <option value="${type}">${type}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="expenseMonto">Monto *</label>
                        <input type="number" id="expenseMonto" step="0.01" required>
                    </div>
                    <div class="form-group">
                        <label for="expensePlaca">Vehículo *</label>
                        <select id="expensePlaca" required>
                            <option value="">Seleccionar vehículo</option>
                            ${vehicles.map(vehicle => `
                                <option value="${vehicle.placa}">${vehicle.placa}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="expenseRegional">Regional *</label>
                        <select id="expenseRegional" required>
                            <option value="Norte">Norte</option>
                            <option value="Sur">Sur</option>
                            <option value="Centro">Centro</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="expenseProveedor">Proveedor *</label>
                        <input type="text" id="expenseProveedor" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="expenseComprobante">Comprobante (PDF/Imagen)</label>
                    <input type="file" id="expenseComprobante" accept=".pdf,.jpg,.jpeg,.png">
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">Registrar Gasto</button>
                </div>
            </form>
        `;

        showModal('Registrar Nuevo Gasto', formContent);
        
        // Establecer fecha actual por defecto
        document.getElementById('expenseFecha').value = new Date().toISOString().split('T')[0];
    }

    handleExpenseSubmit(event) {
        event.preventDefault();
        
        const formData = {
            id: Date.now(),
            fecha: document.getElementById('expenseFecha').value,
            tipo: document.getElementById('expenseTipo').value,
            monto: parseFloat(document.getElementById('expenseMonto').value),
            placa: document.getElementById('expensePlaca').value,
            regional: document.getElementById('expenseRegional').value,
            proveedor: document.getElementById('expenseProveedor').value,
            comprobante: null // En una implementación real, aquí se manejaría el archivo
        };

        this.expenses.push(formData);
        this.saveExpensesToStorage();
        this.loadExpenses();
        closeModal();
        
        alert('Gasto registrado exitosamente');
    }

    viewExpense(expenseId) {
        const expense = this.expenses.find(e => e.id === expenseId);
        if (!expense) return;

        const content = `
            <div class="expense-details">
                <h4>Detalles del Gasto</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Fecha:</label>
                        <p>${new Date(expense.fecha).toLocaleDateString()}</p>
                    </div>
                    <div class="form-group">
                        <label>Tipo:</label>
                        <p>${expense.tipo}</p>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Monto:</label>
                        <p>$${expense.monto.toLocaleString()}</p>
                    </div>
                    <div class="form-group">
                        <label>Vehículo:</label>
                        <p>${expense.placa}</p>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Regional:</label>
                        <p>${expense.regional}</p>
                    </div>
                    <div class="form-group">
                        <label>Proveedor:</label>
                        <p>${expense.proveedor}</p>
                    </div>
                </div>
                <div class="form-group">
                    <label>Comprobante:</label>
                    <p>${expense.comprobante ? 'Adjunto' : 'No adjunto'}</p>
                </div>
            </div>
        `;

        showModal('Detalles del Gasto', content);
    }

    deleteExpense(expenseId) {
        if (confirm('¿Estás seguro de que quieres eliminar este gasto?')) {
            this.expenses = this.expenses.filter(expense => expense.id !== expenseId);
            this.saveExpensesToStorage();
            this.loadExpenses();
            alert('Gasto eliminado exitosamente');
        }
    }
}

// Inicializar sistema de gastos
window.expensesSystem = new ExpensesSystem();