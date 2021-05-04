// Importações.

    const jwt = require('jsonwebtoken');

    const redisClient = require('../configs/redis_connection');

// Funções de assinatura JWT.

    // Assinatura dos Tokens de Acesso dos Clientes.

    /** @param {number} cod_cliente @param {('Pet Adote'|'Comum')} tipo_cliente */
    const signClientAccessToken = (cod_cliente, tipo_cliente) => {

        return new Promise((resolve, reject) => {

            if (!cod_cliente || !tipo_cliente){
                throw new Error('Alguns parâmetros estão faltando.');
            }

            const payload = {
                cod_cliente: cod_cliente,
                tipo_cliente: tipo_cliente
            };
            const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
            const options = {
                expiresIn: '1h'
            };

            jwt.sign(payload, secret, options, (error, token) => {
                if (error){
                    console.error('Algo inesperado aconteceu ao assinar o AccessToken do Cliente.', error);

                    let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';
                    
                    return reject(customErr);
                } else {
                    return resolve(token);
                }
            });

        });

    };

    // Assinatura dos Refresh Tokens para acesso dos Clientes.

    /** @param {number} cod_cliente @param {('Pet Adote'|'Comum')} tipo_cliente */
    const signClientRefreshToken = (cod_cliente, tipo_cliente) => {

        return new Promise((resolve, reject) => {

            if (!cod_cliente || !tipo_cliente){
                throw new Error('Alguns parâmetros estão faltando.');
            }

            const payload = {
                cod_cliente: cod_cliente,
                tipo_cliente: tipo_cliente
            };
            const secret = process.env.JWT_REFRESH_TOKEN_SECRET;
            const options = {
                expiresIn: '7d'
            };

            jwt.sign(payload, secret, options, (error, clientRefreshToken) => {
                if (error){
                    console.error('Algo inesperado aconteceu ao assinar o RefreshToken do Cliente.', error);

                    let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';

                    return reject(customErr);
                } else {

                    // Configurações de armazenamento desses dados no Redis.
                    const clientSetKey = `clientRefresh:${cod_cliente}`;   // "cod_cliente" é recebido nos parâmetros da função.
                    const expirationTimeInSeconds = 7 * 24 * 60 * 60;   // Tempo de expiração em segundos, deve ser igual ao tempo de expiração do JWT.

                    // Armazenando o Refresh Token do Cliente no Redis.
                    redisClient.HSET(clientSetKey, 'clientRefreshToken', clientRefreshToken, (error, redisReply) => {
                        if (error){
                            console.error('Algo inesperado aconteceu ao armazenar o RefreshToken do Cliente no Redis.', error);

                            let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_ERROR';

                            return reject( customErr );
                        }

                        // Resolvendo o Token de Renovação do Cliente...
                        
                        redisClient.EXPIRE(clientSetKey, expirationTimeInSeconds, (error, redisReply) => {
                            if (error){
                                let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                                customErr.status = 500;
                                customErr.code = 'INTERNAL_SERVER_ERROR';

                                return reject( customErr );
                            }
                        });
                        return resolve(clientRefreshToken);
                    });

                    // Fim do armazenamento do Refresh Token do Cliente no Redis.

                    
                }
            });

        });

    };


    // Assinatura dos Tokens de Acesso dos Usuários.

    /** @param {number} cod_cliente @param {('Pet Adote'|'Comum')} tipo_cliente @param {object} usuario */
    const signUserAccessToken = (cod_cliente, tipo_cliente, usuario) => {

        if (!cod_cliente || !tipo_cliente || !usuario){
            throw new Error('Alguns parâmetros estão faltando.');
        }

        return new Promise((resolve, reject) => {
            const payload = {
                cod_cliente,
                tipo_cliente,
                usuario
            };
            const secret = process.env.JWT_ACCESS_TOKEN_SECRET;
            const options = {
                expiresIn: '20m'
            };

            jwt.sign(payload, secret, options, (error, token) => {
                if (error){
                    console.error('Algo inesperado aconteceu ao assinar o AccessToken do Usuário.', error);

                    let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';

                    return reject(customErr);
                } else {
                    return resolve(token);
                }
            });

        });

    };
    
    // Assinatura dos Refresh Tokens para acesso dos Usuários.

    /** @param {number} cod_cliente @param {('Pet Adote'|'Comum')} tipo_cliente @param {object} usuario */
    const signUserRefreshToken = (cod_cliente, tipo_cliente, usuario) => {

        if (!cod_cliente || !tipo_cliente || !usuario || !usuario.cod_usuario){
            throw new Error('Alguns parâmetros estão faltando.');
        }

        return new Promise((resolve, reject) => {
            const payload = {
                cod_cliente,
                tipo_cliente,
                usuario
            };
            const secret = process.env.JWT_REFRESH_TOKEN_SECRET;
            const options = {
                expiresIn: '1d'
            };

            jwt.sign(payload, secret, options, (error, userRefreshToken) => {
                if (error){
                    console.error('Algo inesperado aconteceu ao assinar o RefreshToken do Usuário.', error);

                    let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                    customErr.status = 500;
                    customErr.code = 'INTERNAL_SERVER_ERROR';

                    return reject(customErr);
                } else {

                    // Configurações de armazenamento desses dados no Redis.
                    const userSetKey = `userRefresh:${usuario.cod_usuario}`;   // "usuario.cod_usuario" é recebido nos parâmetros da função.
                    const expirationTimeInSeconds = 24 * 60 * 60;        // Tempo de expiração em segundos, deve ser igual ao tempo de expiração do JWT.

                    // Armazenando o Refresh Token do Usuário no Redis.
                    redisClient.HSET(userSetKey, 'userRefreshToken', userRefreshToken, (error, redisReply) => {
                        if (error){
                            console.error('Algo inesperado aconteceu ao armazenar o RefreshToken do Cliente no Redis.', error);

                            let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_ERROR';

                            return reject( customErr );
                        }

                        // Resolvendo o Token de Renovação do Usuário...
                        redisClient.EXPIRE(userSetKey, expirationTimeInSeconds, (error, redisReply) => {
                            if (error){
                                let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                                customErr.status = 500;
                                customErr.code = 'INTERNAL_SERVER_ERROR';

                                return reject( customErr );
                            }
                        });
                        return resolve(userRefreshToken);
                    });
                    // Fim do armazenamento do Refresh Token do Usuário no Redis.

                }
            });

        });

    };

    // Verificação/Autenticação das Assinaturas dos Tokens de Acesso.

    /** @description Middleware para verificação/autenticação dos Tokens de Acesso. */
    verifyAccessToken = (req, res, next) => {

        if (req.url.match(/^\/autenticacoes\/apis/)){   // Como a rota de autenticação deverá ser a única rota acessível à qualquer um, simplesmente passamos ela adiante, caso uma requisição chegue para ela.
            return next();
        }

        if (req.method == 'GET'){

            if (req.url.match(/^\/usuarios\/animais\/albuns\/fotos\/[^?/]+\.jpeg$/)){   // Se for a rota de exibição de fotos de animais, permita.
                return next();
            }

            if (req.url.match(/^\/usuarios\/avatars\/[^?/]+\.jpeg$/)){   // Se for a rota de exibição de fotos de animais, permita.
                return next();
            }

            if (req.url.match(/^\/usuarios\/banners\/[^?/]+\.jpeg$/)){   // Se for a rota de exibição de fotos de animais, permita.
                return next();
            }

            if (req.url.match(/^\/favicon.ico$/)){
                return next();
            }

            if (req.url.match(/^\/styles.css$/)){
                return next();
            }

            if (req.url.match(/^\/styles.js$/)){
                return next();
            }

        }

        if (!req.headers['authorization']){

            console.log('[manage_jwt.254] - Access not allowed. Authorization header not sent.');
            return res.status(401).json({
                mensagem: 'Requisição não autorizada.',
                code: 'ACCESS_NOT_ALLOWED'
            });

            // let customErr = new Error('Requisição não autorizada.');
            // customErr.status = 401;
            // customErr.code = 'ACCESS_NOT_ALLOWED';
            // return next( customErr );
        }

        const token = req.headers['authorization'].split(" ")[1];

        jwt.verify(token, process.env.JWT_ACCESS_TOKEN_SECRET, (error, payload) => {
            if (error) {

                if (error.name == 'JsonWebTokenError'){
                    return res.status(401).json({
                        mensagem: 'Requisição não autorizada.',
                        code: 'ACCESS_NOT_ALLOWED'
                    })
                } else {
                    return res.status(401).json({
                        mensagem: 'O Token de Acesso está expirado.',
                        code: 'EXPIRED_AUTH'
                    })
                };

            };

            req.dadosAuthToken = payload;
            next();
        });
    };

     // Verificação/Autenticação das Assinaturas dos Refresh Tokens.

    /** @param {string} refreshToken */
    verifyRefreshToken = (refreshToken) => {

        return new Promise((resolve, reject) => {

            jwt.verify(refreshToken, process.env.JWT_REFRESH_TOKEN_SECRET, (error, payload) => {
                if (error){

                    console.error('Algo inesperado aconteceu ao verificar o RefreshToken.', error);

                    if (error.name == 'JsonWebTokenError'){

                        let customErr = new Error('Requisição não autorizada.');
                        customErr.status = 401;
                        customErr.code = 'ACCESS_NOT_ALLOWED';
                        return reject(customErr);

                    } else {

                        let customErr = new Error('O Refresh Token está expirado.');
                        customErr.status = 401;
                        customErr.code = 'EXPIRED_AUTH';
                        return reject(customErr);

                    };

                };

                // Verificando se o Refresh Token pertence a uma Aplicação ou a um Usuário de uma Aplicação.

                if (payload.cod_cliente && !payload.usuario){
                    // Se o payload tiver um "cod_cliente" e não tiver um usuário, então é uma requisição de um Cliente (Aplicação).
                    const client = payload;

                    // Verificando se um Refresh Token já existe para o Cliente.
                        const clientSetKey = `clientRefresh:${client.cod_cliente}`;

                        redisClient.HGET(clientSetKey, 'clientRefreshToken', (error, result) => {
                            if (error){
                                console.error('Algo inesperado aconteceu ao verificar no Redis se o Cliente possui um Refresh Token ativo.', error);

                                let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                                customErr.status = 500;
                                customErr.code = 'INTERNAL_SERVER_ERROR';

                                return reject( customErr );
                            };

                            // console.log('RedisClientRefresh Result:', result); // refreshToken

                            // O Refresh Token que nos enviaram é igual ao que existe no Redis?
                            if (refreshToken === result){
                                // Se sim, entregue o objeto do Cliente.
                                return resolve(client);
                            } else {
                                // Se não, não autorize o acesso.
                                // console.log('O Refresh Token passado não foi encontrado no Redis DB');

                                let customErr = new Error('Requisição não autorizada.');

                                customErr.status = 401;
                                customErr.code = 'ACCESS_NOT_ALLOWED';
                                return reject(customErr);
                            };

                        });
                    // Fim da Verificação de Refresh Token vigente para o Cliente.

                } else if (payload.cod_cliente && payload.usuario) {
                    // Se tiver um usuário, então é uma requisição de um usuário conectado via um cliente (Aplicação).
                    const user = payload;

                    // Verificando se um Refresh Token já existe para o Usuário.
                        const userSetKey = `userRefresh:${user.usuario.cod_usuario}`;

                        redisClient.HGET(userSetKey, 'userRefreshToken', (error, result) => {
                            if (error){
                                console.error('Algo inesperado aconteceu ao verificar no Redis se o Usuário possui um Refresh Token ativo.', error);

                                let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                                customErr.status = 500;
                                customErr.code = 'INTERNAL_SERVER_ERROR';

                                return reject( customErr );
                            };

                            // O Refresh Token que nos enviaram é igual ao que existe no Redis?
                            if (refreshToken === result){
                                // Se sim, entregue o objeto do Cliente.
                                return resolve(user);
                            } else {
                                // Se não, não autorize o acesso.
                                let customErr = new Error('Requisição não autorizada.');

                                customErr.status = 401;
                                customErr.code = 'ACCESS_NOT_ALLOWED';
                                return reject(customErr);
                            };

                        });
                    // Fim da Verificação de Refresh Token vigente para o Cliente.

                } else {
                    // Se não tiver nem um, nem outro a requisição é inválida.
                    let customErr = new Error('Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.');
                    customErr.status = 401;
                    customErr.code = 'ACCESS_NOT_ALLOWED';
                    return reject(customErr);
                };

                // Fim da verificação do Refresh Token (Aplicação ou Usuário da Aplicação).

            });

        });
        
    };


// Exportações.
module.exports = {
    signClientAccessToken,
    signClientRefreshToken,
    signUserAccessToken,
    signUserRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
}