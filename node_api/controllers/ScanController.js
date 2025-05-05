const DBService = require("../services/DB_service");
const DetectionService = require("../services/detection_service");
const RemediationService = require("../services/remediation_service")


// SCANS ===================================================================================
exports.sendForDetection = async (req, res) => {
  const userId = req.params.userId
  if (userId != req.user.userId) {     
      res.status(403).json({
      success:false,
      message:"UnAuthorized access to scans, Missing userId"
  })}
  const imageUrl = req.file?.gcsUrl;
   if (!imageUrl) {
    return res.status(400).json({
      success: false,
      message: "No image file was uploaded.",
      error: { message: "IMAGE_REQUIRED" }
    });
  }
  try {
    const analysisResults = await DetectionService.analyzeImageFromPath(imageUrl);
    // analysisResults.imageMetadata = imageMetadata
    if (analysisResults.isServerAvailable){
    const {scanId, plantName, disease, confidence, plantHealth, remediations} = analysisResults
    if (plantHealth === 'healthy') {
      return res.status(200).json({
        message: "Plant is healthy and will not be saved to DB",
        data:{
          plantName,
          plantHealth,
          imageMetadata:{imageUrl}   
            }
          })
    } 

    const scanSaved = await DBService.saveScan(userId,analysisResults)
    if (scanSaved){
    return res.status(200).json({
      message: "Successfully Indetified plant condition, and saved to DB",
      data:{
        scanId,
        plantName,
        disease,
        confidence,
        plantHealth,
        remediations,
        imageMetadata:{imageUrl}   
          }
        })
     }
  } } catch (err) {

    return res.status(500).json({
      success: false,
      message: "Flask server unavailable",
      error: {
        message: "SERVER_ERROR, AI service unavailable",
        details: err.flaskData || null
      }
    })
  }
}

// HISTORY/ ===================================================================================

// SCANS
exports.getAllScans = async (req, res) => {
  console.log("get all scans hit")

  const userId = req.params.userId
    if (userId != req.user.userId) {     
        res.status(403).json({
        success:false,
        message:"UnAuthorized access to profile, Missing userId"
    })}

  try {
    const scans = await DBService.getAllScans(userId)

     

    res.status(200).json({
      success: true,
      data: scans || [],
    })

  } catch (err) {
    res.status(500).json({
      success:false,
      message: "server_error",
      error: {
        details: err,
        message:"SERVER_ERROR"
      }
    })

  }
}


exports.getScanEntity = async (req, res) => {
  const { userId, scanId } = req.params;

  if (userId != req.user.userId) {     
    res.status(403).json({
      success:false,
      message:"UnAuthorized access to profile, Missing userId"
  })}

  if (!scanId) {
    return res.status(400).json({
      success: false,
      message: "missing scan id",
      error: {
        message: "Scan Id is required"
      }
    });
  }

  try {
    const scanEntity = await DBService.getScanEntity(userId, scanId);

    if (!scanEntity) {
      return res.status(404).json({
        success: false,
        message: " the requested species could not be found, 404, Scan entry not found"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Scan entry retrieved successfully",
      data: scanEntity
    });

  } catch (error) {
    console.error('Error fetching Scan entry:', error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch Scan entry",
      error: error.message
    });
  }
};
// save to history

exports.saveToScans = async (req, res) => {
 
  const userId = req.params.userId
    if (userId != req.user.userId) {     
        res.status(403).json({
        success:false,
        message:"UnAuthorized access to profile, Missing userId"
    })}

  const { disease, imageMetadata, confidence ,remediations, plantName, plantHealth} = req.body;

   
    console.log("scans userId", userId)
    if (!disease || !imageMetadata || !confidence ) {
      return res.status(400).json({
        success: false,
        message: "Invalid scan details, missing disease or image metadata",
        error: {
          message: "Disease and image metadata are required"
        }
      });
    }
    // object to be saved
    const scanInfo = {
      plantName,
      plantHealth,
      disease,
      confidence,
      imageMetadata,
      remediations: remediations || null
    }

    try {
      const savedEntry = await DBService.saveScanEntry(userId,scanInfo);
      if (savedEntry) {
        return res.status(201).json({
      success: true,
      message: "Scan results saved to DB",
      data: {message: "succesfully saved Scan to history"}
    });
  }

  } catch (error) {
    console.error('Save to Scan error:', error);
    return res.status(500).json({
      success: false,
      error: {
        message: "SERVER_ERROR"
      }
    });
  }
};
//============================== REMEDIATION===============================

exports.getRemediation = async (req, res) => {
  const scanId = req.params.scanId;
  const userId = req.params.userId
  if (userId != req.user.userId) {     
      res.status(403).json({
        success:false,
        message:"UnAuthorized access to remediation service, Missing userId"
    })
  }
  if (!scanId) {
    return res.status(400).json({
      success: false,
      message: "Scan id is required",
      error: {
        message: "Scan id is required"
      }
    });
  }

  try {
    const chat_response = await RemediationService.getRemediation(userId,scanId);

    return res.status(200).json({
      success: true,
      message: "Succesfully retrieved remediation steps",
      data: {
        remediations: chat_response
      }
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
// ************************88888888 TRACKING *******************************
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
      console.log(scan.imageMetadata)
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
    