// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

const moment = require('moment-timezone');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'Postagem' para 'tbl_postagem'.
    const Postagem = connection.define('Postagem', {

        cod_postagem: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        conteudo_texto: { type: DataTypes.TEXT, allowNull: false },
        qtd_visualizacao: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        qtd_avaliacoes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: moment().utc(true).format() },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: moment().utc(true).format() }

    }, {
        tableName: 'tbl_postagem',
    });

// Exportação.
module.exports = Postagem;