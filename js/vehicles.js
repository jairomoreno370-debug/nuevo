// Sistema de Gestión de Vehículos - OPTIMIZADO Y COMPLETADO
class VehiclesSystem {
    constructor() {
        this.vehicles = [];
        this.filteredVehicles = [];
        this.componentsList = [
            'Tanque', 'Tubería de GLP', 'Válvulas de alivio', 'Bomba de GLP',
            'Toma Fuerza', 'Válvula interna', 'Válvula ESV', 'Válvula Globo',
            'Medidor Másico', 'Sistema RI505', 'Válvula Solenoide', 'Válvula Bypass',
            'Manguera GLP Carretel', 'Carretel', 'Motor Carretel', 'Juntas Flexibles',
            'Válvula Cierre Rápido o Suministro'
        ];
        this.regionalList = ['Norte', 'Sur', 'Centro'];
        this.currentSort = { field: null, direction: 'asc' };
        this.init();
    }

    async init() {
        try {
            await this.loadVehicles();
            this.setupEventListeners();
            this.setupGlobalHandlers();
            console.log('✅ Sistema de vehículos inicializado');
        } catch (error) {
            console.error('❌ Error inicializando sistema de vehículos:', error);
            this.showError('Error al inicializar el sistema de vehículos');
        }
    }

    async loadVehicles() {
        try {
            this.showLoading('Cargando vehículos...');
            
            this.vehicles = await database.getVehicles();
            this.filteredVehicles = [...this.vehicles];
            
            this.renderVehiclesTable();
            this.updateVehicleStats();
            this.hideLoading();
            
        } catch (error) {
            console.error('Error cargando vehículos:', error);
            this.showError('Error al cargar los vehículos: ' + error.message);
            this.hideLoading();
        }
    }

