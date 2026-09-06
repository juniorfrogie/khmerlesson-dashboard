import { Router, Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { verifySubscription as verifyIosSubscription, decodeJWSPayload, markVerified, isTransactionVerified, VerifyResult } from "./services/iap/ios/storekit2/service";
import { verifySubscription as verifyAndroidSubscription } from "./services/iap/android/playbilling/service";
import { UserController } from "./features/users/controller/controller";
import { MainLessonController } from "./features/main-lessons/controller/controller";
import { LessonController } from "./features/lessons/controller/controller";
import { SubscriptionController, SubscriptionOwnedByOtherAccountError } from "./features/subscriptions/controller/controller";
import { SubscriptionPlanController } from "./features/subscription-plans/controller/controller";
import { QuizController } from "./features/quizzes/controller/controller";
import { ProgressController } from "./features/progress/controller/controller";
import { insertDebugLogSchema, insertQuizAttemptSchema, insertLessonCompletionSchema, Quiz } from "@shared/schema";
import { traceLogger } from "./utils/trace-logger";
import { blacklistToken } from "./utils/blacklist-token";
import { z } from "zod";

const router = Router();
const userController = new UserController();
const mainLessonController = new MainLessonController();
const lessonController = new LessonController();
const subscriptionController = new SubscriptionController();
const subscriptionPlanController = new SubscriptionPlanController();
const quizController = new QuizController();
const progressController = new ProgressController();

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

// Persists a route-handler error to debug_logs, tagged with the request's
// correlationId (see correlationMiddleware) so it can be looked up alongside
// any mobile-side logs for the same request.
function logRouteError(req: Request, error: unknown, message: string) {
  traceLogger.error(
    req.correlationId ?? "no-corr-id",
    message,
    { path: req.path, error: error instanceof Error ? error.message : String(error) },
    (req as any).user?.id
  );
}

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

    // A Bearer token was presented but failed verification (as opposed to no
    // token at all) — this response was silently downgraded to anonymous, so
    // `hasAccess` may be wrong for a caller whose session is actually still
    // good after a token refresh. Flag it via a header (not the status code,
    // to stay backward-compatible with the currently-released app, which has
    // no refresh/retry logic and depends on the 200 anonymous fallback) so a
    // client that knows to look can retry after refreshing.
    if (req.tokenInvalid) {
      res.set('X-Token-Status', 'invalid');
    }
    res.json(ok(data, data.length));
  } catch (error) {
    logRouteError(req, error, 'Failed to fetch main lessons');
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
    logRouteError(req, error, 'Failed to fetch lessons by level');
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
    logRouteError(req, error, 'Failed to fetch lessons');
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
    logRouteError(req, error, 'Failed to fetch lesson');
    res.status(500).json(fail('Failed to fetch lesson'));
  }
});

// ===== QUIZZES API =====

// Promo: quizzes belonging to this course are accessible without a subscription,
// even though the course's lessons still require one. Quiz-only bypass — main_lessons.isFree
// is left false so /main-lessons/:id/lessons and /lessons/:id stay gated normally.
// id 1 = "Everyday Dialogues for Foreigners (Part 1)".
const FREE_QUIZ_ACCESS_MAIN_LESSON_ID = 1;

// A quiz's access follows its parent course: quiz -> lessons.mainLessonId -> main_lessons.isFree.
// A quiz with no lessonId (standalone) has no course to check against, so it's treated as free.
async function getQuizAccess(quiz: Quiz, user?: { id: number }): Promise<{ hasAccess: boolean; comingSoon: boolean }> {
  if (quiz.lessonId === null) return { hasAccess: true, comingSoon: false };

  const lesson = await lessonController.getLesson(quiz.lessonId);
  const mainLesson = lesson && await mainLessonController.getMainLesson(lesson.mainLessonId);
  if (!mainLesson) return { hasAccess: true, comingSoon: false };

  if (mainLesson.status === "coming_soon") return { hasAccess: false, comingSoon: true };
  if (mainLesson.isFree) return { hasAccess: true, comingSoon: false };
  if (mainLesson.id === FREE_QUIZ_ACCESS_MAIN_LESSON_ID) return { hasAccess: true, comingSoon: false };

  const hasAccess = user ? await subscriptionController.hasAccessToCourse(user.id, mainLesson.id) : false;
  return { hasAccess, comingSoon: false };
}

