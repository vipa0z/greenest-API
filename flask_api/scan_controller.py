import logging
import requests
import os
import tempfile
from PIL import Image, UnidentifiedImageError
from io import BytesIO
import numpy as np
import torch
import torchvision.transforms as transforms
from models.model import SUPPORTED_TYPES, predict as predict_disease

logger = logging.getLogger(__name__)

class ScanController:
    def __init__(self):
        from models.model import ObjectDetectionModel
        logger.info("Initializing ScanController...")
        self.leaf_detection_model = ObjectDetectionModel()
        logger.info("ScanController initialized successfully")
        
    def download_image_from_url(self, image_url):
        try:
            response = requests.get(image_url, stream=True, timeout=10)
            response.raise_for_status()
            
            # Create a temporary file with .jpg extension
            temp_file = tempfile.NamedTemporaryFile(suffix='.jpg', delete=False)
            temp_file_path = temp_file.name
            
            # Write image data to temporary file
            with open(temp_file_path, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
                    
            logger.info(f"Image downloaded and saved to temporary file: {temp_file_path}")
            return temp_file_path
        except Exception as e:
            logger.error(f"Error downloading image from URL: {e}")
            raise
    
    def detect_leaf(self, image_url):
        """
        Detect if the image contains a leaf using the object detection model.
        
        Args:
            image_url: URL of the image to analyze
            
        Returns:
            tuple: (is_leaf_detected, plant_type, image_path)
        """
        try:
            # Download the image to a temporary file
            image_path = self.download_image_from_url(image_url)
            
            # Perform leaf detection using YOLO model
            results = self.leaf_detection_model.predict(image_path)
            
            # Check if any objects were detected (leaf)
            if len(results[0].boxes) > 0:
                # Extract the class name from the first detected object
                class_idx = int(results[0].boxes.cls[0].item())
                plant_type = results[0].names[class_idx]
                
                logger.info(f"Leaf detected in image: {plant_type} with {len(results[0].boxes)} detections")
                return True, plant_type, image_path
            else:
                logger.info("No leaf detected in image")
                # Clean up the temporary file if no leaf detected
                try:
                    os.unlink(image_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temporary file {image_path}: {e}")
                return False, None, None
        except Exception as e:
            logger.error(f"Error during leaf detection: {e}")
            raise
    
    def is_supported_leaf(self, plant_type):
        """Check if the detected plant is in the list of supported plants."""
        if plant_type in SUPPORTED_TYPES:
            print(" supported type$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$", plant_type)
        return plant_type in SUPPORTED_TYPES
    

    def process_image(self, image_url):
        try:
            is_leaf, plant_type, image_path = self.detect_leaf(image_url)
            
            if not is_leaf:
                return {
                    "status": "error",
                    "success": False,
                 "message": "No leaf detected in the image"}
            
            if not self.is_supported_leaf(plant_type):
                # Clean up the temporary file if plant type not supported
                try:
                    os.unlink(image_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temporary file {image_path}: {e}")
                return {
                    "status": "error",
                 "success": False,
                  "message": f"The image you've uploaded is not of a leaf that is currently supported, Please ensure the leaf you're trying to upload is supported and try again."
                  }
            
            try:
                img = Image.open(image_path).convert('RGB')
                
                transform = transforms.Compose([
                    transforms.Resize((256, 256)),
                    transforms.ToTensor(),
                
                ])
                
                img_tensor = transform(img)
                
                # Use the imported predict_disease function
                prediction_result = predict_disease(img_tensor)
                
                # Clean up the temporary file after processing
                try:
                    os.unlink(image_path)
                except Exception as e:
                    logger.warning(f"Failed to delete temporary file {image_path}: {e}")
                
                if "error" in prediction_result:
                    return {"status": "error", "message": prediction_result["error"]}
                
                disease_name = prediction_result["disease"]
                
                return {
                    "status": "success",
                    "disease": disease_name,
                    "confidence": prediction_result["confidence"]
                }
                    
            except Exception as e:
                # Clean up the temporary file in case of error
                try:
                    os.unlink(image_path)
                except Exception as cleanup_e:
                    logger.warning(f"Failed to delete temporary file {image_path}: {cleanup_e}")
                    
                logger.error(f"Error processing image for disease detection: {e}")
                return {"status": "error", "message": f"Error in disease detection: {str(e)}"}
                    
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            return {"status": "error", "message": f"Error processing image: {str(e)}"}