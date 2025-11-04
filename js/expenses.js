// Sistema de Gestión de Gastos - ACTUALIZADO
class ExpensesSystem {
    constructor() {
        this.expenses = [];
        this.expenseTypes = [
            'Mantenimiento Correctivo',
            'Combustible',
            'Mantenimiento Preventivo',
            'Documentación/Seguros',
            'Peajes/Viáticos'
        ];
        this.init();
    }

    async init() {
        await this.loadExpenses();
        this.setupEventListeners();
    }

    async loadExpenses() {
        try {
            this.expenses = await database.getExpenses();
            this.renderExpensesTable();
        } catch (error) {
            console.error('Error cargando gastos:', error);
            this.showError('Error al cargar los gastos');
        }
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

    renderExpensesTable(expenses = this.expenses) {
        const tableBody = document.getElementById('expensesTableBody');
        if (!tableBody) return;

        if (expenses.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>No hay gastos registrados</p>
                        <button class="btn-primary" onclick="showExpenseForm()">
                            <i class="fas fa-plus"></i> Registrar Primer Gasto
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = expenses.map(expense => `
            <tr>
                <td>${new Date(expense.fecha).toLocaleDateString()}</td>
                <td><span class="status-badge">${expense.tipo}</span></td>
                <td><strong>$${expense.monto.toLocaleString()}</strong></td>
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
                    <button class="btn-action btn-edit" onclick="expensesSystem.editExpense(${expense.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="expensesSystem.deleteExpense(${expense.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    filterExpenses() {
        const typeFilter = document.getElementById('expenseTypeFilter');
        const monthFilter = document.getElementById('expenseMonthFilter');

        let filteredExpenses = this.expenses;

        if (typeFilter && typeFilter.value) {
            filteredExpenses = filteredExpenses.filter(expense => expense.tipo === typeFilter.value);
        }

        if (monthFilter && monthFilter.value) {
            filteredExpenses = filteredExpenses.filter(expense => 
                expense.fecha.startsWith(monthFilter.value)
            );
        }

        this.renderExpensesTable(filteredExpenses);
    }

    async showExpenseForm(expenseId = null) {
        const expense = expenseId ? this.expenses.find(e => e.id === expenseId) : null;
        const vehicles = await database.getVehicles();
        
        if (vehicles.length === 0) {
            alert('❌ Primero debe registrar al menos un vehículo');
            return;
        }

        const formContent = `
            <form id="expenseForm" onsubmit="expensesSystem.handleExpenseSubmit(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label for="expenseFecha">Fecha *</label>
                        <input type="date" id="expenseFecha" 
                               value="${expense ? expense.fecha : new Date().toISOString().split('T')[0]}" required>
                    </div>
                    <div class="form-group">
                        <label for="expenseTipo">Tipo de Gasto *</label>
                        <select id="expenseTipo" required>
                            <option value="">Seleccionar tipo</option>
                            ${this.expenseTypes.map(type => `
                                <option value="${type}" ${expense && expense.tipo === type ? 'selected' : ''}>
                                    ${type}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="expenseMonto">Monto *</label>
                        <input type="number" id="expenseMonto" step="0.01" 
                               value="${expense ? expense.monto : ''}" required 
                               placeholder="0.00">
                    </div>
                    <div class="form-group">
                        <label for="expensePlaca">Vehículo *</label>
                        <select id="expensePlaca" required>
                            <option value="">Seleccionar vehículo</option>
                            ${vehicles.map(vehicle => `
                                <option value="${vehicle.placa}" data-id="${vehicle.id}" 
                                        ${expense && expense.placa === vehicle.placa ? 'selected' : ''}>
                                    ${vehicle.placa} - ${vehicle.marca} ${vehicle.modelo}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="expenseRegional">Regional *</label>
                        <select id="expenseRegional" required>
                            <option value="Norte" ${expense && expense.regional === 'Norte' ? 'selected' : ''}>Norte</option>
                            <option value="Sur" ${expense && expense.regional === 'Sur' ? 'selected' : ''}>Sur</option>
                            <option value="Centro" ${expense && expense.regional === 'Centro' ? 'selected' : ''}>Centro</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="expenseProveedor">Proveedor *</label>
                        <input type="text" id="expenseProveedor" 
                               value="${expense ? expense.proveedor : ''}" required 
                               placeholder="Nombre del proveedor">
                    </div>
                </div>
                <div class="form-group">
                    <label for="expenseComprobante">Comprobante (PDF/Imagen)</label>
                    <input type="file" id="expenseComprobante" accept=".pdf,.jpg,.jpeg,.png"
                           onchange="expensesSystem.handleFileSelect(event)">
                    <small class="file-info" id="fileInfo"></small>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i> ${expense ? 'Actualizar' : 'Guardar'} Gasto
                    </button>
                </div>
                <input type="hidden" id="expenseId" value="${expense ? expense.id : ''}">
            </form>
        `;

        showModal(expense ? 'Editar Gasto' : 'Nuevo Gasto', formContent);
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        const fileInfo = document.getElementById('fileInfo');
        
        if (file) {
            fileInfo.textContent = `Archivo seleccionado: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`;
            fileInfo.className = 'file-info text-success';
        } else {
            fileInfo.textContent = 'No se seleccionó ningún archivo';
            fileInfo.className = 'file-info text-danger';
        }
    }

    async handleExpenseSubmit(event) {
        event.preventDefault();
        
        const placaSelect = document.getElementById('expensePlaca');
        const selectedOption = placaSelect.options[placaSelect.selectedIndex];
        
        const formData = {
            vehicleId: parseInt(selectedOption.getAttribute('data-id')),
            placa: placaSelect.value,
            tipo: document.getElementById('expenseTipo').value,
            monto: parseFloat(document.getElementById('expenseMonto').value),
            fecha: document.getElementById('expenseFecha').value,
            regional: document.getElementById('expenseRegional').value,
            proveedor: document.getElementById('expenseProveedor').value,
            comprobante: null // En una implementación real, procesarías el archivo aquí
        };

        try {
            const expenseId = document.getElementById('expenseId').value;
            
            if (expenseId) {
                // Actualizar gasto existente
                await database.updateExpense(parseInt(expenseId), formData);
                this.showSuccess('Gasto actualizado exitosamente');
            } else {
                // Nuevo gasto
                await database.createExpense(formData);
                this.showSuccess('Gasto registrado exitosamente');
            }

            await this.loadExpenses();
            closeModal();
            
        } catch (error) {
            console.error('Error guardando gasto:', error);
            this.showError('Error al guardar el gasto: ' + error.message);
        }
    }

    async editExpense(expenseId) {
        await this.showExpenseForm(expenseId);
    }

    async deleteExpense(expenseId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este gasto? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await database.deleteExpense(expenseId);
            await this.loadExpenses();
            this.showSuccess('Gasto eliminado exitosamente');
        } catch (error) {
            console.error('Error eliminando gasto:', error);
            this.showError('Error al eliminar el gasto');
        }
    }

    showSuccess(message) {
        alert('✅ ' + message);
    }

    showError(message) {
        alert('❌ ' + message);
    }
}

// Funciones globales
function showExpenseForm() {
    window.expensesSystem.showExpenseForm();
}

// Inicializar sistema de gastos
window.expensesSystem = new ExpensesSystem();