// quizController.getQuizzes() orders by createdAt, so a newly-added quiz always sorts
// last regardless of which lesson it belongs to. Lessons have no explicit order column,
// but lesson id ascends in the same sequence lessons were authored in (course by course,
// lesson by lesson), so it's the best available stand-in for curriculum order.
function sortByLessonId(quizzes: Quiz[]): Quiz[] {
  return [...quizzes].sort((a, b) => (a.lessonId ?? Infinity) - (b.lessonId ?? Infinity));
}

// Hard-gates a quiz the same way /lessons/:id gates a lesson. Returns false when access is allowed.
function quizAccessDenied(req: any, res: Response, access: { hasAccess: boolean; comingSoon: boolean }): boolean {
  if (access.hasAccess) return false;
  if (access.comingSoon) {
    res.status(403).json({ success: false, message: "Content not yet available." });
    return true;
  }
  if (!req.user) {
    res.status(401).json({ success: false, message: "Authentication required.", code: "TOKEN_EXPIRED" });
    return true;
  }
  res.status(403).json({ success: false, message: "Active subscription required." });
  return true;
}

router.get("/quizzes", async (req: any, res: Response) => {
  try {
    const quizzes = sortByLessonId(await quizController.getQuizzes());
    const activeQuizzes = await Promise.all(
      quizzes
        .filter(quiz => quiz.status === 'active')
        .map(async quiz => {
          const access = await getQuizAccess(quiz, req.user);
          return {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            lessonId: quiz.lessonId,
            hasAccess: access.hasAccess,
            comingSoon: access.comingSoon,
            createdAt: quiz.createdAt,
            updatedAt: quiz.updatedAt
          };
        })
    );
    res.json(ok(activeQuizzes, activeQuizzes.length));
  } catch (error) {
    logRouteError(req, error, 'Failed to fetch quizzes');
    res.status(500).json(fail('Failed to fetch quizzes'));
  }
});

// /quizzes/all and /quizzes/lesson/:lessonId must be declared before /quizzes/:id to avoid route shadowing
router.get("/quizzes/all", async (req: any, res: Response) => {
  try {
    const quizzes = sortByLessonId(await quizController.getQuizzes());
    const mapped = await Promise.all(
      quizzes
        .filter(quiz => quiz.status === 'active')
        .map(async quiz => {
          const access = await getQuizAccess(quiz, req.user);
          return {
            id: quiz.id,
            title: quiz.title,
            description: quiz.description,
            lessonId: quiz.lessonId,
            questions: access.hasAccess ? quiz.questions : [],
            hasAccess: access.hasAccess,
            comingSoon: access.comingSoon,
            createdAt: quiz.createdAt,
            updatedAt: quiz.updatedAt
          };
        })
    );
    res.json(ok(mapped, mapped.length));
  } catch (error) {
    logRouteError(req, error, 'Failed to fetch quizzes');
    res.status(500).json(fail('Failed to fetch quizzes'));
  }
});

router.get("/quizzes/lesson/:lessonId", async (req: any, res: Response) => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    if (isNaN(lessonId) || lessonId <= 0) {
      return res.status(400).json(fail('Invalid ID parameter'));
    }
    const lessonQuizzes = await quizController.getQuizzesByLesson(lessonId);

    if (lessonQuizzes.length > 0) {
      const access = await getQuizAccess(lessonQuizzes[0], req.user);
      if (quizAccessDenied(req, res, access)) return;
    }

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
    logRouteError(req, error, 'Failed to fetch quizzes for lesson');
    res.status(500).json(fail('Failed to fetch quizzes for lesson'));
  }
});

router.get("/quizzes/:id", async (req: any, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      return res.status(400).json(fail('Invalid ID parameter'));
    }
    const quiz = await quizController.getQuiz(id);

    if (!quiz || quiz.status !== 'active') {
      return res.status(404).json(fail('Quiz not found'));
    }

    const access = await getQuizAccess(quiz, req.user);
    if (quizAccessDenied(req, res, access)) return;

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
    logRouteError(req, error, 'Failed to fetch quiz');
    res.status(500).json(fail('Failed to fetch quiz'));
  }
});

