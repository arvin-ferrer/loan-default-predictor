import express, { Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import axios from "axios";
import LoanApplication, { ILoanInputs } from "./models/LoanApplication";

const app = express();
app.use(express.json());
app.use(cors());

const PORT = 5000;
const MONGO_URI = "mongodb://127.0.0.1:27017/credit_risk_db";

const PYTHON_API_URL = "http://127.0.0.1:5001/predict";

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
