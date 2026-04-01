import os
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd

app = Flask(__name__)
CORS(app)

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

        if not data or not isinstance(data, dict):
            return jsonify({'error': 'Invalid or missing JSON body'}), 400

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

        missing_fields = [col for col in expected_columns if col not in data]
        if missing_fields:
            return jsonify({'error': f'Missing required fields: {missing_fields}'}), 400

        invalid_fields = [
            col for col in expected_columns
            if not isinstance(data[col], (int, float))
        ]
        if invalid_fields:
            return jsonify({'error': f'Fields must be numeric: {invalid_fields}'}), 400

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
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host='0.0.0.0', port=port, debug=debug)
