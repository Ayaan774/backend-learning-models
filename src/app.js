import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
//middleware is used using app.use()
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,

}))

app.use(express.json({
  limit: "40kb",
}));

app.use(express.urlencoded({extended: true, limit: "40kb"})); //encode url data

app.use(express.static("public")); //used for assests

app.use(cookieParser())

export { app };

