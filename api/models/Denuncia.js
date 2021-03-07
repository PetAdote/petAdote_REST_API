// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    const moment = require('moment-timezone');

// Definição do Model 'Denuncia' para 'tbl_denuncia'.
    const Denuncia = connection.define('Denuncia', {

        cod_denuncia: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        denunciante: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        denunciado: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        descricao: { type: DataTypes.STRING(255), allowNull: false },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: moment().utc(true) },
        esta_fechada: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 }

    }, {
        tableName: 'tbl_denuncia',
    });

// Exportação.
module.exports = Denuncia;