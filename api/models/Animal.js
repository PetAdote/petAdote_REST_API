// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

const moment = require('moment-timezone');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'Animal' para 'tbl_animal'.
    const Animal = connection.define('Animal', {

        cod_animal: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_dono: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        cod_dono_antigo: { type: DataTypes.INTEGER.UNSIGNED, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        estado_adocao: { type: DataTypes.ENUM('Sob proteção', 'Em anúncio', 'Em processo adotivo', 'Adotado'), allowNull: false, defaultValue: 'Sob proteção'},
        nome: { type: DataTypes.STRING(100), allowNull: false },
        idade: { type: DataTypes.STRING(8), allowNull: false },
        especie: { type: DataTypes.ENUM('Cão', 'Gato', 'Outros'), allowNull: false },
        raca: { type: DataTypes.STRING(20), allowNull: false },
        genero: { type: DataTypes.ENUM('M', "F"), allowNull: false },
        porte: { type: DataTypes.ENUM('P', 'M', 'G'), allowNull: false },
        esta_castrado: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
        esta_vacinado: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false },
        detalhes_comportamento: { type: DataTypes.STRING(255), allowNull: false },
        detalhes_saude: { type: DataTypes.STRING(255), allowNull: false },
        historia: { type: DataTypes.TEXT },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: moment().utc(true) },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: moment().utc(true) }

    }, {
        tableName: 'tbl_animal',
    });

// Exportação.
module.exports = Animal;