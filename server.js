const express = require("express");
const app = express();
const HTTP_PORT = process.env.PORT || 8080;

app.use(express.urlencoded({ extended: true }));
app.use(express.static("assets"));

const exphbs = require("express-handlebars");
app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
    helpers: {
      json: (context) => {
        return JSON.stringify(context);
      },
    },
  })
);
app.set("view engine", ".hbs");
const session = require("express-session");
app.use(
  session({
    secret: "this is how you create hash passwords 1234567890", // random string
    resave: false,
    saveUninitialized: true,
  })
);

/// --------------
// DATABASE : Connecting to database and setting up your schemas/models (tables)
/// --------------

const mongoose = require("mongoose");

// The mongodb connection string is in the MongoAtlas web interface
mongoose.connect(
  "mongodb+srv://prashansapassi:uzZR4RWroCWj0Ce6@cluster0.ncpp6zt.mongodb.net/?retryWrites=true&w=majority"
);

// TODO: Define schemas
const Schema = mongoose.Schema;

//defining the schema for the user collection
//database for users
const BooksSchema = new Schema({
  author: String,
  title: String,
  borrowedBy: { type: String, default: "" },
  img: String,
  desc: String,
});

//database for Gym Classes
const UsersSchema = new Schema({
  libraryCardNumber: String,
});

// Defining the models
const Books = mongoose.model("Books_collection", BooksSchema);
const Users = mongoose.model("bookUsers_collection", UsersSchema);

//endpoint for the homepage
app.get("/", async (req, res) => {
  const bookList = await Books.find().lean();
  res.render("partials/homePage", { layout: "primary", books: bookList });
});

//endpoint for the profile page where books are added by users
app.get("/profile", async (req, res) => {
  const hasLoggedInUser = req.session.hasLoggedInUser; 
  console.log(hasLoggedInUser);
  try {
    //check if user is logged in or not
    if (hasLoggedInUser === undefined) {
      UserNotLogged = true;
      res.render("partials/errorPage", { layout: "primary", UserNotLogged });
      return;
    }
    const userId = req.session.libraryCard;
    console.log(userId);
    const borrowedBooks = await Books.find({ borrowedBy: userId }).lean();
    console.log(borrowedBooks);
    res.render("partials/profilePage", {
      layout: "primary",
      books: borrowedBooks,
    });
  } catch (err) {
    console.log(err);
    res.send("An error occurred to add classes.");
  }
});

//Endpoint for returning the book button
app.get("/returnBook/:bookId", async (req, res) => {
  const bookId = req.params.bookId;
  console.log(bookId);
  const book = await Books.findById(bookId);

  book.borrowedBy = "";
  await book.save();
  res.redirect("/profile");
});

//endpoints for logging in
app.get("/login", (req, res) => {
  res.render("partials/loginPage", { layout: "primary" });
});

app.post("/login", async (req, res) => {
  const cardNumFromBody = req.body.libraryCard;
  try {
    const userFromDB = await Users.findOne({
      libraryCardNumber: cardNumFromBody,
    });

    if (cardNumFromBody === "0000" || cardNumFromBody === "1234") {
      req.session.hasLoggedInUser = true;
      req.session.libraryCard = userFromDB.libraryCardNumber;
      res.redirect("/");
      return;
    } else {
      res.render("partials/errorPage", {
        layout: "primary",
        invalidNumber: cardNumFromBody,
      });
    }
  } catch (err) {
    console.log(err);
  }
});

//endpoint for the borrowing a book button
app.post("/borrow/:id", async (req, res) => {
  const bookId = req.params.id;
  console.log(bookId);
  const hasLoggedInUser = req.session.hasLoggedInUser;
  console.log(hasLoggedInUser);
  try {
    //check if user is logged in or not
    if (hasLoggedInUser === undefined) {
      UserNotLogged = true;
      res.render("partials/errorPage", { layout: "primary", UserNotLogged });
      return;
    }
    const bookList = await Books.find().lean();
    const userFromDB = await Users.findOne({
      libraryCardNumber: req.session.libraryCard,
    });
    console.log(userFromDB);
    const bookFromDB = await Books.findOne({ _id: bookId });
    if (userFromDB) {
      bookFromDB.borrowedBy = userFromDB.libraryCardNumber;
    } else {
      res.send("no login id found");
      return;
    }

    await bookFromDB.save();
    res.render("partials/homePage", {
      layout: "primary",
      borrowed: bookFromDB,
      books: bookList,
    });
  } catch (err) {
    console.log(err);
    res.send("An error occurred to add classes.");
  }
});

//endpoint for logging out of the session
app.post("/logout", async (req, res) => {
  const bookList = await Books.find().lean();
  try {
    if (req.session.hasLoggedInUser === true) {
      console.log(`[DEBUG] LOGOUT requested...`);
      req.session.destroy();

      console.log(`Session destroyed...`);
      console.log(req.session);
      res.redirect("/");
    } else {
      res.render("partials/homePage", {
        layout: "primary",
        books: bookList,
      });
    }
  } catch (err) {
    console.log(err);
  }
});

// ----------------
const onHttpStart = () => {
  console.log(`Express web server running on port: ${HTTP_PORT}`);
  console.log(`Press CTRL+C to exit`);
};
app.listen(HTTP_PORT, onHttpStart);
