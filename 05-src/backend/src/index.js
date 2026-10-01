// Local dev entry point only — `npm run dev` / `npm start`. Vercel never runs this file; it
// uses api/index.js instead, which imports the same app from ./app.js.
import app from './app.js';

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Erick Janganya Foundation API listening on http://localhost:${PORT}`);
});
