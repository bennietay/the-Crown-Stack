import { z } from "zod";

export function calculateLeadScore(validated: { budget?: string, timing?: string, phone?: string, website?: string }): number {
  let score = 50; // base score
  if (validated.budget && /12,?000\+|10k\+/i.test(validated.budget)) score += 20;
  else if (validated.budget && /6,?000|5k/i.test(validated.budget)) score += 10;
  
  if (validated.timing && /asap|2 weeks/i.test(validated.timing)) score += 15;
  
  if (validated.phone && validated.phone.length > 5) score += 10;
  if (validated.website && validated.website.length > 5) score += 5;
  
  return Math.min(100, score);
}

export const leadCaptureSchema = z.object({
  name: z.string().trim().min(2).max(100),
  company: z.union([z.literal(""), z.string().trim().min(2).max(100)]).optional().default(""),
  email: z.string().email().max(150),
  phone: z.union([z.literal(""), z.string().trim().min(8).max(50)]).optional().default(""),
  country: z.union([z.literal(""), z.string().trim().min(2).max(100)]).optional().default(""),
  website: z.string().url().max(200).optional().or(z.literal('')),
  service: z.string().trim().min(1).max(80),
  budget: z.string().trim().min(1).max(50),
  timing: z.string().trim().min(1).max(50),
  message: z.string().max(1000).optional(),
  consent: z.boolean().refine(val => val === true, "Consent required"),
  _honey: z.string().max(0, "Invalid submission"),
  source: z.string().max(200).optional(),
  utm_source: z.string().max(200).optional(),
  utm_medium: z.string().max(200).optional(),
  utm_campaign: z.string().max(200).optional(),
  utm_term: z.string().max(200).optional(),
  utm_content: z.string().max(200).optional(),
});