    setupEventListeners() {
        // Búsqueda de vehículos
        const searchInput = document.getElementById('vehicleSearch');
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.filterVehicles(e.target.value);
            }, 300));
        }

        // Filtro por regional
        const regionalFilter = document.getElementById('regionalFilter');
        if (regionalFilter) {
            regionalFilter.addEventListener('change', (e) => {
                this.filterVehiclesByRegional(e.target.value);
            });
        }

        // Enter key en búsqueda
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.filterVehicles(e.target.value);
                }
            });
        }

        // Click en headers de tabla para ordenar
        this.setupTableSorting();
    }

    setupGlobalHandlers() {
        // Refresh data cuando se vuelve a mostrar el módulo
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && document.getElementById('vehicles')?.classList.contains('active')) {
                this.refreshData();
            }
        });

        // Exportar datos con Ctrl+E
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'e' && document.getElementById('vehicles')?.classList.contains('active')) {
                e.preventDefault();
                this.exportVehiclesData();
            }
        });
    }

    setupTableSorting() {
        const table = document.getElementById('vehiclesTable');
        if (!table) return;

        const headers = table.querySelectorAll('th[data-sortable]');
        headers.forEach(header => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                const field = header.getAttribute('data-sortable');
                this.sortVehicles(field);
            });
        });
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

    renderVehiclesTable(vehicles = this.filteredVehicles) {
        const tableBody = document.getElementById('vehiclesTableBody');
        if (!tableBody) return;

        if (vehicles.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-state">
                        <i class="fas fa-car"></i>
                        <p>No hay vehículos registrados</p>
                        <button class="btn-primary" onclick="showVehicleForm()">
                            <i class="fas fa-plus"></i> Registrar Primer Vehículo
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = vehicles.map(vehicle => `
            <tr data-vehicle-id="${vehicle.id}">
                <td>
                    <div class="vehicle-placa">
                        <strong>${this.escapeHtml(vehicle.placa)}</strong>
                        ${this.hasAlerts(vehicle) ? '<i class="fas fa-exclamation-circle text-warning" title="Tiene alertas"></i>' : ''}
                    </div>
                </td>
                <td>${this.escapeHtml(vehicle.marca)}</td>
                <td>${this.escapeHtml(vehicle.modelo)}</td>
                <td>${vehicle.año}</td>
                <td>
                    <span class="status-badge regional-${vehicle.regional.toLowerCase()}">
                        ${vehicle.regional}
                    </span>
                </td>
                <td>${this.escapeHtml(vehicle.capacidad)}</td>
                <td>
                    <div class="odometer-display">
                        <span class="odometer-value">${vehicle.odometroInicial.toLocaleString()} km</span>
                        ${this.getOdometerStatus(vehicle)}
                    </div>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" onclick="vehiclesSystem.editVehicle(${vehicle.id})" 
                                title="Editar vehículo" ${!this.hasPermission('operator') ? 'disabled' : ''}>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-action btn-info" onclick="vehiclesSystem.manageComponents(${vehicle.id})" 
                                title="Gestionar componentes" ${!this.hasPermission('operator') ? 'disabled' : ''}>
                            <i class="fas fa-cogs"></i>
                        </button>
                        <button class="btn-action btn-view" onclick="vehiclesSystem.viewVehicleDetails(${vehicle.id})" 
                                title="Ver detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${this.hasPermission('admin') ? `
                        <button class="btn-action btn-delete" onclick="vehiclesSystem.deleteVehicle(${vehicle.id})" 
                                title="Eliminar vehículo">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');

        // Actualizar contador de resultados
        this.updateResultsCounter(vehicles.length);
    }

    getOdometerStatus(vehicle) {
        // En una implementación real, verificarías el estado del odómetro
        const currentYear = new Date().getFullYear();
        const vehicleAge = currentYear - vehicle.año;
        
        if (vehicleAge > 10) {
            return '<span class="odometer-alert" title="Vehículo antiguo">⚠️</span>';
        }
        
        return '';
    }

    updateResultsCounter(count) {
        const searchInput = document.getElementById('vehicleSearch');
        const counter = document.getElementById('resultsCounter') || this.createResultsCounter();
        
        const total = this.vehicles.length;
        const filtered = count;
        
        if (filtered === total) {
            counter.textContent = `Mostrando todos los ${total} vehículos`;
        } else {
            counter.textContent = `Mostrando ${filtered} de ${total} vehículos`;
        }
    }

    createResultsCounter() {
        const counter = document.createElement('div');
        counter.id = 'resultsCounter';
        counter.className = 'results-counter';
        
        const filters = document.querySelector('.filters');
        if (filters) {
            filters.appendChild(counter);
        }
        
        return counter;
    }

    updateVehicleStats() {
        const stats = {
            total: this.vehicles.length,
            byRegional: {},
            byYear: {}
        };

        this.vehicles.forEach(vehicle => {
            // Estadísticas por regional
            stats.byRegional[vehicle.regional] = (stats.byRegional[vehicle.regional] || 0) + 1;
            
            // Estadísticas por año
            const yearRange = Math.floor(vehicle.año / 5) * 5;
            stats.byYear[yearRange] = (stats.byYear[yearRange] || 0) + 1;
        });

        // Podrías mostrar estas estadísticas en algún lugar de la UI
        console.log('Estadísticas de vehículos:', stats);
    }

    hasAlerts(vehicle) {
        // En una implementación real, verificarías:
        // - Mantenimientos pendientes
        // - Componentes vencidos
        // - Seguros por vencer
        // - etc.
        return Math.random() < 0.2; // 20% de chance para demo
    }

    filterVehicles(searchTerm) {
        if (!searchTerm) {
            this.filteredVehicles = [...this.vehicles];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredVehicles = this.vehicles.filter(vehicle =>
                vehicle.placa.toLowerCase().includes(term) ||
                vehicle.marca.toLowerCase().includes(term) ||
                vehicle.modelo.toLowerCase().includes(term) ||
                vehicle.vin.toLowerCase().includes(term) ||
                vehicle.capacidad.toLowerCase().includes(term)
            );
        }
        this.renderVehiclesTable();
    }

    filterVehiclesByRegional(regional) {
        if (!regional) {
            this.filteredVehicles = [...this.vehicles];
        } else {
            this.filteredVehicles = this.vehicles.filter(vehicle => 
                vehicle.regional === regional
            );
        }
        this.renderVehiclesTable();
    }

    sortVehicles(field) {
        const direction = this.currentSort.field === field && this.currentSort.direction === 'asc' ? 'desc' : 'asc';
        
        this.filteredVehicles.sort((a, b) => {
            let aValue = a[field];
            let bValue = b[field];
            
            // Manejar diferentes tipos de datos
            if (field === 'año' || field === 'odometroInicial') {
                aValue = parseInt(aValue);
                bValue = parseInt(bValue);
            } else if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            if (aValue < bValue) return direction === 'asc' ? -1 : 1;
            if (aValue > bValue) return direction === 'asc' ? 1 : -1;
            return 0;
        });
        
        this.currentSort = { field, direction };
        this.renderVehiclesTable();
        this.updateSortIndicators(field, direction);
    }

    updateSortIndicators(field, direction) {
        const headers = document.querySelectorAll('th[data-sortable]');
        headers.forEach(header => {
            header.classList.remove('sort-asc', 'sort-desc');
            if (header.getAttribute('data-sortable') === field) {
                header.classList.add(`sort-${direction}`);
                header.title = `Ordenar ${direction === 'asc' ? 'ascendente' : 'descendente'}`;
            }
        });
    }

    async showVehicleForm(vehicleId = null) {
        if (!this.hasPermission('operator')) {
            this.showError('No tiene permisos para registrar vehículos');
            return;
        }

        const vehicle = vehicleId ? this.vehicles.find(v => v.id === vehicleId) : null;
        
        const formContent = `
            <form id="vehicleForm" onsubmit="vehiclesSystem.handleVehicleSubmit(event)">
                <div class="form-section">
                    <h4><i class="fas fa-info-circle"></i> Información Básica</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="placa">
                                <i class="fas fa-car"></i> Placa *
                            </label>
                            <input type="text" id="placa" 
                                   value="${vehicle ? this.escapeHtml(vehicle.placa) : ''}" 
                                   required 
                                   pattern="[A-Z0-9-]{4,10}" 
                                   title="Solo letras mayúsculas, números y guiones (4-10 caracteres)"
                                   maxlength="10"
                                   placeholder="Ej: ABC-123"
                                   ${vehicle ? 'readonly' : ''}>
                            <small>Formato: Letras mayúsculas, números y guiones</small>
                        </div>
                        <div class="form-group">
                            <label for="vin">
                                <i class="fas fa-barcode"></i> VIN/Chasis *
                            </label>
                            <input type="text" id="vin" 
                                   value="${vehicle ? this.escapeHtml(vehicle.vin) : ''}" 
                                   required
                                   pattern="[A-Z0-9]{17}" 
                                   title="17 caracteres alfanuméricos"
                                   minlength="17"
                                   maxlength="17"
                                   placeholder="17 caracteres alfanuméricos"
                                   ${vehicle ? 'readonly' : ''}>
                            <small>17 caracteres (solo letras mayúsculas y números)</small>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4><i class="fas fa-car-side"></i> Especificaciones</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="marca">
                                <i class="fas fa-tag"></i> Marca *
                            </label>
                            <input type="text" id="marca" 
                                   value="${vehicle ? this.escapeHtml(vehicle.marca) : ''}" 
                                   required
                                   placeholder="Ej: Toyota, Ford, etc.">
                        </div>
                        <div class="form-group">
                            <label for="modelo">
                                <i class="fas fa-tags"></i> Modelo *
                            </label>
                            <input type="text" id="modelo" 
                                   value="${vehicle ? this.escapeHtml(vehicle.modelo) : ''}" 
                                   required
                                   placeholder="Ej: Hilux, Ranger, etc.">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4><i class="fas fa-cogs"></i> Características Técnicas</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="año">
                                <i class="fas fa-calendar-alt"></i> Año de Fabricación *
                            </label>
                            <input type="number" id="año" 
                                   min="1990" 
                                   max="${new Date().getFullYear() + 1}" 
                                   value="${vehicle ? vehicle.año : new Date().getFullYear()}" 
                                   required>
                        </div>
                        <div class="form-group">
                            <label for="capacidad">
                                <i class="fas fa-weight-hanging"></i> Capacidad *
                            </label>
                            <input type="text" id="capacidad" 
                                   value="${vehicle ? this.escapeHtml(vehicle.capacidad) : ''}" 
                                   required 
                                   placeholder="Ej: 1500 kg, 2 toneladas">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4><i class="fas fa-map-marker-alt"></i> Ubicación y Estado</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="odometroInicial">
                                <i class="fas fa-tachometer-alt"></i> Odómetro Inicial *
                            </label>
                            <input type="number" id="odometroInicial" 
                                   value="${vehicle ? vehicle.odometroInicial : '0'}" 
                                   min="0" 
                                   step="1"
                                   required>
                            <small>Kilometraje actual del vehículo</small>
                        </div>
                        <div class="form-group">
                            <label for="regional">
                                <i class="fas fa-map"></i> Regional *
                            </label>
                            <select id="regional" required>
                                <option value="">Seleccionar regional</option>
                                ${this.regionalList.map(regional => `
                                    <option value="${regional}" ${vehicle && vehicle.regional === regional ? 'selected' : ''}>
                                        ${regional}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i> ${vehicle ? 'Actualizar' : 'Guardar'} Vehículo
                    </button>
                </div>
                <input type="hidden" id="vehicleId" value="${vehicle ? vehicle.id : ''}">
            </form>
        `;

        showModal(vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo', formContent);

        // Poner foco en el primer campo editable
        setTimeout(() => {
            const focusField = vehicle ? document.getElementById('marca') : document.getElementById('placa');
            if (focusField) {
                focusField.focus();
            }
        }, 100);
    }

    async handleVehicleSubmit(event) {
        event.preventDefault();
        
        if (!this.hasPermission('operator')) {
            this.showError('No tiene permisos para realizar esta acción');
            return;
        }

        const formData = {
            placa: document.getElementById('placa').value.toUpperCase().trim(),
            vin: document.getElementById('vin').value.toUpperCase().trim(),
            marca: document.getElementById('marca').value.trim(),
            modelo: document.getElementById('modelo').value.trim(),
            año: parseInt(document.getElementById('año').value),
            capacidad: document.getElementById('capacidad').value.trim(),
            odometroInicial: parseInt(document.getElementById('odometroInicial').value),
            regional: document.getElementById('regional').value
        };

        // Validaciones adicionales
        if (!this.validateVehicleData(formData)) {
            return;
        }

        try {
            const vehicleId = document.getElementById('vehicleId').value;
            let result;
            
            if (vehicleId) {
                // Actualizar vehículo existente
                result = await database.updateVehicle(parseInt(vehicleId), formData);
                this.showSuccess('Vehículo actualizado exitosamente');
            } else {
                // Nuevo vehículo
                result = await database.createVehicle(formData);
                this.showSuccess('Vehículo creado exitosamente');
            }

            await this.loadVehicles();
            closeModal();
            
        } catch (error) {
            console.error('Error guardando vehículo:', error);
            this.showError('Error al guardar el vehículo: ' + error.message);
        }
    }

    validateVehicleData(data) {
        // Validar placa
        if (data.placa.length < 4) {
            this.showError('La placa debe tener al menos 4 caracteres');
            document.getElementById('placa').focus();
            return false;
        }

        if (!/^[A-Z0-9-]+$/.test(data.placa)) {
            this.showError('La placa solo puede contener letras mayúsculas, números y guiones');
            document.getElementById('placa').focus();
            return false;
        }

        // Validar VIN
        if (data.vin.length !== 17) {
            this.showError('El VIN debe tener exactamente 17 caracteres');
            document.getElementById('vin').focus();
            return false;
        }

        if (!/^[A-Z0-9]+$/.test(data.vin)) {
            this.showError('El VIN solo puede contener letras mayúsculas y números');
            document.getElementById('vin').focus();
            return false;
        }

        // Validar año
        const currentYear = new Date().getFullYear();
        if (data.año < 1990 || data.año > currentYear + 1) {
            this.showError(`El año debe estar entre 1990 y ${currentYear + 1}`);
            document.getElementById('año').focus();
            return false;
        }

        // Validar odómetro
        if (data.odometroInicial < 0) {
            this.showError('El odómetro no puede ser negativo');
            document.getElementById('odometroInicial').focus();
            return false;
        }

        if (data.odometroInicial > 1000000) {
            this.showError('El odómetro no puede exceder 1,000,000 km');
            document.getElementById('odometroInicial').focus();
            return false;
        }

        return true;
    }

    async editVehicle(vehicleId) {
        if (!this.hasPermission('operator')) {
            this.showError('No tiene permisos para editar vehículos');
            return;
        }
        await this.showVehicleForm(vehicleId);
    }

    async deleteVehicle(vehicleId) {
        if (!this.hasPermission('admin')) {
            this.showError('No tiene permisos para eliminar vehículos');
            return;
        }

        const vehicle = this.vehicles.find(v => v.id === vehicleId);
        if (!vehicle) {
            this.showError('Vehículo no encontrado');
            return;
        }

        // Verificar si el vehículo tiene datos asociados
        const hasAssociatedData = await this.checkVehicleAssociatedData(vehicleId);
        let warningMessage = '';

        if (hasAssociatedData) {
            warningMessage = `<br><small class="text-danger">
                <i class="fas fa-exclamation-triangle"></i>
                Este vehículo tiene componentes, fallas y gastos asociados que también serán eliminados.
            </small>`;
        }

        const confirmation = await this.showConfirmation(
            'Eliminar Vehículo',
            `¿Está seguro de eliminar el vehículo <strong>${this.escapeHtml(vehicle.placa)}</strong>?${warningMessage}`,
            'warning'
        );

        if (!confirmation) return;

        try {
            this.showLoading('Eliminando vehículo...');
            await database.deleteVehicle(vehicleId);
            await this.loadVehicles();
            this.showSuccess('Vehículo eliminado exitosamente');
        } catch (error) {
            console.error('Error eliminando vehículo:', error);
            this.showError('Error al eliminar el vehículo: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async checkVehicleAssociatedData(vehicleId) {
        try {
            const [components, failures, expenses] = await Promise.all([
                database.getComponentsByVehicle(vehicleId),
                database.getFailuresByVehicle(vehicleId),
                database.getExpensesByVehicle(vehicleId)
            ]);

            return components.length > 0 || failures.length > 0 || expenses.length > 0;
        } catch (error) {
            console.error('Error verificando datos asociados:', error);
            return false;
        }
    }

    async manageComponents(vehicleId) {
        if (!this.hasPermission('operator')) {
            this.showError('No tiene permisos para gestionar componentes');
            return;
        }

        const vehicle = this.vehicles.find(v => v.id === vehicleId);
        if (!vehicle) {
            this.showError('Vehículo no encontrado');
            return;
        }

        try {
            this.showLoading('Cargando componentes...');
            const components = await database.getComponentsByVehicle(vehicleId);
            
            const componentsContent = `
                <div class="components-management">
                    <div class="components-header">
                        <h4>
                            <i class="fas fa-cogs"></i> 
                            Gestión de Componentes - ${this.escapeHtml(vehicle.placa)}
                        </h4>
                        <div class="vehicle-info">
                            <span><strong>Vehículo:</strong> ${this.escapeHtml(vehicle.marca)} ${this.escapeHtml(vehicle.modelo)}</span>
                            <span><strong>Regional:</strong> ${vehicle.regional}</span>
                            <span><strong>Año:</strong> ${vehicle.año}</span>
                        </div>
                    </div>
                    
                    <div class="components-section">
                        <h5><i class="fas fa-list"></i> Componentes Registrados (${components.length})</h5>
                        <div class="components-list">
                            ${components.length === 0 ? 
                                '<div class="empty-state small"><i class="fas fa-cogs"></i><p>No hay componentes registrados</p></div>' :
                                components.map(comp => `
                                    <div class="component-item" data-component-id="${comp.id}">
                                        <div class="component-header">
                                            <strong>${this.escapeHtml(comp.nombre)}</strong>
                                            <div class="component-actions">
                                                <button class="btn-action btn-edit" onclick="vehiclesSystem.editComponent(${comp.id}, ${vehicleId})" 
                                                        title="Editar componente" ${!this.hasPermission('operator') ? 'disabled' : ''}>
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                                <button class="btn-action btn-delete" onclick="vehiclesSystem.deleteComponent(${comp.id}, ${vehicleId})" 
                                                        title="Eliminar componente" ${!this.hasPermission('operator') ? 'disabled' : ''}>
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            </div>
                                        </div>
                                        <div class="component-details">
                                            <div class="detail">
                                                <i class="fas fa-calendar-alt"></i>
                                                <span>Instalado: ${new Date(comp.fechaInstalacion).toLocaleDateString()}</span>
                                            </div>
                                            <div class="detail">
                                                <i class="fas fa-clock"></i>
                                                <span>Vida útil: ${comp.vidaUtil} meses</span>
                                            </div>
                                            ${comp.caracteristicas ? `
                                            <div class="detail">
                                                <i class="fas fa-info-circle"></i>
                                                <span>Características: ${this.escapeHtml(comp.caracteristicas)}</span>
                                            </div>
                                            ` : ''}
                                        </div>
                                        ${this.getComponentStatus(comp) ? `
                                        <div class="component-status ${this.getComponentStatus(comp).type}">
                                            <i class="fas fa-${this.getComponentStatus(comp).icon}"></i>
                                            ${this.getComponentStatus(comp).message}
                                        </div>
                                        ` : ''}
                                    </div>
                                `).join('')
                            }
                        </div>
                    </div>
                    
                    <div class="add-component-section">
                        <h5><i class="fas fa-plus-circle"></i> Agregar Nuevo Componente</h5>
                        <form onsubmit="vehiclesSystem.handleAddComponent(event, ${vehicleId})" class="component-form">
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="componentName">
                                        <i class="fas fa-cog"></i> Componente *
                                    </label>
                                    <select id="componentName" required>
                                        <option value="">Seleccionar componente</option>
                                        ${this.componentsList.map(comp => 
                                            `<option value="${this.escapeHtml(comp)}">${this.escapeHtml(comp)}</option>`
                                        ).join('')}
                                        <option value="Otro">Otro (especificar en características)</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label for="vidaUtil">
                                        <i class="fas fa-clock"></i> Vida Útil (meses) *
                                    </label>
                                    <input type="number" id="vidaUtil" min="1" max="120" value="12" required>
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label for="fechaInstalacion">
                                        <i class="fas fa-calendar-alt"></i> Fecha de Instalación *
                                    </label>
                                    <input type="date" id="fechaInstalacion" value="${new Date().toISOString().split('T')[0]}" required>
                                </div>
                                <div class="form-group full-width">
                                    <label for="caracteristicas">
                                        <i class="fas fa-info-circle"></i> Características Específicas
                                    </label>
                                    <textarea id="caracteristicas" rows="3" 
                                              placeholder="Detalles específicos del componente, número de serie, especificaciones técnicas..."></textarea>
                                </div>
                            </div>
                            <div class="form-actions">
                                <button type="submit" class="btn-primary" ${!this.hasPermission('operator') ? 'disabled' : ''}>
                                    <i class="fas fa-plus"></i> Agregar Componente
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            `;

            showModal(`Componentes - ${vehicle.placa}`, componentsContent);
            
        } catch (error) {
            console.error('Error cargando componentes:', error);
            this.showError('Error al cargar los componentes: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    getComponentStatus(component) {
        const installDate = new Date(component.fechaInstalacion);
        const expirationDate = new Date(installDate);
        expirationDate.setMonth(expirationDate.getMonth() + component.vidaUtil);
        const today = new Date();
        const daysUntilExpiration = Math.ceil((expirationDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiration < 0) {
            return {
                type: 'expired',
                icon: 'exclamation-triangle',
                message: `Vencido hace ${Math.abs(daysUntilExpiration)} días`
            };
        } else if (daysUntilExpiration <= 30) {
            return {
                type: 'warning',
                icon: 'exclamation-circle',
                message: `Vence en ${daysUntilExpiration} días`
            };
        } else if (daysUntilExpiration <= 90) {
            return {
                type: 'info',
                icon: 'info-circle',
                message: `Vence en ${daysUntilExpiration} días`
            };
        }

        return null;
    }

    async handleAddComponent(event, vehicleId) {
        event.preventDefault();
        
        if (!this.hasPermission('operator')) {
            this.showError('No tiene permisos para agregar componentes');
            return;
        }

        const componentData = {
            vehicleId: vehicleId,
            nombre: document.getElementById('componentName').value,
            vidaUtil: parseInt(document.getElementById('vidaUtil').value),
            fechaInstalacion: document.getElementById('fechaInstalacion').value,
            caracteristicas: document.getElementById('caracteristicas').value.trim()
        };

        // Validaciones
        if (!componentData.nombre) {
            this.showError('Por favor seleccione un componente');
            return;
        }

        if (componentData.vidaUtil < 1 || componentData.vidaUtil > 120) {
            this.showError('La vida útil debe estar entre 1 y 120 meses');
            return;
        }

        // Validar fecha de instalación
        const installDate = new Date(componentData.fechaInstalacion);
        if (installDate > new Date()) {
            this.showError('La fecha de instalación no puede ser futura');
            return;
        }

        try {
            await database.createComponent(componentData);
            this.showSuccess('Componente agregado exitosamente');
            this.manageComponents(vehicleId); // Recargar la vista
            
        } catch (error) {
            console.error('Error agregando componente:', error);
            this.showError('Error al agregar el componente: ' + error.message);
        }
    }

    async editComponent(componentId, vehicleId) {
        if (!this.hasPermission('operator')) {
            this.showError('No tiene permisos para editar componentes');
            return;
        }

        try {
            const component = await database.getComponentById(componentId);
            if (!component) {
                this.showError('Componente no encontrado');
                return;
            }

            const formContent = `
                <div class="edit-component-form">
                    <h4><i class="fas fa-edit"></i> Editar Componente</h4>
                    <form onsubmit="vehiclesSystem.handleEditComponent(event, ${componentId}, ${vehicleId})">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="editComponentName">Componente *</label>
                                <input type="text" id="editComponentName" value="${this.escapeHtml(component.nombre)}" required>
                            </div>
                            <div class="form-group">
                                <label for="editVidaUtil">Vida Útil (meses) *</label>
                                <input type="number" id="editVidaUtil" min="1" max="120" value="${component.vidaUtil}" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="editFechaInstalacion">Fecha de Instalación *</label>
                            <input type="date" id="editFechaInstalacion" value="${component.fechaInstalacion}" required>
                        </div>
                        <div class="form-group">
                            <label for="editCaracteristicas">Características Específicas</label>
                            <textarea id="editCaracteristicas" rows="3">${this.escapeHtml(component.caracteristicas || '')}</textarea>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" onclick="vehiclesSystem.manageComponents(${vehicleId})">
                                <i class="fas fa-times"></i> Cancelar
                            </button>
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-save"></i> Actualizar Componente
                            </button>
                        </div>
                    </form>
                </div>
            `;

            showModal('Editar Componente', formContent);
            
        } catch (error) {
            console.error('Error cargando componente:', error);
            this.showError('Error al cargar el componente: ' + error.message);
        }
    }

    async handleEditComponent(event, componentId, vehicleId) {
        event.preventDefault();
        
        const updates = {
            nombre: document.getElementById('editComponentName').value.trim(),
            vidaUtil: parseInt(document.getElementById('editVidaUtil').value),
            fechaInstalacion: document.getElementById('editFechaInstalacion').value,
            caracteristicas: document.getElementById('editCaracteristicas').value.trim()
        };

        // Validaciones
        if (updates.vidaUtil < 1 || updates.vidaUtil > 120) {
            this.showError('La vida útil debe estar entre 1 y 120 meses');
            return;
        }

        try {
            await database.updateComponent(componentId, updates);
            this.showSuccess('Componente actualizado exitosamente');
            this.manageComponents(vehicleId); // Recargar la vista
            
        } catch (error) {
            console.error('Error actualizando componente:', error);
            this.showError('Error al actualizar el componente: ' + error.message);
        }
    }

    async deleteComponent(componentId, vehicleId) {
        if (!this.hasPermission('operator')) {
            this.showError('No tiene permisos para eliminar componentes');
            return;
        }

        const confirmation = await this.showConfirmation(
            'Eliminar Componente',
            '¿Está seguro de eliminar este componente?',
            'warning'
        );

        if (!confirmation) return;

        try {
            await database.deleteComponent(componentId);
            this.showSuccess('Componente eliminado exitosamente');
            this.manageComponents(vehicleId); // Recargar la vista
            
        } catch (error) {
            console.error('Error eliminando componente:', error);
            this.showError('Error al eliminar el componente: ' + error.message);
        }
    }

    async viewVehicleDetails(vehicleId) {
        const vehicle = this.vehicles.find(v => v.id === vehicleId);
        if (!vehicle) {
            this.showError('Vehículo no encontrado');
            return;
        }

        try {
            this.showLoading('Cargando información...');
            
            const [components, failures, expenses] = await Promise.all([
                database.getComponentsByVehicle(vehicleId),
                database.getFailuresByVehicle(vehicleId),
                database.getExpensesByVehicle(vehicleId)
            ]);

            const totalMaintenanceCost = failures.reduce((total, failure) => {
                // En una implementación real, obtendrías el costo del mantenimiento asociado
                return total + 0; // Placeholder
            }, 0);

            const totalExpenses = expenses.reduce((total, expense) => total + expense.monto, 0);

            const detailsContent = `
                <div class="vehicle-details">
                    <div class="details-header">
                        <h4>
                            <i class="fas fa-car"></i> 
                            Detalles del Vehículo - ${this.escapeHtml(vehicle.placa)}
                        </h4>
                        <div class="vehicle-basic-info">
                            <div class="info-grid">
                                <div class="info-item">
                                    <strong>Marca/Modelo:</strong>
                                    <span>${this.escapeHtml(vehicle.marca)} ${this.escapeHtml(vehicle.modelo)}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Año:</strong>
                                    <span>${vehicle.año}</span>
                                </div>
                                <div class="info-item">
                                    <strong>VIN:</strong>
                                    <span>${vehicle.vin}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Regional:</strong>
                                    <span class="status-badge regional-${vehicle.regional.toLowerCase()}">${vehicle.regional}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Capacidad:</strong>
                                    <span>${this.escapeHtml(vehicle.capacidad)}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Odómetro:</strong>
                                    <span>${vehicle.odometroInicial.toLocaleString()} km</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="details-sections">
                        <div class="details-section">
                            <h5><i class="fas fa-cogs"></i> Componentes (${components.length})</h5>
                            ${components.length === 0 ? 
                                '<p class="empty-state small">No hay componentes registrados</p>' :
                                components.slice(0, 5).map(comp => `
                                    <div class="detail-item">
                                        <strong>${this.escapeHtml(comp.nombre)}</strong>
                                        <span>Instalado: ${new Date(comp.fechaInstalacion).toLocaleDateString()}</span>
                                    </div>
                                `).join('') + (components.length > 5 ? 
                                `<div class="more-items">... y ${components.length - 5} más</div>` : '')
                            }
                        </div>

                        <div class="details-section">
                            <h5><i class="fas fa-exclamation-triangle"></i> Fallas (${failures.length})</h5>
                            ${failures.length === 0 ? 
                                '<p class="empty-state small">No hay fallas registradas</p>' :
                                `<div class="failure-stats">
                                    <span class="stat open">Abiertas: ${failures.filter(f => f.estado === 'Abierta').length}</span>
                                    <span class="stat progress">En proceso: ${failures.filter(f => f.estado === 'En Proceso').length}</span>
                                    <span class="stat resolved">Resueltas: ${failures.filter(f => f.estado === 'Resuelta').length}</span>
                                </div>`
                            }
                        </div>

                        <div class="details-section">
                            <h5><i class="fas fa-chart-line"></i> Resumen Financiero</h5>
                            <div class="financial-stats">
                                <div class="financial-item">
                                    <span>Total Gastos:</span>
                                    <strong>$${totalExpenses.toLocaleString()}</strong>
                                </div>
                                <div class="financial-item">
                                    <span>Mantenimiento:</span>
                                    <span>$${totalMaintenanceCost.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="details-actions">
                        <button class="btn-secondary" onclick="vehiclesSystem.manageComponents(${vehicleId})" ${!this.hasPermission('operator') ? 'disabled' : ''}>
                            <i class="fas fa-cogs"></i> Gestionar Componentes
                        </button>
                        <button class="btn-primary" onclick="vehiclesSystem.editVehicle(${vehicleId})" ${!this.hasPermission('operator') ? 'disabled' : ''}>
                            <i class="fas fa-edit"></i> Editar Vehículo
                        </button>
                    </div>
                </div>
            `;

            showModal(`Detalles - ${vehicle.placa}`, detailsContent);
            
        } catch (error) {
            console.error('Error cargando detalles:', error);
            this.showError('Error al cargar los detalles del vehículo: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async exportVehiclesData() {
        try {
            this.showLoading('Generando exportación...');
            
            const data = this.filteredVehicles.map(vehicle => ({
                Placa: vehicle.placa,
                Marca: vehicle.marca,
                Modelo: vehicle.modelo,
                Año: vehicle.año,
                Regional: vehicle.regional,
                Capacidad: vehicle.capacidad,
                'Odómetro Inicial': vehicle.odometroInicial,
                VIN: vehicle.vin
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
            link.setAttribute('download', `vehiculos_${new Date().toISOString().split('T')[0]}.csv`);
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
        await this.loadVehicles();
    }

    // Métodos de utilidad
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

// Inicializar sistema de vehículos cuando esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (typeof database !== 'undefined') {
        window.vehiclesSystem = new VehiclesSystem();
    }
});

// Funciones globales
function showVehicleForm() {
    if (window.vehiclesSystem) {
        window.vehiclesSystem.showVehicleForm();
    }
}
