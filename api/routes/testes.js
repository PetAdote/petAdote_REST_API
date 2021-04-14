// Importações.

    const express = require('express');
    const router = express.Router();

    // Sub-routers.
        const routerUserAvatar = express.Router({ mergeParams: true });

    // Utilidades.
        const path = require('path');
    
// Rotas.

router.use('/:codUsuario/avatar', routerUserAvatar);

router.get('/:codUsuario', (req, res, next) => {
    console.log('O código do usuário é:', req.params.codUsuario);

    return res.status(200).json({
        mensagem: `O código do usuário é: ${req.params.codUsuario}`
    })
});

routerUserAvatar.get('/:fileName', (req, res, next) => {

    let { codUsuario, fileName } = req.params;

    let options = {
        headers: {
            'Content-Disposition': `inline; filename=${fileName}`,
            'Content-Type': 'image/jpeg'
        }
    }

    let filePath = path.join(__dirname, `../uploads/images/usersAvatar/${fileName}`);

    if (codUsuario == 1 && fileName == 'default_avatar_01.jpeg'){

        console.log('O código do usuário é 1 e a foto dele é "default_avatar_01.jpeg" - Vou exibir a imagem.');

        return res.sendFile(filePath, options/*, (error) => { ... } */);

    } else {

        return res.status(200).json({
            mensagem: 'Você não possui permissão para acessar esse recurso.'
        })
    }

    // if (req.params.codUsuario == 1 && req.params.fileName == 'default_avatar_01.jpeg'){
    //     console.log('O código do usuário era 1.');
    //     console.log('Então permitirei a exibição do avatar dele públicamente.');
    //     // console.log(path.join(__dirname, "../uploads/images/usersAvatar/default_avatar_01.jpeg"));
    //     return res.sendFile(path.join(__dirname, "../uploads/images/usersAvatar/default_avatar_01.jpeg"));
    // } else {
    //     // console.log('Código de usuário inválido:', req.params.codUsuario);
    //     return res.status(200).json({
    //         mensagem: `Código de usuário inválido: ${req.params.codUsuario}`
    //     })
    // }
})



// Exportação.
module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.