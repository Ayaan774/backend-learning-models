import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async(userId) => {
  try {
       const user = await User.findById(userId)
       const accessToken = await user.generateAccessToken()
       const refreshToken = await user.generateRefreshToken()
      //upload refresh token to db
       user.refreshToken = refreshToken
       await user.save({validateBeforeSave: false})

       return {accessToken, refreshToken}
  } catch (error) {
      throw new ApiError(500, "Something went wrong while generation refresh and access token")
  }
}

const registerUser = asyncHandler( async(req,res)=>{
  // 1. get user details from front end
  const {fullName, email, username,password} = req.body;
  // console.log("requestBody: ",req.body);
  // 2. validation
  /*if(fullName === ""){
      throw new ApiError(400, "full name is required")
  }*/
  if(
      [fullName, email, username, password].some((field) => field?.trim() === "")
  ){
      throw new ApiError(400, "All fields are required")
  }
  // 3. check if user already exists : check username,email
  const existedUser = await User.findOne({
    $or: [{ username }, { email }]
  })

  if(existedUser){
      throw new ApiError(409,"User wih email or username already exists" )
  }

  // 4. check for images, check for avatar
  // console.log(req.files);
  const avatarLocalPath = req.files?.avatar[0]?.path
 

  // const coverImageLocalPath = req.files?.coverImage[0]?.path;
  let coverImageLocalPath;

  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0){
    coverImageLocalPath = req.files.coverImage[0].path
  }


  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar file is required")
  }


  // 5. upload images/avatar on cloudinary
  const avatar = await uploadOnCloudinary(avatarLocalPath)

  const coverImage = await uploadOnCloudinary(coverImageLocalPath)

  
  if(!avatar){
    throw new ApiError(400, "Avatar file is required");
  }

  // 6. create user object - create entry in DB
  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase(),
  })

    
  // 7. remove pasword and refersh token field from response
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  )

  // 8. check for user creation 
  if(!createdUser){
      throw new ApiError(500, "Something went wrong while registering user")
  }
  // 9. return response
  return res.status(201).json(
    new ApiResponse(200, createdUser, "User Registered Successfully")
  )
})

const loginUser = asyncHandler(
  async(req,res) => {
    // 1. fetch user details
    const {email, username, password} = req.body
    // 2. username or email
    if(!username && !email){
      throw new ApiError(400,"Username or Email is required")
    }
     // 3. find user
    const user = await User.findOne({
      $or: [{username},{email}]
    })

    if(!user){
      throw new ApiError(404, "User does not exist")
    }

  // 4. password check
  const isPasswordValid = await user.isPasswordCorrect(password)

  if(!isPasswordValid){
    throw new ApiError(401, "Password is incorrect")
  }
  // 5. generate access and refresh token 
  const {accessToken, refreshToken} = await generateAccessAndRefreshTokens(user._id)

   
    // 6. send cookies
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  const options = {
    httpOnly: true,
    secure: true
  }

  return res.status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
      new ApiResponse(
        200,
        {
            user: loggedInUser,accessToken,refreshToken
        },
        "User Logged in Successfully"
      )
  )


  }
)

const logoutUser = asyncHandler(async(req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }
        },
        {
            new: true
        }
    )
    const options = {
      httpOnly: true,
      secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))

})

const refreshAccessToken = asyncHandler( async(req,res) => {
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized request")
    }

 try {
     const decodedToken = jwt.verify(
       incomingRefreshToken,
       process.env.REFRESH_TOKEN_SECRET
     )
 
     const user = await User.findById(decodedToken?._id)
 
     if(!user){
       throw new ApiError(401, "Invalid Refresh Token")
     }
 
     if(incomingRefreshToken !== user?.refreshToken){
       throw new ApiError(401, "Refresh Token is expired or used")
     }
 
     const options = {
       httpOnly: true,
       secure: true,
     }
 
     const{genratedAccessToken, generatedRefreshToken} = await generateAccessAndRefreshTokens(user._id)
 
     return res.status(200)
     .cookie("accessToken", genratedAccessToken, options)
     .cookie("refreshToken", generatedRefreshToken, options)
     .json(
       new ApiResponse(
         200,
         {
           accessToken: generateAccessToken,
           refreshToken: generatedRefreshToken,
         },
         "Access Token Refreshed !!!"
       )
     )
 } catch (error) {
      throw new ApiError(401, error?.message || "Invalid refresh token")
 }

}) 

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
};