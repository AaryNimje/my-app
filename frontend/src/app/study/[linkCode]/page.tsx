// frontend/src/app/study/[linkCode]/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, CheckCircle, XCircle } from 'lucide-react';

interface Question {
  question: string;
  answer: string;
}

interface StudyData {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  settings: any;
}

interface Response {
  questionIndex: number;
  question: string;
  correctAnswer: string;
  studentAnswer: string;
  isCorrect?: boolean;
}

export default function StudentStudyPage() {
  const params = useParams();
  const linkCode = params.linkCode as string;
  
  const [studyData, setStudyData] = useState<StudyData | null>(null);
  const [studentInfo, setStudentInfo] = useState({
    email: '',
    name: ''
  });
  const [responses, setResponses] = useState<Response[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswer, setStudentAnswer] = useState('');
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    fetchStudyContent();
  }, [linkCode]);

  const fetchStudyContent = async () => {
    try {
      const response = await fetch(`/api/qa/study/${linkCode}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load study content');
      }
      
      setStudyData(data.study);
      
      // Initialize responses array
      const initialResponses = data.study.questions.map((q: Question, index: number) => ({
        questionIndex: index,
        question: q.question,
        correctAnswer: q.answer,
        studentAnswer: '',
        isCorrect: false
      }));
      setResponses(initialResponses);
    } catch (error: any) {
      setError(error.message || 'Failed to load study content');
    } finally {
      setLoading(false);
    }
  };

  const handleStart = () => {
    if (!studentInfo.email || !studentInfo.name) {
      setError('Please enter your email and name');
      return;
    }
    
    setStarted(true);
    setStartTime(new Date());
    setError('');
  };

  const handleNextQuestion = () => {
    // Save current answer
    const updatedResponses = [...responses];
    updatedResponses[currentQuestionIndex] = {
      ...updatedResponses[currentQuestionIndex],
      studentAnswer,
      isCorrect: studentAnswer.toLowerCase().trim() === 
                 studyData!.questions[currentQuestionIndex].answer.toLowerCase().trim()
    };
    setResponses(updatedResponses);
    
    // Move to next question
    if (currentQuestionIndex < studyData!.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setStudentAnswer(responses[currentQuestionIndex + 1].studentAnswer || '');
    }
  };

  const handlePreviousQuestion = () => {
    // Save current answer
    const updatedResponses = [...responses];
    updatedResponses[currentQuestionIndex] = {
      ...updatedResponses[currentQuestionIndex],
      studentAnswer,
      isCorrect: studentAnswer.toLowerCase().trim() === 
                 studyData!.questions[currentQuestionIndex].answer.toLowerCase().trim()
    };
    setResponses(updatedResponses);
    
    // Move to previous question
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      setStudentAnswer(responses[currentQuestionIndex - 1].studentAnswer || '');
    }
  };

  const handleSubmit = async () => {
    // Save final answer
    const updatedResponses = [...responses];
    updatedResponses[currentQuestionIndex] = {
      ...updatedResponses[currentQuestionIndex],
      studentAnswer,
      isCorrect: studentAnswer.toLowerCase().trim() === 
                 studyData!.questions[currentQuestionIndex].answer.toLowerCase().trim()
    };
    
    setLoading(true);
    
    try {
      const timeSpent = startTime 
        ? Math.floor((new Date().getTime() - startTime.getTime()) / 1000)
        : 0;
      
      const response = await fetch(`/api/qa/study/${linkCode}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentEmail: studentInfo.email,
          studentName: studentInfo.name,
          responses: updatedResponses,
          timeSpent
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit responses');
      }
      
      setScore(data.score);
      setSubmitted(true);
    } catch (error: any) {
      setError(error.message || 'Failed to submit responses');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading && !studyData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4">Loading study content...</p>
        </div>
      </div>
    );
  }

  if (error && !studyData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6">
            <Alert className="bg-red-50">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted && score !== null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-2xl w-full">
          <CardHeader>
            <CardTitle className="text-center text-2xl">
              Study Session Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="text-5xl font-bold mb-2">{score.toFixed(1)}%</div>
              <p className="text-gray-600">Your Score</p>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-lg">Review Your Answers:</h3>
              {responses.map((response, index) => (
                <div key={index} className="border rounded p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    {response.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">Q{index + 1}: {response.question}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Your answer: {response.studentAnswer || '(No answer)'}
                      </p>
                      {!response.isCorrect && (
                        <p className="text-sm text-green-600 mt-1">
                          Correct answer: {response.correctAnswer}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="text-center">
              <p className="text-gray-600">Thank you for completing this study session!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!started) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>{studyData?.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {studyData?.description && (
              <p className="text-gray-600 mb-6">{studyData.description}</p>
            )}
            
            {error && (
              <Alert className="mb-4 bg-red-50">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <form onSubmit={(e) => { e.preventDefault(); handleStart(); }} className="space-y-4">
              <div>
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={studentInfo.name}
                  onChange={(e) => setStudentInfo({...studentInfo, name: e.target.value})}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Your Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={studentInfo.email}
                  onChange={(e) => setStudentInfo({...studentInfo, email: e.target.value})}
                  placeholder="Enter your email"
                  required
                />
              </div>
              
              <div className="pt-4">
                <p className="text-sm text-gray-600 mb-4">
                  This study session contains {studyData?.questions.length} questions.
                </p>
                <Button type="submit" className="w-full">
                  Start Study Session
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = studyData?.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === studyData!.questions.length - 1;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{studyData?.title}</h1>
          <div className="flex items-center justify-between mt-2">
            <p className="text-gray-600">
              Question {currentQuestionIndex + 1} of {studyData?.questions.length}
            </p>
            {startTime && (
              <div className="flex items-center gap-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <Timer startTime={startTime} />
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ 
              width: `${((currentQuestionIndex + 1) / studyData!.questions.length) * 100}%` 
            }}
          />
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              Question {currentQuestionIndex + 1}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-lg mb-4">{currentQuestion?.question}</p>
            </div>
            
            <div>
              <Label htmlFor="answer">Your Answer</Label>
              <Textarea
                id="answer"
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                placeholder="Type your answer here..."
                rows={4}
                className="mt-2"
              />
            </div>

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviousQuestion}
                disabled={currentQuestionIndex === 0}
              >
                Previous
              </Button>
              
              {isLastQuestion ? (
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Submitting...' : 'Submit Answers'}
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                >
                  Next Question
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question Navigation Dots */}
        <div className="flex justify-center gap-2 mt-6">
          {studyData?.questions.map((_, index) => (
            <button
              key={index}
              className={`w-3 h-3 rounded-full transition-colors ${
                index === currentQuestionIndex 
                  ? 'bg-blue-600' 
                  : responses[index].studentAnswer 
                    ? 'bg-gray-600' 
                    : 'bg-gray-300'
              }`}
              onClick={() => {
                // Save current answer before navigating
                const updatedResponses = [...responses];
                updatedResponses[currentQuestionIndex] = {
                  ...updatedResponses[currentQuestionIndex],
                  studentAnswer
                };
                setResponses(updatedResponses);
                
                // Navigate to clicked question
                setCurrentQuestionIndex(index);
                setStudentAnswer(responses[index].studentAnswer || '');
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Timer Component
function Timer({ startTime }: { startTime: Date }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((new Date().getTime() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return <span>{formatTime(elapsed)}</span>;
}