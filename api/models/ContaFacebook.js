// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    // Models das Associações (Chaves Estrangeiras).
    const Usuario = require('./Usuario');

// Definição do Model 'ContaFacebook' para 'tbl_conta_facebook'.
    const ContaFacebook = connection.define('ContaFacebook', {

        cod_facebook: { type: DataTypes.STRING(255), allowNull: false, unique: true,
            primaryKey: true
        },
        cod_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        }

    }, {
        tableName: 'tbl_conta_facebook',
    });

    // Associações
    ContaFacebook.belongsTo(Usuario, {
        foreignKey: {
            name: 'cod_usuario',
            allowNull: false
        }
    });

    Usuario.hasOne(ContaFacebook, {
        foreignKey: {
            name: 'cod_usuario',
            allowNull: false
        }
    });

// Exportação.
module.exports = ContaFacebook;