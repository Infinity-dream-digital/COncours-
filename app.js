const ADMIN_CODE = 'Digitaldream';
const STORAGE_KEY = 'small_boost_data';

const seedCandidates = [
  { id:'amina', name:'Amina Koné', initials:'AK', shortDescription:'Une solution simple pour rendre le soutien scolaire accessible à chaque enfant.', fullProject:'Amina développe une plateforme mobile de tutorat communautaire qui connecte des étudiants volontaires avec des enfants ayant besoin d’accompagnement. Son projet combine contenus courts, suivi personnalisé et entraide locale.', votesCount:12 },
  { id:'koffi', name:'Koffi N’Guessan', initials:'KN', shortDescription:'Transformer les déchets plastiques en objets utiles, beaux et durables.', fullProject:'Koffi transforme les déchets plastiques collectés dans les quartiers en mobilier et objets du quotidien. Avec son atelier-école, il veut créer des emplois verts tout en sensibilisant les jeunes à l’économie circulaire.', votesCount:9 },
  { id:'mariam', name:'Mariam Traoré', initials:'MT', shortDescription:'Donner une voix aux jeunes talents créatifs de nos quartiers.', fullProject:'Mariam crée une scène itinérante qui repère, accompagne et met en lumière les jeunes talents artistiques. Son projet propose des ateliers, des résidences et des showcases gratuits dans plusieurs communes.', votesCount:7 }
];

let candidates = [];
let votes = [];
let selectedCandidate = null;

const $ = (selector) => document.querySelector(selector);
const openModal = (id) => $(id).classList.add('open');
const closeModal = (id) => $(id).classList.remove('open');
const showToast = (message) => { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 3500); };
const normalized = (value) => value.trim().toLowerCase();

function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ candidates, votes })); } catch (e) {}
}

function loadData() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) { const parsed = JSON.parse(stored); candidates = parsed.candidates || []; votes = parsed.votes || []; }
  } catch (e) {}
  if (!candidates.length) candidates = seedCandidates.map((c) => ({ ...c }));
  renderCandidates();
}

function renderCandidates() {
  $('#candidateGrid').innerHTML = candidates.map((candidate, index) => `<article class="candidate-card" data-id="${candidate.id}"><div class="candidate-visual"><div class="portrait">${candidate.initials || candidate.name.split(' ').map((part) => part[0]).join('').slice(0,2)}</div></div><div class="card-info"><span class="rank">FINALISTE 0${index + 1}</span><h3>${candidate.name}</h3><p>${candidate.shortDescription}</p><div class="card-bottom"><button class="card-vote" data-id="${candidate.id}">Voter pour ce projet →</button><span class="vote-count">${candidate.votesCount || 0} votes</span></div></div></article>`).join('');
  document.querySelectorAll('.candidate-card').forEach((card) => card.addEventListener('click', (event) => { const id = event.target.dataset.id || card.dataset.id; const candidate = candidates.find((item) => item.id === id); if (event.target.classList.contains('card-vote')) return openVote(candidate); openProject(candidate); }));
}

function openProject(candidate) {
  selectedCandidate = candidate;
  $('#projectTitle').textContent = candidate.name;
  $('#projectSummary').textContent = candidate.shortDescription;
  $('#projectFull').textContent = candidate.fullProject;
  $('#projectVoteButton').onclick = () => { closeModal('projectModal'); openVote(candidate); };
  openModal('projectModal');
}

function openVote(candidate) {
  selectedCandidate = candidate;
  $('#voteCandidateName').textContent = candidate.name;
  $('#voteError').textContent = '';
  $('#voterEmail').value = '';
  openModal('voteModal');
  setTimeout(() => $('#voterEmail').focus(), 100);
}

function submitVote(event) {
  event.preventDefault();
  const email = normalized($('#voterEmail').value);
  const error = $('#voteError');
  error.textContent = '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { error.textContent = 'Veuillez entrer une adresse e-mail valide.'; return; }
  if (votes.some((vote) => vote.voterEmail === email)) { error.textContent = 'Cette adresse a déjà participé au vote.'; return; }
  votes.push({ voterEmail: email, candidateId: selectedCandidate.id, timestamp: { seconds: Date.now()/1000 } });
  const localCandidate = candidates.find((c) => c.id === selectedCandidate.id);
  if (localCandidate) localCandidate.votesCount = (localCandidate.votesCount || 0) + 1;
  saveData();
  closeModal('voteModal');
  renderCandidates();
  showToast('Votre vote a bien été enregistré. Merci !');
}

function adminLogin(event) {
  event.preventDefault();
  $('#adminError').textContent = '';
  const code = $('#adminCode').value.trim();
  if (code === ADMIN_CODE) {
    $('#adminCode').value = '';
    closeModal('adminModal');
    openDashboard();
    showToast('Accès administrateur accordé.');
  } else {
    $('#adminError').textContent = 'Code d’accès incorrect.';
  }
}

