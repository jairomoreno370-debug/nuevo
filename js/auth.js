// Sistema de Autenticación y Gestión de Usuarios - COMPLETO
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
        try {
            const users = await database.getUsers();
            
            if (users.length === 0) {
                console.log('Creando usuarios por defecto...');
                
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
                
                console.log('Usuarios por defecto creados exitosamente');
            } else {
                console.log('Usuarios ya existen en la base de datos');
            }
        } catch (error) {
            console.error('Error inicializando usuarios por defecto:', error);
            this.showError('Error crítico: No se pudieron crear los usuarios por defecto');
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

        // Enter key en campos de login
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        
        if (usernameInput && passwordInput) {
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
            
            passwordInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.handleLogin();
                }
            });
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        // Validaciones básicas
        if (!username || !password) {
            this.showError('Por favor complete todos los campos');
            return;
        }

        try {
            const user = await this.authenticate(username, password);

            if (user) {
                // Verificar si el usuario está activo
                if (!user.active) {
                    this.showError('Este usuario está desactivado. Contacte al administrador.');
                    return;
                }

                // Verificar si requiere cambio de contraseña
                if (user.forcePasswordChange) {
                    this.currentUser = user;
                    this.showPasswordChangeForm();
                } else {
                    await this.login(user);
                }
            } else {
                this.showError('Usuario o contraseña incorrectos');
                // Limpiar campo de contraseña
                document.getElementById('password').value = '';
            }
        } catch (error) {
            console.error('Error en login:', error);
            this.showError('Error al iniciar sesión. Intente nuevamente.');
        }
    }

    async authenticate(username, password) {
        const users = await database.getUsers();
        return users.find(user => 
            user.username.toLowerCase() === username.toLowerCase() && 
            user.password === password
        );
    }

    async login(user) {
        try {
            this.currentUser = user;
            
            // Actualizar último login
            await database.updateUser(user.id, {
                lastLogin: new Date().toISOString()
            });

            // Actualizar usuario en localStorage
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            this.showMainSystem();
            this.updateUI();
            this.setupUserDropdown();
            
            this.showSuccess(`Bienvenido, ${user.name}`);
            
        } catch (error) {
            console.error('Error en proceso de login:', error);
            this.showError('Error al completar el login');
        }
    }

    handleLogout() {
        if (this.currentUser) {
            console.log(`Usuario ${this.currentUser.username} cerró sesión`);
        }
        
        this.currentUser = null;
        this.forcePasswordChange = false;
        localStorage.removeItem('currentUser');
        this.showLoginSystem();
        
        // Limpiar formularios
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.reset();
        }
    }

    checkLoginStatus() {
        try {
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                this.currentUser = user;
                
                // Verificar si el usuario aún existe en la base de datos
                this.validateStoredUser(user).then(isValid => {
                    if (isValid) {
                        // Verificar si aún requiere cambio de contraseña
                        if (user.forcePasswordChange) {
                            this.showPasswordChangeForm();
                        } else {
                            this.showMainSystem();
                            this.updateUI();
                            this.setupUserDropdown();
                        }
                    } else {
                        // Usuario no válido, forzar logout
                        this.handleLogout();
                    }
                });
            } else {
                this.showLoginSystem();
            }
        } catch (error) {
            console.error('Error verificando estado de login:', error);
            this.showLoginSystem();
        }
    }

    async validateStoredUser(storedUser) {
        try {
            const dbUser = await database.getUserById(storedUser.id);
            return dbUser && dbUser.active;
        } catch (error) {
            console.error('Error validando usuario almacenado:', error);
            return false;
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
                    <p class="security-warning">
                        <i class="fas fa-shield-alt"></i>
                        Por seguridad, debe cambiar su contraseña antes de continuar.
                    </p>
                </div>
                <form id="passwordChangeForm">
                    <div class="form-group">
                        <label for="currentPassword">
                            <i class="fas fa-key"></i> Contraseña Actual:
                        </label>
                        <input type="password" id="currentPassword" required 
                               placeholder="Ingrese su contraseña actual">
                    </div>
                    <div class="form-group">
                        <label for="newPassword">
                            <i class="fas fa-lock"></i> Nueva Contraseña:
                        </label>
                        <input type="password" id="newPassword" required 
                               minlength="6" placeholder="Mínimo 6 caracteres">
                        <small>La contraseña debe tener al menos 6 caracteres</small>
                    </div>
                    <div class="form-group">
                        <label for="confirmPassword">
                            <i class="fas fa-lock"></i> Confirmar Nueva Contraseña:
                        </label>
                        <input type="password" id="confirmPassword" required 
                               placeholder="Repita la nueva contraseña">
                    </div>
                    <div class="password-strength" id="passwordStrength">
                        <div class="strength-bar">
                            <div class="strength-fill" id="strengthFill"></div>
                        </div>
                        <span class="strength-text" id="strengthText">Seguridad de la contraseña</span>
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="authSystem.cancelPasswordChange()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button type="submit" class="btn-primary" id="submitPasswordBtn">
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

        // Configurar validación de fortaleza de contraseña en tiempo real
        const newPasswordInput = document.getElementById('newPassword');
        const confirmPasswordInput = document.getElementById('confirmPassword');
        
        if (newPasswordInput) {
            newPasswordInput.addEventListener('input', () => {
                this.checkPasswordStrength();
                this.validatePasswordMatch();
            });
        }
        
        if (confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', () => {
                this.validatePasswordMatch();
            });
        }

        // Poner foco en el primer campo
        setTimeout(() => {
            const currentPasswordInput = document.getElementById('currentPassword');
            if (currentPasswordInput) {
                currentPasswordInput.focus();
            }
        }, 100);
    }

    checkPasswordStrength() {
        const password = document.getElementById('newPassword').value;
        const strengthFill = document.getElementById('strengthFill');
        const strengthText = document.getElementById('strengthText');
        
        if (!strengthFill || !strengthText) return;

        let strength = 0;
        let text = '';
        let color = '#e74c3c'; // Rojo por defecto

        // Verificar longitud
        if (password.length >= 6) strength += 25;
        if (password.length >= 8) strength += 25;
        
        // Verificar complejidad
        if (/[A-Z]/.test(password)) strength += 25; // Mayúsculas
        if (/[0-9]/.test(password)) strength += 25; // Números
        if (/[^A-Za-z0-9]/.test(password)) strength += 25; // Símbolos

        // Ajustar a máximo 100%
        strength = Math.min(strength, 100);

        // Determinar texto y color
        if (strength === 0) {
            text = 'Ingrese una contraseña';
            color = '#e74c3c';
        } else if (strength < 40) {
            text = 'Débil';
            color = '#e74c3c';
        } else if (strength < 70) {
            text = 'Moderada';
            color = '#f39c12';
        } else if (strength < 90) {
            text = 'Fuerte';
            color = '#3498db';
        } else {
            text = 'Muy fuerte';
            color = '#27ae60';
        }

        strengthFill.style.width = strength + '%';
        strengthFill.style.backgroundColor = color;
        strengthText.textContent = text;
        strengthText.style.color = color;
    }

    validatePasswordMatch() {
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const submitBtn = document.getElementById('submitPasswordBtn');
        
        if (!submitBtn) return;

        if (confirmPassword && newPassword !== confirmPassword) {
            submitBtn.disabled = true;
            submitBtn.title = 'Las contraseñas no coinciden';
        } else {
            submitBtn.disabled = false;
            submitBtn.title = '';
        }
    }

    async handlePasswordChange() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        // Validaciones
        if (!currentPassword) {
            this.showError('Por favor ingrese la contraseña actual');
            document.getElementById('currentPassword').focus();
            return;
        }

        if (currentPassword !== this.currentUser.password) {
            this.showError('La contraseña actual es incorrecta');
            document.getElementById('currentPassword').focus();
            document.getElementById('currentPassword').select();
            return;
        }

        if (newPassword.length < 6) {
            this.showError('La nueva contraseña debe tener al menos 6 caracteres');
            document.getElementById('newPassword').focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('Las contraseñas nuevas no coinciden');
            document.getElementById('confirmPassword').focus();
            document.getElementById('confirmPassword').select();
            return;
        }

        if (newPassword === currentPassword) {
            this.showError('La nueva contraseña debe ser diferente a la actual');
            document.getElementById('newPassword').focus();
            return;
        }

        try {
            // Mostrar loading
            const submitBtn = document.getElementById('submitPasswordBtn');
            const originalText = submitBtn.innerHTML;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cambiando...';
            submitBtn.disabled = true;

            // Actualizar contraseña en la base de datos
            await database.updateUser(this.currentUser.id, {
                password: newPassword,
                forcePasswordChange: false
            });

            // Actualizar usuario actual
            this.currentUser.password = newPassword;
            this.currentUser.forcePasswordChange = false;

            // Actualizar localStorage
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));

            this.showSuccess('¡Contraseña cambiada exitosamente!');
            
            // Ocultar formulario y mostrar sistema principal después de un breve delay
            setTimeout(() => {
                document.getElementById('passwordChangeSystem').classList.add('hidden');
                this.login(this.currentUser);
            }, 1500);

        } catch (error) {
            console.error('Error cambiando contraseña:', error);
            this.showError('Error al cambiar la contraseña. Intente nuevamente.');
            
            // Restaurar botón
            const submitBtn = document.getElementById('submitPasswordBtn');
            if (submitBtn) {
                submitBtn.innerHTML = '<i class="fas fa-save"></i> Cambiar Contraseña';
                submitBtn.disabled = false;
            }
        }
    }

    cancelPasswordChange() {
        if (confirm('¿Está seguro de cancelar el cambio de contraseña? Será redirigido al login.')) {
            this.handleLogout();
        }
    }

    showLoginSystem() {
        document.getElementById('loginSystem').classList.remove('hidden');
        document.getElementById('mainSystem').classList.add('hidden');
        
        const passwordChangeDiv = document.getElementById('passwordChangeSystem');
        if (passwordChangeDiv) {
            passwordChangeDiv.classList.add('hidden');
        }

        // Poner foco en el campo de usuario
        setTimeout(() => {
            const usernameInput = document.getElementById('username');
            if (usernameInput) {
                usernameInput.focus();
            }
        }, 100);
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
            const currentUserElement = document.getElementById('currentUser');
            const userRoleElement = document.getElementById('userRole');
            
            if (currentUserElement) {
                currentUserElement.textContent = this.currentUser.name;
            }
            
            if (userRoleElement) {
                userRoleElement.textContent = this.getRoleName(this.currentUser.role);
                userRoleElement.className = `user-role role-${this.currentUser.role}`;
            }
            
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
            // Si está en módulo admin y no es admin, redirigir al dashboard
            if (adminModule && adminModule.classList.contains('active')) {
                if (window.flotaApp) {
                    window.flotaApp.showModule('dashboard');
                }
            }
        }

        this.updateModulePermissions();
    }

    updateModulePermissions() {
        const role = this.currentUser.role;
        
        // Deshabilitar ciertas acciones basadas en el rol
        const actions = document.querySelectorAll('.header-actions button');
        actions.forEach(button => {
            if (role === 'guest') {
                button.disabled = true;
                button.style.opacity = '0.5';
                button.style.cursor = 'not-allowed';
                button.title = 'No tiene permisos para esta acción';
            } else {
                button.disabled = false;
                button.style.opacity = '1';
                button.style.cursor = 'pointer';
                button.title = '';
            }
        });

        // Ocultar botones de eliminar para invitados
        if (role === 'guest') {
            const deleteButtons = document.querySelectorAll('.btn-delete');
            deleteButtons.forEach(button => {
                button.style.display = 'none';
            });
        }
    }

    setupUserDropdown() {
        const dropdownBtn = document.querySelector('.user-dropdown-btn');
        const dropdownContent = document.getElementById('userDropdown');

        if (dropdownBtn && dropdownContent) {
            dropdownBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownContent.classList.toggle('show');
            });

            // Cerrar dropdown al hacer clic fuera
            document.addEventListener('click', (e) => {
                if (!dropdownBtn.contains(e.target) && !dropdownContent.contains(e.target)) {
                    dropdownContent.classList.remove('show');
                }
            });

            // Cerrar dropdown con ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    dropdownContent.classList.remove('show');
                }
            });
        }
    }

    // Método para cambiar contraseña desde el perfil
    async showProfilePasswordChange() {
        const formContent = `
            <div class="password-change-modal">
                <h3><i class="fas fa-key"></i> Cambiar Mi Contraseña</h3>
                <p class="modal-subtitle">Actualice su contraseña de acceso al sistema</p>
                
                <form id="profilePasswordForm">
                    <div class="form-group">
                        <label for="profileCurrentPassword">
                            <i class="fas fa-key"></i> Contraseña Actual:
                        </label>
                        <input type="password" id="profileCurrentPassword" required 
                               placeholder="Ingrese su contraseña actual">
                    </div>
                    <div class="form-group">
                        <label for="profileNewPassword">
                            <i class="fas fa-lock"></i> Nueva Contraseña:
                        </label>
                        <input type="password" id="profileNewPassword" required 
                               minlength="6" placeholder="Mínimo 6 caracteres">
                        <small>La contraseña debe tener al menos 6 caracteres</small>
                    </div>
                    <div class="form-group">
                        <label for="profileConfirmPassword">
                            <i class="fas fa-lock"></i> Confirmar Nueva Contraseña:
                        </label>
                        <input type="password" id="profileConfirmPassword" required 
                               placeholder="Repita la nueva contraseña">
                    </div>
                    <div class="form-actions">
                        <button type="button" class="btn-secondary" onclick="closeModal()">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
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

        // Poner foco en el primer campo
        setTimeout(() => {
            const currentPasswordInput = document.getElementById('profileCurrentPassword');
            if (currentPasswordInput) {
                currentPasswordInput.focus();
            }
        }, 100);
    }

    async handleProfilePasswordChange() {
        const currentPassword = document.getElementById('profileCurrentPassword').value;
        const newPassword = document.getElementById('profileNewPassword').value;
        const confirmPassword = document.getElementById('profileConfirmPassword').value;

        // Validaciones
        if (!currentPassword) {
            this.showError('Por favor ingrese la contraseña actual');
            document.getElementById('profileCurrentPassword').focus();
            return;
        }

        if (currentPassword !== this.currentUser.password) {
            this.showError('La contraseña actual es incorrecta');
            document.getElementById('profileCurrentPassword').focus();
            document.getElementById('profileCurrentPassword').select();
            return;
        }

        if (newPassword.length < 6) {
            this.showError('La nueva contraseña debe tener al menos 6 caracteres');
            document.getElementById('profileNewPassword').focus();
            return;
        }

        if (newPassword !== confirmPassword) {
            this.showError('Las contraseñas nuevas no coinciden');
            document.getElementById('profileConfirmPassword').focus();
            document.getElementById('profileConfirmPassword').select();
            return;
        }

        if (newPassword === currentPassword) {
            this.showError('La nueva contraseña debe ser diferente a la actual');
            document.getElementById('profileNewPassword').focus();
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

    // Métodos de utilidad para notificaciones
    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showWarning(message) {
        this.showNotification(message, 'warning');
    }

    showNotification(message, type = 'info') {
        // Eliminar notificaciones existentes
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => {
            if (notification.parentElement) {
                notification.remove();
            }
        });

        // Crear notificación
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${icons[type] || 'info-circle'}"></i>
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

        // Animar entrada
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 10);
    }

    // Métodos para gestión de usuarios (solo admin)
    async createUser(userData) {
        if (this.currentUser.role !== 'admin') {
            throw new Error('No tiene permisos para crear usuarios');
        }

        // Validar datos del usuario
        if (!userData.username || !userData.password || !userData.name || !userData.role) {
            throw new Error('Todos los campos son requeridos');
        }

        if (userData.password.length < 6) {
            throw new Error('La contraseña debe tener al menos 6 caracteres');
        }

        const existingUser = await database.getUserByUsername(userData.username);
        if (existingUser) {
            throw new Error('El nombre de usuario ya existe');
        }

        const newUser = {
            ...userData,
            lastLogin: null,
            active: true,
            forcePasswordChange: true, // Forzar cambio en primer login
            createdAt: new Date()
        };

        return await database.createUser(newUser);
    }

    async updateUser(userId, updates) {
        if (this.currentUser.role !== 'admin' && this.currentUser.id !== userId) {
            throw new Error('No tiene permisos para actualizar este usuario');
        }

        // Si se actualiza el username, verificar que no exista
        if (updates.username && updates.username !== this.currentUser.username) {
            const existingUser = await database.getUserByUsername(updates.username);
            if (existingUser && existingUser.id !== userId) {
                throw new Error('El nombre de usuario ya existe');
            }
        }

        return await database.updateUser(userId, updates);
    }

    async deactivateUser(userId) {
        if (this.currentUser.role !== 'admin') {
            throw new Error('No tiene permisos para desactivar usuarios');
        }

        if (this.currentUser.id === userId) {
            throw new Error('No puede desactivar su propio usuario');
        }

        return await this.updateUser(userId, { active: false });
    }

    async activateUser(userId) {
        if (this.currentUser.role !== 'admin') {
            throw new Error('No tiene permisos para activar usuarios');
        }

        return await this.updateUser(userId, { active: true });
    }

    // Método para verificar permisos
    hasPermission(requiredRole) {
        const roleHierarchy = {
            'guest': 0,
            'operator': 1,
            'admin': 2
        };

        const currentRoleLevel = roleHierarchy[this.currentUser.role] || 0;
        const requiredRoleLevel = roleHierarchy[requiredRole] || 0;

        return currentRoleLevel >= requiredRoleLevel;
    }

    // Método para obtener información del usuario actual
    getCurrentUserInfo() {
        return {
            ...this.currentUser,
            roleName: this.getRoleName(this.currentUser.role),
            canManageUsers: this.hasPermission('admin'),
            canEdit: this.hasPermission('operator'),
            isAdmin: this.currentUser.role === 'admin'
        };
    }
}

// Inicializar sistema de autenticación
const authSystem = new AuthSystem();
