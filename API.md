# Khmer Learning Dashboard API

A comprehensive REST API for accessing Khmer language learning content. Perfect for building mobile apps, web applications, or integrating with other learning platforms.

## Base URL
```
https://your-domain.com/api/v1
```

## Authentication
All API endpoints require an API key for access. Include your API key in one of these ways:

**Header (Recommended):**
```
X-API-Key: your_api_key_here
```

**Query Parameter:**
```
GET /api/v1/lessons?api_key=your_api_key_here
```

## Response Format
All responses follow this consistent structure:

**Success Response:**
```json
{
  "success": true,
  "data": [...],
  "total": 10
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message"
}
```

---

# Lessons API

## Get All Lessons
Retrieve all published lessons.

**Endpoint:** `GET /api/v1/lessons`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Khmer Alphabet Basics",
      "description": "Learn the fundamentals of the Khmer alphabet",
      "level": "Beginner",
      "image": "book",
      "free": true,
      "price": null,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

## Get Specific Lesson
Retrieve a lesson with full content including sections.

**Endpoint:** `GET /api/v1/lessons/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Khmer Alphabet Basics",
    "description": "Learn the fundamentals of the Khmer alphabet",
    "level": "Beginner",
    "image": "book",
    "free": true,
    "price": null,
    "sections": [
      {
        "title": "Introduction",
        "content": "Welcome to learning Khmer!"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Get Lessons by Level
Filter lessons by difficulty level.

**Endpoint:** `GET /api/v1/lessons/level/:level`

**Parameters:**
- `level`: `Beginner`, `Intermediate`, or `Advanced`

**Example:** `GET /api/v1/lessons/level/Beginner`

## Get Free Lessons
Retrieve all free lessons.

**Endpoint:** `GET /api/v1/lessons/free`

---

# Quizzes API

## Get All Quizzes
Retrieve all active quizzes.

**Endpoint:** `GET /api/v1/quizzes`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "title": "Alphabet Quiz",
      "description": "Test your knowledge of Khmer letters",
      "lessonId": 1,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1
}
```

## Get Specific Quiz
Retrieve a quiz with all questions.

**Endpoint:** `GET /api/v1/quizzes/:id`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "title": "Alphabet Quiz",
    "description": "Test your knowledge of Khmer letters",
    "lessonId": 1,
    "questions": [
      {
        "id": 1,
        "question": "What is the first letter of the Khmer alphabet?",
        "options": ["ក", "ខ", "គ", "ឃ"],
        "correctAnswer": "ក"
      }
    ],
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Get Quizzes for Lesson
Retrieve all quizzes associated with a specific lesson.

**Endpoint:** `GET /api/v1/quizzes/lesson/:lessonId`

## Submit Quiz Answers
Submit quiz answers and get scored results.

**Endpoint:** `POST /api/v1/quizzes/:id/submit`

**Request Body:**
```json
{
  "answers": [
    {
      "questionId": 1,
      "selectedAnswer": "ក"
    },
    {
      "questionId": 2,
      "selectedAnswer": "74"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quizId": 1,
    "totalQuestions": 2,
    "correctAnswers": 2,
    "score": 100,
    "passed": true,
    "results": [
      {
        "questionId": 1,
        "question": "What is the first letter of the Khmer alphabet?",
        "userAnswer": "ក",
        "correctAnswer": "ក",
        "isCorrect": true
      }
    ]
  }
}
```

---

# General API

## Get Statistics
Retrieve public platform statistics.

**Endpoint:** `GET /api/v1/stats`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLessons": 5,
    "totalQuizzes": 3,
    "freeLessons": 3,
    "premiumLessons": 2
  }
}
```

## Search Content
Search through lessons and quizzes.

**Endpoint:** `GET /api/v1/search`

**Parameters:**
- `q` (required): Search query
- `type` (optional): `all`, `lessons`, or `quizzes` (default: `all`)

**Example:** `GET /api/v1/search?q=alphabet&type=lessons`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "type": "lesson",
      "id": 1,
      "title": "Khmer Alphabet Basics",
      "description": "Learn the fundamentals of the Khmer alphabet",
      "level": "Beginner",
      "free": true
    }
  ],
  "total": 1,
  "query": "alphabet"
}
```

---

# Error Codes

| Code | Description |
|------|-------------|
| 401  | Unauthorized - Invalid or missing API key |
| 404  | Not Found - Resource doesn't exist |
| 400  | Bad Request - Invalid parameters |
| 500  | Internal Server Error |

---

# Rate Limiting

- **Rate Limit:** 1000 requests per hour per API key
- **Burst Limit:** 100 requests per minute

---

# Example Usage

## JavaScript/React
```javascript
const API_KEY = 'your_api_key_here';
const BASE_URL = 'https://your-domain.com/api/v1';

// Get all free lessons
const response = await fetch(`${BASE_URL}/lessons/free`, {
  headers: {
    'X-API-Key': API_KEY
  }
});

const data = await response.json();
console.log(data.data); // Array of free lessons
```

## Flutter/Dart
```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

class KhmerAPI {
  static const String baseUrl = 'https://your-domain.com/api/v1';
  static const String apiKey = 'your_api_key_here';
  
  static Future<List<dynamic>> getLessons() async {
    final response = await http.get(
      Uri.parse('$baseUrl/lessons'),
      headers: {'X-API-Key': apiKey},
    );
    
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['data'];
    }
    throw Exception('Failed to load lessons');
  }
}
```

## Python
```python
import requests

API_KEY = 'your_api_key_here'
BASE_URL = 'https://your-domain.com/api/v1'

headers = {'X-API-Key': API_KEY}

# Get lesson by ID
response = requests.get(f'{BASE_URL}/lessons/1', headers=headers)
lesson = response.json()['data']
print(lesson['title'])
```

---

# Getting Started

1. **Get your API key** from the dashboard settings
2. **Test the connection** using the `/api/v1/stats` endpoint
3. **Explore lessons** with `/api/v1/lessons/free`
4. **Build your app** using the full API

For more help or questions, contact the dashboard administrator.