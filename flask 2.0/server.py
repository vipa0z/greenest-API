
import os
from flask import Flask, jsonify
import logging

# Import your components
from scan_controller import ScanController
from models.model import load_model
from routes import predict_bp # Import the blueprint

# --- Basic Logging Setup ---
print("Configuring logging......")
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- Initialize Flask App ---
app = Flask(__name__)

try:
    scan_controller_instance = ScanController() # Initialize the controller once
    app.config['SCAN_CONTROLLER'] = scan_controller_instance # Store instance in app config
except Exception as e:
     logger.exception("FATAL: Failed to initialize ScanController.")
     app.config['SCAN_CONTROLLER'] = None


# --- Register Blueprints ---
app.register_blueprint(predict_bp, url_prefix='/api')

try:
    logger.info("Starting model loading...")
    
    load_model() 

    logger.info("Model loading complete.")
    app.config['MODEL_LOADED'] = True
except Exception as e:
    logger.exception("FATAL: Failed to load AI model on startup.")
    app.config['MODEL_LOADED'] = False

if __name__ == '__main__':
    if not app.config.get('MODEL_LOADED'):
        logger.warning("Starting Flask server, but AI model FAILED to load.")
    if not app.config.get('SCAN_CONTROLLER'):
        logger.warning("Starting Flask server, but ScanController FAILED to initialize.")

    app.run(host='0.0.0.0', port=5000, debug=False)