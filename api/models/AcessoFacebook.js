// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'AcessoFacebook' para 'tbl_acesso_facebook'.
    const AcessoFacebook = connection.define('AcessoFacebook', {

        cod_usuarioFacebook: { type: DataTypes.STRING(255), allowNull: false, unique: true,
            primaryKey: true
        },
        cod_perfil: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, 
            references: { model: Model.PerfilUsuario, key: 'cod_perfil' }
        }

    }, {
        tableName: 'tbl_acesso_facebook',
    });

// Exportação.
module.exports = AcessoFacebook;