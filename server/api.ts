import jwt from 'jsonwebtoken';
import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { insertPurchaseHistorySchema } from "@shared/schema";
import { verifyPurchase } from "./services/iap/ios/storekit2/service";
import { UserController } from "./features/users/controller/controller";
import { MainLessonController } from "./features/main-lessons/controller/controller";
import { LessonController } from "./features/lessons/controller/controller";
import { PurchaseHistoryController } from "./features/purchase-history/controller/controller";
import { QuizController } from "./features/quizzes/controller/controller";

const router = Router();
const userController = new UserController();
const mainLessonController = new MainLessonController();
const lessonController = new LessonController();
const purchaseHistoryController = new PurchaseHistoryController();
const quizController = new QuizController();

const PASSING_GRADE_PERCENT = 70;

interface AuthRequest extends Request {
  user?: { id: number; email: string };
}

const ok = (data: unknown, total?: number) => ({
  success: true,
  data,
  ...(total !== undefined && { total })
});

const fail = (message: string) => ({ success: false, error: message });

// Validates API key when API_KEY env var is set, regardless of environment
const authenticateAPI = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('X-API-Key') || (req.query.api_key as string);
  const configuredKey = process.env.API_KEY;

  if (configuredKey && apiKey !== configuredKey) {
    return res.status(401).json(fail('Valid API key required'));
  }

  next();
};

const authenticateToken = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = req.cookies?.token || (authHeader && authHeader.split(' ')[1]);

  if (!token) {
    return res.status(401).json({ message: "You are not logged in! Please log in to get access." });
  }

  const isBlacklisted = await storage.getBlacklist(token);
  if (isBlacklisted) {
    return res.status(401).json({ message: "Token is no longer valid. Please log in again." });
  }

  jwt.verify(token, process.env.TOKEN_SECRET as string, (err: any, user: any) => {
    if (err) return res.status(403).json({ message: "Forbidden" });
    req.user = user;
    next();
  });
};

// ===== MAIN LESSONS API =====

router.get("/main-lessons", async (req: any, res: Response) => {
  try {
    const mainLessons = await mainLessonController.getMainLessonsJoin(req.user);
    res.json(ok(mainLessons, mainLessons.length));
  } catch (error) {
    console.error(error);
    res.status(500).json(fail('Failed to fetch main lessons'));
  }
});

// ===== LESSONS API =====

// /lessons/level/:level must be declared before /lessons/:id to avoid route shadowing
router.get("/lessons/level/:level", authenticateAPI, async (req: Request, res: Response) => {
  try {
    const level = req.params.level;
    const filteredLessons = await lessonController.getLessonsByLevel(level);
    const mapped = filteredLessons.map((lesson: (typeof filteredLessons)[number]) => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      level: lesson.level,
      image: lesson.image,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt
    }));
    res.json(ok(mapped, mapped.length));
  } catch (error) {
    console.error(error);
    res.status(500).json(fail('Failed to fetch lessons by level'));
  }
});

router.get("/main-lessons/:id/lessons", authenticateAPI, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json(fail('Invalid ID parameter'));
    }
    const lessons = await mainLessonController.getAllLessonsByMainLesson(id);
    res.json(ok(lessons, lessons.length));
  } catch (error) {
    console.error(error);
    res.status(500).json(fail('Failed to fetch lessons'));
  }
});

router.get("/lessons/:id", authenticateAPI, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json(fail('Invalid ID parameter'));
    }
    const lesson = await lessonController.getLesson(id);

    if (!lesson || lesson.status !== 'published') {
      return res.status(404).json(fail('Lesson not found'));
    }

    const sections = lesson.sections as { title: string; content: string; items: { english: string; phonemic: string; khmer: string }[] }[];
    const enrichedSections = sections.map(section => {
      const lines = section.content.split('\n').filter(line => line.trim());
      const parsedEntries = [];
      for (const line of lines) {
        const match = line.match(/^(.+?)\s*\[(.+?)\]\s*:\s*(.+)$/);
        if (match) {
          parsedEntries.push({
            english: match[1].trim(),
            phonemic: `[${match[2].trim()}]`,
            khmer: match[3].trim()
          });
        }
      }
      return { ...section, items: parsedEntries };
    });

    res.json(ok({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      level: lesson.level,
      image: lesson.image,
      sections: enrichedSections,
      createdAt: lesson.createdAt,
      updatedAt: lesson.updatedAt
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json(fail('Failed to fetch lesson'));
  }
});

// ===== QUIZZES API =====

router.get("/quizzes", async (_req: Request, res: Response) => {
  try {
    const quizzes = await quizController.getQuizzes();
    const activeQuizzes = quizzes
      .filter(quiz => quiz.status === 'active')
      .map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        lessonId: quiz.lessonId,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt
      }));
    res.json(ok(activeQuizzes, activeQuizzes.length));
  } catch (error) {
    console.error(error);
    res.status(500).json(fail('Failed to fetch quizzes'));
  }
});

