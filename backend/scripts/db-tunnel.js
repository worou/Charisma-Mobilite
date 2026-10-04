// Tunnel SSH vers le MySQL d'o2switch pour le développement local :
// 127.0.0.1:DB_PORT (3307 par défaut) -> MySQL du serveur (127.0.0.1:3306).
// À laisser ouvert pendant que le backend tourne. Le mot de passe SSH est demandé au lancement.
// Prérequis o2switch : l'adresse IP du poste doit être autorisée (cPanel > Autorisation SSH).
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { spawn } = require('child_process');

const { SSH_TUNNEL_USER, SSH_TUNNEL_HOST } = process.env;
const localPort = process.env.DB_PORT || '3307';
if (!SSH_TUNNEL_USER || !SSH_TUNNEL_HOST) {
  console.error('Renseignez SSH_TUNNEL_USER et SSH_TUNNEL_HOST dans backend/.env');
  process.exit(1);
}

console.log(`Tunnel MySQL : 127.0.0.1:${localPort} -> ${SSH_TUNNEL_HOST}:3306 (Ctrl+C pour fermer)`);
const ssh = spawn('ssh', [
  '-N',
  '-o', 'ServerAliveInterval=60',
  '-L', `127.0.0.1:${localPort}:127.0.0.1:3306`,
  `${SSH_TUNNEL_USER}@${SSH_TUNNEL_HOST}`,
], { stdio: 'inherit' });
ssh.on('exit', (code) => process.exit(code ?? 0));
