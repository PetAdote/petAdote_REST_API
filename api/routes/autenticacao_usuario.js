// Importações.

const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');

const bcrypt = require('bcrypt');

const ContaLocal = require('../models/ContaLocal');
const ContaFacebook = require('../models/ContaFacebook');
const ContaGoogle = require('../models/ContaGoogle');
const Usuario = require('../models/Usuario');

// Rotas.

router.post('/', async (req, res, next) => {     // Verifica se o usuário está cadastrado para entregar o Token de Acesso.

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
                    usuario = { 
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

    // Atribuição do Token de Acesso do Usuário.
    if (usuario){

        // O usuário autenticou-se na aplicação. Gerando o Token de Acesso.
        const tokenUsuario = jwt.sign({
            cod_cliente: req.dadosAuthToken.cod_cliente,
            tipo_cliente: req.dadosAuthToken.tipo_cliente,
            usuario: usuario
        }, process.env.JWT_KEY, {
            expiresIn: '6h'
        });

        if (usuario.esta_ativo == 0){

            // O usuário realizou a autenticação, porém ainda não ativou a conta.
            /*  Uma vez que o Token vai conter "esta_ativo" como 0 (false) é possível permitir que esse usuário visualize áreas públicas e pessoais (altere seus próprios dados) da aplicação. 
                Porém não permitir que ele interaja com outros usuários, como por exemplo: Faça candidaturas de adoção. */

            return res.header('Authorization', `Bearer ${tokenUsuario}`).status(200).json({
                mensagem: 'Autenticação realizada com sucesso, porém o usuário ainda não ativou a conta. Utilize o [ cod_usuario ] para re-enviar o e-mail contendo o Token de Ativação. E o [ token_usuario ] para realizar a ativação quando o usuário informar o Token de Ativação que recebeu no e-mail. Quando o usuário ativar a conta, ele deverá renovar seu Token de acesso desconectando-se da conta e autenticando-se novamente.',
                cod_usuario: usuario.cod_usuario,
                token_usuario_inativo: tokenUsuario,
                reenvio_ativacao: `${req.protocol}://${req.get('host')}/contas/ativacao/reenvio/${usuario.cod_usuario}`,
                exemplo_ativacao: `${req.protocol}://${req.get('host')}/contas/ativacao/012T0K3n`
            });
        } 

        if (usuario.esta_ativo == 1){
            // O usuário realizou a autenticação e também ativou a conta.
            /*  Se o usuário for autêntico e ativou a conta utilizando ou o E-mail, o Telefone, ou o CPF via suporte Pet Adote, podemos
                permitir que esse usuário interaja com os outros usuários, teremos maior segurança de que ele é real. */

            return res.header('Authorization', `Bearer ${tokenUsuario}`).status(200).json({
                mensagem: 'Usuário autenticado com sucesso.',
                cod_usuario: usuario.cod_usuario,
                token_usuario: tokenUsuario
            });
        }

    }

});

// Exportação.
module.exports = router;