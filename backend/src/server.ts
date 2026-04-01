import express, { Request, Response } from "express";
import mongoose from "mongoose";
import cors, { CorsOptions } from "cors";
import axios from "axios";
import LoanApplication, { ILoanInputs } from "./models/LoanApplication";

const app = express();
app.use(express.json());

const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true);
    }
    if (process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"), false);
  },
  credentials: true,
};

app.use(cors(corsOptions));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/credit_risk_db";

const PYTHON_API_URL = process.env.ML_SERVICE_URL || "http://127.0.0.1:5001/predict";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Error:", err));

interface ApplyRequest extends ILoanInputs {
  applicantName: string;
}
app.get("/", (req: Request, res: Response) => {
  res.send("API is running");
});

app.post(
  "/api/apply",
  async (req: Request<{}, {}, ApplyRequest>, res: Response) => {
    try {
      const { applicantName, ...loanData } = req.body;

      const requiredFields: (keyof ILoanInputs)[] = [
        "int_rate",
        "dti",
        "annual_inc",
        "term",
        "mo_sin_old_rev_tl_op",
        "bc_open_to_buy",
        "avg_cur_bal",
        "installment",
      ];

      if (!applicantName || typeof applicantName !== "string" || applicantName.trim() === "") {
        res.status(400).json({ error: "applicantName is required" });
        return;
      }

      const missingFields = requiredFields.filter(
        (field) => loanData[field] === undefined || loanData[field] === null,
      );
      if (missingFields.length > 0) {
        res.status(400).json({ error: `Missing required fields: ${missingFields.join(", ")}` });
        return;
      }

      const invalidFields = requiredFields.filter(
        (field) => typeof loanData[field] !== "number" || isNaN(loanData[field] as number),
      );
      if (invalidFields.length > 0) {
        res.status(400).json({ error: `Fields must be numeric: ${invalidFields.join(", ")}` });
        return;
      }

      console.log(`1. Processing application for: ${applicantName}`);

      const pythonRes = await axios.post(PYTHON_API_URL, loanData);
      const prediction = pythonRes.data;

      console.log(
        `2. ML Verdict: ${prediction.decision} (${prediction.risk_score})`,
      );

      const newApplication = new LoanApplication({
        applicantName,
        inputs: loanData,
        prediction,
      });

      await newApplication.save();
      console.log("3. Saved to MongoDB");

      res.json({
        success: true,
        result: prediction,
      });
    } catch (error: any) {
      console.error("Error:", error.message);
      res.status(500).json({ error: "Failed to process application" });
    }
  },
);

app.listen(PORT, () => console.log(`TS Server running on port ${PORT}`));
