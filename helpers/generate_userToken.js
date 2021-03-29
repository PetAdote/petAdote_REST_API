// Importações.
    const Usuario = require('../api/models/Usuario');

    const redisClient = require('../configs/redis_connection');

    const randomize = require('randomatic');

// Exportação.

/**
 * @param {*} cod_usuario Código do usuário que estará vinculado ao Token.
 * @param {('atv'|'rec')} tokenType Tipo do Token (Atv = Ativação), (Rec = Recuperação).
 * @param {Number} expirationTimeInSeconds Tempo de expiração em segundos. Padrão = 15 minutos (15 * 60).
 * @description Retorna um objeto {token, data_expiracao}. Caso algo dê errado, retorna o erro contendo {message, data_expiracao?, status, code}
 */
module.exports = async (cod_usuario, tokenType, expirationTimeInSeconds = 15 * 60) => {


    // Verificação dos parâmetros.
    let allowedTokenTypes = [
        'atv',
        'rec',
    ];

    let invalidTokenType = false;

    // Verificando se o objeto recebido contém os dados necessários.
    if (!allowedTokenTypes.includes(tokenType)){
        invalidTokenType = true
    };

    if (!Number(cod_usuario) || !Number(expirationTimeInSeconds) || invalidTokenType){

        let customErr = new Error('O valor passado para algum dos parâmetros é inválido.');
        customErr.status = 400;
        customErr.code = 'INVALID_PARAM';

        throw customErr;

    }
    // Fim da verificação dos parâmetros.

    // Normalização dos parâmetros.
    cod_usuario = Number(cod_usuario);  // Evita a entrada de um número como string.
    expirationTimeInSeconds = Number(expirationTimeInSeconds);
    // Fim da normalização dos parâmetros.

    return new Promise((resolve, reject) => {

        let token = randomize('Aa0', 8);    // Código de 8 caracteres alfanuméricos.
        let secondsToExpire = expirationTimeInSeconds;
        let data_expiracao = new Date().getTime() + secondsToExpire * 1000; // Timestamp.

        let hashKey = `tokens:${tokenType}:user_${cod_usuario}`;

        
        // Verificando se existe algum Token (atv/rec) vigente para o usuário.
        redisClient.HGETALL(hashKey, (errorHGETALL, resultHGETALL) => {
            if (errorHGETALL){
                console.log('Algo inesperado aconteceu ao verificar se um Token de Ativação está em vigência.', errorHGETALL);

                let customErr = new Error('Algo inesperado aconteceu ao verificar se um Token de Ativação está em vigência. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';

                return reject(customErr);
            };

            console.log(`Algum Token do tipo ['${tokenType}'] foi encontrado?`, resultHGETALL);

            if (resultHGETALL){
                let dataExpiracaoToken = Number(resultHGETALL.data_expiracao);

                if (dataExpiracaoToken > new Date()){
                    // Se o usuário possuir um Token de Ativação em vigência não permita que ele crie um novo.
                    let customErr = new Error('Ainda existe um Token de Ativação vigente para esse usuário');
                    customErr.data_expiracao = new Date(dataExpiracaoToken).toLocaleString();
                    customErr.status = 403;
                    customErr.code = 'USER_HAS_ACTIVE_TOKEN';

                    return reject(customErr);
                }

            }

            // Nenhum Token vigente encontrado: Verificando se o usuário existe.
            Usuario.findByPk(cod_usuario, { 
                attributes: ['cod_usuario'],
                raw: true
            })
            .then((resultFindUser) => {
                if (!resultFindUser){   // Se o usuário não existir, não continue.
                    let customErr = new Error('Nenhum usuário com o ID informado foi encontrado.');
                    customErr.status = 404;
                    customErr.code = 'RESOURCE_NOT_FOUND';

                    return reject(customErr);
                };

                // Se a verificação do Token de Ativação em vigência não retornou um erro e o usuário existe, crie um novo Token de Ativação.
                redisClient.HSET(hashKey, [
                    'token', token,
                    'data_expiracao', data_expiracao
                ],
                (errorHSET, resultHSET) => {
                    if (errorHSET){
                        console.log('Algo inesperado ocorreu ao atribuir o Token de Ativação para o usuário.', errorHSET);
        
                        let customErr = new Error('Algo inesperado ocorreu ao atribuir o Token de Ativação para o usuário. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR';
        
                        return reject(customErr);
                    }

                    console.log(`Quantos campos em [${hashKey}] foram atribuídos?`, resultHSET);

                    // Adiciona o tempo de expiração ao Token.
                    redisClient.EXPIRE(hashKey, secondsToExpire, (errorEXP, resultEXP) => {
                        if (errorEXP){
                            console.log('Algo inesperado ocorreu ao atribuir o Token de Ativação para o usuário.', errorEXP);
            
                            let customErr = new Error('Algo inesperado ocorreu ao atribuir o Token de Ativação para o usuário. Entre em contato com o administrador.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_ERROR';
            
                            return reject(customErr);
                        }
            
                        console.log('TTL foi adicionado?', resultEXP);

                        return resolve({
                            token: token,
                            data_expiracao: new Date(data_expiracao)
                        }); // returning resolve.

                    }); // ending redisClient.EXPIRE()
        
                }); // ending redisClient.HSET()

            })
            .catch((errorFindUser) => {
                console.log('Algo inesperado ocorreu ao buscar os dados do usuário para atribuir o Token de Ativação.', errorFindUser);

                let customErr = new Error('Algo inesperado ocorreu ao buscar os dados do usuário para atribuir o Token de Ativação. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';

                return reject(customErr);
            }); // ending Usuario.findByPk()

        }); // ending redisClient.HGETALL()

    }); // ending promise.

};