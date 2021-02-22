/* Observações: Como desenvolvedores, ao construir uma REST API, devemos documentar de forma clara e consistente
                quais campos são necessários às rotas de nossa API.
*/

// Importações.
const express = require('express');
const router = express.Router();

// const controller = require('../controllers/perfis');   // TODO...

// Importação dos Models...

    const Usuario = require('../models/Usuario');
    const ContaLocal = require('../models/ContaLocal');
    const ContaFacebook = require('../models/ContaFacebook');
    const ContaGoogle = require('../models/ContaGoogle');
    const EnderecoUsuario = require('../models/EnderecoUsuario');

    const sequelize = require('../../configs/database').connection;

const { EventEmitter } = require('events'); // Gerador de eventos do Node.

const fs = require('fs');                   // 'fs' do Node para manipular o "file system', gerenciando os arquivos que o servidor receberá.
const path = require('path');               // 'path' do Node para gerenciar caminhos para arquivos e diretórios.
const util = require('util');               // 'util' do Node para analisar objetos complexos e outras utilidades.
const uuid = require('uuid');               // 'uuid' para criar os nomes únicos dos arquivos.

const formidable = require('formidable');   // 'formidable' para receber dados via POST de um formulário com encode 'multipart/form-data' (XMLHttpRequest).

const sharp = require('sharp');             // 'sharp' para processar imagens.

const bcrypt = require('bcrypt');           // 'bcrypt' para "hashear" as senhas dos usuários antes de enviá-las ao DB.

// TODO... A maioria dessas importações irão para os controllers. Estão aqui só durante a fase inicial de testes.

// Rotas.
router.get('/', (req, res, next) => {

    // Caso 01 - Se "codUsuario" for passado na Query String. Encontre um endeço cuja FK seja igual à "codUsuario".
    if (req.query.codUsuario){

        if (req.query.codUsuario.match(/[^\d]+/g)){     // Se "codUsuario" conter algo diferente do esperado.
            return res.status(400).json({
                mensagem: "Requisição inválida - O ID de um Usuario deve conter apenas dígitos."
            });
        }

        return EnderecoUsuario.findOne({ where: { cod_usuario: req.query.codUsuario }, raw: true })
        .then((result) => {
            if (result) {
                res.status(200).json({
                    mensagem: 'Endereco encontrado.',
                    endereco: result,
                    usuario: `${req.protocol}://${req.get('host')}/usuarios/${result.cod_usuario}`
                });
            } else {
                res.status(404).json({
                    mensagem: 'Não foi encontrado nenhum endereço vínculado à este ID de Usuário.',
                    lista_enderecos: `${req.protocol}://${req.get('host')}/usuarios/enderecos/`,
                });
            }
        })
        .catch((error) => {
            console.log(`GET: '/usuarios/enderecos/?codUsuario=' - Algo deu errado... \n`, error);
            return next( new Error('Algo inesperado aconteceu ao buscar um endereço vinculado à um usuário. Entre em contato com o administrador.') );
        })

    }

    // Caso 02 - Se nada for passado na Query String... Liste todos os endereços.
    EnderecoUsuario.findAll({ raw: true })
    .then((resultArr) => {

        if (resultArr.length === 0){
            return res.status(200).json({
                mensagem: 'Nenhum endereço foi registrado.'
            });
        }

        res.status(200).json({
            total_enderecos: resultArr.length,
            mensagem: 'Lista de enderecos registrados.',
            enderecos: resultArr
        });

    })
    .catch((error) => {

        console.log(`GET: '/usuarios/enderecos/' - Algo deu errado... \n`, error);
        return next( new Error('Algo inesperado aconteceu ao buscar a lista de usuários. Entre em contato com o administrador.') );

    });

});

router.get('/:codEndereco', async (req, res, next) => {

    // Encontra endereços via PK.

    if (req.params.codEndereco.match(/[^\d]+/g)){
        return res.status(400).json({
            mensagem: "Requisição inválida - O ID de um Endereço deve conter apenas dígitos."
        });
    }

    EnderecoUsuario.findByPk(req.params.codEndereco, { raw: true })
    .then((result) => {

        if (result) {
            res.status(200).json({
                mensagem: 'Endereco encontrado.',
                endereco: result,
                usuario: `${req.protocol}://${req.get('host')}/usuarios/${result.cod_usuario}`
            });
        } else {
            res.status(404).json({
                mensagem: 'Nenhum endereco com esse ID foi encontrado.'
            });
        }

    })
    .catch((error) => {
        console.log(`GET: '/usuarios/enderecos/:codEndereco' - Algo deu errado... \n`, error);
        return next( new Error('Algo inesperado aconteceu ao buscar os dados de um endereço. Entre em contato com o administrador.') );
    });

});

// router.post('/', (req, res, next) => {   // A criação de um novo perfil acontecerá na rota "usuarios.js".

// });

// router.patch('/:idPerfil'/*, controller.perfil_updateOne*/);

// router.delete('/:idPerfil'/*, controller.perfil_deleteOne*/);

// Exportação.
module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.
