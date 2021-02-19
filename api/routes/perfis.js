/* Observações: Como desenvolvedores, ao construir uma REST API, devemos documentar de forma clara e consistente
                quais campos são necessários às rotas de nossa API.
*/

// Importações.
    const express = require('express');
    const router = express.Router();

    // const controller = require('../controllers/usuarios');   // TODO...

    // Importação dos Models...

        const PerfilUsuario = require('../models/PerfilUsuario');
        const AcessoLocal = require('../models/AcessoLocal');
        const AcessoFacebook = require('../models/AcessoFacebook');
        const AcessoGoogle = require('../models/AcessoGoogle');
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

        PerfilUsuario.findAll({ raw: true })
        .then((listaPerfis) => {

            console.log(`GET: '/perfis' - ${listaPerfis.length} Perfis de usuários encontrados... \n`);

            if (listaPerfis.length === 0){

                res.status(200).json({
                    mensagem: 'Nenhum perfil de usuário está registrado.'
                });

            } else {

                res.status(200).json({
                    total_usuarios: listaPerfis.length,
                    mensagem: 'Lista de perfis de usuários registrados.',
                    perfis: listaPerfis
                });

            }

        })
        .catch((error) => {

            console.log(`GET: '/perfis' - Algo deu errado... \n`, error);

            res.status(500).json({
                error: error
            });

        });

    });

    router.get('/:idPerfil', async (req, res, next) => {

        if (req.params.idPerfil.match(/[^\d]+/g)){
            return res.status(400).json({
                mensagem: "Requisição inválida - O id de um Perfil deve ser um dígito."
            });
        }
        //----------------------------------------------------------------------------------------------------------------------------- Tentativa 05... Com Event Emitters - Ok!

        // let dadosPerfil = {};
        // let tarefaCompleta = 0;

        // let customListeners = new EventEmitter();   // Instância de EventEmitter.

        // customListeners.on('doneTask', () => {
        //     tarefaCompleta++;

        //     if (tarefaCompleta === 3){

        //         res.status(200).json({
        //             mensagem: 'Perfil encontrado.',
        //             usuario: dadosPerfil.usuario,
        //             perfil: dadosPerfil.perfil,
        //             endereco: dadosPerfil.endereco
        //         });

        //     }

        // })

        // customListeners.on('foundProfile', (perfil) => {    // Observador do evento "foundOwner" - Que será disparado quando o dono do perfil for encontrado.
        //     dadosPerfil.perfil = perfil;
        //     customListeners.emit('searchOwner');
        //     customListeners.emit('searchAddress');
        //     customListeners.emit('doneTask');
        // });

        // customListeners.on('foundOwner', (usuario) => {
        //     dadosPerfil.usuario = usuario;
        //     customListeners.emit('doneTask');
        // })

        // customListeners.on('foundAddress', (endereco) => {
        //     dadosPerfil.endereco = endereco;
        //     customListeners.emit('doneTask');
        // })

        // customListeners.on('searchOwner', () => {

        //     switch (dadosPerfil.perfil.tipo_cadastro){
        //         case 'local':
        //             AcessoLocal.findOne({ attributes: ['email'], where: { cod_perfil: req.params.idPerfil }, raw: true })
        //             .then((usuario) => {
        //                 customListeners.emit('foundOwner', usuario);
        //             })
        //             .catch((error) => {
        //                     console.log(error);
        //             })
        //             break;
        //         case 'facebook':
        //             AcessoFacebook.findOne({ attributes: ['cod_usuarioFacebook'], where: { cod_perfil: req.params.idPerfil }, raw: true })
        //             .then((usuario) => {
        //                 customListeners.emit('foundOwner', usuario);
        //             })
        //             .catch((error) => {
        //                 console.log(error);
        //             })
        //             break;
        //         case 'google':
        //             AcessoGoogle.findOne({ attributes: ['cod_usuarioGoogle'], where: { cod_perfil: req.params.idPerfil }, raw: true })
        //             .then((usuario) => {
        //                 customListeners.emit('foundOwner', usuario);
        //             })
        //             .catch((error) => {
        //                 console.log(error);
        //             })
        //             break;
        //         default:
        //             break;
        //     }

        // });

        // customListeners.on('searchAddress', () => {
        //     EnderecoUsuario.findOne({ where: { cod_perfil: req.params.idPerfil }, raw: true })
        //     .then((endereco) => {
        //         delete endereco.cod_perfil;
        //         customListeners.emit('foundAddress', endereco);
        //     })
        //     .catch((error) => {
        //         console.log(error);
        //     })
        // })

        // PerfilUsuario.findByPk(req.params.idPerfil, { raw: true })
        // .then((perfil) => {
        //     customListeners.emit('foundProfile', perfil);
        // })
        // .catch((error) => {
        //     console.error('[ORM/perfis/:idPerfil] Algo deu errado ao buscar os dados do perfil.\n', error);   // Esse log ficará no servidor.
        //     throw new Error('Algo deu errado ao buscar os dados do perfil.\n', error);    // Essa mensagem será enviada com o status 500 na resposta da requisição.
        // });


        //----------------------------------------------------------------------------------------------------------------------------- Tentativa 05... FIM.

        //----------------------------------------------------------------------------------------------------------------------------- Tentativa 04... Async/Await - Ok!
        // Incluído campo: "tipo_cadastro" na [ tbl_perfil_usuario ]. Assim podemos pesquisar pelo usuário dono do perfil em apenas uma tabela.

        let dadosPerfil = {};

        try {
            dadosPerfil.perfil = await PerfilUsuario.findByPk(req.params.idPerfil, { raw: true });

            switch (dadosPerfil.perfil.tipo_cadastro){
                case 'local':
                    dadosPerfil.usuario = await AcessoLocal.findOne({ attributes: ['email'], where: { cod_perfil: dadosPerfil.perfil.cod_perfil }, raw: true });
                    break;
                case 'facebook':
                    dadosPerfil.usuario = await AcessoFacebook.findOne({ attributes: ['cod_usuarioFacebook'], where: { cod_perfil: dadosPerfil.perfil.cod_perfil }, raw: true })
                    break;
                case 'google':
                    dadosPerfil.usuario = await AcessoGoogle.findOne({ attributes: ['cod_usuarioGoogle'], where: { cod_perfil: dadosPerfil.perfil.cod_perfil }, raw: true })
                    break;
                default:
                    break;
            }

            dadosPerfil.endereco = await EnderecoUsuario.findOne({ where: { cod_perfil: dadosPerfil.perfil.cod_perfil }, raw: true });
            delete dadosPerfil.endereco.cod_perfil;

            res.status(200).json({
                mensagem: 'Perfil encontrado.',
                usuario: dadosPerfil.usuario,
                perfil: dadosPerfil.perfil,
                endereco: dadosPerfil.endereco
            });

        } catch (error) {
            console.error('[ORM/perfis/:idPerfil] Algo deu errado ao buscar os dados do perfil.\n', error);   // Esse log ficará no servidor.
            throw new Error('Algo deu errado ao buscar os dados do perfil.\n', error);    // Essa mensagem será enviada com o status 500 na resposta da requisição.
        }

        //----------------------------------------------------------------------------------------------------------------------------- Tentativa 04... Fim

        //----------------------------------------------------------------------------------------------------------------------------- Tentativa 03... Callback Hell \o/ - Fail.
        // Incluído campo: "tipo_cadastro" na [ tbl_perfil_usuario ]. Assim podemos pesquisar pelo usuário dono do perfil em apenas uma tabela.

        // PerfilUsuario.findByPk(req.params.idPerfil, { raw: true })
        // .then((perfil) => {
        //     console.log(`GET: '/perfis/${req.params.idPerfil}' - Perfil Encontrado.`);
        //     dadosPerfil.perfil = perfil;
        // })
        // .then(() => {

        //     switch (dadosPerfil.perfil.tipo_cadastro){
        //         case 'local':
        //             AcessoLocal.findOne({ attributes: ['email'], where: { cod_perfil: dadosPerfil.perfil.cod_perfil }, raw: true })
        //             .then((usuario) => {
        //                     dadosPerfil.usuario = usuario;
        //             })
        //             .catch((error) => {
        //                     console.log(error);
        //             })
        //             break;
        //         case 'facebook':
        //             AcessoFacebook.findOne({ attributes: ['cod_usuarioFacebook'], where: { cod_perfil: dadosPerfil.perfil.cod_perfil }, raw: true })
        //             .then((usuario) => {
        //                     dadosPerfil.usuario = usuario;
        //             })
        //             .catch((error) => {
        //                     console.log(error);
        //             })
        //             break;
        //         case 'google':
        //             AcessoGoogle.findOne({ attributes: ['cod_usuarioGoogle'], where: { cod_perfil: dadosPerfil.perfil.cod_perfil }, raw: true })
        //             .then((usuario) => {
        //                 dadosPerfil.usuario = usuario;
        //             })
        //             .catch((error) => {
        //                 console.log(error);
        //             })
        //             break;
        //         default:
        //             break;
        //     }

        //     // console.log(dadosPerfil)

        // })
        // .then(() => {
        //     EnderecoUsuario.findOne({ where: { cod_perfil: dadosPerfil.perfil.cod_perfil }, raw: true })
        //     .then((endereco) => {
        //         delete endereco.cod_perfil;
        //         dadosPerfil.endereco = endereco;
        //     })
        //     .catch((error) => {
        //         console.log(error);
        //     })
        // })
        // .then(() => {

        //     res.status(200).json({
        //         mensagem: 'Perfil encontrado.',
        //         usuario: dadosPerfil.usuario,
        //         perfil: dadosPerfil.perfil,
        //         endereco: dadosPerfil.endereco
        //     });

        // })
        // .catch((error) => {
        //     console.log(error);
        // })


        //----------------------------------------------------------------------------------------------------------------------------- Tentativa 03... Fim

        //----------------------------------------------------------------------------------------------------------------------------- Tentativa 02... Mesmo problema da tentativa 01.

        // let dadosPerfil = {}

        // Promise.all([
        //     PerfilUsuario.findByPk(req.params.idPerfil, { raw: true }),
        //     AcessoLocal.findOne({ attributes: ['email'], where: { cod_perfil: req.params.idPerfil }, raw: true }),
        //     AcessoFacebook.findOne({ attributes: ['cod_usuarioFacebook'], where: { cod_perfil: req.params.idPerfil }, raw: true }),
        //     AcessoGoogle.findOne({ attributes: ['cod_usuarioGoogle'], where: { cod_perfil: req.params.idPerfil }, raw: true }),
        //     EnderecoUsuario.findOne({ where: { cod_perfil: req.params.idPerfil }, raw: true })
        // ])
        // .then((result) => {

        //     for(let i = 1 ; i < 4 ; i++){
        //         if (result[i]){ 
        //             dadosPerfil.dono_perfil = result[i];
        //         }
        //     }

        //     if (result[0]){ 
        //         dadosPerfil.perfil = result[0];
        //     }

        //     if (result[4]){ 
        //         dadosPerfil.endereco = result[4];
        //     }

        //     res.status(200).json({
        //         mensagem: 'Perfil encontrado.',
        //         usuario: dadosPerfil.dono_perfil,
        //         perfil: dadosPerfil.perfil,
        //         endereco: dadosPerfil.endereco
        //     });

        // })
        // .catch((error) => {
        //     console.error('[ORM/perfis/:idPerfil] Algo deu errado ao buscar os dados do perfil.\n', error);   // Esse log ficará no servidor.
        //     throw new Error('Algo deu errado ao buscar os dados do perfil.\n', error);    // Essa mensagem será enviada com o status 500 na resposta da requisição.

        //     // res.status(500).json({
        //     //     error: error
        //     // });
        // })

        //----------------------------------------------------------------------------------------------------------------------------- Tentativa 02... Fim.

        //----------------------------------------------------------------------------------------------------------------------------- Tentativa 01... Possíveis problemas graves de performance.

        // PerfilUsuario.findByPk(req.params.idPerfil, { raw: true })
        // .then((perfil) => {
        //     console.log(`GET: '/perfis/${req.params.idPerfil}' - Perfil Encontrado.`);

        //     let customListeners = new EventEmitter();   // Instância de EventEmitter.

        //     customListeners.on('foundOwner', (donoPerfil) => {    // Observador do evento "foundOwner" - Que será disparado quando o dono do perfil for encontrado.
        //         res.status(200).json({
        //             mensagem: 'Perfil encontrado.',
        //             dono_perfil: donoPerfil,
        //             perfil: perfil
        //         });
        //     });

        //     // -------------------------------------------- O problema é que a primeira Async sempre entrega um resolve com o Objeto ou Null.
        //     // Promise.race([
        //     //     AcessoLocal.findOne({ attributes: ['email'], where: { cod_perfil: perfil.cod_perfil }, raw: true }),
        //     //     AcessoFacebook.findOne({ attributes: ['cod_usuarioFacebook'], where: { cod_perfil: perfil.cod_perfil }, raw: true }),
        //     //     AcessoGoogle.findOne({ attributes: ['cod_usuarioGoogle'], where: { cod_perfil: perfil.cod_perfil }, raw: true })
        //     // ])
        //     // .then((donoPerfil) => {

        //     //     if (donoPerfil){
        //     //         if (donoPerfil.email) { donoPerfil.tipo_cadastro = 'Local'; }
        //     //         if (donoPerfil.cod_usuarioFacebook) { donoPerfil.tipo_cadastro = 'Social Facebook'; }
        //     //         if (donoPerfil.cod_usuarioGoogle) { donoPerfil.tipo_cadastro = 'Social Google'; }
        //     //     }

        //     //     customListeners.emit('foundOwner', donoPerfil);
        //     // })
        //     // .catch((error) => {
        //     //     console.error('[ORM/perfis/:idPerfil Owner] Algo deu errado ao buscar o dono do perfil.\n', error);
        //     //     throw new Error('Algo deu errado ao buscar o dono do perfil.\n', error);
        //     // })
        //     // --------------------------------------------


        //     AcessoLocal.findOne({ attributes: ['email'], where: { cod_perfil: perfil.cod_perfil }, raw: true })
        //     .then((donoPerfil) => {
        //         if (donoPerfil){

        //             donoPerfil.tipoCadastro = 'Local';  // Adiciona o tipo de cadastro ao objeto, para enviá-lo como resposta da requisição.
        //             // console.log('[ORM/perfis/:idPerfil Owner Local] Dono do perfil encontrado ', donoPerfil);

        //             customListeners.emit('foundOwner', donoPerfil); // Com o dono do perfil encontrado e atribuído ao objeto donoPerfil -> Dispara o evento 'foundOwner'.
        //         }
        //     })
        //     .catch((error) => {
        //         console.error('[ORM/perfis/:idPerfil Owner Local] Algo deu errado ao buscar o dono do perfil.\n', error);   // Esse log ficará no servidor.
        //         throw new Error('Algo deu errado ao buscar o dono do perfil.\n', error);    // Essa mensagem será enviada com o status 500 na resposta da requisição.
        //     });

        //     AcessoFacebook.findOne({ attributes: ['cod_usuarioFacebook'], where: { cod_perfil: perfil.cod_perfil }, raw: true })
        //     .then((donoPerfil) => {
        //         if (donoPerfil){

        //             donoPerfil.tipoCadastro = 'Social Facebook';
        //             // console.log('[ORM/perfis/:idPerfil Owner Facebook] Dono do perfil encontrado ', donoPerfil);

        //             customListeners.emit('foundOwner', donoPerfil);
        //         }
        //     })
        //     .catch((error) => {
        //         console.error('[ORM/perfis/:idPerfil Owner Facebook] Algo deu errado ao buscar o dono do perfil.\n', error);
        //         throw new Error('Algo deu errado ao buscar o dono do perfil.\n', error);
        //     });

        //     AcessoGoogle.findOne({ attributes: ['cod_usuarioGoogle'], where: { cod_perfil: perfil.cod_perfil }, raw: true })
        //     .then((donoPerfil) => {
        //         if (donoPerfil){

        //             donoPerfil.tipoCadastro = 'Social Google';
        //             // console.log('[ORM/perfis/:idPerfil Owner Google] Dono do perfil encontrado ', donoPerfil);

        //             customListeners.emit('foundOwner', donoPerfil);
        //         }
        //     })
        //     .catch((error) => {
        //         console.error('[ORM/perfis/:idPerfil Owner Google] Algo deu errado ao buscar o dono do perfil.\n', error);
        //         throw new Error('Algo deu errado ao buscar o dono do perfil.\n', error);
        //     });

            
        //     // TODO: Descobrir como parar uma lista de funções assíncronas se alguma delas disparar determinado evento.

        // })
        // .catch((error) => {

        //     console.log(`GET: '/perfis/${req.params.idPerfil}' - Algo deu errado... \n`, error);

        //     res.status(500).json({
        //         error: error
        //     });

        // });

        //----------------------------------------------------------------------------------------------------------------------------- Tentativa 01... Fim.

    });

    router.post('/', (req, res, next) => {
        
        // Todo... Cadastro do Usuário, perfil e endereço. (O usuário só será criado se o perfil e o endereço forem criados juntos)
        // Talvez mover isso para uma rota específica "/usuário" para que faça mais sentido aos Clientes...

    });

    // router.patch('/:idPerfil'/*, controller.perfil_updateOne*/);

    // router.delete('/:idPerfil'/*, controller.perfil_deleteOne*/);

// Exportação.
    module.exports = router;    // É necessário exportar os Routers (rotas) para utilizá-los em 'app.js', nosso requestListener.
