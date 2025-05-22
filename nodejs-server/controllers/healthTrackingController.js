const DBService = require('../services/DB_service');
exports.getAllTrackedPlants = async (req, res) => {
    const userId = req.params.userId;
    if (userId != req.user.userId) {     
      res.status(403).json({
        success:false,
        message:"UnAuthorized access to tracked plants, Missing userId"
    })}
  
    try {
      const trackedPlants = await DBService.getAllTrackedPlants(userId);
      return res.status(200).json({
        success: true,
        message: "Successfully retrieved tracked plants",
        data: trackedPlants
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "SERVER_ERROR",
        error: {
          message: error.message
        }
      });
    }
  } 
  
  exports.getTrackedPlant = async (req, res) => {
  const userId = req.params.userId;
  const trackedPlantId = req.params.trackedPlantId;
  if (userId != req.user.userId){
    return res.status(401).json({
      success: false,
      message: "Unauthorized access to tracking"
    })
  }
  if (!trackedPlantId) {
    return res.status(400).json({
      success: false,
      message: "Missing tracked plant id"
    })
  }
  
  try {
    const trackedPlant = await DBService.getTrackedPlant(userId, trackedPlantId);
    if (!trackedPlant) {
      return res.status(404).json({
        success: false,
        message: "Tracked plant not found"
      })
    }
    return res.status(200).json({
      success: true,
      message: "Successfully retrieved tracked plant",
      data: trackedPlant
    })
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "SERVER_ERROR",
      error: {
        message: error.message
      }
    })
  }
  
  }
exports.trackPlant = async (req, res) => {
    const userId = req.params.userId
    const scanId = req.body.scanId 
    // Authorization check  
    if (userId != req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to tracking"
      });
    }
  
    // Input validation
    if (!scanId || typeof scanId !== 'string' || scanId.includes('{{')) {
      return res.status(400).json({
        success: false,
        message: "Missing or invalid scan id",
        error: {
          message: "Scan id is required and must be valid"
        }
      });
    }
  
    try {
      // check scanid exists first
      const scan = await DBService.getScanEntity(userId,scanId);
      if (!scan) {
        return res.status(404).json({
          success: false,
          message: "Scan not found",
          error: {
            message: "Scan not found"
          }
        });
      }
        const trackedPlant = await DBService.trackPlantSpecies(userId,scan)
  
        if (trackedPlant.isTracked){
          return res.status(409).json({
            success: false,
            message: "your plant is already being tracked",
            error: {
              message: "Plant is already being tracked"
            } 
          })
        }
      
      return res.status(201).json({
        success: true,
        message: "Successfully added plant species for tracking!",
        data: trackedPlant
      })
    }
  
    catch (error) {
      return res.status(500).json({
        success: false,
        message: "SERVER_ERROR",
        error: {
            message: error.message
          }
        });
      }
  }
  
  exports.deleteTrackedPlant = async (req, res) => {
    const userId = req.params.userId;
    const trackedPlantId = req.params.trackedPlantId;

    if (userId!= req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to tracking"
      });
    }

    if (!trackedPlantId) {
      return res.status(400).json({
        success: false,
        message: "Missing tracked plant id"
      });
    }

    try {
    
      await DBService.deleteTrackedPlant(userId, trackedPlantId);
      return res.status(200).json({
        success: true,
        message: "Successfully deleted tracked plant"
      })
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "SERVER_ERROR",
        error: {
          message: error.message
        }
      })
    }
  }