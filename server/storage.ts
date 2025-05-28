import { 
  Lesson, 
  InsertLesson, 
  UpdateLesson,
  Quiz, 
  InsertQuiz, 
  UpdateQuiz,
  Analytics,
  DashboardStats,
  lessons,
  quizzes,
  analytics
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Lessons
  getLessons(): Promise<Lesson[]>;
  getLesson(id: number): Promise<Lesson | undefined>;
  createLesson(lesson: InsertLesson): Promise<Lesson>;
  updateLesson(id: number, lesson: UpdateLesson): Promise<Lesson | undefined>;
  deleteLesson(id: number): Promise<boolean>;
  
  // Quizzes
  getQuizzes(): Promise<Quiz[]>;
  getQuiz(id: number): Promise<Quiz | undefined>;
  createQuiz(quiz: InsertQuiz): Promise<Quiz>;
  updateQuiz(id: number, quiz: UpdateQuiz): Promise<Quiz | undefined>;
  deleteQuiz(id: number): Promise<boolean>;
  
  // Analytics
  getDashboardStats(): Promise<DashboardStats>;
  getAnalytics(): Promise<Analytics[]>;
  
  // Import/Export
  exportLessons(): Promise<Lesson[]>;
  exportQuizzes(): Promise<Quiz[]>;
  importLessons(lessons: InsertLesson[]): Promise<Lesson[]>;
  importQuizzes(quizzes: InsertQuiz[]): Promise<Quiz[]>;
}

export class DatabaseStorage implements IStorage {
  private lessons: Map<number, Lesson>;
  private quizzes: Map<number, Quiz>;
  private analytics: Map<number, Analytics>;
  private currentLessonId: number;
  private currentQuizId: number;
  private currentAnalyticsId: number;

  constructor() {
    this.lessons = new Map();
    this.quizzes = new Map();
    this.analytics = new Map();
    this.currentLessonId = 1;
    this.currentQuizId = 1;
    this.currentAnalyticsId = 1;
    
    // Initialize with some sample data
    this.initializeData();
  }

  private initializeData() {
    const now = new Date();
    
    // Sample lessons
    const sampleLessons: InsertLesson[] = [
      {
        title: "Khmer Alphabet Basics",
        description: "Learn the fundamentals of Khmer script",
        free: true,
        level: "Beginner",
        image: "alphabet",
        sections: [
          {
            title: "Introduction to Khmer Script",
            content: "The Khmer script is an abugida (alphasyllabary) used to write the Khmer language..."
          },
          {
            title: "Basic Consonants",
            content: "ក ka, ខ kha, គ ga, ឃ gha..."
          }
        ],
        status: "published"
      },
      {
        title: "Countries & Nationality",
        description: "Learn how to talk about countries and nationality in Khmer",
        free: true,
        level: "Beginner",
        image: "travel",
        sections: [
          {
            title: "Key Vocabulary",
            content: "Where? [nouw-naa?] : នៅណា?\ncome [merk] : មក\ncountry [protes] : ប្រទេស"
          },
          {
            title: "Useful Dialogue",
            content: "Q: Where do you come from?\n[neak merk bpii naa?]\nនេកមកពីណា?"
          }
        ],
        status: "published"
      },
      {
        title: "Food & Dining",
        description: "Essential vocabulary for ordering food",
        free: false,
        price: 499,
        level: "Intermediate",
        image: "food",
        sections: [
          {
            title: "Restaurant Vocabulary",
            content: "restaurant [psah-eim] : ផ្សារអាហារ\nmenu [byan-chmuay] : ប្យាញ់ជម្រុយ"
          }
        ],
        status: "draft"
      }
    ];

    // Sample quizzes
    const sampleQuizzes: InsertQuiz[] = [
      {
        title: "Alphabet Quiz",
        description: "Test your knowledge of Khmer letters",
        questions: [
          {
            id: 1,
            question: "What is the first letter of the Khmer alphabet?",
            options: ["ក", "ខ", "គ", "ឃ"],
            correctAnswer: "ក"
          },
          {
            id: 2,
            question: "How do you pronounce ខ?",
            options: ["ka", "kha", "ga", "gha"],
            correctAnswer: "kha"
          }
        ],
        status: "active"
      },
      {
        title: "Numbers Quiz",
        description: "Practice counting and numbers in Khmer",
        questions: [
          {
            id: 1,
            question: "What is the number ១ in English?",
            options: ["1", "2", "3", "4"],
            correctAnswer: "1"
          }
        ],
        status: "draft"
      }
    ];

    // Initialize data
    sampleLessons.forEach(lesson => {
      this.createLesson(lesson);
    });

    sampleQuizzes.forEach(quiz => {
      this.createQuiz(quiz);
    });
  }

