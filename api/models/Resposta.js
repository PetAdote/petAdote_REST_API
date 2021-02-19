// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'Resposta' para 'tbl_resposta'.
    const Resposta = connection.define('Resposta', {

        cod_resposta: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_conversa: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Conversa, key: 'cod_conversa' }
        },
        cod_perfil: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.PerfilUsuario, key: 'cod_perfil' }
        },
        resposta: { type: DataTypes.TEXT, allowNull: false },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_visualizacao: { type: DataTypes.DATE }

    }, {
        tableName: 'tbl_resposta',
    });

// Exportação.
module.exports = Resposta;