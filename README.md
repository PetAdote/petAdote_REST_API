# REST API - Sistemas Pet Adote 🐶🐱

### Introdução

A nossa REST API vai realizar o gerenciamento dos dados para os clientes do sistema Pet Adote, permitindo que as aplicações funcionem em conjunto e de forma unificada, garantindo a integridade dos dados que as aplicações utilizarão e maior segurança aos usuários das aplicações.

Vários end-points estarão disponíveis para que as aplicações autorizadas (Clientes Pet Adote) realizem cadastros, autenticações, alterações nos dados, coleta e exibição dos dados e várias outras tarefas.

### Grupos de rotas disponíveis
- **Rotas relacionadas aos usuários**
  - Permitem a criação, autenticação, modificação, remoção e busca dos principais dados de usuários (conta, perfil, endereço).
 
 
- **Rotas relacionadas aos pets dos usuários**
  - Permitirão a criação, modificação, remoção e busca dos dados dos animais cadastrados pelos usuários.
 
 
- **Rotas relacionadas as publicações dos usuários**
  - Permitirão a criação, modificação, remoção e busca dos dados dos animais cadastrados pelos usuários.
 
 
- **Rotas relacionadas à interatividade entre usuários**
  - Serão caracterizadas pelos end-points que vão intermediar a interação entre usuários. Por exemplo, o início e conclusão de candidaturas de adoção, adição ou remoção de seguidores, criação de denúncias, adição de anúncio á lista de favoritos, etc.

<span id='comoUsar'></span>
## Como realizar requisições à REST API Pet Adote?
<p>Clique nos tópicos abaixo para ler mais detalhes sobre a nossa REST API e como realizar requisições aos end-points.</p>

<details id='detailsAuth'>
<summary><b>1. Autenticações - Clientes e Usuários.</b></summary>

#### 

Todos os end-points da REST API possuem restrições de acesso, portanto ao realizar uma requisição, o cliente (aplicação) deverá apresentar seu **_Access Token_** (um JWT - _JSON WEB TOKEN_ assinado pela REST API) nos cabeçalhos da requisição. O Access Token é atribuído à aplicação pela REST API acompanhando de um Refresh Token durante o processo de autenticação do requisitante no seu respectivo end-point de autenticação.

- **Access Tokens** - São JWTs de curta duração que devem ser apresentados pela aplicação ao realizar requisições aos end-points da REST API.
- **Refresh Tokens** - São JWTs de longa duração que devem ser armazenados em segurança pela aplicação e serão utilizados para renovar Access Tokens expirados.

Com esses Tokens a REST API poderá identificar vários detalhes sobre o requisitante para permitir ou negar acesso aos end-points.

Vejamos abaixo como uma aplicação deverá se autenticar para receber o **Access Token** e o **Refresh Token** e finalmente poder utilizar os end-points da REST API dos sistemas Pet Adote.

<span id='authClientes'></span>
## 1.1 - Autenticando clientes na REST API
 
> **GET:** http://rest-petadote.ddns.net/autenticacoes/apis/login/?cliente=SeuCódigoCliente&senha=SuaSenhaComoCliente

- Observe que o parâmetro **"cliente"** e **"senha"** recebem, respectivamente, o código e senha da aplicação registrada. Se as credenciais apresentadas forem válidas, a resposta será um JSON contendo { mensagem, client_accessToken, client_refreshToken }

- Nesse ponto a aplicação se autenticou e poderá adicionar o Access Token recebido ao cabeçalho das requisições.

> **Request Headers** = { Authorization: Bearer SeuAccessTokenVaiAqui }

<small><b>Observação:</b> No momento, apenas aplicações Pet Adote cadastradas por nós podem se autenticar, para isso é necessário que a aplicação utilize os end-points dos tópicos explorados a seguir.</small>

**Porém o que acontece quando o Access Token expira?**

> A aplicação deverá renovar o Access Token utilizando o Refresh Token recebido.

#### 1.1.1 - Utilizando o Refresh Token para renovar o Access Token

> **POST:** http://rest-petadote.ddns.net/autenticacoes/apis/refresh

```javascript
request.body = { 
    refreshToken: 'refreshTokenDaSuaAplicacao'
};
```

