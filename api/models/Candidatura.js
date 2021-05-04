// Importações.
const {DataTypes, Model, Sequelize} = require('sequelize');

// Instância da conexão com a Database.
    const {connection} = require('../../configs/database');

    // Models das Associações (Chaves Estrangeiras).
        const Anuncio = require('./Anuncio');
        const Usuario = require('./Usuario');
        const DocResponsabilidade = require('./DocResponsabilidade');

// Definição do Model 'Candidatura' para 'tbl_candidatura'.
    const Candidatura = connection.define('Candidatura', {

        cod_candidatura: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, unique: true, autoIncrement: true,
            primaryKey: true
        },
        cod_anuncio: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Anuncio, key: 'cod_anuncio' }
        },
        cod_candidato: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, 
            references: { model: Model.Usuario, key: 'cod_usuario' }
        },
        cod_doc_anunciante: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true,
            references: { model: Model.DocResponsabilidade, key: 'cod_doc'}
        },
        cod_doc_candidato: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true,
            references: { model: Model.DocResponsabilidade, key: 'cod_doc'}
        },
        estado_candidatura: { type: DataTypes.ENUM('Em avaliacao', 'Aprovada', 'Rejeitada', 'Concluida'), allowNull: false, defaultValue: 'Em avaliacao' },
        ativo: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
        anunciante_entregou: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        candidato_recebeu:{ type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 0 },
        data_criacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW },
        data_modificacao: { type: DataTypes.DATE, allowNull: false, defaultValue: Sequelize.NOW }

    }, {
        tableName: 'tbl_candidatura',
    });

    // Associações (FKs).
        Candidatura.belongsTo(Anuncio, {
            foreignKey: {
                name: 'cod_anuncio',
                allowNull: false
            }
        });

            Anuncio.hasMany(Candidatura, {
                foreignKey: {
                    name: 'cod_anuncio',
                    allowNull: false
                }
            });

        Candidatura.belongsTo(Usuario, {
            foreignKey: {
                name: 'cod_candidato',
                allowNull: false
            }
        });

            Usuario.hasMany(Candidatura, {
                foreignKey: {
                    name: 'cod_candidato',
                    allowNull: false
                }
            });

        Candidatura.belongsTo(DocResponsabilidade, {
            as: 'DocAnunciante',
            foreignKey: {
                name: 'cod_doc_anunciante',
                allowNull: true
            }
        });

            DocResponsabilidade.hasOne(Candidatura, {
                as: 'DocAnunciante',
                foreignKey: {
                    name: 'cod_doc_anunciante',
                    allowNull: true
                }
            });

        Candidatura.belongsTo(DocResponsabilidade, {
            as: 'DocCandidato',
            foreignKey: {
                name: 'cod_doc_candidato',
                allowNull: true
            }
        });

            DocResponsabilidade.hasOne(Candidatura, {
                as: 'DocCandidato',
                foreignKey: {
                    name: 'cod_doc_candidato',
                    allowNull: true
                }
            });

// Exportação.
module.exports = Candidatura;