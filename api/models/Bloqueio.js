// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'Bloqueio' para 'tbl_bloqueio'.
    const Bloqueio = connection.define('Bloqueio', {

        cod_bloqueio: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        perfil_bloqueante: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.PerfilUsuario, key: 'cod_perfil' }
        },
        perfil_bloqueado: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.PerfilUsuario, key: 'cod_perfil' }
        }

    }, {
        tableName: 'tbl_bloqueio',
    });

// Exportação.
module.exports = Bloqueio;