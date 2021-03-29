// Importações.

const express = require('express');
const router = express.Router();

const { signUserAccessToken, signUserRefreshToken, verifyRefreshToken } = require('../../helpers/manage_jwt');

const bcrypt = require('bcrypt');

const ContaLocal = require('../models/ContaLocal');
const ContaFacebook = require('../models/ContaFacebook');
const ContaGoogle = require('../models/ContaGoogle');
const Usuario = require('../models/Usuario');

const redisClient = require('../../configs/redis_connection');

// Rotas.

router.post('/login', async (req, res, next) => {     // Verifica se o usuário está cadastrado e possui as credenciais corretas para entregar o Token de Acesso e o Token de Renovação.

    // Restrições de acesso à rota --- Apenas as Aplicações Pet Adote poderão autenticar usuários.
    if (!req.dadosAuthToken){   // Se não houver autenticação, não permita o acesso.

        return res.status(401).json({
            mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
            code: 'ACCESS_NOT_ALLOWED'
        });

    } else {

        // Se o Cliente não for do tipo Pet Adote, não permita o acesso.
        if (req.dadosAuthToken.tipo_cliente !== 'Pet Adote'){
            return res.status(401).json({
                mensagem: 'Requisição inválida - Você não possui o nível de acesso adequado para esse recurso.',
                code: 'ACCESS_NOT_ALLOWED'
            });
        }

    }
    // Fim das restrições de acesso à rota.

    let usuario = undefined;

    // Verificação de uma Conta Local.
    if (req.body.email){
        await ContaLocal.findOne({ 
            where: {
                email: req.body.email
            },
            include: [{
                model: Usuario,
                attributes: ['esta_ativo', 'ong_ativo', 'e_admin']
            }],
            nest: true,
            raw: true
        }).then((result) => {
            
            console.log(result);

            if (result){

                // O e-mail está vinculado à uma conta. Verifique se a senha está correta.
                if (bcrypt.compareSync(req.body.senha, result.senha)){

                    // A senha é válida, usuário autêntico. Montando os dados do usuário que incrementarão o Token.
                    return usuario = { 
                        cod_usuario: result.cod_usuario,
                        tipo_cadastro: 'local',
                        esta_ativo: result.Usuario.esta_ativo,
                        ong_ativo: result.Usuario.ong_ativo,
                        e_admin: result.Usuario.e_admin
                    }

                } else {

                    // Senha inválida, unauthorized.
                    return res.status(401).json({
                        mensagem: 'Credenciais inválidas, acesso negado.',
                        code: 'INVALID_USER_CREDENTIALS'
                    });

                }


            } else {

                // O e-mail não está vinculado à uma conta, unauthorized.
                return res.status(401).json({
                    mensagem: 'Credenciais inválidas, acesso negado.',
                    code: 'INVALID_USER_CREDENTIALS'
                });

            }
        }).catch((error) => {

            // Erro ao buscar o usuário.
            console.log('Erro ao verificar as credenciais de acesso do usuário: ', error);

            let customErr = new Error('Algo inesperado aconteceu ao verificar as credenciais de acesso do usuário. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR';

            next( customErr );
            
        });
    }

    // Verificação de uma Conta Facebook.

        // ToDo...

    // Verificação de uma Conta Google.

        // ToDo...

    console.log('Usuario autenticado:', usuario);

    // Atribuição do Token de Acesso (Access Token) e do Token de Renovação (Refresh Token) do Usuário.
    if (usuario){

        try {

            const user_AccessToken = await signUserAccessToken(req.dadosAuthToken.cod_cliente, req.dadosAuthToken.tipo_cliente, usuario);
            const user_RefreshToken = await signUserRefreshToken(req.dadosAuthToken.cod_cliente, req.dadosAuthToken.tipo_cliente, usuario);

            if (usuario.esta_ativo == 0){
                return res.header('Authorization', `Bearer ${user_AccessToken}`).status(200).json({
                    mensagem: 'Autenticação realizada, porém o usuário ainda não ativou a conta. Utilize o [ cod_usuario ] para reenviar o e-mail contendo o Token de Ativação. E o [ inactiveUser_AccessToken ] para realizar a ativação quando o usuário informar o Token de Ativação que recebeu no e-mail. Quando o usuário ativar a conta, ele deverá renovar seu Token de acesso desconectando-se da conta e autenticando-se novamente.',
                    cod_usuario: usuario.cod_usuario,
                    reenvio_ativacao: `${req.protocol}://${req.get('host')}/contas/ativacao/reenvio/${usuario.cod_usuario}`,
                    exemplo_ativacao: `${req.protocol}://${req.get('host')}/contas/ativacao/012T0K3n`,
                    inactiveUser_AccessToken: user_AccessToken,
                    inactiveUser_RefreshToken: user_RefreshToken
                });
            }

            if (usuario.esta_ativo == 1){
                return res.header('Authorization', `Bearer ${user_AccessToken}`).status(200).json({
                    mensagem: 'Usuário autenticado com sucesso.',
                    cod_usuario: usuario.cod_usuario,
                    user_AccessToken,
                    user_RefreshToken
                });
            }
        
        } catch (error) {
            console.log('Algo inesperado aconteceu ao autenticar o usuário.', error);

            let customErr = new Error('Algo inesperado aconteceu ao autenticar o usuário. Entre em contato com o administrador.');
            customErr.status = 500;
            customErr.code = 'INTERNAL_SERVER_ERROR';
            
            return next( customErr );
        }

        // O usuário autenticou-se na aplicação. Gerando o Token de Acesso.
        // signUserAccessToken(req.dadosAuthToken.cod_cliente, req.dadosAuthToken.tipo_cliente, usuario)
        // .then((userAccessToken) => {

        //     if (usuario.esta_ativo == 0){

        //         // O usuário realizou a autenticação, porém ainda não ativou a conta.
        //         /*  Uma vez que o Token vai conter "esta_ativo" como 0 (false) é possível permitir que esse usuário visualize áreas públicas e pessoais (altere seus próprios dados) da aplicação. 
        //             Porém não permitir que ele interaja com outros usuários, como por exemplo: Faça candidaturas de adoção. */
    
        //         return res.header('Authorization', `Bearer ${userAccessToken}`).status(200).json({
        //             mensagem: 'Autenticação realizada com sucesso, porém o usuário ainda não ativou a conta. Utilize o [ cod_usuario ] para re-enviar o e-mail contendo o Token de Ativação. E o [ token_usuario ] para realizar a ativação quando o usuário informar o Token de Ativação que recebeu no e-mail. Quando o usuário ativar a conta, ele deverá renovar seu Token de acesso desconectando-se da conta e autenticando-se novamente.',
        //             cod_usuario: usuario.cod_usuario,
        //             token_usuario_inativo: userAccessToken,
        //             reenvio_ativacao: `${req.protocol}://${req.get('host')}/contas/ativacao/reenvio/${usuario.cod_usuario}`,
        //             exemplo_ativacao: `${req.protocol}://${req.get('host')}/contas/ativacao/012T0K3n`
        //         });
        //     }; 

        //     if (usuario.esta_ativo == 1){
        //         // O usuário realizou a autenticação e também ativou a conta.
        //         /*  Se o usuário for autêntico e ativou a conta utilizando ou o E-mail, o Telefone, ou o CPF via suporte Pet Adote, podemos
        //             permitir que esse usuário interaja com os outros usuários, teremos maior segurança de que ele é real. */
    
        //         return res.header('Authorization', `Bearer ${userAccessToken}`).status(200).json({
        //             mensagem: 'Usuário autenticado com sucesso.',
        //             cod_usuario: usuario.cod_usuario,
        //             token_usuario: userAccessToken
        //         });
        //     };

        // })
        // .catch((error) => {
        //     // Erro ao assinar o Token de Acesso do usuário.
        //     console.log('Erro ao verificar as credenciais de acesso do usuário: ', error);

        //     let customErr = new Error('Algo inesperado aconteceu ao autenticar o usuário. Entre em contato com o administrador.');
        //     customErr.status = 500;
        //     customErr.code = 'INTERNAL_SERVER_ERROR';

        //     return next( customErr );
        // });

    };

});

router.post('/refresh', async (req, res, next) => {     // Verifica se o Token de Renovação do usuário é válido para renovar seu Token de Acesso.

    try {

        const { refreshToken } = req.body;

        if (!refreshToken){
            let customErr = new Error('Token não encontrado na requisição.');
            customErr.status = 400;
            customErr.code = 'BAD_REQUEST';

            return next( customErr );
        };

        const user = await verifyRefreshToken(refreshToken);

        if (!user.usuario || !user.cod_cliente){ // Se o 'refreshToken' enviado não possuir os dados de um usuário ou da aplicação...
            let customErr = new Error('Token inválido.');
            customErr.status = 403;
            customErr.code = 'NOT_ALLOWED';

            return next( customErr );
        };

        const user_AccessToken = await signUserAccessToken(user.cod_cliente, user.tipo_cliente, user.usuario);
        const user_RefreshToken = await signUserRefreshToken(user.cod_cliente, user.tipo_cliente, user.usuario);

        if (user.usuario.esta_ativo == 0){
            return res.header('Authorization', `Bearer ${user_AccessToken}`).status(200).json({
                mensagem: 'Renovação realizada, porém o usuário ainda não ativou a conta. Utilize o [ cod_usuario ] para reenviar o e-mail contendo o Token de Ativação. E o [ inactiveUser_AccessToken ] para realizar a ativação quando o usuário informar o Token de Ativação que recebeu no e-mail. Quando o usuário ativar a conta, ele deverá renovar seu Token de acesso desconectando-se da conta e autenticando-se novamente.',
                cod_usuario: user.usuario.cod_usuario,
                reenvio_ativacao: `${req.protocol}://${req.get('host')}/contas/ativacao/reenvio/${user.usuario.cod_usuario}`,
                exemplo_ativacao: `${req.protocol}://${req.get('host')}/contas/ativacao/012T0K3n`,
                inactiveUser_AccessToken: user_AccessToken,
                inactiveUser_RefreshToken: user_RefreshToken
            });
        };

        if (user.usuario.esta_ativo == 1){
            return res.header('Authorization', `Bearer ${user_AccessToken}`).status(200).json({
                mensagem: 'Usuário renovado com sucesso.',
                cod_usuario: user.usuario.cod_usuario,
                user_AccessToken,
                user_RefreshToken
            });
        };

    } catch (error) {
        console.log('Algo inesperado aconteceu ao renovar a autenticação do usuário.', error);

        req.pause();
        let customErr = new Error('Algo inesperado aconteceu ao renovar a autenticação do usuário. Entre em contato com o administrador.');
        customErr.status = 500;
        customErr.code = 'INTERNAL_SERVER_ERROR';
        
        return next( customErr );
    }


});

router.delete('/logout', async (req, res, next) => {     // Descarta o Refresh Token do Usuário, assim ele não poderá mais receber Access Tokens até autenticar-se novamente.

    try {

        const { refreshToken } = req.body;

        if(!refreshToken) {
            let customErr = new Error('Token não encontrado na requisição.');
            customErr.status = 400;
            customErr.code = 'BAD_REQUEST';

            return next( customErr );
        };

        const user = await verifyRefreshToken(refreshToken);

        if (!user.usuario || !user.cod_cliente){ // Se o 'refreshToken' enviado não possuir os dados de um usuário ou da aplicação...
            let customErr = new Error('Token inválido.');
            customErr.status = 403;
            customErr.code = 'NOT_ALLOWED';

            return next( customErr );
        };

        // Removendo o conjunto de dados contendo o Refresh Token do Cliente.
        redisClient.DEL(`userRefresh:${user.usuario.cod_usuario}`, (error, result) => {
            if (error) {
                console.log('Algo inesperado aconteceu ao remover o Refresh Token do Usuário.', error);

                let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_ERROR';
                
                return next( customErr );
            };

            // Se nenhum error acontecer, a chave será deletada ou um resultado dizendo que ela nunca existiu será retornado...
            console.log('Resultado da remoção do Refresh Token do Usuário:', result);

            return res.status(200).json({
                mensagem: 'Usuário desconectado com sucesso.'
            });

        });


    } catch (error) {

        console.log('Algo inesperado aconteceu durante a remoção do Refresh Token do Usuário.', error);

        let customErr = new Error('Algo inesperado aconteceu. Entre em contato com o administrador.');
        customErr.status = 500;
        customErr.code = 'INTERNAL_SERVER_ERROR';
        
        return next( customErr );

    };
    
});

// Exportação.
module.exports = router;