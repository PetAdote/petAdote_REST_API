// Importações.
    const {DataTypes, Sequelize, Model} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    // Models das Associações (Chaves Estrangeiras).
    // ...

// Definição do Model 'Usuario' para 'tbl_usuario'.
    const Usuario = connection.define('Usuario', {

        cod_usuario: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        primeiro_nome: { type: DataTypes.STRING(50), allowNull: false },
        sobrenome: { type: DataTypes.STRING(50), allowNull: false },
        cpf: { type: DataTypes.STRING(14), allowNull: false, unique: true },
        telefone: { type: DataTypes.STRING(17), allowNull: false },
        data_nascimento: { type: DataTypes.DATEONLY, allowNull: false },
        descricao: { type: DataTypes.STRING(255) },
        foto_usuario: { type: DataTypes.STRING(200), allowNull: false, defaultValue: 'default_avatar_01.jpeg' },
        banner_usuario: { type: DataTypes.STRING(200), allowNull: false, defaultValue: 'default_banner.jpeg' },
        esta_ativo: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        ong_ativo: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        e_admin: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        qtd_seguidores: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        qtd_seguidos: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        qtd_denuncias: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_usuario',
    });

    // Associações.
    // ...

// Exportação.
module.exports = Usuario;