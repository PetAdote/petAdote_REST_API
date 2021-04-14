// Importações.

    // Conexões.
        const redisClient = require('../../configs/redis_connection');

    // Models.
        const Cliente = require('../models/Cliente');

    // Helpers.
        const { signClientAccessToken, signClientRefreshToken, verifyRefreshToken } = require('../../helpers/manage_jwt');
    
// Controllers.

    /**
     * @description Entrega os Tokens de Acesso e Renovação aos Clientes (Aplicações Pet Adote).
     */
    const login = async (req, res, next) => {     
        // Entrega os Tokens de Acesso e Renovação aos Clientes (Aplicações Pet Adote).

        Cliente.findByPk(req.query.cliente)
        .then(async (result) => {

            if (req.query.cliente == result.cod_cliente && req.query.senha == result.senha){
    
                try {
    
                    const client_accessToken = await signClientAccessToken(result.cod_cliente, result.tipo_cliente);
                    const client_refreshToken = await signClientRefreshToken(result.cod_cliente, result.tipo_cliente);
        
                    return res.status(200).json({
                        mensagem: 'Cliente válido! Access Token e Refresh Token foram entregues.',
                        client_accessToken,
                        client_refreshToken
                    });
        
                } catch (error) {
        
                    console.error('Algo inesperado aconteceu ao autenticar a aplicação.', error);
        
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
            console.error('Algo inesperado aconteceu ao autenticar a aplicação.', error);
    
            let customErr = new Error('Algo inesperado aconteceu ao autenticar a aplicação. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR';
            
            return next( customErr );
        });

    };

    /**
     * @description Verifica se o Token de Renovação da aplicação é válido e renova o Token de Acesso.
     */
    const refresh = async (req, res, next) => {     
        // Verifica se o Token de Renovação da aplicação é válido e renova o Token de Acesso.

        try {

            const { refreshToken } = req.body;

            if(!refreshToken) {
                let customErr = new Error('Token não encontrado na requisição.');
                customErr.status = 400;
                customErr.code = 'BAD_REQUEST';

                return next( customErr );
            }

            const client = await verifyRefreshToken(refreshToken);

            if (client.usuario){
                let customErr = new Error('Token inválido.');
                customErr.status = 403;
                customErr.code = 'NOT_ALLOWED';

                return next( customErr );
            }

            const client_accessToken = await signClientAccessToken(client.cod_cliente, client.tipo_cliente);
            const client_refreshToken = await signClientRefreshToken(client.cod_cliente, client.tipo_cliente);

            return res.status(200).json({
                mensagem: 'Cliente renovado! Novos Access Token e Refresh Token foram entregues.',
                client_accessToken,
                client_refreshToken
            });

        } catch (error) {

            if (error.status = 401){
                return next ( error );
            }

            console.error('Algo inesperado aconteceu ao renovar o acesso da aplicação.', error);

            req.pause();
            let customErr = new Error('Algo inesperado aconteceu ao renovar o acesso da aplicação. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR';
            
            return next( customErr );
        };

    };


    /**
     * @description Permite que os Clientes encerrem suas conexões com a REST de forma segura ao descartar seu Token de Renovação.
     */
    const logout = async (req, res, next) => {
        // Permite que os Clientes encerrem suas conexões com a REST de forma segura ao descartar seu Token de Renovação.

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
                    console.error('Algo inesperado aconteceu ao remover o Refresh Token do Cliente.', error);
    
                    let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';
                    
                    return next( customErr );
                };
    
                // Se nenhum error acontecer, a chave será deletada ou um resultado dizendo que ela nunca existiu será retornado...
                    // console.log('Resultado da remoção do Refresh Token do Cliente:', result);
    
                return res.status(200).json({
                    mensagem: 'Cliente desconectado com sucesso.'
                });
    
            });
    
    
        } catch (error) {
    
            if (error.status = 401){
                return next ( error );
            }
    
            console.error('Algo inesperado aconteceu durante a remoção do Refresh Token do Cliente.', error);
    
            let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR';
            
            return next( customErr );
    
        };
        
    };
        

// Exportações.
    module.exports = {
        login,
        refresh,
        logout
    }