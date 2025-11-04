// Sistema de Gestión de Vehículos
class VehiclesSystem {
    constructor() {
        this.vehicles = this.loadVehiclesFromStorage();
        this.init();
    }

    init() {
        this.setupEventListeners();
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

    loadVehiclesFromStorage() {
        const storedVehicles = localStorage.getItem('flota_vehicles');
        if (storedVehicles) {
            return JSON.parse(storedVehicles);
        } else {
            // Datos de ejemplo
            return [
                {
                    id: 1,
                    placa: 'ABC-123',
                    vin: '1HGCM82633A123456',
                    marca: 'Toyota',
                    modelo: 'Hilux',
                    año: 2022,
                    capacidad: '1500 kg',
                    odometroInicial: 15000,
                    regional: 'Norte',
                    componentes: []
                },
                {
                    id: 2,
                    placa: 'XYZ-789',
                    vin: '2FMDK3GC5DBA12345',
                    marca: 'Ford',
                    modelo: 'Ranger',
                    año: 2023,
                    capacidad: '1800 kg',
                    odometroInicial: 8000,
                    regional: 'Sur',
                    componentes: []
                }
            ];
        }
    }

    saveVehiclesToStorage() {
        localStorage.setItem('flota_vehicles', JSON.stringify(this.vehicles));
    }

    loadVehicles() {
        const tableBody = document.getElementById('vehiclesTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = this.vehicles.map(vehicle => `
            <tr>
                <td>${vehicle.placa}</td>
                <td>${vehicle.marca}</td>
                <td>${vehicle.modelo}</td>
                <td>${vehicle.año}</td>
                <td>${vehicle.regional}</td>
                <td>${vehicle.capacidad}</td>
                <td>${vehicle.odometroInicial.toLocaleString()} km</td>
                <td>
                    <button class="btn-action btn-edit" onclick="vehiclesSystem.editVehicle(${vehicle.id})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="vehiclesSystem.deleteVehicle(${vehicle.id})" title="Eliminar">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    filterVehicles(searchTerm) {
        const filteredVehicles = this.vehicles.filter(vehicle =>
            vehicle.placa.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.marca.toLowerCase().includes(searchTerm.toLowerCase()) ||
            vehicle.modelo.toLowerCase().includes(searchTerm.toLowerCase())
        );
        this.renderVehiclesTable(filteredVehicles);
    }

    filterVehiclesByRegional(regional) {
        if (!regional) {
            this.loadVehicles();
            return;
        }

        const filteredVehicles = this.vehicles.filter(vehicle =>
            vehicle.regional === regional
        );
        this.renderVehiclesTable(filteredVehicles);
    }

    renderVehiclesTable(vehicles) {
        const tableBody = document.getElementById('vehiclesTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = vehicles.map(vehicle => `
            <tr>
                <td>${vehicle.placa}</td>
                <td>${vehicle.marca}</td>
                <td>${vehicle.modelo}</td>
                <td>${vehicle.año}</td>
                <td>${vehicle.regional}</td>
                <td>${vehicle.capacidad}</td>
                <td>${vehicle.odometroInicial.toLocaleString()} km</td>
                <td>
                    <button class="btn-action btn-edit" onclick="vehiclesSystem.editVehicle(${vehicle.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-action btn-delete" onclick="vehiclesSystem.deleteVehicle(${vehicle.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    showVehicleForm(vehicleId = null) {
        const vehicle = vehicleId ? this.vehicles.find(v => v.id === vehicleId) : null;
        
        const formContent = `
            <form id="vehicleForm" onsubmit="vehiclesSystem.handleVehicleSubmit(event)">
                <div class="form-row">
                    <div class="form-group">
                        <label for="placa">Placa *</label>
                        <input type="text" id="placa" value="${vehicle ? vehicle.placa : ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="vin">VIN/Chasis *</label>
                        <input type="text" id="vin" value="${vehicle ? vehicle.vin : ''}" required>
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
                        <input type="number" id="año" min="2000" max="2030" value="${vehicle ? vehicle.año : '2023'}" required>
                    </div>
                    <div class="form-group">
                        <label for="capacidad">Capacidad *</label>
                        <input type="text" id="capacidad" value="${vehicle ? vehicle.capacidad : ''}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="odometroInicial">Odómetro Inicial *</label>
                        <input type="number" id="odometroInicial" value="${vehicle ? vehicle.odometroInicial : '0'}" required>
                    </div>
                    <div class="form-group">
                        <label for="regional">Regional *</label>
                        <select id="regional" required>
                            <option value="Norte" ${vehicle && vehicle.regional === 'Norte' ? 'selected' : ''}>Norte</option>
                            <option value="Sur" ${vehicle && vehicle.regional === 'Sur' ? 'selected' : ''}>Sur</option>
                            <option value="Centro" ${vehicle && vehicle.regional === 'Centro' ? 'selected' : ''}>Centro</option>
                        </select>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                    <button type="submit" class="btn-primary">${vehicle ? 'Actualizar' : 'Guardar'} Vehículo</button>
                </div>
                <input type="hidden" id="vehicleId" value="${vehicle ? vehicle.id : ''}">
            </form>
        `;

        showModal(vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo', formContent);
    }

    handleVehicleSubmit(event) {
        event.preventDefault();
        
        const formData = {
            id: document.getElementById('vehicleId').value || Date.now(),
            placa: document.getElementById('placa').value,
            vin: document.getElementById('vin').value,
            marca: document.getElementById('marca').value,
            modelo: document.getElementById('modelo').value,
            año: parseInt(document.getElementById('año').value),
            capacidad: document.getElementById('capacidad').value,
            odometroInicial: parseInt(document.getElementById('odometroInicial').value),
            regional: document.getElementById('regional').value,
            componentes: []
        };

        if (document.getElementById('vehicleId').value) {
            // Actualizar vehículo existente
            const index = this.vehicles.findIndex(v => v.id == formData.id);
            this.vehicles[index] = formData;
        } else {
            // Nuevo vehículo
            this.vehicles.push(formData);
        }

        this.saveVehiclesToStorage();
        this.loadVehicles();
        closeModal();
        
        // Mostrar mensaje de éxito
        alert(`Vehículo ${document.getElementById('vehicleId').value ? 'actualizado' : 'creado'} exitosamente`);
    }

    editVehicle(vehicleId) {
        this.showVehicleForm(vehicleId);
    }

    deleteVehicle(vehicleId) {
        if (confirm('¿Estás seguro de que quieres eliminar este vehículo?')) {
            this.vehicles = this.vehicles.filter(vehicle => vehicle.id !== vehicleId);
            this.saveVehiclesToStorage();
            this.loadVehicles();
            alert('Vehículo eliminado exitosamente');
        }
    }
}

// Inicializar sistema de vehículos
window.vehiclesSystem = new VehiclesSystem();