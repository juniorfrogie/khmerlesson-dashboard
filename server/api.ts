import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { verifySubscription, decodeJWSPayload, markVerified, isTransactionVerified } from "./services/iap/ios/storekit2/service";
import { UserController } from "./features/users/controller/controller";
import { MainLessonController } from "./features/main-lessons/controller/controller";
import { LessonController } from "./features/lessons/controller/controller";
import { SubscriptionController } from "./features/subscriptions/controller/controller";
import { SubscriptionPlanController } from "./features/subscription-plans/controller/controller";
import { QuizController } from "./features/quizzes/controller/controller";

const router = Router();
const userController = new UserController();
const mainLessonController = new MainLessonController();
const lessonController = new LessonController();
const subscriptionController = new SubscriptionController();
const subscriptionPlanController = new SubscriptionPlanController();
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

// When API_KEY env var is set, unauthenticated requests to /api/v1 require X-API-Key.
// Requests with a valid JWT (req.user set by authenticateToken) are exempt —
// they are already verified users and don't need a separate API key.
router.use((req: Request, res: Response, next: NextFunction) => {
  if ((req as any).user) { next(); return; }
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
    const lessons = await mainLessonController.getPublishedMainLessons();

    let accessibleCourseIds: number[] = [];
    if (req.user) {
      const sub = await subscriptionController.getActiveSubscription(req.user.id);
      if (sub) {
        accessibleCourseIds = await subscriptionPlanController.getCourseIdsForPlan(sub.planId);
      }
    }

    const data = lessons.map((lesson: any) => ({
      id: lesson.id,
      title: lesson.title,
      description: lesson.description,
      thumbnailUrl: lesson.thumbnailUrl,
      isFree: lesson.isFree,
      hasAccess: lesson.isFree || accessibleCourseIds.includes(lesson.id),
      comingSoon: lesson.status === "coming_soon",
      lessonCount: lesson.lessonCount,
      order: lesson.order,
    }));

    res.json(ok(data, data.length));
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

    if (mainLesson.status === "coming_soon") {
      return res.status(403).json({ success: false, message: "Content not yet available." });
    }

    if (!mainLesson.isFree) {
      if (!req.user) {
        return res.status(401).json({ success: false, message: "Authentication required.", code: "TOKEN_EXPIRED" });
      }
      const hasAccess = await subscriptionController.hasAccessToCourse(req.user.id, id);
      if (!hasAccess) {
        return res.status(403).json({ success: false, message: "Active subscription required." });
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
      if (mainLesson) {
        if (mainLesson.status === "coming_soon") {
          return res.status(403).json({ success: false, message: "Content not yet available." });
        }
        if (!mainLesson.isFree) {
          if (!req.user) {
            return res.status(401).json({ success: false, message: "Authentication required.", code: "TOKEN_EXPIRED" });
          }
          const hasAccess = await subscriptionController.hasAccessToCourse(req.user.id, mainLesson.id);
          if (!hasAccess) {
            return res.status(403).json({ success: false, message: "Active subscription required." });
          }
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

// ===== SUBSCRIPTION PLANS API (public — mobile needs these to display offers) =====

router.get("/subscription-plans", async (_req: Request, res: Response) => {
  try {
    const plans = await subscriptionPlanController.getActivePlans();
    res.json(ok(plans, plans.length));
  } catch (error) {
    console.error(error);
    res.status(500).json(fail('Failed to fetch subscription plans'));
  }
});

// ===== SUBSCRIPTIONS API =====

router.post("/subscriptions", async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required.", code: "TOKEN_EXPIRED" });
    }

    const { jws } = req.body;
    if (!jws) {
      return res.status(400).json(fail("jws is required"));
    }

    const isDev = process.env.NODE_ENV === "development";

    let verifyResult;
    if (isDev) {
      // In dev, decode without Apple verification — allows testing without StoreKit
      const payload = decodeJWSPayload(jws);
      if (!payload) {
        return res.status(400).json(fail("Invalid JWS — could not decode"));
      }
      verifyResult = {
        ok: true,
        reason: "dev mode — verification skipped",
        productId: payload.productId as string,
        originalTransactionId: (payload.originalTransactionId ?? payload.transactionId) as string,
        transactionId: payload.transactionId as string,
        // Apple Sandbox subscriptions expire in minutes/hours — always use 1 year in dev
        expiresDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isIntroductoryOffer: (payload as any).offerType === 1,
      };
    } else {
      const payload = decodeJWSPayload(jws);
      const transactionId = payload?.transactionId as string | undefined;
      if (transactionId && isTransactionVerified(transactionId)) {
        verifyResult = {
          ok: true,
          reason: "cached",
          productId: payload!.productId as string,
          originalTransactionId: (payload!.originalTransactionId ?? transactionId) as string,
          transactionId,
          expiresDate: payload!.expiresDate ? new Date(payload!.expiresDate as number) : undefined,
          isIntroductoryOffer: (payload as any)?.offerType === 1,
        };
      } else {
        verifyResult = await verifySubscription(jws);
        if (!verifyResult.ok) {
          return res.status(400).json({ success: false, message: "Subscription verification failed.", reason: verifyResult.reason });
        }
        if (verifyResult.transactionId) markVerified(verifyResult.transactionId);
      }
    }

    // Lookup plan level from subscription_plans table
    const plan = verifyResult.productId
      ? await subscriptionPlanController.getPlanByIosProductId(verifyResult.productId)
      : undefined;

    if (!plan) {
      return res.status(400).json(fail(`Unknown productId: ${verifyResult.productId}`));
    }

    const status = verifyResult.isIntroductoryOffer ? "trial" : "active";
    const currentPeriodEndsAt = verifyResult.expiresDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const subscription = await subscriptionController.createOrUpdateSubscription({
      userId: req.user.id,
      planId: plan.id,
      platform: "ios",
      productId: verifyResult.productId!,
      originalTransactionId: verifyResult.originalTransactionId!,
      status,
      currentPeriodEndsAt,
    });

    res.status(201).json(ok(subscription));
  } catch (error: any) {
    console.error("[SUBSCRIPTION:ERROR]", error?.message ?? error);
    res.status(500).json(fail("Failed to process subscription"));
  }
});

router.get("/subscriptions/me", async (req: any, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required.", code: "TOKEN_EXPIRED" });
    }
    const sub = await subscriptionController.getActiveSubscription(req.user.id);
    res.json(ok(sub));
  } catch (error) {
    console.error(error);
    res.status(500).json(fail('Failed to fetch subscription'));
  }
});

// ===== GENERAL API =====

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const stats = await storage.getDashboardStats();
    res.json(ok({
      totalLessons: stats.totalLessons,
      totalQuizzes: stats.totalQuizzes,
      totalActiveSubscriptions: stats.totalActiveSubscriptions,
      totalTrialSubscriptions: stats.totalTrialSubscriptions,
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
