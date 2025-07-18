// Insert a test div to confirm the component loads
document.addEventListener('DOMContentLoaded', () => {
  const div = document.createElement('div');
  div.textContent = 'Hello World from Gram Frame!';
  div.style = 'margin: 2em; padding: 1em; background: #eef;';
  document.body.appendChild(div);
});
