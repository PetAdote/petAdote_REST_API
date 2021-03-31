// Importações.

    const router = require('express').Router();
    
    // Controllers.
        const controllerContas = require('../controllers/contas');

// Rotas.
    router.get('/', controllerContas.getOneOrAll);

    router.post('/', controllerContas.createOne);

    router.patch('/ativacao/:tokenAtivacao', controllerContas.activateOne);

    router.post('/recuperacao', controllerContas.sendNewPasswordToken);

    router.patch('/recuperacao', controllerContas.sendNewPassword);

    router.patch('/:codUsuario', controllerContas.updateOne);

    router.post('/ativacao/reenvio/:codUsuario', controllerContas.sendActivationTokenAgain);

// Exportação.
    module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.