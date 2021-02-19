// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'AcessoLocal' para 'tbl_acesso_local'.
    const AcessoLocal = connection.define('AcessoLocal', {

        email: { type: DataTypes.STRING(255), allowNull: false, unique: true,
            primaryKey: true
        },
        cod_perfil: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, 
            references: { model: Model.PerfilUsuario, key: 'cod_perfil' }
        },
        senha:  { type: DataTypes.STRING(100), allowNull: false },
        email_recuperacao: { type: DataTypes.STRING(255), allowNull: false }

    }, {
        tableName: 'tbl_acesso_local',
    });

// Exportação.
module.exports = AcessoLocal;