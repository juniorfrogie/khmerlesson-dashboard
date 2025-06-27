import { Router } from "express";
import { storage } from "./storage";
import { insertPurchaseHistorySchema } from "@shared/schema";
// import { insertLessonSchema, insertQuizSchema } from "@shared/schema";
// import { fromError } from "zod-validation-error";
import jwt from "jsonwebtoken"

const router = Router();

// API Authentication middleware (simple API key for now)
const authenticateAPI = (req: any, res: any, next: any) => {
  const apiKey = req.header('X-API-Key') || req.query.api_key;
  
  // For development, allow a default test key or no key
  const validKeys = [
    process.env.API_KEY,
    'test_key_123',
    'demo_key',
  ].filter(Boolean);
  
  // If no API key provided and we have valid keys configured, require authentication
  if (validKeys.length > 0 && apiKey && !validKeys.includes(apiKey)) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Valid API key required' 
    });
  }
  
  next();
};

const authenticateToken = async (req: any, res: any, next: any) => {
  
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) return res.status(401).json({message: "You are not logged in! Please log in to get access."})

  const isBlacklisted = await storage.getBlacklist(token)
  if (isBlacklisted) {
    return res.status(401).json({
      message: "Token is no longer valid. Please log in again.",
    });
  }

  jwt.verify(token, process.env.TOKEN_SECRET as string, (err: any, user: any) => {
    if (err) return res.status(403).json({message: "Forbidden"})

    req.user = user

    next()
  })
}

// Apply authentication to all API routes
router.use(authenticateAPI);
router.use(authenticateToken);

// ===== LESSONS API =====

// GET /api/v1/lessons - List all published lessons
router.get("/lessons", async (req: any, res: any) => {
  try {
    // const lessons = await storage.getLessons();
    // // Only return published lessons for public API
    // const publishedLessons = lessons
    //   .filter(lesson => lesson.status === 'published')
    //   .map(lesson => ({
    //     id: lesson.id,
    //     title: lesson.title,
    //     description: lesson.description,
    //     level: lesson.level,
    //     image: lesson.image,
    //     free: lesson.free,
    //     price: lesson.price,
    //     createdAt: lesson.createdAt,
    //     updatedAt: lesson.updatedAt
    //   }));

    // res.json({
    //   success: true,
    //   data: publishedLessons,
    //   total: publishedLessons.length
    // });
    
    const lessons = await storage.getLessonsJoin(req.user);
    res.json({
      success: true,
      data: lessons,
      total: lessons.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch lessons' 
    });
  }
});

// GET /api/v1/lessons/:id - Get a specific lesson with content
router.get("/lessons/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const lesson = await storage.getLesson(id);
    
    if (!lesson || lesson.status !== 'published') {
      return res.status(404).json({ 
        success: false, 
        error: 'Lesson not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        level: lesson.level,
        image: lesson.image,
        free: lesson.free,
        price: lesson.price,
        sections: lesson.sections,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch lesson' 
    });
  }
});

// GET /api/v1/lessons/level/:level - Get lessons by level
router.get("/lessons/level/:level", async (req, res) => {
  try {
    const level = req.params.level;
    const lessons = await storage.getLessons();
    
    const filteredLessons = lessons
      .filter(lesson => lesson.status === 'published' && lesson.level.toLowerCase() === level.toLowerCase())
      .map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        level: lesson.level,
        image: lesson.image,
        free: lesson.free,
        price: lesson.price,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt
      }));
    
    res.json({
      success: true,
      data: filteredLessons,
      total: filteredLessons.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch lessons by level' 
    });
  }
});

// GET /api/v1/lessons/free - Get all free lessons
router.get("/lessons/free", async (req, res) => {
  try {
    const lessons = await storage.getLessons();
    
    const freeLessons = lessons
      .filter(lesson => lesson.status === 'published' && lesson.free)
      .map(lesson => ({
        id: lesson.id,
        title: lesson.title,
        description: lesson.description,
        level: lesson.level,
        image: lesson.image,
        free: lesson.free,
        createdAt: lesson.createdAt,
        updatedAt: lesson.updatedAt
      }));
    
    res.json({
      success: true,
      data: freeLessons,
      total: freeLessons.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch free lessons' 
    });
  }
});

