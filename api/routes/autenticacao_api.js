// Importações.

    const express = require('express');
    const router = express.Router();

    const Cliente = require('../models/Cliente');   // Clientes (APIs) autorizadas para requisitar dados na REST.

    const { signClientAccessToken, signClientRefreshToken, verifyRefreshToken } = require('../../helpers/manage_jwt');

    const redisClient = require('../../configs/redis_connection');



// Rotas.

router.get('/login', (req, res, next) => {     // Entrega o Token de autenticação aos clientes registrados.

    // console.log('[Router_clientes] Verificando se cliente existe para atribuir o JWToken. ');

    // Restrição de Acesso à Rota.
    
    // if (req.dadosAuthToken){
    //     return res.status(401).json({
    //         mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
    //         code: 'ACCESS_NOT_ALLOWED'
    //     });
    // }
    //

    Cliente.findByPk(req.query.cliente)
    .then(async (result) => {

        if (result) {

            try {

                const client_AccessToken = await signClientAccessToken(result.cod_cliente, result.tipo_cliente);
                const client_RefreshToken = await signClientRefreshToken(result.cod_cliente, result.tipo_cliente);
    
                return res.status(200).json({
                    mensagem: 'Cliente válido! Access Token e Refresh Token foram entregues.',
                    client_AccessToken,
                    client_RefreshToken
                });
    
            } catch (error) {
    
                console.log('Algo inesperado aconteceu ao autenticar a aplicação.', error);
    
                let customErr = new Error('Algo inesperado aconteceu ao autenticar a aplicação. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';
                
                return next( customErr );
    
            }

        } else {

            return res.status(401).json({
                mensagem: 'Autenticação inválida!',
                code: 'INVALID_API_CREDENTIALS',
                exemplo: `${req.protocol}://${req.get('host')}/autenticacao_api/?cliente=SeuID&senha=SuaSenha`
            });

        }

    })
    .catch((error) => {
        console.log('Algo inesperado aconteceu ao autenticar a aplicação.', error);

        let customErr = new Error('Algo inesperado aconteceu ao autenticar a aplicação. Entre em contato com o administrador.');
        customErr.status = 500;
        customErr.code = 'INTERNAL_SERVER_ERROR';
        
        return next( customErr );
    });

    // let cliente = clientesAutorizados.find( (cliente) => {
    //     if (cliente.cod_cliente === req.query.cliente && cliente.senha === req.query.senha){
    //         return cliente;
    //     }
    // });

    // if (cliente){

    //     // console.log('Cliente válido! Entregando Token...');

    //     try {

    //         const client_AccessToken = await signClientAccessToken(cliente.cod_cliente, cliente.tipo_cliente);
    //         const client_RefreshToken = await signClientRefreshToken(cliente.cod_cliente, cliente.tipo_cliente);

    //         return res.status(200).json({
    //             mensagem: 'Cliente válido! Access Token e Refresh Token foram entregues.',
    //             client_AccessToken,
    //             client_RefreshToken
    //         });

    //     } catch (error) {

    //         console.log('Algo inesperado aconteceu ao autenticar a aplicação.', error);

    //         let customErr = new Error('Algo inesperado aconteceu ao autenticar a aplicação. Entre em contato com o administrador.');
    //         customErr.status = 500;
    //         customErr.code = 'INTERNAL_SERVER_ERROR';
            
    //         return next( customErr );

    //     }

    //     // signClientAccessToken(cliente.cod_cliente, cliente.tipo_cliente)
    //     // .then((clientAccessToken) => {
    //     //     return res.status(200).json({
    //     //         mensagem: 'Cliente válido! O Token de acesso do cliente foi entregue.',
    //     //         accessToken_cliente: clientAccessToken
    //     //     });
    //     // })
    //     // .catch((error) => {
    //     //     console.log('Algo inesperado aconteceu ao autenticar a aplicação.', error);

    //     //     let customErr = new Error('Algo inesperado aconteceu ao autenticar a aplicação. Entre em contato com o administrador.');
    //     //     customErr.status = 500;
    //     //     customErr.code = 'INTERNAL_SERVER_ERROR';
            
    //     //     return next( customErr );
    //     // });

        
    // } else {
    //     return res.status(401).json({
    //         mensagem: 'Autenticação inválida!',
    //         code: 'INVALID_API_CREDENTIALS',
    //         exemplo: `${req.protocol}://${req.get('host')}/autenticacao_api/?cliente=SeuID&senha=SuaSenha`
    //     });
    // }

});

router.post('/refresh', async (req, res, next) => {     // Verifica se o Token de Renovação da aplicação é válido, se for, renova o Token de Acesso.

    try {

        const { refreshToken } = req.body;

        if(!refreshToken) {
            let customErr = new Error('Token não encontrado na requisição.');
            customErr.status = 400;
            customErr.code = 'BAD_REQUEST';

            return next( customErr );
        }

        const client = await verifyRefreshToken(refreshToken);

        if (client.usuario){   // Se for o 'refreshToken' enviado foi o de um usuário e não de uma aplicação não permita a geração desse tipo de renovação de token.
            let customErr = new Error('Token inválido.');
            customErr.status = 403;
            customErr.code = 'NOT_ALLOWED';

            return next( customErr );
        }

        const client_AccessToken = await signClientAccessToken(client.cod_cliente, client.tipo_cliente);
        const client_RefreshToken = await signClientRefreshToken(client.cod_cliente, client.tipo_cliente);

        return res.status(200).json({
            mensagem: 'Cliente renovado! Novos Access Token e Refresh Token foram entregues.',
            client_AccessToken,
            client_RefreshToken
        });

    } catch (error) {

        if (error.status = 401){
            return next ( error );
        }

        console.log('Algo inesperado aconteceu ao renovar o acesso da aplicação.', error);

        req.pause();
        let customErr = new Error('Algo inesperado aconteceu ao renovar o acesso da aplicação. Entre em contato com o administrador.');
        customErr.status = 500;
        customErr.code = 'INTERNAL_SERVER_ERROR';
        
        return next( customErr );
    }


});

router.post('/logout', async (req, res, next) => {     // Permite que os Clientes encerrem suas conexões com a REST de forma segura ao descartar o Token de Renovação até a próxima vez que se autenticarem.

   try {

        const { refreshToken } = req.body;

        if(!refreshToken) {
            let customErr = new Error('Token não encontrado na requisição.');
            customErr.status = 400;
            customErr.code = 'BAD_REQUEST';

            return next( customErr );
        };

        const client = await verifyRefreshToken(refreshToken);

        if (client.usuario){   // Se for o 'refreshToken' enviado foi o de um usuário e não de uma aplicação não permita o log-out (Uma rota específica fará isso para os usuários).
            let customErr = new Error('Token inválido.');
            customErr.status = 403;
            customErr.code = 'NOT_ALLOWED';

            return next( customErr );
        };

        // Removendo o conjunto de dados contendo o Refresh Token do Cliente.
        redisClient.DEL(`clientRefresh:${client.cod_cliente}`, (error, result) => {
            if (error) {
                console.log('Algo inesperado aconteceu ao remover o Refresh Token do Cliente.', error);

                let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';
                
                return next( customErr );
            };

            // Se nenhum error acontecer, a chave será deletada ou um resultado dizendo que ela nunca existiu será retornado...
            console.log('Resultado da remoção do Refresh Token do Cliente:', result);

            return res.status(200).json({
                mensagem: 'Cliente desconectado com sucesso.'
            });

        });


    } catch (error) {

        if (error.status = 401){
            return next ( error );
        }

        console.log('Algo inesperado aconteceu durante a remoção do Refresh Token do Cliente.', error);

        let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
        customErr.status = 500;
        customErr.code = 'INTERNAL_SERVER_ERROR';
        
        return next( customErr );

    };

});

// Exportação.
module.exports = router;