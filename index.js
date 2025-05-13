const express = require("express");
require("./src/dbconfig/config");
const cors = require("cors");
const path = require("path");

const userRoutes = require("./src/routes/user_routes");
const storyRoutes = require("./src/routes/generate_story_routes");
const emailRoutes = require("./src/routes/email_routes");

const app = express();
const PORT = 5005;

app.use(express.json());
app.use(cors());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use("/user", userRoutes);
app.use("/story", storyRoutes);
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use("/api/contactus", emailRoutes)

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