// /quizzes/lesson/:lessonId must be declared before /quizzes/:id to avoid route shadowing
router.get("/quizzes/lesson/:lessonId", authenticateAPI, async (req: Request, res: Response) => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    if (isNaN(lessonId) || lessonId <= 0) {
      return res.status(400).json(fail('Invalid ID parameter'));
    }
    const lessonQuizzes = await quizController.getQuizzesByLesson(lessonId);
    const mapped = lessonQuizzes.map((quiz: (typeof lessonQuizzes)[number]) => ({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      lessonId: quiz.lessonId,
      questions: quiz.questions,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt
    }));
    res.json(ok(mapped, mapped.length));
  } catch (error) {
    console.error(error);
    res.status(500).json(fail('Failed to fetch quizzes for lesson'));
  }
});

router.get("/quizzes/:id", async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json(fail('Invalid ID parameter'));
    }
    const quiz = await quizController.getQuiz(id);

    if (!quiz || quiz.status !== 'active') {
      return res.status(404).json(fail('Quiz not found'));
    }

    res.json(ok({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      lessonId: quiz.lessonId,
      questions: quiz.questions,
      createdAt: quiz.createdAt,
      updatedAt: quiz.updatedAt
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json(fail('Failed to fetch quiz'));
  }
});

router.post("/quizzes/:id/submit", authenticateAPI, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json(fail('Invalid ID parameter'));
    }
    const { answers } = req.body;

    if (!Array.isArray(answers)) {
      return res.status(400).json(fail('answers must be an array'));
    }

    const quiz = await quizController.getQuiz(id);
    if (!quiz || quiz.status !== 'active') {
      return res.status(404).json(fail('Quiz not found'));
    }

    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    let correct = 0;
    const results = questions.map((question: any) => {
      const userAnswer = answers.find((a: any) => a.questionId === question.id);
      const isCorrect = userAnswer && userAnswer.selectedAnswer === question.correctAnswer;
      if (isCorrect) correct++;
      return {
        questionId: question.id,
        question: question.question,
        userAnswer: userAnswer?.selectedAnswer || null,
        correctAnswer: question.correctAnswer,
        isCorrect
      };
    });

    const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

    res.json(ok({
      quizId: id,
      totalQuestions: questions.length,
      correctAnswers: correct,
      score,
      passed: score >= PASSING_GRADE_PERCENT,
      results
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json(fail('Failed to submit quiz'));
  }
});

// ===== GENERAL API =====

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await storage.getDashboardStats();
    res.json(ok({
      totalLessons: stats.totalLessons,
      totalQuizzes: stats.totalQuizzes,
      totalFreeMainLessons: stats.totalFreeMainLessons,
      totalPremiumMainLessons: stats.totalPremiumMainLessons
    }));
  } catch (error) {
    console.error(error);
    res.status(500).json(fail('Failed to fetch statistics'));
  }
});

router.get("/search", async (req: Request, res: Response) => {
  try {
    const { q, type = 'all' } = req.query;

    if (!q || typeof q !== 'string') {
      return res.status(400).json(fail('Search query required'));
    }

    const query = q.toLowerCase();
    const results: any[] = [];

    if (type === 'all' || type === 'lessons') {
      const lessons = await lessonController.getAllLessons();
      const lessonResults = lessons
        .filter(lesson =>
          lesson.status === 'published' &&
          (lesson.title.toLowerCase().includes(query) ||
           lesson.description.toLowerCase().includes(query))
        )
        .map(lesson => ({
          type: 'lesson',
          id: lesson.id,
          title: lesson.title,
          description: lesson.description,
          level: lesson.level,
        }));
      results.push(...lessonResults);
    }

    if (type === 'all' || type === 'quizzes') {
      const quizzes = await quizController.getQuizzes();
      const quizResults = quizzes
        .filter(quiz =>
          quiz.status === 'active' &&
          (quiz.title.toLowerCase().includes(query) ||
           quiz.description.toLowerCase().includes(query))
        )
        .map(quiz => ({
          type: 'quiz',
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          lessonId: quiz.lessonId
        }));
      results.push(...quizResults);
    }

    res.json({ ...ok(results, results.length), query: q });
  } catch (error) {
    console.error(error);
    res.status(500).json(fail('Search failed'));
  }
});

router.post("/purchase-history", authenticateAPI, async (req: Request, res: Response) => {
  try {
    const { jws } = req.body;
    const isVerified = await verifyPurchase(jws);
    if (isVerified) {
      const validatedData = insertPurchaseHistorySchema.parse(req.body);
      const purchaseHistory = await purchaseHistoryController.createPurchaseHistory(validatedData);
      return res.status(201).json(purchaseHistory);
    }
    return res.status(400).json({ message: "Transaction failed." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create purchase history.", errors: error });
  }
});

router.post("/verify-purchase", authenticateAPI, async (req: Request, res: Response) => {
  try {
    const { jws } = req.body;
    const isVerified = await verifyPurchase(jws);
    if (isVerified) {
      return res.status(200).json({ message: "Transaction verified." });
    }
    return res.status(400).json({ message: "Transaction failed." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to verify purchase.", errors: error });
  }
});

router.get("/me", authenticateToken, async (req: any, res: Response) => {
  try {
    const id = req.user.id as number;
    const user = await userController.getUserById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const { password, resetToken, registrationType, ...safeUser } = user;
    return res.status(200).json(safeUser);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to get me." });
  }
});

export default router;
