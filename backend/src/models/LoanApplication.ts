import mongoose, { Schema, Document } from "mongoose";

export interface ILoanInputs {
  int_rate: number;
  dti: number;
  annual_inc: number;
  term: number;
  mo_sin_old_rev_tl_op: number;
  avg_cur_bal: number;
  bc_open_to_buy: number;
  installment: number;
}

export interface IPrediction {
  decision: string; // "APPROVE" | "REJECT"
  probability: number;
  risk_score: string;
}

export interface ILoanApplication extends Document {
  applicantName: string;
  inputs: ILoanInputs;
  prediction: IPrediction;
  createdAt: Date;
}

const LoanSchema: Schema = new Schema({
  applicantName: { type: String, required: true },

  inputs: {
    int_rate: { type: Number, required: true },
    dti: { type: Number, required: true },
    annual_inc: { type: Number, required: true },
    term: { type: Number, required: true },
    mo_sin_old_rev_tl_op: { type: Number, required: true },
    avg_cur_bal: { type: Number, required: true },
    bc_open_to_buy: { type: Number, required: true },
    installment: { type: Number, required: true },
  },

  prediction: {
    decision: String,
    probability: Number,
    risk_score: String,
  },

  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model<ILoanApplication>("LoanApplication", LoanSchema);
