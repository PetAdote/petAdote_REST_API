// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    // Model das associações (FKs).
        const Candidatura = require('./Candidatura');
        const Usuario = require('./Usuario');

// Definição do Model 'DocResponsabilidade' para 'tbl_doc_resp'.
    const DocResponsabilidade = connection.define('DocResponsabilidade', {

        cod_doc: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        uid_doc: { type: DataTypes.STRING(255), allowNull: false, unique: true },
        tipo_doc: { type: DataTypes.ENUM('anunciante', 'candidato'), allowNull: false },
        segredo_qrcode: { type: DataTypes.STRING(255), allowNull: false },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_doc_resp',
    });

    // Associações (FKs).
        DocResponsabilidade.belongsTo(Usuario, {
            foreignKey: {
                name: 'cod_usuario',
                allowNull: false
            }
        });

        Usuario.hasMany(DocResponsabilidade, {
            foreignKey: {
                name: 'cod_usuario',
                allowNull: false
            }
        });

// Exportação.
module.exports = DocResponsabilidade;