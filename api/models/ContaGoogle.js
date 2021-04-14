// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    // Models das Associações (Chaves Estrangeiras).
    const Usuario = require('./Usuario');

// Definição do Model 'ContaGoogle' para 'tbl_conta_google'.
    const ContaGoogle = connection.define('ContaGoogle', {

        cod_google: { type: DataTypes.STRING(255), allowNull: false, unique: true,
            primaryKey: true
        },
        cod_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        }

    }, {
        tableName: 'tbl_conta_google',
    });

    // Associações
    ContaGoogle.belongsTo(Usuario, {
        foreignKey: {
            name: 'cod_usuario',
            allowNull: false
        }
    });

    Usuario.hasOne(ContaGoogle, {
        foreignKey: {
            name: 'cod_usuario',
            allowNull: false
        }
    });

// Exportação.
module.exports = ContaGoogle;