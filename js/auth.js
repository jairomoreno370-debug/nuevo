// Sistema de Autenticación y Gestión de Usuarios - ACTUALIZADO
class AuthSystem {
    constructor() {
        this.currentUser = null;
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
            // Crear usuarios por defecto
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

            for (const user of defaultUsers) {
                await database.createUser(user);
            }
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

    // [El resto del código se mantiene igual...]
}
