// Sistema de Gestión de Vehículos - ACTUALIZADO CON BASE DE DATOS
class VehiclesSystem {
    constructor() {
        this.vehicles = [];
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
        await this.loadVehicles();
        this.setupEventListeners();
    }

    async loadVehicles() {
        try {
            this.vehicles = await database.getVehicles();
            this.renderVehiclesTable();
        } catch (error) {
            console.error('Error cargando vehículos:', error);
            this.showError('Error al cargar los vehículos');
        }
    }

    setupEventListeners() {
        // Búsqueda de vehículos
        const searchInput = document.getElementById('vehicleSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterVehicles(e.target.value);
            });
        }

        // Filtro por regional
        const regionalFilter = document.getElementById('regionalFilter');
        if (regionalFilter) {
            regionalFilter.addEventListener('change', (e) => {
                this.filterVehiclesByRegional(e.target.value);
            });
        }
    }

    renderVehiclesTable(vehicles = this.vehicles) {
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
            <tr>
                <td><strong>${vehicle.placa}</strong></td>
                <td>${vehicle.marca}</td>
                <td>${vehicle.modelo}</td>
                <td>${vehicle.año}</td>
                <td><span class="status-badge">${vehicle.regional}</span></td>
                <td>${vehicle.capacidad}</td>
                <td>${vehicle.odometroInicial.toLocaleString()} km</td>
                <td>
                    <button class="btn-action btn-edit" onclick="vehiclesSystem.editVehicle(${vehicle.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="vehiclesSystem.deleteVehicle(${vehicle.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                    <button class="btn-action btn-info" onclick="vehiclesSystem.manageComponents(${vehicle.id})" title="Gestionar Componentes">
                        <i class="fas fa-cogs"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    filterVehicles(searchTerm) {
        const filteredVehicles = this.vehicles.filter(vehicle =>
            vehicle.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.vin.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderVehiclesTable(filteredVehicles);
    }

    filterVehiclesByRegional(regional) {
        if (!regional) {
            this.renderVehiclesTable();
            return;
        }
        const filteredVehicles = this.vehicles.filter(vehicle => vehicle.regional === regional);
        this.renderVehiclesTable(filteredVehicles);
    }

    async showVehicleForm(vehicleId = null) {
        const vehicle = vehicleId ? this.vehicles.find(v => v.id === vehicleId) : null;
        
        const formContent = `
            <form id="vehicleForm" onsubmit="vehiclesSystem.handleVehicleSubmit(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label for="placa">Placa *</label>
                        <input type="text" id="placa" value="${vehicle ? vehicle.placa : ''}" required 
                               pattern="[A-Z0-9-]+" title="Solo letras mayúsculas, números y guiones">
                    </div>
                    <div class="form-group">
                        <label for="vin">VIN/Chasis *</label>
                        <input type="text" id="vin" value="${vehicle ? vehicle.vin : ''}" required
                               pattern="[A-Z0-9]{17}" title="17 caracteres alfanuméricos">
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="marca">Marca *</label>
                        <input type="text" id="marca" value="${vehicle ? vehicle.marca : ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="modelo">Modelo *</label>
                        <input type="text" id="modelo" value="${vehicle ? vehicle.modelo : ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="año">Año de Fabricación *</label>
                        <input type="number" id="año" min="2000" max="2030" 
                               value="${vehicle ? vehicle.año : new Date().getFullYear()}" required>
                    </div>
                    <div class="form-group">
                        <label for="capacidad">Capacidad *</label>
                        <input type="text" id="capacidad" value="${vehicle ? vehicle.capacidad : ''}" 
                               placeholder="Ej: 1500 kg" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="odometroInicial">Odómetro Inicial *</label>
                        <input type="number" id="odometroInicial" 
                               value="${vehicle ? vehicle.odometroInicial : '0'}" required>
                    </div>
                    <div class="form-group">
                        <label for="regional">Regional *</label>
                        <select id="regional" required>
                            <option value="">Seleccionar regional</option>
                            <option value="Norte" ${vehicle && vehicle.regional === 'Norte' ? 'selected' : ''}>Norte</option>
                            <option value="Sur" ${vehicle && vehicle.regional === 'Sur' ? 'selected' : ''}>Sur</option>
                            <option value="Centro" ${vehicle && vehicle.regional === 'Centro' ? 'selected' : ''}>Centro</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">
                        <i class="fas fa-save"></i> ${vehicle ? 'Actualizar' : 'Guardar'} Vehículo
                    </button>
                </div>
                <input type="hidden" id="vehicleId" value="${vehicle ? vehicle.id : ''}">
            </form>
        `;

        showModal(vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo', formContent);
    }

    async handleVehicleSubmit(event) {
        event.preventDefault();
        
        const formData = {
            placa: document.getElementById('placa').value.toUpperCase(),
            vin: document.getElementById('vin').value.toUpperCase(),
            marca: document.getElementById('marca').value,
            modelo: document.getElementById('modelo').value,
            año: parseInt(document.getElementById('año').value),
            capacidad: document.getElementById('capacidad').value,
            odometroInicial: parseInt(document.getElementById('odometroInicial').value),
            regional: document.getElementById('regional').value
        };

        try {
            const vehicleId = document.getElementById('vehicleId').value;
            
            if (vehicleId) {
                // Actualizar vehículo existente
                await database.updateVehicle(parseInt(vehicleId), formData);
                this.showSuccess('Vehículo actualizado exitosamente');
            } else {
                // Nuevo vehículo
                await database.createVehicle(formData);
                this.showSuccess('Vehículo creado exitosamente');
            }

            await this.loadVehicles();
            closeModal();
            
        } catch (error) {
            console.error('Error guardando vehículo:', error);
            this.showError('Error al guardar el vehículo: ' + error.message);
        }
    }

    async editVehicle(vehicleId) {
        await this.showVehicleForm(vehicleId);
    }

    async deleteVehicle(vehicleId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este vehículo? Esta acción no se puede deshacer.')) {
            return;
        }

        try {
            await database.deleteVehicle(vehicleId);
            await this.loadVehicles();
            this.showSuccess('Vehículo eliminado exitosamente');
        } catch (error) {
            console.error('Error eliminando vehículo:', error);
            this.showError('Error al eliminar el vehículo');
        }
    }

    async manageComponents(vehicleId) {
        const vehicle = this.vehicles.find(v => v.id === vehicleId);
        if (!vehicle) return;

        const components = await database.getComponentsByVehicle(vehicleId);
        
        const componentsContent = `
            <div class="components-management">
                <h4>Gestión de Componentes - ${vehicle.placa}</h4>
                <div class="components-list">
                    <h5>Componentes Registrados</h5>
                    ${components.length === 0 ? 
                        '<p class="empty-state">No hay componentes registrados</p>' :
                        components.map(comp => `
                            <div class="component-item">
                                <strong>${comp.nombre}</strong>
                                <div>Instalado: ${new Date(comp.fechaInstalacion).toLocaleDateString()}</div>
                                <div>Vida útil: ${comp.vidaUtil} meses</div>
                                <div>Características: ${comp.caracteristicas || 'No especificadas'}</div>
                            </div>
                        `).join('')
                    }
                </div>
                
                <div class="add-component-form">
                    <h5>Agregar Nuevo Componente</h5>
                    <form onsubmit="vehiclesSystem.handleAddComponent(event, ${vehicleId})">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="componentName">Componente *</label>
                                <select id="componentName" required>
                                    <option value="">Seleccionar componente</option>
                                    ${this.componentsList.map(comp => 
                                        `<option value="${comp}">${comp}</option>`
                                    ).join('')}
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="vidaUtil">Vida Útil (meses) *</label>
                                <input type="number" id="vidaUtil" min="1" max="120" value="12" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="fechaInstalacion">Fecha de Instalación *</label>
                            <input type="date" id="fechaInstalacion" value="${new Date().toISOString().split('T')[0]}" required>
                        </div>
                        <div class="form-group">
                            <label for="caracteristicas">Características Específicas</label>
                            <textarea id="caracteristicas" rows="3" placeholder="Detalles específicos del componente..."></textarea>
                        </div>
                        <div class="form-actions">
                            <button type="submit" class="btn-primary">
                                <i class="fas fa-plus"></i> Agregar Componente
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        showModal(`Componentes - ${vehicle.placa}`, componentsContent);
    }

    async handleAddComponent(event, vehicleId) {
        event.preventDefault();
        
        const componentData = {
            vehicleId: vehicleId,
            nombre: document.getElementById('componentName').value,
            vidaUtil: parseInt(document.getElementById('vidaUtil').value),
            fechaInstalacion: document.getElementById('fechaInstalacion').value,
            caracteristicas: document.getElementById('caracteristicas').value
        };

        try {
            await database.createComponent(componentData);
            this.showSuccess('Componente agregado exitosamente');
            this.manageComponents(vehicleId); // Recargar la vista
        } catch (error) {
            console.error('Error agregando componente:', error);
            this.showError('Error al agregar el componente');
        }
    }

    showSuccess(message) {
        alert('✅ ' + message); // En una app real, usarías un sistema de notificaciones
    }

    showError(message) {
        alert('❌ ' + message);
    }
}

// Funciones globales
function showVehicleForm() {
    window.vehiclesSystem.showVehicleForm();
}

// Inicializar sistema de vehículos
window.vehiclesSystem = new VehiclesSystem();
