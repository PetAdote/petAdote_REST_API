/* Observações: Como desenvolvedores, ao construir uma REST API, devemos documentar de forma clara e consistente
                quais campos são necessários às rotas de nossa API.
*/

// Importações.
    const express = require('express');
    const router = express.Router();

    // const controller = require('../controllers/usuarios');   // TODO...

    // Importação dos Models...

        const Usuario = require('../models/Usuario');
        const ContaLocal = require('../models/ContaLocal');
        const ContaFacebook = require('../models/ContaFacebook');
        const ContaGoogle = require('../models/ContaGoogle');
        const EnderecoUsuario = require('../models/EnderecoUsuario');

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

        Usuario.findAll({ attributes: ['cod_usuario'], raw: true })
        .then((resultArr) => {

            if (resultArr.length === 0){
                return res.status(200).json({
                    mensagem: 'Nenhum usuário está registrado.'
                });
            }

            resultArr.forEach((row) => {
                row.conta = `${req.protocol}://${req.get('host')}/contas/?codUsuario=${row.cod_usuario}`,
                row.detalhes = `${req.protocol}://${req.get('host')}/usuarios/${row.cod_usuario}`
            });

            res.status(200).json({
                total_usuarios: resultArr.length,
                mensagem: 'Lista de usuários registrados.',
                usuarios: resultArr
            });

        })
        .catch((error) => {

            console.log(`GET: '/usuarios/' - Algo deu errado... \n`, error);
            return next( new Error('Algo inesperado aconteceu ao buscar a lista de usuários. Entre em contato com o administrador.') );

        });

    });

    router.get('/:codUsuario', async (req, res, next) => {

        if (req.params.codUsuario.match(/[^\d]+/g)){
            return res.status(400).json({
                mensagem: "Requisição inválida - O ID de um Usuario deve conter apenas dígitos."
            });
        }

        Usuario.findByPk(req.params.codUsuario, { raw: true })
        .then((result) => {

            if (result) {
                res.status(200).json({
                    conta: `${req.protocol}://${req.get('host')}/contas/?codUsuario=${result.cod_usuario}`,
                    usuario: result,
                    endereco: `${req.protocol}://${req.get('host')}/usuarios/enderecos/?codUsuario=${result.cod_usuario}`,
                    seguidos: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidos=${result.cod_usuario}`,
                    seguidores: `${req.protocol}://${req.get('host')}/usuarios/seguidas/?seguidores=${result.cod_usuario}`,
                    denunciados: `${req.protocol}://${req.get('host')}/usuarios/denuncias/?denunciados=${result.cod_usuario}`,
                    bloqueados: `${req.protocol}://${req.get('host')}/usuarios/bloqueios/?bloqueados=${result.cod_usuario}`,
                    animais: `${req.protocol}://${req.get('host')}/animais/?codDono=${result.cod_usuario}`,
                    momentos: `${req.protocol}://${req.get('host')}/momentos/?codUsuario=${result.cod_usuario}`,
                    postagens: `${req.protocol}://${req.get('host')}/postagens/?codUsuario=${result.cod_usuario}`,
                    postagens_avaliadas: `${req.protocol}://${req.get('host')}/postagens/avaliacoes/?codUsuario=${result.cod_usuario}`,
                    anuncios: `${req.protocol}://${req.get('host')}/anuncios/?codUsuario=${result.cod_usuario}`,
                    anuncios_favoritos: `${req.protocol}://${req.get('host')}/anuncios/favoritos/?codUsuario=${result.cod_usuario}`,
                    anuncios_avaliados: `${req.protocol}://${req.get('host')}/anuncios/avaliacoes/?codUsuario=${result.cod_usuario}`,
                    candidaturas: `${req.protocol}://${req.get('host')}/anuncios/candidaturas/?codUsuario=${result.cod_usuario}`,
                    conversas: `${req.protocol}://${req.get('host')}/conversas/?codUsuario=${result.cod_usuario}`
                });
            } else {
                res.status(404).json({
                    mensagem: 'Nenhum usuário com esse ID foi encontrado.'
                });
            }
        })
        .catch((error) => {
            console.log(`GET: '/usuarios/:codUsuario' - Algo deu errado... \n`, error);
            return next( new Error('Algo inesperado aconteceu ao buscar os dados do usuário. Entre em contato com o administrador.') );
        });

    });

    // router.post('/', (req, res, next) => {   // A criação dos dados de um novo usuário acontecerá na rota "contas.js".

    // });

    // router.patch('/:codUsuario'/*, controller.usuario_updateOne*/);

    // router.delete('/:codUsuario'/*, controller.usuario_deleteOne*/);

// Exportação.
    module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.
