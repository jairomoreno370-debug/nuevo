// Sistema de Gestión de Mantenimiento y Fallas - COMPLETO
class MaintenanceSystem {
    constructor() {
        this.failures = [];
        this.filteredFailures = [];
        this.componentsList = [
            'Tanque', 'Tubería de GLP', 'Válvulas de alivio', 'Bomba de GLP',
            'Toma Fuerza', 'Válvula interna', 'Válvula ESV', 'Válvula Globo',
            'Medidor Másico', 'Sistema RI505', 'Válvula Solenoide', 'Válvula Bypass',
            'Manguera GLP Carretel', 'Carretel', 'Motor Carretel', 'Juntas Flexibles',
            'Válvula Cierre Rápido o Suministro'
        ];
        this.init();
    }

    async init() {
        await this.loadFailures();
        this.setupEventListeners();
    }

    async loadFailures() {
        try {
            this.showLoading('Cargando fallas...');
            
            this.failures = await database.getFailures();
            this.filteredFailures = [...this.failures];
            
            this.renderFailuresTables();
            this.hideLoading();
            
        } catch (error) {
            console.error('Error cargando fallas:', error);
            this.showError('Error al cargar las fallas: ' + error.message);
            this.hideLoading();
        }
    }

    setupEventListeners() {
        // Configurar tabs
        const tabButtons = document.querySelectorAll('.tab-button');
        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tab = button.getAttribute('data-tab');
                this.switchTab(tab, button);
            });
        });

        // Enter key en búsqueda si existe
        const searchInput = document.getElementById('maintenanceSearch');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.filterFailures(e.target.value);
                }
            });
        }
    }

    switchTab(tabName, button) {
        const tabButtons = button.parentElement.querySelectorAll('.tab-button');
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const tabPanes = document.querySelectorAll('.tab-pane');
        tabPanes.forEach(pane => pane.classList.remove('active'));
        
        const targetPane = document.getElementById(tabName);
        if (targetPane) {
            targetPane.classList.add('active');
        }

        // Actualizar la vista según el tab seleccionado
        this.updateTabView(tabName);
    }

    updateTabView(tabName) {
        switch (tabName) {
            case 'openFailures':
                this.renderFailuresTable('openFailuresTableBody', this.filteredFailures.filter(f => f.estado === 'Abierta'));
                break;
            case 'inProgressFailures':
                this.renderFailuresTable('inProgressFailuresTableBody', this.filteredFailures.filter(f => f.estado === 'En Proceso'));
                break;
            case 'resolvedFailures':
                this.renderFailuresTable('resolvedFailuresTableBody', this.filteredFailures.filter(f => f.estado === 'Resuelta'));
                break;
        }
    }

    renderFailuresTables() {
        this.renderFailuresTable('openFailuresTableBody', this.filteredFailures.filter(f => f.estado === 'Abierta'));
        this.renderFailuresTable('inProgressFailuresTableBody', this.filteredFailures.filter(f => f.estado === 'En Proceso'));
        this.renderFailuresTable('resolvedFailuresTableBody', this.filteredFailures.filter(f => f.estado === 'Resuelta'));
    }

    renderFailuresTable(tableBodyId, failures) {
        const tableBody = document.getElementById(tableBodyId);
        if (!tableBody) return;

        if (failures.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="empty-state">
                        <i class="fas fa-check-circle"></i>
                        <p>No hay fallas en este estado</p>
                        ${tableBodyId === 'openFailuresTableBody' ? `
                        <button class="btn-primary" onclick="showFailureForm()">
                            <i class="fas fa-plus"></i> Registrar Primera Falla
                        </button>
                        ` : ''}
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = failures.map(failure => `
            <tr>
                <td>
                    <strong>${this.escapeHtml(failure.placa)}</strong>
                    ${this.hasUrgentPriority(failure) ? '<i class="fas fa-exclamation-circle text-danger" title="Prioridad Alta"></i>' : ''}
                </td>
                <td>${this.escapeHtml(failure.componente)}</td>
                <td>
                    <div class="date-time">
                        <div class="date">${new Date(failure.fechaHora).toLocaleDateString()}</div>
                        <div class="time">${new Date(failure.fechaHora).toLocaleTimeString()}</div>
                    </div>
                </td>
                <td>
                    <span class="status-badge priority-${failure.prioridad.toLowerCase()}">
                        <i class="fas fa-${this.getPriorityIcon(failure.prioridad)}"></i>
                        ${failure.prioridad}
                    </span>
                </td>
                <td class="failure-description">
                    <div class="description-text">${this.escapeHtml(failure.descripcion)}</div>
                    ${failure.descripcion.length > 50 ? `
                    <button class="btn-text" onclick="maintenanceSystem.showFullDescription(${failure.id})">
                        Ver más
                    </button>
                    ` : ''}
                </td>
                <td>
                    <div class="action-buttons">
                        ${failure.estado === 'Abierta' ? `
                        <button class="btn-action btn-success" 
                                onclick="maintenanceSystem.startMaintenance(${failure.id})" 
                                title="Iniciar Mantenimiento"
                                ${!authSystem.hasPermission('operator') ? 'disabled' : ''}>
                            <i class="fas fa-play"></i>
                        </button>
                        ` : ''}
                        
                        ${failure.estado === 'En Proceso' ? `
                        <button class="btn-action btn-primary" 
                                onclick="maintenanceSystem.showMaintenanceForm(${failure.id})" 
                                title="Completar Mantenimiento"
                                ${!authSystem.hasPermission('operator') ? 'disabled' : ''}>
                            <i class="fas fa-check"></i>
                        </button>
                        ` : ''}
                        
                        <button class="btn-action btn-info" 
                                onclick="maintenanceSystem.viewFailure(${failure.id})" 
                                title="Ver Detalles">
                            <i class="fas fa-eye"></i>
                        </button>
                        
                        ${failure.estado !== 'Resuelta' && authSystem.hasPermission('operator') ? `
                        <button class="btn-action btn-edit" 
                                onclick="maintenanceSystem.editFailure(${failure.id})" 
                                title="Editar Falla">
                            <i class="fas fa-edit"></i>
                        </button>
                        ` : ''}
                        
                        ${authSystem.hasPermission('admin') ? `
                        <button class="btn-action btn-delete" 
                                onclick="maintenanceSystem.deleteFailure(${failure.id})" 
                                title="Eliminar Falla">
                            <i class="fas fa-trash"></i>
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    hasUrgentPriority(failure) {
        return failure.prioridad === 'Alta';
    }

    getPriorityIcon(prioridad) {
        const icons = {
            'Alta': 'exclamation-triangle',
            'Media': 'exclamation-circle',
            'Baja': 'info-circle'
        };
        return icons[prioridad] || 'info-circle';
    }

    async showFailureForm(failureId = null) {
        if (!authSystem.hasPermission('operator')) {
            this.showError('No tiene permisos para registrar fallas');
            return;
        }

        const failure = failureId ? this.failures.find(f => f.id === failureId) : null;
        const vehicles = await database.getVehicles();
        
        if (vehicles.length === 0) {
            this.showError('Primero debe registrar al menos un vehículo');
            return;
        }

        const formContent = `
            <form id="failureForm" onsubmit="maintenanceSystem.handleFailureSubmit(event)">
                <div class="form-section">
                    <h4><i class="fas fa-car-crash"></i> Información de la Falla</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="failurePlaca">
                                <i class="fas fa-car"></i> Vehículo *
                            </label>
                            <select id="failurePlaca" required>
                                <option value="">Seleccionar vehículo</option>
                                ${vehicles.map(vehicle => `
                                    <option value="${vehicle.placa}" 
                                            data-id="${vehicle.id}"
                                            ${failure && failure.placa === vehicle.placa ? 'selected' : ''}>
                                        ${vehicle.placa} - ${this.escapeHtml(vehicle.marca)} ${this.escapeHtml(vehicle.modelo)}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="failureComponente">
                                <i class="fas fa-cog"></i> Componente *
                            </label>
                            <select id="failureComponente" required>
                                <option value="">Seleccionar componente</option>
                                ${this.componentsList.map(comp => `
                                    <option value="${comp}" 
                                            ${failure && failure.componente === comp ? 'selected' : ''}>
                                        ${comp}
                                    </option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4><i class="fas fa-calendar-alt"></i> Fecha y Prioridad</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="failureFecha">
                                <i class="fas fa-clock"></i> Fecha y Hora *
                            </label>
                            <input type="datetime-local" id="failureFecha" required>
                        </div>
                        <div class="form-group">
                            <label for="failurePrioridad">
                                <i class="fas fa-flag"></i> Prioridad *
                            </label>
                            <select id="failurePrioridad" required>
                                <option value="Alta" ${failure && failure.prioridad === 'Alta' ? 'selected' : ''}>
                                    🔴 Alta - Requiere atención inmediata
                                </option>
                                <option value="Media" ${(!failure || failure.prioridad === 'Media') ? 'selected' : ''}>
                                    🟡 Media - Atender en 24-48 horas
                                </option>
                                <option value="Baja" ${failure && failure.prioridad === 'Baja' ? 'selected' : ''}>
                                    🟢 Baja - Atender cuando sea posible
                                </option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4><i class="fas fa-map-marker-alt"></i> Ubicación y Descripción</h4>
                    <div class="form-group">
                        <label for="failureUbicacion">
                            <i class="fas fa-location-arrow"></i> Ubicación *
                        </label>
                        <input type="text" id="failureUbicacion" 
                               value="${failure ? this.escapeHtml(failure.ubicacion) : ''}" 
                               required 
                               placeholder="Ej: Taller Central - Norte, Ruta 5 km 25, etc.">
                    </div>
                    <div class="form-group">
                        <label for="failureDescripcion">
                            <i class="fas fa-file-alt"></i> Descripción *
                        </label>
                        <textarea id="failureDescripcion" rows="4" required
                                  placeholder="Describa en detalle la falla encontrada, síntomas, condiciones de operación, etc...">${failure ? this.escapeHtml(failure.descripcion) : ''}</textarea>
                        <small class="char-counter">
                            <span id="descCharCount">0</span>/500 caracteres
                        </small>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i> ${failure ? 'Actualizar' : 'Registrar'} Falla
                    </button>
                </div>
                <input type="hidden" id="failureId" value="${failure ? failure.id : ''}">
            </form>
        `;

        showModal(failure ? 'Editar Falla' : 'Registrar Nueva Falla', formContent);
        
        // Establecer fecha y hora actual por defecto
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('failureFecha').value = now.toISOString().slice(0, 16);

        // Configurar contador de caracteres
        const descTextarea = document.getElementById('failureDescripcion');
        const charCount = document.getElementById('descCharCount');
        
        if (descTextarea && charCount) {
            charCount.textContent = descTextarea.value.length;
            descTextarea.addEventListener('input', () => {
                charCount.textContent = descTextarea.value.length;
                if (descTextarea.value.length > 500) {
                    charCount.classList.add('text-danger');
                } else {
                    charCount.classList.remove('text-danger');
                }
            });
        }

        // Poner foco en el primer campo
        setTimeout(() => {
            const placaSelect = document.getElementById('failurePlaca');
            if (placaSelect) {
                placaSelect.focus();
            }
        }, 100);
    }

    async handleFailureSubmit(event) {
        event.preventDefault();
        
        if (!authSystem.hasPermission('operator')) {
            this.showError('No tiene permisos para realizar esta acción');
            return;
        }

        const placaSelect = document.getElementById('failurePlaca');
        const selectedOption = placaSelect.options[placaSelect.selectedIndex];
        
        const formData = {
            vehicleId: parseInt(selectedOption.getAttribute('data-id')),
            placa: placaSelect.value,
            componente: document.getElementById('failureComponente').value,
            fechaHora: document.getElementById('failureFecha').value,
            ubicacion: document.getElementById('failureUbicacion').value.trim(),
            descripcion: document.getElementById('failureDescripcion').value.trim(),
            prioridad: document.getElementById('failurePrioridad').value,
            estado: 'Abierta'
        };

        // Validaciones
        if (formData.descripcion.length > 500) {
            this.showError('La descripción no puede exceder los 500 caracteres');
            document.getElementById('failureDescripcion').focus();
            return;
        }

        if (formData.descripcion.length < 10) {
            this.showError('La descripción debe tener al menos 10 caracteres');
            document.getElementById('failureDescripcion').focus();
            return;
        }

        try {
            const failureId = document.getElementById('failureId').value;
            let result;
            
            if (failureId) {
                // Actualizar falla existente
                result = await database.updateFailure(parseInt(failureId), formData);
                this.showSuccess('Falla actualizada exitosamente');
            } else {
                // Nueva falla
                result = await database.createFailure(formData);
                this.showSuccess('Falla registrada exitosamente');
            }

            await this.loadFailures();
            closeModal();
            
        } catch (error) {
            console.error('Error guardando falla:', error);
            this.showError('Error al guardar la falla: ' + error.message);
        }
    }

    async startMaintenance(failureId) {
        if (!authSystem.hasPermission('operator')) {
            this.showError('No tiene permisos para iniciar mantenimiento');
            return;
        }

        const failure = this.failures.find(f => f.id === failureId);
        if (!failure) {
            this.showError('Falla no encontrada');
            return;
        }

        const confirmation = await this.showConfirmation(
            'Iniciar Mantenimiento',
            `¿Está seguro de iniciar el mantenimiento para la falla en <strong>${this.escapeHtml(failure.placa)}</strong>?<br>
             <small>Componente: ${this.escapeHtml(failure.componente)}</small>`,
            'info'
        );

        if (!confirmation) return;

        try {
            this.showLoading('Iniciando mantenimiento...');
            await database.updateFailure(failureId, { estado: 'En Proceso' });
            await this.loadFailures();
            this.showSuccess('Mantenimiento iniciado exitosamente');
        } catch (error) {
            console.error('Error iniciando mantenimiento:', error);
            this.showError('Error al iniciar el mantenimiento: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async showMaintenanceForm(failureId) {
        if (!authSystem.hasPermission('operator')) {
            this.showError('No tiene permisos para completar mantenimiento');
            return;
        }

        const failure = this.failures.find(f => f.id === failureId);
        if (!failure) {
            this.showError('Falla no encontrada');
            return;
        }

        const existingMaintenance = await database.getMaintenanceByFailure(failureId);
        
        const formContent = `
            <form onsubmit="maintenanceSystem.handleMaintenanceSubmit(event, ${failureId})">
                <div class="maintenance-header">
                    <h4>
                        <i class="fas fa-tools"></i> 
                        Completar Mantenimiento - ${this.escapeHtml(failure.placa)}
                    </h4>
                    <div class="failure-info">
                        <div><strong>Componente:</strong> ${this.escapeHtml(failure.componente)}</div>
                        <div><strong>Descripción:</strong> ${this.escapeHtml(failure.descripcion)}</div>
                    </div>
                </div>

                <div class="form-section">
                    <h4><i class="fas fa-building"></i> Información del Taller</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="maintenanceTaller">
                                <i class="fas fa-warehouse"></i> Taller/Proveedor *
                            </label>
                            <input type="text" id="maintenanceTaller" 
                                   value="${existingMaintenance ? this.escapeHtml(existingMaintenance.taller) : ''}" 
                                   required 
                                   placeholder="Nombre del taller o proveedor">
                        </div>
                        <div class="form-group">
                            <label for="maintenanceCosto">
                                <i class="fas fa-money-bill-wave"></i> Costo de Reparación *
                            </label>
                            <input type="number" id="maintenanceCosto" 
                                   step="0.01" 
                                   min="0"
                                   value="${existingMaintenance ? existingMaintenance.costo : ''}" 
                                   required 
                                   placeholder="0.00">
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4><i class="fas fa-calendar-alt"></i> Fechas del Mantenimiento</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="maintenanceFechaInicio">
                                <i class="fas fa-play-circle"></i> Fecha Inicio *
                            </label>
                            <input type="datetime-local" id="maintenanceFechaInicio" required>
                        </div>
                        <div class="form-group">
                            <label for="maintenanceFechaFin">
                                <i class="fas fa-check-circle"></i> Fecha Fin *
                            </label>
                            <input type="datetime-local" id="maintenanceFechaFin" required>
                        </div>
                    </div>
                </div>

                <div class="form-section">
                    <h4><i class="fas fa-user-cog"></i> Información de la Reparación</h4>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="maintenanceReparadaPor">
                                <i class="fas fa-users"></i> Reparada por *
                            </label>
                            <select id="maintenanceReparadaPor" required>
                                <option value="Interno" ${existingMaintenance && existingMaintenance.reparadaPor === 'Interno' ? 'selected' : ''}>
                                    🔧 Interno - Nuestro personal
                                </option>
                                <option value="Contratista" ${existingMaintenance && existingMaintenance.reparadaPor === 'Contratista' ? 'selected' : ''}>
                                    🏢 Contratista - Tercerizado
                                </option>
                                <option value="Mix" ${existingMaintenance && existingMaintenance.reparadaPor === 'Mix' ? 'selected' : ''}>
                                    🔄 Mix - Combinación
                                </option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="maintenanceNotas">
                            <i class="fas fa-sticky-note"></i> Notas del Mecánico
                        </label>
                        <textarea id="maintenanceNotas" rows="4" 
                                  placeholder="Descripción del trabajo realizado, piezas reemplazadas, observaciones, recomendaciones...">${existingMaintenance ? this.escapeHtml(existingMaintenance.notas || '') : ''}</textarea>
                        <small class="char-counter">
                            <span id="notesCharCount">0</span>/1000 caracteres
                        </small>
                    </div>
                </div>

                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times"></i> Cancelar
                    </button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-check"></i> Completar Mantenimiento
                    </button>
                </div>
            </form>
        `;

        showModal('Completar Mantenimiento', formContent);

        // Establecer fechas por defecto
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
        
        document.getElementById('maintenanceFechaInicio').value = oneHourAgo.toISOString().slice(0, 16);
        document.getElementById('maintenanceFechaFin').value = now.toISOString().slice(0, 16);

        // Si existe mantenimiento previo, cargar datos
        if (existingMaintenance) {
            document.getElementById('maintenanceFechaInicio').value = existingMaintenance.fechaInicio.slice(0, 16);
            document.getElementById('maintenanceFechaFin').value = existingMaintenance.fechaFin ? existingMaintenance.fechaFin.slice(0, 16) : now.toISOString().slice(0, 16);
        }

        // Configurar contador de caracteres para notas
        const notesTextarea = document.getElementById('maintenanceNotas');
        const notesCharCount = document.getElementById('notesCharCount');
        
        if (notesTextarea && notesCharCount) {
            notesCharCount.textContent = notesTextarea.value.length;
            notesTextarea.addEventListener('input', () => {
                notesCharCount.textContent = notesTextarea.value.length;
                if (notesTextarea.value.length > 1000) {
                    notesCharCount.classList.add('text-danger');
                } else {
                    notesCharCount.classList.remove('text-danger');
                }
            });
        }

        // Poner foco en el primer campo
        setTimeout(() => {
            const tallerInput = document.getElementById('maintenanceTaller');
            if (tallerInput) {
                tallerInput.focus();
            }
        }, 100);
    }

    async handleMaintenanceSubmit(event, failureId) {
        event.preventDefault();
        
        const fechaInicio = new Date(document.getElementById('maintenanceFechaInicio').value);
        const fechaFin = new Date(document.getElementById('maintenanceFechaFin').value);

        // Validaciones de fecha
        if (fechaFin <= fechaInicio) {
            this.showError('La fecha de fin debe ser posterior a la fecha de inicio');
            document.getElementById('maintenanceFechaFin').focus();
            return;
        }

        if (fechaFin > new Date()) {
            this.showError('La fecha de fin no puede ser futura');
            document.getElementById('maintenanceFechaFin').focus();
            return;
        }

        const maintenanceData = {
            failureId: failureId,
            taller: document.getElementById('maintenanceTaller').value.trim(),
            costo: parseFloat(document.getElementById('maintenanceCosto').value),
            fechaInicio: document.getElementById('maintenanceFechaInicio').value,
            fechaFin: document.getElementById('maintenanceFechaFin').value,
            reparadaPor: document.getElementById('maintenanceReparadaPor').value,
            notas: document.getElementById('maintenanceNotas').value.trim()
        };

        // Validaciones
        if (maintenanceData.costo < 0) {
            this.showError('El costo no puede ser negativo');
            document.getElementById('maintenanceCosto').focus();
            return;
        }

        if (maintenanceData.notas.length > 1000) {
            this.showError('Las notas no pueden exceder los 1000 caracteres');
            document.getElementById('maintenanceNotas').focus();
            return;
        }

        try {
            const existingMaintenance = await database.getMaintenanceByFailure(failureId);
            
            if (existingMaintenance) {
                // Actualizar registro existente
                await database.updateMaintenance(existingMaintenance.id, maintenanceData);
            } else {
                // Crear nuevo registro
                await database.createMaintenanceRecord(maintenanceData);
            }
            
            // Actualizar estado de la falla
            await database.updateFailure(failureId, { estado: 'Resuelta' });
            
            this.showSuccess('Mantenimiento completado exitosamente');
            await this.loadFailures();
            closeModal();
            
        } catch (error) {
            console.error('Error completando mantenimiento:', error);
            this.showError('Error al completar el mantenimiento: ' + error.message);
        }
    }

    async viewFailure(failureId) {
        const failure = this.failures.find(f => f.id === failureId);
        if (!failure) {
            this.showError('Falla no encontrada');
            return;
        }

        try {
            this.showLoading('Cargando información...');
            
            const maintenance = await database.getMaintenanceByFailure(failureId);
            const vehicle = await database.getVehicleById(failure.vehicleId);

            let solutionContent = '';
            if (maintenance) {
                const duration = this.calculateMaintenanceDuration(maintenance.fechaInicio, maintenance.fechaFin);
                const costoFormatted = maintenance.costo.toLocaleString('es-ES', {
                    style: 'currency',
                    currency: 'USD'
                });

                solutionContent = `
                    <div class="solution-section">
                        <h5><i class="fas fa-check-circle text-success"></i> Información de Solución</h5>
                        <div class="solution-grid">
                            <div class="solution-item">
                                <strong><i class="fas fa-warehouse"></i> Taller/Proveedor:</strong>
                                <span>${this.escapeHtml(maintenance.taller)}</span>
                            </div>
                            <div class="solution-item">
                                <strong><i class="fas fa-money-bill-wave"></i> Costo:</strong>
                                <span class="costo">${costoFormatted}</span>
                            </div>
                            <div class="solution-item">
                                <strong><i class="fas fa-play-circle"></i> Fecha Inicio:</strong>
                                <span>${new Date(maintenance.fechaInicio).toLocaleString()}</span>
                            </div>
                            <div class="solution-item">
                                <strong><i class="fas fa-check-circle"></i> Fecha Fin:</strong>
                                <span>${new Date(maintenance.fechaFin).toLocaleString()}</span>
                            </div>
                            <div class="solution-item">
                                <strong><i class="fas fa-clock"></i> Duración:</strong>
                                <span>${duration}</span>
                            </div>
                            <div class="solution-item">
                                <strong><i class="fas fa-users"></i> Reparada por:</strong>
                                <span class="reparada-por ${maintenance.reparadaPor.toLowerCase()}">
                                    ${maintenance.reparadaPor}
                                </span>
                            </div>
                        </div>
                        ${maintenance.notas ? `
                        <div class="solution-notes">
                            <strong><i class="fas fa-sticky-note"></i> Notas del Mecánico:</strong>
                            <div class="notes-content">${this.escapeHtml(maintenance.notas)}</div>
                        </div>
                        ` : ''}
                    </div>
                `;
            }

            const content = `
                <div class="failure-details">
                    <div class="details-header">
                        <h4>
                            <i class="fas fa-exclamation-triangle"></i> 
                            Detalles de la Falla - ${this.escapeHtml(failure.placa)}
                        </h4>
                        <div class="failure-status ${failure.estado.toLowerCase().replace(' ', '-')}">
                            <i class="fas fa-${this.getStatusIcon(failure.estado)}"></i>
                            ${failure.estado}
                        </div>
                    </div>

                    <div class="failure-info-grid">
                        <div class="info-section">
                            <h5><i class="fas fa-info-circle"></i> Información General</h5>
                            <div class="info-grid">
                                <div class="info-item">
                                    <strong>Vehículo:</strong>
                                    <span>${this.escapeHtml(failure.placa)}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Marca/Modelo:</strong>
                                    <span>${vehicle ? `${this.escapeHtml(vehicle.marca)} ${this.escapeHtml(vehicle.modelo)}` : 'N/A'}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Componente:</strong>
                                    <span>${this.escapeHtml(failure.componente)}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Prioridad:</strong>
                                    <span class="status-badge priority-${failure.prioridad.toLowerCase()}">
                                        ${failure.prioridad}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div class="info-section">
                            <h5><i class="fas fa-calendar-alt"></i> Fecha y Ubicación</h5>
                            <div class="info-grid">
                                <div class="info-item">
                                    <strong>Fecha y Hora:</strong>
                                    <span>${new Date(failure.fechaHora).toLocaleString()}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Ubicación:</strong>
                                    <span>${this.escapeHtml(failure.ubicacion)}</span>
                                </div>
                                <div class="info-item">
                                    <strong>Registrado hace:</strong>
                                    <span>${this.getTimeAgo(new Date(failure.createdAt))}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="description-section">
                        <h5><i class="fas fa-file-alt"></i> Descripción de la Falla</h5>
                        <div class="description-content">
                            ${this.escapeHtml(failure.descripcion)}
                        </div>
                    </div>

                    ${solutionContent}

                    <div class="details-actions">
                        ${failure.estado === 'Abierta' && authSystem.hasPermission('operator') ? `
                        <button class="btn-success" onclick="maintenanceSystem.startMaintenance(${failure.id})">
                            <i class="fas fa-play"></i> Iniciar Mantenimiento
                        </button>
                        ` : ''}
                        
                        ${failure.estado === 'En Proceso' && authSystem.hasPermission('operator') ? `
                        <button class="btn-primary" onclick="maintenanceSystem.showMaintenanceForm(${failure.id})">
                            <i class="fas fa-check"></i> Completar Mantenimiento
                        </button>
                        ` : ''}
                        
                        ${failure.estado !== 'Resuelta' && authSystem.hasPermission('operator') ? `
                        <button class="btn-secondary" onclick="maintenanceSystem.editFailure(${failure.id})">
                            <i class="fas fa-edit"></i> Editar Falla
                        </button>
                        ` : ''}
                    </div>
                </div>
            `;

            showModal(`Detalles - ${failure.placa}`, content);
            
        } catch (error) {
            console.error('Error cargando detalles:', error);
            this.showError('Error al cargar los detalles de la falla: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    calculateMaintenanceDuration(start, end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        const diffMs = endDate - startDate;
        
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
            return `${days}d ${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else {
            return `${minutes}m`;
        }
    }

    getStatusIcon(estado) {
        const icons = {
            'Abierta': 'clock',
            'En Proceso': 'tools',
            'Resuelta': 'check-circle'
        };
        return icons[estado] || 'question-circle';
    }

    getTimeAgo(date) {
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

    async editFailure(failureId) {
        if (!authSystem.hasPermission('operator')) {
            this.showError('No tiene permisos para editar fallas');
            return;
        }
        await this.showFailureForm(failureId);
    }

    async deleteFailure(failureId) {
        if (!authSystem.hasPermission('admin')) {
            this.showError('No tiene permisos para eliminar fallas');
            return;
        }

        const failure = this.failures.find(f => f.id === failureId);
        if (!failure) {
            this.showError('Falla no encontrada');
            return;
        }

        const confirmation = await this.showConfirmation(
            'Eliminar Falla',
            `¿Está seguro de eliminar la falla del vehículo <strong>${this.escapeHtml(failure.placa)}</strong>?<br>
             <small class="text-danger">Esta acción también eliminará el registro de mantenimiento asociado.</small>`,
            'warning'
        );

        if (!confirmation) return;

        try {
            this.showLoading('Eliminando falla...');
            await database.deleteFailure(failureId);
            await this.loadFailures();
            this.showSuccess('Falla eliminada exitosamente');
        } catch (error) {
            console.error('Error eliminando falla:', error);
            this.showError('Error al eliminar la falla: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    showFullDescription(failureId) {
        const failure = this.failures.find(f => f.id === failureId);
        if (!failure) return;

        const content = `
            <div class="full-description">
                <h5>Descripción Completa</h5>
                <div class="description-content">
                    ${this.escapeHtml(failure.descripcion)}
                </div>
                <div class="description-meta">
                    <small>Vehículo: ${this.escapeHtml(failure.placa)} | Componente: ${this.escapeHtml(failure.componente)}</small>
                </div>
                <div class="form-actions">
                    <button class="btn-secondary" onclick="closeModal()">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                </div>
            </div>
        `;

        showModal('Descripción Completa', content);
    }

    filterFailures(searchTerm) {
        if (!searchTerm) {
            this.filteredFailures = [...this.failures];
        } else {
            const term = searchTerm.toLowerCase();
            this.filteredFailures = this.failures.filter(failure =>
                failure.placa.toLowerCase().includes(term) ||
                failure.componente.toLowerCase().includes(term) ||
                failure.ubicacion.toLowerCase().includes(term) ||
                failure.descripcion.toLowerCase().includes(term)
            );
        }
        this.renderFailuresTables();
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

// Funciones globales
function showFailureForm() {
    if (window.maintenanceSystem) {
        window.maintenanceSystem.showFailureForm();
    }
}

// Inicializar sistema de mantenimiento
window.maintenanceSystem = new MaintenanceSystem();
