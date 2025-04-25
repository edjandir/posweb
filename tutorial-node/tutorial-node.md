# Tutorial Atualizado: API de Blog com Node.js, Express, Knex (com Migrações), SQLite, JWT e Validação de Dados

## Slide 1: Objetivo do Tutorial

-   Construir uma API REST de um Blog
    
-   Tecnologias:
    
    -   Node.js (ES Modules)
        
    -   Express.js
        
    -   Knex.js (com Migrações)
        
    -   SQLite3
        
    -   JSON Web Token (JWT)
        
    -   Joi (Validação)
        
-   Funcionalidades:
    
    -   Cadastro/Login de usuários
        
    -   CRUD de postagens
        
    -   Relacionamento entre usuários e postagens
        

## Slide 2: Inicialização do Projeto

```bash
mkdir blog-api
cd blog-api
npm init -y

```

Instale dependências:

```bash
npm install express knex sqlite3 bcryptjs jsonwebtoken dotenv joi
npm install nodemon --save-dev

```

Habilite ES Modules no `package.json`:

```json
{
  "type": "module"
}

```

Estrutura de pastas:

-   /src
    
    -   /config
        
    -   /controllers
        
    -   /middlewares
        
    -   /models
        
    -   /routes
        
-   /migrations
    
-   .env
    
-   knexfile.js
    
-   server.js
    

## Slide 3: Configurando o Knex e Migrações

-   Arquivo `knexfile.js`
    

```javascript
export default {
  development: {
    client: 'sqlite3',
    connection: { filename: './src/database/blog.db' },
    useNullAsDefault: true,
    migrations: { directory: './migrations' }
  }
};

```

-   Criar migrações:
    

```bash
npx knex migrate:make create_usuarios
npx knex migrate:make create_postagens

```

-   Exemplo de migração `migrations/20240425_create_usuarios.js`
    

```javascript
export async function up(knex) {
  return knex.schema.createTable('usuarios', (table) => {
    table.increments('id').primary();
    table.string('nome').notNullable();
    table.string('email').unique().notNullable();
    table.string('senha').notNullable();
  });
}

export async function down(knex) {
  return knex.schema.dropTable('usuarios');
}

```

-   Rodar migrações:
    

```bash
npx knex migrate:latest

```

## Slide 4: Modelos (Models)

-   `src/models/usuarioModel.js`
    

```javascript
import db from '../config/database.js';

export const criarUsuario = (dados) => db('usuarios').insert(dados);
export const buscarUsuarioPorEmail = (email) => db('usuarios').where({ email }).first();
export const buscarUsuarioPorId = (id) => db('usuarios').where({ id }).first();

```

-   `src/models/postagemModel.js`
    

```javascript
export const criarPostagem = (dados) => db('postagens').insert(dados);

export const listarPostagens = () =>
  db('postagens')
    .join('usuarios', 'usuarios.id', '=', 'postagens.usuario_id')
    .select('postagens.id', 'usuarios.nome as autor', 'postagens.titulo', 'postagens.texto', 'postagens.data_criacao');

```

## Slide 5: Autenticação JWT e Middleware

-   `src/middlewares/authMiddleware.js`
    

```javascript
import jwt from 'jsonwebtoken';

export const autenticarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, usuario) => {
    if (err) return res.sendStatus(403);
    req.usuario = usuario;
    next();
  });
};

```

## Slide 6: Validação de Dados com Joi

-   `src/middlewares/validacaoMiddleware.js`
    

```javascript
import Joi from 'joi';

export const validarCadastroUsuario = (req, res, next) => {
  const schema = Joi.object({
    nome: Joi.string().required(),
    email: Joi.string().email().required(),
    senha: Joi.string().min(6).required()
  });

  const { error } = schema.validate(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });
  next();
};

```

## Slide 7: Controladores (Controllers)

-   `src/controllers/usuarioController.js`
    

```javascript
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { criarUsuario, buscarUsuarioPorEmail } from '../models/usuarioModel.js';

export const registrar = async (req, res) => {
  const { nome, email, senha } = req.body;
  const hash = await bcrypt.hash(senha, 10);
  await criarUsuario({ nome, email, senha: hash });
  res.status(201).json({ message: 'Usuário registrado!' });
};

export const login = async (req, res) => {
  const { email, senha } = req.body;
  const usuario = await buscarUsuarioPorEmail(email);
  if (!usuario || !(await bcrypt.compare(senha, usuario.senha)))
    return res.status(401).json({ message: 'Credenciais inválidas!' });

  const token = jwt.sign({ id: usuario.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
};

```

## Slide 8: Controladores de Postagem

-   `src/controllers/postagemController.js`
    

```javascript
import { criarPostagem, listarPostagens } from '../models/postagemModel.js';

export const criar = async (req, res) => {
  const { titulo, texto } = req.body;
  await criarPostagem({ usuario_id: req.usuario.id, titulo, texto });
  res.status(201).json({ message: 'Postagem criada!' });
};

export const listar = async (req, res) => {
  const postagens = await listarPostagens();
  res.json(postagens);
};

```

## Slide 9: Definindo Rotas

-   `src/routes/usuarioRoutes.js`
    

```javascript
import express from 'express';
import { registrar, login } from '../controllers/usuarioController.js';
import { validarCadastroUsuario } from '../middlewares/validacaoMiddleware.js';

const router = express.Router();

router.post('/usuarios', validarCadastroUsuario, registrar);
router.post('/login', login);

export default router;

```

-   `src/routes/postagemRoutes.js`
    

```javascript
import express from 'express';
import { criar, listar } from '../controllers/postagemController.js';
import { autenticarToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/postagens', autenticarToken, criar);
router.get('/postagens', listar);

export default router;

```

## Slide 10: Configurando o Servidor

-   `server.js`
    

```javascript
import express from 'express';
import dotenv from 'dotenv';
import usuarioRoutes from './src/routes/usuarioRoutes.js';
import postagemRoutes from './src/routes/postagemRoutes.js';
import db from './src/config/database.js';

dotenv.config();
const app = express();

app.use(express.json());
app.use('/api', usuarioRoutes);
app.use('/api', postagemRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));

```

## Slide 11: Testando a API

-   Endpoints:
    
    -   `POST /api/usuarios`
        
    -   `POST /api/login`
        
    -   `POST /api/postagens` (Token obrigatório)
        
    -   `GET /api/postagens`
        

Use Postman ou Insomnia.

## Slide 12: Considerações Finais

-   Melhorias sugeridas:
    
    -   Upload de imagens
        
    -   Atualização/Exclusão de postagens
        
    -   Recuperação de senha
        
    -   Administração de usuários
        

----------
