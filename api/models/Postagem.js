// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'Postagem' para 'tbl_postagem'.
    const Postagem = connection.define('Postagem', {

        cod_postagem: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_perfil: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.PerfilUsuario, key: 'cod_perfil' }
        },
        conteudo_texto: { type: DataTypes.TEXT, allowNull: false },
        qtd_visualizacao: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        qtd_avaliacoes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_postagem',
    });

// Exportação.
module.exports = Postagem;