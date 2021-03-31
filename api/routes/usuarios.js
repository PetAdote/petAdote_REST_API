/* Observações: Como desenvolvedores, ao construir uma REST API, devemos documentar de forma clara e consistente
                quais campos são necessários às rotas de nossa API.
*/

// Importações.
    const express = require('express');
    const router = express.Router();

    // Controllers.
        const controllerUsuarios = require('../controllers/usuarios');

// Rotas.
    router.get('/', controllerUsuarios.getAll);

    router.get('/:codUsuario', controllerUsuarios.getOne);

    router.patch('/:codUsuario', controllerUsuarios.updateOne);

// Exportação.
    module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.
