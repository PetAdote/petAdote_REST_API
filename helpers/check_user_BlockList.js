// Importações.

    // Models.
        let Bloqueio = require('../api/models/Bloqueio');

    // Utilidades.
        let { Op } = require('sequelize');

// Exportação.

    /**
     * 
     * @param {*} cod_usuario 
     * @description Verifica os usuários que bloquearam ou foram bloqueados pelo usuário dono do ID enviado no parâmetro.
     * @returns Array dos usuários bloqueados ou bloqueantes. Se nenhum bloqueio ocorreu, o array será enviado vazio.
     */
    module.exports = (cod_usuario) => {

        return new Promise((resolve, reject) => {
            // Verificando o parâmetro.

                if (!String(cod_usuario).match(/^\d+$/g)){
                    let customErr = new Error('O valor passado para algum dos parâmetros é inválido.');
                    customErr.status = 400;
                    customErr.code = 'INVALID_PARAM';

                    return reject(customErr);
                }

            // ------------------------
            
            Bloqueio.findAll({
                where: {
                    [Op.or]: [{
                        bloqueado: cod_usuario
                    }, {
                        bloqueante: cod_usuario
                    }]
                },
                raw: true
            })
            .then((bloqueiosArr) => {
    
                let listaBloqueios = [];
    
                bloqueiosArr?.forEach((bloqueio) => {
                    // Se o usuário requisitante bloqueou alguém, verifique se esse alguém está na lista de bloqueios... Se não tiver? Adicione.
                    if (bloqueio.bloqueante == cod_usuario){
                        if(!listaBloqueios.includes(bloqueio.bloqueado)){
                            listaBloqueios.push(bloqueio.bloqueado);
                        }
                    }
    
                    // Se o usuário requisitante foi bloqueado por alguém, verifique se esse alguém está na lista de bloqueios... Se não tiver? Adicione.
                    if (bloqueio.bloqueado == cod_usuario){
                        if(!listaBloqueios.includes(bloqueio.bloqueante)){
                            listaBloqueios.push(bloqueio.bloqueante)
                        };
                    };
                });
    
                return resolve(listaBloqueios);
    
            })
            .catch((error) => {
                let customErr = new Error('Algo inesperado ocorreu ao verificar a lista de bloqueios do usuário.\n' + error);
                customErr.status = 500;
                customErr.code = 'INTERNAL_SERVER_MODULE_ERROR';
    
                return reject(customErr);
            })

        });
        

    }