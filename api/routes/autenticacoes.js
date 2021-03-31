// Importações.

    const router = require('express').Router();

    // Controllers.
        const controllerAuthApis = require('../controllers/auth_apis');
        const controllerAuthUsuarios = require('../controllers/auth_usuarios');

// Rotas de autenticação dos Clientes (Aplicações).

    router.get('/apis/login', controllerAuthApis.login);

    router.post('/apis/refresh', controllerAuthApis.refresh);

    router.delete('/apis/logout', controllerAuthApis.logout);

// Rotas de autenticação dos Usuários dos Clientes.

    router.post('/usuarios/login', controllerAuthUsuarios.login);

    router.post('/usuarios/refresh', controllerAuthUsuarios.refresh);

    router.delete('/usuarios/logout', controllerAuthUsuarios.logout);

// Exportações.
module.exports = router;