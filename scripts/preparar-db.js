// Cria db.json (o banco que o json-server edita) a partir do seed, se ainda não existir.
// Assim o arquivo versionado (db.seed.json) nunca é alterado pelo uso do sistema.
// Para voltar aos dados iniciais, apague db.json e rode "npm start" de novo.
import { copyFileSync, existsSync } from 'node:fs';

if (existsSync('db.json')) {
    console.log('db.json já existe; mantendo os dados atuais.');
} else {
    copyFileSync('db.seed.json', 'db.json');
    console.log('db.json criado a partir de db.seed.json.');
}
