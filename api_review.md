# Improve my API responses

- GET /api/v1/main-lessons - List all published main lessons
## update response format to this format

{
  "id": 3,
  "title": "Everyday Dialogues for Foreigners (Part 3)",
  "description": "In this book, students will learn common Khmer dialogues and vocabulary for daily life. It's easy to understand and simple. Aside from these, students also will learn simple Khmer grammar and structure. ",
  "thumbnailUrl": "bucket url" + "filename",
  "isFree": boolean,
  "lessonCount": 25,
  "price": $1.00, // format to dollar currency, turn cents into dollar  
  "hasPurchased": boolean,
  "productId": "string"
}

- GET /api/v1/main-lessons/:id/lessons - List lessons for a specific main lesson
## update response format to this format
{
  "id": 1,
  "courseId": mainLessonId,
  "title": "",
  "description": "",
  "level": "Beginner",
  "type": lessonType.title,
}




