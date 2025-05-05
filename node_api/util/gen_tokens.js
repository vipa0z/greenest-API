const jwt = require('jsonwebtoken')
function generateJWT(user) {

    const payload = { 
      userId: user.userId,
       email: user.email,
       firstName: user.firstName,
       lastName: user.lastName,
       photoPath: user.photoPath? user.photoPath : null
      };
    const secret = process.env.JWT_SECRET
    const options = { expiresIn: '24h' };
  
    return jwt.sign(payload, secret, options);  // returns a string
  }

  module.exports = {generateJWT}