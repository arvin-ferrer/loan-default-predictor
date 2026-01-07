import os
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
# Configure CORS for the /predict endpoint with explicit allowed origins.
# ALLOWED_ORIGINS can be set as a comma-separated list in the environment,
# e.g.: ALLOWED_ORIGINS="https://my-frontend.com,https://admin.my-frontend.com"
allowed_origins_env = os.environ.get(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000"
)
ALLOWED_ORIGINS = [origin.strip() for origin in allowed_origins_env.split(",") if origin.strip()]
CORS(app, resources={r"/predict": {"origins": ALLOWED_ORIGINS}})

# 1. Load the Model
model_path = 'model/creditRiskModel_deploy.pkl' 
if not os.path.exists(model_path):
    # Fallback for safety
    model_path = 'model/creditRiskModel.pkl'

try:
    model = joblib.load(model_path)
    print(f"✅ Model loaded from: {model_path}")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None

@app.route('/predict', methods=['POST'])
def predict():
    if not model:
        return jsonify({'error': 'Model not loaded'}), 500
    
    try:
        data = request.get_json()
        
        # --- FIX: FORCE COLUMN ORDER ---
        # This list must match the EXACT order from your notebook training step
        expected_columns = [
            'int_rate',
            'dti',
            'annual_inc',
            'term',
            'mo_sin_old_rev_tl_op',
            'bc_open_to_buy',
            'avg_cur_bal',
            'installment'
        ]
        
        # Convert to DataFrame and reindex to ensure strict order
        features_df = pd.DataFrame([data])
        features_df = features_df[expected_columns]
        # -------------------------------

        probability = model.predict_proba(features_df)[0][1]
        
        # Apply Threshold
        decision = "REJECT" if probability >= 0.15 else "APPROVE"
        
        return jsonify({
            'decision': decision, 
            'probability': float(probability),
            'risk_score': f"{round(probability * 100, 2)}%"
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 400

if __name__ == '__main__':
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() in ('1', 'true', 'yes', 'on')
    app.run(port=5000, debug=debug_mode)