router.post("/quizzes/:id/submit", async (req: any, res: Response) => {
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

    const access = await getQuizAccess(quiz, req.user);
    if (quizAccessDenied(req, res, access)) return;

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
    logRouteError(req, error, 'Failed to submit quiz');
    res.status(500).json(fail('Failed to submit quiz'));
  }
});

// ===== SUBSCRIPTION PLANS API (public — mobile needs these to display offers) =====

router.get("/subscription-plans", async (req: Request, res: Response) => {
  try {
    const plans = await subscriptionPlanController.getActivePlans();
    res.json(ok(plans, plans.length));
  } catch (error) {
    logRouteError(req, error, 'Failed to fetch subscription plans');
    res.status(500).json(fail('Failed to fetch subscription plans'));
  }
});

// ===== SUBSCRIPTIONS API =====

router.post("/subscriptions", async (req: any, res: Response) => {
  const correlationId = req.correlationId ?? "no-corr-id";
  try {
    if (!req.user) {
      traceLogger.warn(correlationId, "Subscription registration: no authenticated user");
      return res.status(401).json({ success: false, message: "Authentication required.", code: "TOKEN_EXPIRED" });
    }

    // claim=true only for an explicit purchase/restore by the user — allows
    // moving a transaction chain from another app account to this one.
    // Passive syncs (reconcile on screen open) must send claim=false so a
    // fresh login can never silently inherit the device Apple ID's subscription.
    const { claim } = req.body;
    // Defaults to "ios" for backward compatibility with the currently-live
    // app version, which never sends a platform field at all.
    const platform: "ios" | "android" = req.body.platform === "android" ? "android" : "ios";

    const isDev = process.env.NODE_ENV === "development";

    let verifyResult: VerifyResult;
    let plan;

    if (platform === "android") {
      const { purchaseToken, productId } = req.body;
      if (!purchaseToken || !productId) {
        traceLogger.warn(correlationId, "Subscription registration: purchaseToken/productId missing from request body", undefined, req.user.id);
        return res.status(400).json(fail("purchaseToken and productId are required for platform=android"));
      }

      if (isDev) {
        // Unlike Apple's Xcode-environment JWS, a Play purchaseToken is
        // opaque — there's no client-side-decodable stand-in for it. Dev
        // mode here means "trust the client's asserted productId without
        // calling the Play Developer API", so the Android purchase flow can
        // be exercised before GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is configured.
        verifyResult = {
          ok: true,
          reason: "dev mode — verification skipped",
          productId,
          originalTransactionId: purchaseToken,
          transactionId: purchaseToken,
          expiresDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          isIntroductoryOffer: false,
        };
        traceLogger.info(correlationId, "Subscription registration: dev-mode Android purchase trusted", { productId }, req.user.id);
      } else {
        traceLogger.info(correlationId, "Subscription registration: calling Play verifySubscription", { productId }, req.user.id);
        verifyResult = await verifyAndroidSubscription(purchaseToken, productId);
        if (!verifyResult.ok) {
          traceLogger.warn(correlationId, "Subscription registration: Play verification failed", { reason: verifyResult.reason, productId }, req.user.id);
          return res.status(400).json({ success: false, message: "Subscription verification failed.", reason: verifyResult.reason });
        }
        traceLogger.info(correlationId, "Subscription registration: Play verification passed", { productId: verifyResult.productId }, req.user.id);
        // No Android equivalent of the iOS verified-transaction cache below —
        // Play purchase tokens are not re-submitted by the client the way an
        // Apple JWS can be (reconcileAvailablePurchases resubmits the same
        // token only on failure/retry, which should re-verify, not skip).
      }

      plan = verifyResult.productId
        ? await subscriptionPlanController.getPlanByAndroidProductId(verifyResult.productId)
        : undefined;
    } else {
      const { jws } = req.body;
      if (!jws) {
        traceLogger.warn(correlationId, "Subscription registration: jws missing from request body", undefined, req.user.id);
        return res.status(400).json(fail("jws is required"));
      }

      if (isDev) {
        // In dev, decode without Apple verification — allows testing without StoreKit
        const payload = decodeJWSPayload(jws);
        if (!payload) {
          traceLogger.warn(correlationId, "Subscription registration: JWS could not be decoded (dev mode)", undefined, req.user.id);
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
        traceLogger.info(correlationId, "Subscription registration: dev-mode JWS decoded", { productId: verifyResult.productId }, req.user.id);
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
          traceLogger.info(correlationId, "Subscription registration: using cached verification", { productId: verifyResult.productId, transactionId }, req.user.id);
        } else {
          traceLogger.info(correlationId, "Subscription registration: calling Apple verifySubscription", { transactionId }, req.user.id);
          verifyResult = await verifyIosSubscription(jws);
          if (!verifyResult.ok) {
            traceLogger.warn(correlationId, "Subscription registration: Apple verification failed", { reason: verifyResult.reason, transactionId }, req.user.id);
            return res.status(400).json({ success: false, message: "Subscription verification failed.", reason: verifyResult.reason });
          }
          traceLogger.info(correlationId, "Subscription registration: Apple verification passed", { productId: verifyResult.productId, transactionId: verifyResult.transactionId }, req.user.id);
          if (verifyResult.transactionId) markVerified(verifyResult.transactionId);
        }
      }

      plan = verifyResult.productId
        ? await subscriptionPlanController.getPlanByIosProductId(verifyResult.productId)
        : undefined;
    }

    if (!plan) {
      traceLogger.warn(correlationId, "Subscription registration: unknown productId — no matching plan row", { productId: verifyResult.productId, platform }, req.user.id);
      return res.status(400).json(fail(`Unknown productId: ${verifyResult.productId}`));
    }

    const status = verifyResult.isIntroductoryOffer ? "trial" : "active";
    const currentPeriodEndsAt = verifyResult.expiresDate ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const subscription = await subscriptionController.createOrUpdateSubscription({
      userId: req.user.id,
      planId: plan.id,
      platform,
      productId: verifyResult.productId!,
      originalTransactionId: verifyResult.originalTransactionId!,
      status,
      currentPeriodEndsAt,
    }, { allowTransfer: claim === true });

    traceLogger.info(correlationId, "Subscription registration: upsert succeeded", { subscriptionId: subscription.id, planId: plan.id, status, platform, claim: claim === true }, req.user.id);

    res.status(201).json(ok(subscription));
  } catch (error: any) {
    if (error instanceof SubscriptionOwnedByOtherAccountError) {
      traceLogger.warn(correlationId, "Subscription registration: transaction chain belongs to another account — not transferring", undefined, req.user?.id);
      return res.status(409).json({ success: false, error: error.message, code: "SUBSCRIPTION_OWNED_BY_OTHER_ACCOUNT" });
    }
    logRouteError(req, error, 'Failed to process subscription');
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
    logRouteError(req, error, 'Failed to fetch subscription');
    res.status(500).json(fail('Failed to fetch subscription'));
  }
});

