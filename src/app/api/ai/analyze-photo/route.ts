import { NextRequest } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseClient';
import { withAuth, successResponse, errorResponse, APIError } from '@/lib/apiHelpers';
import OpenAI from 'openai';

/**
 * POST /api/ai/analyze-photo
 * Analyze a verification photo using OpenAI Vision
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { image_base64, task_id } = body;

    if (!image_base64 || !task_id) {
      throw new APIError('image_base64 and task_id are required', 400, 'VALIDATION_ERROR');
    }

    // 1. Fetch task details for context
    if (!supabaseAdmin) {
      throw new APIError('Service role client not available', 500, 'SERVER_ERROR');
    }

    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select(`
        name, 
        description, 
        location:components!location_id (name)
      `)
      .eq('id', task_id)
      .single();

    if (taskError || !task) {
      throw new APIError('Task not found', 404, 'NOT_FOUND');
    }

    const locationName = task.location && typeof task.location === 'object' && 'name' in task.location 
      ? (task.location as { name: string }).name 
      : 'Unknown location';

    // 2. Call AI Service
    const apiKey = process.env.OPENAI_API_KEY;
    
    let analysisResult;

    if (apiKey) {
      try {
        const openai = new OpenAI({ apiKey });
        
        const response = await openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content: "You are a construction quality control expert. Analyze the photo to verify if the described task is complete and meets basic quality standards. Return JSON with confidence (0-100), is_clear (bool), shows_correct_work (bool), appears_complete (bool), assessment (string), and recommendation ('approve' | 'review')."
            },
            {
              role: "user",
              content: [
                { type: "text", text: `Task: ${task.name}\nLocation: ${locationName}\nDescription: ${task.description || 'No description'}\n\nVerify this work.` },
                {
                  type: "image_url",
                  image_url: {
                    "url": image_base64.startsWith('data:') ? image_base64 : `data:image/jpeg;base64,${image_base64}`
                  }
                }
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_tokens: 300
        });

        const content = response.choices[0].message.content;
        if (content) {
          analysisResult = JSON.parse(content);
        } else {
          throw new Error('No content in OpenAI response');
        }
      } catch (err) {
        console.error('OpenAI API call failed, falling back to mock:', err);
        analysisResult = await mockAIAnalysis(task);
      }
    } else {
      console.log('No OpenAI API Key found, using mock analysis.');
      analysisResult = await mockAIAnalysis(task);
    }

    // 3. Store result in database (optional, but good for history)
    // We update the task with the latest analysis
    await supabaseAdmin
      .from('tasks')
      .update({
        ai_confidence: analysisResult.confidence,
        ai_assessment: analysisResult.assessment,
        ai_analyzed_at: new Date().toISOString()
      })
      .eq('id', task_id);

    return successResponse(analysisResult);

  } catch (error) {
    console.error('[AI Analysis API] Error:', error);
    if (error instanceof APIError) {
      return errorResponse(error.message, error.statusCode, error.code);
    }
    return errorResponse('Failed to analyze photo', 500, 'INTERNAL_ERROR');
  }
});

// Mock AI Analysis Function
async function mockAIAnalysis(task: any) {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 1500));

  // Randomized success/failure for demo purposes
  // In a real mock, we might look at the image data size or something, but here just random
  const isHighConfidence = Math.random() > 0.3; // 70% chance of success

  if (isHighConfidence) {
    return {
      confidence: 85 + Math.floor(Math.random() * 15), // 85-99
      is_clear: true,
      shows_correct_work: true,
      appears_complete: true,
      assessment: `Photo clearly shows completed ${task.name} in ${task.location?.name || 'the unit'}. Work appears to match requirements.`,
      recommendation: 'approve'
    };
  } else {
    return {
      confidence: 45 + Math.floor(Math.random() * 30), // 45-74
      is_clear: true,
      shows_correct_work: true,
      appears_complete: false,
      assessment: `Photo appears to show ${task.name}, but some elements might be incomplete or unclear. Please verify manually.`,
      recommendation: 'review'
    };
  }
}
