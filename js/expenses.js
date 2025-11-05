// Sistema de Gestión de Gastos - OPTIMIZADO Y COMPLETADO
class ExpensesSystem {
    constructor() {
        this.expenses = [];
        this.filteredExpenses = [];
        this.expenseTypes = [
            'Mantenimiento Correctivo',
            'Combustible',
            'Mantenimiento Preventivo',
            'Documentación/Seguros',
            'Peajes/Viáticos',
            'Lavado y Limpieza',
            'Repuestos',
            'Otros'
        ];
        this.regionalList = ['Norte', 'Sur', 'Centro'];
        this.currentFilters = {
            type: '',
            month: '',
            search: ''
        };
        this.init();
    }

    async init() {
        try {
            await this.loadExpenses();
            this.setupEventListeners();
            this.setupGlobalHandlers();
            console.log('✅ Sistema de gastos inicializado');
        } catch (error) {
            console.error('❌ Error inicializando sistema de gastos:', error);
            this.showError('Error al inicializar el sistema de gastos');
        }
    }

    async loadExpenses() {
        try {
            this.showLoading('Cargando gastos...');
            
            this.expenses = await database.getExpenses();
            this.filteredExpenses = [...this.expenses];
            
            this.renderExpensesTable();
            this.updateExpenseStats();
            this.updateBudgetAlerts();
            this.hideLoading();
            
        } catch (error) {
            console.error('Error cargando gastos:', error);
            this.showError('Error al cargar los gastos: ' + error.message);
            this.hideLoading();
        }
    }

