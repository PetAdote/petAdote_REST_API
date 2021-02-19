// Importações.
const {DataTypes, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'EnderecoUsuario' para 'tbl_end_usuario'.
    const EnderecoUsuario = connection.define('EnderecoUsuario', {

        cod_end_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_perfil: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, 
            references: { model: Model.PerfilUsuario, key: 'cod_perfil' }
        },
        cep: { type: DataTypes.STRING(9), allowNull: false },
        logradouro: { type: DataTypes.STRING(100), allowNull: false },
        bairro: { type: DataTypes.STRING(100), allowNull: false },
        cidade: { type: DataTypes.STRING(100), allowNull: false },
        estado: { type: DataTypes.STRING(100), allowNull: false },
        latitude: { type: DataTypes.STRING(100) },
        longitude: { type: DataTypes.STRING(100) }

    }, {
        tableName: 'tbl_end_usuario',
    });

// Exportação.
module.exports = EnderecoUsuario;