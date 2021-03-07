// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

const moment = require('moment-timezone');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'Seguida' para 'tbl_seguida'.
    const Seguida = connection.define('Seguida', {

        cod_seguida: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        seguidor: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        seguido: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: moment().utc(true) }

    }, {
        tableName: 'tbl_seguida',
    });

// Exportação.
module.exports = Seguida;