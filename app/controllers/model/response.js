module.exports={
  SuccessModel:(data)=>{
    return {
      error:0,
      data:data
    }
  },
  ErrorModel: (message) => {
    return {
      error: -1,
      message: message
    }
  }
}