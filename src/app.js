import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

//middlewares
//middleware is used using app.use()
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,

}))

app.use(express.json({
  limit: "100kb",
}));

app.use(express.urlencoded({extended: true, limit: "100kb"})); //encode url data

app.use(express.static("public")); //used for assests

app.use(cookieParser())



//routes import

import userRouter from "./routes/user.routes.js";


//routes declaration

app.use("/api/v1/users", userRouter);
// Above code will go like:  http://localhost:8000/api/v1/users/<any field eg: register,login,etc>




export { app };