    setupEventListeners() {
        // Filtros
        const typeFilter = document.getElementById('expenseTypeFilter');
        const monthFilter = document.getElementById('expenseMonthFilter');

        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.currentFilters.type = e.target.value;
                this.applyFilters();
            });
        }

        if (monthFilter) {
            monthFilter.addEventListener('change', (e) => {
                this.currentFilters.month = e.target.value;
                this.applyFilters();
            });
        }

        // Búsqueda
        const searchInput = document.getElementById('expenseSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.currentFilters.search = e.target.value;
                this.applyFilters();
            }, 300));
            
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.applyFilters();
                }
            });
        }

        // Configurar fecha del filtro de mes al mes actual
        this.setDefaultMonthFilter();
    }

    setupGlobalHandlers() {
        // Auto-refresh cada minuto cuando el módulo está activo
        setInterval(() => {
            if (document.getElementById('expenses')?.classList.contains('active') && 
                !document.hidden) {
                this.refreshData();
            }
        }, 60000);

        // Shortcuts de teclado
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'n' && document.getElementById('expenses')?.classList.contains('active')) {
                e.preventDefault();
                showExpenseForm();
            }
            
            if (e.ctrlKey && e.key === 'e' && document.getElementById('expenses')?.classList.contains('active')) {
                e.preventDefault();
                this.exportExpensesData();
            }
        });
    }

    setDefaultMonthFilter() {
        const monthFilter = document.getElementById('expenseMonthFilter');
        if (monthFilter && !monthFilter.value) {
            const now = new Date();
            monthFilter.value = now.toISOString().slice(0, 7);
            this.currentFilters.month = monthFilter.value;
        }
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    applyFilters() {
        let filtered = [...this.expenses];

        // Filtro por tipo
        if (this.currentFilters.type) {
            filtered = filtered.filter(expense => expense.tipo === this.currentFilters.type);
        }

        // Filtro por mes
        if (this.currentFilters.month) {
            filtered = filtered.filter(expense => 
                expense.fecha.startsWith(this.currentFilters.month)
            );
        }

        // Filtro por búsqueda
        if (this.currentFilters.search) {
            const term = this.currentFilters.search.toLowerCase();
            filtered = filtered.filter(expense =>
                expense.placa.toLowerCase().includes(term) ||
                expense.proveedor.toLowerCase().includes(term) ||
                expense.tipo.toLowerCase().includes(term) ||
                expense.regional.toLowerCase().includes(term) ||
                (expense.notas && expense.notas.toLowerCase().includes(term))
            );
        }

        this.filteredExpenses = filtered;
        this.renderExpensesTable();
        this.updateExpenseStats();
    }

    renderExpensesTable(expenses = this.filteredExpenses) {
        const tableBody = document.getElementById('expensesTableBody');
        if (!tableBody) return;

        if (expenses.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-receipt"></i>
                        <p>No hay gastos registrados</p>
                        <button class="btn-primary" onclick="showExpenseForm()" ${!this.hasPermission('operator') ? 'disabled' : ''}>
                            <i class="fas fa-plus"></i> Registrar Primer Gasto
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        // Calcular totales
        const total = expenses.reduce((sum, expense) => sum + expense.monto, 0);
        const average = expenses.length > 0 ? total / expenses.length : 0;

        tableBody.innerHTML = expenses.map(expense => `
            <tr data-expense-id="${expense.id}">
                <td>
                    <div class="date-display">
                        <div class="date">${new Date(expense.fecha).toLocaleDateString()}</div>
                        <div class="day">${new Date(expense.fecha).toLocaleDateString('es-ES', { weekday: 'short' })}</div>
                    </div>
                </td>
                <td>
                    <span class="expense-type type-${this.getExpenseTypeClass(expense.tipo)}">
                        <i class="fas fa-${this.getExpenseTypeIcon(expense.tipo)}"></i>
                        ${this.escapeHtml(expense.tipo)}
                    </span>
                </td>
                <td>
                    <strong class="amount ${this.getAmountColorClass(expense.monto)}">
                        ${this.formatCurrency(expense.monto)}
                    </strong>
                </td>
                <td>
                    <div class="vehicle-info">
                        <strong>${this.escapeHtml(expense.placa)}</strong>
                        <small>${this.getVehicleInfo(expense.vehicleId)}</small>
                    </div>
                </td>
                <td>
                    <span class="status-badge regional-${expense.regional.toLowerCase()}">
                        ${expense.regional}
                    </span>
                </td>
                <td class="proveedor">
                    <div class="proveedor-info">
                        <span>${this.escapeHtml(expense.proveedor)}</span>
                        ${expense.notas ? `<small class="proveedor-notas">${this.escapeHtml(expense.notas)}</small>` : ''}
                    </div>
                </td>
                <td>
                    ${expense.comprobante ? 
                        `<button class="btn-action btn-success" onclick="expensesSystem.viewReceipt(${expense.id})" title="Ver comprobante">
                            <i class="fas fa-paperclip"></i>
                        </button>` : 
                        `<span class="no-receipt" title="Sin comprobante">
                            <i class="fas fa-times-circle"></i>
                        </span>`
                    }
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" 
                                onclick="expensesSystem.editExpense(${expense.id})" 
                                title="Editar gasto"
                                ${!this.hasPermission('operator') ? 'disabled' : ''}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-info" 
                                onclick="expensesSystem.viewExpenseDetails(${expense.id})" 
                                title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${this.hasPermission('admin') ? `
                        <button class="btn-action btn-delete" 
                                onclick="expensesSystem.deleteExpense(${expense.id})" 
                                title="Eliminar gasto">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('') + `
            <tr class="summary-row">
                <td colspan="2"><strong>Resumen:</strong></td>
                <td><strong class="total-amount">${this.formatCurrency(total)}</strong></td>
                <td><small>${expenses.length} gastos</small></td>
                <td><small>Promedio: ${this.formatCurrency(average)}</small></td>
                <td colspan="3"></td>
            </tr>
        `;

        // Actualizar contador de resultados
        this.updateResultsCounter(expenses.length);
    }

    getAmountColorClass(amount) {
        if (amount > 1000) return 'amount-high';
        if (amount > 500) return 'amount-medium';
        return 'amount-low';
    }

    updateResultsCounter(count) {
        const counter = document.getElementById('expensesResultsCounter') || this.createResultsCounter();
        
        const total = this.expenses.length;
        const filtered = count;
        
        if (filtered === total) {
            counter.textContent = `Mostrando todos los ${total} gastos`;
        } else {
            counter.textContent = `Mostrando ${filtered} de ${total} gastos`;
            
            // Mostrar filtros activos
            const activeFilters = [];
            if (this.currentFilters.type) activeFilters.push(`tipo: ${this.currentFilters.type}`);
            if (this.currentFilters.month) activeFilters.push(`mes: ${this.currentFilters.month}`);
            if (this.currentFilters.search) activeFilters.push(`búsqueda: "${this.currentFilters.search}"`);
            
            if (activeFilters.length > 0) {
                counter.innerHTML += `<br><small>Filtros: ${activeFilters.join(', ')}</small>`;
            }
        }
    }

    createResultsCounter() {
        const counter = document.createElement('div');
        counter.id = 'expensesResultsCounter';
        counter.className = 'results-counter';
        
        const filters = document.querySelector('.filters');
        if (filters) {
            filters.appendChild(counter);
        }
        
        return counter;
    }

    updateExpenseStats() {
        const stats = {
            total: this.filteredExpenses.reduce((sum, expense) => sum + expense.monto, 0),
            count: this.filteredExpenses.length,
            byType: {},
            byRegional: {},
            byMonth: {},
            average: 0
        };

        this.filteredExpenses.forEach(expense => {
            // Estadísticas por tipo
            stats.byType[expense.tipo] = (stats.byType[expense.tipo] || 0) + expense.monto;
            
            // Estadísticas por regional
            stats.byRegional[expense.regional] = (stats.byRegional[expense.regional] || 0) + expense.monto;
            
            // Estadísticas por mes
            const month = expense.fecha.slice(0, 7);
            stats.byMonth[month] = (stats.byMonth[month] || 0) + expense.monto;
        });

        stats.average = stats.count > 0 ? stats.total / stats.count : 0;

        // Actualizar UI de estadísticas
        this.updateStatsDisplay(stats);
        
        console.log('Estadísticas de gastos:', stats);
    }

    updateStatsDisplay(stats) {
        const statsElement = document.getElementById('expenseStats');
        if (!statsElement) return;

        statsElement.innerHTML = `
            <div class="expense-stats-grid">
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${this.formatCurrency(stats.total)}</h3>
                        <p>Total Gastos</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-receipt"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${stats.count}</h3>
                        <p>Cantidad</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">
                        <i class="fas fa-calculator"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${this.formatCurrency(stats.average)}</h3>
                        <p>Promedio</p>
                    </div>
                </div>
            </div>
        `;
    }

    async updateBudgetAlerts() {
        try {
            const currentMonth = new Date().toISOString().slice(0, 7);
            const monthlyExpenses = this.expenses
                .filter(expense => expense.fecha.startsWith(currentMonth))
                .reduce((sum, expense) => sum + expense.monto, 0);

            // Obtener presupuesto del mes actual
            const budgets = await database.getBudgets();
            const currentBudget = budgets.find(budget => 
                budget.mes === currentMonth
            );

            if (currentBudget) {
                const budgetUsage = (monthlyExpenses / currentBudget.presupuesto) * 100;
                
                if (budgetUsage > 90) {
                    this.showWarning(`Alerta: Se ha utilizado el ${budgetUsage.toFixed(1)}% del presupuesto mensual`);
                }
            }
        } catch (error) {
            console.error('Error verificando presupuesto:', error);
        }
    }

    getExpenseTypeClass(tipo) {
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
        return classes[tipo] || 'other';
    }

    getExpenseTypeIcon(tipo) {
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
        return icons[tipo] || 'receipt';
    }

    async getVehicleInfo(vehicleId) {
        try {
            const vehicle = await database.getVehicleById(vehicleId);
            return vehicle ? `${this.escapeHtml(vehicle.marca)} ${this.escapeHtml(vehicle.modelo)}` : 'N/A';
        } catch (error) {
            return 'N/A';
        }
    }

    async showExpenseForm(expenseId = null) {
        if (!this.hasPermission('operator')) {
            this.showError('No tiene permisos para registrar gastos');
            return;
        }

        const expense = expenseId ? this.expenses.find(e => e.id === expenseId) : null;
        const vehicles = await database.getVehicles();
        
        if (vehicles.length === 0) {
            this.showError('Primero debe registrar al menos un vehículo');
            return;
        }

        const formContent = `
            <form id="expenseForm" onsubmit="expensesSystem.handleExpenseSubmit(event)">
                <div class="form-section">
                    <h4><i class="fas fa-money-bill-wave"></i> Información del Gasto</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expenseFecha">
                                <i class="fas fa-calendar-alt"></i> Fecha *
                            </label>
                            <input type="date" id="expenseFecha" 
                                   value="${expense ? expense.fecha : new Date().toISOString().split('T')[0]}" 
                                   required>
                        </div>
                        <div class="form-group">
                            <label for="expenseTipo">
                                <i class="fas fa-tag"></i> Tipo de Gasto *
                            </label>
                            <select id="expenseTipo" required>
                                <option value="">Seleccionar tipo</option>
                                ${this.expenseTypes.map(type => `
                                    <option value="${type}" 
                                            ${expense && expense.tipo === type ? 'selected' : ''}
                                            data-icon="fa-${this.getExpenseTypeIcon(type)}">
                                        ${type}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4><i class="fas fa-calculator"></i> Monto y Vehículo</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expenseMonto">
                                <i class="fas fa-dollar-sign"></i> Monto *
                            </label>
                            <input type="number" id="expenseMonto" 
                                   step="0.01" 
                                   min="0.01"
                                   max="1000000"
                                   value="${expense ? expense.monto.toFixed(2) : ''}" 
                                   required 
                                   placeholder="0.00">
                            <small>Monto en dólares</small>
                        </div>
                        <div class="form-group">
                            <label for="expensePlaca">
                                <i class="fas fa-car"></i> Vehículo *
                            </label>
                            <select id="expensePlaca" required>
                                <option value="">Seleccionar vehículo</option>
                                ${vehicles.map(vehicle => `
                                    <option value="${vehicle.placa}" 
                                            data-id="${vehicle.id}"
                                            data-regional="${vehicle.regional}"
                                            ${expense && expense.placa === vehicle.placa ? 'selected' : ''}>
                                        ${vehicle.placa} - ${this.escapeHtml(vehicle.marca)} ${this.escapeHtml(vehicle.modelo)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4><i class="fas fa-building"></i> Proveedor y Ubicación</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="expenseProveedor">
                                <i class="fas fa-store"></i> Proveedor *
                            </label>
                            <input type="text" id="expenseProveedor" 
                                   value="${expense ? this.escapeHtml(expense.proveedor) : ''}" 
                                   required 
                                   placeholder="Nombre del proveedor o establecimiento">
                        </div>
                        <div class="form-group">
                            <label for="expenseRegional">
                                <i class="fas fa-map-marker-alt"></i> Regional *
                            </label>
                            <select id="expenseRegional" required>
                                ${this.regionalList.map(regional => `
                                    <option value="${regional}" ${expense && expense.regional === regional ? 'selected' : ''}>
                                        ${regional}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4><i class="fas fa-paperclip"></i> Comprobante</h4>
                    <div class="form-group">
                        <label for="expenseComprobante">
                            <i class="fas fa-file-upload"></i> Adjuntar Comprobante
                        </label>
                        <div class="file-upload-area" id="fileUploadArea">
                            <div class="upload-placeholder">
                                <i class="fas fa-cloud-upload-alt"></i>
                                <p>Arrastra el comprobante aquí o haz clic para seleccionar</p>
                                <small>Formatos: PDF, JPG, PNG (Máx. 5MB)</small>
                            </div>
                            <input type="file" id="expenseComprobante" 
                                   accept=".pdf,.jpg,.jpeg,.png" 
                                   class="file-input">
                        </div>
                        <div class="file-info" id="fileInfo"></div>
                        ${expense && expense.comprobante ? `
                        <div class="existing-file">
                            <i class="fas fa-paperclip"></i>
                            <span>Comprobante adjunto previamente</span>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <div class="form-section">
                    <h4><i class="fas fa-sticky-note"></i> Notas Adicionales</h4>
                    <div class="form-group">
                        <label for="expenseNotas">
                            <i class="fas fa-edit"></i> Descripción Adicional
                        </label>
                        <textarea id="expenseNotas" rows="3" 
                                  placeholder="Información adicional sobre el gasto, observaciones, etc...">${expense && expense.notas ? this.escapeHtml(expense.notas) : ''}</textarea>
                        <small class="char-counter">
                            <span id="notesCharCount">${expense ? (expense.notas || '').length : 0}</span>/500 caracteres
                        </small>
                    </div>
                </div>

                <div class="expense-summary" id="expenseSummary">
                    <h5><i class="fas fa-chart-bar"></i> Resumen</h5>
                    <div class="summary-grid">
                        <div class="summary-item">
                            <span>Monto:</span>
                            <strong id="summaryAmount">$0.00</strong>
                        </div>
                        <div class="summary-item">
                            <span>Vehículo:</span>
                            <span id="summaryVehicle">-</span>
                        </div>
                        <div class="summary-item">
                            <span>Regional:</span>
                            <span id="summaryRegional">-</span>
                        </div>
                        <div class="summary-item">
                            <span>Tipo:</span>
                            <span id="summaryType">-</span>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i> ${expense ? 'Actualizar' : 'Guardar'} Gasto
                    </button>
                </div>
                <input type="hidden" id="expenseId" value="${expense ? expense.id : ''}">
            </form>
        `;

        showModal(expense ? 'Editar Gasto' : 'Nuevo Gasto', formContent);

        // Configurar eventos
        this.setupExpenseFormEvents();
        
        // Poner foco en el primer campo
        setTimeout(() => {
            const fechaInput = document.getElementById('expenseFecha');
            if (fechaInput) {
                fechaInput.focus();
            }
        }, 100);
    }

    setupExpenseFormEvents() {
        // Actualizar resumen en tiempo real
        const montoInput = document.getElementById('expenseMonto');
        const placaSelect = document.getElementById('expensePlaca');
        const regionalSelect = document.getElementById('expenseRegional');
        const tipoSelect = document.getElementById('expenseTipo');
        
        const updateSummary = () => {
            const monto = parseFloat(montoInput?.value) || 0;
            const selectedVehicle = placaSelect?.options[placaSelect.selectedIndex];
            const regional = regionalSelect?.value;
            const tipo = tipoSelect?.value;

            document.getElementById('summaryAmount').textContent = this.formatCurrency(monto);
            document.getElementById('summaryVehicle').textContent = selectedVehicle?.value || '-';
            document.getElementById('summaryRegional').textContent = regional || '-';
            document.getElementById('summaryType').textContent = tipo || '-';
        };

        [montoInput, placaSelect, regionalSelect, tipoSelect].forEach(input => {
            if (input) {
                input.addEventListener('input', updateSummary);
                input.addEventListener('change', updateSummary);
            }
        });

        // Auto-completar regional desde vehículo seleccionado
        if (placaSelect) {
            placaSelect.addEventListener('change', () => {
                const selectedOption = placaSelect.options[placaSelect.selectedIndex];
                const vehicleRegional = selectedOption?.getAttribute('data-regional');
                if (vehicleRegional && regionalSelect) {
                    regionalSelect.value = vehicleRegional;
                    updateSummary();
                }
            });
        }

        // Configurar upload de archivos
        this.setupFileUpload();

        // Configurar contador de caracteres para notas
        const notesTextarea = document.getElementById('expenseNotas');
        const notesCharCount = document.getElementById('notesCharCount');
        
        if (notesTextarea && notesCharCount) {
            notesTextarea.addEventListener('input', () => {
                notesCharCount.textContent = notesTextarea.value.length;
                if (notesTextarea.value.length > 500) {
                    notesCharCount.classList.add('text-danger');
                } else {
                    notesCharCount.classList.remove('text-danger');
                }
            });
        }

        // Actualizar resumen inicial
        updateSummary();
    }

    setupFileUpload() {
        const fileInput = document.getElementById('expenseComprobante');
        const fileUploadArea = document.getElementById('fileUploadArea');
        const fileInfo = document.getElementById('fileInfo');

        if (!fileInput || !fileUploadArea) return;

        // Click en el área de upload
        fileUploadArea.addEventListener('click', () => {
            fileInput.click();
        });

        // Prevenir comportamiento por defecto de drag
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });

        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });

        // Manejar drop de archivos
        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            
            if (e.dataTransfer.files.length > 0) {
                fileInput.files = e.dataTransfer.files;
                this.handleFileSelect(e.dataTransfer.files[0]);
            }
        });

        // Cambio de archivo por input
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
    }

    handleFileSelect(file) {
        const fileInfo = document.getElementById('fileInfo');
        const fileUploadArea = document.getElementById('fileUploadArea');
        
        if (!fileInfo || !fileUploadArea) return;

        // Validar tipo de archivo
        const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!validTypes.includes(file.type)) {
            this.showError('Tipo de archivo no válido. Use PDF, JPG o PNG.');
            return;
        }

        // Validar tamaño (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB en bytes
        if (file.size > maxSize) {
            this.showError('El archivo es demasiado grande. Máximo 5MB.');
            return;
        }

        // Mostrar información del archivo
        const fileSize = (file.size / 1024 / 1024).toFixed(2);
        fileInfo.innerHTML = `
            <div class="file-success">
                <i class="fas fa-check-circle"></i>
                <div class="file-details">
                    <strong>${this.escapeHtml(file.name)}</strong>
                    <span>${fileSize} MB</span>
                </div>
                <button type="button" class="btn-text" onclick="expensesSystem.clearFileSelection()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        fileUploadArea.classList.add('has-file');
    }

    clearFileSelection() {
        const fileInput = document.getElementById('expenseComprobante');
        const fileInfo = document.getElementById('fileInfo');
        const fileUploadArea = document.getElementById('fileUploadArea');

        if (fileInput) fileInput.value = '';
        if (fileInfo) fileInfo.innerHTML = '';
        if (fileUploadArea) fileUploadArea.classList.remove('has-file');
    }

    async handleExpenseSubmit(event) {
        event.preventDefault();
        
        if (!this.hasPermission('operator')) {
            this.showError('No tiene permisos para realizar esta acción');
            return;
        }

        const placaSelect = document.getElementById('expensePlaca');
        const selectedOption = placaSelect.options[placaSelect.selectedIndex];
        
        const formData = {
            vehicleId: parseInt(selectedOption.getAttribute('data-id')),
            placa: placaSelect.value,
            tipo: document.getElementById('expenseTipo').value,
            monto: parseFloat(document.getElementById('expenseMonto').value),
            fecha: document.getElementById('expenseFecha').value,
            regional: document.getElementById('expenseRegional').value,
            proveedor: document.getElementById('expenseProveedor').value.trim(),
            comprobante: null, // En una implementación real, procesarías el archivo aquí
            notas: document.getElementById('expenseNotas').value.trim()
        };

        // Validaciones
        if (!this.validateExpenseData(formData)) {
            return;
        }

        try {
            const expenseId = document.getElementById('expenseId').value;
            let result;
            
            if (expenseId) {
                // Actualizar gasto existente
                result = await database.updateExpense(parseInt(expenseId), formData);
                this.showSuccess('Gasto actualizado exitosamente');
            } else {
                // Nuevo gasto
                result = await database.createExpense(formData);
                this.showSuccess('Gasto registrado exitosamente');
                
                // Verificar alertas de presupuesto
                this.updateBudgetAlerts();
            }

            await this.loadExpenses();
            closeModal();
            
        } catch (error) {
            console.error('Error guardando gasto:', error);
            this.showError('Error al guardar el gasto: ' + error.message);
        }
    }

    validateExpenseData(data) {
        if (data.monto <= 0) {
            this.showError('El monto debe ser mayor a cero');
            document.getElementById('expenseMonto').focus();
            return false;
        }

        if (data.monto > 1000000) {
            this.showError('El monto no puede exceder $1,000,000');
            document.getElementById('expenseMonto').focus();
            return false;
        }

        if (data.proveedor.length < 2) {
            this.showError('El nombre del proveedor es muy corto');
            document.getElementById('expenseProveedor').focus();
            return false;
        }

        if (data.notas.length > 500) {
            this.showError('Las notas no pueden exceder 500 caracteres');
            document.getElementById('expenseNotas').focus();
            return false;
        }

        // Validar que la fecha no sea futura
        const expenseDate = new Date(data.fecha);
        if (expenseDate > new Date()) {
            this.showError('La fecha del gasto no puede ser futura');
            document.getElementById('expenseFecha').focus();
            return false;
        }

        return true;
    }

    async editExpense(expenseId) {
        if (!this.hasPermission('operator')) {
            this.showError('No tiene permisos para editar gastos');
            return;
        }
        await this.showExpenseForm(expenseId);
    }

    async viewExpenseDetails(expenseId) {
        const expense = this.expenses.find(e => e.id === expenseId);
        if (!expense) {
            this.showError('Gasto no encontrado');
            return;
        }

        try {
            const vehicle = await database.getVehicleById(expense.vehicleId);
            
            const content = `
                <div class="expense-details">
                    <div class="details-header">
                        <h4>
                            <i class="fas fa-receipt"></i> 
                            Detalles del Gasto
                        </h4>
                        <div class="expense-amount large">
                            ${this.formatCurrency(expense.monto)}
                        </div>
                    </div>

                    <div class="details-grid">
                        <div class="detail-section">
                            <h5><i class="fas fa-info-circle"></i> Información General</h5>
                            <div class="detail-item">
                                <strong>Tipo:</strong>
                                <span class="expense-type type-${this.getExpenseTypeClass(expense.tipo)}">
                                    <i class="fas fa-${this.getExpenseTypeIcon(expense.tipo)}"></i>
                                    ${this.escapeHtml(expense.tipo)}
                                </span>
                            </div>
                            <div class="detail-item">
                                <strong>Fecha:</strong>
                                <span>${new Date(expense.fecha).toLocaleDateString()}</span>
                            </div>
                            <div class="detail-item">
                                <strong>Proveedor:</strong>
                                <span>${this.escapeHtml(expense.proveedor)}</span>
                            </div>
                        </div>

                        <div class="detail-section">
                            <h5><i class="fas fa-car"></i> Vehículo y Ubicación</h5>
                            <div class="detail-item">
                                <strong>Vehículo:</strong>
                                <span>${this.escapeHtml(expense.placa)}</span>
                            </div>
                            <div class="detail-item">
                                <strong>Marca/Modelo:</strong>
                                <span>${vehicle ? `${this.escapeHtml(vehicle.marca)} ${this.escapeHtml(vehicle.modelo)}` : 'N/A'}</span>
                            </div>
                            <div class="detail-item">
                                <strong>Regional:</strong>
                                <span class="status-badge regional-${expense.regional.toLowerCase()}">
                                    ${expense.regional}
                                </span>
                            </div>
                        </div>
                    </div>

                    ${expense.notas ? `
                    <div class="detail-section">
                        <h5><i class="fas fa-sticky-note"></i> Notas Adicionales</h5>
                        <div class="notes-content">
                            ${this.escapeHtml(expense.notas)}
                        </div>
                    </div>
                    ` : ''}

                    ${expense.comprobante ? `
                    <div class="detail-section">
                        <h5><i class="fas fa-paperclip"></i> Comprobante</h5>
                        <div class="receipt-info">
                            <i class="fas fa-file-invoice-dollar"></i>
                            <span>Comprobante adjunto</span>
                            <button class="btn-secondary" onclick="expensesSystem.viewReceipt(${expense.id})">
                                <i class="fas fa-eye"></i> Ver Comprobante
                            </button>
                        </div>
                    </div>
                    ` : ''}

                    <div class="details-meta">
                        <small>
                            <i class="fas fa-clock"></i>
                            Registrado el ${new Date(expense.createdAt).toLocaleString()}
                        </small>
                    </div>

                    <div class="details-actions">
                        ${this.hasPermission('operator') ? `
                        <button class="btn-primary" onclick="expensesSystem.editExpense(${expense.id})">
                            <i class="fas fa-edit"></i> Editar Gasto
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;

            showModal('Detalles del Gasto', content);
            
        } catch (error) {
            console.error('Error cargando detalles:', error);
            this.showError('Error al cargar los detalles del gasto: ' + error.message);
        }
    }

    viewReceipt(expenseId) {
        const expense = this.expenses.find(e => e.id === expenseId);
        if (!expense || !expense.comprobante) {
            this.showError('No hay comprobante adjunto');
            return;
        }

        // En una implementación real, aquí mostrarías el comprobante
        const content = `
            <div class="receipt-view">
                <h4><i class="fas fa-file-invoice-dollar"></i> Comprobante</h4>
                <div class="receipt-info">
                    <div class="receipt-details">
                        <div class="detail">
                            <strong>Vehículo:</strong>
                            <span>${this.escapeHtml(expense.placa)}</span>
                        </div>
                        <div class="detail">
                            <strong>Proveedor:</strong>
                            <span>${this.escapeHtml(expense.proveedor)}</span>
                        </div>
                        <div class="detail">
                            <strong>Monto:</strong>
                            <span class="amount">${this.formatCurrency(expense.monto)}</span>
                        </div>
                        <div class="detail">
                            <strong>Fecha:</strong>
                            <span>${new Date(expense.fecha).toLocaleDateString()}</span>
                        </div>
                        <div class="detail">
                            <strong>Tipo:</strong>
                            <span>${this.escapeHtml(expense.tipo)}</span>
                        </div>
                    </div>
                    <div class="receipt-preview">
                        <div class="preview-placeholder">
                            <i class="fas fa-receipt"></i>
                            <p>Vista previa del comprobante</p>
                            <small>En una implementación real, aquí se mostraría el archivo</small>
                        </div>
                    </div>
                </div>
                <div class="form-actions">
                    <button class="btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                    <button class="btn-primary" onclick="expensesSystem.downloadReceipt(${expense.id})">
                        <i class="fas fa-download"></i> Descargar
                    </button>
                </div>
            </div>
        `;

        showModal('Comprobante', content);
    }

    downloadReceipt(expenseId) {
        // En una implementación real, aquí descargarías el comprobante
        this.showSuccess('Funcionalidad de descarga en desarrollo');
    }

    async deleteExpense(expenseId) {
        if (!this.hasPermission('admin')) {
            this.showError('No tiene permisos para eliminar gastos');
            return;
        }

        const expense = this.expenses.find(e => e.id === expenseId);
        if (!expense) {
            this.showError('Gasto no encontrado');
            return;
        }

        const confirmation = await this.showConfirmation(
            'Eliminar Gasto',
            `¿Está seguro de eliminar el gasto de <strong>${this.formatCurrency(expense.monto)}</strong> 
             para el vehículo <strong>${this.escapeHtml(expense.placa)}</strong>?<br>
             <small class="text-danger">Esta acción no se puede deshacer.</small>`,
            'warning'
        );

        if (!confirmation) return;

        try {
            this.showLoading('Eliminando gasto...');
            await database.deleteExpense(expenseId);
            await this.loadExpenses();
            this.showSuccess('Gasto eliminado exitosamente');
        } catch (error) {
            console.error('Error eliminando gasto:', error);
            this.showError('Error al eliminar el gasto: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async exportExpensesData() {
        try {
            this.showLoading('Generando exportación...');
            
            const data = this.filteredExpenses.map(expense => ({
                Fecha: new Date(expense.fecha).toLocaleDateString(),
                Tipo: expense.tipo,
                Monto: expense.monto,
                Vehículo: expense.placa,
                Regional: expense.regional,
                Proveedor: expense.proveedor,
                'Notas Adicionales': expense.notas || '',
                'Fecha Registro': new Date(expense.createdAt).toLocaleString()
            }));

            // Crear CSV
            const headers = Object.keys(data[0] || {});
            const csvContent = [
                headers.join(','),
                ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
            ].join('\n');

            // Descargar archivo
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `gastos_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            this.showSuccess('Datos exportados exitosamente');
            
        } catch (error) {
            console.error('Error exportando datos:', error);
            this.showError('Error al exportar los datos');
        } finally {
            this.hideLoading();
        }
    }

    async refreshData() {
        await this.loadExpenses();
    }

    // Métodos de utilidad
    formatCurrency(amount) {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
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

    hasPermission(requiredRole) {
        return window.authSystem && window.authSystem.hasPermission(requiredRole);
    }

    showLoading(message = 'Cargando...') {
        if (window.flotaApp) {
            window.flotaApp.showLoading(message);
        }
    }

    hideLoading() {
        if (window.flotaApp) {
            window.flotaApp.hideLoading();
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

    showWarning(message) {
        if (window.authSystem) {
            window.authSystem.showWarning(message);
        } else {
            alert('⚠️ ' + message);
        }
    }

    async showConfirmation(title, message, type = 'warning') {
        return new Promise((resolve) => {
            const modalContent = `
                <div class="confirmation-modal">
                    <div class="confirmation-icon ${type}">
                        <i class="fas fa-${type === 'warning' ? 'exclamation-triangle' : 'question-circle'}"></i>
                    </div>
                    <h4>${title}</h4>
                    <div class="confirmation-message">${message}</div>
                    <div class="confirmation-actions">
                        <button class="btn-secondary" onclick="closeModal(); resolve(false)">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button class="btn-${type === 'warning' ? 'danger' : 'primary'}" onclick="closeModal(); resolve(true)">
                            <i class="fas fa-check"></i> Confirmar
                        </button>
                    </div>
                </div>
            `;

            showModal('Confirmación', modalContent);
        });
    }
}

// Inicializar sistema de gastos cuando esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (typeof database !== 'undefined') {
        window.expensesSystem = new ExpensesSystem();
    }
});

// Funciones globales
function showExpenseForm() {
    if (window.expensesSystem) {
        window.expensesSystem.showExpenseForm();
    }
}