- Por questões de segurança o Access Token possui um curto tempo de vida, portanto sua renovação é necessária.

- A resposta será um par de Access e Refresh Tokens renovados, a aplicação novamente poderá utilizar o Access Token para continuar a fazer requisições.

- Note que o Refresh Token antigo da aplicação será invalidado pela REST API, uma vez que a REST API substitui o Refresh Token vínculado à antiga autenticação do cliente pelo Refresh Token mais atual.

#### 1.1.2 - Encerrando o Refresh Token da aplicação de forma segura

> **DELETE:** http://rest-petadote.ddns.net/autenticacoes/apis/logout

```javascript
request.body = { 
    refreshToken: 'refreshTokenDaSuaAplicacao'
};
```

- Em algum momento, um cliente pode desejar expirar seu Refresh Token mais cedo do que o tempo de expiração estabelecido para ele, uma vez que se trata de um Token com longo tempo de vida. Ao utilizar esse end-point e entregar o refreshToken no corpo da requisição, a aplicação poderá encerrar o Refresh Token até a próxima autenticação da aplicação na REST API.


<span id='authUsuarios'></span>
## 1.2 - Autenticando usuários das aplicações na REST API

> **POST:** http://rest-petadote.ddns.net/autenticacoes/usuarios/login

```javascript
request.body = { 
    email: 'emailDoUsuario',
    senha: 'senhaDoUsuario'
};
```

- Para autenticar usuários cadastrados, a aplicação deverá apresentar o Token de Acesso da aplicação para requisitar a autenticação do usuário no end-point da REST API. Assim, saberemos por meio de qual aplicação o usuário está se autenticando.

- Ao autenticar o usuário, a aplicação receberá um novo par de Access e Refresh Tokens, que deverão ser utilizados para realizar requisições em nome do usuário. A resposta será um JSON contendo { mensagem, cod_usuario, user_accessToken, user_refreshToken }

- Nesse ponto o usuário da aplicação se autenticou e a aplicação poderá adicionar o Access Token do usuário recebido ao cabeçalho das requisições.

> **Request Headers** = { Authorization: Bearer AccessTokenDoUsuarioVaiAqui }

- Se a aplicação apresentar os Tokens de Acesso do usuário ao realizar uma requisição, a REST API apresentará dados relativos ao nível de acesso daquele usuário. Por exemplo, se o usuário for um administrador, poderá utilizar interfaces mais avançadas, se for um usuário comum, poderá acessar dados relativos à usuários comuns.

#### 1.2.1 - Utilizando o Refresh Token para renovar o Access Token do usuário

> **POST:** http://rest-petadote.ddns.net/autenticacoes/usuarios/refresh

```javascript
request.body = { 
    refreshToken: 'refreshTokenDoSeuUsuario'
};
```

- O motivo para renovar o Access Token do usuário é o mesmo da aplicação, será necessário apresentar um Token válido para realizar novas requisições e o Access Token possui um tempo de vida curto.

#### 1.2.2 - Desconectando o usuário da sua aplicação de forma segura

> **DELETE:** http://rest-petadote.ddns.net/autenticacoes/usuarios/logout

```javascript
request.body = { 
    refreshToken: 'refreshTokenDoSeuUsuario'
};
```

- Usuários podem desejar encerrar suas sessões manualmente nas aplicações, para realizar isso devemos invalidar o Refresh Token desse usuário, não permitindo que ele seja utilizado para requisitar novos Access Tokens até a próxima autenticação do usuário e essa é a finalidade desse end-point.

## 

