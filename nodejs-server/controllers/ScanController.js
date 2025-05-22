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
    const imageUrl = req.file?.gcsUrl
   if (!imageUrl) {
    return res.status(400).json({
      success: false,
      message: "No image file was uploaded.",
      error: { message: "IMAGE_REQUIRED" }
    });
  }

try 
   {
    const result = await DetectionService.analyzeImageFromPath(imageUrl);

    
    if (result.success) {
    console.log("[+] scan successful, saving to DB.....")
    let scanId = '';
   
    
    try {
      scanId = await DBService.saveScan(userId, result,imageUrl);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: '[-] Failed to save scan, 502' });
    }
    if (result.plantHealth == 'healthy'){
      return res.status(200).json({
        success: true,
        message: "Plant is healthy",
        data: {
          message: `your ${result.plantName} leaf is healthy. you can still benefit from GreenyLeaves by getting general plant care tips and recommendations!`,
          scanId,
          plantHealth: result.plantHealth,
          plantName:     result.plantName,
          confidence:    result.confidence,
          imageUrl
        }
      })
    }
    console.log("[+] scan saved to DB successfully")
    
    return res
      .status(200)
      .json({
        message: "Successfully identified plant condition and saved to DB",
        data: {
          message: "your plant is diseased, Below is an estimate of the disease severity and recommended remediation steps",
          scanId,
          plantName:     result.plantName,
          disease:       result.disease,
          confidence:    result.confidence,
          plantHealth:   result.plantHealth,
          remediations:  result.remediations,
          imageUrl
        }
      })
    } // if success
  } catch (err) {
    if (err.status === 400) {
      return res
        .status(err.status)
        .json({
          success: false,
          message: err.message,
          error: err.data
        });
    } else {
      console.error(err);
      return res
        .status(500)
        .json({ message: 'Internal server error' });
    }
  }
};
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

  const { disease, imageUrl, confidence ,remediations, plantName, plantHealth} = req.body;

   
    console.log("scans userId", userId)
    if (!disease || imageUrl || !confidence ) {
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
      imageUrl,
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