// ===== QUIZZES API =====

// GET /api/v1/quizzes - List all active quizzes
router.get("/quizzes", async (req, res) => {
  try {
    const quizzes = await storage.getQuizzes();
    // Only return active quizzes for public API
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
    
    res.json({
      success: true,
      data: activeQuizzes,
      total: activeQuizzes.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch quizzes' 
    });
  }
});

// GET /api/v1/quizzes/:id - Get a specific quiz with questions
router.get("/quizzes/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const quiz = await storage.getQuiz(id);
    
    if (!quiz || quiz.status !== 'active') {
      return res.status(404).json({ 
        success: false, 
        error: 'Quiz not found' 
      });
    }
    
    res.json({
      success: true,
      data: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        lessonId: quiz.lessonId,
        questions: quiz.questions,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch quiz' 
    });
  }
});

// GET /api/v1/quizzes/lesson/:lessonId - Get quizzes for a specific lesson
router.get("/quizzes/lesson/:lessonId", async (req, res) => {
  try {
    const lessonId = parseInt(req.params.lessonId);
    const quizzes = await storage.getQuizzes();
    
    const lessonQuizzes = quizzes
      .filter(quiz => quiz.status === 'active' && quiz.lessonId === lessonId)
      .map(quiz => ({
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        lessonId: quiz.lessonId,
        questions: quiz.questions,
        createdAt: quiz.createdAt,
        updatedAt: quiz.updatedAt
      }));
    
    res.json({
      success: true,
      data: lessonQuizzes,
      total: lessonQuizzes.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch quizzes for lesson' 
    });
  }
});

// POST /api/v1/quizzes/:id/submit - Submit quiz answers (for scoring)
router.post("/quizzes/:id/submit", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { answers } = req.body; // Array of { questionId, selectedAnswer }
    
    const quiz = await storage.getQuiz(id);
    if (!quiz || quiz.status !== 'active') {
      return res.status(404).json({ 
        success: false, 
        error: 'Quiz not found' 
      });
    }
    
    // Calculate score
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
    
    res.json({
      success: true,
      data: {
        quizId: id,
        totalQuestions: questions.length,
        correctAnswers: correct,
        score: score,
        passed: score >= 70, // 70% passing grade
        results: results
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit quiz' 
    });
  }
});

// ===== GENERAL API =====

// GET /api/v1/stats - Get public statistics
router.get("/stats", async (req, res) => {
  try {
    const stats = await storage.getDashboardStats();
    
    res.json({
      success: true,
      data: {
        totalLessons: stats.totalLessons,
        totalQuizzes: stats.totalQuizzes,
        freeLessons: stats.freeLessons,
        premiumLessons: stats.premiumLessons
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch statistics' 
    });
  }
});

// GET /api/v1/search - Search lessons and quizzes
router.get("/search", async (req, res) => {
  try {
    const { q, type = 'all' } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Search query required' 
      });
    }
    
    const query = q.toLowerCase();
    let results: any[] = [];
    
    if (type === 'all' || type === 'lessons') {
      const lessons = await storage.getLessons();
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
          free: lesson.free
        }));
      results.push(...lessonResults);
    }
    
    if (type === 'all' || type === 'quizzes') {
      const quizzes = await storage.getQuizzes();
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
    
    res.json({
      success: true,
      data: results,
      total: results.length,
      query: q
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Search failed' 
    });
  }
});


// POST /api/v1/lessons/purchase
router.post("/lessons/purchase", async (req, res) => {
  try {
    const validatedData = insertPurchaseHistorySchema.parse(req.body);
    const purchaseHistory = await storage.createPurchaseHistory(validatedData);
    res.status(201).json(purchaseHistory);
  } catch (error) {
    console.log(error)
    res.status(500).json({ message: "Failed to create purchase!", errors: error });
  }
})

export default router;