[Voltar ao início](#comoUsar)
</details>

---
<details id='detailsUsuarios'>
<summary><b>2. Contas, usuários e endereços.</b></summary>

## 2.1 - Cadastrando novos usuários

- Para criar a conta de um novo usuário, a REST API precisa receber uma requisição com o método http **POST** contendo o seguinte conteúdo no corpo da requisição (as chaves devem ser as mesmas do exemplo abaixo).

-  A autenticidade dos campos será verificada pela REST API que responderá de acordo conforme as verificações.

- Quando o cadastro do usuário for concluído, duas coisas acontecerão.
  - O usuário receberá no e-mail informado, um Token de Ativação válido por 15 minutos para que ele ative sua conta na aplicação.
  - A aplicação receberá uma mensagem de sucesso contendo o "cod_usuario", que permitirá que ela faça algumas solicitações com as permissões da aplicação sobre os dados do usuário, como por exemplo, enviar outra requisição para adicionar o avatar do usuário ou a imagem de background do perfil do usuário.

> **POST:** http://rest-petadote.ddns.net/contas/

```javascript
request.body = { 
    email: 'email.usuario@dominio.com',
    senha: 'Senha123',
    confirma_senha: 'Senha123',
    
    primeiro_nome: 'Testêncio',
    sobrenome: 'Testeiro',
    data_nascimento: '13/09/2000',
    cpf: '123.456.789-12',	// A REST API normaliza variações como 12345678912.
    telefone: '(01) 91234-4321',	// Aceita variações.
    descricao: 'Quero encontrar um pet legal!',
    
    cep: '12345-678',	// Aceita variações.
    logradouro: 'Rua exemplo',
    bairro: 'Bairro exemplo',
    cidade: 'Cidade exemplo',
    estado: 'Estado exemplo'
};
```

#### 2.1.1 - Atualizando dados do usuário cadastrado 

- **Alterando a senha da Conta do usuário.**

> **PATCH**: http://rest-petadote.ddns.net/contas/codigoDoUsuario
> 
> **Exemplo**: http://rest-petadote.ddns.net/contas/1

```javascript
request.body = { 
    senha: 'Senha123',
    confirma_senha: 'Senha123'
};
```

## 

- **Alterando os dados de perfil do usuário.**
  - Aqui devemos nos atentar ao tipo de requisição que é realizada:
    - **Alterações nos campos de texto** — (nome, sobrenome, data_nascimento, etc) podem ser enviadas de várias formas diferentes contanto que cheguem com "chave : valor", por exemplo com encoding **"x-www-form-urlencoded"** ou **"raw"**.
    - **Alterações nos arquivos** — (imagens, por exemplo) devem ser enviados com o encoding **"multipart/form-data"** e contendo apenas os campos dos exemplos abaixo.
    

> **PATCH**: http://rest-petadote.ddns.net/usuarios/codigoDoUsuario
> 
> **Exemplo**: http://rest-petadote.ddns.net/usuarios/1

```javascript
// Campos para campos de texto...
request.body = { 
    primeiro_nome: 'Testêncio',
    sobrenome: 'Testeiro',
    data_nascimento: '13/09/2000',
    cpf: '123.456.789-12',
    telefone: '(01) 91234-4321',
    descricao: 'Quero encontrar um pet legal!',
    
    qtd_seguidores: '0',	// 1 para incrementar, ou -1 para decrementar.
    qtd_seguidos: '0',		// 1 ou -1.
    qtd_denuncias: '0',		// 1 ou -1.
    
    esta_ativo: '0',	// Apenas o usuário poderá ativar a conta mudando esse valor para 1.
    
    e_admin: '0'	// 1 para ativar o usuário como administrador.
};
```
```javascript
// Campos para arquivos (imagens)...
request.multipart/form-data = { 
    foto_usuario: 'ArquivoDaFotoDoUsuario01.jpg',
    banner_usuario: 'ArquivoDoBannerDoUsuario01.png'	// Será convertido para jpeg.
};
```

- Voltando a foto ou o banner do usuário ao padrão.

> **PATCH**: http://rest-petadote.ddns.net/usuarios/codigoDoUsuario?setDefault=avatar
> 
> ou
> 
> **PATCH**: http://rest-petadote.ddns.net/usuarios/codigoDoUsuario?setDefault=banner

## 

- **Alterando os dados de endereço do usuário.**

> **PATCH**: http://rest-petadote.ddns.net/enderecos/codigoDoUsuario
> 
> **Exemplo**: http://rest-petadote.ddns.net/enderecos/1

```javascript
request.body = { 
    cep: '12345-678',
    logradouro: 'Rua exemplo',
    bairro: 'Bairro exemplo',
    cidade: 'Cidade exemplo',
    estado: 'Estado exemplo'
};
```

## 

#### 2.1.2 - Permitindo que o usuário ative sua conta.

- O processo de ativação da conta do usuário ocorre da seguinte maneira.
  -  O usuário realiza o cadastro ou a autenticação na aplicação.
  -  A aplicação informa que ele ainda não ativou sua conta e pergunta se o usuário deseja ativar. Se sim, o usuário receberá um e-mail contendo um Token de Ativação e uma interface pedirá a entrada desse Token de Ativação.
  -  A aplicação passa o Token informado para a REST API em uma requisição PATCH, se o Token for válido, a conta do usuário será ativada.
  -  A aplicação agora deverá fazer o Log-out desse usuário e requisitar que ele autentique-se novamente, pois somente no próximo Log-in a conta estará de fato ativada.

> **PATCH**: http://rest-petadote.ddns.net/contas/ativacao/TokenDeAtivacao
> 
> **Exemplo**: http://rest-petadote.ddns.net/contas/ativacao/123t0K3n

```javascript
// Se a aplicação permitir a ativação logo após o cadastro do usuário, passe no corpo da requisição o código do usuário recebido como resposta no fim do cadastro.
// Caso a ativação acontecer após a autenticação do usuário, apenas será necessário passar o Token diretamente ao end-point, uma vez que o cabeçalho da requisição deverá conter o Access Token do usuário.

request.body = {
    codUsuario: 'códigoDoUsuarioRecebidoComoRespostaNaConclusãoDoCadastro'
};
```

## 

#### 2.1.3 - Reenviando o Token de Ativação.

- O Token de Ativação possui um tempo de vida de 15 minutos. Portanto é possível que o usuário não ative a sua conta a tempo após receber o e-mail inicial contendo o Token de Ativação. Para requisitar um novo Token de Ativação, o usuário deve estar autenticado na aplicação (As requisições à REST API devem conter no cabeçalho, o Access Token da autenticação do usuário).

> **POST**: http://rest-petadote.ddns.net/contas/ativacao/reenvio/CodigoDoUsuario
> 
> **Exemplo**: http://rest-petadote.ddns.net/contas/ativacao/reenvio/1

- A aplicação poderá obter o código do usuário do próprio Token de Acesso do usuário autenticado. Se o usuário autenticado e o parâmetro "CódigoDoUsuario" não estiverem de acordo, a REST API não realizará o envio do e-mail, e informará o motivo do erro à aplicação.


## 2.2 - Recuperando a senha da conta do usuário

- É comum que usuários esqueçam as senhas de acesso de suas contas. O processo ocorre da seguinte maneira.
  - Um usuário ao autenticar-se identifica que esqueceu sua senha. Ele então vai até a interface de recuperação de senha na aplicação e informa seu e-mail.
  - A aplicação realiza a requisição ao end-point que vai gerar e enviar via e-mail o Token de Recuperação para o usuário e então aguardará que o usuário autorize a redefinição da senha ao digitar o Token recebido.
  - Ao digitar um Token válido, a aplicação envia o Token de Recuperação informado pelo usuário no corpo da requisição para o end-point de Redefinição da senha do usuário.
  - Nesse momento, a REST API vai realizar todo o processo de criação/criptografia/redefinição/envio da senha provisória ao e-mail do usuário.
  - Ao receber a senha provisória, o usuário poderá acessar sua conta novamente.

- **Envio do Token de Recuperação, que permitirá que o usuário autorize a redefinição da senha.**


> **POST**: http://rest-petadote.ddns.net/contas/recuperacao

```javascript
request.body = {
    email: 'email.usuario@dominio.com'
}
```

- **End-point para a redefinir e entregar a senha provisória ao usuário.**

> **PATCH**: http://rest-petadote.ddns.net/contas/recuperacao

```javascript
request.body = {
    email: 'email.usuario@dominio.com',
    tokenRecuperacao: '123t0K3n'
}
```

## 2.3 - Acessando dados sobre contas, usuários e endereços

Os dados exibidos dependerão do nível de acesso do requisitante.

Por exemplo: Clientes "Pet Adote" visualizarão dados mais completos, necessários ao negócio das aplicações "Pet Adote";

Enquanto isso, clientes "Comuns" visualizarão apenas dados quantificadores (Quantas contas estão cadastradas, quantos pets de tal espécie estão cadastrados, etc.);

E os usuários autenticados por meio de aplicações Pet Adote acessarão apenas dados relativos à eles mesmo ou dados públicos, não podendo por exemplo, visualizar os dados de perfil de um usuário que tenha adicionado o usuário requerente à sua lista de usuários bloqueados.

#### 2.3.1 - Acessando dados sobre as contas cadastradas.

A REST API fornece 3 meios de busca de informações sobre contas cadastradas, é importante ressaltar que as buscas não exibem dados sensíveis dos usuários (como senhas).

- **Lista de todas as contas registradas no sistema.**

> **GET**: http://rest-petadote.ddns.net/contas/

- **Exibe dados sobre a conta de um usuário específico quando a aplicação sabe os código do usuário.**

> **GET**: http://rest-petadote.ddns.net/contas/?codUsuario=1

- **Exibe dados sobre a conta de um usuário específico quando a aplicação sabe o tipo de cadastro e o chave da conta.**

> **GET**: http://rest-petadote.ddns.net/contas/?tipoCadastro=local&chaveConta=email.usuario@dominio.com

## 

#### 2.3.2 - Acessando dados sobre os dados de perfil do usuário.

Temos 2 meios de busca de dados de perfil dos usuários.

- **Lista de todas os perfis de usuários registrados no sistema**.

> **GET**: http://rest-petadote.ddns.net/usuarios/

- **Exibe dados sobre o perfil de um usuário específico**.

> **GET**: http://rest-petadote.ddns.net/usuarios/CodigoDoUsuario
>
> **Exemplo**: http://rest-petadote.ddns.net/usuarios/1

## 

#### 2.3.3 - Acessando dados sobre os endereços cadastrados.

Temos 3 meios de busca dos endereços cadastrados. Os end-points refletem o fato de que os endereços pertencem aos usuários.

- **Lista todos os endereços cadastrados**.

> **GET**: http://rest-petadote.ddns.net/usuarios/enderecos/

- **Exibe o endereço que está vínculado à um usuário, caso a aplicação saiba o código do usuário**.

> **GET**: http://rest-petadote.ddns.net/usuarios/enderecos/?codUsuario=1

- **Exibe o endereço a partir do código de endereço**.

> **GET**: http://rest-petadote.ddns.net/usuarios/enderecos/?codEndereco=1

## 2.4 - Lista de Códigos de Possíveis Erros

<details>
<summary>Clique aqui para ver a lista de Error Codes</summary>

- ACCESS_TO_RESOURCE_NOT_ALLOWED (401)

- INTERNAL_SERVER_API_ERROR (500)
- INTERNAL_SERVER_ERROR (500)
- INTERNAL_SERVER_MODULE_ERROR (500)

- RESOURCE_NOT_FOUND (404)

- ACCESS_NOT_ALLOWED (401)
- EXPIRED_AUTH (401)

- BAD_REQUEST (400)

- INVALID_INPUT (400)

- INVALID_PARAM (400)

- INVALID_REQUEST_QUERY (400)

- INVALID_REQUEST_FIELDS (400)

- INVALID_EMAIL_LENGTH (400)
- INVALID_EMAIL_INPUT (400)
- EMAIL_ALREADY_TAKEN (409)

- INVALID_PASSWORD_LENGTH (400)
- PASSWORD_WITHOUT_NUMBER (400)
- PASSWORD_WITHOUT_UPPERCASE_LETTER (400)
- PASSWORD_WITHOUT_LOWERCASE_LETTERS (400)
- INVALID_PASSWORD_CONFIRMATION (400)

- INVALID_PRIMEIRO_NOME_LENGTH (400)
- INVALID_PRIMEIRO_NOME_INPUT (400)

- INVALID_SOBRENOME_LENGTH (400)
- INVALID_SOBRENOME_INPUT (400)
		
- INVALID_DATA_NASCIMENTO_LENGTH (400)
- INVALID_DATA_NASCIMENTO_INPUT (400)
- INVALID_DATA_NASCIMENTO_FOR_LEAP_YEAR (400)
- INVALID_DATA_NASCIMENTO_FOR_COMMON_YEAR (400)

- FORBIDDEN_USER_AGE (403)

- INVALID_CPF_INPUT (400)
- CPF_DIGITS_ARE_REPEATING (400)
- CPF_ALREADY_TAKEN (409)
- INVALID_CPF (400)

- INVALID_TELEFONE_INPUT (400)
- TELEFONE_DIGITS_ARE_REPEATING (400)
- INVALID_TELEFONE_DDD (400)

- INVALID_CEP_INPUT (400)
- CEP_NOT_FOUND (400)

- INVALID_LOGRADOURO_LENGTH (400)

- INVALID_BAIRRO_LENGTH (400)

- INVALID_CIDADE_LENGTH (400)

- CIDADE_DONT_BELONG_TO_CEP (400)

- INVALID_ESTADO_LENGTH (400)
- ESTADO_DONT_BELONG_TO_CEP (400)

- INVALID_DESCRICAO_LENGTH (400)

- INVALID_REQUEST_CONTENT (400)

- TOKEN_NOT_FOUND (404)

- USER_HAS_ACTIVE_TOKEN (403)
</details>

## 

[Voltar ao início](#comoUsar)
</details>

---

<details id='detailsAnimais'>
<summary><b>3. Animais, álbuns e fotos.</b></summary>

## 3.1 - Cadastrando novos animais.

- Para cadastrar novos animais, a REST API precisa receber uma requisição com o método http **POST** contendo o seguinte conteúdo no corpo da requisição (as chaves devem ser as mesmas dos exemplos abaixo).

- **Atenção**: O cadastro de animais só pode ser feito por usuários de aplicações Pet Adote.

> **POST:** http://rest-petadote.ddns.net/usuarios/animais/

```javascript
request.body = {
    nome: 'Tom',
    data_nascimento: '2021-04-18',
    especie: 'Gato',    // Aceita: "Gato", "Cão", "Outros".
    raca: 'Comum',    // A raça é irrestrita, o usuário que define.
    genero: 'M',    // Aceita: "M", "F".
    porte: 'M',    // Aceita: "P", "M", "G".
    esta_castrado: '1',    // Aceita: "1", "0".
    esta_vacinado: '1',    // Aceita: "1", "0".
    detalhes_comportamento: 'O Tom é um pouco bagunceiro, mas só quando está brincando.',
    detalhes_saude: 'Sempre teve boa saúde.',
    historia: 'Meu vizinho deixou o Tom comigo porque estava se mudando e não podia levá-lo pra nova casa, mas eu não tenho tempo para dar atenção pra ele, preciso que alguém adote o Tom e cuide bem dele.'
}
```

- Quando um animal é cadastrado, ele imediatamente recebe um Álbum para adição de fotos no futuro.


- Se a aplicação deseja alterar a foto de exibição do animal, poderá utilizar o _"cod_animal"_ recebido na resposta da requisição para fazer a alteração. A nova foto de exibição será adicionada ao álbum do animal automáticamente.

##

#### 3.1.1 - Atualizando dados do animal cadastrado

- **Alterando os dados comuns do animal.**
  - Aqui devemos nos atentar ao tipo de requisição que é realizada:
    - **Alterações nos campos de texto** - Podem ser enviadas de várias formas diferentes contanto que cheguem no formato "Chave : Valor". Por exemplo, utilizando o encoding **"x-www-form-urlencoded"** ou **"raw"**.
    - **Alterações nos arquivos (imagens)** - Arquivos devem ser enviados um a um, com o encoding **"multipart/form-data"**.

- Os dados do animal podem ser alterados por administradores caso necessário.

- Abaixo temos a lista de campos que devem ser utilizados em cada tipo de requisição de alteração, observe que não é necessário enviar todos os campos de uma só vez, é possível por exemplo alterar só o nome do animal. Entretanto é necessário separar requisições entre campos comuns e campos de arquivos, já que usam encodings diferentes.

> **PATCH**: http://rest-petadote.ddns.net/usuarios/animais/codigoDoAnimal
>
> **Exemplo**: http://rest-petadote.ddns.net/usuarios/animais/1

```javascript
// Campos comuns.
request.body = {
    nome: '',
    foto: '',    // Aceita apenas UID de fotos que estão no álbum do animal.
    data_nascimento: '',
    especie: '',    // Aceita: "Gato", "Cão", "Outros".
    raca: '',    // A raça é irrestrita, o usuário que define.
    genero: '',    // Aceita: "M", "F".
    porte: '',    // Aceita: "P", "M", "G".
    esta_castrado: '',    // Aceita: "1", "0".
    esta_vacinado: '',    // Aceita: "1", "0".
    detalhes_comportamento: '',
    detalhes_saude: '',
    historia: ''
}
```

```javascript
// Campos para arquivos.
request.multipart/form-data = {
    foto: 'ArquivoDaFotoDoAnimal.jpeg'
}
```

- **Para retornar a foto de exibição do animal para o padrão faça a seguinte chamada.**

> **PATCH**: http://rest-petadote.ddns.net/usuarios/animais/codigoDoAnimal?setDefault=foto
>
> **Exemplo**: http://rest-petadote.ddns.net/usuarios/animais/1?setDefault=foto

## 3.1.2 - Acessando dados sobre Animais.

Temos 4 meios de acessar dados sobre os animais cadastrados.

- **Lista de todos os animais cadastrados.**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/

- **Lista de todos os animais cadastrados de usuários ativos.**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/?getAllActive=1

- **Lista de todos os animais cadastrados de usuários inativos.**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/?getAllActive=0

- **Lista de todos os animais cadastrados de um usuário específico.**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/?getAllFromUser=codigoUsuarioAqui

- **Exibe os dados de um animal específico.**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/?getOne=codigoAnimalAqui

- **Paginação**: Todos os meios de acesso a listagem de dados acima permitem que os clientes declarem limites para a listagem, por exemplo, se você deseja visualizar apenas 5 animais por requisição na lista de todos os animais cadastrados, forme sua query string da seguinte maneira:

> **GET**: http://rest-petadote.ddns.net/usuarios/animais/?page=1&limit=5

- **"page"** declara a página atual; **"limit"** declara o limite de dados que serão exibidos.

## 3.2 - Acessando dados sobre os Álbuns dos animais.

Durante o cadastro do animal, um álbum é criado para que o usuário possa adicionar novas fotos do animal. Por enquanto apenas esse álbum pode ser utilizado.

Os álbuns criados pelo sistema não podem ser alterados.

Temos 4 maneiras de acessar os dados dos álbuns.

- **Lista de todos os Álbuns de animais cadastrados.**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/

- **Lista de todos os Álbuns de animais cadastrados de usuários ativos.**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/?getAllActive=1

- **Lista de todos os Álbuns de animais cadastrados de usuários inativos.**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/?getAllActive=0

- **Lista de todos os Álbuns de um animal específico.**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/?getAllFromAnimal=codigoAnimalAqui

- **Exibe os dados de um Álbum específico.**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/?getOne=codigoDoAlbumAqui

- **O sistema de paginação mencionado no tópico (3.1.2) também funciona aqui.**

## 3.3 - Adicionando fotos ao álbum do animal.

- Para cadastrar novas fotos ao álbum de um animal, a REST API precisa receber uma requisição com o método http **POST** contendo o seguinte conteúdo no corpo da requisição (as chaves devem ser as mesmas dos exemplos abaixo).

- **Atenção**: É necessário que o requisitante seja o dono do animal para cadastrar novas fotos no álbum do animal. Além disso, como estaremos lidando com arquivos (imagens), o encoding utilizado para enviar essa requisição deve ser **multipart/form-data**.

> **POST:** http://rest-petadote.ddns.net/usuarios/animais/albuns/fotos/codigoDoAlbumAqui

```javascript
request.multipart/form-data = {
    foto: 'ArquivoDaFotoDoAnimal.jpeg'
}
```

##

#### 3.3.1 - Alterando os dados da foto.

- Uma vez que a foto foi enviada com sucesso, podemos utilizar seu UID para alterar os dados da foto, como o nome ("Nome" é diferente de UID, ok?) dela, a descrição, e o estado de ativação dela (O usuário poderá apenas desativar fotos - Isso significa que ele "deletou" a foto).


- Vejamos abaixo como realizar a chamada de alteração dos dados da foto, lembre-se que o nome dos campos devem ser iguais ao enviar os dados na requisição.


- **Atenção**: O requisitante deve ser o dono do recurso (Ou seja, o dono do animal que possui a foto em seus álbuns).

> **PATCH:** http://rest-petadote.ddns.net/usuarios/animais/albuns/fotos/uidDaFotoDoAnimal.jpeg

```javascript
request.body = {
    nome: '',
    descricao: '',
    ativo: ''    // Aceita apenas: '0' - Administradores podem ativá-la novamente caso necessário.
}
```

## 3.3.2 - Acessando dados sobre as fotos dos animais.

Existem 10 formas de acessar dados sobre as fotos dos animais, sendo que 3 dessas formas são dedicadas à usuários comuns (Que não são administradores).

- **01. Lista de todas as fotos dos álbuns dos animais. (Apps/Admins)**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/fotos/

- **02. Lista de todas as fotos ativas dos álbuns dos animais. (Apps/Admins)**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/fotos/?getAllActive=1

- **03. Lista de todas as fotos inativas dos álbuns dos animais. (Apps/Admins)**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/fotos/?getAllActive=0

- **04. Lista de todas as fotos ativas dos álbuns dos animais cujo dono está ativo. (Apps/Admins/Usuários)**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/fotos/?getAllActive=1&activeOwner=1

- **05. Lista de todas as fotos inativas dos álbuns dos animais cujo dono está ativo. (Apps/Admins)**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/fotos/?getAllActive=0&activeOwner=1

- **06. Lista de todas as fotos ativas dos álbuns dos animais cujo dono está inativo. (Apps/Admins)**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/fotos/?getAllActive=1&activeOwner=0

- **07. Lista de todas as fotos inativas dos álbuns dos animais cujo dono está inativo. (Apps/Admins)**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/fotos/?getAllActive=0&activeOwner=0

- **08. Lista de todas as fotos ativas de um álbum específico. (Apps/Admins/Usuários)**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/fotos/?getAllActiveFromAlbum=codigoAlbumAqui

- **09. Lista de todas as fotos inativas de um álbum específico. (Apps/Admins)**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/fotos/?getAllNotActiveFromAlbum=codigoAlbumAqui

- **10. Exibe os dados de uma foto específica. (Apps/Admins/Usuários)**
> **GET**: http://rest-petadote.ddns.net/usuarios/animais/albuns/fotos/?getOne=uidDaFotoAqui.jpeg

- **O sistema de paginação funciona em todas as chamadas citadas acima.**

## 3.4 - Lista de Códigos de Possíveis Erros

<details>
<summary>Clique aqui para ver a lista de Error Codes</summary>

- ACCESS_TO_RESOURCE_NOT_ALLOWED (401)
- INVALID_REQUEST_QUERY (400)
- BAD_REQUEST (400)
- RESOURCE_NOT_FOUND (404)
- INTERNAL_SERVER_ERROR (500)
- INTERNAL_SERVER_MODULE_ERROR (500)
- INVALID_REQUEST_FIELDS (400)
- INVALID_REQUEST_CONTENT (400)
- FILE_SIZE_TOO_LARGE (413)
- INVALID_FILE_MIME (406)
- LIMIT_FILE_COUNT (400)
- LIMIT_FILE_SIZE (413)
- LIMIT_UNEXPECTED_FILE (400)
- LIMIT_FIELD_COUNT (400)
- INVALID_FILE_INPUT (400)
- INVALID_INPUT_NOME (400)
- INVALID_LENGTH_NOME (400)
- INVALID_INPUT_FOTO (400)
- INVALID_SELECTION_FOTO (400)
- INVALID_LENGTH_DATA_NASCIMENTO (400)
- INVALID_INPUT_DATA_NASCIMENTO (400)
- INVALID_DATA_NASCIMENTO_FOR_LEAP_YEAR (400)
- INVALID_DATA_NASCIMENTO_FOR_COMMON_YEAR (400)
- INVALID_INPUT_ESPECIE (400)
- INVALID_INPUT_RACA (400)
- INVALID_LENGTH_RACA (400)
- INVALID_INPUT_GENERO (400)
- INVALID_INPUT_PORTE (400)
- INVALID_INPUT_ESTA_CASTRADO (400)
- INVALID_INPUT_ESTA_VACINADO (400)
- INVALID_LENGTH_DETALHES_COMPORTAMENTO (400)
- INVALID_LENGTH_DETALHES_SAUDE (400)
- INVALID_LENGTH_HISTORIA (400)
- INVALID_LENGTH_DESCRICAO (400)
- INVALID_INPUT_ATIVO (400)

</details>

## 

[Voltar ao início](#comoUsar)

</details>

---