function deleteCandidate(id) {
  const candidate = candidates.find((item) => item.id === id);
  if (!candidate) return;
  if (!confirm('Supprimer le candidat « ' + candidate.name + ' » ? Cette action est irréversible.')) return;
  candidates = candidates.filter((item) => item.id !== id);
  saveData();
  renderCandidates();
  updateDashboard();
  showToast('Candidat supprimé.');
}

function openDashboard() {
  $('#dashboard').classList.add('open');
  updateDashboard();
}

function updateDashboard() {
  $('#totalVotes').textContent = votes.length;
  $('#totalCandidates').textContent = candidates.length;
  $('#lastVote').textContent = votes.length ? new Date((votes[0].timestamp?.seconds || Date.now()/1000) * 1000).toLocaleDateString('fr-FR') : '—';
  const ranked = candidates.slice().sort((a, b) => (b.votesCount || 0) - (a.votesCount || 0));
  const maxVotes = Math.max.apply(null, ranked.map((c) => c.votesCount || 0).concat([1]));
  $('#rankingList').innerHTML = ranked.map((candidate, index) => '<div class="ranking-row"><span class="ranking-position">0' + (index+1) + '</span><span class="ranking-name">' + candidate.name + '</span><span class="ranking-bar" style="width:' + Math.max(8,(candidate.votesCount||0)/maxVotes*90) + 'px"></span><span class="ranking-votes">' + (candidate.votesCount || 0) + '</span><button class="delete-candidate" data-id="' + candidate.id + '" title="Supprimer">✕</button></div>').join('');
  document.querySelectorAll('.delete-candidate').forEach((button) => button.addEventListener('click', function() { deleteCandidate(this.getAttribute('data-id')); }));
  $('#votesTable').innerHTML = votes.slice(0, 10).map((vote) => '<tr><td>' + vote.voterEmail + '</td><td>' + (candidates.find((c) => c.id === vote.candidateId)?.name || '—') + '</td><td>' + new Date((vote.timestamp?.seconds || Date.now()/1000) * 1000).toLocaleDateString('fr-FR') + '</td></tr>').join('') || '<tr><td colspan="3">Aucun vote enregistré.</td></tr>';
}

function exportCsv() {
  var rows = [['Email','Candidat','Date']];
  votes.forEach(function(vote) {
    rows.push([vote.voterEmail, candidates.find(function(c) { return c.id === vote.candidateId; })?.name || '', new Date((vote.timestamp?.seconds || Date.now()/1000) * 1000).toISOString()]);
  });
  var csv = rows.map(function(row) { return row.map(function(cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(','); }).join('\n');
  var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  var link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'small-boost-votes.csv';
  link.click();
  URL.revokeObjectURL(link.href);
}

function submitCandidate(event) {
  event.preventDefault();
  var error = $('#candidateError');
  error.textContent = '';
  var name = $('#candidateName').value.trim();
  var shortDescription = $('#candidateShort').value.trim();
  var fullProject = $('#candidateFull').value.trim();
  var photoInput = $('#candidatePhoto');
  if (!name || !shortDescription || !fullProject) { error.textContent = 'Tous les champs sont obligatoires.'; return; }
  var initials = name.split(' ').map(function(part) { return part[0]; }).join('').slice(0, 2).toUpperCase();
  var photoUrl = '';
  if (photoInput.files && photoInput.files[0]) photoUrl = URL.createObjectURL(photoInput.files[0]);
  var newCandidate = { id: name.toLowerCase().replace(/\s+/g, '-'), name: name, initials: initials, shortDescription: shortDescription, fullProject: fullProject, photoUrl: photoUrl, votesCount: 0 };
  candidates.push(newCandidate);
  saveData();
  renderCandidates();
  closeModal('candidateModal');
  $('#candidateForm').reset();
  showToast('Candidat ajouté avec succès.');
  if ($('#dashboard').classList.contains('open')) updateDashboard();
}

document.querySelectorAll('[data-close]').forEach(function(button) { button.addEventListener('click', function() { closeModal(button.getAttribute('data-close')); }); });
document.querySelectorAll('.modal-backdrop').forEach(function(backdrop) { backdrop.addEventListener('click', function(event) { if (event.target === backdrop) backdrop.classList.remove('open'); }); });
$('#voteForm').addEventListener('submit', submitVote);
$('#adminForm').addEventListener('submit', adminLogin);
$('#exportCsv').addEventListener('click', exportCsv);
$('#closeDashboard').addEventListener('click', function() { $('#dashboard').classList.remove('open'); });
$('#addCandidate').addEventListener('click', function() { $('#candidateError').textContent = ''; openModal('candidateModal'); });
$('#candidateForm').addEventListener('submit', submitCandidate);
document.querySelectorAll('a[href="#admin"]').forEach(function(link) { link.addEventListener('click', function(event) { event.preventDefault(); openModal('adminModal'); }); });

loadData();
