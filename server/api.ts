import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { insertPurchaseHistorySchema } from "@shared/schema";
import { verifyPurchase, decodeJWSPayload, markVerified, isTransactionVerified } from "./services/iap/ios/storekit2/service";
import { UserController } from "./features/users/controller/controller";
import { MainLessonController } from "./features/main-lessons/controller/controller";
import { LessonController } from "./features/lessons/controller/controller";
import { PurchaseHistoryController } from "./features/purchase-history/controller/controller";
import { QuizController } from "./features/quizzes/controller/controller";
import { ZodError } from "zod";

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

// When API_KEY env var is set, all /api/v1 routes require X-API-Key header or ?api_key= param
router.use((req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header('X-API-Key') || (req.query.api_key as string);
  const configuredKey = process.env.API_KEY;
  if (configuredKey && apiKey !== configuredKey) {
    return res.status(401).json(fail('Valid API key required'));
  }
  next();
});

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
router.get("/lessons/level/:level", async (req: Request, res: Response) => {
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

router.get("/main-lessons/:id/lessons", async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json(fail('Invalid ID parameter'));
    }
    const mainLesson = await mainLessonController.getMainLesson(id);
    if (!mainLesson) return res.status(404).json(fail('Main lesson not found'));
    if (!mainLesson.free) {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required.", code: "TOKEN_EXPIRED" });
      }
      const purchased = await purchaseHistoryController.hasUserPurchased(req.user.id, id);
      if (!purchased) {
        return res.status(403).json({ success: false, message: "Purchase required." });
      }
    }
    const lessons = await mainLessonController.getAllLessonsByMainLesson(id);
    res.json(ok(lessons, lessons.length));
  } catch (error) {
    console.error(error);
    res.status(500).json(fail('Failed to fetch lessons'));
  }
});

router.get("/lessons/:id", async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json(fail('Invalid ID parameter'));
    }
    const lesson = await lessonController.getLesson(id);

    if (!lesson || lesson.status !== 'published') {
      return res.status(404).json(fail('Lesson not found'));
    }

    if (lesson.mainLessonId) {
      const mainLesson = await mainLessonController.getMainLesson(lesson.mainLessonId);
      if (mainLesson && !mainLesson.free) {
        if (!req.user) {
          return res.status(401).json({ success: false, message: "Authentication required.", code: "TOKEN_EXPIRED" });
        }
        const purchased = await purchaseHistoryController.hasUserPurchased(req.user.id, lesson.mainLessonId);
        if (!purchased) {
          return res.status(403).json({ success: false, message: "Purchase required." });
        }
      }
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

// /quizzes/all and /quizzes/lesson/:lessonId must be declared before /quizzes/:id to avoid route shadowing
router.get("/quizzes/all", async (_req: Request, res: Response) => {
  try {
    const quizzes = await quizController.getQuizzes();
    const mapped = quizzes
      .filter(quiz => quiz.status === 'active')
      .map(quiz => ({
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
    res.status(500).json(fail('Failed to fetch quizzes'));
  }
});

router.get("/quizzes/lesson/:lessonId", async (req: Request, res: Response) => {
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

router.post("/quizzes/:id/submit", async (req: Request, res: Response) => {
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

router.post("/purchase-history", async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required.", code: "TOKEN_EXPIRED" });
    }
    console.log("[IAP:BODY]", JSON.stringify({ ...req.body, jws: req.body.jws ? "<jws>" : undefined }));
    const { jws, mainLessonId } = req.body;

    // In development, skip Apple JWS verification so the endpoint can be tested without StoreKit
    const isDev = process.env.NODE_ENV === "development";
    let verified = isDev;
    if (!isDev) {
      const payload = decodeJWSPayload(jws);
      const transactionId = payload?.transactionId;
      verified = transactionId ? isTransactionVerified(transactionId) : false;
      if (!verified) {
        const mainLesson = mainLessonId ? await mainLessonController.getMainLesson(Number(mainLessonId)) : null;
        const expectedProductId = mainLesson?.productId ?? undefined;
        const result = await verifyPurchase(jws, expectedProductId);
        console.error(`[purchase-history] verification — ok:${result.ok} reason:"${result.reason}" transactionId:"${transactionId}" mainLessonId:${mainLessonId} expectedProductId:"${expectedProductId}"`);
        verified = result.ok;
        if (!verified) {
          return res.status(400).json({ message: "Create purchase history failed.", reason: result.reason });
        }
      }
    }

    const validatedData = insertPurchaseHistorySchema.parse({
      ...req.body,
      userId: req.user.id,
      userEmail: req.user.email,
    });
    const existing = await purchaseHistoryController.findExistingPurchase(
      validatedData.purchaseId,
      req.user.id,
      validatedData.mainLessonId
    );
    if (existing) {
      return res.status(200).json(existing);
    }
    const purchaseHistory = await purchaseHistoryController.createPurchaseHistory(validatedData);
    return res.status(201).json(purchaseHistory);
  } catch (error: any) {
    console.error("[IAP:ERROR]", error?.message ?? error, "code:", error?.code, "detail:", error?.detail);
    if (error instanceof ZodError) {
      console.error("[IAP:ZOD]", JSON.stringify(error.errors));
      return res.status(400).json(error.errors);
    }
    if (error?.code === '23503') {
      return res.status(400).json({ message: "User account not found. Please log in again.", code: "USER_NOT_FOUND" });
    }
    if (error?.code === '23505') {
      const existing = await purchaseHistoryController.findExistingPurchase(
        req.body.purchaseId,
        req.user.id,
        req.body.mainLessonId
      ).catch(() => null);
      if (existing) return res.status(200).json(existing);
    }
    res.status(500).json({ message: "Failed to create purchase history.", errors: error?.message ?? String(error) });
  }
});

router.post("/verify-purchase", async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required.", code: "TOKEN_EXPIRED" });
    }
    const { jws, mainLessonId } = req.body;
    const mainLesson = mainLessonId ? await mainLessonController.getMainLesson(Number(mainLessonId)) : null;
    const expectedProductId = mainLesson?.productId ?? undefined;
    const result = await verifyPurchase(jws, expectedProductId);
    console.log(`[verify-purchase] ok:${result.ok} reason:"${result.reason}" mainLessonId:${mainLessonId} expectedProductId:"${expectedProductId}"`);
    if (result.ok) {
      const payload = decodeJWSPayload(jws);
      if (payload?.transactionId) markVerified(payload.transactionId);
      return res.status(200).json({ message: "Transaction verified." });
    }
    return res.status(400).json({ message: "Verify transaction failed.", reason: result.reason });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to verify purchase.", errors: error });
  }
});

router.get("/me", async (req: any, res: Response) => {
  try {
    const id = req.user?.id as number;
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
