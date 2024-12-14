const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session');
const argon2 = require('argon2');
require('dotenv').config();
app.use(express.static('public'));

app.set('view engine', 'ejs');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));

// Session setup
app.use(
  session({
    secret: process.env.SECRET_SESSION, // Replace with a secure key
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 }, // Session expires after 1 minute
  })
);

// MongoDB connection
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
let usersCollection, moviesCollection;

(async () => {
  try {
    await client.connect();
    const db = client.db('movie_ratings'); // Database for movies and users
    usersCollection = db.collection('users');
    moviesCollection = db.collection('movies');
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    process.exit(1);
  }
})();

// Middleware to check if the user is logged in
function requireLogin(req, res, next) {
  if (req.session && req.session.isLoggedIn) {
    next();
  } else {
    res.redirect('/login');
  }
}

// Route to show the user's movie list
app.get('/movies', requireLogin, async (req, res) => {
  const username = req.session.username;
  try {
    // Fetch movies rated by the user
    const userMovies = await moviesCollection.findOne({ username });

    if (userMovies) {
      res.render('movies', { username: username, movies: userMovies.movies });
    } else {
      res.render('movies', { username: username, movies: [] });
    }
  } catch (err) {
    console.error('Error fetching user movies', err);
    res.status(500).send('<h1>Internal server error</h1>');
  }
});

// Route to add a movie with a rating
app.post('/add-movie', requireLogin, async (req, res) => {
  const username = req.session.username;
  const { title, rating } = req.body;

  try {
    // Check if the movie is already added for the user
    const userMovies = await moviesCollection.findOne({ username });

    if (userMovies) {
      // Add the new movie if it doesn't already exist in the list
      await moviesCollection.updateOne(
        { username },
        { $push: { movies: { title, rating: parseInt(rating) } } }
      );
    } else {
      // Create a new movie entry for the user
      await moviesCollection.insertOne({
        username,
        movies: [{ title, rating: parseInt(rating) }]
      });
    }

    res.redirect('/movies'); // Redirect to the movie list
  } catch (err) {
    console.error('Error adding movie', err);
    res.status(500).send('<h1>Internal server error</h1>');
  }
});

// Login Route
app.get('/', (req, res) => {
  res.render('login');
});

app.get('/login', (req, res) => {
  res.render('login');
});

// Login Post
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user in the database
    const user = await usersCollection.findOne({ username });

    if (user && await argon2.verify(user.password, password)) {
      req.session.isLoggedIn = true;
      req.session.username = username;
      res.redirect('/movies');
    } else {
      res.send('<h1>Invalid username or password.</h1>');
    }
  } catch (err) {
    console.error('Error querying database', err);
    res.status(500).send('<h1>Internal server error</h1>');
  }
});

// Logout Route
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Register Route
app.get('/register', (req, res) => {
  res.render('register');
});

// Register Post
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await argon2.hash(password);

    const userExists = await usersCollection.findOne({ username });

    if (userExists) {
      return res.json({ success: false, message: 'User already exists' });
    }

    await usersCollection.insertOne({
      username,
      password: hashedPassword
    });

    // Send a success message and redirect to login
    res.json({ success: true, message: 'Registration successful! You can now log in.' });
  } catch (err) {
    console.error('Error registering user', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Start server
const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", ()=>{
  console.log(`Server listening to port ${PORT}`);
});
