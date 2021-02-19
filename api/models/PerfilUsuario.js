// Importações.
    const {DataTypes, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

// Definição do Model 'PerfilUsuario' para 'tbl_perfil_usuario'.
    const PerfilUsuario = connection.define('PerfilUsuario', {

        cod_perfil: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        tipo_cadastro: { type: DataTypes.ENUM(['local', 'facebook', 'google']), allowNull: false },
        primeiro_nome: { type: DataTypes.STRING(100), allowNull: false },
        sobrenome: { type: DataTypes.STRING(100), allowNull: false },
        cpf: { type: DataTypes.STRING(14), allowNull: false, unique: true },
        telefone: { type: DataTypes.STRING(17), allowNull: false },
        data_nascimento: { type: DataTypes.DATEONLY, allowNull: false },
        descricao: { type: DataTypes.STRING(255) },
        foto_usuario: { type: DataTypes.STRING(200), allowNull: false, defaultValue: 'avatar_default.jpg' },
        background_perfil: { type: DataTypes.STRING(200), allowNull: false, defaultValue: 'bg_perfil_default.jpg' },
        esta_ativo: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        ong_ativo: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        qtd_seguidores: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        qtd_seguidos: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        qtd_denuncias: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_perfil_usuario',
    });

// Exportação.
module.exports = PerfilUsuario;