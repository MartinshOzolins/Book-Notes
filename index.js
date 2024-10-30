import express from "express";
import axios from "axios";
import { db } from "./config.js";

const API_URL_BOOK_INFO = "https://openlibrary.org/search.json?language=eng&title=";

const API_URL_COVER_URL = "https://covers.openlibrary.org/b/OLID/";


const app = express();
const port = 3000;


db.connect();


app.use(express.urlencoded({extended: true})); // Middleware to parse URL-encoded data from incoming requests into a JavaScript object (key-value pairs).
app.use(express.static("public")); // Middleware to serve static files, such as CSS stylesheets, from the "public" directory.




async function getAllNotes() {
    const result = await db.query(
        "SELECT book_info.id, book_info.book_title, book_info.author, book_info.year, book_info.genre, covers.cover_url, book_notes.note, book_notes.rating FROM book_info JOIN book_notes on book_info.id = book_notes.book_id JOIN covers on book_info.id = covers.book_id"
    );
    const notes = result.rows;
    return notes

}

app.get("/", async (req,res) => {
    try {
        const notes = await getAllNotes()
        res.render("index.ejs", {
        notes: notes
    })
    } catch (error) {
        console.log("Error name:", error.name);
        console.log("Error message:", error.message);
        console.log("Stack trace:", error.stack);
    }
    
})


app.get("/add" , async (req, res) => {
    try {
        res.render("index.ejs", {
            view: "add",
        })
    } catch (error) {
        console.log("Error name:", error.name);
        console.log("Error message:", error.message);
        console.log("Stack trace:", error.stack);
    }

})

app.post("/add-book", async (req, res) => {
    
    try {
        const title = req.body.title;
        const author = req.body.author;
        const year = req.body.year;
        let genre = req.body.genre.toLowerCase();
        genre = genre[0].toUpperCase() + genre.slice(1)
        const rating = req.body.rating;
        const note = req.body.notes;
        

        const result = await db.query("INSERT INTO book_info (book_title, author, year, genre) VALUES ($1, $2, $3, $4) RETURNING id" , [
            title, author, year, genre
        ]);

        const bookId = result.rows[0].id

        await db.query("INSERT INTO book_notes (book_id, note, rating) VALUES ($1, $2, $3)", [
            bookId, note, rating
        ]);

        //Fetch data from book API
        const bookData = await axios.get(API_URL_BOOK_INFO + title.toLowerCase())
    
        const docs = bookData.data.docs;

        // Check if docs is an array and has entries
        if (Array.isArray(docs) && docs.length > 0) {
            //Creates a new array containing the isbn from each object
            const coverIdArray = docs.map((doc) => doc.cover_edition_key)
            const coverId = coverIdArray[0];
            const coverUrl = API_URL_COVER_URL + coverId+ "-S.jpg";

            await db.query("INSERT INTO covers (book_id, cover_id, cover_url) VALUES ($1, $2, $3)", 
            [
                bookId, coverId, coverUrl 
            ]);
        } else {
            console.log("No cover_id found");
        }
    } catch (error) {
        console.log("Error name:", error.name);
        console.log("Error message:", error.message);
        console.log("Stack trace:", error.stack);
    }
    

    res.redirect("/");
    
});

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