  // Lessons
  async getLessons(): Promise<Lesson[]> {
    return Array.from(this.lessons.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getLesson(id: number): Promise<Lesson | undefined> {
    return this.lessons.get(id);
  }

  async createLesson(insertLesson: InsertLesson): Promise<Lesson> {
    const id = this.currentLessonId++;
    const now = new Date();
    const lesson: Lesson = {
      ...insertLesson,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.lessons.set(id, lesson);
    return lesson;
  }

  async updateLesson(id: number, updateLesson: UpdateLesson): Promise<Lesson | undefined> {
    const existing = this.lessons.get(id);
    if (!existing) return undefined;

    const updated: Lesson = {
      ...existing,
      ...updateLesson,
      updatedAt: new Date(),
    };
    this.lessons.set(id, updated);
    return updated;
  }

  async deleteLesson(id: number): Promise<boolean> {
    return this.lessons.delete(id);
  }

  // Quizzes
  async getQuizzes(): Promise<Quiz[]> {
    return Array.from(this.quizzes.values()).sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getQuiz(id: number): Promise<Quiz | undefined> {
    return this.quizzes.get(id);
  }

  async createQuiz(insertQuiz: InsertQuiz): Promise<Quiz> {
    const id = this.currentQuizId++;
    const now = new Date();
    const quiz: Quiz = {
      ...insertQuiz,
      id,
      createdAt: now,
      updatedAt: now,
    };
    this.quizzes.set(id, quiz);
    return quiz;
  }

  async updateQuiz(id: number, updateQuiz: UpdateQuiz): Promise<Quiz | undefined> {
    const existing = this.quizzes.get(id);
    if (!existing) return undefined;

    const updated: Quiz = {
      ...existing,
      ...updateQuiz,
      updatedAt: new Date(),
    };
    this.quizzes.set(id, updated);
    return updated;
  }

  async deleteQuiz(id: number): Promise<boolean> {
    return this.quizzes.delete(id);
  }

  // Analytics
  async getDashboardStats(): Promise<DashboardStats> {
    const lessons = Array.from(this.lessons.values());
    const quizzes = Array.from(this.quizzes.values());
    
    const totalLessons = lessons.length;
    const totalQuizzes = quizzes.length;
    const freeLessons = lessons.filter(l => l.free).length;
    const premiumLessons = lessons.filter(l => !l.free).length;
    
    const paidLessons = lessons.filter(l => !l.free && l.price);
    const avgPrice = paidLessons.length > 0 
      ? paidLessons.reduce((sum, l) => sum + (l.price || 0), 0) / paidLessons.length / 100
      : 0;

    return {
      totalLessons,
      totalQuizzes,
      freeLessons,
      premiumLessons,
      lessonsGrowth: 12, // Mock growth data
      quizzesGrowth: 8,
      avgPrice: Math.round(avgPrice * 100) / 100,
    };
  }

  async getAnalytics(): Promise<Analytics[]> {
    return Array.from(this.analytics.values());
  }

  // Import/Export
  async exportLessons(): Promise<Lesson[]> {
    return this.getLessons();
  }

  async exportQuizzes(): Promise<Quiz[]> {
    return this.getQuizzes();
  }

  async importLessons(lessons: InsertLesson[]): Promise<Lesson[]> {
    const imported: Lesson[] = [];
    for (const lesson of lessons) {
      const created = await this.createLesson(lesson);
      imported.push(created);
    }
    return imported;
  }

  async importQuizzes(quizzes: InsertQuiz[]): Promise<Quiz[]> {
    const imported: Quiz[] = [];
    for (const quiz of quizzes) {
      const created = await this.createQuiz(quiz);
      imported.push(created);
    }
    return imported;
  }
}

export const storage = new MemStorage();
