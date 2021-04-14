// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    // Model das associações (FKs).
        const Usuario = require('./Usuario');

// Definição do Model 'Bloqueio' para 'tbl_bloqueio'.
    const Bloqueio = connection.define('Bloqueio', {

        cod_bloqueio: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        bloqueante: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        bloqueado: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        }

    }, {
        tableName: 'tbl_bloqueio',
    });

    // Associações (FKs).
        Bloqueio.belongsTo(Usuario, {
            as: 'usuario_bloqueante',
            foreignKey: 'bloqueante',
            allowNull: false
        });

        Bloqueio.belongsTo(Usuario, {
            as: 'usuario_bloqueado',
            foreignKey: 'bloqueado',
            allowNull: false
        });

// Exportação.
module.exports = Bloqueio;