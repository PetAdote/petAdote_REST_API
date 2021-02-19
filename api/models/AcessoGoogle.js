// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'AcessoGoogle' para 'tbl_acesso_google'.
    const AcessoGoogle = connection.define('AcessoGoogle', {

        cod_usuarioGoogle: { type: DataTypes.STRING(255), allowNull: false, unique: true,
            primaryKey: true
        },
        cod_perfil: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, 
            references: { model: Model.PerfilUsuario, key: 'cod_perfil' }
        }

    }, {
        tableName: 'tbl_acesso_google',
    });

// Exportação.
module.exports = AcessoGoogle;