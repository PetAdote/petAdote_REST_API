// Importações.
    const Usuario = require('../models/Usuario');
    const Token = require('../models/Token');

    const { Op } = require('sequelize');

    const moment = require('moment');

    const randomize = require('randomatic');

// Exportação.

/** 
 *  @param {number} cod_usuario ID do usuário requisitante do token.
 *  @description Retornará o Token do usuário ou erros com o motivo pelo qual o Token não pôde ser gerado.
 */
module.exports = async (cod_usuario) => {

    let tokenAtivacao = undefined;

    await Usuario.findByPk(cod_usuario, { 
        raw: true
    })
    .then(async (resultFind) => {

        if (resultFind){

            // Verifica se existe algum Token de Ativação do usuário em vigência.
            await Token.findOne({
                where: { 
                    cod_usuario: cod_usuario,
                    tipo_token: 'ativacao',
                    data_limite: {
                        [Op.gt]: new Date()
                    }
                },
                raw: true
            })
            .then(async (resultFindToken) => {
                
                if (resultFindToken && resultFindToken.data_limite > new Date() ){
                    // Se o usuário possuir um Token de Ativação em vigência não permita que ele crie um novo.
                    let customErr = new Error('Ainda existe um Token de Ativação vigente para esse usuário');
                    customErr.data_liberacao = resultFindToken.data_limite.toLocaleString();
                    customErr.status = 403;
                    customErr.code = 'USER_HAS_ACTIVE_TOKEN';

                    throw customErr;

                } else {
                    // Se o Token de Ativação do usuário tiver expirado, delete o registro do Token expirado e crie um novo.

                    // Remove Tokens de Ativação antigos (Caso o usuário peça um novo Token)
                    // Atenção: Pode ser que o Token antigo já tenha sido removido pelo Scheduler do Sistema.
                    await Token.destroy({
                        where: {
                            cod_usuario: cod_usuario,
                            tipo_token: 'ativacao',
                            data_limite: {
                                [Op.lt]: new Date()
                            }
                        }
                    })
                    .then(async (resultDestroyOldTokens) => {
                        console.log('Quantidade de Tokens de Ativação expirados desse usuário removidos: ', resultDestroyOldTokens);

                        // Cria um novo Token de Ativação.
                        await Token.create({
                            cod_usuario: cod_usuario,
                            token: randomize('Aa0', 8),
                            tipo_token: 'ativacao',
                            data_limite: new Date(moment().add(15, 'minutes'))
                        })
                        .then((resultToken) => {
                            // Retorne o Token.
                            // console.log('resultToken: ', resultToken.get({ plain: true }) );

                            return tokenAtivacao = resultToken.get({ plain: true });
                        })
                        .catch((errorToken) => {

                            console.log('Algo inesperado ocorreu ao atribuir o Token de Ativação para o usuário.', errorToken);

                            let customErr = new Error('Algo inesperado ocorreu ao atribuir o Token de Ativação para o usuário. Entre em contato com o administrador.');
                            customErr.status = 500;
                            customErr.code = 'INTERNAL_SERVER_ERROR';

                            throw customErr;
                            
                        });

                    })
                    .catch((errorDestroyOldTokens) => {
                        console.log('Algo inesperado aconteceu ao remover os tokens de ativação antigos.', errorDestroyOldTokens);

                        let customErr = new Error('Algo inesperado aconteceu ao remover os tokens de ativação antigos. Entre em contato com o administrador.');
                        customErr.status = 500;
                        customErr.code = 'INTERNAL_SERVER_ERROR';

                        throw customErr;

                    });

                };

            })
            .catch((errorFindToken) => {
                console.log('Algo inesperado aconteceu ao verificar se um Token de Ativação está em vigência.', errorFindToken);

                let customErr = new Error('Algo inesperado aconteceu ao verificar se um Token de Ativação está em vigência. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';

                throw customErr;

            });

        } else {

            // console.log('Nenhum usuário com o id informado foi encontrado.');

            let customErr = new Error('Nenhum usuário com o ID informado foi encontrado.');
            customErr.status = 404;
            customErr.code = 'RESOURCE_NOT_FOUND';

            throw customErr;

        };

    })
    .catch((errorFind) => {

        console.log('Algo inesperado ocorreu ao buscar os dados do usuário para atribuir o Token de Ativação.', errorFind);

        let customErr = new Error('Algo inesperado ocorreu ao buscar os dados do usuário para atribuir o Token de Ativação. Entre em contato com o administrador.');
        customErr.status = 500;
        customErr.code = 'INTERNAL_SERVER_ERROR';

        throw customErr;

    });

    return tokenAtivacao;

    
};