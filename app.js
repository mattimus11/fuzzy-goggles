const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session');
require('dotenv').config();

app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Session setup
app.use(
  session({
    secret: 'your_secret_key', // Replace with a secure key
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }, // Session expires after 1 minute
  })
);

// MongoDB connection
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
let usersCollection;

(async () => {
  try {
    await client.connect();
    const db = client.db('movies'); // Replace 'movies' with your database name
    usersCollection = db.collection('users'); // Replace 'users' with your collection name
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
})();

// Middleware to protect routes
function requireLogin(req, res, next) {
  if (req.session && req.session.isLoggedIn) {
    next(); // User is logged in, proceed to the route
  } else {
    res.redirect('/login'); // Redirect to login page
  }
}

// Routes
app.get('/', requireLogin, (req, res) => {
  res.render('index', { username: req.session.username }); // Pass username to the view
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user in MongoDB
    const user = await usersCollection.findOne({ username });

    if (user && user.password === password) {
      // Save login state in the session
      req.session.isLoggedIn = true;
      req.session.username = username;
      res.redirect('/');
    } else {
      res.send('<h1>Invalid username or password. Please try again.</h1>');
    }
  } catch (err) {
    console.error('Error querying database', err);
    res.status(500).send('<h1>Internal server error</h1>');
  }
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login'); // Redirect to login after logout
  });
});

// Start app
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
