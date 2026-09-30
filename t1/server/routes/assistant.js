import {
  Router
} from 'express';
import {
  authenticate
} from '../middleware/auth.js';
import {
  answerInventoryQuestion
} from '../services/assistant.js';

const router = Router();
router.use(authenticate);
router.post('/ask', (req, res) => {
  const question = String(req.body.question || '').trim().slice(0, 500);
  if (!question) return res.status(400).json({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Enter a question.'
    }
  });
  res.json({
    success: true,
    data: answerInventoryQuestion({
      organizationId: req.user.organizationId,
      question
    })
  });
});
export default router;
