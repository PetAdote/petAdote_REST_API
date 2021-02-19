// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'AnexoResposta' para 'tbl_anexo_resposta'.
    const AnexoResposta = connection.define('AnexoResposta', {

        cod_anexo_resposta: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_resposta: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Resposta, key: 'cod_resposta' }
        },
        nome_unico_anexo: { type: DataTypes.STRING(200), allowNull: false, unique: true }

    }, {
        tableName: 'tbl_anexo_resposta',
    });

// Exportação.
module.exports = AnexoResposta;