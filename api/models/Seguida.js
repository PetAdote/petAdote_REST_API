// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'Seguida' para 'tbl_seguida'.
    const Seguida = connection.define('Seguida', {

        cod_seguida: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        perfil_seguidor: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.PerfilUsuario, key: 'cod_perfil' }
        },
        perfil_seguido: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.PerfilUsuario, key: 'cod_perfil' }
        },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_seguida',
    });

// Exportação.
module.exports = Seguida;