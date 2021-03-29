// Importações.
const {DataTypes, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'Cliente' para 'tbl_cliente'.
    const Cliente = connection.define('Cliente', {

        cod_cliente: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        senha:  { type: DataTypes.STRING(100), allowNull: false },
        tipo_cliente: { type: DataTypes.ENUM('Comum', 'Pet Adote'), allowNull: false, defaultValue: 'Comum'},
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }
    }, {
        tableName: 'tbl_cliente',
    });

// Exportação.
module.exports = Cliente