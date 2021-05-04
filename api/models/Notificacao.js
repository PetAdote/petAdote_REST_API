// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    // Models das Associações (Chaves Estrangeiras).
        const Usuario = require('./Usuario');

// Definição do Model 'Notificacao' para 'tbl_notificacao'.
    const Notificacao = connection.define('Notificacao', {

        cod_notificacao: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        mensagem: { type: DataTypes.STRING(255), allowNull: false },
        foi_lida: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_notificacao',
    });

    // Associações (FKs).
        Notificacao.belongsTo(Usuario, {
            foreignKey: {
                name: 'cod_usuario',
                allowNull: false
            }
        });

        Usuario.hasMany(Notificacao, {
            foreignKey: {
                name: 'cod_usuario',
                allowNull: false
            }
        });

// Exportação.
module.exports = Notificacao;