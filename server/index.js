const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3007;

const docsDir = path.resolve(__dirname, '../docs');
app.use(express.static(docsDir));

app.get('/playlist/maker', (req, res) => {
  res.sendFile(path.join(docsDir, 'editor.html'));
});

app.get('/', (_req, res) => {
  res.redirect('/playlist/maker');
});

app.use((req, res) => {
  res.status(404).send('Not Found');
});

app.listen(PORT, () => {
  console.log('Server listening on http://127.0.0.1:' + PORT + '/playlist/maker');
});

