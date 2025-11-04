// Sistema de Gestión de Mantenimiento y Fallas - ACTUALIZADO
class MaintenanceSystem {
    constructor() {
        this.failures = [];
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
            this.failures = await database.getFailures();
            this.renderFailuresTables();
        } catch (error) {
            console.error('Error cargando fallas:', error);
            this.showError('Error al cargar las fallas');
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
    }

    renderFailuresTables() {
        this.renderFailuresTable('openFailuresTableBody', this.failures.filter(f => f.estado === 'Abierta'));
        this.renderFailuresTable('inProgressFailuresTableBody', this.failures.filter(f => f.estado === 'En Proceso'));
        this.renderFailuresTable('resolvedFailuresTableBody', this.failures.filter(f => f.estado === 'Resuelta'));
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
                    </td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = failures.map(failure => `
            <tr>
                <td><strong>${failure.placa}</strong></td>
                <td>${failure.componente}</td>
                <td>${new Date(failure.fechaHora).toLocaleString()}</td>
                <td><span class="status-badge priority-${failure.prioridad.toLowerCase()}">${failure.prioridad}</span></td>
                <td>${failure.descripcion.substring(0, 50)}${failure.descripcion.length > 50 ? '...' : ''}</td>
                <td>
                    ${failure.estado === 'Abierta' ? `
                        <button class="btn-action btn-success" onclick="maintenanceSystem.startMaintenance(${failure.id})" title="Iniciar Mantenimiento">
                            <i class="fas fa-play"></i>
                        </button>
                    ` : ''}
                    ${failure.estado === 'En Proceso' ? `
                        <button class="btn-action btn-success" onclick="maintenanceSystem.showMaintenanceForm(${failure.id})" title="Completar Mantenimiento">
                            <i class="fas fa-check"></i>
                        </button>
                    ` : ''}
                    <button class="btn-action btn-edit" onclick="maintenanceSystem.viewFailure(${failure.id})" title="Ver Detalles">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="maintenanceSystem.deleteFailure(${failure.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async showFailureForm() {
        const vehicles = await database.getVehicles();
        
        if (vehicles.length === 0) {
            alert('❌ Primero debe registrar al menos un vehículo');
            return;
        }

        const formContent = `
            <form id="failureForm" onsubmit="maintenanceSystem.handleFailureSubmit(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label for="failurePlaca">Vehículo *</label>
                        <select id="failurePlaca" required>
                            <option value="">Seleccionar vehículo</option>
                            ${vehicles.map(vehicle => `
                                <option value="${vehicle.placa}" data-id="${vehicle.id}">
                                    ${vehicle.placa} - ${vehicle.marca} ${vehicle.modelo}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="failureComponente">Componente *</label>
                        <select id="failureComponente" required>
                            <option value="">Seleccionar componente</option>
                            ${this.componentsList.map(comp => `
                                <option value="${comp}">${comp}</option>
                            `).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="failureFecha">Fecha y Hora *</label>
                        <input type="datetime-local" id="failureFecha" required>
                    </div>
                    <div class="form-group">
                        <label for="failurePrioridad">Prioridad *</label>
                        <select id="failurePrioridad" required>
                            <option value="Alta">Alta</option>
                            <option value="Media" selected>Media</option>
                            <option value="Baja">Baja</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label for="failureUbicacion">Ubicación *</label>
                    <input type="text" id="failureUbicacion" required 
                           placeholder="Ej: Taller Central - Norte">
                </div>
                <div class="form-group">
                    <label for="failureDescripcion">Descripción *</label>
                    <textarea id="failureDescripcion" rows="4" required
                              placeholder="Describa en detalle la falla encontrada..."></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-exclamation-triangle"></i> Registrar Falla
                    </button>
                </div>
            </form>
        `;

        showModal('Registrar Nueva Falla', formContent);
        
        // Establecer fecha y hora actual por defecto
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        document.getElementById('failureFecha').value = now.toISOString().slice(0, 16);
    }

    async handleFailureSubmit(event) {
        event.preventDefault();
        
        const placaSelect = document.getElementById('failurePlaca');
        const selectedOption = placaSelect.options[placaSelect.selectedIndex];
        
        const formData = {
            vehicleId: parseInt(selectedOption.getAttribute('data-id')),
            placa: placaSelect.value,
            componente: document.getElementById('failureComponente').value,
            fechaHora: document.getElementById('failureFecha').value,
            ubicacion: document.getElementById('failureUbicacion').value,
            descripcion: document.getElementById('failureDescripcion').value,
            prioridad: document.getElementById('failurePrioridad').value,
            estado: 'Abierta'
        };

        try {
            await database.createFailure(formData);
            this.showSuccess('Falla registrada exitosamente');
            await this.loadFailures();
            closeModal();
        } catch (error) {
            console.error('Error registrando falla:', error);
            this.showError('Error al registrar la falla');
        }
    }

    async startMaintenance(failureId) {
        try {
            await database.updateFailure(failureId, { estado: 'En Proceso' });
            this.showSuccess('Mantenimiento iniciado');
            await this.loadFailures();
        } catch (error) {
            console.error('Error iniciando mantenimiento:', error);
            this.showError('Error al iniciar el mantenimiento');
        }
    }

    async showMaintenanceForm(failureId) {
        const failure = this.failures.find(f => f.id === failureId);
        if (!failure) return;

        const formContent = `
            <form onsubmit="maintenanceSystem.handleMaintenanceSubmit(event, ${failureId})">
                <h4>Completar Mantenimiento - ${failure.placa}</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label for="maintenanceTaller">Taller/Proveedor *</label>
                        <input type="text" id="maintenanceTaller" required 
                               placeholder="Nombre del taller o proveedor">
                    </div>
                    <div class="form-group">
                        <label for="maintenanceCosto">Costo de Reparación *</label>
                        <input type="number" id="maintenanceCosto" step="0.01" required 
                               placeholder="0.00">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="maintenanceFechaInicio">Fecha Inicio *</label>
                        <input type="datetime-local" id="maintenanceFechaInicio" required>
                    </div>
                    <div class="form-group">
                        <label for="maintenanceFechaFin">Fecha Fin *</label>
                        <input type="datetime-local" id="maintenanceFechaFin" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="maintenanceReparadaPor">Reparada por *</label>
                    <select id="maintenanceReparadaPor" required>
                        <option value="Interno">Interno</option>
                        <option value="Contratista">Contratista</option>
                        <option value="Mix">Mix</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="maintenanceNotas">Notas del Mecánico</label>
                    <textarea id="maintenanceNotas" rows="4" 
                              placeholder="Descripción del trabajo realizado..."></textarea>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
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
    }

    async handleMaintenanceSubmit(event, failureId) {
        event.preventDefault();
        
        const maintenanceData = {
            failureId: failureId,
            taller: document.getElementById('maintenanceTaller').value,
            costo: parseFloat(document.getElementById('maintenanceCosto').value),
            fechaInicio: document.getElementById('maintenanceFechaInicio').value,
            fechaFin: document.getElementById('maintenanceFechaFin').value,
            reparadaPor: document.getElementById('maintenanceReparadaPor').value,
            notas: document.getElementById('maintenanceNotas').value
        };

        try {
            // Crear registro de mantenimiento
            await database.createMaintenanceRecord(maintenanceData);
            
            // Actualizar estado de la falla
            await database.updateFailure(failureId, { estado: 'Resuelta' });
            
            this.showSuccess('Mantenimiento completado exitosamente');
            await this.loadFailures();
            closeModal();
        } catch (error) {
            console.error('Error completando mantenimiento:', error);
            this.showError('Error al completar el mantenimiento');
        }
    }

    async viewFailure(failureId) {
        const failure = this.failures.find(f => f.id === failureId);
        if (!failure) return;

        const maintenance = await database.getMaintenanceByFailure(failureId);
        
        let solutionContent = '';
        if (maintenance) {
            solutionContent = `
                <h4>Información de Solución</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Taller/Proveedor:</label>
                        <p>${maintenance.taller}</p>
                    </div>
                    <div class="form-group">
                        <label>Costo:</label>
                        <p>$${maintenance.costo.toLocaleString()}</p>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Fecha Inicio:</label>
                        <p>${new Date(maintenance.fechaInicio).toLocaleString()}</p>
                    </div>
                    <div class="form-group">
                        <label>Fecha Fin:</label>
                        <p>${new Date(maintenance.fechaFin).toLocaleString()}</p>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Reparada por:</label>
                        <p>${maintenance.reparadaPor}</p>
                    </div>
                </div>
                <div class="form-group">
                    <label>Notas del Mecánico:</label>
                    <p>${maintenance.notas || 'No hay notas'}</p>
                </div>
            `;
        }

        const content = `
            <div class="failure-details">
                <h4>Información de la Falla</h4>
                <div class="form-row">
                    <div class="form-group">
                        <label>Vehículo:</label>
                        <p>${failure.placa}</p>
                    </div>
                    <div class="form-group">
                        <label>Componente:</label>
                        <p>${failure.componente}</p>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Fecha y Hora:</label>
                        <p>${new Date(failure.fechaHora).toLocaleString()}</p>
                    </div>
                    <div class="form-group">
                        <label>Prioridad:</label>
                        <p><span class="status-badge priority-${failure.prioridad.toLowerCase()}">${failure.prioridad}</span></p>
                    </div>
                </div>
                <div class="form-group">
                    <label>Ubicación:</label>
                    <p>${failure.ubicacion}</p>
                </div>
                <div class="form-group">
                    <label>Descripción:</label>
                    <p>${failure.descripcion}</p>
                </div>
                <div class="form-group">
                    <label>Estado:</label>
                    <p><span class="status-badge status-${failure.estado.toLowerCase().replace(' ', '-')}">${failure.estado}</span></p>
                </div>
                ${solutionContent}
            </div>
        `;

        showModal('Detalles de la Falla', content);
    }

    async deleteFailure(failureId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta falla? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            // En una implementación real, también deberías eliminar el registro de mantenimiento asociado
            // await database.deleteMaintenanceByFailure(failureId);
            // await database.deleteFailure(failureId);
            
            this.showError('Función de eliminación no implementada completamente por seguridad');
        } catch (error) {
            console.error('Error eliminando falla:', error);
            this.showError('Error al eliminar la falla');
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
function showFailureForm() {
    window.maintenanceSystem.showFailureForm();
}

// Inicializar sistema de mantenimiento
window.maintenanceSystem = new MaintenanceSystem();