// ===== GENERAL API =====

const MAX_DEBUG_LOG_BATCH = 50;

// Mobile client flushes its buffered logger.ts entries here so a bug report's
// traceId can be looked up in `debug_logs` alongside server-side rows for the
// same requests. Best-effort: never let a broken log payload surface an error
// to the app, since logging must not itself become a source of crashes.
router.post("/debug-logs", async (req: any, res: Response) => {
  const entries = Array.isArray(req.body?.logs) ? req.body.logs.slice(0, MAX_DEBUG_LOG_BATCH) : [];

  await Promise.all(
    entries.map((entry: unknown) => {
      const parsed = insertDebugLogSchema.safeParse({ ...(entry as object), source: "mobile" });
      if (!parsed.success) return Promise.resolve();
      const { traceId, level, message, context } = parsed.data;
      return traceLogger[level](traceId, message, context as Record<string, unknown> | undefined, req.user?.id, "mobile");
    })
  );

  res.json(ok({ received: entries.length }));
});

router.get("/stats", async (req: Request, res: Response) => {
  try {
    const stats = await storage.getDashboardStats();
    res.json(ok({
      totalLessons: stats.totalLessons,
      totalQuizzes: stats.totalQuizzes,
      totalActiveSubscriptions: stats.totalActiveSubscriptions,
      totalTrialSubscriptions: stats.totalTrialSubscriptions,
    }));
  } catch (error) {
    logRouteError(req, error, 'Failed to fetch statistics');
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
    logRouteError(req, error, 'Search failed');
    res.status(500).json(fail('Search failed'));
  }
});

