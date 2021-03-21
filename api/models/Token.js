// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'Token' para 'tbl_token'.
    const Token = connection.define('Token', {

        cod_token: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        token: { type: DataTypes.STRING(255), allowNull: false },
        tipo_token: { type: DataTypes.ENUM(['ativacao', 'recuperacao']), allowNull: false },
        data_limite: { type: DataTypes.DATE, allowNull: false }

    }, {
        tableName: 'tbl_token',
    });

// Exportação.
module.exports = Token;