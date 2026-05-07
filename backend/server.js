require("dotenv").config();

const app = require("./src/app");
const { initializeDatabase } = require("./src/data/database");

const PORT = process.env.PORT || 3001;

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to initialize database", err);
    process.exit(1);
  });