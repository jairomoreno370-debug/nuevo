// Sistema de Autenticación y Gestión de Usuarios - ACTUALIZADO CON CAMBIO DE CONTRASEÑA
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.forcePasswordChange = false;
        this.init();
    }

    async init() {
        await this.initializeDefaultUsers();
        this.checkLoginStatus();
        this.setupEventListeners();
    }

    async initializeDefaultUsers() {
        const users = await database.getUsers();
        
        if (users.length === 0) {
            // Crear usuarios por defecto con flag de cambio de contraseña
            const defaultUsers = [
                {
                    username: 'admin',
                    password: 'admin123',
                    name: 'Administrador Principal',
                    role: 'admin',
                    lastLogin: null,
                    active: true,
                    forcePasswordChange: true // Forzar cambio en primer login
                },
                {
                    username: 'operador',
                    password: 'operador123',
                    name: 'Operador General',
                    role: 'operator',
                    lastLogin: null,
                    active: true,
                    forcePasswordChange: true
                },
                {
                    username: 'invitado',
                    password: 'invitado123',
                    name: 'Usuario Invitado',
                    role: 'guest',
                    lastLogin: null,
                    active: true,
                    forcePasswordChange: true
                }
            ];

            for (const user of defaultUsers) {
                await database.createUser(user);
            }
        }
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const user = await this.authenticate(username, password);

            if (user) {
                // Verificar si requiere cambio de contraseña
                if (user.forcePasswordChange) {
                    this.currentUser = user;
                    this.showPasswordChangeForm();
                } else {
                    await this.login(user);
                }
            } else {
                this.showError('Usuario o contraseña incorrectos');
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showError('Error al iniciar sesión');
        }
    }

    async authenticate(username, password) {
        const users = await database.getUsers();
        return users.find(user => 
            user.username === username && 
            user.password === password &&
            user.active === true
        );
    }

    async login(user) {
        this.currentUser = user;
        
        // Actualizar último login
        await database.updateUser(user.id, {
            lastLogin: new Date().toISOString()
        });

        localStorage.setItem('currentUser', JSON.stringify(user));
        this.showMainSystem();
        this.updateUI();
    }

    handleLogout() {
        this.currentUser = null;
        this.forcePasswordChange = false;
        localStorage.removeItem('currentUser');
        this.showLoginSystem();
    }

    checkLoginStatus() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            this.currentUser = user;
            
            // Verificar si aún requiere cambio de contraseña
            if (user.forcePasswordChange) {
                this.showPasswordChangeForm();
            } else {
                this.showMainSystem();
                this.updateUI();
            }
        } else {
            this.showLoginSystem();
        }
    }

    showPasswordChangeForm() {
        // Ocultar todo y mostrar solo el formulario de cambio de contraseña
        document.getElementById('loginSystem').classList.add('hidden');
        document.getElementById('mainSystem').classList.add('hidden');
        
        // Crear o mostrar formulario de cambio de contraseña
        let passwordChangeDiv = document.getElementById('passwordChangeSystem');
        
        if (!passwordChangeDiv) {
            passwordChangeDiv = document.createElement('div');
            passwordChangeDiv.id = 'passwordChangeSystem';
            passwordChangeDiv.className = 'password-change-container';
            document.body.appendChild(passwordChangeDiv);
        }
        
        passwordChangeDiv.innerHTML = `
            <div class="password-change-form">
                <div class="logo">
                    <i class="fas fa-lock"></i>
                    <h2>Cambio de Contraseña Requerido</h2>
                </div>
                <div class="user-info">
                    <p><strong>Usuario:</strong> ${this.currentUser.name}</p>
                    <p>Por seguridad, debe cambiar su contraseña antes de continuar.</p>
                </div>
                <form id="passwordChangeForm">
                    <div class="form-group">
                        <label for="currentPassword">Contraseña Actual:</label>
                        <input type="password" id="currentPassword" required>
                    </div>
                    <div class="form-group">
                        <label for="newPassword">Nueva Contraseña:</label>
                        <input type="password" id="newPassword" required minlength="6">
                        <small>Mínimo 6 caracteres</small>
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">Confirmar Nueva Contraseña:</label>
                        <input type="password" id="confirmPassword" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="authSystem.cancelPasswordChange()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Cambiar Contraseña
                        </button>
                    </div>
                </form>
            </div>
        `;

        passwordChangeDiv.classList.remove('hidden');

        // Configurar evento del formulario
        const form = document.getElementById('passwordChangeForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handlePasswordChange();
        });
    }

    async handlePasswordChange() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validaciones
        if (currentPassword !== this.currentUser.password) {
            this.showError('La contraseña actual es incorrecta');
            return;
        }

        if (newPassword.length < 6) {
            this.showError('La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('Las contraseñas nuevas no coinciden');
            return;
        }

        if (newPassword === currentPassword) {
            this.showError('La nueva contraseña debe ser diferente a la actual');
            return;
        }

        try {
            // Actualizar contraseña en la base de datos
            await database.updateUser(this.currentUser.id, {
                password: newPassword,
                forcePasswordChange: false
            });

            // Actualizar usuario actual
            this.currentUser.password = newPassword;
            this.currentUser.forcePasswordChange = false;

            this.showSuccess('Contraseña cambiada exitosamente');
            
            // Ocultar formulario y mostrar sistema principal
            document.getElementById('passwordChangeSystem').classList.add('hidden');
            await this.login(this.currentUser);

        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            this.showError('Error al cambiar la contraseña');
        }
    }

    cancelPasswordChange() {
        this.handleLogout();
    }

    showLoginSystem() {
        document.getElementById('loginSystem').classList.remove('hidden');
        document.getElementById('mainSystem').classList.add('hidden');
        
        const passwordChangeDiv = document.getElementById('passwordChangeSystem');
        if (passwordChangeDiv) {
            passwordChangeDiv.classList.add('hidden');
        }
    }

    showMainSystem() {
        document.getElementById('loginSystem').classList.add('hidden');
        document.getElementById('mainSystem').classList.remove('hidden');
        
        const passwordChangeDiv = document.getElementById('passwordChangeSystem');
        if (passwordChangeDiv) {
            passwordChangeDiv.classList.add('hidden');
        }
    }

    updateUI() {
        if (this.currentUser) {
            document.getElementById('currentUser').textContent = this.currentUser.name;
            document.getElementById('userRole').textContent = this.getRoleName(this.currentUser.role);
            
            this.updatePermissions();
        }
    }

    getRoleName(role) {
        const roles = {
            'admin': 'Administrador',
            'operator': 'Operador',
            'guest': 'Invitado'
        };
        return roles[role] || 'Usuario';
    }

    updatePermissions() {
        const adminMenu = document.getElementById('adminMenu');
        const adminModule = document.getElementById('admin');

        if (this.currentUser.role === 'admin') {
            if (adminMenu) adminMenu.classList.remove('hidden');
        } else {
            if (adminMenu) adminMenu.classList.add('hidden');
            if (adminModule && adminModule.classList.contains('active')) {
                this.showModule('dashboard');
            }
        }

        this.updateModulePermissions();
    }

    updateModulePermissions() {
        const role = this.currentUser.role;
        
        // Ejemplo: Deshabilitar ciertas acciones basadas en el rol
        const actions = document.querySelectorAll('.header-actions button');
        actions.forEach(button => {
            if (role === 'guest') {
                button.disabled = true;
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
            }
        });
    }

    showError(message) {
        // Sistema de notificaciones mejorado
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type = 'info') {
        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : 'exclamation'}-circle"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Agregar al cuerpo del documento
        document.body.appendChild(notification);

        // Auto-eliminar después de 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    // Método para cambiar contraseña desde el perfil
    async showProfilePasswordChange() {
        const formContent = `
            <div class="password-change-modal">
                <h3>Cambiar Mi Contraseña</h3>
                <form id="profilePasswordForm">
                    <div class="form-group">
                        <label for="profileCurrentPassword">Contraseña Actual:</label>
                        <input type="password" id="profileCurrentPassword" required>
                    </div>
                    <div class="form-group">
                        <label for="profileNewPassword">Nueva Contraseña:</label>
                        <input type="password" id="profileNewPassword" required minlength="6">
                        <small>Mínimo 6 caracteres</small>
                    </div>
                    <div class="form-group">
                        <label for="profileConfirmPassword">Confirmar Nueva Contraseña:</label>
                        <input type="password" id="profileConfirmPassword" required>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal()">Cancelar</button>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-save"></i> Cambiar Contraseña
                        </button>
                    </div>
                </form>
            </div>
        `;

        showModal('Cambiar Contraseña', formContent);

        // Configurar evento del formulario
        const form = document.getElementById('profilePasswordForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleProfilePasswordChange();
        });
    }

    async handleProfilePasswordChange() {
        const currentPassword = document.getElementById('profileCurrentPassword').value;
        const newPassword = document.getElementById('profileNewPassword').value;
        const confirmPassword = document.getElementById('profileConfirmPassword').value;

        // Validaciones
        if (currentPassword !== this.currentUser.password) {
            this.showError('La contraseña actual es incorrecta');
            return;
        }

        if (newPassword.length < 6) {
            this.showError('La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('Las contraseñas nuevas no coinciden');
            return;
        }

        if (newPassword === currentPassword) {
            this.showError('La nueva contraseña debe ser diferente a la actual');
            return;
        }

        try {
            // Actualizar contraseña en la base de datos
            await database.updateUser(this.currentUser.id, {
                password: newPassword
            });

            // Actualizar usuario actual
            this.currentUser.password = newPassword;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

            this.showSuccess('Contraseña cambiada exitosamente');
            closeModal();

        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            this.showError('Error al cambiar la contraseña');
        }
    }
}

// Inicializar sistema de autenticación
const authSystem = new AuthSystem();
    // Método para toggle del menú de usuario
    setupUserDropdown() {
        const dropdownBtn = document.querySelector('.user-dropdown-btn');
        const dropdownContent = document.getElementById('userDropdown');

        if (dropdownBtn && dropdownContent) {
            dropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContent.classList.toggle('show');
            });

            // Cerrar dropdown al hacer clic fuera
            document.addEventListener('click', () => {
                dropdownContent.classList.remove('show');
            });
        }
    }

    // Llamar este método después de login exitoso
    async login(user) {
        this.currentUser = user;
        
        // Actualizar último login
        await database.updateUser(user.id, {
            lastLogin: new Date().toISOString()
        });

        localStorage.setItem('currentUser', JSON.stringify(user));
        this.showMainSystem();
        this.updateUI();
        this.setupUserDropdown(); // Configurar menú de usuario
    }
