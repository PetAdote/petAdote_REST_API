// Importações.
    const router = require('express').Router();

    // Controllers.
        const controllerEnderecos = require('../controllers/enderecos');

// Rotas.
    router.get('/', controllerEnderecos.getOneOrAll);

    router.patch('/:codUsuario', controllerEnderecos.updateOne);

// Exportações.
    module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.
