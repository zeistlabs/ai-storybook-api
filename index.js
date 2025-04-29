const express = require("express");
require("./src/dbconfig/config");
const cors = require("cors");

const userRoutes = require("./src/routes/user_routes");
const storyRoutes = require("./src/routes/generate_story_routes");

const app = express();
const PORT = 5005;

app.use(express.json());
app.use(cors());

app.use("/user", userRoutes);
app.use("/story", storyRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
