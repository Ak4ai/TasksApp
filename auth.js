import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { app } from './firebase-config.js';
// auth.js
import { carregarTarefas, atualizarDataAtual, carregarInventario } from './tarefas.js';


const auth = getAuth(app);
const provider = new GoogleAuthProvider();
let jaCarregouTarefas = false;


// Persistência local (mantém logado entre sessões)
setPersistence(auth, browserLocalPersistence).then(() => {
  // Verifica se o usuário já está logado

  onAuthStateChanged(auth, (user) => {
      const loginContainer = document.getElementById('login-container');
  
      if (user) {
          loginContainer.style.display = 'none';
          //document.querySelector('.user-name').textContent = `👤 ${user.displayName}`;
          console.log("Usuário logado:", user);
  
          if (!jaCarregouTarefas) {
              carregarTarefas();
              carregarInventario(); // Carrega itens ativos no topo
              jaCarregouTarefas = true;
              atualizarDataAtual();
          }
      } else {
          loginContainer.style.display = 'flex';
          document.getElementById('login-button').addEventListener('click', loginComGoogle);
      }
  });
  
});

function loginComGoogle() {
  signInWithPopup(auth, provider)
    .then((result) => {
      const user = result.user;
      // Após o login bem-sucedido, esconde o container de login e exibe o conteúdo da aplicação
      document.getElementById('login-container').style.display = 'none';

      // Atualiza a interface com o nome do usuário
      //document.querySelector('.user-name').textContent = `👤 ${user.displayName}`;
      console.log("Login bem-sucedido:", user);
      carregarTarefas();
      carregarInventario(); // Carrega itens ativos no topo
      atualizarDataAtual();
    })
    .catch((error) => {
      console.error("Erro ao logar:", error);
      alert("Erro ao fazer login com Google");
    });
}

setInterval(atualizarDataAtual, 60 * 60 * 1000);

export { auth };