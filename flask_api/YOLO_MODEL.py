from ultralyticsplus import YOLO, render_result

class YOLOModel:
    def __init__(self):
        # Load the model
        self.model = YOLO('foduucom/plant-leaf-detection-and-classification')
        
        # Set model parameters
        self.model.overrides['conf'] = 0.25  # NMS confidence threshold
        self.model.overrides['iou'] = 0.45  # NMS IoU threshold
        self.model.overrides['agnostic_nms'] = False  # NMS class-agnostic
        self.model.overrides['max_det'] = 1000  # maximum number of detections per image
    
    def predict(self, image_path):
        """
        Perform object detection on an image
        
        Args:
            image_path: Path to the image file
            
        Returns:
            results: Detection results
        """
        results = self.model.predict(image_path)
        return results
    
    def get_class_names(self):
        """
        Get the class names from the model
        
        Returns:
            dict: Dictionary mapping class indices to names
        """
        return self.model.names

# Set image
image = 'apple.JPG'

# Perform inference
results = model.predict(image)
