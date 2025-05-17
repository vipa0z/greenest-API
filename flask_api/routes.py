import logging
from flask import Blueprint, request, jsonify, current_app

logger = logging.getLogger(__name__)

# Create a Flask Blueprint for prediction routes
predict_bp = Blueprint('predict', __name__)

@predict_bp.route('/predict', methods=['POST'])
def predict_route():
    """
    Handle plant disease prediction endpoint.
    
    Expects a JSON payload with 'image_url'.
    
    Returns:
        JSON response with detection results or error message
    """
    try:
        # Get request data
        data = request.get_json()
        
        # Check if image_url is provided
        if not data or 'image_url' not in data:
            return jsonify({
                "status": "error",
                "message": "Missing 'image_url' parameter"
            }), 400
        
        image_url = data['image_url']
        
        # Get the ScanController instance from app config
        scan_controller = current_app.config.get('SCAN_CONTROLLER')
        if not scan_controller:
            logger.error("ScanController not found in app config")
            return jsonify({
                "status": "error",
                "message": "Service not initialized properly"
            }), 500
        
        # Process the image through the detection pipeline
        result = scan_controller.process_image(image_url)
        
        # Return response based on processing result
        if result.get("status") == "error":
            return jsonify(result), 400
        else:
            return jsonify(result), 200
            
    except Exception as e:
        logger.exception(f"Error processing prediction request: {e}")
        return jsonify({
            "status": "error",
            "message": f"Error processing request: {str(e)}"
        }), 500

# Health check endpoint
@predict_bp.route('/health', methods=['GET'])
def health_check():
    """
    Simple health check endpoint to verify API is running.
    """
    model_loaded = current_app.config.get('MODEL_LOADED', False)
    scan_controller = current_app.config.get('SCAN_CONTROLLER') is not None
    
    return jsonify({
        "status": "healthy",
        "model_loaded": model_loaded,
        "scan_controller_initialized": scan_controller
    }), 200