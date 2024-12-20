const express = require("express");
const PORT = 3500;
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, Collection } = require('mongodb');
const uri = `mongodb+srv://Matthew:${process.env.MONGO_PWD}@cluster0.vza6k.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
app.use(express.static(__dirname + "/public"));
app.set('view engine', 'ejs');



// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);



app.get(["/","/index"], async (req,res) =>{
  const collection = client.db('movies').collection('ratings');
  const movies = await collection.find().sort({ rating: -1}).toArray();
  res.render("index", {movies:movies});
})

app.get("/about", async (req,res) =>{
    res.render("about");
})

// app.get("/index", async (req,res) =>{
//   const collection = client.db('movies').collection('ratings');
//   const movies = await collection.find().sort()
//   res.redirect("index", {movies:movies});
// })


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });