import { Express } from 'express';
import { generatePuzzleChallenge, validatePuzzleSolution } from './services/puzzleCaptcha';

export function registerCaptchaRoutes(app: Express) {
  app.get("/api/captcha/generate", (req, res) => {
    try {
      const challenge = generatePuzzleChallenge();
      res.json(challenge);
    } catch (error) {
      console.error("Error generating captcha:", error);
      res.status(500).json({ message: "Failed to generate captcha" });
    }
  });

  app.post("/api/captcha/validate", (req, res) => {
    try {
      const { token, x } = req.body;
      if (!token || x === undefined) {
        return res.status(400).json({ valid: false, message: "Missing token or position" });
      }
      const result = validatePuzzleSolution(token, x);
      res.json(result);
    } catch (error) {
      console.error("Error validating captcha:", error);
      res.status(500).json({ valid: false, message: "Failed to validate captcha" });
    }
  });
}
