import express, { Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import axios from "axios";
import LoanApplication, { ILoanInputs } from "./models/LoanApplication";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = Number(process.env.PORT) || 5000;
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/credit_risk_db";

const PYTHON_API_URL = "http://127.0.0.1:5000/predict";

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

      // Validate required fields
      if (!applicantName || typeof applicantName !== "string") {
        return res.status(400).json({
          error: "Invalid loan application data",
          details: "applicantName is required and must be a string",
        });
      }

      const requiredFields = [
        "int_rate",
        "dti",
        "annual_inc",
        "term",
        "mo_sin_old_rev_tl_op",
        "bc_open_to_buy",
        "avg_cur_bal",
        "installment",
      ];

      for (const field of requiredFields) {
        if (!(field in loanData) || typeof loanData[field as keyof ILoanInputs] !== "number") {
          return res.status(400).json({
            error: "Invalid loan application data",
            details: `${field} is required and must be a number`,
          });
        }
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
      console.error("Error processing application:", error);
      if (axios.isAxiosError(error)) {
        const status = error.response?.status ?? 502;
        return res.status(status).json({
          error: "ML service error while processing application",
          details: error.message,
        });
      }

      if (error instanceof mongoose.Error) {
        if (error.name === "ValidationError") {
          return res.status(400).json({
            error: "Invalid loan application data",
            details: error.message,
          });
        }
        return res.status(500).json({
          error: "Database error while processing application",
        });
      }

      if (error && error.name === "ValidationError") {
        return res.status(400).json({
          error: "Invalid loan application data",
          details: error.message,
        });
      }

      return res.status(500).json({ error: "Failed to process application" });
    }
  },
);

app.listen(PORT, () => console.log(`TS Server running on port ${PORT}`));
