// Define o tema antes de a página aparecer (evita o "piscar"). Escolha salva > preferência do sistema.
(function () {
  var t = null;
  try { t = localStorage.getItem('macrinhos:theme'); } catch (e) { /* ok */ }
  if (t !== 'light' && t !== 'dark') t = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  document.documentElement.dataset.theme = t;
})();