// Cloud progress — account-scoped, replacing what the mobile app previously
// kept device-local only (AsyncStorage). Not semi-public (unlike
// main-lessons/quizzes/etc. — see SEMI_PUBLIC_PREFIXES in
// server/auth/middleware/authenticate.ts): progress is always user-owned,
// so an unauthenticated request must be rejected, not silently degraded.
router.get("/progress", async (req: any, res: Response) => {
  try {
    const userId = req.user?.id as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: "You are not logged in. Please log in to get access." });
    }
    const [attempts, completions] = await Promise.all([
      progressController.getQuizAttempts(userId),
      progressController.getLessonCompletions(userId),
    ]);
    res.json(ok({ quizAttempts: attempts, lessonCompletions: completions }));
  } catch (error) {
    logRouteError(req, error, 'Failed to get progress');
    res.status(500).json(fail('Failed to get progress'));
  }
});

router.post("/quiz-progress", async (req: any, res: Response) => {
  try {
    const userId = req.user?.id as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: "You are not logged in. Please log in to get access." });
    }
    const parsed = insertQuizAttemptSchema.parse({
      ...req.body,
      completedAt: req.body?.completedAt ? new Date(req.body.completedAt) : new Date(),
    });
    const result = await progressController.upsertQuizAttempt({ ...parsed, userId });
    res.json(ok(result));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(fail('Invalid quiz progress payload'));
    }
    logRouteError(req, error, 'Failed to save quiz progress');
    res.status(500).json(fail('Failed to save quiz progress'));
  }
});

router.post("/lesson-progress", async (req: any, res: Response) => {
  try {
    const userId = req.user?.id as number | undefined;
    if (!userId) {
      return res.status(401).json({ message: "You are not logged in. Please log in to get access." });
    }
    const parsed = insertLessonCompletionSchema.parse({
      ...req.body,
      completedAt: req.body?.completedAt ? new Date(req.body.completedAt) : new Date(),
    });
    const result = await progressController.upsertLessonCompletion({ ...parsed, userId });
    res.json(ok(result));
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json(fail('Invalid lesson progress payload'));
    }
    logRouteError(req, error, 'Failed to save lesson progress');
    res.status(500).json(fail('Failed to save lesson progress'));
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
    logRouteError(req, error, 'Failed to get me');
    res.status(500).json({ message: "Failed to get me." });
  }
});

// Self-service account deletion for the mobile app. Distinct from the
// admin-only DELETE /api/users/:id (server/features/users/route/route.ts,
// gated by requireAdmin) — this one is scoped to the authenticated caller's
// own id (req.user.id, never a client-supplied id), so a regular
// student/teacher can delete their own account without admin rights.
// Required by Google Play's account-deletion policy for apps that support
// account creation; the mobile client previously called the admin-only
// route, which rejected every non-admin user.
router.delete("/me", async (req: any, res: Response) => {
  try {
    const id = req.user?.id as number | undefined;
    if (!id) {
      return res.status(401).json({ message: "You are not logged in. Please log in to get access." });
    }

    const deleted = await userController.deleteUser(id);
    if (!deleted) {
      return res.status(404).json({ message: "User not found." });
    }

    // Invalidate the token that was just used, same as logout — the
    // account it authenticates no longer exists.
    const authHeader = req.headers["authorization"];
    const token: string | undefined = req.cookies?.token ?? (authHeader && authHeader.split(" ")[1]);
    if (token) {
      await blacklistToken(token).catch(() => {});
    }

    return res.status(200).json(ok({ deleted: true }));
  } catch (error) {
    logRouteError(req, error, 'Failed to delete account');
    res.status(500).json(fail('Failed to delete account'));
  }
});

export default router;
