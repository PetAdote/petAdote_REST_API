// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    // Models das Associações (Chaves Estrangeiras).
    const Usuario = require('./Usuario');

// Definição do Model 'ContaLocal' para 'tbl_conta_local'.
    const ContaLocal = connection.define('ContaLocal', {

        email: { type: DataTypes.STRING(255), allowNull: false, unique: true,
            primaryKey: true
        },
        cod_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        senha:  { type: DataTypes.STRING(100), allowNull: false },
        // email_recuperacao: { type: DataTypes.STRING(255), allowNull: false }

    }, {
        tableName: 'tbl_conta_local',
    });

    // Associações
    ContaLocal.belongsTo(Usuario, {
        foreignKey: {
            name: 'cod_usuario',
            allowNull: false
        }
    });

// Exportação.
module.exports = ContaLocal