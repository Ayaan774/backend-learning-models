//wrapper
//higher order function -> function which takes function as a argument and returns a function

//method -1
const asyncHandler = (requestHandler)=>{
  return (req, res, next) =>{
    Promise.resolve(requestHandler(req,res,next)).catch((err)=> next(err))
  }
}
export { asyncHandler };

//method -2

/* const aysncHandler = (func) => async (req, res, next) =>{
   try {
    
   } catch (error) {
      res.status(err.code || 500).json({
        success: false,
        message: err.message,
      })
   }
} */


