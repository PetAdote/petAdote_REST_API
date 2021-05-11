// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    // Model das associações (FKs).
        const Candidatura = require('./Candidatura');
        const Usuario = require('./Usuario');

// Definição do Model 'PontoEncontro' para 'tbl_ponto_encontro'.
    const PontoEncontro = connection.define('PontoEncontro', {

        cod_ponto_encontro: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_candidatura: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
            references: { model: Model.Candidatura, key: 'cod_candidatura' }
        },
        cod_anunciante: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false,
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        cod_candidato: { type: DataTypes.INTEGER.UNSIGNED, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        ativo: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
        cep: { type: DataTypes.STRING(9), allowNull: false },
        logradouro: { type: DataTypes.STRING(100), allowNull: false },
        bairro: { type: DataTypes.STRING(100), allowNull: false },
        cidade: { type: DataTypes.STRING(100), allowNull: false },
        uf: { type: DataTypes.STRING(100), allowNull: false },
        numero: { type: DataTypes.STRING(100), allowNull: false },
        complemento: { type: DataTypes.STRING(255) },
        latitude: { type: DataTypes.STRING(100) },
        longitude: { type: DataTypes.STRING(100) },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_ponto_encontro',
    });

    // Associações (FKs).
        PontoEncontro.belongsTo(Candidatura, {
            foreignKey: {
                name: 'cod_candidatura',
                allowNull: false
            }
        });

            Candidatura.hasMany(PontoEncontro, {
                foreignKey: {
                    name: 'cod_candidatura',
                    allowNull: false
                }
            })

        PontoEncontro.belongsTo(Usuario, {
            as: 'Anunciante',
            foreignKey: {
                name: 'cod_anunciante',
                allowNull: false
            }
        });

            Usuario.hasMany(PontoEncontro, {
                as: 'Anunciante',
                foreignKey: {
                    name: 'cod_anunciante',
                    allowNull: false
                }
            });

        PontoEncontro.belongsTo(Usuario, {
            as: 'Candidato',
            foreignKey: { 
                name: 'cod_candidato',
                allowNull: false
            }
        });

            Usuario.hasMany(PontoEncontro, {
                as: 'Candidato',
                foreignKey: { 
                    name: 'cod_candidato',
                    allowNull: false
                }
            });

// Exportação.
module.exports = PontoEncontro;