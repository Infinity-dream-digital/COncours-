import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAjbVjLLEWQyJFkXG-g67q3zQfee69Wo-I",
  authDomain: "concours-13ebb.firebaseapp.com",
  projectId: "concours-13ebb",
  storageBucket: "concours-13ebb.firebasestorage.app",
  messagingSenderId: "34631527839",
  appId: "1:34631527839:web:14580c393acd7736efe1aa"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 1. Charger dynamiquement les candidats dans la liste déroulante
async function loadCandidatesSelect() {
  const selectEl = document.getElementById('candidateSelect');
  if (!selectEl) return;

  try {
    const snapshot = await getDocs(collection(db, 'candidates'));
    // Vider le select en gardant l'option par défaut
    selectEl.innerHTML = '<option value="">-- Sélectionnez un candidat --</option>';
    
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const option = document.createElement('option');
      option.value = docSnap.id;
      option.textContent = data.name;
      selectEl.appendChild(option);
    });
  } catch (err) {
    console.error("Erreur lors du chargement des candidats :", err);
  }
}

// 2. Écouter la soumission du formulaire
const voteForm = document.getElementById('voteForm') || document.querySelector('form');

if (voteForm) {
  voteForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Indispensable : bloque le rechargement de la page

    const selectedCandidateId = document.getElementById('candidateSelect')?.value;
    const voterEmail = document.getElementById('voterEmail')?.value?.trim();

    if (!selectedCandidateId) {
      alert('Veuillez choisir un candidat.');
      return;
    }

    if (!voterEmail) {
      alert('Veuillez entrer une adresse e-mail valide.');
      return;
    }

    try {
      // Vérification des doublons de vote par e-mail
      const existingVotes = await getDocs(
        query(collection(db, 'votes'), where('voter_email', '==', voterEmail))
      );

      if (!existingVotes.empty) {
        alert('Cet e-mail a déjà été utilisé pour voter !');
        return;
      }

      // Enregistrement dans la collection 'votes'
      await addDoc(collection(db, 'votes'), {
        candidate_id: selectedCandidateId,
        voter_email: voterEmail,
        created_at: serverTimestamp()
      });

      alert('Votre vote a bien été pris en compte !');
      voteForm.reset();

    } catch (err) {
      console.error("Erreur d'enregistrement du vote :", err);
      alert("Erreur lors de l'enregistrement du vote : " + err.message);
    }
  });
}

loadCandidatesSelect();