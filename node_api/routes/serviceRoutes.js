const authController = require("../controllers/authController");
const ScanController = require("../controllers/ScanController");
const profileController = require("../controllers/profileController");
// const upload2 = require("../middlewares/upload2"); //upload middleware
// const profileUpload = require("../middlewares/profileUpload");
const GCSUploads = require("../middlewares/GCSUploads");
const auth = require("../middlewares/auth").auth

const registerAuthenticatedRoutes = (router) => { 

  router.get("/api/v1/verify-email", authController.verifyEmail);


  // Auth routes
  router.post("/api/v1/register", authController.register);
  router.post("/api/v1/login", authController.login);


  
  router.post("/api/v1/forgot-password", authController.getResetPasswordToken);
  router.post("/api/v1/reset-password", authController.resetPassword);
  


    // user profile
  router.patch("/api/v1/users/:userId/profile",auth, GCSUploads("profilePhoto", "profiles"), profileController.updateProfile);

  router.get("/api/v1/users/:userId/profile", auth, profileController.getProfile);
  router.post("/api/v1/users/:userId/logout", authController.logout); 
   
  // scans
  router.post("/api/v1/users/:userId/scans",auth, GCSUploads("plantImage", "plants"), ScanController.sendForDetection);   

  router.get("/api/v1/users/:userId/scans/:scanId/remediations",auth, ScanController.getRemediation);  
  

    // histories/scans
  // router.post("/api/v1/users/:userId/histories",auth, ScanController.saveToScans);
  router.get("/api/v1/users/:userId/histories",auth, ScanController.getAllScans);
  router.get("/api/v1/users/:userId/histories/:scanId",auth, ScanController.getScanEntity);


    // DASHBOARD 
  router.get("/api/v1/users/:userId/dashboard", auth,profileController.getDashboard);  

// /users/plants for health tracking
  router.post("/api/v1/users/:userId/plants/health-tracking", auth, ScanController.trackPlant);
  router.get("/api/v1/users/:userId/plants/health-tracking", auth, ScanController.getAllTrackedPlants);
  router.get("/api/v1/users/:userId/plants/health-tracking/:trackedPlantId", auth, ScanController.getTrackedPlant);



}

module.exports = registerAuthenticatedRoutes;
