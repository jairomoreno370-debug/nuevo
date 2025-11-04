// Sistema de Autenticación y Gestión de Usuarios

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.users = this.loadUsers();
        this.init();
    }

    init() {
        this.checkLoginStatus();
        this.setupEventListeners();
    }

    loadUsers() {
        const defaultUsers = [
            {
                username: 'admin',
                password: 'admin123',
                name: 'Administrador Principal',
                role: 'admin',
                lastLogin: null,
                active: true
            },
            {
                username: 'operador',
                password: 'operador123',
                name: 'Operador General',
                role: 'operator',
                lastLogin: null,
                active: true
            },
            {
                username: 'invitado',
                password: 'invitado123',
                name: 'Usuario Invitado',
                role: 'guest',
                lastLogin: null,
                active: true
            }
        ];

        const storedUsers = localStorage.getItem('flota_users');
        return storedUsers ? JSON.parse(storedUsers) : defaultUsers;
    }

    saveUsers() {
        localStorage.setItem('flota_users', JSON.stringify(this.users));
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

    handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        const user = this.authenticate(username, password);

        if (user) {
            this.login(user);
        } else {
            this.showError('Usuario o contraseña incorrectos');
        }
    }

    authenticate(username, password) {
        return this.users.find(user => 
            user.username === username && 
            user.password === password &&
            user.active === true
        );
    }

    login(user) {
        this.currentUser = user;
        user.lastLogin = new Date().toISOString();
        this.saveUsers();

        localStorage.setItem('currentUser', JSON.stringify(user));
        this.showMainSystem();
        this.updateUI();
    }

    handleLogout() {
        this.currentUser = null;
        localStorage.removeItem('currentUser');
        this.showLoginSystem();
    }

    checkLoginStatus() {
        const storedUser = localStorage.getItem('currentUser');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            this.currentUser = user;
            this.showMainSystem();
            this.updateUI();
        } else {
            this.showLoginSystem();
        }
    }

    showLoginSystem() {
        document.getElementById('loginSystem').classList.remove('hidden');
        document.getElementById('mainSystem').classList.add('hidden');
    }

    showMainSystem() {
        document.getElementById('loginSystem').classList.add('hidden');
        document.getElementById('mainSystem').classList.remove('hidden');
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
            adminMenu.classList.remove('hidden');
        } else {
            adminMenu.classList.add('hidden');
            if (adminModule.classList.contains('active')) {
                this.showModule('dashboard');
            }
        }

        // Actualizar permisos en otros módulos
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
        // Implementar sistema de notificaciones
        alert(message); // Temporal - reemplazar con sistema de notificaciones bonito
    }

    // Métodos para gestión de usuarios (solo admin)
    createUser(userData) {
        if (this.currentUser.role !== 'admin') {
            throw new Error('No tiene permisos para crear usuarios');
        }

        const existingUser = this.users.find(u => u.username === userData.username);
        if (existingUser) {
            throw new Error('El usuario ya existe');
        }

        this.users.push({
            ...userData,
            lastLogin: null,
            active: true
        });

        this.saveUsers();
    }

    updateUser(username, userData) {
        if (this.currentUser.role !== 'admin') {
            throw new Error('No tiene permisos para actualizar usuarios');
        }

        const userIndex = this.users.findIndex(u => u.username === username);
        if (userIndex === -1) {
            throw new Error('Usuario no encontrado');
        }

        this.users[userIndex] = { ...this.users[userIndex], ...userData };
        this.saveUsers();
    }

    deactivateUser(username) {
        this.updateUser(username, { active: false });
    }
}

// Inicializar sistema de autenticación
const authSystem = new AuthSystem();